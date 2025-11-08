import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all habits
router.get('/', async (req: AuthRequest, res) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculate completed field based on today's date in completionHistory
    const today = new Date().toISOString().split('T')[0];
    const habitsWithTodayStatus = habits.map(habit => {
      const history = (habit.completionHistory as any) || [];
      const todayEntry = history.find((entry: any) => entry.date === today);
      const completedToday = todayEntry ? todayEntry.completed : false;
      
      return {
        ...habit,
        completed: completedToday
      };
    });
    
    res.json(habitsWithTodayStatus);
  } catch (error) {
    console.error('Error fetching habits:', error);
    res.status(500).json({ error: 'Error fetching habits' });
  }
});

// Get single habit
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const habit = await prisma.habit.findFirst({
      where: { id, userId: req.userId }
    });
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }
    
    // Calculate completed field based on today's date in completionHistory
    const today = new Date().toISOString().split('T')[0];
    const history = (habit.completionHistory as any) || [];
    const todayEntry = history.find((entry: any) => entry.date === today);
    const completedToday = todayEntry ? todayEntry.completed : false;
    
    res.json({
      ...habit,
      completed: completedToday
    });
  } catch (error) {
    console.error('Error fetching habit:', error);
    res.status(500).json({ error: 'Error fetching habit' });
  }
});

// Create habit
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, target, time, color, icon, streak, completed, completionHistory } = req.body;
    
    const habit = await prisma.habit.create({
      data: {
        userId: req.userId!,
        name,
        target,
        time,
        color: color || 'from-blue-500 to-cyan-500',
        icon: icon || '💪',
        streak: streak || 0,
        completed: completed || false,
        completionHistory: completionHistory || []
      }
    });
    res.status(201).json(habit);
  } catch (error) {
    console.error('Error creating habit:', error);
    res.status(500).json({ error: 'Error creating habit' });
  }
});

// Update habit
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, target, time, color, icon, streak, completed, completionHistory } = req.body;
    
    const habit = await prisma.habit.update({
      where: { id, userId: req.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(target !== undefined && { target }),
        ...(time !== undefined && { time }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(streak !== undefined && { streak }),
        ...(completed !== undefined && { completed }),
        ...(completionHistory !== undefined && { completionHistory })
      }
    });
    res.json(habit);
  } catch (error) {
    console.error('Error updating habit:', error);
    res.status(500).json({ error: 'Error updating habit' });
  }
});

// Toggle habit completion (special endpoint for toggling)
router.patch('/:id/toggle', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const habit = await prisma.habit.findFirst({
      where: { id, userId: req.userId }
    });
    
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }
    
    const newCompleted = !habit.completed;
    const today = new Date().toISOString().split('T')[0];
    const history = (habit.completionHistory as any) || [];
    
    // Update or add today's completion status
    const existingEntryIndex = history.findIndex((entry: any) => entry.date === today);
    let newHistory;
    if (existingEntryIndex >= 0) {
      newHistory = [...history];
      newHistory[existingEntryIndex] = { date: today, completed: newCompleted };
    } else {
      newHistory = [...history, { date: today, completed: newCompleted }];
    }
    
    // Calculate streak from history
    const calculateStreak = (completionHistory: { date: string; completed: boolean }[]) => {
      if (completionHistory.length === 0) return 0;
      
      const sorted = [...completionHistory]
        .filter(entry => entry.completed)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (sorted.length === 0) return 0;
      
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < sorted.length; i++) {
        const entryDate = new Date(sorted[i].date);
        entryDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === i) {
          streak++;
        } else {
          break;
        }
      }
      
      return streak;
    };
    
    const newStreak = calculateStreak(newHistory);
    
    const updatedHabit = await prisma.habit.update({
      where: { id, userId: req.userId },
      data: {
        completed: newCompleted,
        streak: newStreak,
        completionHistory: newHistory
      }
    });
    
    res.json(updatedHabit);
  } catch (error) {
    console.error('Error toggling habit:', error);
    res.status(500).json({ error: 'Error toggling habit' });
  }
});

// Delete habit
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.habit.delete({
      where: { id, userId: req.userId }
    });
    res.json({ message: 'Habit deleted' });
  } catch (error) {
    console.error('Error deleting habit:', error);
    res.status(500).json({ error: 'Error deleting habit' });
  }
});

export default router;

