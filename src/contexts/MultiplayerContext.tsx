
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState, PlayerType } from '../types/gameTypes';
import { 
  subscribeToGameChanges, 
  syncGameState, 
  createGameSession, 
  joinGameSession,
  checkGameSession
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
        }
      });
    }
  }, []);

  const createGame = async (): Promise<string | null> => {
    setIsLoading(true);
    try {
      // Always set host as red player for consistency
      const hostColor: PlayerType = 'red';
      const newSessionId = await createGameSession(hostColor);
      
      if (newSessionId) {
        // Save to state and local storage
        setSessionId(newSessionId);
        setPlayerColor(hostColor);
        setIsHost(true);
        setIsMyTurn(true); // Red always goes first
        setIsConnected(true);
        setOpponentPresent(false);
        
        localStorage.setItem('gameSessionId', newSessionId);
        localStorage.setItem('playerColor', hostColor);
        localStorage.setItem('isHost', 'true');
        
        navigate(`/game/${newSessionId}`);
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
      
      // Guest is always blue (since host is always red)
      const guestColor: PlayerType = 'blue';
      
      const success = await joinGameSession(id, guestColor);
      
      if (success) {
        setSessionId(id);
        setPlayerColor(guestColor);
        setIsHost(false);
        setIsMyTurn(false); // Red goes first, and guest is blue
        setIsConnected(true);
        setOpponentPresent(true);
        
        localStorage.setItem('gameSessionId', id);
        localStorage.setItem('playerColor', guestColor);
        localStorage.setItem('isHost', 'false');
        
        navigate(`/game/${id}`);
        return true;
      }
      return false;
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
    setMyTurn: setIsMyTurn
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
