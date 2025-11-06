import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all monthly budgets for the current month/year
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const currentMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;
    const currentYear = year ? parseInt(year as string) : currentDate.getFullYear();

    const budgets = await prisma.monthlyBudget.findMany({
      where: {
        userId: req.userId,
        month: currentMonth,
        year: currentYear
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching monthly budgets' });
  }
});

// Create monthly budget
router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      title,
      targetAmount,
      category,
      month,
      year,
      description,
      priority
    } = req.body;

    const currentDate = new Date();
    const budgetMonth = month || currentDate.getMonth() + 1;
    const budgetYear = year || currentDate.getFullYear();

    const budget = await prisma.monthlyBudget.create({
      data: {
        userId: req.userId!,
        title,
        targetAmount: parseFloat(targetAmount),
        category: category || null,
        month: budgetMonth,
        year: budgetYear,
        description: description || null,
        priority: priority || 'medium',
        aiGenerated: false
      }
    });

    res.status(201).json(budget);
  } catch (error) {
    console.error('Error creating monthly budget:', error);
    res.status(500).json({ error: 'Error creating monthly budget' });
  }
});

// Update monthly budget
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const budget = await prisma.monthlyBudget.update({
      where: { id, userId: req.userId },
      data: req.body
    });
    res.json(budget);
  } catch (error) {
    res.status(500).json({ error: 'Error updating monthly budget' });
  }
});

// Delete monthly budget
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.monthlyBudget.delete({
      where: { id, userId: req.userId }
    });
    res.json({ message: 'Monthly budget deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting monthly budget' });
  }
});

// Get budget progress (current spending vs budget)
router.get('/progress', async (req: AuthRequest, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const currentMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;
    const currentYear = year ? parseInt(year as string) : currentDate.getFullYear();

    // Get all budgets for the month
    const budgets = await prisma.monthlyBudget.findMany({
      where: {
        userId: req.userId,
        month: currentMonth,
        year: currentYear,
        status: 'active'
      }
    });

    // Get actual expenses for the month
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const expenses = await prisma.finance.findMany({
      where: {
        userId: req.userId,
        type: 'expense',
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    // Calculate total expenses by category
    const expenseByCategory = expenses.reduce((acc: any, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      acc[expense.category] += expense.amount;
      return acc;
    }, {});

    // Calculate budget progress
    const budgetProgress = budgets.map((budget: any) => {
      const actualSpent = budget.category ? (expenseByCategory[budget.category] || 0) : 0;
      const progress = budget.targetAmount > 0 ? (actualSpent / budget.targetAmount) * 100 : 0;

      return {
        ...budget,
        actualSpent,
        progress: Math.min(progress, 100),
        remaining: Math.max(budget.targetAmount - actualSpent, 0),
        overBudget: actualSpent > budget.targetAmount
      };
    });

    res.json(budgetProgress);
  } catch (error) {
    console.error('Error fetching budget progress:', error);
    res.status(500).json({ error: 'Error fetching budget progress' });
  }
});

export default router;