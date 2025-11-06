import { useState, useEffect } from 'react';
import { Plus, Sparkles, CheckCircle2, Circle, Clock, Trash2, Pencil } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { tasksAPI } from '../../lib/api';
import { toast } from 'sonner';

export function DailyPlanner() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
  });

  // Fetch tasks from database
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const fetchedTasks = await tasksAPI.getAll();
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
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
        status: 'pending'
      });

      setNewTask({ title: '', description: '', dueDate: '', priority: 'medium' });
      setIsAddDialogOpen(false);
      toast.success('Task added successfully!');
      await loadTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const statusOrder = ['pending', 'in-progress', 'completed'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    
    try {
      await tasksAPI.update(taskId, { status: nextStatus });
      toast.success(`Task moved to ${nextStatus === 'in-progress' ? 'In Progress' : nextStatus === 'completed' ? 'Completed' : 'Pending'}`);
      await loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksAPI.delete(taskId);
      toast.success('Task deleted successfully!');
      await loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setNewTask({
      title: task.title || '',
      description: task.description || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      priority: task.priority || 'medium',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!newTask.title) {
      toast.error('Please enter a task title');
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

      setNewTask({ title: '', description: '', dueDate: '', priority: 'medium' });
      setEditingTask(null);
      setIsEditDialogOpen(false);
      toast.success('Task updated successfully!');
      await loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const groupedTasks = {
    pending: tasks.filter(t => t.status === 'pending'),
    inProgress: tasks.filter(t => t.status === 'in-progress'),
    completed: tasks.filter(t => t.status === 'completed'),
  };

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
        sectionTasks.map((task: any) => (
          <div key={task.id} className="flex items-start gap-2.5 p-3 bg-card border border-border rounded-lg hover:shadow-md transition-shadow group">
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => handleToggleTask(task.id, task.status)}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                <p className={`text-foreground ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>{task.title}</p>
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground mb-1">{task.description}</p>
              )}
              {task.dueDate && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditTask(task);
                }}
              >
                <Pencil className="w-4 h-4 text-primary" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTask(task.id);
                }}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-3xl mb-1">Today's Plan</h1>
          <p className="text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled>
            <Sparkles className="w-4 h-4" />
            Generate Your Day
          </Button>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </div>
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
          <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditingTask(null);
              setNewTask({ title: '', description: '', dueDate: '', priority: 'medium' });
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
                  setNewTask({ title: '', description: '', dueDate: '', priority: 'medium' });
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
    </div>
  );
}
