
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GameBoard from "../components/GameBoard";
import GameControls from "../components/GameControls";
import VictoryStats from "../components/VictoryStats";
import { useGameLogic } from "../hooks/game/useGameLogic";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import { Button } from "@/components/ui/button";
import { Flag, Copy, Users, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { subscribeToGameChanges } from "../utils/supabase";

const GameMultiplayer = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const {
    gameState,
    highlightedCells,
    animatingHit,
    energyGainPosition,
    invalidWallCells,
    selectAction,
    handleCellClick,
    resetGame,
    endTurn,
    hasEnoughEnergy,
    isHitInCooldown,
    updateGameStateFromDatabase,
    syncWithDatabase
  } = useGameLogic();
  
  const { 
    playerColor,
    isMyTurn, 
    isConnected, 
    opponentPresent,
    isHost,
    leaveGame,
    gameReady
  } = useMultiplayer();
  
  const [showStats, setShowStats] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Copy session ID to clipboard
  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId);
      toast({
        title: "Game code copied!",
        description: "Share this code with your friend to join the game",
      });
    }
  };

  // Initialize game session connection
  useEffect(() => {
    if (!sessionId || !isConnected) {
      navigate('/');
      return;
    }

    // Reset error state on mount
    setError(null);
    
    // Set initial waiting state
    setWaitingForOpponent(!opponentPresent || !gameReady);
    setIsLoading(true);

    try {
      // Subscribe to game state changes
      const newSubscription = subscribeToGameChanges(sessionId, (updatedGameState) => {
        console.log("Game state updated from database:", updatedGameState);
        if (updatedGameState) {
          updateGameStateFromDatabase(updatedGameState);
          setIsLoading(false);
        } else {
          console.warn("Received null or undefined game state from database");
          setIsLoading(false);
        }
      });

      setSubscription(newSubscription);

      // Initial sync (get latest game state)
      if (gameReady) {
        syncWithDatabase(sessionId)
          .then(() => setIsLoading(false))
          .catch(error => {
            console.error("Error syncing game state:", error);
            setError("Failed to load game data. Please try again.");
            setIsLoading(false);
          });
      }
    } catch (err) {
      console.error("Error setting up game:", err);
      setError("Failed to connect to game. Please try again.");
      setIsLoading(false);
    }

    // Clean up subscription when component unmounts
    return () => {
      if (subscription) {
        console.log("Unsubscribing from game changes");
        subscription.unsubscribe();
      }
    };
  }, [sessionId, isConnected, opponentPresent, gameReady]);

  // Update waiting state when opponent status changes
  useEffect(() => {
    setWaitingForOpponent(!opponentPresent || !gameReady);
    
    // If opponent joins and game becomes ready, sync state
    if (opponentPresent && gameReady && sessionId) {
      syncWithDatabase(sessionId).catch(err => {
        console.error("Error syncing after opponent joined:", err);
        setError("Failed to sync game data with opponent");
      });
    }
  }, [opponentPresent, gameReady, sessionId]);

  // Sync game state to database when it changes locally
  useEffect(() => {
    if (sessionId && isMyTurn && gameReady && !isLoading) {
      syncWithDatabase(sessionId).catch(err => {
        console.error("Error syncing game state:", err);
        toast({
          title: "Sync Error",
          description: "Failed to update game state. Game may be out of sync.",
          variant: "destructive",
        });
      });
    }
  }, [gameState, isMyTurn, sessionId, gameReady, isLoading]);

  // Show victory stats when game is over
  useEffect(() => {
    if (gameState.gameOver && gameState.winner) {
      setShowStats(true);
    }
  }, [gameState.gameOver, gameState.winner]);

  // Calculate whether we won (if game is over)
  const isWinner = gameState.gameOver && gameState.winner === playerColor;

  // Calculate stats for multiplayer mode with null checks and defaults
  const gameStats = {
    winner: gameState.winner || "red",
    roundDuration: 120, // Placeholder
    movesMade: {
      red: 5, // Placeholder
      blue: 5 // Placeholder
    },
    wallsPlaced: {
      red: gameState.walls ? gameState.walls.filter(w => w.owner === "red").length : 0,
      blue: gameState.walls ? gameState.walls.filter(w => w.owner === "blue").length : 0
    },
    wallsBroken: gameState.walls ? gameState.walls.filter(w => w.broken === true).length : 0,
    hitCount: {
      red: 2, // Placeholder
      blue: 2 // Placeholder
    }
  };

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-800 to-blue-900 p-4">
        <div className="bg-blue-900/70 p-8 rounded-lg border border-blue-400 max-w-md w-full">
          <div className="flex flex-col items-center text-center gap-4">
            <AlertTriangle size={48} className="text-yellow-300" />
            <h2 className="text-2xl font-bold text-white">Connection Error</h2>
            <p className="text-blue-200 mb-4">{error}</p>
            <Button 
              onClick={() => navigate("/")}
              className="bg-blue-700 hover:bg-blue-800 w-full"
            >
              Return Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading indicator
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-800 to-blue-900">
        <div className="text-white text-xl font-bold animate-pulse">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-blue-800 to-blue-900 p-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header with game code */}
        <div className="flex justify-between items-center mb-6">
          {sessionId && (
            <div className="flex items-center bg-blue-700/50 px-3 py-1 rounded-lg">
              <span className="text-sm font-mono text-white mr-2">Game Code: {sessionId}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-blue-600 p-1 h-6 w-6"
                onClick={copySessionId}
              >
                <Copy size={14} />
              </Button>
            </div>
          )}
          
          <div>
            <Button 
              variant="destructive" 
              size="sm"
              className="bg-red-600 hover:bg-red-700"
              onClick={leaveGame}
            >
              <Flag className="mr-1 h-3.5 w-3.5" />
              Leave Game
            </Button>
          </div>
        </div>

        {/* Waiting for opponent screen */}
        {waitingForOpponent ? (
          <div className="bg-blue-900/50 p-8 rounded-lg border border-blue-400 flex flex-col items-center gap-4">
            <Users size={48} className="text-blue-200 animate-pulse" />
            <h2 className="text-2xl font-bold text-white">Waiting for Opponent</h2>
            <p className="text-blue-200 text-center">
              Share your game code with a friend to join!
            </p>
            
            <div className="bg-blue-800/50 p-3 rounded-lg border border-blue-400 flex items-center justify-center mt-2">
              <span className="text-xl font-mono text-white tracking-wider">{sessionId}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-2 text-white hover:bg-blue-600"
                onClick={copySessionId}
              >
                <Copy size={16} />
              </Button>
            </div>
            
            <div className="text-center mt-4">
              <p className="text-blue-200 mb-2">You will play as:</p>
              <div className="flex items-center justify-center">
                <div className={`w-8 h-8 rounded-full ${isHost ? "bg-red-600" : "bg-blue-600"} mr-2`}></div>
                <span className="font-bold text-white text-lg">
                  {isHost ? "Red" : "Blue"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Game Screen */
          <>
            {/* Game status bar */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div 
                  className={`w-6 h-6 rounded-full mr-2 ${gameState.currentPlayer === "red" ? "bg-red-600" : "bg-blue-600"}`}
                />
                <h1 className="text-white text-2xl font-bold flex items-center">
                  {gameState.currentPlayer === "red" ? "Red" : "Blue"}'s Turn
                  {isMyTurn ? (
                    <span className="ml-2 text-sm bg-blue-600 px-2 py-0.5 rounded-full">You</span>
                  ) : (
                    <span className="ml-2 text-sm bg-gray-600 px-2 py-0.5 rounded-full">Opponent</span>
                  )}
                </h1>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded ${playerColor === "red" ? "bg-red-800/50 border border-red-500" : "bg-blue-800/50 border border-blue-500"}`}>
                  <p className={`text-sm ${playerColor === "red" ? "text-red-200" : "text-blue-200"}`}>
                    You: <span className="font-bold">{playerColor === "red" ? "Red" : "Blue"}</span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <GameBoard
                gameState={gameState}
                highlightedCells={highlightedCells}
                animatingHit={animatingHit}
                invalidWallCells={invalidWallCells}
                energyGainPosition={energyGainPosition}
                onCellClick={isMyTurn ? handleCellClick : () => {}}
              />
            </div>
            
            <GameControls
              gameState={gameState}
              onSelectAction={isMyTurn ? selectAction : () => {}}
              onEndTurn={isMyTurn ? endTurn : () => {}}
              onResetGame={resetGame}
              onForfeit={leaveGame}
              hasEnoughEnergy={hasEnoughEnergy}
              isMyTurn={isMyTurn}
              isHitInCooldown={isHitInCooldown}
            />
          </>
        )}
        
        <VictoryStats 
          isOpen={showStats}
          onOpenChange={setShowStats}
          stats={gameStats}
          onReturnHome={() => navigate("/")}
          isMultiplayer={true}
          isWinner={isWinner}
        />
      </div>
    </div>
  );
};

export default GameMultiplayer;
