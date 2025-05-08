
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState, PlayerType } from '../types/gameTypes';
import { 
  subscribeToGameChanges,
  subscribeToPresence, 
  syncGameState, 
  createGameSession, 
  joinGameSession,
  checkGameSession,
  updatePlayerColor,
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
  selectColor: (color: PlayerType) => Promise<boolean>;
  availableColors: PlayerType[];
  opponentColor: PlayerType | null;
  gameReady: boolean;
}

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

export const MultiplayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<PlayerType | null>(null);
  const [opponentColor, setOpponentColor] = useState<PlayerType | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isMyTurn, setIsMyTurn] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [opponentPresent, setOpponentPresent] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [availableColors, setAvailableColors] = useState<PlayerType[]>(["red", "blue"]);
  const [gameReady, setGameReady] = useState<boolean>(false);
  const [presenceChannel, setPresenceChannel] = useState<any>(null);
  
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
          setOpponentPresent(data.status === 'active');
          
          // Get color data
          if (data.player_colors) {
            const hostColor = data.player_colors.host;
            const guestColor = data.player_colors.guest;
            
            // Set opponent color based on our role
            if (storedIsHost && guestColor) {
              setOpponentColor(guestColor);
              setGameReady(true);
            } else if (!storedIsHost && hostColor) {
              setOpponentColor(hostColor);
              setGameReady(true);
            }
            
            // Update available colors
            if (hostColor || guestColor) {
              const updatedColors = ["red", "blue"].filter(color => {
                if (storedIsHost && hostColor === color) return false;
                if (!storedIsHost && guestColor === color) return false;
                return true;
              }) as PlayerType[];
              setAvailableColors(updatedColors);
            }
          }
          
          // Set up presence channel
          setupPresenceChannel(storedSessionId, storedIsHost);
        }
      });
    }
    
    return () => {
      // Clean up presence channel on unmount
      if (presenceChannel) {
        presenceChannel.unsubscribe();
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

  const createGame = async (): Promise<string | null> => {
    setIsLoading(true);
    try {
      const newSessionId = await createGameSession();
      
      if (newSessionId) {
        // We'll let the user select their color
        setSessionId(newSessionId);
        setIsHost(true);
        setIsConnected(true);
        setOpponentPresent(false);
        setGameReady(false);
        
        localStorage.setItem('gameSessionId', newSessionId);
        localStorage.setItem('isHost', 'true');
        
        // Set up presence channel
        await setupPresenceChannel(newSessionId, true);
        
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
      setGameReady(false);
      
      localStorage.setItem('gameSessionId', id);
      localStorage.setItem('isHost', 'false');
      
      // Check if host has already selected a color
      if (data.player_colors && data.player_colors.host) {
        const hostColor = data.player_colors.host as PlayerType;
        setOpponentColor(hostColor);
        // Update available colors
        const updatedColors = ["red", "blue"].filter(color => color !== hostColor) as PlayerType[];
        setAvailableColors(updatedColors);
      }
      
      // Set up presence channel
      await setupPresenceChannel(id, false);
      
      const success = await joinGameSession(id);
      if (!success) {
        return false;
      }
      
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
  
  const selectColor = async (color: PlayerType): Promise<boolean> => {
    if (!sessionId) return false;
    
    try {
      setIsLoading(true);
      const success = await updatePlayerColor(sessionId, isHost, color);
      
      if (success) {
        setPlayerColor(color);
        localStorage.setItem('playerColor', color);
        setIsMyTurn(color === 'red'); // Red always goes first
        
        // Update available colors
        const updatedColors = ["red", "blue"].filter(c => c !== color) as PlayerType[];
        setAvailableColors(updatedColors);
        
        // Wait a moment and then check if opponent has selected a color
        setTimeout(async () => {
          const session = await getGameSession(sessionId);
          if (session && session.player_colors) {
            const hostColor = session.player_colors.host;
            const guestColor = session.player_colors.guest;
            
            if (isHost && guestColor) {
              setOpponentColor(guestColor);
              setGameReady(true);
            } else if (!isHost && hostColor) {
              setOpponentColor(hostColor);
              setGameReady(true);
            }
          }
          setIsLoading(false);
        }, 500);
        
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error("Error selecting color:", error);
      setIsLoading(false);
      return false;
    }
  };
  
  const handleLeaveGame = () => {
    // Clean up presence channel
    if (presenceChannel) {
      presenceChannel.unsubscribe();
      setPresenceChannel(null);
    }
    
    setSessionId(null);
    setPlayerColor(null);
    setIsHost(false);
    setIsMyTurn(false);
    setIsConnected(false);
    setOpponentPresent(false);
    setOpponentColor(null);
    setGameReady(false);
    setAvailableColors(["red", "blue"]);
    
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
    selectColor,
    availableColors,
    opponentColor,
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
