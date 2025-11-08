import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { analyticsAPI } from '../../lib/api';

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
  const { monthlyStats, subjectPerformance, skills, expenseCategories, weeklyTaskCompletion, dailyTaskCompletion, timeBalance, totalIncome, totalExpenses } = analyticsData;

  // Calculate dynamic monthly stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Month navigation handlers
  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleToday = () => {
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
  };

  // Generate calendar data for the selected month
  const generateCalendarData = () => {
    const year = selectedYear;
    const month = selectedMonth;
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
      
      const dayData = dailyTaskCompletion[dateString] || { completed: 0, total: 0, tasks: [] };
      const completionRate = dayData.total > 0 ? (dayData.completed / dayData.total) * 100 : -1;

      const today = new Date();
      const isToday = dateString === today.toISOString().split('T')[0] && 
                      month === today.getMonth() && 
                      year === today.getFullYear();

      calendarDays.push({
        day,
        date: dateString,
        completionRate,
        tasksCompleted: dayData.completed,
        tasksTotal: dayData.total,
        tasks: dayData.tasks || [],
        isToday
      });
    }

    return calendarDays;
  };

  const calendarDays = generateCalendarData();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Use dynamic time balance from API, fallback to defaults if not available
  const balanceData = timeBalance ? [
    { category: "Study", value: timeBalance.study, color: "bg-blue-500" },
    { category: "Skills", value: timeBalance.skills, color: "bg-violet-500" },
    { category: "Lifestyle", value: timeBalance.lifestyle, color: "bg-green-500" },
    { category: "Social", value: timeBalance.social, color: "bg-orange-500" },
    { category: "Rest", value: timeBalance.rest, color: "bg-gray-400" }
  ] : [
    { category: "Study", value: 0, color: "bg-blue-500" },
    { category: "Skills", value: 0, color: "bg-violet-500" },
    { category: "Lifestyle", value: 0, color: "bg-green-500" },
    { category: "Social", value: 0, color: "bg-orange-500" },
    { category: "Rest", value: 0, color: "bg-gray-400" }
  ];

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl mb-0.5">Analytics Dashboard</h1>
          <p className="text-muted-foreground text-sm">Your comprehensive performance overview</p>
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
      <Card className="p-3 border-border bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border-violet-200 dark:border-violet-800">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-foreground">Your Monthly Summary</h2>
          <Badge className="ml-auto bg-violet-500">{monthNames[currentMonth]} {currentYear}</Badge>
        </div>
        <div className="grid grid-cols-5 gap-2">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Monthly Calendar - Redesigned */}
        <Card className="p-4 border-border bg-card">
          {/* Header with Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-foreground text-xl font-semibold mb-0.5">Task Completion Calendar</h2>
              <p className="text-muted-foreground text-xs">Track your daily productivity</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs font-medium"
                onClick={handleToday}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Month/Year Display */}
          <div className="flex items-center justify-center mb-4">
            <Badge variant="secondary" className="text-sm font-semibold px-4 py-1.5">
              {monthNames[selectedMonth]} {selectedYear}
            </Badge>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-xs text-muted-foreground font-semibold text-center py-1.5">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((dayData, index) => {
              if (!dayData) {
                return <div key={`empty-${index}`} className="h-12" />;
              }

              const getCompletionColor = (rate: number) => {
                if (rate === -1) return 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700';
                if (rate === 0) return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900';
                if (rate < 25) return 'bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-800';
                if (rate < 50) return 'bg-orange-100 dark:bg-orange-950/50 border-orange-300 dark:border-orange-800';
                if (rate < 75) return 'bg-yellow-100 dark:bg-yellow-950/50 border-yellow-300 dark:border-yellow-800';
                if (rate < 100) return 'bg-blue-100 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800';
                return 'bg-green-100 dark:bg-green-950/50 border-green-300 dark:border-green-800';
              };

              const getProgressGradient = (rate: number) => {
                if (rate === -1) return '';
                if (rate === 0) return 'bg-gradient-to-br from-red-400 to-red-500';
                if (rate < 25) return 'bg-gradient-to-br from-red-400 to-red-500';
                if (rate < 50) return 'bg-gradient-to-br from-orange-400 to-orange-500';
                if (rate < 75) return 'bg-gradient-to-br from-yellow-400 to-yellow-500';
                if (rate < 100) return 'bg-gradient-to-br from-blue-400 to-blue-500';
                return 'bg-gradient-to-br from-green-400 to-green-500';
              };

              const completedTasks = dayData.tasks?.filter((t: any) => t.status === 'completed') || [];
              const incompleteTasks = dayData.tasks?.filter((t: any) => t.status !== 'completed') || [];
              const hasTasks = dayData.completionRate >= 0;

              return (
                <div
                  key={dayData.date}
                  className={`h-12 flex flex-col items-center justify-center rounded-lg border-2 transition-all cursor-pointer group relative overflow-hidden ${
                    dayData.isToday
                      ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-1 dark:ring-offset-background shadow-md scale-105 z-10'
                      : getCompletionColor(dayData.completionRate)
                  } hover:scale-105 hover:shadow-md hover:z-10`}
                >
                  {/* Progress Background */}
                  {hasTasks && (
                    <div 
                      className={`absolute inset-0 ${getProgressGradient(dayData.completionRate)} opacity-20`}
                      style={{ height: `${dayData.completionRate}%` }}
                    />
                  )}

                  {/* Date Number */}
                  <span className={`text-xs font-semibold relative z-10 leading-none ${
                    dayData.isToday 
                      ? 'text-primary' 
                      : hasTasks 
                        ? 'text-foreground' 
                        : 'text-muted-foreground'
                  }`}>
                    {dayData.day}
                  </span>

                  {/* Completion Indicator */}
                  {hasTasks && (
                    <div className="relative z-10 mt-0.5">
                      <div className={`w-1 h-1 rounded-full ${getProgressGradient(dayData.completionRate)} shadow-sm`} />
                    </div>
                  )}

                  {/* Completion Percentage Badge */}
                  {hasTasks && dayData.completionRate > 0 && (
                    <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-background/90 backdrop-blur-sm text-[8px] font-bold px-1 py-0.5 rounded border border-border">
                        {Math.round(dayData.completionRate)}%
                      </div>
                    </div>
                  )}

                  {/* Enhanced Tooltip with Task Details */}
                  {dayData.tasksTotal > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none min-w-[240px]">
                      <div className="bg-popover text-popover-foreground text-xs rounded-lg px-3 py-2.5 shadow-xl border border-border backdrop-blur-sm">
                        <div className="font-semibold mb-2 text-sm border-b border-border pb-1.5">
                          {new Date(dayData.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-muted-foreground">Completion</span>
                            <span className="font-bold text-foreground">
                              {dayData.tasksCompleted}/{dayData.tasksTotal} ({Math.round(dayData.completionRate)}%)
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${getProgressGradient(dayData.completionRate)}`}
                              style={{ width: `${dayData.completionRate}%` }}
                            />
                          </div>
                        </div>
                        {completedTasks.length > 0 && (
                          <div className="mb-2">
                            <div className="text-[10px] font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              Completed ({completedTasks.length})
                            </div>
                            <div className="text-[10px] text-green-700 dark:text-green-300 space-y-0.5 pl-3">
                              {completedTasks.slice(0, 3).map((task: any, idx: number) => (
                                <div key={idx} className="truncate">✓ {task.title}</div>
                              ))}
                              {completedTasks.length > 3 && (
                                <div className="text-muted-foreground">+{completedTasks.length - 3} more</div>
                              )}
                            </div>
                          </div>
                        )}
                        {incompleteTasks.length > 0 && (
                          <div>
                            <div className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                              Pending ({incompleteTasks.length})
                            </div>
                            <div className="text-[10px] text-orange-700 dark:text-orange-300 space-y-0.5 pl-3">
                              {incompleteTasks.slice(0, 3).map((task: any, idx: number) => (
                                <div key={idx} className="truncate">○ {task.title}</div>
                              ))}
                              {incompleteTasks.length > 3 && (
                                <div className="text-muted-foreground">+{incompleteTasks.length - 3} more</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Enhanced Legend */}
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
                <span className="text-muted-foreground font-medium">No tasks</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-red-400 to-red-500" />
                <span className="text-muted-foreground font-medium">&lt;25%</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-orange-400 to-orange-500" />
                <span className="text-muted-foreground font-medium">25-50%</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500" />
                <span className="text-muted-foreground font-medium">50-75%</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-400 to-blue-500" />
                <span className="text-muted-foreground font-medium">75-99%</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-green-400 to-green-500" />
                <span className="text-muted-foreground font-medium">100%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Task Completion Over Time */}
        <Card className="p-3 border-border bg-card">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-foreground text-lg">Task Completion Over Time</h2>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <div className="space-y-1.5 mb-3">
            {weeklyTaskCompletion.map((week: any, index: number) => {
              const percentage = (week.completed / week.total) * 100;
              return (
                <div key={index}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{week.week}</span>
                    <span className="text-foreground">{week.completed}/{week.total} ({Math.round(percentage)}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Task Statistics */}
          {weeklyTaskCompletion.length > 0 && (() => {
            const totalCompleted = weeklyTaskCompletion.reduce((sum: number, w: any) => sum + w.completed, 0);
            const totalTasks = weeklyTaskCompletion.reduce((sum: number, w: any) => sum + w.total, 0);
            const avgCompletion = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
            const bestWeek = weeklyTaskCompletion.reduce((best: any, week: any) => {
              const weekRate = (week.completed / week.total) * 100;
              const bestRate = (best.completed / best.total) * 100;
              return weekRate > bestRate ? week : best;
            }, weeklyTaskCompletion[0]);
            const improvement = weeklyTaskCompletion.length > 1 ? 
              Math.round(((weeklyTaskCompletion[weeklyTaskCompletion.length - 1].completed / weeklyTaskCompletion[weeklyTaskCompletion.length - 1].total) * 100) - 
                         ((weeklyTaskCompletion[0].completed / weeklyTaskCompletion[0].total) * 100)) : 0;

            return (
              <>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="p-2 bg-muted rounded-lg">
                    <p className="text-muted-foreground text-xs mb-0.5">Total Completed</p>
                    <p className="text-foreground font-bold text-sm">{totalCompleted}/{totalTasks}</p>
                  </div>
                  <div className="p-2 bg-muted rounded-lg">
                    <p className="text-muted-foreground text-xs mb-0.5">Avg Completion</p>
                    <p className="text-foreground font-bold text-sm">{avgCompletion}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="p-2 bg-muted rounded-lg">
                    <p className="text-muted-foreground text-xs mb-0.5">Best Week</p>
                    <p className="text-foreground font-bold text-sm">{bestWeek.week}</p>
                    <p className="text-green-600 dark:text-green-400 text-xs mt-0.5">
                      {Math.round((bestWeek.completed / bestWeek.total) * 100)}%
                    </p>
                  </div>
                  <div className="p-2 bg-muted rounded-lg">
                    <p className="text-muted-foreground text-xs mb-0.5">Trend</p>
                    <div className="flex items-center gap-1">
                      {improvement > 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          <p className="text-green-600 dark:text-green-400 font-bold text-sm">+{improvement}%</p>
                        </>
                      ) : improvement < 0 ? (
                        <>
                          <TrendingDown className="w-3 h-3 text-red-500" />
                          <p className="text-red-600 dark:text-red-400 font-bold text-sm">{improvement}%</p>
                        </>
                      ) : (
                        <>
                          <span className="text-muted-foreground text-sm">→</span>
                          <p className="text-muted-foreground font-bold text-sm">Stable</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-green-700 dark:text-green-300 text-xs">
                    📈 {avgCompletion >= 80 ? 'Excellent completion rate!' : avgCompletion >= 60 ? 'Good progress, keep it up!' : 'Keep working on consistency!'}
                  </p>
                </div>
              </>
            );
          })()}
        </Card>
      </div>

      {/* Charts Row 1.5 - Time Balance and Financial Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Study vs Skill vs Lifestyle Balance */}
        <Card className="p-3 border-border bg-card">
          <h2 className="text-foreground mb-1.5 text-lg">Time Balance Analysis</h2>
          <div className="flex items-center justify-center mb-2">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                {balanceData.map((item, index) => {
                  const total = 100;
                  const percentage = item.value;
                  const circumference = 2 * Math.PI * 50;
                  const offset = balanceData.slice(0, index).reduce((sum, d) => sum + (d.value / total) * circumference, 0);
                  
                  // Convert Tailwind color classes to hex for SVG
                  const colorMap: { [key: string]: string } = {
                    'bg-blue-500': '#3b82f6',
                    'bg-violet-500': '#8b5cf6',
                    'bg-green-500': '#22c55e',
                    'bg-orange-500': '#f97316',
                    'bg-gray-400': '#9ca3af'
                  };
                  
                  return (
                    <circle
                      key={index}
                      cx="64"
                      cy="64"
                      r="50"
                      stroke={colorMap[item.color] || '#9ca3af'}
                      strokeWidth="16"
                      fill="none"
                      strokeDasharray={`${(percentage / 100) * circumference} ${circumference}`}
                      strokeDashoffset={-offset}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-foreground text-xl font-bold">
                    {balanceData.reduce((sum, item) => sum + item.value, 0)}%
                  </p>
                  <p className="text-muted-foreground text-xs">Time Used</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            {balanceData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
                  <span className="text-muted-foreground text-xs">{item.category}</span>
                </div>
                <span className="text-foreground font-medium text-xs">{item.value}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Financial Health Summary */}
        <Card className="p-3 border-border bg-card">
          <h2 className="text-foreground mb-1.5 text-lg">Financial Health Summary</h2>
          <div className="space-y-2">
            <div className="p-2 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground text-xs">Total Income</span>
                <span className="text-foreground font-bold text-sm">${totalIncome || 0}</span>
              </div>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground text-xs">Total Expenses</span>
                <span className="text-foreground font-bold text-sm">${totalExpenses || 0}</span>
              </div>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground text-xs">Net Balance</span>
                <span className={`font-bold text-sm ${(totalIncome || 0) - (totalExpenses || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  ${((totalIncome || 0) - (totalExpenses || 0)).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground text-xs">Savings Rate</span>
                <span className="text-foreground font-bold text-sm">{monthlyStats.savingsRate}%</span>
              </div>
              <div className="w-full bg-muted-foreground/20 rounded-full h-1.5 mt-1">
                <div 
                  className={`h-1.5 rounded-full ${
                    monthlyStats.savingsRate >= 20 ? 'bg-green-500' :
                    monthlyStats.savingsRate >= 10 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(monthlyStats.savingsRate, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
          {expenseCategories && expenseCategories.length > 0 && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-700 dark:text-blue-300 text-xs font-semibold mb-0.5">💡 Top Category</p>
              <p className="text-muted-foreground text-xs">
                {expenseCategories[0]?.category}: ${expenseCategories[0]?.amount} ({expenseCategories[0]?.percentage}%)
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Academic Performance */}
        <Card className="p-3 border-border bg-card">
          <h2 className="text-foreground mb-2 text-lg">Subject Performance Trends</h2>
          <div className="space-y-2">
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

        {/* Skills Progress Overview */}
        <Card className="p-3 border-border bg-card">
          <h2 className="text-foreground mb-2 text-lg">Skills Progress Overview</h2>
          <div className="space-y-2">
            {skills && skills.length > 0 ? (
              skills.slice(0, 5).map((skill: any) => (
                <div key={skill.id} className="p-2 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-foreground font-medium text-sm">{skill.name}</span>
                    <span className="text-foreground font-bold text-sm">{Math.round(skill.progress)}%</span>
                  </div>
                  <div className="w-full bg-muted-foreground/20 rounded-full h-1.5">
                    <div 
                      className="bg-gradient-to-r from-violet-500 to-purple-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${skill.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-muted-foreground text-xs">{skill.milestones?.filter((m: any) => m.completed).length || 0}/{skill.milestones?.length || 0} milestones</span>
                    <span className="text-muted-foreground text-xs">{skill.timeSpent || '0h'}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4 text-sm">No skills added yet</p>
            )}
          </div>
          {skills && skills.length > 5 && (
            <div className="mt-2 text-center">
              <p className="text-muted-foreground text-xs">+{skills.length - 5} more skills</p>
            </div>
          )}
        </Card>

        {/* Expense Insights */}
        <Card className="p-3 border-border bg-card">
          <h2 className="text-foreground mb-2 text-lg">Expense Insights</h2>
          <div className="space-y-2 mb-2">
            {expenseCategories && expenseCategories.length > 0 ? (
              expenseCategories.slice(0, 5).map((expense: any, index: number) => (
                <div key={index}>
                  <div className="flex items-center justify-between text-sm mb-1">
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
              <p className="text-muted-foreground text-center py-4 text-sm">No expenses recorded yet</p>
            )}
          </div>
          {expenseCategories && expenseCategories.length > 0 && (
            <div className="p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-700 dark:text-blue-300 text-xs mb-1 font-semibold">💡 Spending Insight</p>
              <p className="text-muted-foreground text-xs">
                {expenseCategories[0]?.percentage > 50 
                  ? `Your top category (${expenseCategories[0].category}) accounts for ${expenseCategories[0].percentage}% of spending. Consider reviewing this category for savings.`
                  : 'Track your expenses regularly to identify saving opportunities.'}
              </p>
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}
