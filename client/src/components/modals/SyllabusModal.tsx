import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface SyllabusModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (syllabus: string) => void;
  onDelete?: () => void;
  courseName: string;
  existingSyllabus?: string | null;
  loading?: boolean;
}

export function SyllabusModal({ 
  open, 
  onClose, 
  onSave, 
  onDelete,
  courseName, 
  existingSyllabus,
  loading = false
}: SyllabusModalProps) {
  const [syllabus, setSyllabus] = useState(existingSyllabus || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Update syllabus when existingSyllabus changes
    setSyllabus(existingSyllabus || '');
  }, [existingSyllabus, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(syllabus);
      onClose();
    } catch (error) {
      console.error('Error saving syllabus:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this syllabus? This will also remove it from AI context.')) {
      return;
    }
    setIsSaving(true);
    try {
      await onDelete();
      setSyllabus('');
      onClose();
    } catch (error) {
      console.error('Error deleting syllabus:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const characterCount = syllabus.length;
  const wordCount = syllabus.trim() ? syllabus.trim().split(/\s+/).length : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Syllabus - {courseName}</DialogTitle>
          <DialogDescription>
            Add or edit the syllabus for this course. The AI will use this content to help you prepare for exams and generate study tasks.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 flex flex-col space-y-2 mb-4">
            <Label htmlFor="syllabus">Syllabus Content</Label>
            <Textarea
              id="syllabus"
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              placeholder="Enter the syllabus content here. You can include chapters, topics, learning objectives, etc. The AI will use this to generate personalized study tasks."
              className="flex-1 min-h-[400px] resize-none font-mono text-sm"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{wordCount} words, {characterCount} characters</span>
              <span>This content will be stored and used by AI for context</span>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between">
            <div>
              {existingSyllabus && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSaving || loading}
                >
                  Delete Syllabus
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving || loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || loading}>
                {isSaving || loading ? 'Saving...' : existingSyllabus ? 'Update Syllabus' : 'Save Syllabus'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

