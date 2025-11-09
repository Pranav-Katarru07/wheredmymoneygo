import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useExpenses } from '@/hooks/useExpenses';
import { useBudget } from '@/hooks/useBudget';
import { CategoryBudgets } from '@/hooks/useBudget';
import { ExpenseForm } from '@/components/ExpenseForm';
import { SummaryCards } from '@/components/SummaryCards';
import { SpendingCharts } from '@/components/SpendingCharts';
import { SpendingTrends } from '@/components/SpendingTrends';
import { InsightsPanel } from '@/components/InsightsPanel';
import { BudgetTracker } from '@/components/BudgetTracker';
import { ExpenseList } from '@/components/ExpenseList';
import { MotivationBanner } from '@/components/MotivationBanner';
import { NotificationSettings } from '@/components/NotificationSettings';
import { SavingsGoals } from '@/components/SavingsGoals';
import { toast } from '@/hooks/use-toast';
import { Wallet, LogOut, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState as useNotificationDialog } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const Index = () => {
  const navigate = useNavigate();
  const { expenses, addExpense, deleteExpense, updateExpense } = useExpenses();
  const { monthlyBudget, categoryBudgets, updateBudget, updateCategoryBudgets } = useBudget();
  const [showInsight, setShowInsight] = useState(false);

  useEffect(() => {
    checkBudgetAlerts();
  }, [expenses, categoryBudgets]);

  const checkBudgetAlerts = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthExpenses = expenses.filter((exp) => new Date(exp.date) >= startOfMonth);
    
    const categoryTotals = monthExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(categoryTotals).forEach(([category, spent]) => {
      const budget = categoryBudgets[category as keyof CategoryBudgets];
      if (budget > 0) {
        const percent = (spent / budget) * 100;
        if (percent >= 100 && percent < 105) {
          toast({
            title: `⚠️ ${category} Budget Exceeded!`,
            description: `You've spent $${spent.toFixed(2)} of $${budget.toFixed(2)}`,
            variant: "destructive"
          });
        } else if (percent >= 80 && percent < 85) {
          toast({
            title: `⚡ ${category} Budget Alert`,
            description: `You've used ${percent.toFixed(0)}% of your ${category} budget`,
          });
        }
      }
    });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAddExpense = async (expenseData: Parameters<typeof addExpense>[0]) => {
    const result = await addExpense(expenseData);
    if (result) {
      setShowInsight(true);
      toast({
        title: "Expense added! 💰",
        description: `Logged $${expenseData.amount} for ${expenseData.category}`,
      });
      
      setTimeout(() => setShowInsight(false), 5000);
    }
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-calm">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-mint">
                <Wallet className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Where'd My Money Go?</h1>
                <p className="text-sm text-muted-foreground">Track mindfully, spend wisely 🌱</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Bell className="w-4 h-4 mr-2" />
                    Notifications
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Notification Settings</DialogTitle>
                  </DialogHeader>
                  <NotificationSettings />
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
        {/* Motivation Banner */}
        <MotivationBanner />

        {/* Summary Cards */}
        <SummaryCards expenses={expenses} />

        {/* Insight - shown after adding expense */}
        {showInsight && expenses.length > 0 && (
          <div className="animate-in slide-in-from-top duration-300">
            <InsightsPanel expenses={expenses} />
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form and Budget */}
          <div className="lg:col-span-1 space-y-6">
            <ExpenseForm onSubmit={handleAddExpense} />
            <BudgetTracker 
              expenses={expenses} 
              monthlyBudget={monthlyBudget}
              categoryBudgets={categoryBudgets}
              onBudgetUpdate={updateBudget}
              onCategoryBudgetsUpdate={updateCategoryBudgets}
            />
          </div>

          {/* Right Column - Charts and List */}
          <div className="lg:col-span-2 space-y-6">
            <SavingsGoals />
            {!showInsight && expenses.length > 0 && (
              <InsightsPanel expenses={expenses} />
            )}
            <SpendingTrends expenses={expenses} />
            <SpendingCharts expenses={expenses} />
            <ExpenseList 
              expenses={expenses} 
              onDelete={deleteExpense}
              onUpdate={updateExpense}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card/50 border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Made with 💚 for mindful spending</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
