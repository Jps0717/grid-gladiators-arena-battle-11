
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState, PlayerType } from '../types/gameTypes';
import { 
  subscribeToGameChanges,
  subscribeToSessionStatus,
  subscribeToPresence, 
  syncGameState, 
  createGameSession, 
  joinGameSession,
  checkGameSession,
  getGameSession
} from '../utils/supabase';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MultiplayerContextType {
  sessionId: string | null;
  playerColor: PlayerType | null;
  isHost: boolean;
  isMyTurn: boolean;
  isConnected: boolean;
  isLoading: boolean;
  opponentPresent: boolean;
  createGame: () => Promise<string | null>;
  joinGame: (id: string) => Promise<boolean>;
  leaveGame: () => void;
  syncState: (gameState: GameState) => Promise<void>;
  setMyTurn: (isMyTurn: boolean) => void;
  gameReady: boolean;
  reconnect: () => Promise<boolean>;
}

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

export const MultiplayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<PlayerType | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isMyTurn, setIsMyTurn] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [opponentPresent, setOpponentPresent] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [gameReady, setGameReady] = useState<boolean>(false);
  const [presenceChannel, setPresenceChannel] = useState<any>(null);
  const [statusSubscription, setStatusSubscription] = useState<any>(null);
  
  const navigate = useNavigate();

  // Initialize from local storage on component mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem('gameSessionId');
    const storedPlayerColor = localStorage.getItem('playerColor') as PlayerType | null;
    const storedIsHost = localStorage.getItem('isHost') === 'true';
    
    if (storedSessionId) {
      setSessionId(storedSessionId);
      setPlayerColor(storedPlayerColor);
      setIsHost(storedIsHost);
      
      // Verify the session still exists
      checkGameSession(storedSessionId).then(({ exists, data }) => {
        if (!exists) {
          // Session doesn't exist anymore, clear local state
          handleLeaveGame();
          toast({
            title: "Game session expired",
            description: "The game session is no longer available",
            variant: "destructive",
          });
        } else if (exists && data) {
          setIsConnected(true);
          setIsMyTurn(data.current_player === storedPlayerColor);
          
          // If the status is active, the game is ready to play
          if (data.status === 'active') {
            setOpponentPresent(true);
            setGameReady(true);
          }
          
          // Set up presence channel
          setupPresenceChannel(storedSessionId, storedIsHost);
          
          // Set up status subscription
          setupStatusSubscription(storedSessionId);
        }
      });
    }
    
    return () => {
      cleanupChannels();
    };
  }, []);
  
  const cleanupChannels = () => {
    // Clean up presence channel on unmount
    if (presenceChannel) {
      supabase.removeChannel(presenceChannel);
      setPresenceChannel(null);
    }
    
    // Clean up status subscription
    if (statusSubscription) {
      statusSubscription.unsubscribe();
      setStatusSubscription(null);
    }
  };
  
  // Set up presence channel
  const setupPresenceChannel = async (sessionId: string, isHost: boolean) => {
    try {
      console.log(`Setting up presence channel for game ${sessionId}`);
      
      // First, remove any existing channel
      if (presenceChannel) {
        await supabase.removeChannel(presenceChannel);
      }
      
      // Create a new presence channel
      const channel = supabase.channel(`presence_${sessionId}`);
      
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          console.log('Presence state updated:', state);
          
          // Check for opponent presence
          const participants = Object.values(state).flat();
          const opponentFound = participants.some(p => {
            // Check if this is an opponent's presence data
            const presenceData = p as any;
            if (!presenceData || !presenceData.user) return false;
            
            return isHost ? presenceData.user === 'guest' : presenceData.user === 'host';
          });
          
          setOpponentPresent(opponentFound);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('Player joined:', key, newPresences);
          
          // Check if the joined user is the opponent
          const joinedPresence = newPresences[0] as any;
          if (joinedPresence && joinedPresence.user) {
            const isOpponent = isHost ? joinedPresence.user === 'guest' : joinedPresence.user === 'host';
            
            if (isOpponent) {
              toast({
                title: "Player joined",
                description: "Your opponent has joined the game!",
              });
            }
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('Player left:', key, leftPresences);
          
          // Check if the left user was the opponent
          const leftPresence = leftPresences[0] as any;
          if (leftPresence && leftPresence.user) {
            const wasOpponent = isHost ? leftPresence.user === 'guest' : leftPresence.user === 'host';
            
            if (wasOpponent) {
              toast({
                title: "Player left",
                description: "Your opponent has left the game",
                variant: "destructive",
              });
              setOpponentPresent(false);
            }
          }
        });
      
      // Subscribe to the channel
      const status = await channel.subscribe();
      console.log(`Presence channel subscription status: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        // Track this player's presence
        const presenceData = {
          user: isHost ? 'host' : 'guest',
          online: true,
          joinedAt: new Date().toISOString()
        };
        
        await channel.track(presenceData);
        setPresenceChannel(channel);
      }
      
      return channel;
    } catch (error) {
      console.error("Error setting up presence channel:", error);
      return null;
    }
  };
  
  // Set up status subscription
  const setupStatusSubscription = (sessionId: string) => {
    const subscription = subscribeToSessionStatus(sessionId, (sessionData) => {
      console.log("Session status update received:", sessionData);
      
      if (sessionData.status === 'active' && !gameReady) {
        setOpponentPresent(true);
        setGameReady(true);
        
        // Get player color from session data
        if (isHost && sessionData.player_colors?.host) {
          setPlayerColor(sessionData.player_colors.host as PlayerType);
          setIsMyTurn(sessionData.player_colors.host === 'red');
          localStorage.setItem('playerColor', sessionData.player_colors.host);
        } else if (!isHost && sessionData.player_colors?.guest) {
          setPlayerColor(sessionData.player_colors.guest as PlayerType);
          setIsMyTurn(sessionData.player_colors.guest === 'red');
          localStorage.setItem('playerColor', sessionData.player_colors.guest);
        }
        
        // Auto-navigate to game screen
        if (window.location.pathname.includes('/game/')) {
          toast({
            title: "Game Started",
            description: "Opponent has joined. Game is ready!",
          });
        }
      }
    });
    
    setStatusSubscription(subscription);
    return subscription;
  };

  const createGame = async (): Promise<string | null> => {
    setIsLoading(true);
    try {
      const newSessionId = await createGameSession();
      
      if (newSessionId) {
        // Auto-assign as red (host)
        setSessionId(newSessionId);
        setPlayerColor('red');
        setIsHost(true);
        setIsConnected(true);
        setOpponentPresent(false);
        setGameReady(false);
        setIsMyTurn(true); // Red always goes first
        
        localStorage.setItem('gameSessionId', newSessionId);
        localStorage.setItem('isHost', 'true');
        localStorage.setItem('playerColor', 'red');
        
        // Set up presence channel
        await setupPresenceChannel(newSessionId, true);
        
        // Set up status subscription
        setupStatusSubscription(newSessionId);
        
        // We're going to let the component handle navigation
        return newSessionId;
      }
      return null;
    } catch (error) {
      console.error("Error creating game:", error);
      toast({
        title: "Failed to create game",
        description: "Please try again later",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  const joinGame = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Check if session exists
      const { exists, data } = await checkGameSession(id);
      
      if (!exists || !data) {
        toast({
          title: "Game not found",
          description: "The game session ID is invalid",
          variant: "destructive",
        });
        return false;
      }
      
      if (data.status !== 'waiting') {
        toast({
          title: "Cannot join game",
          description: "This game is already full or has ended",
          variant: "destructive",
        });
        return false;
      }
      
      setSessionId(id);
      setIsHost(false);
      setIsConnected(true);
      setOpponentPresent(true);
      
      // Auto-assign as blue (guest)
      setPlayerColor('blue');
      localStorage.setItem('playerColor', 'blue');
      localStorage.setItem('gameSessionId', id);
      localStorage.setItem('isHost', 'false');
      
      // Set up presence channel
      await setupPresenceChannel(id, false);
      
      // Set up status subscription
      setupStatusSubscription(id);
      
      const success = await joinGameSession(id);
      if (!success) {
        return false;
      }
      
      setGameReady(true);
      
      // Redirect to game page
      navigate(`/game/${id}`);
      return true;
    } catch (error) {
      console.error("Error joining game:", error);
      toast({
        title: "Failed to join game",
        description: "Please try again later",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reconnect to existing game session
  const reconnect = async (): Promise<boolean> => {
    if (!sessionId) return false;
    
    try {
      // Check if session still exists
      const { exists, data } = await checkGameSession(sessionId);
      
      if (!exists || !data) {
        handleLeaveGame();
        toast({
          title: "Game session expired",
          description: "The game session is no longer available",
          variant: "destructive",
        });
        return false;
      }
      
      // Reconnect presence channel
      await setupPresenceChannel(sessionId, isHost);
      
      // Reconnect status subscription
      if (statusSubscription) {
        statusSubscription.unsubscribe();
      }
      setupStatusSubscription(sessionId);
      
      setIsConnected(true);
      
      // If game was already active, set it as ready
      if (data.status === 'active') {
        setOpponentPresent(true);
        setGameReady(true);
      }
      
      return true;
    } catch (error) {
      console.error("Error reconnecting:", error);
      return false;
    }
  };
  
  const handleLeaveGame = () => {
    cleanupChannels();
    
    setSessionId(null);
    setPlayerColor(null);
    setIsHost(false);
    setIsMyTurn(false);
    setIsConnected(false);
    setOpponentPresent(false);
    setGameReady(false);
    
    localStorage.removeItem('gameSessionId');
    localStorage.removeItem('playerColor');
    localStorage.removeItem('isHost');
    
    navigate('/');
  };
  
  const syncState = async (gameState: GameState): Promise<void> => {
    if (!sessionId) return Promise.resolve();
    
    try {
      await syncGameState(sessionId, gameState);
      // Update local turn state
      setIsMyTurn(gameState.currentPlayer === playerColor);
      return Promise.resolve();
    } catch (error) {
      console.error("Error syncing state:", error);
      return Promise.reject(error);
    }
  };

  const value = {
    sessionId,
    playerColor,
    isHost,
    isMyTurn,
    isConnected,
    isLoading,
    opponentPresent,
    createGame,
    joinGame,
    leaveGame: handleLeaveGame,
    syncState,
    setMyTurn: setIsMyTurn,
    gameReady,
    reconnect
  };

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
};

export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  if (context === undefined) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider');
  }
  return context;
};
