
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GameBoard from "../components/GameBoard";
import GameControls from "../components/GameControls";
import VictoryStats from "../components/VictoryStats";
import { useGameLogic } from "../hooks/game/useGameLogic";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import { Button } from "@/components/ui/button";
import { Flag, Copy, Users, ArrowLeft } from "lucide-react";
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
    leaveGame 
  } = useMultiplayer();
  
  const [showStats, setShowStats] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

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

  // Handle going back to home
  const handleBackToHome = () => {
    leaveGame();
    navigate('/');
  };

  // Initialize game session connection
  useEffect(() => {
    if (!sessionId || !isConnected) {
      navigate('/');
      return;
    }

    setWaitingForOpponent(!opponentPresent);

    // Subscribe to game state changes
    const subscription = subscribeToGameChanges(sessionId, (updatedGameState) => {
      console.log("Game state updated from database:", updatedGameState);
      updateGameStateFromDatabase(updatedGameState);
    });

    // Initial sync (get latest game state)
    syncWithDatabase(sessionId).catch(console.error);

    // Clean up subscription when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId, isConnected, opponentPresent]);

  // Sync game state to database when it changes locally
  useEffect(() => {
    if (sessionId && isMyTurn) {
      syncWithDatabase(sessionId).catch(console.error);
    }
  }, [gameState, isMyTurn, sessionId]);

  // Show victory stats when game is over
  useEffect(() => {
    if (gameState.gameOver && gameState.winner) {
      setShowStats(true);
    }
  }, [gameState.gameOver, gameState.winner]);

  // Calculate whether we won (if game is over)
  const isWinner = gameState.gameOver && gameState.winner === playerColor;

  // Calculate stats for multiplayer mode
  const gameStats = {
    winner: gameState.winner || "red",
    roundDuration: 120, // Placeholder
    movesMade: {
      red: 5, // Placeholder
      blue: 5 // Placeholder
    },
    wallsPlaced: {
      red: gameState.walls.filter(w => w.owner === "red").length,
      blue: gameState.walls.filter(w => w.owner === "blue").length
    },
    wallsBroken: gameState.walls.filter(w => w.broken === true).length || 0,
    hitCount: {
      red: 2, // Placeholder
      blue: 2 // Placeholder
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-blue-800 to-blue-900 p-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header with back button */}
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-blue-700/50" 
            onClick={handleBackToHome}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          
          <div className="flex items-center">
            {sessionId && (
              <Button 
                variant="outline" 
                className="bg-blue-700/50 border-blue-400 text-white hover:bg-blue-600 flex items-center gap-2"
                onClick={copySessionId}
              >
                <Copy size={16} />
                Copy Game Code
              </Button>
            )}
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
            
            <div className="mt-2 bg-red-800/20 p-2 rounded border border-red-500">
              <p className="text-red-200 text-sm">You are playing as 
                <span className="font-bold text-red-300"> Red</span>
              </p>
            </div>
          </div>
        ) : (
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
                <Button 
                  onClick={leaveGame}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg flex items-center"
                  disabled={gameState.gameOver}
                >
                  <Flag className="mr-2 h-4 w-4" />
                  Forfeit Game
                </Button>
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
              onSelectAction={selectAction}
              onEndTurn={endTurn}
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
