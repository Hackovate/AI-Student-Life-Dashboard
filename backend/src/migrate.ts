import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Run Prisma migrations in production
 * This script runs automatically on server startup
 */
function runMigrations(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      console.log('🔄 Running database migrations...');
      
      // Run prisma migrate deploy (for production)
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: process.env,
      });
      
      console.log('✅ Database migrations completed successfully');
      resolve(true);
    } catch (error: any) {
      console.error('❌ Database migration failed:', error.message || error);
      // Don't exit in production - let the server start anyway
      // This allows the app to run even if migrations fail (e.g., already up to date)
      if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️  Continuing server startup despite migration warning...');
        resolve(false);
      } else {
        console.error('Migration failed in development mode');
        process.exit(1);
      }
    }
  });
}

// Export for use in server.ts
export { runMigrations };

// If run directly, execute migrations
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

