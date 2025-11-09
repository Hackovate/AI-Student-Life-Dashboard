import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { summarizeNotifications as aiSummarizeNotifications } from '../services/ai.service';

const prisma = new PrismaClient();

// Get all notifications for user (with pagination)
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = 50, offset = 0, read } = req.query;

    const where: any = { userId };
    if (read !== undefined) {
      where.read = read === 'true';
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching notifications'
    });
  }
};

// Get unread count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const count = await prisma.notification.count({
      where: {
        userId,
        read: false
      }
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching unread count'
    });
  }
};

// Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Verify notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Error marking notification as read'
    });
  }
};

// Delete individual notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Verify notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await prisma.notification.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting notification'
    });
  }
};

// Summarize all notifications via AI
export const summarizeNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get all recent notifications (last 7 days, both read and unread)
    // This ensures we can summarize notifications even if they've been read
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to most recent 50 notifications
    });

    if (notifications.length === 0) {
      return res.json({
        success: true,
        data: {
          summary: 'No notifications to summarize.',
          notificationIds: []
        }
      });
    }

    // Call AI service to summarize
    const summary = await aiSummarizeNotifications(notifications);

    res.json({
      success: true,
      data: {
        summary,
        notificationIds: notifications.map(n => n.id)
      }
    });
  } catch (error: any) {
    console.error('Error summarizing notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error summarizing notifications'
    });
  }
};

// Delete multiple notifications (for after summarization)
export const bulkDelete = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification IDs'
      });
    }

    // Delete notifications that belong to user (don't fail if some are missing)
    const deleteResult = await prisma.notification.deleteMany({
      where: {
        id: { in: ids },
        userId
      }
    });

    console.log(`Deleted ${deleteResult.count} notifications for user ${userId}`);

    res.json({
      success: true,
      message: `${deleteResult.count} notifications deleted`,
      data: {
        deletedCount: deleteResult.count,
        requestedCount: ids.length
      }
    });
  } catch (error: any) {
    console.error('Error bulk deleting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error bulk deleting notifications'
    });
  }
};

