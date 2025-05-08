

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or service role key not found');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Get current timestamp and calculate cutoff time
    const now = new Date();
    
    // Clean up waiting sessions older than 10 minutes (reduced from 1 hour)
    const waitingCutoff = new Date(now);
    waitingCutoff.setMinutes(now.getMinutes() - 10);
    const waitingCutoffString = waitingCutoff.toISOString();
    
    // Clean up completed and active sessions older than 12 hours (kept the same)
    const oldCutoff = new Date(now);
    oldCutoff.setHours(now.getHours() - 12);
    const oldCutoffString = oldCutoff.toISOString();

    // Delete waiting sessions
    const { data: waitingData, error: waitingError } = await supabase
      .from('game_sessions')
      .delete()
      .lt('created_at', waitingCutoffString)
      .eq('status', 'waiting')
      .select('id');

    if (waitingError) {
      throw waitingError;
    }

    // Delete old active or completed sessions
    const { data: oldData, error: oldError } = await supabase
      .from('game_sessions')
      .delete()
      .lt('created_at', oldCutoffString)
      .in('status', ['active', 'completed'])
      .select('id');

    if (oldError) {
      throw oldError;
    }
    
    // Find inactive game sessions (no updates in 2 hours)
    const inactiveCutoff = new Date(now);
    inactiveCutoff.setHours(now.getHours() - 2);
    const inactiveCutoffString = inactiveCutoff.toISOString();
    
    const { data: inactiveData, error: inactiveError } = await supabase
      .from('game_sessions')
      .delete()
      .lt('updated_at', inactiveCutoffString)
      .eq('status', 'active')
      .select('id');
      
    if (inactiveError) {
      throw inactiveError;
    }

    // Total deleted count
    const waitingCount = waitingData?.length || 0;
    const oldCount = oldData?.length || 0;
    const inactiveCount = inactiveData?.length || 0;
    const totalDeleted = waitingCount + oldCount + inactiveCount;

    console.log(`Cleanup complete: ${waitingCount} waiting sessions, ${oldCount} old sessions, and ${inactiveCount} inactive sessions removed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup complete: ${waitingCount} waiting sessions, ${oldCount} old sessions, and ${inactiveCount} inactive sessions removed`,
        totalDeleted,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in cleanup function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

