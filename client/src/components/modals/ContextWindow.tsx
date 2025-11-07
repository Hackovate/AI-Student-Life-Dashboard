import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';

interface ContextWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StructuredContext {
  user: {
    firstName: string;
    lastName: string;
    educationLevel: string;
    institution: string;
    class: string;
    group: string;
    year: number | null;
    major: string;
    board: string;
    expectedGraduation: string | null;
  };
  courses: Array<{
    name: string;
    code: string;
    credits: number | null;
  }>;
  skills: Array<{
    name: string;
    category: string;
    level: string;
  }>;
  finances: {
    monthlyBudget: number;
    category: string;
  } | null;
}

export function ContextWindow({ open, onOpenChange }: ContextWindowProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [structured, setStructured] = useState<StructuredContext | null>(null);
  const [unstructured, setUnstructured] = useState('');
  const [newCourse, setNewCourse] = useState({ name: '', code: '', credits: '' });
  const [newSkill, setNewSkill] = useState({ name: '', category: 'General', level: 'beginner' });

  useEffect(() => {
    if (open) {
      loadContext();
    }
  }, [open]);

  const loadContext = async () => {
    setLoading(true);
    try {
      const response = await apiRequest<{
        success: boolean;
        data: {
          structured: StructuredContext;
          unstructured: string;
        };
      }>('/ai/context');

      if (response.success && response.data) {
        setStructured(response.data.structured);
        setUnstructured(response.data.unstructured || '');
      }
    } catch (error: any) {
      console.error('Error loading context:', error);
      toast.error('Failed to load context');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await apiRequest<{
        success: boolean;
        message: string;
      }>('/ai/context', {
        method: 'PUT',
        body: JSON.stringify({
          structured,
          unstructured
        }),
      });

      if (response.success) {
        toast.success('Context updated successfully');
        onOpenChange(false);
      } else {
        throw new Error('Failed to save context');
      }
    } catch (error: any) {
      console.error('Error saving context:', error);
      toast.error(error.message || 'Failed to save context');
    } finally {
      setSaving(false);
    }
  };

  const addCourse = () => {
    if (newCourse.name.trim() && structured) {
      setStructured({
        ...structured,
        courses: [
          ...structured.courses,
          {
            name: newCourse.name,
            code: newCourse.code,
            credits: newCourse.credits ? parseInt(newCourse.credits) : null
          }
        ]
      });
      setNewCourse({ name: '', code: '', credits: '' });
    }
  };

  const removeCourse = (index: number) => {
    if (structured) {
      setStructured({
        ...structured,
        courses: structured.courses.filter((_, i) => i !== index)
      });
    }
  };

  const addSkill = () => {
    if (newSkill.name.trim() && structured) {
      setStructured({
        ...structured,
        skills: [
          ...structured.skills,
          {
            name: newSkill.name,
            category: newSkill.category,
            level: newSkill.level
          }
        ]
      });
      setNewSkill({ name: '', category: 'General', level: 'beginner' });
    }
  };

  const removeSkill = (index: number) => {
    if (structured) {
      setStructured({
        ...structured,
        skills: structured.skills.filter((_, i) => i !== index)
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Context Window</DialogTitle>
          <p className="text-sm text-gray-500">
            View and edit all context that AI knows about you
          </p>
        </DialogHeader>

        <Tabs defaultValue="structured" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="structured">Basic Info</TabsTrigger>
            <TabsTrigger value="unstructured">More Info</TabsTrigger>
          </TabsList>

          <TabsContent value="structured" className="space-y-4 mt-4">
            {structured && (
              <>
                {/* User Info */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold">User Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <Input
                        value={structured.user.firstName}
                        onChange={(e) =>
                          setStructured({
                            ...structured,
                            user: { ...structured.user, firstName: e.target.value }
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input
                        value={structured.user.lastName}
                        onChange={(e) =>
                          setStructured({
                            ...structured,
                            user: { ...structured.user, lastName: e.target.value }
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Education Level</Label>
                      <Select
                        value={structured.user.educationLevel}
                        onValueChange={(value) =>
                          setStructured({
                            ...structured,
                            user: { ...structured.user, educationLevel: value }
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="school">School</SelectItem>
                          <SelectItem value="college">College</SelectItem>
                          <SelectItem value="university">University</SelectItem>
                          <SelectItem value="graduate">Graduate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Institution</Label>
                      <Input
                        value={structured.user.institution}
                        onChange={(e) =>
                          setStructured({
                            ...structured,
                            user: { ...structured.user, institution: e.target.value }
                          })
                        }
                      />
                    </div>
                    {structured.user.educationLevel === 'school' && (
                      <>
                        <div>
                          <Label>Class</Label>
                          <Input
                            value={structured.user.class}
                            onChange={(e) =>
                              setStructured({
                                ...structured,
                                user: { ...structured.user, class: e.target.value }
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Group</Label>
                          <Input
                            value={structured.user.group}
                            onChange={(e) =>
                              setStructured({
                                ...structured,
                                user: { ...structured.user, group: e.target.value }
                              })
                            }
                          />
                        </div>
                      </>
                    )}
                    {(structured.user.educationLevel === 'college' || structured.user.educationLevel === 'university') && (
                      <>
                        <div>
                          <Label>Year</Label>
                          <Input
                            type="number"
                            value={structured.user.year || ''}
                            onChange={(e) =>
                              setStructured({
                                ...structured,
                                user: { ...structured.user, year: e.target.value ? parseInt(e.target.value) : null }
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Major</Label>
                          <Input
                            value={structured.user.major}
                            onChange={(e) =>
                              setStructured({
                                ...structured,
                                user: { ...structured.user, major: e.target.value }
                              })
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Courses */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold">Courses</h3>
                  {structured.courses.map((course, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <span className="font-medium">{course.name}</span>
                        {course.code && <span className="text-sm text-gray-500 ml-2">({course.code})</span>}
                        {course.credits && <span className="text-sm text-gray-500 ml-2">- {course.credits} credits</span>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCourse(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Course name"
                      value={newCourse.name}
                      onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                    />
                    <Input
                      placeholder="Code"
                      value={newCourse.code}
                      onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                      className="w-32"
                    />
                    <Input
                      placeholder="Credits"
                      type="number"
                      value={newCourse.credits}
                      onChange={(e) => setNewCourse({ ...newCourse, credits: e.target.value })}
                      className="w-24"
                    />
                    <Button onClick={addCourse} size="sm">Add</Button>
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold">Skills</h3>
                  {structured.skills.map((skill, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <span className="font-medium">{skill.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({skill.category}, {skill.level})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSkill(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Skill name"
                      value={newSkill.name}
                      onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Category"
                      value={newSkill.category}
                      onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                      className="w-32"
                    />
                    <Select
                      value={newSkill.level}
                      onValueChange={(value) => setNewSkill({ ...newSkill, level: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={addSkill} size="sm">Add</Button>
                  </div>
                </div>

                {/* Finances */}
                {structured.finances && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-semibold">Finances</h3>
                    <div>
                      <Label>Monthly Budget</Label>
                      <Input
                        type="number"
                        value={structured.finances.monthlyBudget}
                        onChange={(e) =>
                          setStructured({
                            ...structured,
                            finances: {
                              ...structured.finances!,
                              monthlyBudget: parseFloat(e.target.value) || 0
                            }
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="unstructured" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>More Info</Label>
              <p className="text-sm text-gray-500">
                Add notes, preferences, routines, or any other information you want AI to know about you.
              </p>
              <Textarea
                value={unstructured}
                onChange={(e) => setUnstructured(e.target.value)}
                placeholder="E.g., I prefer studying in the morning, I have a part-time job on weekends, I like to take breaks every 2 hours..."
                className="min-h-[400px]"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

