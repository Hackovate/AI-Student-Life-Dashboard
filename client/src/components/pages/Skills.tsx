import { useState, useEffect } from 'react';
import { Plus, Target, TrendingUp, Sparkles, Pencil, Trash2, Check, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { SkillModal } from '../modals/SkillModal';
import { skillsAPI } from '@/lib/api';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function Skills() {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // AI Skill Generation states
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = useState(false);
  const [roadmapPreviewOpen, setRoadmapPreviewOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; category: string; description: string; reason: string }>>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<{ name: string; category: string; description: string; reason: string } | null>(null);
  const [generatedRoadmap, setGeneratedRoadmap] = useState<any>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [editingRoadmap, setEditingRoadmap] = useState(false);
  const [roadmapCurrentTab, setRoadmapCurrentTab] = useState<'basic' | 'milestones' | 'resources'>('basic');

  useEffect(() => {
    loadData();

    // Listen for skill creation events from AI chat
    const handleSkillCreated = () => {
      loadData();
    };

    window.addEventListener('skillCreated', handleSkillCreated);

    return () => {
      window.removeEventListener('skillCreated', handleSkillCreated);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const skillsData = await skillsAPI.getAll();
      setSkills(skillsData);
    } catch (error) {
      console.error('Error loading skills data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    setSelectedSkill(null);
    setModalMode('create');
    setSkillModalOpen(true);
  };

  const handleEditSkill = (skill: any) => {
    setSelectedSkill(skill);
    setModalMode('edit');
    setSkillModalOpen(true);
  };

  const handleDeleteClick = (skill: any) => {
    setSkillToDelete({ id: skill.id, name: skill.name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteSkill = async () => {
    if (!skillToDelete) return;
    
    setDeleting(true);
    try {
      await skillsAPI.delete(skillToDelete.id);
      await loadData();
      toast.success('Skill deleted successfully');
      setDeleteDialogOpen(false);
      setSkillToDelete(null);
    } catch (error) {
      console.error('Error deleting skill:', error);
      toast.error('Failed to delete skill. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    try {
      await skillsAPI.generateRecommendations();
      await loadData();
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert('Failed to generate recommendations');
    }
  };

  const handleGenerateSkill = async () => {
    setSuggestionsDialogOpen(true);
    setLoadingSuggestions(true);
    try {
      const response = await skillsAPI.getSuggestions();
      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast.error('Failed to load skill suggestions');
      setSuggestionsDialogOpen(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSelectSuggestion = async (suggestion: { name: string; category: string; description: string; reason: string }) => {
    setSelectedSuggestion(suggestion);
    setLoadingRoadmap(true);
    setSuggestionsDialogOpen(false);
    
    try {
      const roadmap = await skillsAPI.generateRoadmap(suggestion.name);
      setGeneratedRoadmap(roadmap);
      setRoadmapPreviewOpen(true);
    } catch (error) {
      console.error('Error generating roadmap:', error);
      toast.error('Failed to generate skill roadmap');
      setSuggestionsDialogOpen(true);
    } finally {
      setLoadingRoadmap(false);
    }
  };

  const handleSaveGeneratedSkill = async () => {
    if (!generatedRoadmap) return;

    try {
      // Prepare skill data for creation
      const skillData = {
        name: generatedRoadmap.name,
        category: generatedRoadmap.category,
        level: generatedRoadmap.level,
        description: generatedRoadmap.description,
        goalStatement: generatedRoadmap.goalStatement,
        durationMonths: generatedRoadmap.durationMonths,
        estimatedHours: generatedRoadmap.estimatedHours,
        startDate: generatedRoadmap.startDate,
        endDate: generatedRoadmap.endDate,
        milestones: generatedRoadmap.milestones.map((m: any) => ({ name: m.name, order: m.order })),
        learningResources: generatedRoadmap.resources.map((r: any) => ({
          title: r.title,
          type: r.type,
          url: r.url || null,
          description: r.description || null
        })),
        aiGenerated: true
      };

      await skillsAPI.create(skillData);
      toast.success('Skill generated and saved successfully!');
      setRoadmapPreviewOpen(false);
      setGeneratedRoadmap(null);
      setSelectedSuggestion(null);
      await loadData();
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('skillCreated'));
    } catch (error) {
      console.error('Error saving generated skill:', error);
      toast.error('Failed to save skill');
    }
  };

  const handleEditRoadmap = () => {
    setEditingRoadmap(true);
  };

  const handleUpdateRoadmapField = (field: string, value: any) => {
    setGeneratedRoadmap((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateMilestone = (index: number, field: string, value: any) => {
    setGeneratedRoadmap((prev: any) => ({
      ...prev,
      milestones: prev.milestones.map((m: any, i: number) => 
        i === index ? { ...m, [field]: value } : m
      )
    }));
  };

  const handleUpdateResource = (index: number, field: string, value: any) => {
    setGeneratedRoadmap((prev: any) => ({
      ...prev,
      resources: prev.resources.map((r: any, i: number) => 
        i === index ? { ...r, [field]: value } : r
      )
    }));
  };

  const completedMilestones = skills.reduce((acc, skill) => 
    acc + (skill.milestones?.filter((m: any) => m.completed).length || 0), 0
  );
  const totalMilestones = skills.reduce((acc, skill) => 
    acc + (skill.milestones?.length || 0), 0
  );
  const totalHours = skills.reduce((acc, skill) => {
    const hours = parseInt(skill.timeSpent?.replace('h', '') || '0');
    return acc + hours;
  }, 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading skills...</div>;
  }

  return (
    <div className="space-y-2">
      {/* Skill Modal */}
      <SkillModal
        open={skillModalOpen}
        onClose={() => setSkillModalOpen(false)}
        onSave={loadData}
        skill={selectedSkill}
        mode={modalMode}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 dark:text-gray-100 text-2xl mb-0.5">Skill Development Tracker</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Track your learning journey and build your expertise</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleGenerateSkill}
            variant="outline"
            className="gap-2 border-violet-500 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950"
          >
            <Sparkles className="w-4 h-4" />
            Generate Skill
          </Button>
          <Button 
            onClick={handleAddSkill}
            className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Skill
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Card className="p-3 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs mb-0.5">Active Skills</p>
              <p className="text-gray-900 dark:text-gray-100 text-2xl">{skills.length}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
          </div>
        </Card>
        <Card className="p-3 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs mb-0.5">Milestones Completed</p>
              <p className="text-gray-900 dark:text-gray-100 text-2xl">{completedMilestones}/{totalMilestones}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>
        </Card>
        <Card className="p-3 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs mb-0.5">Total Learning Hours</p>
              <p className="text-gray-900 dark:text-gray-100 text-2xl">{totalHours}h</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Skill Roadmap Cards */}
      <div>
        <h2 className="text-gray-900 dark:text-gray-100 mb-2 text-lg">Your Learning Roadmaps</h2>
        {skills.length === 0 ? (
          <Card className="p-12 text-center border-gray-200 dark:border-gray-700">
            <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Skills Yet</h3>
            <p className="text-muted-foreground mb-4">Start tracking your learning journey by adding your first skill</p>
            <Button onClick={handleAddSkill} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Skill
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
            {skills.map((skill) => {
              const completedMilestonesCount = skill.milestones?.filter((m: any) => m.completed).length || 0;
              const totalMilestonesCount = skill.milestones?.length || 0;
              const calculatedProgress = totalMilestonesCount > 0 
                ? Math.round((completedMilestonesCount / totalMilestonesCount) * 100) 
                : 0;

              return (
                <Card 
                  key={skill.id} 
                  className="p-3 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleEditSkill(skill)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-900 dark:text-gray-100 font-semibold mb-1.5 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {skill.name}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{skill.category}</Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{skill.level}</Badge>
                        {skill.aiGenerated && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-60 hover:opacity-100 transition-opacity"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleEditSkill(skill);
                        }}
                        title="Edit skill"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive opacity-60 hover:opacity-100 transition-opacity"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleDeleteClick(skill);
                        }}
                        title="Delete skill"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Goal Statement */}
                  {skill.goalStatement && (
                    <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                      <p className="text-xs text-gray-900 dark:text-gray-100 line-clamp-2">{skill.goalStatement}</p>
                    </div>
                  )}

                  {/* Progress */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span className="text-xs font-semibold text-foreground">{calculatedProgress}%</span>
                    </div>
                    <Progress value={calculatedProgress} className="h-1.5" />
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 pb-2 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      {totalMilestonesCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          {completedMilestonesCount}/{totalMilestonesCount}
                        </span>
                      )}
                      {skill.learningResources?.length > 0 && (
                        <span className="flex items-center gap-1">
                          📚 {skill.learningResources.length}
                        </span>
                      )}
                    </div>
                    {skill.timeSpent && skill.timeSpent !== '0h' && (
                      <span className="flex items-center gap-1">
                        ⏱️ {skill.timeSpent}
                      </span>
                    )}
                  </div>

                  {/* Timeline Info - Compact */}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {skill.durationMonths && (
                      <span className="px-2 py-0.5 bg-muted rounded text-muted-foreground">
                        📅 {skill.durationMonths}mo
                      </span>
                    )}
                    {skill.estimatedHours && (
                      <span className="px-2 py-0.5 bg-muted rounded text-muted-foreground">
                        ⏱️ {skill.estimatedHours}h
                      </span>
                    )}
                    {skill.startDate && (
                      <span className="px-2 py-0.5 bg-muted rounded text-muted-foreground">
                        � {new Date(skill.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {skill.endDate && (
                      <span className="px-2 py-0.5 bg-muted rounded text-muted-foreground">
                        🎯 {new Date(skill.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">Delete Skill</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Are you sure you want to delete <span className="font-semibold text-foreground">"{skillToDelete?.name}"</span>?
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                This will permanently delete the skill, all its milestones, and learning resources. This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSkill}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <span className="mr-2">Deleting...</span>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Skill
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Skill Suggestions Dialog */}
      <Dialog open={suggestionsDialogOpen} onOpenChange={setSuggestionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              AI Skill Suggestions
            </DialogTitle>
            <DialogDescription>
              Based on your courses, existing skills, and goals, here are some skills we recommend learning.
            </DialogDescription>
          </DialogHeader>
          
          {loadingSuggestions ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              <span className="ml-2 text-muted-foreground">Generating suggestions...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No suggestions available. Try again later.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <Card 
                  key={index}
                  className="p-3 border-border hover:border-violet-300 dark:hover:border-violet-700 cursor-pointer transition-colors"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{suggestion.name}</h3>
                        <Badge variant="outline" className="text-xs">{suggestion.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{suggestion.description}</p>
                      <p className="text-xs text-violet-600 dark:text-violet-400 italic">{suggestion.reason}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuggestionsDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roadmap Preview Dialog */}
      <Dialog open={roadmapPreviewOpen} onOpenChange={(open) => {
        setRoadmapPreviewOpen(open);
        if (!open) {
          setRoadmapCurrentTab('basic');
          setEditingRoadmap(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-500" />
              {editingRoadmap ? 'Edit' : 'Preview'} Generated Skill Roadmap
            </DialogTitle>
            <DialogDescription>
              Review the AI-generated roadmap. You can edit any details before saving.
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="border-b">
            <div className="flex px-6">
              <button
                onClick={() => setRoadmapCurrentTab('basic')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  roadmapCurrentTab === 'basic'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Basic Information
              </button>
              <button
                onClick={() => setRoadmapCurrentTab('milestones')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  roadmapCurrentTab === 'milestones'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Milestones
              </button>
              <button
                onClick={() => setRoadmapCurrentTab('resources')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  roadmapCurrentTab === 'resources'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Resources
              </button>
            </div>
          </div>
          
          {loadingRoadmap ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              <span className="ml-2 text-muted-foreground">Generating roadmap...</span>
            </div>
          ) : generatedRoadmap ? (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Basic Info Tab */}
              {roadmapCurrentTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Skill Name</Label>
                      {editingRoadmap ? (
                        <Input
                          value={generatedRoadmap.name}
                          onChange={(e) => handleUpdateRoadmapField('name', e.target.value)}
                        />
                      ) : (
                        <p className="text-sm text-foreground mt-1">{generatedRoadmap.name}</p>
                      )}
                    </div>
                    <div>
                      <Label>Category</Label>
                      {editingRoadmap ? (
                        <Select
                          value={generatedRoadmap.category}
                          onValueChange={(value) => handleUpdateRoadmapField('category', value)}
                        >
                          <SelectTrigger>
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
                      ) : (
                        <p className="text-sm text-foreground mt-1">{generatedRoadmap.category}</p>
                      )}
                    </div>
                    <div>
                      <Label>Level</Label>
                      {editingRoadmap ? (
                        <Select
                          value={generatedRoadmap.level}
                          onValueChange={(value) => handleUpdateRoadmapField('level', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                            <SelectItem value="expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-foreground mt-1 capitalize">{generatedRoadmap.level}</p>
                      )}
                    </div>
                    <div>
                      <Label>Duration</Label>
                      {editingRoadmap ? (
                        <Input
                          type="number"
                          value={generatedRoadmap.durationMonths}
                          onChange={(e) => handleUpdateRoadmapField('durationMonths', parseInt(e.target.value))}
                        />
                      ) : (
                        <p className="text-sm text-foreground mt-1">{generatedRoadmap.durationMonths} months</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    {editingRoadmap ? (
                      <Textarea
                        value={generatedRoadmap.description}
                        onChange={(e) => handleUpdateRoadmapField('description', e.target.value)}
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm text-foreground mt-1">{generatedRoadmap.description}</p>
                    )}
                  </div>
                  <div>
                    <Label>Goal Statement</Label>
                    {editingRoadmap ? (
                      <Textarea
                        value={generatedRoadmap.goalStatement}
                        onChange={(e) => handleUpdateRoadmapField('goalStatement', e.target.value)}
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm text-foreground mt-1">{generatedRoadmap.goalStatement}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Estimated Hours</Label>
                      {editingRoadmap ? (
                        <Input
                          type="number"
                          value={generatedRoadmap.estimatedHours}
                          onChange={(e) => handleUpdateRoadmapField('estimatedHours', parseFloat(e.target.value))}
                        />
                      ) : (
                        <p className="text-sm text-foreground mt-1">{generatedRoadmap.estimatedHours} hours</p>
                      )}
                    </div>
                    <div>
                      <Label>Timeline</Label>
                      <p className="text-sm text-foreground mt-1">
                        {new Date(generatedRoadmap.startDate).toLocaleDateString()} - {new Date(generatedRoadmap.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Milestones Tab */}
              {roadmapCurrentTab === 'milestones' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Milestones</h3>
                    {!editingRoadmap && (
                      <Button variant="ghost" size="sm" onClick={handleEditRoadmap}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {generatedRoadmap.milestones?.map((milestone: any, index: number) => (
                      <Card key={index} className="p-2 border-border">
                        {editingRoadmap ? (
                          <Input
                            value={milestone.name}
                            onChange={(e) => handleUpdateMilestone(index, 'name', e.target.value)}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Step {milestone.order + 1}</Badge>
                            <span className="text-sm text-foreground">{milestone.name}</span>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Resources Tab */}
              {roadmapCurrentTab === 'resources' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Learning Resources</h3>
                  </div>
                  <div className="space-y-2">
                    {generatedRoadmap.resources?.map((resource: any, index: number) => (
                      <Card key={index} className="p-2 border-border">
                        {editingRoadmap ? (
                          <div className="space-y-2">
                            <Input
                              placeholder="Resource title"
                              value={resource.title}
                              onChange={(e) => handleUpdateResource(index, 'title', e.target.value)}
                            />
                            <Input
                              placeholder="URL (optional)"
                              value={resource.url || ''}
                              onChange={(e) => handleUpdateResource(index, 'url', e.target.value)}
                            />
                            <Textarea
                              placeholder="Description"
                              value={resource.description || ''}
                              onChange={(e) => handleUpdateResource(index, 'description', e.target.value)}
                              rows={2}
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-foreground">{resource.title}</span>
                              <Badge variant="secondary" className="text-xs">{resource.type}</Badge>
                            </div>
                            {resource.url && (
                              <a 
                                href={resource.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                              >
                                {resource.url}
                              </a>
                            )}
                            {resource.description && (
                              <p className="text-xs text-muted-foreground mt-1">{resource.description}</p>
                            )}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRoadmapPreviewOpen(false);
              setEditingRoadmap(false);
              setSuggestionsDialogOpen(true);
            }}>
              Back
            </Button>
            {editingRoadmap && (
              <Button variant="outline" onClick={() => setEditingRoadmap(false)}>
                Done Editing
              </Button>
            )}
            <Button 
              onClick={handleSaveGeneratedSkill}
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
            >
              Save Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
