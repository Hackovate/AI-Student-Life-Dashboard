import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Plus, Trash2, Check, Link as LinkIcon, FileText, Upload, ExternalLink, ChevronRight, ChevronLeft } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('basic');

  // Basic Info
  const [formData, setFormData] = useState({
    name: '',
    category: 'Technical',
    level: 'beginner',
    description: '',
    gradient: 'from-blue-500 to-cyan-500',
    nextTask: '',
    timeSpent: '0h',
    certificateUrl: ''
  });

  // Milestones
  const [milestones, setMilestones] = useState<any[]>([]);
  const [newMilestone, setNewMilestone] = useState('');

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
          nextTask: skill.nextTask || '',
          timeSpent: skill.timeSpent || '0h',
          certificateUrl: skill.certificateUrl || ''
        });
        setMilestones(skill.milestones || []);
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
      nextTask: '',
      timeSpent: '0h',
      certificateUrl: ''
    });
    setMilestones([]);
    setResources([]);
    setNewMilestone('');
    setShowResourceForm(false);
    setResourceForm({ title: '', type: 'link', url: '', content: '', description: '' });
    setActiveTab('basic');
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
            order: index
          }))
        });
      } else if (mode === 'edit' && skill) {
        // Update skill
        await skillsAPI.update(skill.id, formData);
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
      setMilestones([...milestones, { name: newMilestone, completed: false }]);
      setNewMilestone('');
    }
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleToggleMilestone = async (index: number) => {
    if (mode === 'edit' && milestones[index].id) {
      // Toggle on backend
      try {
        await skillsAPI.toggleMilestone(milestones[index].id);
        const updatedMilestones = [...milestones];
        updatedMilestones[index].completed = !updatedMilestones[index].completed;
        setMilestones(updatedMilestones);
      } catch (error) {
        console.error('Error toggling milestone:', error);
      }
    } else {
      // Toggle locally for new milestones
      const updatedMilestones = [...milestones];
      updatedMilestones[index].completed = !updatedMilestones[index].completed;
      setMilestones(updatedMilestones);
    }
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

  const gradientOptions = [
    { value: 'from-blue-500 to-cyan-500', label: 'Blue to Cyan' },
    { value: 'from-violet-500 to-purple-500', label: 'Violet to Purple' },
    { value: 'from-green-500 to-emerald-500', label: 'Green to Emerald' },
    { value: 'from-orange-500 to-red-500', label: 'Orange to Red' },
    { value: 'from-pink-500 to-rose-500', label: 'Pink to Rose' },
    { value: 'from-amber-500 to-yellow-500', label: 'Amber to Yellow' },
  ];

  const getGradientPreview = (gradient: string) => {
    return (
      <div className={`w-full h-8 rounded-md bg-gradient-to-r ${gradient}`}></div>
    );
  };

  const steps = [
    { id: 'basic', title: 'Basic Info', description: 'Skill details' },
    { id: 'milestones', title: 'Milestones', description: 'Learning goals' },
    { id: 'resources', title: 'Resources', description: 'Materials & links' },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === activeTab);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const goToNextStep = () => {
    if (!isLastStep) {
      setActiveTab(steps[currentStepIndex + 1].id);
    }
  };

  const goToPreviousStep = () => {
    if (!isFirstStep) {
      setActiveTab(steps[currentStepIndex - 1].id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">{mode === 'create' ? 'Add New Skill' : 'Edit Skill'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a new skill roadmap with milestones and learning resources'
              : 'Update your skill information, milestones, and resources'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Pagination Steps Indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => setActiveTab(step.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    index <= currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground border-2 border-border'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </button>
                <div className="text-center mt-2">
                  <p className={`text-sm font-medium ${index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 mb-8 ${index < currentStepIndex ? 'bg-primary' : 'bg-border'}`}></div>
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-hidden">
          {/* Basic Info Step */}
          {activeTab === 'basic' && (
            <div className="h-full overflow-y-auto pr-2">
              <div className="space-y-4">
                <div>
                <Label htmlFor="name" className="text-sm font-medium">Skill Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Full Stack Web Development"
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: string) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="mt-1.5">
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
                  <Label htmlFor="level" className="text-sm font-medium">Skill Level</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value: string) => setFormData({ ...formData, level: value })}
                  >
                    <SelectTrigger className="mt-1.5">
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
                <Label htmlFor="gradient" className="text-sm font-medium">Color Theme</Label>
                <div className="mt-1.5 space-y-2">
                  {getGradientPreview(formData.gradient)}
                  <Select
                    value={formData.gradient}
                    onValueChange={(value: string) => setFormData({ ...formData, gradient: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gradientOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this skill is about..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="nextTask" className="text-sm font-medium">Next Task</Label>
                <Input
                  id="nextTask"
                  value={formData.nextTask}
                  onChange={(e) => setFormData({ ...formData, nextTask: e.target.value })}
                  placeholder="e.g., Complete authentication module"
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeSpent" className="text-sm font-medium">Time Spent</Label>
                  <Input
                    id="timeSpent"
                    value={formData.timeSpent}
                    onChange={(e) => setFormData({ ...formData, timeSpent: e.target.value })}
                    placeholder="e.g., 45h"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="certificateUrl" className="text-sm font-medium">Certificate URL</Label>
                  <Input
                    id="certificateUrl"
                    value={formData.certificateUrl}
                    onChange={(e) => setFormData({ ...formData, certificateUrl: e.target.value })}
                    placeholder="https://..."
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
            </div>
          )}

          {/* Milestones Step */}
          {activeTab === 'milestones' && (
            <div className="h-full overflow-y-auto pr-2">
              <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  placeholder="Add a milestone..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMilestone();
                    }
                  }}
                />
                <Button onClick={handleAddMilestone} size="default" className="gap-2 whitespace-nowrap">
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>

              {milestones.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                    <Check className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="font-medium mb-2">No milestones yet</h3>
                  <p className="text-sm text-muted-foreground">Add milestones to track your learning progress</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {milestones.map((milestone, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-accent dark:bg-gray-800 border border-border rounded-lg hover:bg-accent/80 transition-colors"
                    >
                      <button
                        onClick={() => handleToggleMilestone(index)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          milestone.completed
                            ? 'bg-green-500 border-green-500'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-green-500'
                        }`}
                      >
                        {milestone.completed && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <span className={`flex-1 text-sm ${milestone.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {milestone.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveMilestone(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="text-blue-500 mt-0.5">💡</div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Tip: AI will analyze your milestones and generate personalized recommendations to help you progress faster
                  </p>
                </div>
              </div>
            </div>
            </div>
          )}

          {/* Resources Step */}
          {activeTab === 'resources' && (
            <div className="h-full overflow-y-auto pr-2">
              <div className="space-y-4">
              {!showResourceForm ? (
                <Button onClick={() => setShowResourceForm(true)} variant="outline" className="w-full gap-2 h-12 border-dashed">
                  <Plus className="w-5 h-5" />
                  Add Learning Resource
                </Button>
              ) : (
                <div className="p-4 bg-accent dark:bg-gray-800 border border-border rounded-lg space-y-4">
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
                    <Label htmlFor="resourceTitle" className="text-sm font-medium">Title *</Label>
                    <Input
                      id="resourceTitle"
                      value={resourceForm.title}
                      onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                      placeholder="Resource name"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="resourceType" className="text-sm font-medium">Type</Label>
                    <Select
                      value={resourceForm.type}
                      onValueChange={(value: string) => setResourceForm({ ...resourceForm, type: value })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="link">
                          <div className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-blue-500" />
                            Link
                          </div>
                        </SelectItem>
                        <SelectItem value="note">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-green-500" />
                            Note
                          </div>
                        </SelectItem>
                        <SelectItem value="file">
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4 text-purple-500" />
                            File
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {resourceForm.type === 'link' && (
                    <div>
                      <Label htmlFor="resourceUrl" className="text-sm font-medium">URL</Label>
                      <Input
                        id="resourceUrl"
                        value={resourceForm.url}
                        onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                        placeholder="https://..."
                        className="mt-1.5"
                      />
                    </div>
                  )}

                  {resourceForm.type === 'note' && (
                    <div>
                      <Label htmlFor="resourceContent" className="text-sm font-medium">Content</Label>
                      <Textarea
                        id="resourceContent"
                        value={resourceForm.content}
                        onChange={(e) => setResourceForm({ ...resourceForm, content: e.target.value })}
                        placeholder="Write your notes..."
                        rows={4}
                        className="mt-1.5"
                      />
                    </div>
                  )}

                  {resourceForm.type === 'file' && (
                    <div>
                      <Label htmlFor="resourceFileUrl" className="text-sm font-medium">File URL</Label>
                      <Input
                        id="resourceFileUrl"
                        value={resourceForm.url}
                        onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                        placeholder="File path or URL"
                        className="mt-1.5"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="resourceDesc" className="text-sm font-medium">Description (Optional)</Label>
                    <Textarea
                      id="resourceDesc"
                      value={resourceForm.description}
                      onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                      placeholder="Brief description..."
                      rows={2}
                      className="mt-1.5"
                    />
                  </div>

                  <Button onClick={handleAddResource} className="w-full">
                    Add Resource
                  </Button>
                </div>
              )}

              {resources.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-medium mb-2">No resources yet</h3>
                  <p className="text-sm text-muted-foreground">Add links, notes, or files to support your learning</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {resources.map((resource, index) => (
                    <div
                      key={resource.id || index}
                      className="p-4 bg-accent dark:bg-gray-800 border border-border rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-1 flex-shrink-0">
                            {resource.type === 'link' && (
                              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                            )}
                            {resource.type === 'note' && (
                              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </div>
                            )}
                            {resource.type === 'file' && (
                              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                <Upload className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate">{resource.title}</h4>
                              <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{resource.type}</Badge>
                            </div>
                            {resource.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{resource.description}</p>
                            )}
                            {resource.url && (
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
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
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
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
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="flex gap-3 pt-4 border-t mt-4">
          <div className="flex gap-2 flex-1">
            {!isFirstStep && (
              <Button onClick={goToPreviousStep} variant="outline" className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
            )}
            <Button onClick={onClose} variant="outline" className={isFirstStep ? 'flex-1' : ''} disabled={loading}>
              Cancel
            </Button>
          </div>
          
          <div className="flex gap-2">
            {!isLastStep ? (
              <Button onClick={goToNextStep} className="gap-2">
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : mode === 'create' ? 'Create Skill' : 'Update Skill'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
