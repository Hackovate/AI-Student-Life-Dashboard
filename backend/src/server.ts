import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import academicRoutes from './routes/academic.routes';
import financeRoutes from './routes/finance.routes';
import journalRoutes from './routes/journal.routes';
import taskRoutes from './routes/task.routes';
import skillRoutes from './routes/skill.routes';
import lifestyleRoutes from './routes/lifestyle.routes';
import attendanceRoutes from './routes/attendance.routes';
import savingsRoutes from './routes/savings.routes';
import monthlyBudgetRoutes from './routes/monthly-budget.routes';
import onboardingRoutes from './routes/onboarding.routes';
import analyticsRoutes from './routes/analytics.routes';
import aiRoutes from './routes/ai.routes';
import habitRoutes from './routes/habit.routes';
import learningRoutes from './routes/learning.routes';
import notificationRoutes from './routes/notification.routes';
import { startDailySummaryScheduler } from './services/scheduler.service';
import { runMigrations } from './migrate';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Rate limiting configuration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const requiredVars = ['JWT_SECRET', 'CLIENT_URL', 'DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
}

// Middleware
const clientUrl = process.env.CLIENT_URL;
if (!clientUrl && process.env.NODE_ENV === 'production') {
  console.error('CLIENT_URL must be set in production');
  process.exit(1);
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding if needed
}));

// CORS configuration - prioritize CLIENT_URL, fallback to VERCEL_URL or localhost
const corsOrigin = clientUrl || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// Body size limits to prevent DoS attacks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/academics', academicRoutes);
app.use('/api/finances', financeRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/lifestyle', lifestyleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/monthly-budgets', monthlyBudgetRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check route
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Only log stack traces in development
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  } else {
    console.error('Error:', err.message);
  }
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Start server with migrations
async function startServer() {
  // Run migrations before starting server (only in production)
  if (process.env.NODE_ENV === 'production') {
    await runMigrations();
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 CORS enabled for: ${process.env.CLIENT_URL}`);
    
    // Start daily summary scheduler
    startDailySummaryScheduler();
  });
}

startServer();

export default app;
