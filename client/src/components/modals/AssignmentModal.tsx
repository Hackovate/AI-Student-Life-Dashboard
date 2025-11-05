import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface AssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  assignment?: any;
  mode: 'create' | 'edit';
  courseId: string;
  courseName: string;
}

export function AssignmentModal({ open, onClose, onSave, assignment, mode, courseName }: AssignmentModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    estimatedHours: '',
    status: 'pending',
  });

  useEffect(() => {
    if (assignment && mode === 'edit') {
      setFormData({
        title: assignment.title || '',
        description: assignment.description || '',
        startDate: assignment.startDate ? new Date(assignment.startDate).toISOString().split('T')[0] : '',
        dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : '',
        estimatedHours: assignment.estimatedHours || '',
        status: assignment.status || 'pending',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        startDate: '',
        dueDate: '',
        estimatedHours: '',
        status: 'pending',
      });
    }
  }, [assignment, mode, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">
            {mode === 'create' ? 'Add Assignment' : 'Edit Assignment'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {courseName} - {mode === 'create' ? 'Create a new assignment' : 'Update assignment details'}
          </DialogDescription>
        </DialogHeader>
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
              rows={2}
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

            {/* Submission Date */}
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

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9">
              Cancel
            </Button>
            <Button type="submit" className="h-9">
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
