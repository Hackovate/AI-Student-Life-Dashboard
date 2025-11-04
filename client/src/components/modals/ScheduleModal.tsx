import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  schedule?: any;
  mode: 'create' | 'edit';
  courseId: string;
  courseName: string;
}

export function ScheduleModal({ open, onClose, onSave, schedule, mode, courseId, courseName }: ScheduleModalProps) {
  const [formData, setFormData] = useState({
    day: 'Mon',
    time: '09:00',
    type: 'Lecture',
    location: '',
  });

  useEffect(() => {
    if (schedule && mode === 'edit') {
      setFormData({
        day: schedule.day || 'Mon',
        time: schedule.time || '09:00',
        type: schedule.type || 'Lecture',
        location: schedule.location || '',
      });
    } else {
      setFormData({
        day: 'Mon',
        time: '09:00',
        type: 'Lecture',
        location: '',
      });
    }
  }, [schedule, mode, open]);

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
            {mode === 'create' ? 'Add Class Schedule' : 'Edit Class Schedule'} - {courseName}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new class time to your schedule.' : 'Update class schedule details.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Day */}
          <div>
            <Label htmlFor="day">Day *</Label>
            <Select value={formData.day} onValueChange={(value) => setFormData({ ...formData, day: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mon">Monday</SelectItem>
                <SelectItem value="Tue">Tuesday</SelectItem>
                <SelectItem value="Wed">Wednesday</SelectItem>
                <SelectItem value="Thu">Thursday</SelectItem>
                <SelectItem value="Fri">Friday</SelectItem>
                <SelectItem value="Sat">Saturday</SelectItem>
                <SelectItem value="Sun">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time */}
          <div>
            <Label htmlFor="time">Time *</Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              required
            />
          </div>

          {/* Type */}
          <div>
            <Label htmlFor="type">Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lecture">Lecture</SelectItem>
                <SelectItem value="Lab">Lab</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Room 101, Building A"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Add Schedule' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
