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

export function AssignmentModal({ open, onClose, onSave, assignment, mode, courseId, courseName }: AssignmentModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    status: 'pending',
  });

  useEffect(() => {
    if (assignment && mode === 'edit') {
      setFormData({
        title: assignment.title || '',
        description: assignment.description || '',
        dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : '',
        status: assignment.status || 'pending',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        dueDate: '',
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add Assignment' : 'Edit Assignment'} - {courseName}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new assignment for this course.' : 'Update assignment details.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Assignment Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Homework 1 - Arrays"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Assignment details..."
              rows={4}
            />
          </div>

          {/* Submission Date */}
          <div>
            <Label htmlFor="dueDate">Submission Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="late">Late</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Create Assignment' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
