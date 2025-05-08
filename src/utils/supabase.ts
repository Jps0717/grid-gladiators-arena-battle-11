
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
      player_colors: {
        host: null,
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
        console.log("Game state updated:", payload);
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

// Update player color choice in the database
export const updatePlayerColor = async (sessionId: string, isHost: boolean, color: PlayerType | null): Promise<boolean> => {
  try {
    const field = isHost ? 'player_colors->host' : 'player_colors->guest';
    
    const { error } = await supabase
      .from('game_sessions')
      .update({ [field]: color })
      .eq('id', sessionId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating player color:", error);
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
