import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, expenses, budget } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch recent chat history (last 10 messages)
    const { data: chatHistory } = await supabase
      .from('chat_history')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Reverse to get chronological order
    const previousMessages = (chatHistory || []).reverse();

    // Calculate stats
    const total = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
    const categoryTotals = expenses.reduce((acc: any, exp: any) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    // Build context with budget info if available
    let budgetContext = '';
    if (budget) {
      budgetContext = `\nMonthly Budget: $${budget.monthlyBudget || 0}
Category Budgets: ${JSON.stringify(budget.categoryBudgets || {})}
Current Month Total: $${total.toFixed(2)}
Budget Remaining: $${((budget.monthlyBudget || 0) - total).toFixed(2)}`;
    }

    const systemPrompt = `You are a personal finance assistant with full context of the user's spending history and ongoing conversation. 
You remember previous questions and can refer back to earlier discussions.

Current Financial Overview:
- Total expenses: $${total.toFixed(2)}
- Category breakdown: ${JSON.stringify(categoryTotals)}
- Number of transactions: ${expenses.length}${budgetContext}

When answering:
- Reference previous conversation context when relevant
- Be conversational and remember what you discussed before
- Provide specific numbers and percentages
- Offer actionable, personalized advice based on their patterns
- Keep responses concise (2-3 sentences) unless detail is requested`;

    // Build messages array with history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...previousMessages,
      { role: 'user', content: question }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'rate_limit' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'credits_needed' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI request failed');
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;

    // Store the conversation in chat history
    try {
      await supabase.from('chat_history').insert([
        { user_id: user.id, role: 'user', content: question },
        { user_id: user.id, role: 'assistant', content: answer }
      ]);
    } catch (historyError) {
      console.error('Failed to store chat history:', historyError);
      // Don't fail the request if history storage fails
    }

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-expenses function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
