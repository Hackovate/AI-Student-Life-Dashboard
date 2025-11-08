import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get comprehensive analytics data
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get start and end of current month
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    // Get tasks for current month
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const totalTaskTime = completedTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0) / 60; // Convert to hours

    // Get courses (subjects)
    const courses = await prisma.course.findMany({
      where: { userId },
      include: {
        assignments: true,
        exams: true
      }
    });

    const subjectPerformance = courses.map(course => {
      const gradeToScore: { [key: string]: number } = {
        'A+': 95, 'A': 92, 'A-': 88,
        'B+': 85, 'B': 82, 'B-': 78,
        'C+': 75, 'C': 72, 'C-': 68,
        'D': 65, 'F': 50
      };
      
      return {
        id: course.id,
        name: course.courseName,
        code: course.courseCode || '',
        progress: course.progress || 0,
        grade: course.grade || 'N/A',
        score: gradeToScore[course.grade || ''] || (course.progress || 0),
        trend: (course.progress || 0) >= 75 ? 'up' : (course.progress || 0) >= 50 ? 'neutral' : 'down' as 'up' | 'down' | 'neutral',
        assignments: course.assignments.length,
        nextClass: 'TBD' // Could be calculated from ClassSchedule
      };
    });

    // Get skills
    const skills = await prisma.skill.findMany({
      where: { userId },
      include: {
        milestones: true,
        learningResources: true
      }
    });

    const avgSkillProgress = skills.length > 0
      ? Math.round(skills.reduce((sum, s) => sum + (s.progress || 0), 0) / skills.length)
      : 0;

    // Get finances for current month (for monthly stats) and all time (for expense insights)
    const finances = await prisma.finance.findMany({
      where: {
        userId,
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    // Get all expenses (not just current month) for expense insights
    const allExpenses = await prisma.finance.findMany({
      where: {
        userId,
        type: 'expense'
      },
      orderBy: {
        date: 'desc'
      },
      take: 100 // Last 100 expenses for better insights
    });

    const totalExpenses = finances
      .filter(f => f.type === 'expense')
      .reduce((sum, f) => sum + f.amount, 0);
    
    const totalIncome = finances
      .filter(f => f.type === 'income')
      .reduce((sum, f) => sum + f.amount, 0);
    
    const savingsRate = totalIncome > 0 
      ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) 
      : 0;

    // Get expense categories breakdown (use all expenses, not just current month)
    const expenseCategories: { [key: string]: number } = {};
    allExpenses.forEach(f => {
      expenseCategories[f.category] = (expenseCategories[f.category] || 0) + f.amount;
    });

    const categoryBreakdown = Object.entries(expenseCategories)
      .map(([category, amount]) => {
        const total = Object.values(expenseCategories).reduce((sum, val) => sum + val, 0);
        return {
          category,
          amount: Math.round(amount),
          percentage: total > 0 ? Math.round((amount / total) * 100) : 0
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Get lifestyle records for wellness score (using tasks as proxy for now)
    const lifestyleRecords = await prisma.lifestyle.findMany({
      where: {
        userId,
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    // Calculate wellness score from lifestyle data
    // For now, use task completion rate as wellness proxy
    const wellnessScore = tasks.length > 0
      ? Math.round((completedTasks.length / tasks.length) * 100)
      : 0;

    // Get weekly task completion (last 4 weeks)
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    const allWeeklyTasks = await prisma.task.findMany({
      where: {
        userId,
        createdAt: {
          gte: fourWeeksAgo
        }
      }
    });

    const weeklyTaskCompletion = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7 + 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekTasks = allWeeklyTasks.filter(t => {
        const taskDate = new Date(t.createdAt);
        return taskDate >= weekStart && taskDate <= weekEnd;
      });
      const weekCompleted = weekTasks.filter(t => t.status === 'completed').length;

      weeklyTaskCompletion.push({
        week: `Week ${4 - i}`,
        completed: weekCompleted,
        total: weekTasks.length || 1
      });
    }

    // Get daily task completion for calendar
    const dailyTaskCompletion: { [key: string]: { completed: number; total: number; tasks: Array<{ title: string; status: string }> } } = {};
    
    tasks.forEach(task => {
      const dateKey = new Date(task.createdAt).toISOString().split('T')[0];
      if (!dailyTaskCompletion[dateKey]) {
        dailyTaskCompletion[dateKey] = { completed: 0, total: 0, tasks: [] };
      }
      dailyTaskCompletion[dateKey].total++;
      if (task.status === 'completed') {
        dailyTaskCompletion[dateKey].completed++;
      }
      // Add task details
      dailyTaskCompletion[dateKey].tasks.push({
        title: task.title || 'Untitled Task',
        status: task.status || 'pending'
      });
    });

    // Calculate time balance from actual user data
    // Study: Tasks with type="study" or "assignment"
    const studyTasks = tasks.filter(t => 
      (t.type === 'study' || t.type === 'assignment') && t.status === 'completed'
    );
    const studyHours = studyTasks.reduce((sum, t) => sum + ((t.estimatedMinutes || 0) / 60), 0);

    // Skills: Parse timeSpent from skills or tasks with type="skill"
    const skillTasks = tasks.filter(t => 
      t.type === 'skill' && t.status === 'completed'
    );
    const skillTaskHours = skillTasks.reduce((sum, t) => sum + ((t.estimatedMinutes || 0) / 60), 0);
    
    // Parse timeSpent from skills (format: "Xh" or "Xh Ym")
    const skillHoursFromSkills = skills.reduce((sum, s) => {
      const timeSpent = s.timeSpent || '0h';
      const hoursMatch = timeSpent.match(/(\d+(?:\.\d+)?)h/);
      const minutesMatch = timeSpent.match(/(\d+)m/);
      const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 0;
      const minutes = minutesMatch ? parseFloat(minutesMatch[1]) / 60 : 0;
      return sum + hours + minutes;
    }, 0);
    const totalSkillHours = skillTaskHours + skillHoursFromSkills;

    // Lifestyle: Exercise minutes from lifestyle records
    const exerciseHours = lifestyleRecords.reduce((sum, l) => {
      return sum + ((l.exerciseMinutes || 0) / 60);
    }, 0);

    // Social: Estimate from journal entries (assume 30 min per entry) or tasks with social tags
    const socialTasks = tasks.filter(t => 
      t.type === 'social' && t.status === 'completed'
    );
    const socialTaskHours = socialTasks.reduce((sum, t) => sum + ((t.estimatedMinutes || 0) / 60), 0);
    const journalEntries = await prisma.journal.findMany({
      where: {
        userId,
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });
    const socialJournalHours = journalEntries.length * 0.5; // 30 min per entry
    const totalSocialHours = socialTaskHours + socialJournalHours;

    // Rest: Calculate from sleep hours (average sleep per day * days with records)
    const totalSleepHours = lifestyleRecords.reduce((sum, l) => sum + (l.sleepHours || 0), 0);
    const avgSleepPerDay = lifestyleRecords.length > 0 ? totalSleepHours / lifestyleRecords.length : 0;
    const daysInMonth = monthEnd.getDate();
    const estimatedRestHours = avgSleepPerDay * daysInMonth;

    // Calculate total hours and percentages
    const totalHours = studyHours + totalSkillHours + exerciseHours + totalSocialHours + estimatedRestHours;
    
    const timeBalance = {
      study: totalHours > 0 ? Math.round((studyHours / totalHours) * 100) : 0,
      skills: totalHours > 0 ? Math.round((totalSkillHours / totalHours) * 100) : 0,
      lifestyle: totalHours > 0 ? Math.round((exerciseHours / totalHours) * 100) : 0,
      social: totalHours > 0 ? Math.round((totalSocialHours / totalHours) * 100) : 0,
      rest: totalHours > 0 ? Math.round((estimatedRestHours / totalHours) * 100) : 0
    };

    // Normalize to 100% if needed (handle rounding errors)
    const sum = timeBalance.study + timeBalance.skills + timeBalance.lifestyle + timeBalance.social + timeBalance.rest;
    if (sum !== 100 && totalHours > 0) {
      const diff = 100 - sum;
      timeBalance.rest += diff; // Add difference to rest
    }

    // Calculate achievements
    const maxStreak = Math.max(...skills.map(s => {
      // Calculate streak from milestones or use progress as proxy
      return Math.floor((s.progress || 0) / 10);
    }), 0);

    const achievements = [
      {
        id: 1,
        title: `${maxStreak} Day Streak`,
        description: "Your best skill streak!",
        icon: "🔥"
      },
      {
        id: 2,
        title: `${completedTasks.length} Tasks Done`,
        description: "Completed tasks this month",
        icon: "✅"
      },
      {
        id: 3,
        title: `${savingsRate}% Savings`,
        description: "Your current savings rate",
        icon: "💰"
      },
      {
        id: 4,
        title: `${skills.length} Skills`,
        description: "Skills you're developing",
        icon: "⭐"
      }
    ];

    res.json({
      monthlyStats: {
        tasksCompleted: completedTasks.length,
        studyHours: Math.round(totalTaskTime),
        savingsRate,
        wellnessScore,
        skillProgress: avgSkillProgress
      },
      subjectPerformance,
      skills: skills.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category || 'General',
        progress: s.progress || 0,
        gradient: s.gradient || 'from-blue-500 to-cyan-500',
        milestones: s.milestones.map(m => ({ name: m.name, completed: m.completed })),
        nextTask: s.nextTask || 'Continue learning',
        resources: s.learningResources.length,
        timeSpent: s.timeSpent || '0h'
      })),
      expenses: finances.map(f => ({
        id: f.id,
        category: f.category,
        amount: f.amount,
        description: f.description || '',
        date: f.date.toISOString(),
        type: f.type as 'expense' | 'income',
        paymentMethod: f.paymentMethod,
        recurring: f.recurring,
        frequency: f.frequency
      })),
      expenseCategories: categoryBreakdown,
      weeklyTaskCompletion,
      dailyTaskCompletion,
      achievements,
      totalIncome,
      totalExpenses,
      timeBalance
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Error fetching analytics data' });
  }
});


export default router;

