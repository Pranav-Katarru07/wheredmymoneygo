import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Expense } from './useExpenses';
import { CategoryBudgets } from './useBudget';

interface BudgetMonitorProps {
  expenses: Expense[];
  monthlyBudget: number;
  categoryBudgets: CategoryBudgets;
}

export const useBudgetMonitor = ({ expenses, monthlyBudget, categoryBudgets }: BudgetMonitorProps) => {
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkBudgetThresholds = async () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Filter expenses for current month
      const monthExpenses = expenses.filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      });

      const monthTotal = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      // Calculate category totals
      const categoryTotals: Record<string, number> = {};
      monthExpenses.forEach((expense) => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check overall budget (80% threshold)
      const overallPercentage = (monthTotal / monthlyBudget) * 100;
      if (overallPercentage >= 80 && overallPercentage < 100 && !notifiedRef.current.has('overall-80')) {
        await createNotification(
          user.id,
          '⚠️ Budget Alert',
          `You've used ${overallPercentage.toFixed(0)}% of your monthly budget ($${monthTotal.toFixed(2)} of $${monthlyBudget}).`,
          'warning'
        );
        notifiedRef.current.add('overall-80');
      }

      // Check if over budget
      if (overallPercentage >= 100 && !notifiedRef.current.has('overall-100')) {
        await createNotification(
          user.id,
          '🚨 Budget Exceeded',
          `You've exceeded your monthly budget! Spent $${monthTotal.toFixed(2)} of $${monthlyBudget}.`,
          'warning'
        );
        notifiedRef.current.add('overall-100');
      }

      // Check category budgets
      Object.entries(categoryBudgets).forEach(async ([category, budget]) => {
        if (budget > 0) {
          const spent = categoryTotals[category] || 0;
          const percentage = (spent / budget) * 100;

          // Category over budget
          if (percentage >= 100 && !notifiedRef.current.has(`${category}-100`)) {
            await createNotification(
              user.id,
              `💸 ${category} Budget Exceeded`,
              `You've spent $${spent.toFixed(2)} on ${category}, exceeding your $${budget} budget.`,
              'warning'
            );
            notifiedRef.current.add(`${category}-100`);
          }
        }
      });

      // Congratulate for good performance (under 70% with at least 2 weeks into month)
      const dayOfMonth = now.getDate();
      if (dayOfMonth >= 14 && overallPercentage < 70 && monthTotal > 0 && !notifiedRef.current.has('performing-well')) {
        await createNotification(
          user.id,
          '🎉 Great Job!',
          `You're doing amazing! You've only used ${overallPercentage.toFixed(0)}% of your budget halfway through the month.`,
          'success'
        );
        notifiedRef.current.add('performing-well');
      }

      // Provide saving tips when approaching budget
      if (overallPercentage >= 75 && overallPercentage < 80 && !notifiedRef.current.has('saving-tip')) {
        const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
        if (topCategory) {
          await createNotification(
            user.id,
            '💡 Saving Tip',
            `You're approaching your budget limit. Consider reducing ${topCategory[0]} spending ($${topCategory[1].toFixed(2)} this month).`,
            'info'
          );
          notifiedRef.current.add('saving-tip');
        }
      }
    };

    if (expenses.length > 0) {
      checkBudgetThresholds();
    }

    // Reset notifications at the start of each month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const timeUntilNextMonth = nextMonth.getTime() - now.getTime();
    
    const resetTimer = setTimeout(() => {
      notifiedRef.current.clear();
    }, timeUntilNextMonth);

    return () => clearTimeout(resetTimer);
  }, [expenses, monthlyBudget, categoryBudgets]);
};

const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'warning' | 'success'
) => {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};
