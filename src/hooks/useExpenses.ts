import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Expense {
  id: string;
  amount: number;
  category: 'Food' | 'Travel' | 'Shopping' | 'Rent' | 'Entertainment' | 'Healthcare' | 'Utilities' | 'Transportation' | 'Education' | 'Groceries' | 'Other';
  mood: 'Happy' | 'Stressed' | 'Bored' | 'Neutral';
  note: string;
  date: string;
  timestamp: number;
  receipt_url?: string;
}

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false });

    if (!error && data) {
      setExpenses(data.map(exp => ({
        id: exp.id,
        amount: Number(exp.amount),
        category: exp.category as any,
        mood: exp.mood as any,
        note: exp.note || '',
        date: exp.date,
        timestamp: exp.timestamp,
        receipt_url: exp.receipt_url || undefined
      })));
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'timestamp'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const timestamp = Date.now();
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        amount: expense.amount,
        category: expense.category,
        mood: expense.mood,
        note: expense.note,
        date: expense.date,
        timestamp,
        receipt_url: expense.receipt_url || null
      })
      .select()
      .single();

    if (!error && data) {
      const newExpense: Expense = {
        id: data.id,
        amount: Number(data.amount),
        category: data.category as any,
        mood: data.mood as any,
        note: data.note || '',
        date: data.date,
        timestamp: data.timestamp,
        receipt_url: data.receipt_url || undefined
      };
      setExpenses([newExpense, ...expenses]);
      return newExpense;
    }
    return null;
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    const { error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setExpenses(expenses.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp)));
    }
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (!error) {
      setExpenses(expenses.filter((exp) => exp.id !== id));
    }
  };

  return {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
  };
};
