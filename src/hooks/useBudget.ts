import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryBudgets {
  Food: number;
  Groceries: number;
  Travel: number;
  Transportation: number;
  Shopping: number;
  Entertainment: number;
  Healthcare: number;
  Utilities: number;
  Education: number;
  Rent: number;
  Other: number;
}

export const useBudget = () => {
  const [monthlyBudget, setMonthlyBudget] = useState<number>(500);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgets>({
    Food: 0,
    Groceries: 0,
    Travel: 0,
    Transportation: 0,
    Shopping: 0,
    Entertainment: 0,
    Healthcare: 0,
    Utilities: 0,
    Education: 0,
    Rent: 0,
    Other: 0,
  });

  useEffect(() => {
    fetchBudget();
  }, []);

  const fetchBudget = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('budgets')
      .select('monthly_budget, category_budgets')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setMonthlyBudget(Number(data.monthly_budget));
      if (data.category_budgets && typeof data.category_budgets === 'object') {
        setCategoryBudgets(data.category_budgets as unknown as CategoryBudgets);
      }
    }
  };

  const updateBudget = async (newBudget: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('budgets')
      .upsert({
        user_id: user.id,
        monthly_budget: newBudget,
      }, {
        onConflict: 'user_id'
      });

    if (!error) {
      setMonthlyBudget(newBudget);
    }
  };

  const updateCategoryBudgets = async (newCategoryBudgets: CategoryBudgets) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // First fetch existing budget data
    const { data: existingData } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingData) {
      // Update existing record
      const { error } = await supabase
        .from('budgets')
        .update({
          category_budgets: newCategoryBudgets as any,
        })
        .eq('user_id', user.id);

      if (!error) {
        setCategoryBudgets(newCategoryBudgets);
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from('budgets')
        .insert({
          user_id: user.id,
          monthly_budget: monthlyBudget,
          category_budgets: newCategoryBudgets as any,
        });

      if (!error) {
        setCategoryBudgets(newCategoryBudgets);
      }
    }
  };

  return {
    monthlyBudget,
    categoryBudgets,
    updateBudget,
    updateCategoryBudgets,
  };
};
