import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get all finance records
router.get('/', async (req: AuthRequest, res) => {
  try {
    const finances = await prisma.finance.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' }
    });
    res.json(finances);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching finance records' });
  }
});

// Create finance record
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { 
      category, 
      amount, 
      description, 
      date, 
      type, 
      paymentMethod, 
      recurring, 
      frequency,
      goalId
    } = req.body;
    
    const finance = await prisma.finance.create({
      data: {
        userId: req.userId!,
        category,
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : new Date(),
        type: type || 'expense',
        paymentMethod: paymentMethod || null,
        recurring: recurring || false,
        frequency: frequency || null,
        goalId: goalId || null,
        aiGenerated: false
      }
    });
    
    // Update savings goal progress if linked
    if (goalId && type === 'income') {
      await updateSavingsGoalProgress(goalId);
    }
    
    res.status(201).json(finance);
  } catch (error) {
    console.error('Error creating finance record:', error);
    res.status(500).json({ error: 'Error creating finance record' });
  }
});

// Update finance record
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const finance = await prisma.finance.update({
      where: { id, userId: req.userId },
      data: req.body
    });
    res.json(finance);
  } catch (error) {
    res.status(500).json({ error: 'Error updating finance record' });
  }
});

// Delete finance record
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.finance.delete({
      where: { id, userId: req.userId }
    });
    res.json({ message: 'Finance record deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting finance record' });
  }
});

// Get monthly summary (totals by type)
router.get('/summary/monthly', async (req: AuthRequest, res) => {
  try {
    const finances = await prisma.finance.findMany({
      where: { userId: req.userId },
    });

    const totalIncome = finances
      .filter((f: any) => f.type === 'income')
      .reduce((sum: number, f: any) => sum + f.amount, 0);

    const totalExpenses = finances
      .filter((f: any) => f.type === 'expense')
      .reduce((sum: number, f: any) => sum + f.amount, 0);

    const balance = totalIncome - totalExpenses;

    res.json({
      totalIncome,
      totalExpenses,
      balance,
      netSavings: Math.max(0, balance)
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ error: 'Error fetching summary' });
  }
});

// Get category breakdown
router.get('/summary/categories', async (req: AuthRequest, res) => {
  try {
    const { type = 'expense' } = req.query;
    
    const finances = await prisma.finance.findMany({
      where: { 
        userId: req.userId,
        type: type as string
      },
    });

    const breakdown = finances.reduce((acc: any, finance) => {
      if (!acc[finance.category]) {
        acc[finance.category] = 0;
      }
      acc[finance.category] += finance.amount;
      return acc;
    }, {});

    res.json(breakdown);
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

// AI Insight endpoint stub (future AI integration)
router.get('/ai-insight', async (req: AuthRequest, res) => {
  try {
    // Placeholder for future AI integration
    // This will later connect to AI microservice for:
    // - Predictive budgeting
    // - Anomaly detection
    // - Smart savings recommendations
    // - Spending pattern analysis
    
    res.json({
      message: 'AI insights endpoint - ready for future integration',
      insights: [],
      recommendations: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching AI insights' });
  }
});

// Helper function to update savings goal progress
async function updateSavingsGoalProgress(goalId: string) {
  try {
    const goal = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
      include: {
        finances: true
      }
    });

    if (goal) {
      const totalContributions = goal.finances
        .filter((f: any) => f.type === 'income')
        .reduce((sum: number, f: any) => sum + f.amount, 0);

      const progress = goal.targetAmount > 0 
        ? Math.min((totalContributions / goal.targetAmount) * 100, 100) 
        : 0;

      await prisma.savingsGoal.update({
        where: { id: goalId },
        data: {
          currentAmount: totalContributions,
          progress,
          status: progress >= 100 ? 'completed' : 'active'
        }
      });
    }
  } catch (error) {
    console.error('Error updating savings goal progress:', error);
  }
}

export default router;
