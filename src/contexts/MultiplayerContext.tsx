
import React, { createContext, useContext, useState, useEffect } from 'react';
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
  trackPlayerPresence,
  getGameSession
} from '../utils/supabase';
import { toast } from '@/hooks/use-toast';

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
      // Clean up presence channel on unmount
      if (presenceChannel) {
        presenceChannel.unsubscribe();
      }
      
      // Clean up status subscription
      if (statusSubscription) {
        statusSubscription.unsubscribe();
      }
    };
  }, []);
  
  // Set up presence channel
  const setupPresenceChannel = async (sessionId: string, isHost: boolean) => {
    const channel = await subscribeToPresence(sessionId);
    if (channel) {
      setPresenceChannel(channel);
      await trackPlayerPresence(channel, {
        user: isHost ? 'host' : 'guest',
        online: true,
        joinedAt: new Date().toISOString()
      });
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
          setPlayerColor(sessionData.player_colors.host);
          setIsMyTurn(sessionData.player_colors.host === 'red');
          localStorage.setItem('playerColor', sessionData.player_colors.host);
        } else if (!isHost && sessionData.player_colors?.guest) {
          setPlayerColor(sessionData.player_colors.guest);
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
  
  const handleLeaveGame = () => {
    // Clean up presence channel
    if (presenceChannel) {
      presenceChannel.unsubscribe();
      setPresenceChannel(null);
    }
    
    // Clean up status subscription
    if (statusSubscription) {
      statusSubscription.unsubscribe();
      setStatusSubscription(null);
    }
    
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
    gameReady
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
