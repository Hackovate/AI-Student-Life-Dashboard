import cron from 'node-cron';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

/**
 * Schedule daily summary generation for all active users
 * Runs at 11 PM (23:00) every day
 */
export function startDailySummaryScheduler() {
  // Schedule job to run at 11 PM every day
  // Cron format: minute hour day month day-of-week
  // '0 23 * * *' means: at 23:00 (11 PM) every day
  cron.schedule('0 23 * * *', async () => {
    console.log('[Scheduler] Starting daily summary generation for all users...');
    
    try {
      // Get all active users (users who have logged in recently or have data)
      // We'll get users who have any activity in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeUsers = await prisma.user.findMany({
        where: {
          OR: [
            { createdAt: { gte: thirtyDaysAgo } },
            { 
              tasks: {
                some: {
                  createdAt: { gte: thirtyDaysAgo }
                }
              }
            },
            {
              journals: {
                some: {
                  createdAt: { gte: thirtyDaysAgo }
                }
              }
            },
            {
              finances: {
                some: {
                  createdAt: { gte: thirtyDaysAgo }
                }
              }
            }
          ]
        },
        select: {
          id: true,
          email: true
        }
      });

      console.log(`[Scheduler] Found ${activeUsers.length} active users for daily summary`);

      // Generate summary for each user
      // Use Promise.allSettled to continue even if some fail
      const results = await Promise.allSettled(
        activeUsers.map(async (user) => {
          try {
            // Call the daily summary endpoint for this user
            // We need to authenticate, so we'll use an internal call
            // For now, we'll call the controller directly
            const { generateDailySummary } = await import('../controllers/ai.summary.controller');
            
            // Create a mock request object with userId
            const mockReq = {
              userId: user.id
            } as any;
            
            const mockRes = {
              json: (data: any) => {
                console.log(`[Scheduler] Summary generated for user ${user.email}:`, data.success ? 'Success' : 'Failed');
              },
              status: (code: number) => ({
                json: (data: any) => {
                  console.error(`[Scheduler] Error generating summary for user ${user.email}:`, data);
                }
              })
            } as any;

            await generateDailySummary(mockReq, mockRes);
          } catch (error: any) {
            console.error(`[Scheduler] Error generating summary for user ${user.email}:`, error.message);
            throw error;
          }
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`[Scheduler] Daily summary generation completed: ${successful} successful, ${failed} failed`);
    } catch (error: any) {
      console.error('[Scheduler] Error in daily summary scheduler:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC' // You can change this to user's timezone if needed
  });

  console.log('[Scheduler] Daily summary scheduler started. Will run at 11 PM UTC every day.');
}

/**
 * Manually trigger daily summary for a specific user (for testing)
 */
export async function triggerDailySummaryForUser(userId: string) {
  try {
    const { generateDailySummary } = await import('../controllers/ai.summary.controller');
    
    const mockReq = {
      userId
    } as any;
    
    const mockRes = {
      json: (data: any) => {
        console.log('Manual summary generation result:', data);
      },
      status: (code: number) => ({
        json: (data: any) => {
          console.error('Manual summary generation error:', data);
        }
      })
    } as any;

    await generateDailySummary(mockReq, mockRes);
  } catch (error: any) {
    console.error('Error manually triggering daily summary:', error);
    throw error;
  }
}


