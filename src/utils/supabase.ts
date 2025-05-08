
import { createClient } from '@supabase/supabase-js';
import { GameState, Position, PlayerData } from "../types/gameTypes";
import { toast } from "@/hooks/use-toast";

// Check for Supabase credentials and provide appropriate values or fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a Supabase client with error handling
let supabase;
try {
  if (!supabaseUrl) {
    console.error('Missing Supabase URL. Please make sure you have connected your project to Supabase.');
    // Create a mock client with no-op methods to prevent application crashes
    supabase = {
      from: () => ({
        insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        select: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        eq: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      }),
      channel: () => ({
        on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      },
    };
    
    // Show a toast notification to alert the user
    setTimeout(() => {
      toast({
        title: "Supabase Connection Error",
        description: "To enable multiplayer features, connect your project to Supabase using the green button in the top right.",
        variant: "destructive",
      });
    }, 1000);
  } else {
    // Create the actual Supabase client if URL is available
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Create mock client as fallback
  supabase = {
    from: () => ({
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase client initialization failed') }),
      select: () => Promise.resolve({ data: null, error: new Error('Supabase client initialization failed') }),
      update: () => Promise.resolve({ data: null, error: new Error('Supabase client initialization failed') }),
      eq: () => Promise.resolve({ data: null, error: new Error('Supabase client initialization failed') }),
      single: () => Promise.resolve({ data: null, error: new Error('Supabase client initialization failed') }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
  };
}

export { supabase };

// Create a new game session and return session ID
export const createGameSession = async (initialPlayerColor: "red" | "blue"): Promise<string | null> => {
  try {
    // Check if Supabase is properly configured
    if (!supabaseUrl) {
      toast({
        title: "Supabase not configured",
        description: "To use multiplayer features, please connect your project to Supabase using the green button in the top right.",
        variant: "destructive",
      });
      return null;
    }
    
    const initialGameState = {
      status: 'waiting', // waiting, active, completed
      current_player: initialPlayerColor,
      game_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('game_sessions')
      .insert([initialGameState])
      .select();
      
    if (error) throw error;
    
    if (data && data[0]) {
      console.log("Created game session:", data[0].id);
      return data[0].id;
    }
    return null;
  } catch (error) {
    console.error("Error creating game session:", error);
    toast({
      title: "Failed to create game session",
      description: "Please verify your Supabase connection and try again later",
      variant: "destructive",
    });
    return null;
  }
};

// Join an existing game session
export const joinGameSession = async (sessionId: string, playerColor: "red" | "blue"): Promise<boolean> => {
  try {
    // Check if Supabase is properly configured
    if (!supabaseUrl) {
      toast({
        title: "Supabase not configured",
        description: "To use multiplayer features, please connect your project to Supabase using the green button in the top right.",
        variant: "destructive",
      });
      return false;
    }
    
    // First check if session exists and has available slots
    const { data: sessionData, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (sessionError || !sessionData) {
      toast({
        title: "Game session not found",
        description: "The game session ID is invalid",
        variant: "destructive",
      });
      return false;
    }
    
    if (sessionData.status !== 'waiting') {
      toast({
        title: "Cannot join game",
        description: "This game is already in progress or has ended",
        variant: "destructive",
      });
      return false;
    }

    // Update session status to active
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    if (updateError) throw updateError;
    
    return true;
  } catch (error) {
    console.error("Error joining game session:", error);
    toast({
      title: "Failed to join game session",
      description: "Please try again later",
      variant: "destructive",
    });
    return false;
  }
};

export const getCurrentPlayer = async (sessionId: string): Promise<PlayerData | null> => {
  try {
    // Check if Supabase is properly configured
    if (!supabaseUrl) return null;
    
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return null;
    
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .eq('id', authData.session.user.id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching current player:", error);
    return null;
  }
};

export const subscribeToGameChanges = (sessionId: string, callback: (gameState: GameState) => void) => {
  // Check if Supabase is properly configured
  if (!supabaseUrl) {
    return {
      unsubscribe: () => {}
    };
  }
  
  return supabase
    .channel(`game_changes_${sessionId}`)
    .on(
      'postgres_changes', 
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'game_sessions', 
        filter: `id=eq.${sessionId}` 
      }, 
      (payload) => {
        console.log("Game state updated:", payload);
        if (payload.new && payload.new.game_data) {
          callback(payload.new.game_data as GameState);
        }
      }
    )
    .subscribe();
};

export const syncGameState = async (sessionId: string, gameState: GameState): Promise<void> => {
  if (!sessionId || !supabaseUrl) {
    console.log("No session ID provided or Supabase not configured");
    return Promise.resolve();
  }
  
  try {
    console.log(`Syncing game state for session ${sessionId}`, gameState);
    
    const { error } = await supabase
      .from('game_sessions')
      .update({ 
        game_data: gameState,
        current_player: gameState.currentPlayer,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    if (error) throw error;
    
    return Promise.resolve();
  } catch (error) {
    console.error("Error syncing game state:", error);
    return Promise.reject(error);
  }
};

export const checkGameSession = async (sessionId: string): Promise<{ exists: boolean, data: any | null }> => {
  try {
    // Check if Supabase is properly configured
    if (!supabaseUrl) {
      return { exists: false, data: null };
    }
    
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error) {
      return { exists: false, data: null };
    }
    
    return { exists: true, data };
  } catch (error) {
    console.error("Error checking game session:", error);
    return { exists: false, data: null };
  }
};
