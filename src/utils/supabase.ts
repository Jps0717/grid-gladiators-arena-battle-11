import { GameState, Position, PlayerType, PlayerData } from "../types/gameTypes";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { initializeGameState } from "./gameUtils";

// Create a new game session and return session ID
export const createGameSession = async (): Promise<string | null> => {
  try {
    // Initialize with a full game state instead of empty object
    const initialGameState = initializeGameState();
    
    const sessionData = {
      status: 'waiting', // waiting, active, completed
      current_player: initialGameState.currentPlayer, // Red always starts
      game_data: initialGameState,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      player_colors: {
        host: "red", // Auto-assign host as red
        guest: null
      }
    };

    const { data, error } = await supabase
      .from('game_sessions')
      .insert([sessionData])
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

// Fetch initial game state with retries and fallback to a default state
// Also ensures the full game state is synced back to the database if needed
export const fetchInitialGameState = async (
  sessionId: string, 
  maxRetries = 3
): Promise<GameState> => {
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
          // On final attempt, return a fresh game state instead of null
          const freshState = initializeGameState();
          
          // Sync this fresh state back to the database to ensure consistency
          try {
            await syncGameState(sessionId, freshState);
            console.log("Synced fresh game state to database after fetch failures");
          } catch (syncError) {
            console.error("Failed to sync fresh game state:", syncError);
          }
          
          return freshState;
        }
      }
      
      // If we have data but game_data is empty or incomplete, create and sync a fresh state
      const gameData = data?.game_data;
      
      if (!gameData || 
          typeof gameData !== 'object' || 
          Object.keys(gameData).length === 0 || 
          !gameData.walls || 
          !Array.isArray(gameData.walls) || 
          typeof gameData.currentPlayer !== 'string') {
        
        console.log("Game data is empty or incomplete, creating fresh state");
        const freshState = initializeGameState();
        
        // Sync this fresh state back to the database
        try {
          await syncGameState(sessionId, freshState);
          console.log("Synced fresh game state to database for incomplete data");
        } catch (syncError) {
          console.error("Failed to sync fresh game state:", syncError);
        }
        
        return freshState;
      }
      
      console.log("Successfully fetched initial game state:", gameData);
      return gameData as GameState;
    } catch (error) {
      console.error("Failed to fetch initial game state:", error);
      const freshState = initializeGameState();
      
      // Try to sync this fresh state back to the database
      try {
        await syncGameState(sessionId, freshState);
        console.log("Synced fresh game state to database after fetch error");
      } catch (syncError) {
        console.error("Failed to sync fresh game state:", syncError);
      }
      
      return freshState;
    }
  }
  
  // If all retries failed, return a fresh state
  const freshState = initializeGameState();
  
  // Try to sync this fresh state back to the database
  try {
    await syncGameState(sessionId, freshState);
    console.log("Synced fresh game state to database after max retries");
  } catch (syncError) {
    console.error("Failed to sync fresh game state after max retries:", syncError);
  }
  
  return freshState;
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
