import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all savings goals
router.get('/', async (req: AuthRequest, res) => {
  try {
    const goals = await prisma.savingsGoal.findMany({
      where: { userId: req.userId },
      include: {
        finances: {
          where: { type: 'income' },
          select: { amount: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate current amount from linked finances
    const goalsWithProgress = goals.map(goal => {
      const totalContributions = goal.finances.reduce((sum, finance) => sum + finance.amount, 0);
      const progress = goal.targetAmount > 0 ? Math.min((totalContributions / goal.targetAmount) * 100, 100) : 0;

      return {
        ...goal,
        currentAmount: totalContributions,
        progress
      };
    });

    res.json(goalsWithProgress);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching savings goals' });
  }
});

// Create savings goal
router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      title,
      targetAmount,
      category,
      dueDate,
      description,
      priority
    } = req.body;

    const goal = await prisma.savingsGoal.create({
      data: {
        userId: req.userId!,
        title,
        targetAmount: parseFloat(targetAmount),
        category: category || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        description: description || null,
        priority: priority || 'medium',
        aiGenerated: false
      }
    });

    res.status(201).json(goal);
  } catch (error) {
    console.error('Error creating savings goal:', error);
    res.status(500).json({ error: 'Error creating savings goal' });
  }
});

// Update savings goal
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const goal = await prisma.savingsGoal.update({
      where: { id, userId: req.userId },
      data: req.body
    });
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Error updating savings goal' });
  }
});

// Delete savings goal
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.savingsGoal.delete({
      where: { id, userId: req.userId }
    });
    res.json({ message: 'Savings goal deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting savings goal' });
  }
});

// Get savings goal progress
router.get('/:id/progress', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const goal = await prisma.savingsGoal.findUnique({
      where: { id, userId: req.userId },
      include: {
        finances: {
          where: { type: 'income' },
          select: { amount: true, date: true }
        }
      }
    });

    if (!goal) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    const totalContributions = goal.finances.reduce((sum, finance) => sum + finance.amount, 0);
    const progress = goal.targetAmount > 0 ? Math.min((totalContributions / goal.targetAmount) * 100, 100) : 0;

    res.json({
      ...goal,
      currentAmount: totalContributions,
      progress,
      remaining: Math.max(goal.targetAmount - totalContributions, 0),
      isCompleted: progress >= 100
    });
  } catch (error) {
    console.error('Error fetching savings goal progress:', error);
    res.status(500).json({ error: 'Error fetching savings goal progress' });
  }
});

export default router;