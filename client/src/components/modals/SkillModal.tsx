import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
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
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    setCurrentStep(0);
    setErrors({});
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 0) {
      if (!formData.name.trim()) {
        newErrors.name = 'Skill name is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    { value: 'from-blue-500 to-cyan-500', label: 'Blue to Cyan', preview: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
    { value: 'from-violet-500 to-purple-500', label: 'Violet to Purple', preview: 'bg-gradient-to-r from-violet-500 to-purple-500' },
    { value: 'from-green-500 to-emerald-500', label: 'Green to Emerald', preview: 'bg-gradient-to-r from-green-500 to-emerald-500' },
    { value: 'from-orange-500 to-red-500', label: 'Orange to Red', preview: 'bg-gradient-to-r from-orange-500 to-red-500' },
    { value: 'from-pink-500 to-rose-500', label: 'Pink to Rose', preview: 'bg-gradient-to-r from-pink-500 to-rose-500' },
    { value: 'from-amber-500 to-yellow-500', label: 'Amber to Yellow', preview: 'bg-gradient-to-r from-amber-500 to-yellow-500' },
  ];

  const steps = [
    { 
      id: 0, 
      title: 'Basic Info', 
      description: 'Name and category',
      icon: '📝'
    },
    { 
      id: 1, 
      title: 'Milestones', 
      description: 'Learning goals',
      icon: '🎯'
    },
    { 
      id: 2, 
      title: 'Resources', 
      description: 'Materials & links',
      icon: '📚'
    },
  ];

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow jumping to previous steps or current step
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] p-0 gap-0 overflow-hidden rounded-2xl shadow-xl border border-border/60 bg-card">
        {/* Header */}
        <DialogHeader className="px-8 pt-7 pb-5 border-b border-border/50">
          <DialogTitle className="text-xl font-semibold">
            {mode === 'create' ? 'Add New Skill' : 'Edit Skill'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === 'create' 
              ? 'Create your learning roadmap in three simple steps'
              : 'Update your skill information and progress'
            }
          </p>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="px-8 py-5 bg-muted/30 border-b border-border/50">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => handleStepClick(index)}
                    disabled={index > currentStep}
                    className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm transition-all mb-2.5 ${
                      index === currentStep
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110'
                        : index < currentStep
                        ? 'bg-primary/20 text-primary border-2 border-primary'
                        : 'bg-muted text-muted-foreground border-2 border-border'
                    } ${index <= currentStep ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}`}
                  >
                    {index < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-lg">{step.icon}</span>
                    )}
                  </button>
                  <p className={`text-xs font-medium text-center leading-relaxed ${
                    index === currentStep ? 'text-foreground' : index < currentStep ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-3 mb-7 transition-colors ${
                    index < currentStep ? 'bg-primary' : 'bg-border'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
  <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Step 1: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-6 max-w-xl mx-auto animate-in fade-in duration-300">
              <div>
                <Label htmlFor="name" className="text-sm font-medium flex items-center gap-1">
                  Skill Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: '' });
                  }}
                  placeholder="e.g., Full Stack Web Development"
                  className={`mt-1.5 h-11 ${errors.name ? 'border-destructive' : ''}`}
                />
                {errors.name && (
                  <p className="text-xs text-destructive mt-1.5">{errors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: string) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technical">💻 Technical</SelectItem>
                      <SelectItem value="Creative">🎨 Creative</SelectItem>
                      <SelectItem value="Soft Skills">💬 Soft Skills</SelectItem>
                      <SelectItem value="Business">💼 Business</SelectItem>
                      <SelectItem value="Language">🌐 Language</SelectItem>
                      <SelectItem value="Other">📌 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="level" className="text-sm font-medium">Skill Level</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value: string) => setFormData({ ...formData, level: value })}
                  >
                    <SelectTrigger className="mt-1.5 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">🌱 Beginner</SelectItem>
                      <SelectItem value="intermediate">📈 Intermediate</SelectItem>
                      <SelectItem value="advanced">⭐ Advanced</SelectItem>
                      <SelectItem value="expert">🏆 Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="gradient" className="text-sm font-medium">Color Theme</Label>
                <div className="mt-1.5 space-y-3">
                  <div className={`w-full h-12 rounded-lg bg-gradient-to-r ${formData.gradient} shadow-sm border border-border`}></div>
                  <Select
                    value={formData.gradient}
                    onValueChange={(value: string) => setFormData({ ...formData, gradient: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gradientOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${option.preview}`}></div>
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  Description <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this skill about? What do you hope to achieve?"
                  rows={3}
                  className="mt-1.5 resize-none"
                />
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl">
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  💡 <strong>Tip:</strong> Be specific with your skill name. This helps you track progress and get better AI recommendations.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Milestones */}
          {currentStep === 1 && (
            <div className="space-y-6 max-w-xl mx-auto animate-in fade-in duration-300">
              <div>
                <Label className="text-sm font-medium mb-2 block">Add Learning Milestones</Label>
                <div className="flex gap-2">
                  <Input
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    placeholder="e.g., Learn React basics..."
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
                    size="default" 
                    className="h-11 px-5 gap-2"
                    disabled={!newMilestone.trim()}
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                </div>
              </div>

              {milestones.length === 0 ? (
                <div className="text-center py-14 px-6 border-2 border-dashed border-border rounded-xl">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-950 dark:to-purple-950 flex items-center justify-center">
                    <span className="text-3xl">🎯</span>
                  </div>
                  <h3 className="font-semibold mb-1">No milestones yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Break your learning into achievable milestones to track progress and stay motivated
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-3">
                    {milestones.filter(m => m.completed).length} of {milestones.length} completed
                  </p>
                  {milestones.map((milestone, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3.5 border rounded-xl transition-all ${
                        milestone.completed 
                          ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800/50' 
                          : 'bg-card hover:bg-accent/50 border-border'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleMilestone(index)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          milestone.completed
                            ? 'bg-green-500 border-green-500 shadow-sm'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-green-500 hover:scale-110'
                        }`}
                      >
                        {milestone.completed && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <span className={`flex-1 text-sm ${
                        milestone.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'
                      }`}>
                        {milestone.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveMilestone(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-xl">
                <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
                  🎯 <strong>Tip:</strong> Set 5-10 realistic milestones. You can check them off as you progress to visualize your journey!
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Resources */}
          {currentStep === 2 && (
            <div className="space-y-6 max-w-xl mx-auto animate-in fade-in duration-300">
              {!showResourceForm ? (
                <Button 
                  onClick={() => setShowResourceForm(true)} 
                  variant="outline" 
                  className="w-full h-12 gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5"
                >
                  <Plus className="w-5 h-5" />
                  Add Learning Resource
                </Button>
              ) : (
                <div className="p-5 bg-accent/50 border-2 border-border rounded-xl space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">New Resource</h3>
                    <Button
                      onClick={() => {
                        setShowResourceForm(false);
                        setResourceForm({ title: '', type: 'link', url: '', content: '', description: '' });
                      }}
                      size="sm"
                      variant="ghost"
                      className="h-8"
                    >
                      Cancel
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor="resourceTitle" className="text-sm font-medium flex items-center gap-1">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="resourceTitle"
                      value={resourceForm.title}
                      onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                      placeholder="Resource name"
                      className="mt-1.5 h-10"
                    />
                  </div>

                  <div>
                    <Label htmlFor="resourceType" className="text-sm font-medium">Type</Label>
                    <Select
                      value={resourceForm.type}
                      onValueChange={(value: string) => setResourceForm({ ...resourceForm, type: value })}
                    >
                      <SelectTrigger className="mt-1.5 h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="link">
                          <div className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-blue-500" />
                            Link / URL
                          </div>
                        </SelectItem>
                        <SelectItem value="note">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-green-500" />
                            Note / Text
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
                        className="mt-1.5 h-10"
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
                        rows={3}
                        className="mt-1.5 resize-none"
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
                        className="mt-1.5 h-10"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="resourceDesc" className="text-sm font-medium">
                      Description <span className="text-muted-foreground text-xs">(Optional)</span>
                    </Label>
                    <Textarea
                      id="resourceDesc"
                      value={resourceForm.description}
                      onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                      placeholder="Brief description..."
                      rows={2}
                      className="mt-1.5 resize-none"
                    />
                  </div>

                  <Button onClick={handleAddResource} className="w-full h-10">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Resource
                  </Button>
                </div>
              )}

              {resources.length === 0 ? (
                <div className="text-center py-14 px-6 border-2 border-dashed border-border rounded-xl">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-950 dark:to-cyan-950 flex items-center justify-center">
                    <span className="text-3xl">📚</span>
                  </div>
                  <h3 className="font-semibold mb-1">No resources added</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Add helpful resources like tutorials, documentation, or notes to support your learning
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-3">
                    {resources.length} resource{resources.length !== 1 ? 's' : ''} added
                  </p>
                  {resources.map((resource, index) => (
                    <div
                      key={resource.id || index}
                      className="p-4 bg-card border border-border rounded-xl hover:shadow-md hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-0.5 flex-shrink-0">
                            {resource.type === 'link' && (
                              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                            )}
                            {resource.type === 'note' && (
                              <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </div>
                            )}
                            {resource.type === 'file' && (
                              <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                                <Upload className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate">{resource.title}</h4>
                              <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                                {resource.type}
                              </Badge>
                            </div>
                            {resource.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                {resource.description}
                              </p>
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
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          onClick={() => handleDeleteResource(resource.id, index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  📚 <strong>Tip:</strong> Resources are optional but helpful! Add links to tutorials, courses, or documentation you're using.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-border/50 bg-muted/20">
          <div className="flex items-center justify-between gap-4 max-w-xl mx-auto">
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button 
                  onClick={handleBack} 
                  variant="outline" 
                  className="h-10 px-4 gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              <Button 
                onClick={onClose} 
                variant="ghost" 
                className="h-10 px-4"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
            
            <div className="flex gap-2">
              {currentStep < steps.length - 1 ? (
                <Button 
                  onClick={handleNext} 
                  className="h-10 px-6 gap-2 shadow-sm"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading}
                  className="h-10 px-6 shadow-sm"
                >
                  {loading ? 'Saving...' : mode === 'create' ? '✨ Create Skill' : '💾 Update Skill'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
