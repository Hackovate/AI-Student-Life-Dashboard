import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Plus, Trash2, Check, CheckCircle2, Circle, Link as LinkIcon, FileText, Upload, ExternalLink } from 'lucide-react';
import { skillsAPI } from '@/lib/api';

interface SkillModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  skill?: any;
  mode: 'create' | 'edit';
}

export function SkillModal({ open, onClose, onSave, skill, mode }: SkillModalProps) {
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState<'basic' | 'milestones' | 'resources'>('basic');

  // Basic Info
  const [formData, setFormData] = useState({
    name: '',
    category: 'Technical',
    level: 'beginner',
    description: '',
    gradient: 'from-blue-500 to-cyan-500',
    durationMonths: '',
    estimatedHours: '',
    startDate: '',
    endDate: '',
    goalStatement: ''
  });

  // Milestones
  const [milestones, setMilestones] = useState<any[]>([]);
  const [newMilestone, setNewMilestone] = useState('');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');

  // Learning Resources
  const [resources, setResources] = useState<any[]>([]);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [resourceForm, setResourceForm] = useState({
    title: '',
    type: 'link',
    url: '',
    content: '',
    description: ''
  });

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && skill) {
        setFormData({
          name: skill.name || '',
          category: skill.category || 'Technical',
          level: skill.level || 'beginner',
          description: skill.description || '',
          gradient: skill.gradient || 'from-blue-500 to-cyan-500',
          durationMonths: skill.durationMonths?.toString() || '',
          estimatedHours: skill.estimatedHours?.toString() || '',
          startDate: skill.startDate ? new Date(skill.startDate).toISOString().split('T')[0] : '',
          endDate: skill.endDate ? new Date(skill.endDate).toISOString().split('T')[0] : '',
          goalStatement: skill.goalStatement || ''
        });
        // Ensure milestones have status field (migrate from completed if needed)
        const milestonesWithStatus = (skill.milestones || []).map((m: any) => ({
          ...m,
          status: m.status || (m.completed ? 'completed' : 'pending')
        }));
        setMilestones(milestonesWithStatus);
        setResources(skill.learningResources || []);
      } else {
        resetForm();
      }
    }
  }, [open, skill, mode]);

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Technical',
      level: 'beginner',
      description: '',
      gradient: 'from-blue-500 to-cyan-500',
      durationMonths: '',
      estimatedHours: '',
      startDate: '',
      endDate: '',
      goalStatement: ''
    });
    setMilestones([]);
    setResources([]);
    setNewMilestone('');
    setNewMilestoneDueDate('');
    setShowResourceForm(false);
    setResourceForm({ title: '', type: 'link', url: '', content: '', description: '' });
    setCurrentTab('basic');
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Skill name is required');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        // Create skill with milestones
        await skillsAPI.create({
          ...formData,
          milestones: milestones.map((m, index) => ({
            name: m.name || m,
            completed: m.completed || false,
            status: m.status || (m.completed ? 'completed' : 'pending'),
            dueDate: m.dueDate || null,
            order: index
          }))
        });
      } else if (mode === 'edit' && skill) {
        // Update skill basic info
        await skillsAPI.update(skill.id, formData);
        
        // Handle new milestones (those without an id)
        const newMilestones = milestones.filter(m => !m.id);
        if (newMilestones.length > 0) {
          for (const milestone of newMilestones) {
            await skillsAPI.addMilestone(skill.id, {
              name: milestone.name,
              completed: milestone.completed || false,
              status: milestone.status || (milestone.completed ? 'completed' : 'pending'),
              dueDate: milestone.dueDate || null,
              order: milestones.indexOf(milestone)
            });
          }
        }
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving skill:', error);
      alert('Failed to save skill');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMilestone = () => {
    if (newMilestone.trim()) {
      setMilestones([...milestones, { 
        name: newMilestone, 
        completed: false,
        status: 'pending',
        dueDate: newMilestoneDueDate || null
      }]);
      setNewMilestone('');
      setNewMilestoneDueDate('');
    }
  };

  // Helper function to get next status in cycle: pending → in-progress → completed → pending
  const getNextStatus = (current: string): string => {
    const normalized = current?.toLowerCase() || 'pending';
    if (normalized === 'pending') return 'in-progress';
    if (normalized === 'in-progress') return 'completed';
    return 'pending'; // completed → pending
  };

  const handleRemoveMilestone = async (index: number) => {
    const milestone = milestones[index];
    
    // If editing and milestone has an id, delete from backend
    if (mode === 'edit' && milestone.id) {
      if (!confirm('Delete this milestone?')) return;
      
      try {
        await skillsAPI.deleteMilestone(milestone.id);
        setMilestones(milestones.filter((_, i) => i !== index));
        
        // Trigger parent refresh to update progress
        if (onSave) {
          onSave();
        }
      } catch (error) {
        console.error('Error deleting milestone:', error);
        alert('Failed to delete milestone');
      }
    } else {
      // Just remove from local state for new milestones
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const handleToggleMilestone = async (milestoneToUpdate: any) => {
    if (!milestoneToUpdate) return;
    
    const currentStatus = milestoneToUpdate.status || (milestoneToUpdate.completed ? 'completed' : 'pending');
    const newStatus = getNextStatus(currentStatus);
    
    // Optimistically update local state for immediate UI feedback
    // Use functional update to ensure we're working with latest state
    setMilestones(prev => {
      const updated = prev.map(m => {
        // Match by ID if available (most reliable)
        if (milestoneToUpdate.id && m.id === milestoneToUpdate.id) {
          return {
            ...m,
            status: newStatus,
            completed: newStatus === 'completed'
          };
        }
        // For milestones without ID, match by name and current status
        if (!milestoneToUpdate.id && !m.id && m.name === milestoneToUpdate.name) {
          const mStatus = m.status || (m.completed ? 'completed' : 'pending');
          // Match by name and current status to ensure we're updating the right one
          if (mStatus === currentStatus) {
            return {
              ...m,
              status: newStatus,
              completed: newStatus === 'completed'
            };
          }
        }
        return m;
      });
      return updated;
    });
    
    if (mode === 'edit' && milestoneToUpdate.id) {
      // Update on backend
      try {
        await skillsAPI.updateMilestone(milestoneToUpdate.id, {
          status: newStatus,
          completed: newStatus === 'completed'
        });
        
        // Don't call onSave here as it closes the modal
        // The parent will refresh when modal is closed or when Update Skill is clicked
      } catch (error) {
        console.error('Error toggling milestone:', error);
        // Revert optimistic update on error
        setMilestones(prev => 
          prev.map(m => {
            if (milestoneToUpdate.id && m.id === milestoneToUpdate.id) {
              return milestoneToUpdate;
            } else if (!milestoneToUpdate.id && !m.id && m.name === milestoneToUpdate.name) {
              const mStatus = m.status || (m.completed ? 'completed' : 'pending');
              if (mStatus === newStatus) {
                return milestoneToUpdate;
              }
            }
            return m;
          })
        );
        alert('Failed to toggle milestone');
      }
    }
    // For new milestones without ID, the optimistic update above is sufficient
  };

  const handleAddResource = async () => {
    if (!resourceForm.title.trim()) {
      alert('Resource title is required');
      return;
    }

    try {
      if (mode === 'edit' && skill) {
        // Add to backend
        const newResource = await skillsAPI.addResource(skill.id, resourceForm);
        setResources([...resources, newResource]);
      } else {
        // Add locally for new skills
        setResources([...resources, { ...resourceForm, id: Date.now().toString() }]);
      }

      setResourceForm({ title: '', type: 'link', url: '', content: '', description: '' });
      setShowResourceForm(false);
    } catch (error) {
      console.error('Error adding resource:', error);
      alert('Failed to add resource');
    }
  };

  const handleDeleteResource = async (resourceId: string, index: number) => {
    try {
      if (mode === 'edit' && resources[index].id) {
        await skillsAPI.deleteResource(resourceId);
      }
      setResources(resources.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error deleting resource:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-semibold">
            {mode === 'create' ? 'Add New Skill' : 'Edit Skill'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === 'create' ? 'Create a new skill to track your learning progress' : 'Edit your skill details, milestones, and resources'}
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex px-6">
            <button
              onClick={() => setCurrentTab('basic')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                currentTab === 'basic'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Basic Information
            </button>
            <button
              onClick={() => setCurrentTab('milestones')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                currentTab === 'milestones'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Milestones
            </button>
            <button
              onClick={() => setCurrentTab('resources')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                currentTab === 'resources'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Resources
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Basic Info Tab */}
          {currentTab === 'basic' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <Label htmlFor="skill-name" className="text-sm font-medium mb-1 block">
                  Skill Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="skill-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Full Stack Web Development"
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category" className="text-sm font-medium mb-1 block">
                    Category
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: string) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger id="category" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Creative">Creative</SelectItem>
                      <SelectItem value="Soft Skills">Soft Skills</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Language">Language</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="level" className="text-sm font-medium mb-1 block">
                    Skill Level
                  </Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value: string) => setFormData({ ...formData, level: value })}
                  >
                    <SelectTrigger id="level" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium mb-1 block">
                  Description <span className="text-xs text-muted-foreground">(Optional)</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this skill about? What do you hope to achieve?"
                  rows={2}
                  className="resize-none min-h-[60px]"
                />
              </div>

              <div>
                <Label htmlFor="goalStatement" className="text-sm font-medium mb-1 block">
                  Goal Statement <span className="text-xs text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="goalStatement"
                  value={formData.goalStatement}
                  onChange={(e) => setFormData({ ...formData, goalStatement: e.target.value })}
                  placeholder="e.g., Build and deploy 3 full-stack web applications"
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="durationMonths" className="text-sm font-medium mb-1 block">
                    Target Duration (months) <span className="text-xs text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="durationMonths"
                    type="number"
                    min="1"
                    value={formData.durationMonths}
                    onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                    placeholder="e.g., 6"
                    className="h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="estimatedHours" className="text-sm font-medium mb-1 block">
                    Estimated Hours <span className="text-xs text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    min="1"
                    step="0.5"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                    placeholder="e.g., 120"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" className="text-sm font-medium mb-1 block">
                    Start Date <span className="text-xs text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="endDate" className="text-sm font-medium mb-1 block">
                    Target End Date <span className="text-xs text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Milestones Tab */}
          {currentTab === 'milestones' && (
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Input
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    placeholder="Add a milestone..."
                    className="h-11 flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMilestone();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleAddMilestone} 
                    disabled={!newMilestone.trim()}
                    className="h-11 px-6"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
                <div>
                  <Label htmlFor="milestoneDueDate" className="text-sm text-muted-foreground">
                    Due Date (Optional)
                  </Label>
                  <Input
                    id="milestoneDueDate"
                    type="date"
                    value={newMilestoneDueDate}
                    onChange={(e) => setNewMilestoneDueDate(e.target.value)}
                    className="h-11 mt-1"
                  />
                </div>
              </div>

              {milestones.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Check className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-base mb-2">No milestones added yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Break your skill into smaller goals to track your progress
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    // Create a map of milestone IDs to their original indices for accurate index tracking
                    const milestoneIndexMap = new Map();
                    milestones.forEach((m, idx) => {
                      milestoneIndexMap.set(m.id || `temp-${idx}`, idx);
                    });
                    
                    // Sort milestones: in-progress at top, pending with near due dates next, completed at bottom
                    const sortedMilestones = [...milestones].sort((a: any, b: any) => {
                      const statusA = a.status?.toLowerCase() || (a.completed ? 'completed' : 'pending');
                      const statusB = b.status?.toLowerCase() || (b.completed ? 'completed' : 'pending');
                      
                      // Helper to check if due date is near (within 7 days)
                      const isDueDateNear = (dueDate: string | null | undefined): boolean => {
                        if (!dueDate) return false;
                        const due = new Date(dueDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const diffTime = due.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays >= 0 && diffDays <= 7;
                      };
                      
                      // Priority order: in-progress > pending (with near due) > pending (other) > completed
                      const getPriority = (milestone: any): number => {
                        const status = milestone.status?.toLowerCase() || (milestone.completed ? 'completed' : 'pending');
                        if (status === 'in-progress') return 1;
                        if (status === 'pending' && isDueDateNear(milestone.dueDate)) return 2;
                        if (status === 'pending') return 3;
                        return 4; // completed
                      };
                      
                      const priorityA = getPriority(a);
                      const priorityB = getPriority(b);
                      
                      if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                      }
                      
                      // If same priority, sort by due date (earlier first) for pending items
                      if (priorityA === 2 || priorityA === 3) {
                        const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                        const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                        return dueA - dueB;
                      }
                      
                      // For completed items, maintain original order
                      return 0;
                    });
                    
                    return sortedMilestones.map((milestone, sortedIndex) => {
                      // Find the original index by ID (most reliable) or by name
                      let originalIndex = -1;
                      
                      if (milestone.id) {
                        // Use ID to find the original index
                        originalIndex = milestones.findIndex(m => m.id === milestone.id);
                      } else {
                        // For milestones without ID, find by matching name
                        // Since names might not be unique, we need to be careful
                        // Find the first milestone with matching name that hasn't been used yet
                        const usedIndices = new Set();
                        originalIndex = milestones.findIndex((m, idx) => {
                          if (m.id || m.name !== milestone.name) return false;
                          if (usedIndices.has(idx)) return false;
                          usedIndices.add(idx);
                          return true;
                        });
                      }
                      
                      // Fallback: use the map if available
                      if (originalIndex === -1 && milestone.id) {
                        originalIndex = milestoneIndexMap.get(milestone.id) ?? 0;
                      } else if (originalIndex === -1) {
                        // Last resort: use sorted index (not ideal but better than crashing)
                        originalIndex = sortedIndex;
                      }
                      
                      // Get current status from the milestone object (this will reflect optimistic updates)
                      const status = milestone.status?.toLowerCase() || (milestone.completed ? 'completed' : 'pending');
                      
                      return (
                        <div
                          key={milestone.id ? `${milestone.id}-${status}` : `milestone-${originalIndex}-${status}`}
                          className="flex items-center gap-3 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                        >
                          {/* Status icon - 3 states: pending (gray), in-progress (yellow), completed (green) */}
                          <button
                            type="button"
                            onClick={() => handleToggleMilestone(milestone)}
                            className="mt-0.5 flex-shrink-0"
                            aria-label={
                              status === 'completed' 
                                ? 'Mark as pending' 
                                : status === 'in-progress'
                                ? 'Mark as completed'
                                : 'Mark as in progress'
                            }
                          >
                            {(() => {
                              if (status === 'completed') {
                                return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
                              } else if (status === 'in-progress') {
                                return <Circle className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />;
                              } else {
                                return <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />;
                              }
                            })()}
                          </button>
                          <div className="flex-1 min-w-0">
                            <span className={`block ${
                              status === 'completed' ? 'line-through opacity-60' : 'text-foreground'
                            }`}>
                              {milestone.name}
                            </span>
                            {milestone.dueDate && (
                              <span className="text-xs text-muted-foreground mt-1 block">
                                Due: {new Date(milestone.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveMilestone(originalIndex)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Resources Tab */}
          {currentTab === 'resources' && (
            <div className="space-y-6 max-w-2xl">
              {!showResourceForm ? (
                <Button 
                  onClick={() => setShowResourceForm(true)} 
                  variant="outline" 
                  className="w-full h-12 border-dashed border-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Learning Resource
                </Button>
              ) : (
                <div className="p-5 bg-muted/50 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">New Resource</h3>
                    <Button
                      onClick={() => {
                        setShowResourceForm(false);
                        setResourceForm({ title: '', type: 'link', url: '', content: '', description: '' });
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor="resourceTitle" className="text-sm font-medium mb-2 block">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="resourceTitle"
                      value={resourceForm.title}
                      onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                      placeholder="Resource name"
                      className="h-11"
                    />
                  </div>

                  <div>
                    <Label htmlFor="resourceType" className="text-sm font-medium mb-2 block">Type</Label>
                    <Select
                      value={resourceForm.type}
                      onValueChange={(value: string) => setResourceForm({ ...resourceForm, type: value })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="link">
                          <div className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" />
                            Link
                          </div>
                        </SelectItem>
                        <SelectItem value="note">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Note
                          </div>
                        </SelectItem>
                        <SelectItem value="file">
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            File
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {resourceForm.type === 'link' && (
                    <div>
                      <Label htmlFor="resourceUrl" className="text-sm font-medium mb-2 block">URL</Label>
                      <Input
                        id="resourceUrl"
                        value={resourceForm.url}
                        onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                        placeholder="https://..."
                        className="h-11"
                      />
                    </div>
                  )}

                  {resourceForm.type === 'note' && (
                    <div>
                      <Label htmlFor="resourceContent" className="text-sm font-medium mb-2 block">Content</Label>
                      <Textarea
                        id="resourceContent"
                        value={resourceForm.content}
                        onChange={(e) => setResourceForm({ ...resourceForm, content: e.target.value })}
                        placeholder="Write your notes..."
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                  )}

                  {resourceForm.type === 'file' && (
                    <div>
                      <Label htmlFor="resourceFileUrl" className="text-sm font-medium mb-2 block">File URL</Label>
                      <Input
                        id="resourceFileUrl"
                        value={resourceForm.url}
                        onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                        placeholder="File path or URL"
                        className="h-11"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="resourceDesc" className="text-sm font-medium mb-2 block">
                      Description <span className="text-xs text-muted-foreground">(Optional)</span>
                    </Label>
                    <Textarea
                      id="resourceDesc"
                      value={resourceForm.description}
                      onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                      placeholder="Brief description..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <Button onClick={handleAddResource} className="w-full h-11">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Resource
                  </Button>
                </div>
              )}

              {resources.length === 0 && !showResourceForm && (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-base mb-2">No resources added yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Add helpful links, notes, or files to support your learning
                  </p>
                </div>
              )}

              {resources.length > 0 && (
                <div className="space-y-3">
                  {resources.map((resource, index) => (
                    <div
                      key={resource.id || index}
                      className="p-4 bg-card border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-0.5">
                            {resource.type === 'link' && (
                              <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                            )}
                            {resource.type === 'note' && (
                              <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </div>
                            )}
                            {resource.type === 'file' && (
                              <div className="w-8 h-8 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <Upload className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{resource.title}</h4>
                              <Badge variant="outline" className="text-xs capitalize">{resource.type}</Badge>
                            </div>
                            {resource.description && (
                              <p className="text-sm text-muted-foreground mb-2">{resource.description}</p>
                            )}
                            {resource.url && (
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Open resource
                              </a>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteResource(resource.id, index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/20">
          <div className="flex justify-between gap-3">
            <Button onClick={onClose} variant="outline" disabled={loading}>
              Cancel
            </Button>
            
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : mode === 'create' ? 'Create Skill' : 'Update Skill'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
