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

export function ScheduleModal({ open, onClose, onSave, schedule, mode, courseName }: ScheduleModalProps) {
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
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">
            {mode === 'create' ? 'Add Schedule' : 'Edit Schedule'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {courseName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Day */}
            <div>
              <Label htmlFor="day" className="text-sm">Day *</Label>
              <Select value={formData.day} onValueChange={(value: string) => setFormData({ ...formData, day: value })}>
                <SelectTrigger className="mt-1">
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
              <Label htmlFor="time" className="text-sm">Time *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Type */}
            <div>
              <Label htmlFor="type" className="text-sm">Type</Label>
              <Select value={formData.type} onValueChange={(value: string) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="Lecture">Lecture</SelectItem>
                <SelectItem value="Lab">Lab</SelectItem>
                <SelectItem value="Tutorial">Tutorial</SelectItem>
                <SelectItem value="Seminar">Seminar</SelectItem>
              </SelectContent>
            </Select>
          </div>

            {/* Location */}
            <div>
              <Label htmlFor="location" className="text-sm">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Room 101"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9">
              Cancel
            </Button>
            <Button type="submit" className="h-9">
              {mode === 'create' ? 'Add' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
