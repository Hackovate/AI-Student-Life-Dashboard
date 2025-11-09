import { useState, useEffect } from 'react';
import { CheckCircle2, Wallet, Plus, TrendingUp, BookOpen, Target, Loader2, FileText } from 'lucide-react';
import { StatCard } from '../StatCard';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { 
  tasksAPI, 
  coursesAPI, 
  financeAPI, 
  savingsGoalAPI, 
  monthlyBudgetAPI,
  skillsAPI,
  authAPI,
  journalAPI,
  aiChatAPI,
} from '../../lib/api';
import { toast } from 'sonner';
import { useNotifications } from '../../lib/NotificationContext';

interface DashboardProps {
  onNavigate?: (section: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps = {}) {
  const navigate = (path: string) => {
    const section = path.replace('/', '');
    onNavigate?.(section);
  };
  const { fetchNotifications, refreshUnreadCount } = useNotifications();
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
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  
  // Summary states
  const [summaryType, setSummaryType] = useState<'daily' | 'monthly'>('daily');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  
  // Form states
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'pending'
  });
  
  const [newExpense, setNewExpense] = useState({
    description: '',
    category: 'Food',
    amount: '',
    type: 'expense' as 'expense' | 'income' | 'savings',
    goalId: ''
  });
  
  const [newJournal, setNewJournal] = useState({
    title: '',
    content: '',
    mood: 'neutral' as 'happy' | 'sad' | 'neutral' | 'anxious' | 'excited',
    tags: ''
  });

  useEffect(() => {
    loadDashboardData();
    
    // Force immediate time update
    setCurrentTime(new Date());
    
    // Update time every minute to refresh greeting
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    // Insights are cached for 24 hours - no need to refresh on data changes
    return () => {
      clearInterval(timeInterval);
    };
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
  
  // Handler functions for Quick Actions
  const handleAddTask = async () => {
    if (!newTask.title) {
      toast.error('Please enter a task title');
      return;
    }
    
    try {
      await tasksAPI.create({
        title: newTask.title,
        description: newTask.description || null,
        dueDate: newTask.dueDate || null,
        priority: newTask.priority,
        status: newTask.status
      });
      
      toast.success('Task added successfully!');
      setNewTask({ title: '', description: '', dueDate: '', priority: 'medium', status: 'pending' });
      setIsTaskModalOpen(false);
      await loadDashboardData();
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    }
  };
  
  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (newExpense.type === 'savings' && !newExpense.goalId) {
      toast.error('Please select a savings goal');
      return;
    }
    
    try {
      const amount = parseFloat(newExpense.amount);
      let category = newExpense.category;
      let goalId = newExpense.goalId || undefined;
      
      // If it's a savings transaction, update the goal
      if (newExpense.type === 'savings' && newExpense.goalId) {
        const selectedGoal = savingsGoals.find(g => g.id === newExpense.goalId);
        if (selectedGoal) {
          category = selectedGoal.title;
          const newCurrentAmount = (selectedGoal.currentAmount || 0) + amount;
          await savingsGoalAPI.update(selectedGoal.id, {
            currentAmount: newCurrentAmount,
            status: newCurrentAmount >= selectedGoal.targetAmount ? 'completed' : selectedGoal.status
          });
        }
      }
      
      await financeAPI.create({
        category,
        amount,
        description: newExpense.description,
        type: newExpense.type,
        goalId
      });
      
      const typeLabel = newExpense.type === 'income' ? 'Income' : newExpense.type === 'savings' ? 'Savings' : 'Expense';
      toast.success(`${typeLabel} added successfully!`);
      setNewExpense({ description: '', category: 'Food', amount: '', type: 'expense', goalId: '' });
      setIsExpenseModalOpen(false);
      await loadDashboardData();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add transaction');
    }
  };
  
  const handleAddJournal = async () => {
    if (!newJournal.title || !newJournal.content) {
      toast.error('Please fill in title and content');
      return;
    }
    
    try {
      await journalAPI.create({
        title: newJournal.title,
        content: newJournal.content,
        mood: newJournal.mood,
        tags: newJournal.tags ? newJournal.tags.split(',').map(t => t.trim()) : []
      });
      
      toast.success('Journal entry added successfully!');
      setNewJournal({ title: '', content: '', mood: 'neutral', tags: '' });
      setIsJournalModalOpen(false);
      await loadDashboardData();
    } catch (error) {
      console.error('Error adding journal:', error);
      toast.error('Failed to add journal entry');
    }
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const response = summaryType === 'daily' 
        ? await aiChatAPI.generateDailySummary()
        : await aiChatAPI.generateMonthlySummary();
      
      if (response.success) {
        toast.success(`${summaryType === 'daily' ? 'Daily' : 'Monthly'} summary generated successfully! Check your notifications.`);
        // Refresh notifications to show the new summary notification
        await fetchNotifications();
        await refreshUnreadCount();
      } else {
        throw new Error(response.message || 'Failed to generate summary');
      }
    } catch (error: any) {
      console.error(`Error generating ${summaryType} summary:`, error);
      toast.error(error.message || `Failed to generate ${summaryType} summary. Please try again.`);
    } finally {
      setGeneratingSummary(false);
    }
  };
  
  const userName = user?.firstName || user?.email?.split('@')[0] || "Student";
  const currentHour = currentTime.getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening";

  // Calculate stats from real data with proper error handling
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'done').length;
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate active courses and average progress
  const activeCourses = courses.filter(c => c.status === 'ongoing' || c.status === 'active');
  const avgCourseProgress = activeCourses.length > 0 
    ? Math.round(activeCourses.reduce((sum, c) => sum + (Number(c.progress) || 0), 0) / activeCourses.length) 
    : 0;

  // Calculate savings
  const activeSavingsGoals = savingsGoals.filter(g => g.status === 'active');
  const totalSavingsGoal = activeSavingsGoals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
  const currentSavings = activeSavingsGoals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);

  // Calculate budget
  const totalMonthlyBudget = monthlyBudgets
    .filter(b => b.status === 'active')
    .reduce((sum, b) => sum + (Number(b.targetAmount) || 0), 0);

  // Calculate skills progress - use progress field, not level
  const avgSkillProgress = skills.length > 0
    ? Math.round(skills.reduce((sum, s) => {
        // Try to get progress from various possible fields
        const progress = Number(s.progress) || 
                        (s.milestones && s.milestones.length > 0 
                          ? Math.round((s.milestones.filter((m: any) => m.completed).length / s.milestones.length) * 100)
                          : 0);
        return sum + (isNaN(progress) ? 0 : progress);
      }, 0) / skills.length)
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
      value: `${currentSavings.toFixed(0)} BDT`,
      icon: Wallet,
      gradient: "bg-gradient-to-br from-violet-500 to-purple-500",
      subtext: totalSavingsGoal > 0 ? `${Math.round((currentSavings / totalSavingsGoal) * 100)}% of goal` : 'No goal set'
    },
    {
      title: "Skills Tracked",
      value: skills.length.toString(),
      icon: Target,
      gradient: "bg-gradient-to-br from-orange-500 to-red-500",
      subtext: isNaN(avgSkillProgress) ? '0% avg progress' : `${avgSkillProgress}% avg progress`
    }
  ];

  // Get upcoming tasks (not done) - from daily planner
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingTasks = tasks
    .filter(t => {
      // Filter out completed tasks
      if (t.status === 'completed' || t.status === 'done') return false;
      
      // Include tasks with no due date or due date in the future/today
      if (!t.dueDate) return true;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today;
    })
    .sort((a, b) => {
      // Sort by priority first (high priority first)
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      
      // Then sort by due date (earliest first)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      
      return 0;
    })
    .slice(0, 3); // Show only 3 tasks

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };


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
    <div className="space-y-6">
      {/* Greeting */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-foreground text-3xl md:text-4xl font-bold mb-2">
            {greeting}, {userName} 
            <span className="ml-2">☀️</span>
          </h1>
          <p className="text-muted-foreground text-base">Here's what's happening with your student life today</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={summaryType} onValueChange={(value: 'daily' | 'monthly') => setSummaryType(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleGenerateSummary}
            disabled={generatingSummary}
            className="gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all"
            title={`Generate ${summaryType === 'daily' ? 'Daily' : 'Monthly'} Summary`}
          >
            {generatingSummary ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {generatingSummary ? 'Generating...' : 'Generate Summary'}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="p-6 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-foreground mb-4 text-xl font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 h-12 hover:bg-primary/5 hover:border-primary/50 transition-all"
              onClick={() => setIsTaskModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 h-12 hover:bg-primary/5 hover:border-primary/50 transition-all"
              onClick={() => setIsExpenseModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Log Expense
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 h-12 hover:bg-primary/5 hover:border-primary/50 transition-all"
              onClick={() => setIsJournalModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              New Journal Entry
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 h-12 hover:bg-primary/5 hover:border-primary/50 transition-all"
              onClick={() => navigate('/analytics')}
            >
              <TrendingUp className="w-4 h-4" />
              View Analytics
            </Button>
          </div>
        </Card>

      {/* Upcoming Tasks & Academic Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Tasks */}
        <Card className="p-6 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground text-xl font-semibold">Upcoming Tasks</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/planner')} className="hover:text-primary">
              View All
            </Button>
          </div>
          
          {upcomingTasks.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-3 text-sm">No tasks scheduled</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/planner')} className="hover:bg-primary/5 hover:border-primary/50">
                <Plus className="w-3 h-3 mr-1.5" />
                Add Your First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map((task: any) => (
                <div 
                  key={task.id} 
                  className="flex items-center justify-between p-3 bg-accent/50 rounded-lg hover:bg-accent transition-all border border-border/50 cursor-pointer"
                  onClick={() => navigate('/planner')}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.dueDate && (
                        <span className="text-muted-foreground text-xs">
                          {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {task.estimatedMinutes && (
                        <span className="text-muted-foreground text-xs">
                          • {Math.round(task.estimatedMinutes / 60 * 10) / 10}h
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={`${getPriorityColor(task.priority || 'medium')} text-xs ml-2 flex-shrink-0`} variant="secondary">
                    {task.priority || 'medium'}
                  </Badge>
                </div>
              ))}
              {tasks.filter(t => t.status !== 'completed' && t.status !== 'done').length > 3 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/planner')} 
                  className="w-full mt-2 text-primary hover:text-primary hover:bg-primary/5"
                >
                  View All Tasks ({tasks.filter(t => t.status !== 'completed' && t.status !== 'done').length})
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* Academic Progress */}
        <Card className="p-6 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground text-xl font-semibold">Academic Progress</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/academics')} className="hover:text-primary">
              View All
            </Button>
          </div>
          
          {courses.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-3 text-sm">No courses tracked yet</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/academics')} className="hover:bg-primary/5 hover:border-primary/50">
                <Plus className="w-3 h-3 mr-1.5" />
                Add Course
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.slice(0, 4).map((course: any) => (
                <div key={course.id}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-foreground font-medium">{course.courseName}</span>
                    <span className="text-muted-foreground font-semibold">{course.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all shadow-sm"
                      style={{ width: `${course.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      
      {/* Add Task Modal */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task to track your progress and stay organized.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-3">
            <div>
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title"
              />
            </div>
            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="task-dueDate">Due Date</Label>
              <Input
                id="task-dueDate"
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={newTask.priority}
                onValueChange={(value: any) => setNewTask({ ...newTask, priority: value as 'low' | 'medium' | 'high' })}
              >
                <SelectTrigger id="task-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="task-status">Status</Label>
              <Select
                value={newTask.status}
                onValueChange={(value: any) => setNewTask({ ...newTask, status: value as 'pending' | 'in-progress' | 'completed' })}
              >
                <SelectTrigger id="task-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Expense Modal */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Transaction</DialogTitle>
            <DialogDescription>
              Record a new income or expense transaction to track your finances.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-3">
            <div>
              <Label htmlFor="expense-type">Transaction Type *</Label>
              <Select
                value={newExpense.type}
                onValueChange={(value: any) => setNewExpense({ ...newExpense, type: value, goalId: value === 'savings' ? newExpense.goalId : '' })}
              >
                <SelectTrigger id="expense-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newExpense.type === 'savings' ? (
              <div>
                <Label htmlFor="expense-goal">Savings Goal *</Label>
                <Select
                  value={newExpense.goalId}
                  onValueChange={(value: any) => setNewExpense({ ...newExpense, goalId: value })}
                >
                  <SelectTrigger id="expense-goal">
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {savingsGoals
                      .filter(g => g.status === 'active')
                      .map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label htmlFor="expense-category">Category *</Label>
                <Select
                  value={newExpense.category}
                  onValueChange={(value: any) => setNewExpense({ ...newExpense, category: value })}
                >
                  <SelectTrigger id="expense-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Transport">Transport</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Health">Health</SelectItem>
                    <SelectItem value="Shopping">Shopping</SelectItem>
                    <SelectItem value="Bills">Bills</SelectItem>
                    <SelectItem value="Salary">Salary</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                    <SelectItem value="Gift">Gift</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label htmlFor="expense-amount">Amount (BDT) *</Label>
              <Input
                id="expense-amount"
                type="number"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label htmlFor="expense-description">Description *</Label>
              <Textarea
                id="expense-description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="Enter description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExpense}>
              {newExpense.type === 'income' ? 'Add Income' : newExpense.type === 'savings' ? 'Add Savings' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Journal Modal */}
      <Dialog open={isJournalModalOpen} onOpenChange={setIsJournalModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
            <DialogDescription>
              Write a new journal entry to reflect on your day and track your thoughts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-3">
            <div>
              <Label htmlFor="journal-title">Title *</Label>
              <Input
                id="journal-title"
                value={newJournal.title}
                onChange={(e) => setNewJournal({ ...newJournal, title: e.target.value })}
                placeholder="Enter journal title"
              />
            </div>
            <div>
              <Label htmlFor="journal-content">Content *</Label>
              <Textarea
                id="journal-content"
                value={newJournal.content}
                onChange={(e) => setNewJournal({ ...newJournal, content: e.target.value })}
                placeholder="Write your thoughts..."
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="journal-mood">Mood</Label>
              <Select
                value={newJournal.mood}
                onValueChange={(value: any) => setNewJournal({ ...newJournal, mood: value })}
              >
                <SelectTrigger id="journal-mood">
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="happy">Happy 😊</SelectItem>
                  <SelectItem value="excited">Excited 🎉</SelectItem>
                  <SelectItem value="calm">Calm 😌</SelectItem>
                  <SelectItem value="neutral">Neutral 😐</SelectItem>
                  <SelectItem value="tired">Tired 😴</SelectItem>
                  <SelectItem value="stressed">Stressed 😰</SelectItem>
                  <SelectItem value="sad">Sad 😢</SelectItem>
                  <SelectItem value="anxious">Anxious 😟</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="journal-tags">Tags (comma-separated)</Label>
              <Input
                id="journal-tags"
                value={newJournal.tags}
                onChange={(e) => setNewJournal({ ...newJournal, tags: e.target.value })}
                placeholder="e.g., study, personal, work"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsJournalModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddJournal}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
