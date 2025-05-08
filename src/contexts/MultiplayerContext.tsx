
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
  hostSelectColor
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
  selectHostColor: (color: PlayerType) => Promise<boolean>;
  waitingForColorSelection: boolean;
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
  const [waitingForColorSelection, setWaitingForColorSelection] = useState<boolean>(false);
  
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
          
          if (data.player_colors && data.player_colors.host) {
            setWaitingForColorSelection(false);
            
            // If we're the host, we get our color from the host field
            if (storedIsHost) {
              const hostColor = data.player_colors.host as PlayerType;
              setPlayerColor(hostColor);
              setIsMyTurn(data.current_player === hostColor);
            } 
            // If we're the guest, we get our color from the guest field
            else if (data.player_colors.guest) {
              const guestColor = data.player_colors.guest as PlayerType;
              setPlayerColor(guestColor);
              setIsMyTurn(data.current_player === guestColor);
            }
          } else if (storedIsHost) {
            // If we're the host but colors aren't set, we need to select a color
            setWaitingForColorSelection(true);
          }
          
          setOpponentPresent(data.status === 'active');
        }
      });
    }
  }, []);

  const createGame = async (): Promise<string | null> => {
    setIsLoading(true);
    try {
      const newSessionId = await createGameSession();
      
      if (newSessionId) {
        // Save to state and local storage
        setSessionId(newSessionId);
        setIsHost(true);
        setIsConnected(true);
        setWaitingForColorSelection(true);
        
        localStorage.setItem('gameSessionId', newSessionId);
        localStorage.setItem('isHost', 'true');
        
        // Setting up presence for this game
        subscribeToPresence(newSessionId, true, { 
          isHost: true,
          joined_at: new Date().toISOString()
        });
        
        // Subscribe to game state changes
        subscribeToGameChanges(newSessionId, (updatedGame) => {
          if (updatedGame.status === 'active' && updatedGame.player_colors?.guest) {
            setOpponentPresent(true);
          }
          
          if (updatedGame.game_data && Object.keys(updatedGame.game_data).length > 0) {
            // Handle game state updates
          }
        });
        
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
  
  const selectHostColor = async (color: PlayerType): Promise<boolean> => {
    if (!sessionId || !isHost) return false;
    
    setIsLoading(true);
    try {
      const success = await hostSelectColor(sessionId, color);
      
      if (success) {
        setPlayerColor(color);
        setWaitingForColorSelection(false);
        setIsMyTurn(color === 'red'); // Red always starts
        
        localStorage.setItem('playerColor', color);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error selecting color:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const joinGame = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Check if session exists
      const { success, playerColor: assignedColor } = await joinGameSession(id);
      
      if (!success) {
        return false;
      }
      
      setSessionId(id);
      setIsHost(false);
      setIsConnected(true);
      
      localStorage.setItem('gameSessionId', id);
      localStorage.setItem('isHost', 'false');
      
      // If we got assigned a color, set it
      if (assignedColor) {
        setPlayerColor(assignedColor);
        setIsMyTurn(assignedColor === 'red'); // Red always goes first
        localStorage.setItem('playerColor', assignedColor);
      }
      
      // Setting up presence for this game
      subscribeToPresence(id, false, { 
        isHost: false,
        joined_at: new Date().toISOString()
      });
      
      // Subscribe to game state changes
      subscribeToGameChanges(id, (updatedGame) => {
        // If host selected a color and we don't have one yet
        if (updatedGame.player_colors?.host && !playerColor) {
          const hostColor = updatedGame.player_colors.host as PlayerType;
          const guestColor = hostColor === 'red' ? 'blue' : 'red';
          setPlayerColor(guestColor);
          setIsMyTurn(guestColor === 'red');
          localStorage.setItem('playerColor', guestColor);
        }
        
        if (updatedGame.game_data && Object.keys(updatedGame.game_data).length > 0) {
          // Handle game state updates
        }
      });
      
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
    setSessionId(null);
    setPlayerColor(null);
    setIsHost(false);
    setIsMyTurn(false);
    setIsConnected(false);
    setOpponentPresent(false);
    setWaitingForColorSelection(false);
    
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
    selectHostColor,
    waitingForColorSelection
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
