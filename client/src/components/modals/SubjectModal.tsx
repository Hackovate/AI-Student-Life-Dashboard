import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface SubjectModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  subject?: any;
  mode: 'create' | 'edit';
  educationLevel: 'school' | 'college';
  class?: string; // For school
  year?: number; // For college
}

export function SubjectModal({ open, onClose, onSave, subject, mode, educationLevel, class: userClass, year }: SubjectModalProps) {
  const [formData, setFormData] = useState({
    courseName: '',
  });

  useEffect(() => {
    if (subject && mode === 'edit') {
      setFormData({
        courseName: subject.courseName || subject.name || '',
      });
    } else {
      setFormData({
        courseName: '',
      });
    }
  }, [subject, mode, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Map to Course model format
    const data = {
      courseName: formData.courseName,
      courseCode: null,
      credits: null,
      description: 'Subject',
      status: 'ongoing',
      progress: 0,
      attendance: 0,
    };
    
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Subject' : 'Edit Subject'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Fill in the subject details below.' : 'Update the subject information.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject Name */}
          <div>
            <Label htmlFor="courseName">Subject Name *</Label>
            <Input
              id="courseName"
              value={formData.courseName}
              onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
              required
              placeholder="e.g., Mathematics, Physics, Chemistry"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Add Subject' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

