import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Expense } from '@/hooks/useExpenses';
import { CategoryBudgets } from '@/hooks/useBudget';
import { useState, useEffect } from 'react';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface BudgetTrackerProps {
  expenses: Expense[];
  monthlyBudget: number;
  categoryBudgets: CategoryBudgets;
  onBudgetUpdate: (newBudget: number) => void;
  onCategoryBudgetsUpdate: (newCategoryBudgets: CategoryBudgets) => void;
}

export const BudgetTracker = ({ 
  expenses, 
  monthlyBudget, 
  categoryBudgets,
  onBudgetUpdate,
  onCategoryBudgetsUpdate 
}: BudgetTrackerProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString());
  const [categoryInputs, setCategoryInputs] = useState<CategoryBudgets>(categoryBudgets);

  // Update inputs when props change
  useEffect(() => {
    setBudgetInput(monthlyBudget.toString());
    setCategoryInputs(categoryBudgets);
  }, [monthlyBudget, categoryBudgets]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthTotal = expenses
    .filter((exp) => new Date(exp.date) >= startOfMonth)
    .reduce((sum, exp) => sum + exp.amount, 0);

  const categoryTotals = expenses
    .filter((exp) => new Date(exp.date) >= startOfMonth)
    .reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

  const remaining = monthlyBudget - monthTotal;
  const percentUsed = (monthTotal / monthlyBudget) * 100;

  const handleSave = () => {
    const newBudget = Number(budgetInput);
    if (!isNaN(newBudget) && newBudget > 0) {
      onBudgetUpdate(newBudget);
      setIsEditing(false);
    }
  };

  const handleSaveCategoryBudgets = () => {
    onCategoryBudgetsUpdate(categoryInputs);
    setShowCategories(false);
  };

  const allCategories: (keyof CategoryBudgets)[] = ['Food', 'Groceries', 'Travel', 'Transportation', 'Shopping', 'Entertainment', 'Healthcare', 'Utilities', 'Education', 'Rent', 'Other'];
  
  const categoryEmojis = {
    Food: '🍔',
    Groceries: '🛒',
    Travel: '✈️',
    Transportation: '🚗',
    Shopping: '🛍️',
    Entertainment: '🎬',
    Healthcare: '⚕️',
    Utilities: '💡',
    Education: '📚',
    Rent: '🏠',
    Other: '📦',
  };

  const COLORS = {
    Food: 'hsl(160 65% 45%)',
    Groceries: 'hsl(120 55% 50%)',
    Travel: 'hsl(200 70% 60%)',
    Transportation: 'hsl(220 60% 55%)',
    Shopping: 'hsl(280 65% 60%)',
    Entertainment: 'hsl(300 70% 65%)',
    Healthcare: 'hsl(340 60% 55%)',
    Utilities: 'hsl(180 50% 50%)',
    Education: 'hsl(260 60% 60%)',
    Rent: 'hsl(40 95% 55%)',
    Other: 'hsl(0 0% 60%)',
  };

  // Prepare data for donut chart
  const budgetChartData = allCategories
    .map(cat => ({
      name: cat,
      value: categoryInputs[cat] || 0
    }))
    .filter(item => item.value > 0);

  const totalCategoryBudget = budgetChartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-foreground">Monthly Budget 🎯</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2">Monthly Budget</Label>
            <Input
              type="number"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="Enter budget"
            />
          </div>
          
          <div className="border-t border-border pt-4">
            <Label className="text-sm font-medium mb-3 block">Category Budgets</Label>
            
            {/* Donut Chart */}
            {budgetChartData.length > 0 && (
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={budgetChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => 
                        percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                      }
                    >
                      {budgetChartData.map((entry) => (
                        <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `$${value.toFixed(2)}`}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-xs text-center text-muted-foreground">
                  Total Category Budget: ${totalCategoryBudget.toFixed(2)}
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {allCategories.map((cat) => (
                <div key={cat} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {categoryEmojis[cat]} {cat}
                  </Label>
                  <Input
                    type="number"
                    value={categoryInputs[cat] || 0}
                    onChange={(e) => setCategoryInputs({
                      ...categoryInputs,
                      [cat]: Number(e.target.value)
                    })}
                    className="h-8"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={() => {
              handleSave();
              handleSaveCategoryBudgets();
            }} size="sm" className="flex-1">Save All</Button>
            <Button 
              onClick={() => {
                setIsEditing(false);
                setBudgetInput(monthlyBudget.toString());
                setCategoryInputs(categoryBudgets);
              }} 
              size="sm" 
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Budget</span>
              <span className="text-2xl font-bold text-foreground">${monthlyBudget.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Spent</span>
              <span className="text-xl font-semibold text-foreground">${monthTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className={`text-xl font-semibold ${remaining < 0 ? 'text-destructive' : 'text-success'}`}>
                ${Math.abs(remaining).toFixed(2)}
              </span>
            </div>

            <Progress 
              value={Math.min(percentUsed, 100)} 
              className={`h-3 ${
                percentUsed >= 100 
                  ? '[&>div]:bg-destructive' 
                  : percentUsed >= 80 
                  ? '[&>div]:bg-orange-500' 
                  : ''
              }`}
            />

            {percentUsed > 90 && (
              <div className={`text-sm p-3 rounded-lg ${
                percentUsed >= 100 
                  ? 'bg-destructive/10 text-destructive' 
                  : 'bg-warning/10 text-warning-foreground'
              }`}>
                {percentUsed >= 100 
                  ? '⚠️ Budget exceeded! Time to review spending.'
                  : '⚡ Close to budget limit! Be mindful.'}
              </div>
            )}

            {percentUsed <= 50 && monthTotal > 0 && (
              <div className="text-sm p-3 rounded-lg bg-success/10 text-success">
                ✨ Great job! You're staying within budget.
              </div>
            )}

            {/* Category Budgets Section */}
            <div className="border-t border-border pt-4 mt-4">
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
                onClick={() => setShowCategories(!showCategories)}
              >
                <span className="text-sm font-medium">Category Budgets</span>
                {showCategories ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>

              {showCategories && (
                <div className="mt-4 space-y-3">
                  {allCategories.map((cat) => {
                    const spent = categoryTotals[cat] || 0;
                    const budget = categoryBudgets[cat] || 0;
                    const percent = budget > 0 ? (spent / budget) * 100 : 0;

                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {categoryEmojis[cat]} {cat}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ${spent.toFixed(0)} / ${budget > 0 ? budget.toFixed(0) : '0'}
                          </span>
                        </div>
                         {budget > 0 && (
                          <Progress 
                            value={Math.min(percent, 100)} 
                            className={`h-1.5 ${
                              percent >= 100 
                                ? '[&>div]:bg-destructive' 
                                : percent >= 80 
                                ? '[&>div]:bg-orange-500' 
                                : ''
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
};
