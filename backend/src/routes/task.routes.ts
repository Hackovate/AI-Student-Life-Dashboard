import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all tasks
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tasks' });
  }
});

// Create task
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, priority, status, dueDate } = req.body;
    const task = await prisma.task.create({
      data: {
        userId: req.userId!,
        title,
        description,
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Error creating task' });
  }
});

// Update task
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, dueDate, type, estimatedMinutes, 
            progressPercentage, actualMinutesSpent, daysAllocated, currentDay } = req.body;
    
    // Verify task exists and belongs to user
    const existing = await prisma.task.findUnique({
      where: { id }
    });
    
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updateData: any = {
      title: title !== undefined ? title : existing.title,
      description: description !== undefined ? (description || null) : existing.description,
      priority: priority || existing.priority || 'medium',
      status: status || existing.status,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
      type: type || existing.type,
      estimatedMinutes: estimatedMinutes !== undefined ? estimatedMinutes : existing.estimatedMinutes
    };
    
    // Handle progress tracking fields
    if (progressPercentage !== undefined) {
      if (progressPercentage === null || progressPercentage === '') {
        updateData.progressPercentage = null;
      } else {
        const progress = parseFloat(progressPercentage);
        updateData.progressPercentage = isNaN(progress) ? null : Math.max(0, Math.min(100, progress));
      }
    }
    
    if (actualMinutesSpent !== undefined) {
      if (actualMinutesSpent === null || actualMinutesSpent === '') {
        updateData.actualMinutesSpent = null;
      } else {
        const minutes = parseInt(actualMinutesSpent);
        updateData.actualMinutesSpent = isNaN(minutes) ? null : Math.max(0, minutes);
      }
    }
    
    if (daysAllocated !== undefined) {
      if (daysAllocated === null || daysAllocated === '') {
        updateData.daysAllocated = null;
        updateData.currentDay = null;
      } else {
        const days = parseInt(daysAllocated);
        updateData.daysAllocated = isNaN(days) ? null : Math.max(1, days);
      }
    }
    
    if (currentDay !== undefined) {
      if (currentDay === null || currentDay === '') {
        updateData.currentDay = null;
      } else {
        const day = parseInt(currentDay);
        updateData.currentDay = isNaN(day) ? null : Math.max(1, day);
      }
    }
    
    // Auto-calculate currentDay based on progressPercentage and daysAllocated
    if (updateData.progressPercentage !== undefined && updateData.daysAllocated !== undefined && 
        updateData.currentDay === undefined && updateData.progressPercentage !== null && 
        updateData.daysAllocated !== null) {
      const progress = updateData.progressPercentage;
      const days = updateData.daysAllocated;
      updateData.currentDay = Math.ceil((progress / 100) * days) || 1;
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData
    });
    res.json(task);
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ 
      error: 'Error updating task',
      message: error.message 
    });
  }
});

// Delete task
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({
      where: { id, userId: req.userId }
    });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting task' });
  }
});

export default router;
