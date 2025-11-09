import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Filter, X, Search } from 'lucide-react';

export interface ExpenseFilterOptions {
  searchQuery?: string;
  category?: string;
  mood?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
}

interface ExpenseFiltersProps {
  onFilterChange: (filters: ExpenseFilterOptions) => void;
  onReset: () => void;
}

export const ExpenseFilters = ({ onFilterChange, onReset }: ExpenseFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ExpenseFilterOptions>({});

  const handleFilterChange = (key: keyof ExpenseFilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    setFilters({});
    onReset();
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    key !== 'searchQuery' && value !== undefined
  );

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by title, amount, or date..."
          value={filters.searchQuery || ''}
          onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Advanced Filters {hasActiveFilters && `(${Object.entries(filters).filter(([k, v]) => k !== 'searchQuery' && v).length})`}
        </Button>
        {(hasActiveFilters || filters.searchQuery) && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
            <X className="w-4 h-4" />
            Clear All
          </Button>
        )}
      </div>

      {showFilters && (
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Category</Label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(v) => handleFilterChange('category', v === 'all' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Groceries">Groceries</SelectItem>
                  <SelectItem value="Travel">Travel</SelectItem>
                  <SelectItem value="Transportation">Transportation</SelectItem>
                  <SelectItem value="Shopping">Shopping</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Rent">Rent</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Mood</Label>
              <Select
                value={filters.mood || 'all'}
                onValueChange={(v) => handleFilterChange('mood', v === 'all' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Moods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Moods</SelectItem>
                  <SelectItem value="Happy">Happy</SelectItem>
                  <SelectItem value="Stressed">Stressed</SelectItem>
                  <SelectItem value="Bored">Bored</SelectItem>
                  <SelectItem value="Neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Min Amount</Label>
              <Input
                type="number"
                placeholder="$0"
                value={filters.minAmount || ''}
                onChange={(e) => handleFilterChange('minAmount', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Max Amount</Label>
              <Input
                type="number"
                placeholder="Any"
                value={filters.maxAmount || ''}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Start Date</Label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">End Date</Label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};