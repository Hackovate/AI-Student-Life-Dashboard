# AI Student Life Dashboard - Setup Guide

This guide will help you set up both the backend and frontend of the AI Student Life Dashboard.

## Prerequisites

- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**

## Backend Setup

### 1. Navigate to Backend Directory
```powershell
cd backend
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Configure Environment Variables
The `.env` file has already been created with the following configuration:
- Database: `postgresql://postgres:root@localhost:5432/student_dashboard`
- Port: `5000`
- JWT Secret: Change this in production!
- Client URL: `http://localhost:5173`

**Important:** Update the `JWT_SECRET` in `.env` before deploying to production.

### 4. Create PostgreSQL Database
Open PostgreSQL (pgAdmin or command line) and create a new database:
```sql
CREATE DATABASE student_dashboard;
```

Or using PowerShell:
```powershell
# Connect to PostgreSQL
psql -U postgres

# Create database (in psql)
CREATE DATABASE student_dashboard;

# Exit psql
\q
```

### 5. Generate Prisma Client and Run Migrations
```powershell
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Optional: Open Prisma Studio to view/manage data
npx prisma studio
```

### 6. Start the Backend Server
```powershell
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The backend will run on `http://localhost:5000`

## Frontend Setup

### 1. Navigate to Client Directory
```powershell
cd ..\client
```

### 2. Install Dependencies (if not already done)
```powershell
npm install
```

### 3. Environment Variables
The `.env` file has been created with:
```
VITE_API_URL=http://localhost:5000/api
```

### 4. Start the Frontend Development Server
```powershell
npm run dev
```

The frontend will run on `http://localhost:5173`

## API Integration Usage

The API client is located at `client/src/lib/api.ts`. Here's how to use it in your React components:

### Authentication Example
```typescript
import { authAPI } from '@/lib/api';

// Register
const handleRegister = async () => {
  try {
    const response = await authAPI.register({
      email: 'user@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe'
    });
    console.log('Registered:', response.user);
    // Token is automatically stored
  } catch (error) {
    console.error('Registration failed:', error);
  }
};

// Login
const handleLogin = async () => {
  try {
    const response = await authAPI.login({
      email: 'user@example.com',
      password: 'password123'
    });
    console.log('Logged in:', response.user);
  } catch (error) {
    console.error('Login failed:', error);
  }
};

// Get Profile
const fetchProfile = async () => {
  try {
    const response = await authAPI.getProfile();
    console.log('User profile:', response.user);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
  }
};

// Logout
const handleLogout = () => {
  authAPI.logout();
};
```

### Using Other APIs
```typescript
import { academicsAPI, financeAPI, tasksAPI } from '@/lib/api';

// Academics
const fetchAcademics = async () => {
  const academics = await academicsAPI.getAll();
};

const addCourse = async () => {
  await academicsAPI.create({
    courseName: 'Computer Science 101',
    grade: 'A',
    credits: 3,
    semester: 'Fall',
    year: 2024
  });
};

// Finance
const addExpense = async () => {
  await financeAPI.create({
    category: 'expense',
    amount: 50.00,
    description: 'Textbooks'
  });
};

// Tasks
const addTask = async () => {
  await tasksAPI.create({
    title: 'Complete assignment',
    description: 'Math homework',
    priority: 'high',
    dueDate: new Date('2024-12-31')
  });
};
```

## Testing the Setup

### 1. Test Backend Health
Open your browser or use curl:
```
http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

### 2. Test Registration
Use Postman, Thunder Client, or curl:
```powershell
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"password\":\"password123\",\"firstName\":\"Test\",\"lastName\":\"User\"}'
```

## Available API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (requires auth)

### Academics
- `GET /api/academics` - Get all academic records
- `POST /api/academics` - Create academic record
- `PUT /api/academics/:id` - Update academic record
- `DELETE /api/academics/:id` - Delete academic record

### Finance
- `GET /api/finances` - Get all finance records
- `POST /api/finances` - Create finance record
- `PUT /api/finances/:id` - Update finance record
- `DELETE /api/finances/:id` - Delete finance record

### Journal
- `GET /api/journals` - Get all journal entries
- `GET /api/journals/:id` - Get specific journal entry
- `POST /api/journals` - Create journal entry
- `PUT /api/journals/:id` - Update journal entry
- `DELETE /api/journals/:id` - Delete journal entry

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Skills
- `GET /api/skills` - Get all skills
- `POST /api/skills` - Create skill
- `PUT /api/skills/:id` - Update skill
- `DELETE /api/skills/:id` - Delete skill

### Lifestyle
- `GET /api/lifestyle` - Get all lifestyle records
- `POST /api/lifestyle` - Create lifestyle record
- `PUT /api/lifestyle/:id` - Update lifestyle record
- `DELETE /api/lifestyle/:id` - Delete lifestyle record

## Troubleshooting

### PostgreSQL Connection Issues
- Ensure PostgreSQL is running
- Verify the password in `.env` matches your PostgreSQL password
- Check if the database exists: `student_dashboard`

### Port Already in Use
If port 5000 or 5173 is already in use, update the port in:
- Backend: `backend/.env` (PORT variable)
- Frontend: Update in `vite.config.ts`

### CORS Issues
If you encounter CORS errors:
- Ensure `CLIENT_URL` in backend `.env` matches your frontend URL
- Check that the backend is running before starting the frontend

## Next Steps

1. Implement authentication in your React components
2. Create protected routes using the auth token
3. Build UI components that interact with the API
4. Add error handling and loading states
5. Implement data validation on both frontend and backend

## Development Tools

- **Prisma Studio**: `npm run prisma:studio` (in backend directory)
  - Visual editor for your database
  - Access at `http://localhost:5555`

- **Backend Logs**: Watch the terminal running `npm run dev` for API logs

## Production Deployment

Before deploying to production:
1. Change `JWT_SECRET` to a strong random string
2. Update `DATABASE_URL` to your production database
3. Update `CLIENT_URL` to your production frontend URL
4. Set `NODE_ENV=production`
5. Run `npm run build` in backend
6. Use a process manager like PM2 for the backend
