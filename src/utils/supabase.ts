
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

// Subscribe to presence for real-time player tracking
export const subscribeToPresence = async (sessionId: string) => {
  try {
    console.log(`Setting up presence channel for game ${sessionId}`);
    
    const presenceChannel = supabase.channel(`presence_${sessionId}`);
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        console.log('Presence state updated:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Player joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Player left:', key, leftPresences);
      });
      
    return presenceChannel;
  } catch (error) {
    console.error("Error setting up presence:", error);
    return null;
  }
};

// Track player presence in a game session
export const trackPlayerPresence = async (channel: any, playerData: any) => {
  if (!channel) return false;
  
  try {
    console.log("Tracking player presence:", playerData);
    const status = await channel.subscribe();
    if (status === 'SUBSCRIBED') {
      await channel.track(playerData);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error tracking presence:", error);
    return false;
  }
};

// Get current game session data
export const getGameSession = async (sessionId: string) => {
  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error getting game session:", error);
    return null;
  }
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

// Fetch initial game state with retries - Updated to be more robust and consistent with logging
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

// Delete old game sessions that are no longer active or were created too long ago
export const cleanupStaleSessions = async (options: { 
  maxAgeHours?: number,
  includeActive?: boolean,
  includeWaiting?: boolean
} = {}): Promise<number> => {
  try {
    // Default options
    const {
      maxAgeHours = 24,  // Delete sessions older than 24 hours by default
      includeActive = false, // By default, don't delete active sessions
      includeWaiting = true  // By default, clean up waiting sessions
    } = options;
    
    // Calculate the cutoff time
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);
    const cutoffISOString = cutoffDate.toISOString();
    
    console.log(`Cleaning up sessions older than ${cutoffISOString}`);
    
    // Build the status filter based on options
    let statusFilter = [];
    if (includeWaiting) statusFilter.push('waiting');
    if (includeActive) statusFilter.push('active');
    
    // If no statuses to filter by, just return 0 (no sessions to delete)
    if (statusFilter.length === 0) {
      console.log("No session status types selected for cleanup");
      return 0;
    }
    
    // First, count how many sessions will be deleted
    const { count, error: countError } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffISOString)
      .in('status', statusFilter);
      
    if (countError) {
      console.error("Error counting stale sessions:", countError);
      return 0;
    }
    
    if (!count || count === 0) {
      console.log("No stale sessions found to delete");
      return 0;
    }
    
    console.log(`Found ${count} stale sessions to delete`);
    
    // Delete the sessions
    const { error: deleteError } = await supabase
      .from('game_sessions')
      .delete()
      .lt('created_at', cutoffISOString)
      .in('status', statusFilter);
      
    if (deleteError) {
      console.error("Error deleting stale sessions:", deleteError);
      return 0;
    }
    
    console.log(`Successfully deleted ${count} stale sessions`);
    return count || 0;
  } catch (error) {
    console.error("Error during session cleanup:", error);
    return 0;
  }
};
