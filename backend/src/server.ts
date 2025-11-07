import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS enabled for: ${process.env.CLIENT_URL}`);
});

export default app;
