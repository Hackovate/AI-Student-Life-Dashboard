import { useState, useEffect } from 'react';
import { Plus, TrendingUp, CheckCircle2, Trash2, Edit } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useApp } from '../../lib/AppContext';
import { toast } from 'sonner';

export function Lifestyle() {
  const { habits, toggleHabit, addHabit, deleteHabit, updateHabit } = useApp();
  
  // Listen for habit creation events from AI chat (AppContext handles the refresh, but this ensures UI updates)
  useEffect(() => {
    // The AppContext already listens to habitCreated events and refreshes habits
    // This effect is here to ensure the component re-renders when habits change
    // No additional action needed as habits come from AppContext
  }, [habits]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [newHabit, setNewHabit] = useState({
    name: '',
    target: '',
    time: '',
    color: 'from-blue-500 to-cyan-500',
    icon: '💪',
  });
  const [editHabit, setEditHabit] = useState({
    name: '',
    target: '',
    time: '',
    color: 'from-blue-500 to-cyan-500',
    icon: '💪',
  });

  // Calculate dynamic weekly progress
  const getWeeklyProgress = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const currentDayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Adjust to make Monday = 0
    const adjustedDayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
    
    return days.map((day, index) => {
      // Calculate the date for this day of the week
      const daysFromMonday = index - adjustedDayIndex;
      const date = new Date(today);
      date.setDate(today.getDate() + daysFromMonday);
      const dateString = date.toISOString().split('T')[0];
      
      // Count completed habits for this day
      let completed = 0;
      const total = habits.length;
      
      habits.forEach(habit => {
        const history = habit.completionHistory || [];
        const dayEntry = history.find(entry => entry.date === dateString);
        if (dayEntry && dayEntry.completed) {
          completed++;
        }
      });
      
      return {
        day,
        completed,
        total,
        date: dateString,
        isToday: index === adjustedDayIndex
      };
    });
  };

  const weeklyProgress = getWeeklyProgress();

  const completedHabits = habits.filter(h => h.completed).length;
  const wellnessScore = Math.round((completedHabits / habits.length) * 100) || 0;

  const handleToggleHabit = async (id: string) => {
    try {
      await toggleHabit(id);
      toast.success('Habit updated!');
    } catch (error) {
      toast.error('Failed to update habit');
    }
  };

  const handleDeleteClick = (id: string) => {
    setSelectedHabitId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedHabitId) {
      deleteHabit(selectedHabitId);
      toast.success('Habit deleted!');
      setIsDeleteDialogOpen(false);
      setSelectedHabitId(null);
    }
  };

  const handleEditClick = (habit: any) => {
    setSelectedHabitId(habit.id);
    setEditHabit({
      name: habit.name,
      target: habit.target,
      time: habit.time,
      color: habit.color,
      icon: habit.icon,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSave = () => {
    if (!editHabit.name || !editHabit.target || !editHabit.time) {
      toast.error('Please fill in all fields');
      return;
    }

    if (selectedHabitId) {
      updateHabit(selectedHabitId, editHabit);
      setIsEditDialogOpen(false);
      setSelectedHabitId(null);
      toast.success('Habit updated successfully!');
    }
  };

  const handleAddHabit = () => {
    if (!newHabit.name || !newHabit.target || !newHabit.time) {
      toast.error('Please fill in all fields');
      return;
    }

    addHabit({
      ...newHabit,
      streak: 0,
      completed: false,
    });

    setNewHabit({ name: '', target: '', time: '', color: 'from-blue-500 to-cyan-500', icon: '💪' });
    setIsAddDialogOpen(false);
    toast.success('Habit added successfully!');
  };

  const iconOptions = [
    { value: '💪', label: 'Workout' },
    { value: '🧘', label: 'Meditation' },
    { value: '📚', label: 'Reading' },
    { value: '💧', label: 'Water' },
    { value: '🌙', label: 'Sleep' },
    { value: '🥗', label: 'Healthy Eating' },
    { value: '🚶', label: 'Walking' },
    { value: '✍️', label: 'Writing' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-foreground text-3xl md:text-4xl font-bold mb-2">Lifestyle & Habit Tracker</h1>
          <p className="text-muted-foreground text-base">Build better habits and maintain a healthy lifestyle</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all">
              <Plus className="w-4 h-4" />
              Add Habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Habit</DialogTitle>
              <DialogDescription>
                Create a new habit to track your daily progress and build consistency.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="habit-name">Habit Name</Label>
                <Input
                  id="habit-name"
                  placeholder="e.g., Morning Workout"
                  value={newHabit.name}
                  onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="target">Target</Label>
                <Input
                  id="target"
                  placeholder="e.g., 30 minutes daily"
                  value={newHabit.target}
                  onChange={(e) => setNewHabit({ ...newHabit, target: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  placeholder="e.g., 7:00 AM"
                  value={newHabit.time}
                  onChange={(e) => setNewHabit({ ...newHabit, time: e.target.value })}
                />
              </div>
              <div>
                <Label>Icon</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {iconOptions.map((icon) => (
                    <Button
                      key={icon.value}
                      type="button"
                      variant={newHabit.icon === icon.value ? 'default' : 'outline'}
                      className="text-2xl h-12"
                      onClick={() => setNewHabit({ ...newHabit, icon: icon.value })}
                    >
                      {icon.value}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddHabit} className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white">Add Habit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Wellness Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-muted-foreground text-sm font-medium mb-1">Overall Wellness Score</p>
              <p className="text-foreground text-3xl font-bold mb-1">{wellnessScore}</p>
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>Keep it up!</span>
              </div>
            </div>
            <div className="relative w-16 h-16 ml-4">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - wellnessScore / 100)}`}
                  className="text-primary"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-foreground text-sm font-bold">{wellnessScore}%</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-muted-foreground text-sm font-medium mb-1">Current Streak</p>
              <p className="text-foreground text-3xl font-bold mb-1">{Math.max(...habits.map(h => h.streak), 0)}</p>
              <p className="text-muted-foreground text-sm">days</p>
            </div>
            <div className="text-3xl ml-4">🔥</div>
          </div>
        </Card>

        <Card className="p-6 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-muted-foreground text-sm font-medium mb-1">Today's Progress</p>
              <p className="text-foreground text-3xl font-bold mb-1">{completedHabits}/{habits.length}</p>
              <p className="text-muted-foreground text-sm">habits completed</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center ml-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Habit Grid */}
      <div>
        <h2 className="text-foreground mb-4 text-xl font-semibold">Today's Habits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {habits.length === 0 ? (
            <Card className="p-8 border-border bg-card shadow-md col-span-full text-center">
              <p className="text-muted-foreground text-base">No habits yet. Add your first habit to get started!</p>
            </Card>
          ) : (
            habits.map((habit) => (
              <Card 
                key={habit.id} 
                className={`p-5 border-border bg-card shadow-md hover:shadow-lg transition-all group ${
                  habit.completed ? 'border-primary/30 bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${habit.color} flex items-center justify-center text-white text-xl flex-shrink-0 shadow-sm`}>
                    {habit.icon}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => handleEditClick(habit)}
                    >
                      <Edit className="w-4 h-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => handleDeleteClick(habit.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <h3 className="text-foreground font-semibold mb-1 text-base">{habit.name}</h3>
                <p className="text-muted-foreground text-sm mb-3">{habit.target} • {habit.time}</p>

                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                  <span className="text-orange-500 text-lg">🔥</span>
                    <span className="text-sm text-muted-foreground font-medium">{habit.streak} day streak</span>
                </div>

                <Button
                  onClick={() => handleToggleHabit(habit.id)}
                  size="sm"
                  className={`w-full h-10 text-sm font-medium ${
                    habit.completed 
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  }`}
                >
                  {habit.completed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Completed Today
                    </>
                  ) : (
                    <>
                      Check In
                    </>
                  )}
                </Button>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Edit Habit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Habit</DialogTitle>
            <DialogDescription>
              Update your habit details to keep your tracking accurate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-habit-name">Habit Name</Label>
              <Input
                id="edit-habit-name"
                placeholder="e.g., Morning Workout"
                value={editHabit.name}
                onChange={(e) => setEditHabit({ ...editHabit, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-target">Target</Label>
              <Input
                id="edit-target"
                placeholder="e.g., 30 minutes daily"
                value={editHabit.target}
                onChange={(e) => setEditHabit({ ...editHabit, target: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-time">Time</Label>
              <Input
                id="edit-time"
                placeholder="e.g., 7:00 AM"
                value={editHabit.time}
                onChange={(e) => setEditHabit({ ...editHabit, time: e.target.value })}
              />
            </div>
            <div>
              <Label>Icon</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {iconOptions.map((icon) => (
                  <Button
                    key={icon.value}
                    type="button"
                    variant={editHabit.icon === icon.value ? 'default' : 'outline'}
                    className="text-2xl h-12"
                    onClick={() => setEditHabit({ ...editHabit, icon: icon.value })}
                  >
                    {icon.value}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this habit and all its history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Weekly Overview */}
      <Card className="p-6 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
        <h2 className="text-foreground mb-4 text-xl font-semibold">Weekly Progress</h2>
        <div className="grid grid-cols-7 gap-3">
          {weeklyProgress.map((day, index) => {
            const percentage = day.total > 0 ? (day.completed / day.total) * 100 : 0;
            return (
              <div key={index} className="text-center">
                <p className={`text-sm mb-2 font-medium ${day.isToday ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  {day.day}
                </p>
                <div className={`h-20 bg-muted rounded-lg flex flex-col justify-end overflow-hidden border-2 ${
                  day.isToday ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'
                }`}>
                  <div 
                    className={`transition-all ${
                      percentage === 100 
                        ? 'bg-gradient-to-t from-primary to-primary/80' 
                        : percentage >= 50 
                          ? 'bg-gradient-to-t from-primary/80 to-primary/60' 
                          : 'bg-gradient-to-t from-primary/60 to-primary/40'
                    }`}
                    style={{ height: `${Math.max(percentage, 5)}%` }}
                  ></div>
                </div>
                <p className={`text-sm mt-2 font-semibold ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
                  {day.completed}/{day.total}
                </p>
                {day.isToday && (
                  <p className="text-xs text-primary mt-1 font-medium">Today</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
