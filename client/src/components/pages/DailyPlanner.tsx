import { useState, useEffect } from 'react';
import { Plus, Sparkles, CheckCircle2, Circle, Clock, RefreshCw, BookOpen, Target, ListTodo } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge as BadgeComponent } from '../ui/badge';
import { ProgressModal } from '../modals/ProgressModal';
import { tasksAPI, coursesAPI, skillsAPI, planningAPI, learningAPI } from '../../lib/api';
import { toast } from 'sonner';
import { useNotifications } from '../../lib/NotificationContext';

export function DailyPlanner() {
  const { addNotification } = useNotifications();
  
  // Always initialize with today's date (use local date, not UTC)
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [isDayGenerated, setIsDayGenerated] = useState(false);
  const [dailyPlan, setDailyPlan] = useState<any>(null);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [rebalancing, setRebalancing] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [progressTask, setProgressTask] = useState<any>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    estimatedHours: '',
    daysAllocated: '',
    startDate: '',
  });
  const [aiPrediction, setAiPrediction] = useState<any>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);

  // Check if day is already generated (from localStorage) and ensure selectedDate is always today
  useEffect(() => {
    // Use local date, not UTC, to match user's timezone
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    // Always reset selectedDate to today when component mounts or refreshes
    // This ensures the date picker always shows today, not a previously selected date
    setSelectedDate(todayStr);
    
    const storedPlan = localStorage.getItem(`dailyPlan_${todayStr}`);
    if (storedPlan) {
      try {
        const plan = JSON.parse(storedPlan);
        setDailyPlan(plan);
        setIsDayGenerated(true);
      } catch (e) {
        console.error('Error parsing stored plan:', e);
      }
    } else {
      // Clear any old plan if switching to a new day
      setDailyPlan(null);
      setIsDayGenerated(false);
    }
  }, []); // Empty dependency array - only run on mount

  // Fetch all tasks for the selected date
  useEffect(() => {
    loadAllTasks();
  }, [selectedDate]);

  // Refresh tasks when page becomes visible or gains focus (e.g., when navigating back to this page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadAllTasks();
      }
    };

    const handleFocus = () => {
      loadAllTasks();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedDate]);

  // Helper to get next status in cycle: pending → in-progress → completed → in-progress (reopen)
  // Allows reverting completed tasks back to in-progress for adaptive planning
  const getNextStatus = (current: string): string => {
    const normalized = current?.toLowerCase() || 'pending';
    if (normalized === 'pending') return 'in-progress';
    if (normalized === 'in-progress') return 'completed';
    if (normalized === 'completed') return 'in-progress'; // Allow reopening completed tasks
    return 'pending';
  };

  // Load all tasks from academics, skills, and personal tasks
  const loadAllTasks = async () => {
    try {
      setLoading(true);
      const selectedDateObj = new Date(selectedDate);
      const todayStart = new Date(selectedDateObj);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(selectedDateObj);
      todayEnd.setHours(23, 59, 59, 999);

      const tasks: any[] = [];

      // 1. Fetch academic assignments
      try {
        const courses = await coursesAPI.getAll();
        courses.forEach((course: any) => {
          // API returns 'assignments' not 'assignmentsList'
          const assignments = course.assignments || [];
          assignments.forEach((assignment: any) => {
            const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
            const startDate = assignment.startDate ? new Date(assignment.startDate) : null;
            const status = assignment.status?.toLowerCase() || 'pending';
            
            // Check if assignment is relevant for the selected date
            const isDueToday = dueDate && dueDate >= todayStart && dueDate <= todayEnd;
            const isStartToday = startDate && startDate >= todayStart && startDate <= todayEnd;
            const isPendingOrInProgress = (status === 'pending' || status === 'in-progress');
            const isCompleted = (status === 'completed');
            
            // Check if selected date falls within the task's date range (for multi-day tasks)
            let isWithinDateRange = false;
            let calculatedCurrentDay = null;
            if (startDate && dueDate) {
              const start = new Date(startDate);
              start.setHours(0, 0, 0, 0);
              const due = new Date(dueDate);
              due.setHours(23, 59, 59, 999);
              isWithinDateRange = selectedDateObj >= start && selectedDateObj <= due;
              
              // Calculate current day for multi-day tasks
              if (isWithinDateRange && assignment.daysAllocated) {
                const daysDiff = Math.floor((selectedDateObj.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                calculatedCurrentDay = daysDiff + 1; // Day 1, 2, 3, etc.
              }
            }
            
            // Include if:
            // - Due date is today (always show, regardless of status)
            // - Start date is today (always show, regardless of status)
            // - Selected date is within task's date range (for multi-day tasks) - NEW
            // - Status is pending/in-progress AND due date is today or in the past (overdue or due today)
            // - Status is pending/in-progress AND no due date but start date is today or in the past
            // - Status is pending/in-progress AND no dates set (show active tasks)
            // - Status is completed AND progress < 100% (show on remaining days) OR completed within date range
            const shouldInclude = 
              isDueToday ||
              isStartToday ||
              isWithinDateRange || // Show on all days between start and due date
              (isPendingOrInProgress && dueDate && dueDate <= todayEnd) ||
              (isPendingOrInProgress && !dueDate && startDate && startDate <= todayEnd) ||
              (isPendingOrInProgress && !dueDate && !startDate) ||
              (isCompleted && (
                (assignment.progressPercentage !== null && assignment.progressPercentage < 100) || // Incomplete progress
                (dueDate && dueDate <= todayEnd) || 
                (startDate && startDate <= todayEnd) || 
                (!dueDate && !startDate)
              ));
            
            if (shouldInclude) {
              tasks.push({
                id: assignment.id,
                title: assignment.title,
                description: assignment.description,
                dueDate: assignment.dueDate,
                startDate: assignment.startDate,
                priority: assignment.points ? 'high' : 'medium',
                status: status,
                estimatedMinutes: assignment.estimatedHours ? assignment.estimatedHours * 60 : null,
                source: 'academic',
                sourceId: assignment.id,
                courseName: course.courseName || course.name, // API returns courseName
                type: 'assignment',
                progressPercentage: assignment.progressPercentage,
                actualHoursSpent: assignment.actualHoursSpent,
                daysAllocated: assignment.daysAllocated,
                currentDay: calculatedCurrentDay || assignment.currentDay || 1 // Use calculated day if within range
              });
            }
          });
        });
      } catch (error) {
        console.error('Error loading academic assignments:', error);
      }

      // 2. Fetch skill milestones
      try {
        const skills = await skillsAPI.getAll();
        skills.forEach((skill: any) => {
          (skill.milestones || []).forEach((milestone: any) => {
            const dueDate = milestone.dueDate ? new Date(milestone.dueDate) : null;
            const startDate = milestone.startDate ? new Date(milestone.startDate) : null;
            const status = milestone.status?.toLowerCase() || (milestone.completed ? 'completed' : 'pending');
            const isPendingOrInProgress = (status === 'pending' || status === 'in-progress');
            const isCompleted = (status === 'completed');
            
            // Check if selected date falls within the milestone's date range (for multi-day milestones)
            let isWithinDateRange = false;
            let calculatedCurrentDay = null;
            if (startDate && dueDate) {
              const start = new Date(startDate);
              start.setHours(0, 0, 0, 0);
              const due = new Date(dueDate);
              due.setHours(23, 59, 59, 999);
              isWithinDateRange = selectedDateObj >= start && selectedDateObj <= due;
              
              // Calculate current day for multi-day milestones
              if (isWithinDateRange && milestone.daysAllocated) {
                const daysDiff = Math.floor((selectedDateObj.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                calculatedCurrentDay = daysDiff + 1; // Day 1, 2, 3, etc.
              }
            }
            
            // Include if:
            // - Due date is today (always show, regardless of status)
            // - Start date is today (always show, regardless of status)
            // - Selected date is within milestone's date range (for multi-day milestones) - NEW
            // - Status is pending/in-progress (show active tasks)
            // - Status is completed AND progress < 100% (show on remaining days) OR completed within date range
            if (
              (dueDate && dueDate >= todayStart && dueDate <= todayEnd) ||
              (startDate && startDate >= todayStart && startDate <= todayEnd) ||
              isWithinDateRange || // Show on all days between start and due date
              isPendingOrInProgress ||
              (isCompleted && (
                (milestone.progressPercentage !== null && milestone.progressPercentage < 100) || // Incomplete progress
                (dueDate && dueDate <= todayEnd) || 
                (startDate && startDate <= todayEnd) || 
                (!dueDate && !startDate)
              ))
            ) {
              tasks.push({
                id: milestone.id,
                title: milestone.name,
                description: null,
                dueDate: milestone.dueDate,
                startDate: milestone.startDate,
                priority: 'medium',
                status: status,
                estimatedMinutes: milestone.estimatedHours ? milestone.estimatedHours * 60 : null,
                estimatedHours: milestone.estimatedHours,
                source: 'skill',
                sourceId: milestone.id,
                skillName: skill.name,
                type: 'milestone',
                progressPercentage: milestone.progressPercentage,
                actualHoursSpent: milestone.actualHoursSpent,
                daysAllocated: milestone.daysAllocated,
                currentDay: calculatedCurrentDay || milestone.currentDay || 1 // Use calculated day if within range
              });
            }
          });
        });
      } catch (error) {
        console.error('Error loading skill milestones:', error);
      }

      // 3. Fetch personal tasks
      try {
        const personalTasks = await tasksAPI.getAll();
        personalTasks.forEach((task: any) => {
          const dueDate = task.dueDate ? new Date(task.dueDate) : null;
          const status = task.status?.toLowerCase() || 'pending';
          const isPendingOrInProgress = (status === 'pending' || status === 'in-progress');
          const isCompleted = (status === 'completed' || status === 'done');
          
          // Check if due date matches selected date
          const isDueToday = dueDate && dueDate >= todayStart && dueDate <= todayEnd;
          
          // Include if:
          // - Due date is today (always show, regardless of status)
          // - Status is pending/in-progress (show ALL active tasks, regardless of due date)
          //   This ensures tasks added from Dashboard without due dates show up
          // - Status is completed AND due date is today or in the past
          // - Status is completed AND no due date (show completed tasks without dates)
          const shouldInclude = 
            isDueToday ||
            isPendingOrInProgress || // Show all pending/in-progress tasks regardless of date
            (isCompleted && (!dueDate || dueDate <= todayEnd));
          
          if (shouldInclude) {
            tasks.push({
              id: task.id,
              title: task.title,
              description: task.description,
              dueDate: task.dueDate,
              priority: task.priority || 'medium',
              status: status,
              estimatedMinutes: task.estimatedMinutes,
              source: 'personal',
              sourceId: task.id,
              type: 'task'
            });
          }
        });
      } catch (error) {
        console.error('Error loading personal tasks:', error);
      }

      setAllTasks(tasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      const message = 'Failed to load tasks';
      toast.error(message);
      addNotification('error', message, 'DailyPlanner', 'load_tasks_failed');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-primary';
      default: return 'bg-muted-foreground';
    }
  };

  // Get AI prediction for new task
  const getAIPrediction = async (estimatedHours: number, estimatedDays: number) => {
    if (!estimatedHours || !estimatedDays || estimatedHours <= 0 || estimatedDays <= 0) {
      setAiPrediction(null);
      return;
    }

    setLoadingPrediction(true);
    try {
      const prediction = await learningAPI.predict({
        taskType: 'personal',
        estimatedHours,
        estimatedDays
      });
      setAiPrediction(prediction);
    } catch (err) {
      console.error('Error getting AI prediction:', err);
      setAiPrediction(null);
    } finally {
      setLoadingPrediction(false);
    }
  };

  // Calculate suggested due date from prediction
  const getSuggestedDueDate = (startDate: string, predictedDays: number) => {
    if (!startDate || !predictedDays) return null;
    const start = new Date(startDate);
    start.setDate(start.getDate() + predictedDays - 1); // -1 because start date is day 1
    return start.toISOString().split('T')[0];
  };

  const handleAddTask = async () => {
    if (!newTask.title) {
      const message = 'Please enter a task title';
      toast.error(message);
      addNotification('error', message, 'DailyPlanner', 'validation_error');
      return;
    }

    try {
      // Use AI prediction if available, otherwise use user input
      const finalDaysAllocated = aiPrediction?.predictedDays 
        ? Math.ceil(aiPrediction.predictedDays) 
        : (newTask.daysAllocated ? parseInt(newTask.daysAllocated) : null);
      
      const finalDueDate = aiPrediction && newTask.startDate
        ? getSuggestedDueDate(newTask.startDate, aiPrediction.predictedDays)
        : newTask.dueDate;

      await tasksAPI.create({
        title: newTask.title,
        description: newTask.description || null,
        dueDate: finalDueDate || null,
        startDate: newTask.startDate || null,
        priority: newTask.priority,
        status: 'pending',
        estimatedMinutes: newTask.estimatedHours ? parseFloat(newTask.estimatedHours) * 60 : null,
        daysAllocated: finalDaysAllocated,
      });

      setNewTask({ 
        title: '', 
        description: '', 
        dueDate: '', 
        priority: 'medium',
        estimatedHours: '',
        daysAllocated: '',
        startDate: '',
      });
      setAiPrediction(null);
      setIsAddDialogOpen(false);
      const successMessage = 'Task added successfully!';
      toast.success(successMessage);
      addNotification('success', successMessage, 'DailyPlanner', 'task_added');
      await loadAllTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      const errorMessage = 'Failed to add task';
      toast.error(errorMessage);
      addNotification('error', errorMessage, 'DailyPlanner', 'task_add_failed');
    }
  };

  // Generate Your Day
  const handleGenerateDay = async () => {
    try {
      setGenerating(true);
      
      // Get class schedules for the selected date
      const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
      const classes: any[] = [];
      try {
        const courses = await coursesAPI.getAll();
        courses.forEach((course: any) => {
          (course.classSchedule || []).forEach((schedule: any) => {
            if (schedule.day?.toLowerCase() === dayOfWeek.toLowerCase()) {
              classes.push({
                id: schedule.id,
                title: course.name,
                day: schedule.day,
                time: schedule.time,
                type: schedule.type,
                location: schedule.location
              });
            }
          });
        });
      } catch (error) {
        console.error('Error loading classes:', error);
      }

      // Prepare tasks for AI with all new fields
      const tasksForAI = allTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        startDate: task.startDate, // NEW
        priority: task.priority,
        estimatedMinutes: task.estimatedMinutes || (task.estimatedHours ? task.estimatedHours * 60 : 60),
        estimatedHours: task.estimatedHours, // NEW
        type: task.type,
        source: task.source,
        status: task.status, // NEW
        progressPercentage: task.progressPercentage, // NEW
        actualMinutesSpent: task.actualMinutesSpent || (task.actualHoursSpent ? task.actualHoursSpent * 60 : null), // NEW
        daysAllocated: task.daysAllocated, // NEW
        currentDay: task.currentDay, // NEW
        sourceId: task.sourceId // NEW - for updating tasks later
      }));

      // Call AI planning service
      const planResponse = await planningAPI.generateDailyPlan({
        date_iso: selectedDate,
        tasks: tasksForAI,
        classes: classes,
        available_times: [], // Can be enhanced later with user preferences
        preferences: {}
      });

      if (planResponse.success && planResponse.data) {
        const plan = planResponse.data.plan;
        setDailyPlan(plan);
        setIsDayGenerated(true);
        
        // Store in localStorage
        localStorage.setItem(`dailyPlan_${selectedDate}`, JSON.stringify(plan));
        
        // Show notification for shifted tasks
        if (plan.shifted_tasks && plan.shifted_tasks.length > 0) {
          const shiftedCount = plan.shifted_tasks.length;
          const nextDate = new Date(selectedDate);
          nextDate.setDate(nextDate.getDate() + 1);
          const message = `${shiftedCount} task${shiftedCount > 1 ? 's' : ''} shifted to ${nextDate.toLocaleDateString()}`;
          toast.success(message);
          addNotification('success', message, 'DailyPlanner', 'tasks_shifted');
        } else {
          const message = 'Your day has been generated!';
          toast.success(message);
          addNotification('success', message, 'DailyPlanner', 'plan_generated');
        }
        
        await loadAllTasks(); // Reload to get updated tasks
      } else {
        throw new Error(planResponse.error || 'Failed to generate plan');
      }
    } catch (error: any) {
      console.error('Error generating day:', error);
      const message = error.message || 'Failed to generate your day';
      toast.error(message);
      addNotification('error', message, 'DailyPlanner', 'plan_generation_failed');
    } finally {
      setGenerating(false);
    }
  };

  // Rebalance Day
  const handleRebalance = async () => {
    try {
      setRebalancing(true);
      
      // Get incomplete tasks with all new fields
      const incompleteTasks = allTasks.filter(task => {
        const status = task.status?.toLowerCase() || 'pending';
        return status !== 'completed';
      }).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        startDate: task.startDate,
        priority: task.priority,
        estimatedMinutes: task.estimatedMinutes || (task.estimatedHours ? task.estimatedHours * 60 : 60),
        estimatedHours: task.estimatedHours,
        type: task.type,
        source: task.source,
        status: task.status,
        progressPercentage: task.progressPercentage,
        actualMinutesSpent: task.actualMinutesSpent || (task.actualHoursSpent ? task.actualHoursSpent * 60 : null),
        daysAllocated: task.daysAllocated,
        currentDay: task.currentDay,
        sourceId: task.sourceId
      }));

      // Fetch real completion history from UserTaskPattern
      let completionHistory = {
        averageDailyCompletion: 0.7,
        preferredStudyTimes: [],
        typicalCapacity: incompleteTasks.length * 0.6
      };

      try {
        const patterns = await learningAPI.getPatterns();
        if (patterns && patterns.length > 0) {
          // Calculate average completion rate
          const completionRates = patterns
            .filter((p: any) => p.completionRate !== null && p.completionRate !== undefined)
            .map((p: any) => p.completionRate);
          
          if (completionRates.length > 0) {
            const avgCompletionRate = completionRates.reduce((a: number, b: number) => a + b, 0) / completionRates.length;
            completionHistory.averageDailyCompletion = avgCompletionRate;
          }

          // Calculate typical capacity based on actual vs estimated time
          const timeRatios = patterns
            .filter((p: any) => p.estimatedHours && p.actualHours)
            .map((p: any) => p.actualHours / p.estimatedHours);
          
          if (timeRatios.length > 0) {
            const avgTimeRatio = timeRatios.reduce((a: number, b: number) => a + b, 0) / timeRatios.length;
            completionHistory.typicalCapacity = Math.round(incompleteTasks.length * avgTimeRatio);
          }
        }
      } catch (error) {
        console.error('Error fetching completion patterns:', error);
        // Use defaults if fetch fails
      }

      // Call rebalance API
      const rebalanceResponse = await planningAPI.rebalanceDailyPlan({
        date_iso: selectedDate,
        incomplete_tasks: incompleteTasks,
        completion_history: completionHistory,
        preferences: {}
      });

      if (rebalanceResponse.success && rebalanceResponse.data) {
        const rebalancedPlan = rebalanceResponse.data.plan;
        setDailyPlan(rebalancedPlan);
        
        // Update localStorage
        localStorage.setItem(`dailyPlan_${selectedDate}`, JSON.stringify(rebalancedPlan));
        
        // Handle task shifts (move tasks to next day)
        if (rebalancedPlan.shifted_tasks && rebalancedPlan.shifted_tasks.length > 0) {
          const shiftMessage = `${rebalancedPlan.shifted_tasks.length} tasks shifted to tomorrow`;
          toast.success(shiftMessage);
          addNotification('success', shiftMessage, 'DailyPlanner', 'tasks_rebalanced');
        }
        
        const rebalanceMessage = 'Your day has been rebalanced!';
        toast.success(rebalanceMessage);
        addNotification('success', rebalanceMessage, 'DailyPlanner', 'plan_rebalanced');
        await loadAllTasks();
      } else {
        throw new Error(rebalanceResponse.error || 'Failed to rebalance plan');
      }
    } catch (error: any) {
      console.error('Error rebalancing day:', error);
      const message = error.message || 'Failed to rebalance your day';
      toast.error(message);
      addNotification('error', message, 'DailyPlanner', 'rebalance_failed');
    } finally {
      setRebalancing(false);
    }
  };

  // Adaptive calculation: Calculate remaining time based on actual progress rate
  const calculateAdaptiveSchedule = (task: any, actualTimeSpent: number, progressPercentage: number) => {
    if (progressPercentage <= 0 || !actualTimeSpent) return null;
    
    // Calculate actual rate: hours per percentage point
    const progressRate = actualTimeSpent / progressPercentage; // e.g., 1h / 50% = 0.02h per 1%
    const predictedTotalTime = progressRate * 100; // Total time needed
    const remainingTime = predictedTotalTime - actualTimeSpent;
    
    const remainingDays = task.daysAllocated && task.currentDay 
      ? task.daysAllocated - task.currentDay 
      : (task.daysAllocated || 1);
    
    const adjustedDailyHours = remainingDays > 0 ? remainingTime / remainingDays : remainingTime;
    
    return {
      predictedTotalTime,
      remainingTime,
      adjustedDailyHours,
      progressRate,
      completionPrediction: task.currentDay + Math.ceil(remainingTime / (task.estimatedHours || task.estimatedMinutes / 60 || 1))
    };
  };

  // Save progress with adaptive learning
  const handleSaveProgress = async (progress: number, actualTime: number | null, markComplete: boolean) => {
    if (!progressTask) return;
    
    try {
      const task = progressTask;
      const estimatedHours = task.estimatedHours || (task.estimatedMinutes ? task.estimatedMinutes / 60 : 0);
      const actualHours = actualTime || 0;
      
      // Calculate adaptive schedule
      const adaptiveSchedule = actualHours > 0 && progress > 0 
        ? calculateAdaptiveSchedule(task, actualHours, progress) 
        : null;
      
      // Determine final status
      const finalStatus = (markComplete || progress === 100) ? 'completed' : 'in-progress';
      
      // Calculate current day based on progress if multi-day task
      let calculatedCurrentDay = task.currentDay || 1;
      if (task.daysAllocated && task.daysAllocated > 1 && progress > 0) {
        calculatedCurrentDay = Math.ceil((progress / 100) * task.daysAllocated) || 1;
      }
      
      // Update task based on source
      if (task.source === 'academic' && task.type === 'assignment') {
        await coursesAPI.updateAssignment(task.sourceId, {
          status: finalStatus,
          title: task.title,
          description: task.description || null,
          dueDate: task.dueDate || null,
          startDate: task.startDate || null,
          estimatedHours: estimatedHours,
          progressPercentage: progress,
          actualHoursSpent: actualHours,
          currentDay: calculatedCurrentDay
        });
      } else if (task.source === 'skill' && task.type === 'milestone') {
        await skillsAPI.updateMilestone(task.sourceId, {
          status: finalStatus,
          completed: finalStatus === 'completed',
          progressPercentage: progress,
          actualHoursSpent: actualHours,
          currentDay: calculatedCurrentDay
        });
      } else if (task.source === 'personal' && task.type === 'task') {
        await tasksAPI.update(task.sourceId, {
          status: finalStatus,
          progressPercentage: progress,
          actualMinutesSpent: actualHours ? Math.round(actualHours * 60) : null,
          currentDay: calculatedCurrentDay
        });
      }
      
      // Save learning pattern to backend
      if (actualHours > 0 && estimatedHours > 0 && task.daysAllocated) {
        const completionRate = adaptiveSchedule?.predictedTotalTime 
          ? adaptiveSchedule.predictedTotalTime / estimatedHours 
          : actualHours / estimatedHours;
        
        const actualDays = calculatedCurrentDay;
        
        // Save learning pattern to backend for adaptive learning
        try {
          await learningAPI.savePattern({
            taskType: task.source,
            estimatedHours,
            actualHours: adaptiveSchedule?.predictedTotalTime || actualHours,
            estimatedDays: task.daysAllocated,
            actualDays: finalStatus === 'completed' ? actualDays : null,
            completionRate,
            progressRate: adaptiveSchedule?.progressRate || null
          });
        } catch (err) {
          console.error('Error saving learning pattern:', err);
          // Don't fail the whole operation if pattern save fails
        }
      }
      
      // Get AI predictions and suggest date adjustments
      if (adaptiveSchedule && estimatedHours > 0 && task.daysAllocated) {
        try {
          const prediction = await learningAPI.predict({
            taskType: task.source,
            estimatedHours,
            estimatedDays: task.daysAllocated
          });
          
          // Calculate suggested due date adjustment
          if (prediction && prediction.predictedDays && prediction.predictedDays < task.daysAllocated) {
            const daysSaved = task.daysAllocated - prediction.predictedDays;
            let suggestedDueDate = null;
            if (task.startDate) {
              const start = new Date(task.startDate);
              start.setDate(start.getDate() + prediction.predictedDays - 1); // -1 because start date is day 1
              suggestedDueDate = start;
            } else if (task.dueDate) {
              const due = new Date(task.dueDate);
              due.setDate(due.getDate() - daysSaved);
              suggestedDueDate = due;
            }
            
            if (suggestedDueDate) {
              const completionRate = prediction.averages?.completionRate || 1;
              const fasterPercent = Math.round((1 - completionRate) * 100);
              
              const predictionMessage = `AI Prediction: You typically complete ${task.source} tasks ${fasterPercent > 0 ? fasterPercent + '% faster' : 'at estimated pace'}. Suggested due date: ${suggestedDueDate.toLocaleDateString()} (${daysSaved} days earlier)`;
              toast.success(predictionMessage, {
                duration: 8000,
                action: {
                    label: 'Adjust',
                    onClick: async () => {
                      try {
                        const dueDateStr = suggestedDueDate.toISOString().split('T')[0];
                        if (task.source === 'academic' && task.type === 'assignment') {
                          await coursesAPI.updateAssignment(task.sourceId, {
                            dueDate: dueDateStr,
                            daysAllocated: Math.ceil(prediction.predictedDays)
                          });
                          const adjustMessage = 'Due date adjusted based on your learning patterns!';
                          toast.success(adjustMessage);
                          addNotification('success', adjustMessage, 'DailyPlanner', 'due_date_adjusted');
                          await loadAllTasks();
                        } else if (task.source === 'skill' && task.type === 'milestone') {
                          await skillsAPI.updateMilestone(task.sourceId, {
                            dueDate: dueDateStr,
                            daysAllocated: Math.ceil(prediction.predictedDays)
                          });
                          const adjustMessage = 'Due date adjusted based on your learning patterns!';
                          toast.success(adjustMessage);
                          addNotification('success', adjustMessage, 'DailyPlanner', 'due_date_adjusted');
                          await loadAllTasks();
                        } else if (task.source === 'personal' && task.type === 'task') {
                          await tasksAPI.update(task.sourceId, {
                            dueDate: dueDateStr,
                            daysAllocated: Math.ceil(prediction.predictedDays)
                          });
                          const adjustMessage = 'Due date adjusted based on your learning patterns!';
                          toast.success(adjustMessage);
                          addNotification('success', adjustMessage, 'DailyPlanner', 'due_date_adjusted');
                          await loadAllTasks();
                        }
                      } catch (err) {
                        console.error('Error adjusting due date:', err);
                        const errorMessage = 'Failed to adjust due date';
                        toast.error(errorMessage);
                        addNotification('error', errorMessage, 'DailyPlanner', 'due_date_adjust_failed');
                      }
                    }
                  }
              });
              addNotification('info', predictionMessage, 'DailyPlanner', 'ai_prediction');
            }
          }
        } catch (err) {
          console.error('Error getting AI prediction:', err);
          // Don't fail if prediction fails
        }
      }
      
      // Show adaptive insights
      if (adaptiveSchedule && adaptiveSchedule.predictedTotalTime < estimatedHours) {
        const progressMessage = `Great progress! Based on your pace, you'll finish in ${adaptiveSchedule.completionPrediction} days (faster than estimated!)`;
        toast.success(progressMessage, { duration: 5000 });
        addNotification('success', progressMessage, 'DailyPlanner', 'progress_update');
      }
      
      await loadAllTasks();
      setIsProgressModalOpen(false);
      setProgressTask(null);
    } catch (error) {
      console.error('Error saving progress:', error);
      const errorMessage = 'Failed to save progress';
      toast.error(errorMessage);
      addNotification('error', errorMessage, 'DailyPlanner', 'progress_save_failed');
    }
  };

  // Toggle task status (works for all task types)
  const handleToggleTask = async (task: any) => {
    const currentStatus = task.status?.toLowerCase() || 'pending';
    const newStatus = getNextStatus(currentStatus);
    
    // If moving to completed, open progress modal first
    if (newStatus === 'completed') {
      setProgressTask(task);
      setIsProgressModalOpen(true);
      return; // Don't complete yet, wait for modal
    }
    
    try {
      // Update based on task source
      if (task.source === 'academic' && task.type === 'assignment') {
        await coursesAPI.updateAssignment(task.sourceId, {
          status: newStatus,
          title: task.title,
          description: task.description || null,
          dueDate: task.dueDate || null,
          estimatedHours: task.estimatedMinutes ? task.estimatedMinutes / 60 : null
        });
      } else if (task.source === 'skill' && task.type === 'milestone') {
        await skillsAPI.updateMilestone(task.sourceId, {
          status: newStatus,
          completed: newStatus === 'completed'
        });
      } else if (task.source === 'personal' && task.type === 'task') {
        await tasksAPI.update(task.sourceId, { status: newStatus });
      }
      
      // Optimistically update local state
      setAllTasks(prev => 
        prev.map(t => 
          t.id === task.id 
            ? { ...t, status: newStatus }
            : t
        )
      );
      
      await loadAllTasks(); // Reload to ensure sync
    } catch (error) {
      console.error('Error updating task:', error);
      const errorMessage = 'Failed to update task';
      toast.error(errorMessage);
      addNotification('error', errorMessage, 'DailyPlanner', 'task_update_failed');
      // Revert optimistic update
      await loadAllTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksAPI.delete(taskId);
      const successMessage = 'Task deleted successfully!';
      toast.success(successMessage);
      addNotification('success', successMessage, 'DailyPlanner', 'task_deleted');
      await loadAllTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      const errorMessage = 'Failed to delete task';
      toast.error(errorMessage);
      addNotification('error', errorMessage, 'DailyPlanner', 'task_delete_failed');
    }
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setNewTask({
      title: task.title || '',
      description: task.description || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      priority: (task.priority || 'medium') as 'high' | 'medium' | 'low',
      estimatedHours: '',
      daysAllocated: '',
      startDate: '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!newTask.title) {
      const message = 'Please enter a task title';
      toast.error(message);
      addNotification('error', message, 'DailyPlanner', 'validation_error');
      return;
    }

    if (!editingTask) return;

    try {
      await tasksAPI.update(editingTask.id, {
        title: newTask.title,
        description: newTask.description || null,
        dueDate: newTask.dueDate || null,
        priority: newTask.priority,
      });

      setNewTask({ title: '', description: '', dueDate: '', priority: 'medium', estimatedHours: '', daysAllocated: '', startDate: '' });
      setEditingTask(null);
      setIsEditDialogOpen(false);
      const successMessage = 'Task updated successfully!';
      toast.success(successMessage);
      addNotification('success', successMessage, 'DailyPlanner', 'task_updated');
      await loadAllTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      const errorMessage = 'Failed to update task';
      toast.error(errorMessage);
      addNotification('error', errorMessage, 'DailyPlanner', 'task_update_failed');
    }
  };

  // Get source badge info
  const getSourceBadge = (task: any) => {
    if (task.source === 'academic') {
      return { label: 'Academic', icon: BookOpen, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' };
    } else if (task.source === 'skill') {
      return { label: 'Skill', icon: Target, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' };
    } else {
      return { label: 'Personal', icon: ListTodo, color: 'bg-green-500/10 text-green-600 dark:text-green-400' };
    }
  };

  // Filter tasks: if plan is generated, show tasks in the schedule PLUS all pending/in-progress tasks
  // This ensures newly added tasks (from Dashboard) are always visible
  const tasksToDisplay = isDayGenerated && dailyPlan?.schedule 
    ? allTasks.filter((task: any) => {
        const status = task.status?.toLowerCase() || 'pending';
        const isPendingOrInProgress = (status === 'pending' || status === 'in-progress');
        
        // Always show pending/in-progress tasks (even if not in schedule) so new tasks are visible
        if (isPendingOrInProgress) {
          return true;
        }
        
        // For completed tasks, only show if they're in the plan schedule
        return dailyPlan.schedule.some((scheduledItem: any) => 
          scheduledItem.task_id === task.id || scheduledItem.task_id === task.sourceId
        );
      })
    : allTasks; // Show all tasks if no plan generated

  // Sort tasks: in-progress first, then pending (by due date), then completed
  const sortedTasks = [...tasksToDisplay].sort((a: any, b: any) => {
    const statusA = a.status?.toLowerCase() || 'pending';
    const statusB = b.status?.toLowerCase() || 'pending';
    
    if (statusA === 'in-progress' && statusB !== 'in-progress') return -1;
    if (statusB === 'in-progress' && statusA !== 'in-progress') return 1;
    if (statusA === 'completed' && statusB !== 'completed') return 1;
    if (statusB === 'completed' && statusA !== 'completed') return -1;
    
    // For pending tasks, sort by due date
    if (statusA === 'pending' && statusB === 'pending') {
      const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return dueA - dueB;
    }
    
    return 0;
  });

  const groupedTasks = {
    pending: sortedTasks.filter((t: any) => (t.status?.toLowerCase() || 'pending') === 'pending'),
    inProgress: sortedTasks.filter((t: any) => (t.status?.toLowerCase() || 'pending') === 'in-progress'),
    completed: sortedTasks.filter((t: any) => (t.status?.toLowerCase() || 'pending') === 'completed'),
  };

  // Calculate completion stats (based on displayed tasks)
  const totalTasks = tasksToDisplay.length;
  const completedTasks = groupedTasks.completed.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const TaskSection = ({ title, tasks: sectionTasks, icon: Icon }: any) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-foreground">{title}</h3>
        <span className="text-muted-foreground text-sm">({sectionTasks.length})</span>
      </div>
      {sectionTasks.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          No tasks here
        </div>
      ) : (
        sectionTasks.map((task: any) => {
          const status = task.status?.toLowerCase() || 'pending';
          const sourceBadge = getSourceBadge(task);
          const SourceIcon = sourceBadge.icon;
          
          return (
            <div 
              key={task.id} 
              className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg hover:shadow-md transition-shadow group cursor-pointer"
              onClick={() => handleToggleTask(task)}
            >
              {/* Status Icon */}
              <button
                type="button"
                className="mt-0.5 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleTask(task);
                }}
                aria-label={status === 'completed' ? 'Reopen task (mark as in-progress)' : `Mark as ${getNextStatus(status)}`}
                title={status === 'completed' ? 'Click to reopen task' : undefined}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 hover:text-yellow-500 transition-colors" />
                ) : status === 'in-progress' ? (
                  <Circle className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                )}
              </button>
              
              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className={`text-foreground font-medium ${status === 'completed' ? 'line-through opacity-60' : ''}`}>
                    {task.title}
                  </p>
                  <BadgeComponent className={`${sourceBadge.color} text-xs`}>
                    <SourceIcon className="w-3 h-3 mr-1" />
                    {sourceBadge.label}
                  </BadgeComponent>
                  {status === 'completed' && (
                    <BadgeComponent variant="outline" className="text-xs text-muted-foreground border-dashed">
                      Click to reopen
                    </BadgeComponent>
                  )}
                  {task.priority === 'high' && (
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                  )}
                </div>
                {task.description && (
                  <p className={`text-sm text-muted-foreground mb-1 ${status === 'completed' ? 'line-through opacity-60' : ''}`}>
                    {task.description}
                  </p>
                )}
                {/* Progress Bar for Multi-Day Tasks */}
                {(task.daysAllocated && task.daysAllocated > 1) && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        Day {task.currentDay || 1} of {task.daysAllocated}
                      </span>
                      {((task.progressPercentage !== null && task.progressPercentage !== undefined) || status === 'completed') && (
                        <span className="text-muted-foreground font-medium">
                          {status === 'completed' && (task.progressPercentage === null || task.progressPercentage === undefined) 
                            ? '100%' 
                            : Math.round(task.progressPercentage || 0)}%
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${status === 'completed' && (task.progressPercentage === null || task.progressPercentage === undefined) 
                          ? 100 
                          : Math.max(0, Math.min(100, task.progressPercentage || 0))}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Progress Percentage for Single-Day Tasks */}
                {(!task.daysAllocated || task.daysAllocated === 1) && ((task.progressPercentage !== null && task.progressPercentage !== undefined) || status === 'completed') && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-muted-foreground font-medium">
                        {status === 'completed' && (task.progressPercentage === null || task.progressPercentage === undefined) 
                          ? '100%' 
                          : Math.round(task.progressPercentage || 0)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${status === 'completed' && (task.progressPercentage === null || task.progressPercentage === undefined) 
                          ? 100 
                          : Math.max(0, Math.min(100, task.progressPercentage || 0))}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {task.dueDate && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                  {(() => {
                    // Calculate daily hours for multi-day tasks
                    const estimatedHours = task.estimatedHours || (task.estimatedMinutes ? task.estimatedMinutes / 60 : 0);
                    const daysAllocated = task.daysAllocated || 1;
                    const dailyHours = daysAllocated > 1 ? estimatedHours / daysAllocated : estimatedHours;
                    
                    // Calculate adaptive daily hours if progress and actual time are available
                    let adaptiveDailyHours = null;
                    if (task.progressPercentage && task.progressPercentage > 0 && 
                        ((task.actualHoursSpent && task.source === 'academic') || 
                         (task.actualMinutesSpent && task.source === 'personal'))) {
                      const actualHours = task.actualHoursSpent || (task.actualMinutesSpent ? task.actualMinutesSpent / 60 : 0);
                      if (actualHours > 0) {
                        const adaptiveSchedule = calculateAdaptiveSchedule(task, actualHours, task.progressPercentage);
                        if (adaptiveSchedule && adaptiveSchedule.adjustedDailyHours && adaptiveSchedule.adjustedDailyHours > 0) {
                          adaptiveDailyHours = adaptiveSchedule.adjustedDailyHours;
                        }
                      }
                    }
                    
                    return (
                      <>
                        {task.estimatedMinutes && (
                          <span>
                            ~{task.estimatedMinutes} min
                            {daysAllocated > 1 && (
                              <span className="text-muted-foreground ml-1">
                                ({dailyHours.toFixed(1)}h/day)
                              </span>
                            )}
                          </span>
                        )}
                        {adaptiveDailyHours && (
                          <BadgeComponent variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300">
                            Adjusted: {adaptiveDailyHours.toFixed(1)}h/day
                          </BadgeComponent>
                        )}
                        {task.actualHoursSpent && task.source === 'academic' && (
                          <span className="text-orange-600 dark:text-orange-400">
                            Spent: {task.actualHoursSpent}h
                          </span>
                        )}
                        {task.actualMinutesSpent && task.source === 'personal' && (
                          <span className="text-orange-600 dark:text-orange-400">
                            Spent: {Math.round(task.actualMinutesSpent / 60 * 10) / 10}h
                          </span>
                        )}
                      </>
                    );
                  })()}
                  {task.courseName && (
                    <span className="text-blue-600 dark:text-blue-400">{task.courseName}</span>
                  )}
                  {task.skillName && (
                    <span className="text-purple-600 dark:text-purple-400">{task.skillName}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-foreground text-3xl md:text-4xl font-bold mb-2">Daily Planner</h1>
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground">
              {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {totalTasks > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {completedTasks}/{totalTasks} completed ({completionPercentage}%)
                </span>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {/* Date Picker */}
          <Input
            type="date"
            value={selectedDate}
            key={`date-picker-${selectedDate}`} // Force re-render when date changes
            onChange={(e) => {
              const newDate = e.target.value;
              setSelectedDate(newDate);
              const storedPlan = localStorage.getItem(`dailyPlan_${newDate}`);
              if (storedPlan) {
                try {
                  const plan = JSON.parse(storedPlan);
                  setDailyPlan(plan);
                  setIsDayGenerated(true);
                } catch (e) {
                  setIsDayGenerated(false);
                }
              } else {
                setIsDayGenerated(false);
              }
            }}
            className="w-auto"
          />
          
          {/* Generate Your Day / Rebalance Button */}
          {!isDayGenerated ? (
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={handleGenerateDay}
              disabled={generating || loading}
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Your Day
                </>
              )}
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={handleRebalance}
              disabled={rebalancing || loading}
            >
              {rebalancing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Rebalancing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Rebalance
                </>
              )}
            </Button>
          )}
          
          <Dialog open={isAddDialogOpen} onOpenChange={(open: boolean) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setNewTask({ 
                title: '', 
                description: '', 
                dueDate: '', 
                priority: 'medium',
                estimatedHours: '',
                daysAllocated: '',
                startDate: '',
              });
              setAiPrediction(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Task Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter task description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newTask.startDate}
                      onChange={(e) => {
                        setNewTask({ ...newTask, startDate: e.target.value });
                        // Auto-calculate days if both dates are set
                        if (e.target.value && newTask.dueDate) {
                          const start = new Date(e.target.value);
                          const due = new Date(newTask.dueDate);
                          if (!isNaN(start.getTime()) && !isNaN(due.getTime()) && due >= start) {
                            const diffTime = due.getTime() - start.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                            setNewTask({ ...newTask, startDate: e.target.value, daysAllocated: diffDays.toString() });
                          }
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => {
                        setNewTask({ ...newTask, dueDate: e.target.value });
                        // Auto-calculate days if both dates are set
                        if (newTask.startDate && e.target.value) {
                          const start = new Date(newTask.startDate);
                          const due = new Date(e.target.value);
                          if (!isNaN(start.getTime()) && !isNaN(due.getTime()) && due >= start) {
                            const diffTime = due.getTime() - start.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                            setNewTask({ ...newTask, dueDate: e.target.value, daysAllocated: diffDays.toString() });
                          }
                        }
                        // Get AI prediction when both hours and days are available
                        if (newTask.estimatedHours && newTask.daysAllocated) {
                          getAIPrediction(parseFloat(newTask.estimatedHours), parseInt(newTask.daysAllocated));
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="estimatedHours">Estimated Hours</Label>
                    <Input
                      id="estimatedHours"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="e.g., 5"
                      value={newTask.estimatedHours}
                      onChange={(e) => {
                        setNewTask({ ...newTask, estimatedHours: e.target.value });
                        // Get AI prediction when both hours and days are available
                        if (e.target.value && newTask.daysAllocated) {
                          getAIPrediction(parseFloat(e.target.value), parseInt(newTask.daysAllocated));
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="daysAllocated">
                      Days Allocated
                      {newTask.startDate && newTask.dueDate && (
                        <span className="text-xs text-muted-foreground ml-1">(auto)</span>
                      )}
                    </Label>
                    <Input
                      id="daysAllocated"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Auto from dates"
                      value={(() => {
                        // Auto-calculate if both dates are present
                        if (newTask.startDate && newTask.dueDate) {
                          const start = new Date(newTask.startDate);
                          const due = new Date(newTask.dueDate);
                          if (!isNaN(start.getTime()) && !isNaN(due.getTime()) && due >= start) {
                            const diffTime = due.getTime() - start.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                            return diffDays > 0 ? diffDays.toString() : '';
                          }
                        }
                        return newTask.daysAllocated;
                      })()}
                      onChange={(e) => {
                        setNewTask({ ...newTask, daysAllocated: e.target.value });
                        // Get AI prediction when both hours and days are available
                        if (newTask.estimatedHours && e.target.value) {
                          getAIPrediction(parseFloat(newTask.estimatedHours), parseInt(e.target.value));
                        }
                      }}
                      disabled={!!(newTask.startDate && newTask.dueDate)}
                    />
                  </div>
                </div>
                
                {/* AI Prediction Display */}
                {aiPrediction && aiPrediction.confidence > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <Label className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          AI Prediction
                        </Label>
                        <BadgeComponent variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300">
                          {Math.round(aiPrediction.confidence * 100)}% confidence
                        </BadgeComponent>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                      <div>
                        Based on your history: <span className="font-medium">
                          {aiPrediction.predictedDays} days
                        </span> (vs {newTask.daysAllocated || aiPrediction.estimatedDays} estimated)
                      </div>
                      {aiPrediction.predictedDays < parseInt(newTask.daysAllocated || aiPrediction.estimatedDays.toString()) && (
                        <div className="text-green-700 dark:text-green-300 font-medium">
                          ✓ You typically complete tasks {Math.round((1 - (aiPrediction.predictedDays / parseInt(newTask.daysAllocated || aiPrediction.estimatedDays.toString()))) * 100)}% faster!
                        </div>
                      )}
                      {newTask.startDate && aiPrediction.predictedDays && (
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-blue-100 hover:bg-blue-200 text-blue-900 border-blue-300 dark:bg-blue-900 dark:hover:bg-blue-800 dark:text-blue-100"
                            onClick={() => {
                              const suggestedDue = getSuggestedDueDate(newTask.startDate, aiPrediction.predictedDays);
                              if (suggestedDue) {
                                setNewTask({ ...newTask, dueDate: suggestedDue, daysAllocated: aiPrediction.predictedDays.toString() });
                                const adjustMessage = `Due date adjusted to ${new Date(suggestedDue).toLocaleDateString()} based on your patterns`;
                                toast.success(adjustMessage);
                                addNotification('success', adjustMessage, 'DailyPlanner', 'due_date_adjusted');
                              }
                            }}
                          >
                            Apply Suggested Due Date: {newTask.startDate && aiPrediction.predictedDays ? new Date(getSuggestedDueDate(newTask.startDate, aiPrediction.predictedDays) || '').toLocaleDateString() : ''}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {loadingPrediction && (
                  <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground text-center">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                    Getting AI prediction...
                  </div>
                )}
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddTask}>Add Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Task Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={(open: boolean) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditingTask(null);
              setNewTask({ title: '', description: '', dueDate: '', priority: 'medium', estimatedHours: '', daysAllocated: '', startDate: '' });
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Task Title *</Label>
                  <Input
                    id="edit-title"
                    placeholder="Enter task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    placeholder="Enter task description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-dueDate">Due Date</Label>
                  <Input
                    id="edit-dueDate"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingTask(null);
                  setNewTask({ title: '', description: '', dueDate: '', priority: 'medium', estimatedHours: '', daysAllocated: '', startDate: '' });
                }}>Cancel</Button>
                <Button onClick={handleUpdateTask}>Update Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="p-4 border-border bg-card">
            <TaskSection title="Pending" tasks={groupedTasks.pending} icon={Circle} />
          </Card>
          
          <Card className="p-4 border-border bg-accent border-primary/20">
            <TaskSection title="In Progress" tasks={groupedTasks.inProgress} icon={Clock} />
          </Card>
          
          <Card className="p-4 border-border bg-accent border-primary/30">
            <TaskSection title="Completed" tasks={groupedTasks.completed} icon={CheckCircle2} />
          </Card>
        </div>
      )}
      
      {/* Progress Modal */}
      {progressTask && (
        <ProgressModal
          open={isProgressModalOpen}
          onClose={() => {
            setIsProgressModalOpen(false);
            setProgressTask(null);
          }}
          task={progressTask}
          onSave={handleSaveProgress}
        />
      )}
    </div>
  );
}
