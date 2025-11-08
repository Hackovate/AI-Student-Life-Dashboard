import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface AssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onEdit: (assignment: any) => void;
  onDelete: (assignmentId: string) => void;
  assignments: any[];
  courseId: string;
  courseName: string;
  editingAssignment?: any;
}

export function AssignmentDialog({ 
  open, 
  onClose, 
  onSave, 
  onEdit, 
  onDelete, 
  assignments, 
  courseId, 
  courseName,
  editingAssignment 
}: AssignmentDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    estimatedHours: '',
    status: 'pending',
  });

  const [activeTab, setActiveTab] = useState('add');

  useEffect(() => {
    // Reset form when dialog opens/closes
    if (!open) {
      setFormData({
        title: '',
        description: '',
        startDate: '',
        dueDate: '',
        estimatedHours: '',
        status: 'pending',
      });
      setActiveTab('add');
    } else if (open && editingAssignment) {
      // If editing assignment is passed from parent, populate form
      setFormData({
        title: editingAssignment.title || '',
        description: editingAssignment.description || '',
        startDate: editingAssignment.startDate ? new Date(editingAssignment.startDate).toISOString().split('T')[0] : '',
        dueDate: editingAssignment.dueDate ? new Date(editingAssignment.dueDate).toISOString().split('T')[0] : '',
        estimatedHours: editingAssignment.estimatedHours?.toString() || '',
        status: editingAssignment.status || 'pending',
      });
      setActiveTab('add');
    }
  }, [open, editingAssignment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    // Reset form after save
    setFormData({
      title: '',
      description: '',
      startDate: '',
      dueDate: '',
      estimatedHours: '',
      status: 'pending',
    });
    // Switch to assignments tab to see the new/updated assignment
    setActiveTab('list');
  };

  const handleEditClick = (assignment: any) => {
    // Notify parent to set this assignment for editing
    onEdit(assignment);
    setActiveTab('add');
    // The useEffect will populate the form when editingAssignment prop changes
  };

  const handleDeleteClick = (assignmentId: string) => {
    if (confirm('Delete this assignment?')) {
      onDelete(assignmentId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">
            Assignments & Tasks
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{courseName}</p>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add">Add Assignment/Task</TabsTrigger>
            <TabsTrigger value="list">
              Assignments {assignments.length > 0 && `(${assignments.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="flex-1 overflow-y-auto mt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-sm">Assignment Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Homework 1 - Arrays"
                  className="mt-1"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-sm">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Assignment details..."
                  rows={3}
                  className="mt-1 text-sm"
                />
              </div>

              {/* Date Fields */}
              <div className="grid grid-cols-2 gap-3">
                {/* Start Date */}
                <div>
                  <Label htmlFor="startDate" className="text-sm">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="mt-1"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <Label htmlFor="dueDate" className="text-sm">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Estimated Time and Status */}
              <div className="grid grid-cols-2 gap-3">
                {/* Estimated Time */}
                <div>
                  <Label htmlFor="estimatedHours" className="text-sm">Est. Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                    placeholder="e.g., 5"
                    className="mt-1"
                  />
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="status" className="text-sm">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: string) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose} className="h-9">
                  Cancel
                </Button>
                <Button type="submit" className="h-9">
                  {editingAssignment ? 'Save Changes' : 'Create'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="list" className="flex-1 overflow-y-auto mt-4">
            {assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground text-sm">No assignments yet</p>
                <p className="text-muted-foreground text-xs mt-1">Create your first assignment in the "Add Assignment/Task" tab</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment: any) => (
                  <div
                    key={assignment.id}
                    className="rounded-lg border border-border/60 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-foreground truncate">
                            {assignment.title}
                          </h4>
                          <Badge
                            variant={assignment.status === 'completed' ? 'default' : 'secondary'}
                            className="text-[0.65rem] capitalize shrink-0"
                          >
                            {assignment.status}
                          </Badge>
                          {assignment.aiGenerated && (
                            <Badge
                              variant="outline"
                              className="text-[0.65rem] shrink-0 bg-primary/10 text-primary border-primary/20"
                            >
                              AI Generated
                            </Badge>
                          )}
                        </div>
                        {assignment.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {assignment.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {assignment.startDate && (
                            <span>
                              Start: {new Date(assignment.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                          {assignment.dueDate && (
                            <span>
                              Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                          {assignment.estimatedHours && (
                            <span>Est. {assignment.estimatedHours}h</span>
                          )}
                          {assignment.points && (
                            <span>{assignment.points} points</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditClick(assignment)}
                          aria-label="Edit assignment"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(assignment.id)}
                          aria-label="Delete assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

