
import { GameState, Position, PlayerData, PlayerType } from "../types/gameTypes";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Create a new game session and return session ID
export const createGameSession = async (): Promise<string | null> => {
  try {
    const initialGameState = {
      status: 'waiting', // waiting, active, completed
      current_player: 'red', // Red always starts
      game_data: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      player_colors: {
        host: "red", // Auto-assign host as red
        guest: null
      }
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
      description: "Please verify your connection and try again later",
      variant: "destructive",
    });
    return null;
  }
};

// Join an existing game session
export const joinGameSession = async (sessionId: string): Promise<boolean> => {
  try {
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

    // Cast the player_colors to the correct shape to fix TypeScript errors
    const playerColors = sessionData.player_colors as { host: string | null; guest: string | null } || 
                        { host: null, guest: null };

    // Auto-assign guest as blue
    const { error: colorError } = await supabase
      .from('game_sessions')
      .update({ 
        player_colors: { 
          host: playerColors?.host || "red",
          guest: "blue" 
        }
      })
      .eq('id', sessionId);
    
    if (colorError) {
      console.error("Error assigning color:", colorError);
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

// Subscribe to game changes using Supabase realtime
export const subscribeToGameChanges = (sessionId: string, callback: (gameState: GameState) => void) => {
  console.log(`Setting up real-time subscription for game ${sessionId}`);
  
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
        console.log("Game state updated payload:", payload);
        if (payload.new && payload.new.game_data) {
          callback(payload.new.game_data as GameState);
        }
      }
    )
    .subscribe((status) => {
      console.log(`Subscription status for game changes: ${status}`);
    });
};

// Subscribe to session status changes
export const subscribeToSessionStatus = (sessionId: string, callback: (data: any) => void) => {
  console.log(`Setting up session status subscription for game ${sessionId}`);
  
  return supabase
    .channel(`session_status_${sessionId}`)
    .on(
      'postgres_changes', 
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'game_sessions', 
        filter: `id=eq.${sessionId}` 
      }, 
      (payload) => {
        console.log("Session status updated:", payload);
        if (payload.new) {
          callback(payload.new);
        }
      }
    )
    .subscribe((status) => {
      console.log(`Subscription status for session changes: ${status}`);
    });
};

// Sync game state to the database
export const syncGameState = async (sessionId: string, gameState: GameState): Promise<void> => {
  if (!sessionId) {
    console.log("No session ID provided");
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

// Fetch initial game state with retries
export const fetchInitialGameState = async (
  sessionId: string, 
  maxRetries = 3
): Promise<GameState | null> => {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      console.log(`Fetching initial game state for session ${sessionId}, attempt ${attempts + 1}`);
      const { data, error } = await supabase
        .from('game_sessions')
        .select('game_data, current_player, status, player_colors')
        .eq('id', sessionId)
        .single();
      
      if (error) {
        console.error(`Error fetching game state (attempt ${attempts + 1}):`, error);
        attempts++;
        
        // Short delay before retrying
        if (attempts < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        } else {
          throw error;
        }
      }
      
      if (data && data.game_data) {
        console.log("Successfully fetched initial game state:", data.game_data);
        return data.game_data as GameState;
      } else {
        console.warn("No game data found in session");
        return null;
      }
    } catch (error) {
      console.error("Failed to fetch initial game state:", error);
      return null;
    }
  }
  
  return null;
};

// Check game session existence
export const checkGameSession = async (sessionId: string): Promise<{ exists: boolean, data: any | null }> => {
  try {
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
