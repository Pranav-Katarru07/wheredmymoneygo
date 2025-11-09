-- Drop the old category check constraint
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- Add new check constraint with all 11 categories
ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_check 
CHECK (category IN ('Food', 'Groceries', 'Travel', 'Transportation', 'Shopping', 'Entertainment', 'Healthcare', 'Utilities', 'Education', 'Rent', 'Other'));