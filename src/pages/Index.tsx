
import React, { useState } from "react";
import GameBoard from "../components/GameBoard";
import GameControls from "../components/GameControls";
import VictoryStats from "../components/VictoryStats";
import { useGameLogic } from "../hooks/game/useGameLogic";
import { Button } from "@/components/ui/button";
import { Flag, Plus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
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
  } = useGameLogic();
  
  const [showStats, setShowStats] = useState(false);
  const navigate = useNavigate();

  const handleForfeit = () => {
    // In local mode, forfeit just resets the game
    resetGame();
  };
  
  const handleReturnHome = () => {
    navigate('/');
  };
  
  // Show victory stats when game is over
  React.useEffect(() => {
    if (gameState.gameOver && gameState.winner) {
      setShowStats(true);
    }
  }, [gameState.gameOver, gameState.winner]);
  
  // Calculate simple stats for local mode
  const gameStats = {
    winner: gameState.winner || "red",
    roundDuration: 120, // Placeholder
    movesMade: {
      red: 5,
      blue: 5
    },
    wallsPlaced: {
      red: gameState.walls.filter(w => w.owner === "red").length,
      blue: gameState.walls.filter(w => w.owner === "blue").length
    },
    wallsBroken: gameState.walls.filter(w => w.broken === true).length || 0,
    hitCount: {
      red: 2,
      blue: 2
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-blue-800 to-blue-900 p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleReturnHome}
              className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Return Home
            </Button>
            
            <div 
              className={`w-6 h-6 rounded-full mr-2 ${gameState.currentPlayer === "red" ? "bg-red-600" : "bg-blue-600"}`}
            />
            <h1 className="text-white text-2xl font-bold">
              {gameState.currentPlayer === "red" ? "Red" : "Blue"}'s Turn
            </h1>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleForfeit}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg flex items-center"
              disabled={gameState.gameOver}
            >
              <Flag className="mr-2 h-4 w-4" />
              Forfeit
            </Button>
            
            <Button 
              onClick={resetGame} 
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg border border-blue-300 flex items-center gap-2"
            >
              <Plus size={18} />
              New Game
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
            onCellClick={handleCellClick}
          />
        </div>
        
        <GameControls
          gameState={gameState}
          onSelectAction={selectAction}
          onEndTurn={endTurn}
          onResetGame={resetGame}
          onForfeit={handleForfeit}
          hasEnoughEnergy={hasEnoughEnergy}
          isHitInCooldown={isHitInCooldown}
        />
        
        <VictoryStats 
          isOpen={showStats}
          onOpenChange={setShowStats}
          stats={gameStats}
          onReturnHome={handleReturnHome}
        />
      </div>
    </div>
  );
};

export default Index;
