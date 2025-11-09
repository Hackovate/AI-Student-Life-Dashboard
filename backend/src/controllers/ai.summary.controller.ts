import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { chatAI } from '../services/ai.service';

const prisma = new PrismaClient();

interface DailySummaryData {
  journalEntries: any[];
  finances: {
    expenses: any[];
    income: any[];
    totalExpenses: number;
    totalIncome: number;
  };
  habits: {
    completed: number;
    total: number;
    details: any[];
  };
  tasks: {
    completed: number;
    total: number;
    details: any[];
  };
}

interface MonthlySummaryData {
  journalEntries: any[];
  finances: {
    expenses: any[];
    income: any[];
    totalExpenses: number;
    totalIncome: number;
  };
  habits: {
    totalDays: number;
    averageCompletion: number;
    total: number;
    details: any[];
  };
  tasks: {
    completed: number;
    total: number;
    details: any[];
  };
}

/**
 * Generate daily summary for a user
 * Collects data from journal, finances, habits, and tasks for the current day
 * Generates AI summary and creates notification
 */
export const generateDailySummary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Get today's date range (start and end of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Collect journal entries for today
    const journalEntries = await prisma.journal.findMany({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Collect finances for today
    const expenses = await prisma.finance.findMany({
      where: {
        userId,
        type: 'expense',
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    const income = await prisma.finance.findMany({
      where: {
        userId,
        type: 'income',
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);

    // Collect habits and their completion status for today
    const habits = await prisma.habit.findMany({
      where: { userId }
    });

    const todayStr = today.toISOString().split('T')[0];
    const habitDetails = habits.map(habit => {
      const history = (habit.completionHistory as any) || [];
      const todayEntry = history.find((entry: any) => entry.date === todayStr);
      return {
        name: habit.name,
        completed: todayEntry?.completed || false
      };
    });

    const completedHabits = habitDetails.filter(h => h.completed).length;

    // Collect tasks for today (from daily planner)
    // Note: Tasks are stored in the Task model, we check tasks due today or completed today (via updatedAt)
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        OR: [
          {
            dueDate: {
              gte: today,
              lt: tomorrow
            }
          },
          {
            status: 'completed',
            updatedAt: {
              gte: today,
              lt: tomorrow
            }
          }
        ]
      }
    });

    const completedTasks = tasks.filter(t => t.status === 'completed').length;

    // Prepare data for AI summary
    const summaryData: DailySummaryData = {
      journalEntries,
      finances: {
        expenses,
        income,
        totalExpenses,
        totalIncome
      },
      habits: {
        completed: completedHabits,
        total: habits.length,
        details: habitDetails
      },
      tasks: {
        completed: completedTasks,
        total: tasks.length,
        details: tasks
      }
    };

    // Generate AI summary
    const summaryText = await generateAISummary(summaryData, today);

    // Create notification with full summary
    await prisma.notification.create({
      data: {
        userId,
        type: 'info',
        title: `Daily Summary - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        message: summaryText,
        source: 'Daily Summary',
        action: 'daily_summary',
        read: false
      }
    });

    res.json({
      success: true,
      message: 'Daily summary generated successfully',
      data: {
        summary: summaryText,
        stats: {
          journalEntries: journalEntries.length,
          expenses: expenses.length,
          income: income.length,
          totalExpenses,
          totalIncome,
          habitsCompleted: completedHabits,
          habitsTotal: habits.length,
          tasksCompleted: completedTasks,
          tasksTotal: tasks.length
        }
      }
    });
  } catch (error: any) {
    console.error('Error generating daily summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate daily summary'
    });
  }
};

/**
 * Generate AI summary from collected data
 */
async function generateAISummary(data: DailySummaryData, date: Date): Promise<string> {
  // Build context for AI
  const dateStr = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let context = `Generate a comprehensive daily summary for ${dateStr}.\n\n`;

  // Journal entries
  if (data.journalEntries.length > 0) {
    context += `JOURNAL ENTRIES (${data.journalEntries.length}):\n`;
    data.journalEntries.forEach((entry, idx) => {
      context += `${idx + 1}. "${entry.title}" - ${entry.mood ? `Mood: ${entry.mood}` : ''}\n`;
      if (entry.content) {
        const preview = entry.content.substring(0, 200);
        context += `   ${preview}${entry.content.length > 200 ? '...' : ''}\n`;
      }
    });
    context += '\n';
  } else {
    context += 'JOURNAL ENTRIES: None today\n\n';
  }

  // Finances
  context += `FINANCES:\n`;
  context += `- Expenses: ${data.finances.expenses.length} transactions, Total: ${data.finances.totalExpenses}\n`;
  if (data.finances.expenses.length > 0) {
    data.finances.expenses.slice(0, 5).forEach(exp => {
      context += `  • ${exp.amount} (${exp.category})${exp.description ? ` - ${exp.description}` : ''}\n`;
    });
  }
  context += `- Income: ${data.finances.income.length} transactions, Total: ${data.finances.totalIncome}\n`;
  if (data.finances.income.length > 0) {
    data.finances.income.slice(0, 5).forEach(inc => {
      context += `  • ${inc.amount} (${inc.category})${inc.description ? ` - ${inc.description}` : ''}\n`;
    });
  }
  context += `- Net: ${data.finances.totalIncome - data.finances.totalExpenses}\n\n`;

  // Habits
  context += `HABITS:\n`;
  context += `- Completed: ${data.habits.completed} out of ${data.habits.total}\n`;
  if (data.habits.details.length > 0) {
    data.habits.details.forEach(habit => {
      context += `  • ${habit.name}: ${habit.completed ? '✓ Completed' : '✗ Not completed'}\n`;
    });
  }
  context += '\n';

  // Tasks
  context += `TASKS:\n`;
  context += `- Completed: ${data.tasks.completed} out of ${data.tasks.total}\n`;
  if (data.tasks.details.length > 0) {
    data.tasks.details.slice(0, 10).forEach(task => {
      const status = task.status === 'completed' ? '✓' : task.status === 'in-progress' ? '→' : '○';
      context += `  ${status} ${task.title}${task.status === 'completed' ? ' (Completed)' : ''}\n`;
    });
  }
  context += '\n';

  // Call AI service to generate summary
  try {
    const prompt = `${context}

Generate a comprehensive, friendly daily summary based on the above data. The summary should:
1. Start with a warm greeting
2. Highlight key achievements and activities
3. Mention financial activity (spending and income)
4. Note habit completion progress
5. Summarize task completion
6. Provide a brief reflection or encouragement
7. Be concise but comprehensive (2-3 paragraphs)

Format the summary in a natural, conversational tone.`;

    // Call AI service using chatAI function
    const response = await chatAI({
      user_id: '', // Not needed for summary generation
      message: prompt,
      conversation_history: [],
      structured_context: ''
    });

    if (response && response.response) {
      return response.response.trim();
    }
    throw new Error('Invalid response from AI service');
  } catch (error) {
    console.error('Error calling AI service for summary:', error);
    // Fallback to basic summary if AI fails
    return generateFallbackSummary(data, dateStr);
  }
}

/**
 * Generate fallback summary if AI service fails
 */
function generateFallbackSummary(data: DailySummaryData, dateStr: string): string {
  let summary = `Daily Summary for ${dateStr}\n\n`;
  
  summary += `Today's Activities:\n`;
  summary += `• Journal entries: ${data.journalEntries.length}\n`;
  summary += `• Expenses: ${data.finances.expenses.length} transactions (Total: ${data.finances.totalExpenses})\n`;
  summary += `• Income: ${data.finances.income.length} transactions (Total: ${data.finances.totalIncome})\n`;
  summary += `• Habits completed: ${data.habits.completed}/${data.habits.total}\n`;
  summary += `• Tasks completed: ${data.tasks.completed}/${data.tasks.total}\n`;
  
  if (data.finances.totalIncome - data.finances.totalExpenses > 0) {
    summary += `\nGreat job! You saved ${data.finances.totalIncome - data.finances.totalExpenses} today.`;
  }
  
  return summary;
}

/**
 * Generate monthly summary for a user
 * Collects data from journal, finances, habits, and tasks for the current month
 * Generates AI summary and creates notification
 */
export const generateMonthlySummary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Get current month's date range (start and end of month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Collect journal entries for current month
    const journalEntries = await prisma.journal.findMany({
      where: {
        userId,
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Collect finances for current month
    const expenses = await prisma.finance.findMany({
      where: {
        userId,
        type: 'expense',
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    const income = await prisma.finance.findMany({
      where: {
        userId,
        type: 'income',
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);

    // Collect habits and calculate monthly completion stats
    const habits = await prisma.habit.findMany({
      where: { userId }
    });

    // Calculate habit completion for the month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    let totalHabitCompletions = 0;
    const habitDetails = habits.map(habit => {
      const history = (habit.completionHistory as any) || [];
      const monthCompletions = history.filter((entry: any) => {
        const entryDate = new Date(entry.date);
        return entryDate >= monthStart && entryDate <= monthEnd && entry.completed;
      }).length;
      totalHabitCompletions += monthCompletions;
      return {
        name: habit.name,
        completions: monthCompletions,
        totalDays: daysInMonth
      };
    });

    const averageCompletion = habits.length > 0 
      ? Math.round((totalHabitCompletions / (habits.length * daysInMonth)) * 100) 
      : 0;

    // Collect tasks for current month
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    const completedTasks = tasks.filter(t => t.status === 'completed').length;

    // Prepare data for AI summary
    const summaryData: MonthlySummaryData = {
      journalEntries,
      finances: {
        expenses,
        income,
        totalExpenses,
        totalIncome
      },
      habits: {
        totalDays: daysInMonth,
        averageCompletion,
        total: habits.length,
        details: habitDetails
      },
      tasks: {
        completed: completedTasks,
        total: tasks.length,
        details: tasks
      }
    };

    // Generate AI summary
    const summaryText = await generateMonthlyAISummary(summaryData, now);

    // Create notification with full summary
    await prisma.notification.create({
      data: {
        userId,
        type: 'info',
        title: `Monthly Summary - ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        message: summaryText,
        source: 'Monthly Summary',
        action: 'monthly_summary',
        read: false
      }
    });

    res.json({
      success: true,
      message: 'Monthly summary generated successfully',
      data: {
        summary: summaryText,
        stats: {
          journalEntries: journalEntries.length,
          expenses: expenses.length,
          income: income.length,
          totalExpenses,
          totalIncome,
          habitsAverageCompletion: averageCompletion,
          habitsTotal: habits.length,
          tasksCompleted: completedTasks,
          tasksTotal: tasks.length
        }
      }
    });
  } catch (error: any) {
    console.error('Error generating monthly summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate monthly summary'
    });
  }
};

/**
 * Generate AI summary from collected monthly data
 */
async function generateMonthlyAISummary(data: MonthlySummaryData, date: Date): Promise<string> {
  // Build context for AI
  const dateStr = date.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  let context = `Generate a comprehensive monthly summary for ${dateStr}.\n\n`;

  // Journal entries
  if (data.journalEntries.length > 0) {
    context += `JOURNAL ENTRIES (${data.journalEntries.length} this month):\n`;
    data.journalEntries.slice(0, 10).forEach((entry, idx) => {
      context += `${idx + 1}. "${entry.title}" - ${entry.mood ? `Mood: ${entry.mood}` : ''}\n`;
      if (entry.content) {
        const preview = entry.content.substring(0, 150);
        context += `   ${preview}${entry.content.length > 150 ? '...' : ''}\n`;
      }
    });
    if (data.journalEntries.length > 10) {
      context += `   ... and ${data.journalEntries.length - 10} more entries\n`;
    }
    context += '\n';
  } else {
    context += 'JOURNAL ENTRIES: None this month\n\n';
  }

  // Finances
  context += `FINANCES:\n`;
  context += `- Expenses: ${data.finances.expenses.length} transactions, Total: ${data.finances.totalExpenses}\n`;
  if (data.finances.expenses.length > 0) {
    // Group by category for monthly view
    const categoryTotals: { [key: string]: number } = {};
    data.finances.expenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([category, amount]) => {
        context += `  • ${category}: ${amount}\n`;
      });
  }
  context += `- Income: ${data.finances.income.length} transactions, Total: ${data.finances.totalIncome}\n`;
  if (data.finances.income.length > 0) {
    data.finances.income.slice(0, 5).forEach(inc => {
      context += `  • ${inc.amount} (${inc.category})${inc.description ? ` - ${inc.description}` : ''}\n`;
    });
  }
  context += `- Net: ${data.finances.totalIncome - data.finances.totalExpenses}\n`;
  context += `- Savings Rate: ${data.finances.totalIncome > 0 ? Math.round(((data.finances.totalIncome - data.finances.totalExpenses) / data.finances.totalIncome) * 100) : 0}%\n\n`;

  // Habits
  context += `HABITS:\n`;
  context += `- Average completion rate: ${data.habits.averageCompletion}% over ${data.habits.totalDays} days\n`;
  context += `- Total habits tracked: ${data.habits.total}\n`;
  if (data.habits.details.length > 0) {
    data.habits.details.slice(0, 10).forEach(habit => {
      const completionRate = Math.round((habit.completions / habit.totalDays) * 100);
      context += `  • ${habit.name}: ${habit.completions}/${habit.totalDays} days (${completionRate}%)\n`;
    });
  }
  context += '\n';

  // Tasks
  context += `TASKS:\n`;
  context += `- Completed: ${data.tasks.completed} out of ${data.tasks.total}\n`;
  context += `- Completion rate: ${data.tasks.total > 0 ? Math.round((data.tasks.completed / data.tasks.total) * 100) : 0}%\n`;
  if (data.tasks.details.length > 0) {
    const completedTasks = data.tasks.details.filter(t => t.status === 'completed');
    context += `- Top completed tasks:\n`;
    completedTasks.slice(0, 5).forEach(task => {
      context += `  ✓ ${task.title}\n`;
    });
  }
  context += '\n';

  // Call AI service to generate summary
  try {
    const prompt = `${context}

Generate a comprehensive, friendly monthly summary based on the above data. The summary should:
1. Start with a warm greeting acknowledging the month
2. Highlight key achievements and milestones from the month
3. Provide insights on financial activity (spending patterns, savings rate)
4. Note habit consistency and completion trends
5. Summarize task completion and productivity
6. Provide reflection on the month's progress
7. Offer encouragement and suggestions for the next month
8. Be comprehensive but engaging (3-4 paragraphs)

Format the summary in a natural, conversational tone.`;

    // Call AI service using chatAI function
    const response = await chatAI({
      user_id: '', // Not needed for summary generation
      message: prompt,
      conversation_history: [],
      structured_context: ''
    });

    if (response && response.response) {
      return response.response.trim();
    }
    throw new Error('Invalid response from AI service');
  } catch (error) {
    console.error('Error calling AI service for monthly summary:', error);
    // Fallback to basic summary if AI fails
    return generateMonthlyFallbackSummary(data, dateStr);
  }
}

/**
 * Generate fallback monthly summary if AI service fails
 */
function generateMonthlyFallbackSummary(data: MonthlySummaryData, dateStr: string): string {
  let summary = `Monthly Summary for ${dateStr}\n\n`;
  
  summary += `This Month's Overview:\n`;
  summary += `• Journal entries: ${data.journalEntries.length}\n`;
  summary += `• Expenses: ${data.finances.expenses.length} transactions (Total: ${data.finances.totalExpenses})\n`;
  summary += `• Income: ${data.finances.income.length} transactions (Total: ${data.finances.totalIncome})\n`;
  summary += `• Net savings: ${data.finances.totalIncome - data.finances.totalExpenses}\n`;
  summary += `• Habits average completion: ${data.habits.averageCompletion}% (${data.habits.total} habits tracked)\n`;
  summary += `• Tasks completed: ${data.tasks.completed}/${data.tasks.total} (${data.tasks.total > 0 ? Math.round((data.tasks.completed / data.tasks.total) * 100) : 0}%)\n`;
  
  if (data.finances.totalIncome - data.finances.totalExpenses > 0) {
    summary += `\nGreat job! You saved ${data.finances.totalIncome - data.finances.totalExpenses} this month.`;
  }
  
  return summary;
}

