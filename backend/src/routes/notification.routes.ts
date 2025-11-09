import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  summarizeNotifications,
  bulkDelete
} from '../controllers/notification.controller';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Create notification
router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { type, title, message, source, action } = req.body;

    if (!type || !message) {
      return res.status(400).json({
        success: false,
        error: 'Type and message are required'
      });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        source,
        action,
        read: false
      }
    });

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating notification'
    });
  }
});

// Get all notifications for user (with pagination)
router.get('/', getNotifications);

// Get unread count
router.get('/unread', getUnreadCount);

// Mark notification as read
router.put('/:id/read', markAsRead);

// Delete individual notification
router.delete('/:id', deleteNotification);

// Summarize all notifications via AI
router.post('/summarize', summarizeNotifications);

// Delete multiple notifications (for after summarization)
router.delete('/bulk', bulkDelete);

export default router;

