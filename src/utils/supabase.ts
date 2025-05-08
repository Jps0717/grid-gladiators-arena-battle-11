
import { createClient } from '@supabase/supabase-js';
import { GameState, Position, PlayerData, PlayerType } from "../types/gameTypes";
import { toast } from "@/hooks/use-toast";

// Check for Supabase credentials and use the correct Supabase URL and key
const supabaseUrl = "https://lbhhhxokopdjmuddlwod.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiaGhoeG9rb3Bkam11ZGRsd29kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MzUzODksImV4cCI6MjA2MjMxMTM4OX0.NgGhV330Aup1dMliGpDIvbGGoxbPNvY6jtrJTNtqcis";

// Create a Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a new game session and return session ID
export const createGameSession = async (): Promise<string | null> => {
  try {
    const initialGameState = {
      status: 'waiting', // waiting, active, completed
      current_player: 'red', // Red always starts the game (game rule)
      game_data: {},
      player_colors: { host: null, guest: null }, // Colors will be assigned when players join
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
      description: "Please verify your connection and try again later",
      variant: "destructive",
    });
    return null;
  }
};

// Join an existing game session
export const joinGameSession = async (sessionId: string): Promise<{success: boolean, playerColor?: PlayerType}> => {
  try {
    // First check if session exists
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
      return { success: false };
    }
    
    if (sessionData.status === 'completed') {
      toast({
        title: "Cannot join game",
        description: "This game has already ended",
        variant: "destructive",
      });
      return { success: false };
    }

    // Check player colors
    const playerColors = sessionData.player_colors || { host: null, guest: null };
    const hostColor = playerColors.host;
    let guestColor: PlayerType | null = null;
    
    // If host hasn't chosen a color yet, guest will wait 
    if (!hostColor) {
      toast({
        title: "Waiting for host",
        description: "The host hasn't set up the game yet",
        variant: "warning",
      });
      return { success: true };
    }
    
    // Assign the opposite color to the guest
    guestColor = hostColor === 'red' ? 'blue' : 'red';
    
    // Update session with guest's color and change status to active
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({ 
        player_colors: { ...playerColors, guest: guestColor },
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    if (updateError) throw updateError;
    
    return { success: true, playerColor: guestColor };
  } catch (error) {
    console.error("Error joining game session:", error);
    toast({
      title: "Failed to join game session",
      description: "Please try again later",
      variant: "destructive",
    });
    return { success: false };
  }
};

// Host chooses a color
export const hostSelectColor = async (sessionId: string, color: PlayerType): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('game_sessions')
      .update({ 
        player_colors: { host: color, guest: null },
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error selecting host color:", error);
    return false;
  }
};

// Subscribe to game changes for realtime updates
export const subscribeToGameChanges = (sessionId: string, callback: (gameState: any) => void) => {
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
        callback(payload.new);
      }
    )
    .subscribe();
};

// Subscribe to presence for realtime player tracking
export const subscribeToPresence = (sessionId: string, isHost: boolean, playerInfo: any) => {
  const presenceChannel = supabase.channel(`presence_${sessionId}`);
  
  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      console.log('Presence state synced:', state);
      // Return the current presence state so the UI can be updated
      return state;
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('Player joined:', key, newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('Player left:', key, leftPresences);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track(playerInfo);
      }
    });
    
  return presenceChannel;
};

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
