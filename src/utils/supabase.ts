
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
      current_player: 'red', // Red always starts
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
      description: "Please verify your connection and try again later",
      variant: "destructive",
    });
    return null;
  }
};

// Join an existing game session
export const joinGameSession = async (sessionId: string, playerColor: PlayerType): Promise<boolean> => {
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
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return null;
    
    // This will need to be updated if you create a players table later
    return null;
  } catch (error) {
    console.error("Error fetching current player:", error);
    return null;
  }
};

export const subscribeToGameChanges = (sessionId: string, callback: (gameState: GameState) => void) => {
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

// Subscribe to presence for real-time player tracking
export const subscribeToGamePresence = async (sessionId: string, playerColor: PlayerType, isHost: boolean) => {
  try {
    const presenceChannel = supabase.channel(`presence_${sessionId}`);
    
    const playerStatus = {
      player_color: playerColor,
      is_host: isHost,
      online_at: new Date().toISOString()
    };
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        console.log('Presence state updated:', state);
        // You could use this to update UI showing online players
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Player joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Player left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track(playerStatus);
        }
      });
      
    return presenceChannel;
  } catch (error) {
    console.error("Error setting up presence:", error);
    return null;
  }
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
