# AI Student Life Dashboard - Backend

Backend API for the AI Student Life Dashboard application built with Express.js, Prisma, and PostgreSQL.

## Features

- ✅ JWT-based authentication
- ✅ RESTful API endpoints
- ✅ PostgreSQL database with Prisma ORM
- ✅ TypeScript support
- ✅ CORS enabled
- ✅ Environment variable configuration
- ✅ Comprehensive data models for student life tracking

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the values in `.env` with your configuration

3. Set up the database:
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# (Optional) Open Prisma Studio to view/edit data
npx prisma studio
```

## Running the Application

### Development mode
```bash
npm run dev
```

### Production mode
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Academics
- `GET /api/academics` - Get all academic records
- `POST /api/academics` - Create academic record
- `PUT /api/academics/:id` - Update academic record
- `DELETE /api/academics/:id` - Delete academic record

### Finances
- `GET /api/finances` - Get all finance records
- `POST /api/finances` - Create finance record
- `PUT /api/finances/:id` - Update finance record
- `DELETE /api/finances/:id` - Delete finance record

### Journals
- `GET /api/journals` - Get all journal entries
- `GET /api/journals/:id` - Get single journal entry
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

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Database Schema

The application uses the following models:
- **User** - User authentication and profile
- **Academic** - Course and grade tracking
- **Finance** - Income/expense tracking
- **Journal** - Daily journal entries
- **Task** - Task/todo management
- **Skill** - Skills tracking
- **Lifestyle** - Health and wellness tracking

## Environment Variables

See `.env.example` for all required environment variables.

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:push` - Push schema changes to database

## License

ISC
