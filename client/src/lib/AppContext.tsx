import React, { createContext, useContext, useState, useEffect } from 'react';
import { habitsAPI, financeAPI, journalAPI } from './api';
import { AuthContext } from './useAuth';

interface Subject {
  id: string;
  name: string;
  code: string;
  progress: number;
  grade: string;
  color: string;
  nextClass: string;
  assignments: number;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  progress: number;
  gradient: string;
  milestones: { name: string; completed: boolean }[];
  nextTask: string;
  resources: number;
  timeSpent: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  type: 'expense' | 'income';
  paymentMethod?: string;
  recurring?: boolean;
  frequency?: string;
  aiGenerated?: boolean;
  goalId?: string;
}

interface Habit {
  id: string;
  name: string;
  target: string;
  time: string;
  streak: number;
  completed: boolean;
  color: string;
  icon: string;
  completionHistory?: { date: string; completed: boolean }[];
}

interface JournalEntry {
  id: string;
  date: string;
  mood: 'great' | 'good' | 'okay' | 'bad';
  title: string;
  content: string;
  tags: string[];
}

interface AppContextType {
  subjects: Subject[];
  skills: Skill[];
  expenses: Expense[];
  habits: Habit[];
  journalEntries: JournalEntry[];
  monthlyBudget: number;
  savingsGoal: number;
  currentSavings: number;
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  addSkill: (skill: Omit<Skill, 'id'>) => void;
  updateSkill: (id: string, updates: Partial<Skill>) => void;
  deleteSkill: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  toggleHabit: (id: string) => void;
  addHabit: (habit: Omit<Habit, 'id'>) => void;
  updateHabit: (id: string, updates: Partial<Omit<Habit, 'id' | 'streak' | 'completed' | 'completionHistory'>>) => void;
  deleteHabit: (id: string) => void;
  addJournalEntry: (entry: Omit<JournalEntry, 'id'>) => void;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  setJournalEntries: (entries: JournalEntry[]) => void;
  updateBudget: (budget: number) => void;
  updateSavings: (savings: number, goal: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Get auth status safely - use useContext directly to avoid hook errors
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated || !!localStorage.getItem('authToken');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState(2000);
  const [savingsGoal, setSavingsGoal] = useState(5000);
  const [currentSavings, setCurrentSavings] = useState(2840);
  const [habitsLoading, setHabitsLoading] = useState(false);

  // Function to load habits from API
  const loadHabits = async () => {
    if (isAuthenticated) {
      try {
        setHabitsLoading(true);
        const apiHabits = await habitsAPI.getAll();
        const transformedHabits: Habit[] = apiHabits.map(h => ({
          id: h.id,
          name: h.name,
          target: h.target,
          time: h.time,
          streak: h.streak,
          completed: h.completed,
          color: h.color,
          icon: h.icon,
          completionHistory: (h.completionHistory as Array<{ date: string; completed: boolean }>) || []
        }));
        setHabits(transformedHabits);
      } catch (error) {
        console.error('Error loading habits from API:', error);
      } finally {
        setHabitsLoading(false);
      }
    }
  };

  // Function to load journal entries from API
  const loadJournalEntries = async () => {
    if (isAuthenticated) {
      try {
        const apiJournals = await journalAPI.getAll();
        const transformedJournals: JournalEntry[] = apiJournals.map(j => ({
          id: j.id,
          date: j.date ? new Date(j.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          mood: (j.mood || 'good') as 'great' | 'good' | 'okay' | 'bad',
          title: j.title,
          content: j.content,
          tags: j.tags || []
        }));
        setJournalEntries(transformedJournals);
      } catch (error) {
        console.error('Error loading journal entries from API:', error);
      }
    }
  };

  // Load habits, expenses, and journal entries from API if authenticated
  useEffect(() => {
    const loadData = async () => {
      if (isAuthenticated) {
        try {
          setHabitsLoading(true);
          
          // Load habits
          await loadHabits();
          
          // Load expenses/finances
          const apiExpenses = await financeAPI.getAll();
          const transformedExpenses: Expense[] = apiExpenses.map(e => ({
            id: e.id,
            category: e.category,
            amount: e.amount,
            description: e.description || '',
            date: e.date ? new Date(e.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            type: (e.type === 'income' ? 'income' : 'expense') as 'expense' | 'income',
            paymentMethod: e.paymentMethod || undefined,
            recurring: e.recurring || false,
            frequency: e.frequency || undefined,
            aiGenerated: e.aiGenerated || false,
            goalId: e.goalId || undefined
          }));
          setExpenses(transformedExpenses);
          
          // Load journal entries
          await loadJournalEntries();
        } catch (error) {
          console.error('Error loading data from API:', error);
          // Fallback to localStorage if API fails
          const savedData = localStorage.getItem('studentLifeData');
          if (savedData) {
            const data = JSON.parse(savedData);
            // Calculate completed field based on today's date for localStorage habits
            const today = new Date().toISOString().split('T')[0];
            const habitsWithTodayStatus = (data.habits || []).map((habit: any) => {
              const history = habit.completionHistory || [];
              const todayEntry = history.find((entry: any) => entry.date === today);
              return {
                ...habit,
                completed: todayEntry ? todayEntry.completed : false
              };
            });
            setHabits(habitsWithTodayStatus);
            setExpenses(data.expenses || []);
            setJournalEntries(data.journalEntries || []);
          }
        } finally {
          setHabitsLoading(false);
        }
      } else {
        // Not authenticated - use localStorage
        const savedData = localStorage.getItem('studentLifeData');
        if (savedData) {
          const data = JSON.parse(savedData);
          // Calculate completed field based on today's date for localStorage habits
          const today = new Date().toISOString().split('T')[0];
          const habitsWithTodayStatus = (data.habits || []).map((habit: any) => {
            const history = habit.completionHistory || [];
            const todayEntry = history.find((entry: any) => entry.date === today);
            return {
              ...habit,
              completed: todayEntry ? todayEntry.completed : false
            };
          });
          setHabits(habitsWithTodayStatus);
          setExpenses(data.expenses || []);
          setJournalEntries(data.journalEntries || []);
        }
      }
    };

    loadData();

    // Listen for AI-created events to auto-refresh
    const handleHabitCreated = () => {
      loadHabits();
    };
    const handleJournalCreated = () => {
      loadJournalEntries();
    };

    window.addEventListener('habitCreated', handleHabitCreated);
    window.addEventListener('journalCreated', handleJournalCreated);

    return () => {
      window.removeEventListener('habitCreated', handleHabitCreated);
      window.removeEventListener('journalCreated', handleJournalCreated);
    };
  }, [isAuthenticated]);

  // Load other data from localStorage on mount (subjects, skills, budget - not yet connected to API)
  useEffect(() => {
    const savedData = localStorage.getItem('studentLifeData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setSubjects(data.subjects || []);
      setSkills(data.skills || []);
      // Don't load expenses/journalEntries here - they're loaded from API above
      if (!isAuthenticated) {
        setExpenses(data.expenses || []);
        setJournalEntries(data.journalEntries || []);
      }
      setMonthlyBudget(data.monthlyBudget || 2000);
      setSavingsGoal(data.savingsGoal || 5000);
      setCurrentSavings(data.currentSavings || 2840);
    } else {
      // Initialize with default data
      initializeDefaultData();
    }
  }, []);

  // Save non-API data to localStorage whenever it changes
  useEffect(() => {
    const data = {
      subjects,
      skills,
      expenses: isAuthenticated ? [] : expenses, // Don't save to localStorage if authenticated
      habits: isAuthenticated ? [] : habits, // Don't save habits to localStorage if authenticated
      journalEntries: isAuthenticated ? [] : journalEntries, // Don't save to localStorage if authenticated
      monthlyBudget,
      savingsGoal,
      currentSavings,
    };
    localStorage.setItem('studentLifeData', JSON.stringify(data));
  }, [subjects, skills, expenses, journalEntries, monthlyBudget, savingsGoal, currentSavings, isAuthenticated, habits]);

  const initializeDefaultData = () => {
    // Initialize default subjects
    setSubjects([
      { id: '1', name: "Data Structures & Algorithms", code: "CS201", progress: 75, grade: "A", color: "from-blue-500 to-cyan-500", nextClass: "Mon 11:00 AM", assignments: 2 },
      { id: '2', name: "Database Management Systems", code: "CS301", progress: 60, grade: "B+", color: "from-violet-500 to-purple-500", nextClass: "Tue 2:00 PM", assignments: 1 },
      { id: '3', name: "Operating Systems", code: "CS202", progress: 82, grade: "A", color: "from-green-500 to-emerald-500", nextClass: "Wed 10:00 AM", assignments: 0 },
    ]);

    // Initialize default skills
    setSkills([
      {
        id: '1',
        name: "Full Stack Web Development",
        category: "Technical",
        progress: 68,
        gradient: "from-blue-500 to-cyan-500",
        milestones: [
          { name: "React Fundamentals", completed: true },
          { name: "Node.js & Express", completed: true },
          { name: "Database Design", completed: true },
          { name: "Authentication & Security", completed: false },
          { name: "Deployment & DevOps", completed: false }
        ],
        nextTask: "Build a MERN stack e-commerce app",
        resources: 12,
        timeSpent: "45h"
      }
    ]);

    // Initialize default expenses
    setExpenses([
      { id: '1', description: "Campus Meal Plan", category: "Food", amount: 450, date: new Date().toISOString(), type: 'expense' },
      { id: '2', description: "Textbooks", category: "Education", amount: 280, date: new Date().toISOString(), type: 'expense' },
      { id: '3', description: "Part-time Job", category: "Income", amount: 800, date: new Date().toISOString(), type: 'income' },
    ]);

    // Initialize default habits
    setHabits([
      { id: '1', name: "Morning Meditation", target: "15 minutes", time: "7:00 AM", streak: 12, completed: true, color: "from-blue-500 to-cyan-500", icon: "🧘" },
      { id: '2', name: "Daily Exercise", target: "30 minutes", time: "6:30 AM", streak: 8, completed: true, color: "from-green-500 to-emerald-500", icon: "💪" },
      { id: '3', name: "Reading Time", target: "30 minutes", time: "9:00 PM", streak: 15, completed: false, color: "from-violet-500 to-purple-500", icon: "📚" },
    ]);
  };

  // Subject operations
  const addSubject = (subject: Omit<Subject, 'id'>) => {
    const newSubject = { ...subject, id: Date.now().toString() };
    setSubjects([...subjects, newSubject]);
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setSubjects(subjects.map(subject => subject.id === id ? { ...subject, ...updates } : subject));
  };

  const deleteSubject = (id: string) => {
    setSubjects(subjects.filter(subject => subject.id !== id));
  };

  // Skill operations
  const addSkill = (skill: Omit<Skill, 'id'>) => {
    const newSkill = { ...skill, id: Date.now().toString() };
    setSkills([...skills, newSkill]);
  };

  const updateSkill = (id: string, updates: Partial<Skill>) => {
    setSkills(skills.map(skill => skill.id === id ? { ...skill, ...updates } : skill));
  };

  const deleteSkill = (id: string) => {
    setSkills(skills.filter(skill => skill.id !== id));
  };

  // Expense operations
  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    if (isAuthenticated) {
      try {
        const newExpense = await financeAPI.create({
          category: expense.category,
          amount: expense.amount,
          description: expense.description,
          date: expense.date,
          type: expense.type,
          paymentMethod: expense.paymentMethod,
          recurring: expense.recurring,
          frequency: expense.frequency,
          goalId: expense.goalId
        });
        setExpenses([...expenses, {
          id: newExpense.id,
          category: newExpense.category,
          amount: newExpense.amount,
          description: newExpense.description || '',
          date: newExpense.date ? new Date(newExpense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          type: (newExpense.type === 'income' ? 'income' : 'expense') as 'expense' | 'income',
          paymentMethod: newExpense.paymentMethod || undefined,
          recurring: newExpense.recurring || false,
          frequency: newExpense.frequency || undefined,
          aiGenerated: newExpense.aiGenerated || false,
          goalId: newExpense.goalId || undefined
        }]);
      } catch (error) {
        console.error('Error adding expense:', error);
        // Fallback to local state
        const localExpense = { ...expense, id: Date.now().toString() };
        setExpenses([...expenses, localExpense]);
      }
    } else {
      // Not authenticated - use local state only
      const localExpense = { ...expense, id: Date.now().toString() };
      setExpenses([...expenses, localExpense]);
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    if (isAuthenticated) {
      try {
        const updatedExpense = await financeAPI.update(id, updates);
        setExpenses(expenses.map(expense => 
          expense.id === id ? {
            id: updatedExpense.id,
            category: updatedExpense.category,
            amount: updatedExpense.amount,
            description: updatedExpense.description || '',
            date: updatedExpense.date ? new Date(updatedExpense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            type: (updatedExpense.type === 'income' ? 'income' : 'expense') as 'expense' | 'income',
            paymentMethod: updatedExpense.paymentMethod || undefined,
            recurring: updatedExpense.recurring || false,
            frequency: updatedExpense.frequency || undefined,
            aiGenerated: updatedExpense.aiGenerated || false,
            goalId: updatedExpense.goalId || undefined
          } : expense
        ));
      } catch (error) {
        console.error('Error updating expense:', error);
        // Fallback to local state
        setExpenses(expenses.map(expense => expense.id === id ? { ...expense, ...updates } : expense));
      }
    } else {
      // Not authenticated - use local state only
      setExpenses(expenses.map(expense => expense.id === id ? { ...expense, ...updates } : expense));
    }
  };

  const deleteExpense = async (id: string) => {
    if (isAuthenticated) {
      try {
        await financeAPI.delete(id);
        setExpenses(expenses.filter(expense => expense.id !== id));
      } catch (error) {
        console.error('Error deleting expense:', error);
        // Fallback to local state
        setExpenses(expenses.filter(expense => expense.id !== id));
      }
    } else {
      // Not authenticated - use local state only
      setExpenses(expenses.filter(expense => expense.id !== id));
    }
  };

  // Habit operations
  const toggleHabit = async (id: string) => {
    if (isAuthenticated) {
      try {
        const updatedHabit = await habitsAPI.toggle(id);
        // Update local state with API response
        setHabits(habits.map(habit => 
          habit.id === id ? {
            id: updatedHabit.id,
            name: updatedHabit.name,
            target: updatedHabit.target,
            time: updatedHabit.time,
            streak: updatedHabit.streak,
            completed: updatedHabit.completed,
            color: updatedHabit.color,
            icon: updatedHabit.icon,
            completionHistory: (updatedHabit.completionHistory as Array<{ date: string; completed: boolean }>) || []
          } : habit
        ));
      } catch (error) {
        console.error('Error toggling habit:', error);
        // Fallback to local state update
        setHabits(habits.map(habit => {
          if (habit.id === id) {
            const newCompleted = !habit.completed;
            const today = new Date().toISOString().split('T')[0];
            const history = habit.completionHistory || [];
            const existingEntryIndex = history.findIndex(entry => entry.date === today);
            let newHistory;
            if (existingEntryIndex >= 0) {
              newHistory = [...history];
              newHistory[existingEntryIndex] = { date: today, completed: newCompleted };
            } else {
              newHistory = [...history, { date: today, completed: newCompleted }];
            }
            return { ...habit, completed: newCompleted, completionHistory: newHistory };
          }
          return habit;
        }));
      }
    } else {
      // Not authenticated - use local state only
      setHabits(habits.map(habit => {
        if (habit.id === id) {
          const newCompleted = !habit.completed;
          const today = new Date().toISOString().split('T')[0];
          const history = habit.completionHistory || [];
          const existingEntryIndex = history.findIndex(entry => entry.date === today);
          let newHistory;
          if (existingEntryIndex >= 0) {
            newHistory = [...history];
            newHistory[existingEntryIndex] = { date: today, completed: newCompleted };
          } else {
            newHistory = [...history, { date: today, completed: newCompleted }];
          }
          return { ...habit, completed: newCompleted, completionHistory: newHistory };
        }
        return habit;
      }));
    }
  };

  const addHabit = async (habit: Omit<Habit, 'id'>) => {
    if (isAuthenticated) {
      try {
        const newHabit = await habitsAPI.create({
          name: habit.name,
          target: habit.target,
          time: habit.time,
          color: habit.color,
          icon: habit.icon,
          streak: habit.streak || 0,
          completed: habit.completed || false,
          completionHistory: habit.completionHistory || []
        });
        setHabits([...habits, {
          id: newHabit.id,
          name: newHabit.name,
          target: newHabit.target,
          time: newHabit.time,
          streak: newHabit.streak,
          completed: newHabit.completed,
          color: newHabit.color,
          icon: newHabit.icon,
          completionHistory: (newHabit.completionHistory as Array<{ date: string; completed: boolean }>) || []
        }]);
      } catch (error) {
        console.error('Error adding habit:', error);
        // Fallback to local state
        const localHabit = { ...habit, id: Date.now().toString(), completionHistory: [] };
        setHabits([...habits, localHabit]);
      }
    } else {
      // Not authenticated - use local state only
      const localHabit = { ...habit, id: Date.now().toString(), completionHistory: [] };
      setHabits([...habits, localHabit]);
    }
  };

  const updateHabit = async (id: string, updates: Partial<Omit<Habit, 'id' | 'streak' | 'completed' | 'completionHistory'>>) => {
    if (isAuthenticated) {
      try {
        const updatedHabit = await habitsAPI.update(id, updates);
        setHabits(habits.map(habit => 
          habit.id === id ? {
            id: updatedHabit.id,
            name: updatedHabit.name,
            target: updatedHabit.target,
            time: updatedHabit.time,
            streak: updatedHabit.streak,
            completed: updatedHabit.completed,
            color: updatedHabit.color,
            icon: updatedHabit.icon,
            completionHistory: (updatedHabit.completionHistory as Array<{ date: string; completed: boolean }>) || []
          } : habit
        ));
      } catch (error) {
        console.error('Error updating habit:', error);
        // Fallback to local state
        setHabits(habits.map(habit => 
          habit.id === id ? { ...habit, ...updates } : habit
        ));
      }
    } else {
      // Not authenticated - use local state only
      setHabits(habits.map(habit => 
        habit.id === id ? { ...habit, ...updates } : habit
      ));
    }
  };

  const deleteHabit = async (id: string) => {
    if (isAuthenticated) {
      try {
        await habitsAPI.delete(id);
        setHabits(habits.filter(habit => habit.id !== id));
      } catch (error) {
        console.error('Error deleting habit:', error);
        // Fallback to local state
        setHabits(habits.filter(habit => habit.id !== id));
      }
    } else {
      // Not authenticated - use local state only
      setHabits(habits.filter(habit => habit.id !== id));
    }
  };

  // Journal operations
  const addJournalEntry = async (entry: Omit<JournalEntry, 'id'>) => {
    if (isAuthenticated) {
      try {
        const newEntry = await journalAPI.create({
          title: entry.title,
          content: entry.content,
          mood: entry.mood,
          tags: entry.tags,
          date: entry.date ? new Date(entry.date) : new Date()
        });
        setJournalEntries([{
          id: newEntry.id,
          date: newEntry.date ? new Date(newEntry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          mood: (newEntry.mood || 'good') as 'great' | 'good' | 'okay' | 'bad',
          title: newEntry.title,
          content: newEntry.content,
          tags: newEntry.tags || []
        }, ...journalEntries]);
      } catch (error) {
        console.error('Error adding journal entry:', error);
        // Fallback to local state
        const localEntry = { ...entry, id: Date.now().toString() };
        setJournalEntries([localEntry, ...journalEntries]);
      }
    } else {
      // Not authenticated - use local state only
      const localEntry = { ...entry, id: Date.now().toString() };
      setJournalEntries([localEntry, ...journalEntries]);
    }
  };

  const updateJournalEntry = async (id: string, updates: Partial<JournalEntry>) => {
    if (isAuthenticated) {
      try {
        const updatedEntry = await journalAPI.update(id, {
          ...updates,
          date: updates.date ? new Date(updates.date) : undefined
        });
        setJournalEntries(journalEntries.map(entry => 
          entry.id === id ? {
            id: updatedEntry.id,
            date: updatedEntry.date ? new Date(updatedEntry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            mood: (updatedEntry.mood || 'good') as 'great' | 'good' | 'okay' | 'bad',
            title: updatedEntry.title,
            content: updatedEntry.content,
            tags: updatedEntry.tags || []
          } : entry
        ));
      } catch (error) {
        console.error('Error updating journal entry:', error);
        // Fallback to local state
        setJournalEntries(journalEntries.map(entry => entry.id === id ? { ...entry, ...updates } : entry));
      }
    } else {
      // Not authenticated - use local state only
      setJournalEntries(journalEntries.map(entry => entry.id === id ? { ...entry, ...updates } : entry));
    }
  };

  const deleteJournalEntry = async (id: string) => {
    if (isAuthenticated) {
      try {
        await journalAPI.delete(id);
        setJournalEntries(journalEntries.filter(entry => entry.id !== id));
      } catch (error) {
        console.error('Error deleting journal entry:', error);
        // Fallback to local state
        setJournalEntries(journalEntries.filter(entry => entry.id !== id));
      }
    } else {
      // Not authenticated - use local state only
      setJournalEntries(journalEntries.filter(entry => entry.id !== id));
    }
  };

  // Budget operations
  const updateBudget = (budget: number) => {
    setMonthlyBudget(budget);
  };

  const updateSavings = (savings: number, goal: number) => {
    setCurrentSavings(savings);
    setSavingsGoal(goal);
  };

  return (
    <AppContext.Provider
      value={{
        subjects,
        skills,
        expenses,
        habits,
        journalEntries,
        monthlyBudget,
        savingsGoal,
        currentSavings,
        addSubject,
        updateSubject,
        deleteSubject,
        addSkill,
        updateSkill,
        deleteSkill,
        addExpense,
        updateExpense,
        deleteExpense,
        toggleHabit,
        addHabit,
        updateHabit,
        deleteHabit,
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        setJournalEntries,
        updateBudget,
        updateSavings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
