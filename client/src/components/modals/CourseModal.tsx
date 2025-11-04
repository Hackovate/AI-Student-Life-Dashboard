import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';

interface CourseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  course?: any;
  mode: 'create' | 'edit';
}

export function CourseModal({ open, onClose, onSave, course, mode }: CourseModalProps) {
  const [formData, setFormData] = useState({
    courseName: '',
    courseCode: '',
    description: '',
    credits: 3,
    semester: '1',
    year: '1',
    status: 'ongoing',
    progress: 0,
    attendance: 0,
  });

  useEffect(() => {
    if (course && mode === 'edit') {
      setFormData({
        courseName: course.courseName || course.name || '',
        courseCode: course.courseCode || course.code || '',
        description: course.description || '',
        credits: course.credits || 3,
        semester: course.semester || '1',
        year: course.year || '1',
        status: course.status || 'ongoing',
        progress: course.progress || 0,
        attendance: course.attendance || 0,
      });
    } else {
      setFormData({
        courseName: '',
        courseCode: '',
        description: '',
        credits: 3,
        semester: '1',
        year: '1',
        status: 'ongoing',
        progress: 0,
        attendance: 0,
      });
    }
  }, [course, mode, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New Course' : 'Edit Course'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Fill in the course details below.' : 'Update the course information.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Course Name */}
            <div className="col-span-2">
              <Label htmlFor="courseName">Course Name *</Label>
              <Input
                id="courseName"
                value={formData.courseName}
                onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                required
                placeholder="e.g., Data Structures & Algorithms"
              />
            </div>

            {/* Course Code */}
            <div>
              <Label htmlFor="courseCode">Course Code</Label>
              <Input
                id="courseCode"
                value={formData.courseCode}
                onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                placeholder="e.g., CS201"
              />
            </div>

            {/* Credits */}
            <div>
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                type="number"
                min="0"
                max="12"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Semester */}
            <div>
              <Label htmlFor="semester">Semester</Label>
              <Select value={formData.semester} onValueChange={(value) => setFormData({ ...formData, semester: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1st Semester</SelectItem>
                  <SelectItem value="2">2nd Semester</SelectItem>
                  <SelectItem value="3">3rd Semester</SelectItem>
                  <SelectItem value="4">4th Semester</SelectItem>
                  <SelectItem value="5">5th Semester</SelectItem>
                  <SelectItem value="6">6th Semester</SelectItem>
                  <SelectItem value="7">7th Semester</SelectItem>
                  <SelectItem value="8">8th Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            <div>
              <Label htmlFor="year">Year</Label>
              <Select value={formData.year} onValueChange={(value) => setFormData({ ...formData, year: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1st Year</SelectItem>
                  <SelectItem value="2">2nd Year</SelectItem>
                  <SelectItem value="3">3rd Year</SelectItem>
                  <SelectItem value="4">4th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="col-span-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Course description..."
                rows={3}
              />
            </div>

            {/* Progress Slider */}
            <div className="col-span-2">
              <Label htmlFor="progress">Progress: {formData.progress}%</Label>
              <Slider
                id="progress"
                min={0}
                max={100}
                step={1}
                value={[formData.progress]}
                onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
                className="mt-2"
              />
            </div>

            {/* Attendance Slider */}
            <div className="col-span-2">
              <Label htmlFor="attendance">Attendance: {formData.attendance}%</Label>
              <Slider
                id="attendance"
                min={0}
                max={100}
                step={1}
                value={[formData.attendance]}
                onValueChange={(value) => setFormData({ ...formData, attendance: value[0] })}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Create Course' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
