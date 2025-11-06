import { useState, useEffect } from 'react';
import { CheckCircle2, Wallet, Plus, Sparkles, TrendingUp, BookOpen, Target } from 'lucide-react';
import { StatCard } from '../StatCard';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  tasksAPI, 
  coursesAPI, 
  financeAPI, 
  savingsGoalAPI, 
  monthlyBudgetAPI,
  skillsAPI,
  authAPI 
} from '../../lib/api';
import { toast } from 'sonner';

interface DashboardProps {
  onNavigate?: (section: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps = {}) {
  const navigate = (path: string) => {
    const section = path.replace('/', '');
    onNavigate?.(section);
  };
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    netSavings: 0
  });
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [monthlyBudgets, setMonthlyBudgets] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [
        userResponse,
        tasksData,
        coursesData,
        summaryData,
        goalsData,
        budgetsData,
        skillsData
      ] = await Promise.all([
        authAPI.getProfile(),
        tasksAPI.getAll(),
        coursesAPI.getAll(),
        financeAPI.getMonthlySummary(),
        savingsGoalAPI.getAll(),
        monthlyBudgetAPI.getAll(),
        skillsAPI.getAll()
      ]);

      setUser(userResponse.user);
      setTasks(tasksData);
      setCourses(coursesData);
      setMonthlySummary(summaryData);
      setSavingsGoals(goalsData);
      setMonthlyBudgets(budgetsData);
      setSkills(skillsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const userName = user?.firstName || user?.email?.split('@')[0] || "Student";
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening";

  // Calculate stats from real data
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate active courses and average progress
  const activeCourses = courses.filter(c => c.status === 'ongoing' || c.status === 'active');
  const avgCourseProgress = activeCourses.length > 0 
    ? Math.round(activeCourses.reduce((sum, c) => sum + (c.progress || 0), 0) / activeCourses.length) 
    : 0;

  // Calculate savings
  const activeSavingsGoals = savingsGoals.filter(g => g.status === 'active');
  const totalSavingsGoal = activeSavingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const currentSavings = activeSavingsGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);

  // Calculate budget
  const totalMonthlyBudget = monthlyBudgets
    .filter(b => b.status === 'active')
    .reduce((sum, b) => sum + b.targetAmount, 0);

  // Calculate skills progress
  const avgSkillProgress = skills.length > 0
    ? Math.round(skills.reduce((sum, s) => sum + parseInt(s.level || '0'), 0) / skills.length)
    : 0;

  const stats = [
    {
      title: "Task Completion",
      value: `${taskCompletionRate}%`,
      icon: CheckCircle2,
      gradient: "bg-gradient-to-br from-green-500 to-emerald-500",
      subtext: `${completedTasks} of ${totalTasks} tasks completed`
    },
    {
      title: "Academic Progress",
      value: `${avgCourseProgress}%`,
      icon: BookOpen,
      gradient: "bg-gradient-to-br from-blue-500 to-cyan-500",
      subtext: `${activeCourses.length} active courses`
    },
    {
      title: "Savings Balance",
      value: `${monthlySummary.netSavings.toFixed(0)} BDT`,
      icon: Wallet,
      gradient: "bg-gradient-to-br from-violet-500 to-purple-500",
      subtext: totalSavingsGoal > 0 ? `${Math.round((currentSavings / totalSavingsGoal) * 100)}% of goal` : 'No goal set'
    },
    {
      title: "Skills Tracked",
      value: skills.length.toString(),
      icon: Target,
      gradient: "bg-gradient-to-br from-orange-500 to-red-500",
      subtext: `${avgSkillProgress}% avg progress`
    }
  ];

  // Get upcoming tasks (not done)
  const upcomingTasks = tasks
    .filter(t => t.status !== 'completed' && t.status !== 'done')
    .sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return 0;
    })
    .slice(0, 5);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // AI Insights based on actual data
  const aiInsights = [];
  
  if (taskCompletionRate >= 80) {
    aiInsights.push("🎉 Excellent work! You're crushing your tasks this week.");
  } else if (taskCompletionRate < 50 && totalTasks > 0) {
    aiInsights.push("💡 Try breaking down large tasks into smaller, manageable steps.");
  }

  if (monthlySummary.totalExpenses > totalMonthlyBudget * 0.8 && totalMonthlyBudget > 0) {
    aiInsights.push("⚠️ You've used 80% of your monthly budget. Consider reviewing your expenses.");
  }

  if (avgCourseProgress > 80 && activeCourses.length > 0) {
    aiInsights.push(`� Your average academic progress is ${avgCourseProgress}%. Keep up the excellent work!`);
  }

  if (skills.length > 3) {
    aiInsights.push(`🎯 You're tracking ${skills.length} skills. Great commitment to personal growth!`);
  }

  if (monthlySummary.netSavings > 0) {
    aiInsights.push(`� You've saved ${monthlySummary.netSavings.toFixed(0)} BDT this month. Excellent financial discipline!`);
  }

  // If no insights, add default ones
  if (aiInsights.length === 0) {
    aiInsights.push("👋 Welcome! Start adding tasks, courses, and expenses to get personalized insights.");
    aiInsights.push("💡 Tip: Consistency is more important than intensity. Small daily actions lead to big results.");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-foreground text-3xl mb-1">{greeting}, {userName} ☀️</h1>
        <p className="text-muted-foreground">Here's what's happening with your student life today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* AI Insights & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* AI Insights */}
        <Card className="lg:col-span-2 p-4 border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <h2 className="text-foreground">AI Insights & Suggestions</h2>
          </div>
          <div className="space-y-2">
            {aiInsights.map((insight, index) => (
              <div key={index} className="flex items-start gap-2 p-2.5 bg-accent rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2"></div>
                <p className="text-foreground text-sm flex-1">{insight}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-4 border-border bg-card">
          <h2 className="text-foreground mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => navigate('/planner')}
            >
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => navigate('/finances')}
            >
              <Plus className="w-4 h-4" />
              Log Expense
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => navigate('/journal')}
            >
              <Plus className="w-4 h-4" />
              New Journal Entry
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => navigate('/analytics')}
            >
              <TrendingUp className="w-4 h-4" />
              View Analytics
            </Button>
          </div>
        </Card>
      </div>

      {/* Upcoming Tasks & Academic Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Upcoming Tasks */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground">Upcoming Tasks</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/planner')}>View All</Button>
          </div>
          
          {upcomingTasks.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-2">No tasks scheduled</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/planner')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map((task: any) => (
                <div key={task.id} className="flex items-center justify-between p-2.5 bg-accent rounded-lg hover:bg-accent/80 transition-colors">
                  <div className="flex-1">
                    <p className="text-foreground text-sm mb-0.5">{task.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                      {task.description && ` • ${task.description.substring(0, 30)}...`}
                    </p>
                  </div>
                  <Badge className={getPriorityColor(task.priority || 'medium')} variant="secondary">
                    {task.priority || 'medium'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Academic Progress */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground">Academic Progress</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/academics')}>View All</Button>
          </div>
          
          {courses.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-2">No courses tracked yet</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/academics')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Course
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.slice(0, 4).map((course: any) => (
                <div key={course.id}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-foreground">{course.courseName}</span>
                    <span className="text-muted-foreground">{course.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${course.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Skills Overview */}
      <Card className="p-4 border-border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-foreground mb-1">Skills Development</h2>
            <p className="text-muted-foreground text-sm">
              {skills.length > 0 
                ? `Tracking ${skills.length} skill${skills.length > 1 ? 's' : ''} • ${avgSkillProgress}% avg progress` 
                : 'No skills tracked yet'}
            </p>
          </div>
          <div className="flex gap-2">
            {skills.slice(0, 4).map((skill: any) => (
              <div
                key={skill.id}
                className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium"
              >
                {skill.name}
              </div>
            ))}
            {skills.length === 0 && (
              <Button variant="outline" size="sm" onClick={() => navigate('/skills')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Skills
              </Button>
            )}
            {skills.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => navigate('/skills')}>
                View All
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
