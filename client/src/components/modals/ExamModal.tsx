import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface ExamModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  exam?: any;
  mode: 'create' | 'edit';
  courses: any[];
  selectedCourseId?: string;
}

export function ExamModal({ open, onClose, onSave, exam, mode, courses, selectedCourseId }: ExamModalProps) {
  const [formData, setFormData] = useState({
    courseId: selectedCourseId || '',
    title: '',
    date: '',
    type: 'Midterm',
  });

  useEffect(() => {
    if (exam && mode === 'edit') {
      setFormData({
        courseId: exam.courseId || selectedCourseId || '',
        title: exam.title || '',
        date: exam.date ? new Date(exam.date).toISOString().split('T')[0] : '',
        type: exam.type || 'Midterm',
      });
    } else {
      setFormData({
        courseId: selectedCourseId || '',
        title: '',
        date: '',
        type: 'Midterm',
      });
    }
  }, [exam, mode, open, selectedCourseId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId) {
      alert('Please select a course');
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New Exam' : 'Edit Exam'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Schedule a new exam for a course.' : 'Update exam details.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Selection */}
          {mode === 'create' && (
            <div>
              <Label htmlFor="courseId">Course *</Label>
              <Select value={formData.courseId} onValueChange={(value) => setFormData({ ...formData, courseId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div>
            <Label htmlFor="title">Exam Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Midterm Exam"
            />
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="date">Exam Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {/* Type */}
          <div>
            <Label htmlFor="type">Exam Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Midterm">Midterm</SelectItem>
                <SelectItem value="Quiz">Quiz</SelectItem>
                <SelectItem value="Final">Final</SelectItem>
                <SelectItem value="Lab Final">Lab Final</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Create Exam' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
