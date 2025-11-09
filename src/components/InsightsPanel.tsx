import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Expense } from '@/hooks/useExpenses';
import { Lightbulb, Loader2, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface InsightsPanelProps {
  expenses: Expense[];
}

const EXAMPLE_QUESTIONS = [
  "What category do I spend the most on?",
  "How can I reduce my spending?",
  "What's my average daily spending?",
  "Which days do I spend the most?",
  "Am I over budget in any category?"
];

export const InsightsPanel = ({ expenses }: InsightsPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % EXAMPLE_QUESTIONS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (expenses.length > 0 && messages.length === 0) {
      generateInitialInsight();
    }
  }, [expenses.length]);

  const generateInitialInsight = async () => {
    setIsLoading(true);
    try {
      const recentExpenses = expenses.slice(0, 10);
      
      const { data, error } = await supabase.functions.invoke('analyze-expenses', {
        body: { expenses: recentExpenses }
      });

      if (error) {
        handleError(error);
      } else if (data?.insight) {
        setMessages([{ role: 'assistant', content: data.insight }]);
      }
    } catch (error) {
      console.error('Error generating insight:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (error: any) => {
    if (error.message.includes('429')) {
      toast({
        title: "Rate limit reached",
        description: "Please try again in a moment.",
        variant: "destructive"
      });
    } else if (error.message.includes('402')) {
      toast({
        title: "Credits needed",
        description: "Please add credits to continue using AI insights.",
        variant: "destructive"
      });
    }
  };

  const askQuestion = async () => {
    if (!question.trim() || isLoading) return;

    const userMessage = question.trim();
    setQuestion('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Get budget info for context
      const { data: { user } } = await supabase.auth.getUser();
      let budgetData = null;
      
      if (user) {
        const { data: budget } = await supabase
          .from('budgets')
          .select('monthly_budget, category_budgets')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (budget) {
          budgetData = {
            monthlyBudget: Number(budget.monthly_budget),
            categoryBudgets: budget.category_budgets
          };
        }
      }

      const { data, error } = await supabase.functions.invoke('chat-expenses', {
        body: { 
          question: userMessage,
          expenses: expenses.slice(0, 100),
          budget: budgetData
        }
      });

      if (error) {
        handleError(error);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Please try again.' 
        }]);
      } else if (data?.answer) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      }
    } catch (error) {
      console.error('Error asking question:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 shadow-soft bg-gradient-insight border-accent/30">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-accent/20">
          <Lightbulb className="w-5 h-5 text-accent-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-accent-foreground">💡 AI Assistant</h3>
      </div>

      <ScrollArea className="h-64 mb-4 pr-4">
        <div className="space-y-3">
          {messages.length === 0 && !isLoading && (
            <p className="text-accent-foreground/70 text-sm">
              Ask me anything about your spending! Try: "{EXAMPLE_QUESTIONS[0]}"
            </p>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-primary/10 ml-8'
                  : 'bg-accent/10 mr-8'
              }`}
            >
              <p className="text-sm text-accent-foreground">{msg.content}</p>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-accent/10 mr-8 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-accent-foreground" />
              <p className="text-sm text-accent-foreground">Thinking...</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && askQuestion()}
          placeholder={EXAMPLE_QUESTIONS[placeholderIndex]}
          className="bg-background/50"
          disabled={isLoading}
        />
        <Button
          onClick={askQuestion}
          disabled={isLoading || !question.trim()}
          size="icon"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};
