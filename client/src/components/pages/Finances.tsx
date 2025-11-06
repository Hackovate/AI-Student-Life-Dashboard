import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet, ShoppingBag, Home, Utensils, GraduationCap, Heart, Trash2, Briefcase } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { financeAPI, savingsGoalAPI, monthlyBudgetAPI } from '../../lib/api';
import { toast } from 'sonner';

interface FinanceTransaction {
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

export function Finances() {
  const [expenses, setExpenses] = useState<FinanceTransaction[]>([]);
  const [monthlySummary, setMonthlySummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    netSavings: 0
  });
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [monthlyBudgets, setMonthlyBudgets] = useState<any[]>([]);
  const [monthlyBudgetProgress, setMonthlyBudgetProgress] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSavingsGoalDialogOpen, setIsSavingsGoalDialogOpen] = useState(false);
  const [isMonthlyBudgetDialogOpen, setIsMonthlyBudgetDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    category: 'Food',
    amount: '',
    type: 'expense' as 'expense' | 'income',
    paymentMethod: '',
    recurring: false,
    frequency: '',
  });
  const [newSavingsGoal, setNewSavingsGoal] = useState({
    title: '',
    targetAmount: '',
    category: '',
    dueDate: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });
  const [newMonthlyBudget, setNewMonthlyBudget] = useState({
    title: '',
    targetAmount: '',
    category: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  // Load data on component mount
  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      const [transactions, summary, breakdown, goals, budgets, budgetProg] = await Promise.all([
        financeAPI.getAll(),
        financeAPI.getMonthlySummary(),
        financeAPI.getCategoryBreakdown('expense'),
        savingsGoalAPI.getAll(),
        monthlyBudgetAPI.getAll(),
        monthlyBudgetAPI.getProgress()
      ]);
      
      setExpenses(transactions);
      setMonthlySummary(summary);
      setCategoryBreakdown(breakdown);
      setSavingsGoals(goals);
      setMonthlyBudgets(budgets);
      setMonthlyBudgetProgress(budgetProg);
    } catch (error) {
      console.error('Error loading finance data:', error);
      toast.error('Failed to load finance data');
    }
  };

  const expenseCategories = [
    { name: 'Food', icon: Utensils, color: 'from-orange-500 to-red-500' },
    { name: 'Education', icon: GraduationCap, color: 'from-blue-500 to-cyan-500' },
    { name: 'Shopping', icon: ShoppingBag, color: 'from-violet-500 to-purple-500' },
    { name: 'Housing', icon: Home, color: 'from-green-500 to-emerald-500' },
    { name: 'Health', icon: Heart, color: 'from-pink-500 to-rose-500' },
    { name: 'Other', icon: Wallet, color: 'from-gray-500 to-slate-500' },
  ];

  const incomeCategories = [
    { name: 'Salary', icon: Wallet, color: 'from-green-500 to-emerald-500' },
    { name: 'Freelance', icon: Briefcase, color: 'from-blue-500 to-cyan-500' },
    { name: 'Scholarship', icon: GraduationCap, color: 'from-violet-500 to-purple-500' },
    { name: 'Investment', icon: TrendingUp, color: 'from-indigo-500 to-blue-500' },
    { name: 'Gift', icon: Heart, color: 'from-pink-500 to-rose-500' },
    { name: 'Other', icon: Wallet, color: 'from-gray-500 to-slate-500' },
  ];

  const allCategories = [...expenseCategories, ...incomeCategories];
  const currentCategories = newExpense.type === 'income' ? incomeCategories : expenseCategories;

  // Calculate dynamic values based on actual transactions
  const totalExpenses = monthlySummary.totalExpenses;
  const totalIncome = monthlySummary.totalIncome;

  // Available balance = Total Income - Total Expenses
  const actualBalance = monthlySummary.balance;

  // Net savings (actual money saved)
  const netSavings = monthlySummary.netSavings;

  // Calculate monthly budget from user-set budgets
  const monthlyBudget = monthlyBudgets
    .filter((budget: any) => budget.status === 'active')
    .reduce((sum: number, budget: any) => sum + budget.targetAmount, 0);

  // Use the first active savings goal or sum of all active goals
  const activeSavingsGoals = savingsGoals.filter((goal: any) => goal.status === 'active');
  const savingsGoal = activeSavingsGoals.length > 0 
    ? activeSavingsGoals.reduce((sum: number, goal: any) => sum + goal.targetAmount, 0)
    : 0;

  // Current savings from goals
  const currentSavings = activeSavingsGoals.length > 0
    ? activeSavingsGoals.reduce((sum: number, goal: any) => sum + (goal.currentAmount || 0), 0)
    : netSavings;

  // Savings progress
  const savingsProgress = savingsGoal > 0 ? (currentSavings / savingsGoal) * 100 : 0;

  // Budget progress (spending vs budget)
  const budgetProgress = monthlyBudget > 0 ? (totalExpenses / monthlyBudget) * 100 : 0;

  // Calculate category breakdown from API data
  const categoryBreakdownData = expenseCategories.map(cat => {
    const total = categoryBreakdown[cat.name] || 0;
    return {
      category: cat.name,
      amount: total,
      percentage: totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0,
      icon: cat.icon,
      color: cat.color,
    };
  }).filter(c => c.amount > 0);

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await financeAPI.create({
        category: newExpense.category,
        amount: parseFloat(newExpense.amount),
        description: newExpense.description,
        type: newExpense.type,
        paymentMethod: newExpense.paymentMethod || undefined,
        recurring: newExpense.recurring,
        frequency: newExpense.frequency || undefined,
      });

      setNewExpense({ 
        description: '', 
        category: 'Food', 
        amount: '', 
        type: 'expense',
        paymentMethod: '',
        recurring: false,
        frequency: '',
      });
      setIsAddDialogOpen(false);
      toast.success(`${newExpense.type === 'income' ? 'Income' : 'Expense'} added successfully!`);
      
      // Reload data to reflect changes
      await loadFinanceData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await financeAPI.delete(id);
      toast.success('Transaction deleted!');
      
      // Reload data to reflect changes
      await loadFinanceData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const handleAddSavingsGoal = async () => {
    if (!newSavingsGoal.title || !newSavingsGoal.targetAmount) {
      toast.error('Please fill in title and target amount');
      return;
    }

    try {
      await savingsGoalAPI.create({
        title: newSavingsGoal.title,
        targetAmount: parseFloat(newSavingsGoal.targetAmount),
        category: newSavingsGoal.category || undefined,
        dueDate: newSavingsGoal.dueDate || undefined,
        description: newSavingsGoal.description || undefined,
        priority: newSavingsGoal.priority,
      });

      setNewSavingsGoal({
        title: '',
        targetAmount: '',
        category: '',
        dueDate: '',
        description: '',
        priority: 'medium',
      });
      setIsSavingsGoalDialogOpen(false);
      toast.success('Savings goal added successfully!');
      
      // Reload data to reflect changes
      await loadFinanceData();
    } catch (error) {
      console.error('Error adding savings goal:', error);
      toast.error('Failed to add savings goal');
    }
  };

  const handleAddMonthlyBudget = async () => {
    if (!newMonthlyBudget.title || !newMonthlyBudget.targetAmount) {
      toast.error('Please fill in title and target amount');
      return;
    }

    try {
      await monthlyBudgetAPI.create({
        title: newMonthlyBudget.title,
        targetAmount: parseFloat(newMonthlyBudget.targetAmount),
        category: newMonthlyBudget.category || undefined,
        description: newMonthlyBudget.description || undefined,
        priority: newMonthlyBudget.priority,
      });

      setNewMonthlyBudget({
        title: '',
        targetAmount: '',
        category: '',
        description: '',
        priority: 'medium',
      });
      setIsMonthlyBudgetDialogOpen(false);
      toast.success('Monthly budget added successfully!');
      
      // Reload data to reflect changes
      await loadFinanceData();
    } catch (error) {
      console.error('Error adding monthly budget:', error);
      toast.error('Failed to add monthly budget');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-3xl mb-1">Expense & Savings Tracker</h1>
          <p className="text-muted-foreground">Manage your finances and reach your savings goals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setIsSavingsGoalDialogOpen(true)}>
            <TrendingUp className="w-4 h-4" />
            Add Savings Goal
          </Button>
          
          <Button variant="outline" className="gap-2" onClick={() => setIsMonthlyBudgetDialogOpen(true)}>
            <Wallet className="w-4 h-4" />
            Add Monthly Budget
          </Button>
          
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
          </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select 
                  value={newExpense.type} 
                  onValueChange={(value: 'expense' | 'income') => {
                    // Reset category to first option when type changes
                    const newCategory = value === 'income' ? 'Salary' : 'Food';
                    setNewExpense({ ...newExpense, type: value, category: newCategory });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g., Groceries, Salary"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={newExpense.category} onValueChange={(value: string) => setNewExpense({ ...newExpense, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentCategories.map(cat => (
                      <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount (BDT)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="paymentMethod">Payment Method (Optional)</Label>
                <Select value={newExpense.paymentMethod} onValueChange={(value: string) => setNewExpense({ ...newExpense, paymentMethod: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={newExpense.recurring}
                  onCheckedChange={(checked: boolean) => setNewExpense({ ...newExpense, recurring: checked })}
                />
                <Label htmlFor="recurring">Recurring Transaction</Label>
              </div>
              {newExpense.recurring && (
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={newExpense.frequency} onValueChange={(value: string) => setNewExpense({ ...newExpense, frequency: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddExpense}>Add Transaction</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Savings Goal Dialog */}
      <Dialog open={isSavingsGoalDialogOpen} onOpenChange={setIsSavingsGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Savings Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="goal-title">Title</Label>
              <Input
                id="goal-title"
                value={newSavingsGoal.title}
                onChange={(e) => setNewSavingsGoal({ ...newSavingsGoal, title: e.target.value })}
                placeholder="e.g., Emergency Fund"
              />
            </div>
            <div>
              <Label htmlFor="goal-amount">Target Amount (BDT)</Label>
              <Input
                id="goal-amount"
                type="number"
                value={newSavingsGoal.targetAmount}
                onChange={(e) => setNewSavingsGoal({ ...newSavingsGoal, targetAmount: e.target.value })}
                placeholder="50000"
              />
            </div>
            <div>
              <Label htmlFor="goal-category">Category (Optional)</Label>
              <Input
                id="goal-category"
                value={newSavingsGoal.category}
                onChange={(e) => setNewSavingsGoal({ ...newSavingsGoal, category: e.target.value })}
                placeholder="e.g., Emergency"
              />
            </div>
            <div>
              <Label htmlFor="goal-duedate">Due Date (Optional)</Label>
              <Input
                id="goal-duedate"
                type="date"
                value={newSavingsGoal.dueDate}
                onChange={(e) => setNewSavingsGoal({ ...newSavingsGoal, dueDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="goal-description">Description (Optional)</Label>
              <Input
                id="goal-description"
                value={newSavingsGoal.description}
                onChange={(e) => setNewSavingsGoal({ ...newSavingsGoal, description: e.target.value })}
                placeholder="Additional details..."
              />
            </div>
            <div>
              <Label htmlFor="goal-priority">Priority</Label>
              <Select 
                value={newSavingsGoal.priority} 
                onValueChange={(value: 'low' | 'medium' | 'high') => setNewSavingsGoal({ ...newSavingsGoal, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSavingsGoalDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSavingsGoal}>Add Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Monthly Budget Dialog */}
      <Dialog open={isMonthlyBudgetDialogOpen} onOpenChange={setIsMonthlyBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Monthly Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="budget-title">Title</Label>
              <Input
                id="budget-title"
                value={newMonthlyBudget.title}
                onChange={(e) => setNewMonthlyBudget({ ...newMonthlyBudget, title: e.target.value })}
                placeholder="e.g., Food Budget"
              />
            </div>
            <div>
              <Label htmlFor="budget-amount">Target Amount (BDT)</Label>
              <Input
                id="budget-amount"
                type="number"
                value={newMonthlyBudget.targetAmount}
                onChange={(e) => setNewMonthlyBudget({ ...newMonthlyBudget, targetAmount: e.target.value })}
                placeholder="10000"
              />
            </div>
            <div>
              <Label htmlFor="budget-category">Category (Optional)</Label>
              <Input
                id="budget-category"
                value={newMonthlyBudget.category}
                onChange={(e) => setNewMonthlyBudget({ ...newMonthlyBudget, category: e.target.value })}
                placeholder="e.g., Food"
              />
            </div>
            <div>
              <Label htmlFor="budget-description">Description (Optional)</Label>
              <Input
                id="budget-description"
                value={newMonthlyBudget.description}
                onChange={(e) => setNewMonthlyBudget({ ...newMonthlyBudget, description: e.target.value })}
                placeholder="Additional details..."
              />
            </div>
            <div>
              <Label htmlFor="budget-priority">Priority</Label>
              <Select 
                value={newMonthlyBudget.priority} 
                onValueChange={(value: 'low' | 'medium' | 'high') => setNewMonthlyBudget({ ...newMonthlyBudget, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMonthlyBudgetDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMonthlyBudget}>Add Budget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-muted-foreground text-sm mb-0.5">Total Income</p>
              <p className="text-foreground text-3xl">{totalIncome.toFixed(0)} BDT</p>
              <p className="text-green-600 dark:text-green-400 text-sm mt-0.5">This month</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-muted-foreground text-sm mb-0.5">Total Expenses</p>
              <p className="text-foreground text-3xl">{totalExpenses.toFixed(0)} BDT</p>
              <p className="text-muted-foreground text-sm mt-0.5">of {monthlyBudget} BDT budget</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <Progress value={budgetProgress} className="h-2" />
            <p className={`text-sm mt-1 ${budgetProgress > 80 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {budgetProgress > 100 ? 'Over budget!' : `${Math.round(budgetProgress)}% used`}
            </p>
          </div>
        </Card>

        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-0.5">Available Balance</p>
              <p className="text-foreground text-3xl">{actualBalance.toFixed(0)} BDT</p>
              <div className={`flex items-center gap-1 text-sm mt-0.5 ${
                actualBalance >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {actualBalance >= 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3" />
                    <span>Remaining</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3" />
                    <span>Deficit</span>
                  </>
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary text-sm mb-0.5">Savings Goal</p>
              <p className="text-foreground text-3xl">{currentSavings} BDT</p>
              <p className="text-muted-foreground text-sm mt-0.5">of BDT {savingsGoal} goal</p>
            </div>
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 transform -rotate-90">
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="none" className="text-primary/20" />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - savingsProgress / 100)}`}
                  className="text-primary"
                />
              </svg>
            </div>
          </div>
          <Progress value={savingsProgress} className="h-2 mt-3" />
          <p className="text-primary text-sm mt-1">{Math.round(savingsProgress)}% complete</p>
        </Card>
      </div>

      {/* Category Breakdown & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Spending by Category */}
        <Card className="p-4 border-border bg-card">
          <h2 className="text-foreground mb-3">Monthly Spending by Category</h2>
          <div className="space-y-3">
            {categoryBreakdownData.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No expenses this month</p>
            ) : (
              categoryBreakdownData.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-foreground">{item.category}</span>
                      </div>
                      <span className="text-foreground">${item.amount} ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground">Recent Transactions</h2>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {expenses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No transactions yet</p>
            ) : (
              expenses.slice(0, 10).map((transaction) => {
                const category = allCategories.find(c => c.name === transaction.category);
                const Icon = category?.icon || Wallet;
                const color = category?.color || 'from-gray-500 to-slate-500';
                
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-2.5 bg-muted rounded-lg hover:bg-accent transition-colors group">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-foreground">{transaction.description}</p>
                        <p className="text-muted-foreground text-sm">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`${
                        transaction.type === 'income' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-foreground'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={() => handleDeleteExpense(transaction.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Financial Tips */}
      <Card className="p-4 border-border bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="text-3xl">💡</div>
          <div className="flex-1">
            <h3 className="text-foreground mb-1.5">Smart Financial Insight</h3>
            <p className="text-foreground/80 mb-2 text-sm">
              {(() => {
                if (actualBalance < 0) {
                  return "⚠️ Your expenses exceed your income. Consider reducing spending or finding additional income sources.";
                } else if (budgetProgress > 80) {
                  return "You're close to your budget limit. Review your spending categories to identify areas where you can cut back.";
                } else if (netSavings > savingsGoal * 0.5) {
                  return `🎉 Excellent progress! You're ${Math.round(savingsProgress)}% toward your savings goal. Keep up the great work!`;
                } else if (totalIncome > 0 && totalExpenses === 0) {
                  return "Great start! Now track your expenses to understand where your money goes.";
                } else if (totalIncome === 0 && totalExpenses > 0) {
                  return "Add your income sources to get a complete picture of your finances.";
                } else {
                  return "Great job managing your finances! Keep tracking both income and expenses to maintain this healthy financial habit.";
                }
              })()}
            </p>
            <Button variant="link" className="p-0 h-auto text-primary">Learn more →</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
