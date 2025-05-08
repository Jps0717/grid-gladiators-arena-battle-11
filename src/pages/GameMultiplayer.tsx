
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import GameBoard from "../components/GameBoard";
import GameControls from "../components/GameControls";
import VictoryStats from "../components/VictoryStats";
import { useGameLogic } from "../hooks/game/useGameLogic";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import { Button } from "@/components/ui/button";
import { Flag, Copy, Users, Shield, Sword } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { subscribeToGameChanges } from "../utils/supabase";
import { PlayerType } from "../types/gameTypes";

const GameMultiplayer = () => {
  const { sessionId } = useParams();
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
    leaveGame,
    isHost,
    selectHostColor,
    waitingForColorSelection
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

  // Initialize game session connection
  useEffect(() => {
    if (!sessionId || !isConnected) {
      return;
    }

    setWaitingForOpponent(!opponentPresent);

    // Subscribe to game state changes
    const subscription = subscribeToGameChanges(sessionId, (updatedGameData) => {
      console.log("Game state updated from database:", updatedGameData);
      if (updatedGameData.game_data) {
        updateGameStateFromDatabase(updatedGameData.game_data);
      }
      
      // Update waiting for opponent status
      if (updatedGameData.status === 'active') {
        setWaitingForOpponent(false);
      }
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
    if (sessionId && isMyTurn && playerColor) {
      syncWithDatabase(sessionId).catch(console.error);
    }
  }, [gameState, isMyTurn, sessionId, playerColor]);

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

  // Color selection handler for host
  const handleSelectColor = (color: PlayerType) => {
    selectHostColor(color);
  };

  // Render color selection if host needs to select a color
  const renderColorSelection = () => {
    return (
      <div className="bg-blue-900/50 p-8 rounded-lg border border-blue-400 flex flex-col items-center gap-6">
        <h2 className="text-2xl font-bold text-white">Choose Your Color</h2>
        <p className="text-blue-200 text-center mb-4">
          As the host, select the color you want to play as:
        </p>
        
        <div className="flex gap-4 w-full">
          <Button 
            onClick={() => handleSelectColor('red')}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white p-6 rounded-lg flex flex-col items-center gap-2"
          >
            <Shield size={40} />
            <span className="text-lg font-bold">Red</span>
            <span className="text-xs">(Goes first)</span>
          </Button>
          
          <Button 
            onClick={() => handleSelectColor('blue')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg flex flex-col items-center gap-2"
          >
            <Sword size={40} />
            <span className="text-lg font-bold">Blue</span>
            <span className="text-xs">(Goes second)</span>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-blue-800 to-blue-900 p-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header with game info */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Tactical Grid - Online Match</h1>
          
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

        {/* Color selection screen for host */}
        {waitingForColorSelection && isHost ? renderColorSelection() : (
          <>
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
                
                {playerColor && (
                  <div className={`mt-2 p-2 rounded border ${playerColor === 'red' ? 'bg-red-800/20 border-red-500' : 'bg-blue-800/20 border-blue-500'}`}>
                    <p className={`text-sm ${playerColor === 'red' ? 'text-red-200' : 'text-blue-200'}`}>
                      You are playing as 
                      <span className={`font-bold ${playerColor === 'red' ? 'text-red-300' : 'text-blue-300'}`}> {playerColor === 'red' ? 'Red' : 'Blue'}</span>
                    </p>
                  </div>
                )}
                
                <Button 
                  onClick={leaveGame}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                >
                  Leave Game
                </Button>
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
                  
                  {playerColor && (
                    <div className={`px-3 py-1 rounded ${playerColor === "red" ? "bg-red-800/50 border border-red-500" : "bg-blue-800/50 border border-blue-500"}`}>
                      <p className={`text-sm ${playerColor === "red" ? "text-red-200" : "text-blue-200"}`}>
                        You: <span className="font-bold">{playerColor === "red" ? "Red" : "Blue"}</span>
                      </p>
                    </div>
                  )}
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
                
                <div className="flex justify-between mb-4">
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
                  
                  <Button 
                    onClick={leaveGame}
                    className="bg-red-600 hover:bg-red-700 text-white h-14 self-end"
                  >
                    <Flag className="mr-2 h-4 w-4" />
                    Forfeit
                  </Button>
                </div>
              </>
            )}
          </>
        )}
        
        <VictoryStats 
          isOpen={showStats}
          onOpenChange={setShowStats}
          stats={gameStats}
          onReturnHome={leaveGame}
          isMultiplayer={true}
          isWinner={isWinner}
        />
      </div>
    </div>
  );
};

export default GameMultiplayer;
