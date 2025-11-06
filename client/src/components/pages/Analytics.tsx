import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Sparkles } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { analyticsAPI } from '../../lib/api';

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await analyticsAPI.getAll();
        setAnalyticsData(data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching analytics:', err);
        setError(err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-500">{error || 'No data available'}</p>
      </div>
    );
  }

  // Extract data from API response
  const { monthlyStats, subjectPerformance, skills, expenses, expenseCategories, weeklyTaskCompletion, dailyTaskCompletion, achievements } = analyticsData;

  // Calculate dynamic monthly stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Generate calendar data for the current month
  const generateCalendarData = () => {
    const year = currentYear;
    const month = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const calendarDays = [];
    
    // Add empty days for alignment
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }

    // Add actual days with task completion data from backend
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      
      const dayData = dailyTaskCompletion[dateString] || { completed: 0, total: 0 };
      const completionRate = dayData.total > 0 ? (dayData.completed / dayData.total) * 100 : -1;

      calendarDays.push({
        day,
        date: dateString,
        completionRate,
        tasksCompleted: dayData.completed,
        tasksTotal: dayData.total,
        isToday: dateString === new Date().toISOString().split('T')[0]
      });
    }

    return calendarDays;
  };

  const calendarDays = generateCalendarData();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const balanceData = [
    { category: "Study", value: 35, color: "bg-blue-500" },
    { category: "Skills", value: 25, color: "bg-violet-500" },
    { category: "Lifestyle", value: 20, color: "bg-green-500" },
    { category: "Social", value: 12, color: "bg-orange-500" },
    { category: "Rest", value: 8, color: "bg-gray-400" }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-3xl mb-1">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Your comprehensive performance overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Last 30 Days
          </Button>
          <Button variant="outline">Export Report</Button>
        </div>
      </div>

      {/* Monthly Summary */}
      <Card className="p-4 border-border bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border-violet-200 dark:border-violet-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-foreground">Your Monthly Summary</h2>
          <Badge className="ml-auto bg-violet-500">{monthNames[currentMonth]} {currentYear}</Badge>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="p-3 bg-card rounded-lg border border-border">
            <p className="text-violet-600 dark:text-violet-400 text-sm mb-1">Tasks Completed</p>
            <p className="text-foreground text-2xl">{monthlyStats.tasksCompleted}</p>
            <p className="text-green-600 dark:text-green-400 text-xs mt-1">This month</p>
          </div>
          <div className="p-3 bg-card rounded-lg border border-border">
            <p className="text-violet-600 dark:text-violet-400 text-sm mb-1">Study Hours</p>
            <p className="text-foreground text-2xl">{monthlyStats.studyHours}h</p>
            <p className="text-green-600 dark:text-green-400 text-xs mt-1">Total time</p>
          </div>
          <div className="p-3 bg-card rounded-lg border border-border">
            <p className="text-violet-600 dark:text-violet-400 text-sm mb-1">Savings Rate</p>
            <p className="text-foreground text-2xl">{monthlyStats.savingsRate}%</p>
            <p className="text-green-600 dark:text-green-400 text-xs mt-1">Current rate</p>
          </div>
          <div className="p-3 bg-card rounded-lg border border-border">
            <p className="text-violet-600 dark:text-violet-400 text-sm mb-1">Wellness Score</p>
            <p className="text-foreground text-2xl">{monthlyStats.wellnessScore}</p>
            <p className="text-green-600 dark:text-green-400 text-xs mt-1">Habit completion</p>
          </div>
          <div className="p-3 bg-card rounded-lg border border-border">
            <p className="text-violet-600 dark:text-violet-400 text-sm mb-1">Skill Progress</p>
            <p className="text-foreground text-2xl">{monthlyStats.skillProgress}%</p>
            <p className="text-green-600 dark:text-green-400 text-xs mt-1">Average progress</p>
          </div>
        </div>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Monthly Calendar */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground">Task Completion Calendar</h2>
            <Badge variant="secondary">{monthNames[currentMonth]} {currentYear}</Badge>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-xs text-muted-foreground font-medium py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayData, index) => {
              if (!dayData) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const getDotColor = (rate: number) => {
                if (rate === -1) return 'bg-gray-200 dark:bg-gray-700'; // No tasks
                if (rate === 0) return 'bg-gray-400 dark:bg-gray-600'; // 0% completion
                if (rate < 25) return 'bg-red-400'; // < 25%
                if (rate < 50) return 'bg-orange-400'; // < 50%
                if (rate < 75) return 'bg-yellow-400'; // < 75%
                if (rate < 100) return 'bg-blue-400'; // < 100%
                return 'bg-green-500'; // 100%
              };

              return (
                <div
                  key={dayData.date}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg border transition-all cursor-pointer group relative ${
                    dayData.isToday
                      ? 'border-primary bg-primary/10 ring-2 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className={`text-xs ${dayData.isToday ? 'text-primary font-bold' : 'text-foreground'}`}>
                    {dayData.day}
                  </span>
                  {dayData.completionRate >= 0 && (
                    <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${getDotColor(dayData.completionRate)}`} />
                  )}
                  
                  {/* Tooltip */}
                  {dayData.tasksTotal > 0 && (
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none">
                      <div className="bg-popover text-popover-foreground text-xs rounded-lg px-2 py-1 shadow-lg border border-border whitespace-nowrap">
                        {dayData.tasksCompleted}/{dayData.tasksTotal} tasks ({Math.round(dayData.completionRate)}%)
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
              <span className="text-muted-foreground">No tasks</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-muted-foreground">&lt;25%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-muted-foreground">25-50%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-muted-foreground">50-75%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-muted-foreground">75-99%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">100%</span>
            </div>
          </div>
        </Card>

        {/* Task Completion Over Time */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground">Task Completion Over Time</h2>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="space-y-3">
            {weeklyTaskCompletion.map((week, index) => {
              const percentage = (week.completed / week.total) * 100;
              return (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{week.week}</span>
                    <span className="text-foreground">{week.completed}/{week.total} ({Math.round(percentage)}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          {weeklyTaskCompletion.length > 0 && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-300 text-sm">
                📈 Keep up the great work with your task completion!
              </p>
            </div>
          )}
        </Card>

        {/* Study vs Skill vs Lifestyle Balance */}
        <Card className="p-4 border-border bg-card">
          <h2 className="text-foreground mb-3">Time Balance Analysis</h2>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-40 h-40">
              <svg className="w-40 h-40 transform -rotate-90">
                {[
                  { category: "Study", value: 35, color: "bg-blue-500" },
                  { category: "Skills", value: 25, color: "bg-violet-500" },
                  { category: "Lifestyle", value: 20, color: "bg-green-500" },
                  { category: "Social", value: 12, color: "bg-orange-500" },
                  { category: "Rest", value: 8, color: "bg-gray-400" }
                ].map((item, index) => {
                  const total = 100;
                  const percentage = item.value;
                  const circumference = 2 * Math.PI * 60;
                  const offset = [35, 25, 20, 12, 8].slice(0, index).reduce((sum, d) => sum + (d / total) * circumference, 0);
                  
                  return (
                    <circle
                      key={index}
                      cx="80"
                      cy="80"
                      r="60"
                      stroke={item.color.replace('bg-', '#')}
                      strokeWidth="20"
                      fill="none"
                      strokeDasharray={`${(percentage / 100) * circumference} ${circumference}`}
                      strokeDashoffset={-offset}
                      className={item.color}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-foreground text-2xl font-bold">100%</p>
                  <p className="text-muted-foreground text-xs">Time Used</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { category: "Study", value: 35, color: "bg-blue-500" },
              { category: "Skills", value: 25, color: "bg-violet-500" },
              { category: "Lifestyle", value: 20, color: "bg-green-500" },
              { category: "Social", value: 12, color: "bg-orange-500" },
              { category: "Rest", value: 8, color: "bg-gray-400" }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-muted-foreground text-sm">{item.category}</span>
                </div>
                <span className="text-foreground font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Academic Performance */}
        <Card className="p-4 border-border bg-card">
          <h2 className="text-foreground mb-3">Subject Performance Trends</h2>
          <div className="space-y-3">
            {subjectPerformance && subjectPerformance.length > 0 ? (
              subjectPerformance.map((subject: any) => (
                <div key={subject.id} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground font-medium">{subject.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-bold">{subject.score}%</span>
                      {subject.trend === 'up' && <span className="text-green-500">↑</span>}
                      {subject.trend === 'down' && <span className="text-red-500">↓</span>}
                      {subject.trend === 'neutral' && <span className="text-muted-foreground">→</span>}
                    </div>
                  </div>
                  <div className="w-full bg-muted-foreground/20 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        subject.score >= 90 ? 'bg-green-500' :
                        subject.score >= 80 ? 'bg-blue-500' :
                        subject.score >= 70 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${subject.score}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No subjects added yet</p>
            )}
          </div>
        </Card>

        {/* Expense Insights */}
        <Card className="p-4 border-border bg-card">
          <h2 className="text-foreground mb-3">Expense Insights</h2>
          <div className="space-y-3 mb-3">
            {expenseCategories.length > 0 ? (
              expenseCategories.slice(0, 5).map((expense, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{expense.category}</span>
                    <span className="text-foreground font-medium">${expense.amount} ({expense.percentage}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full"
                      style={{ width: `${expense.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No expenses recorded yet</p>
            )}
          </div>
          {expenseCategories.length > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-1">💡 Spending Insight</p>
              <p className="text-muted-foreground text-sm">
                Track your expenses regularly to identify saving opportunities.
              </p>
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}
