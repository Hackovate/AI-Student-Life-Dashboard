import { useState, useEffect } from 'react';
import { Plus, Smile, Meh, Frown, Trash2, Edit, Search } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useApp } from '../../lib/AppContext';
import { journalAPI } from '../../lib/api';
import { toast } from 'sonner';

export function Journal() {
  const { journalEntries, addJournalEntry, updateJournalEntry, deleteJournalEntry, setJournalEntries } = useApp();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    mood: 'good' as 'great' | 'good' | 'okay' | 'bad',
    tags: '',
  });
  const [editEntry, setEditEntry] = useState({
    title: '',
    content: '',
    mood: 'good' as 'great' | 'good' | 'okay' | 'bad',
    tags: '',
  });

  // Listen for journal creation events from AI chat
  useEffect(() => {
    const handleJournalCreated = async () => {
      try {
        const apiJournals = await journalAPI.getAll();
        const transformedJournals = apiJournals.map((j: any) => ({
          id: j.id,
          date: j.date ? new Date(j.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          mood: (j.mood || 'good') as 'great' | 'good' | 'okay' | 'bad',
          title: j.title,
          content: j.content,
          tags: j.tags || []
        }));
        setJournalEntries(transformedJournals);
      } catch (error) {
        console.error('Error reloading journal entries:', error);
      }
    };

    window.addEventListener('journalCreated', handleJournalCreated);

    return () => {
      window.removeEventListener('journalCreated', handleJournalCreated);
    };
  }, [setJournalEntries]);

  const moodOptions = [
    { value: 'great', label: 'Great', emoji: '😄', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
    { value: 'good', label: 'Good', emoji: '🙂', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
    { value: 'okay', label: 'Okay', emoji: '😐', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' },
    { value: 'bad', label: 'Bad', emoji: '😢', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  ];

  const handleAddEntry = async () => {
    if (!newEntry.title || !newEntry.content) {
      toast.error('Please fill in title and content');
      return;
    }

    try {
      await addJournalEntry({
        ...newEntry,
        tags: newEntry.tags.split(',').map(t => t.trim()).filter(t => t),
        date: new Date().toISOString().split('T')[0], // Use date format YYYY-MM-DD
      });

      setNewEntry({ title: '', content: '', mood: 'good', tags: '' });
      setIsAddDialogOpen(false);
      toast.success('Journal entry added!');
    } catch (error) {
      console.error('Error adding journal entry:', error);
      toast.error('Failed to add journal entry');
    }
  };

  const handleEditClick = (entry: any) => {
    setEditingEntryId(entry.id);
    setEditEntry({
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      tags: entry.tags.join(', '),
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateEntry = async () => {
    if (!editEntry.title || !editEntry.content) {
      toast.error('Please fill in title and content');
      return;
    }

    if (!editingEntryId) return;

    try {
      await updateJournalEntry(editingEntryId, {
        ...editEntry,
        tags: editEntry.tags.split(',').map(t => t.trim()).filter(t => t),
      });
      setEditEntry({ title: '', content: '', mood: 'good', tags: '' });
      setEditingEntryId(null);
      setIsEditDialogOpen(false);
      toast.success('Journal entry updated!');
    } catch (error) {
      console.error('Error updating journal entry:', error);
      toast.error('Failed to update journal entry');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteJournalEntry(id);
      toast.success('Entry deleted!');
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      toast.error('Failed to delete entry');
    }
  };

  const getMoodData = (mood: string) => {
    return moodOptions.find(m => m.value === mood) || moodOptions[1];
  };

  const filteredEntries = journalEntries.filter(entry => 
    entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate mood statistics
  const moodStats = moodOptions.map(mood => ({
    ...mood,
    count: journalEntries.filter(e => e.mood === mood.value).length,
  }));

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl mb-0.5">Self-Journal & Reflection</h1>
          <p className="text-muted-foreground text-sm">Document your thoughts, feelings, and personal growth</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Journal Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Give your entry a title..."
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="mood">How are you feeling?</Label>
                <Select value={newEntry.mood} onValueChange={(value: any) => setNewEntry({ ...newEntry, mood: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {moodOptions.map(mood => (
                      <SelectItem key={mood.value} value={mood.value}>
                        <span className="flex items-center gap-2">
                          <span>{mood.emoji}</span>
                          <span>{mood.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Write your thoughts..."
                  className="min-h-[200px]"
                  value={newEntry.content}
                  onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  placeholder="e.g., gratitude, goals, reflection"
                  value={newEntry.tags}
                  onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddEntry}>Save Entry</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Journal Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  placeholder="Give your entry a title..."
                  value={editEntry.title}
                  onChange={(e) => setEditEntry({ ...editEntry, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-mood">How are you feeling?</Label>
                <Select value={editEntry.mood} onValueChange={(value: any) => setEditEntry({ ...editEntry, mood: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {moodOptions.map(mood => (
                      <SelectItem key={mood.value} value={mood.value}>
                        <span className="flex items-center gap-2">
                          <span>{mood.emoji}</span>
                          <span>{mood.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-content">Content</Label>
                <Textarea
                  id="edit-content"
                  placeholder="Write your thoughts..."
                  className="min-h-[200px]"
                  value={editEntry.content}
                  onChange={(e) => setEditEntry({ ...editEntry, content: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-tags">Tags (comma separated)</Label>
                <Input
                  id="edit-tags"
                  placeholder="e.g., gratitude, goals, reflection"
                  value={editEntry.tags}
                  onChange={(e) => setEditEntry({ ...editEntry, tags: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateEntry}>Update Entry</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mood Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {moodStats.map((mood) => (
          <Card key={mood.value} className={`p-2 border-border ${mood.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs mb-0.5">{mood.label}</p>
                <p className="text-2xl">{mood.count}</p>
              </div>
              <div className="text-2xl">{mood.emoji}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card className="p-3 border-border bg-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {/* Journal Entries */}
      <div className="space-y-2">
        {filteredEntries.length === 0 ? (
          <Card className="p-6 border-border bg-card text-center">
            <div className="text-4xl mb-2">📝</div>
            <h3 className="text-foreground text-lg mb-1">No journal entries yet</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'No entries match your search. Try different keywords.' 
                : 'Start documenting your journey by creating your first entry!'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                Create First Entry
              </Button>
            )}
          </Card>
        ) : (
          filteredEntries.map((entry) => {
            const moodData = getMoodData(entry.mood);
            return (
              <Card key={entry.id} className="p-3 border-border bg-card hover:shadow-lg transition-shadow group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-foreground text-base">{entry.title}</h3>
                      <Badge className={moodData.color}>
                        <span className="mr-1">{moodData.emoji}</span>
                        {moodData.label}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(entry)}
                      title="Edit entry"
                    >
                      <Edit className="w-4 h-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteEntry(entry.id)}
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <p className="text-foreground mb-2 whitespace-pre-wrap text-sm">{entry.content}</p>

                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
