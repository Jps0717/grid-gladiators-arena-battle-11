
import React from "react";
import { Button } from "@/components/ui/button";
import { ActionType, GameState } from "../types/gameTypes";
import { cn } from "@/lib/utils";
import { ArrowRight, Target, Square } from "lucide-react"; 
import EnergyBattery from "./EnergyBattery";
import CooldownIndicator from "./CooldownIndicator";

interface GameControlsProps {
  gameState: GameState;
  onSelectAction: (action: ActionType) => void;
  onEndTurn: () => void;
  onResetGame: () => void;
  onForfeit: () => void;
  hasEnoughEnergy: (action: ActionType) => boolean;
  isMyTurn?: boolean;
  isHitInCooldown?: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({
  gameState,
  onSelectAction,
  onEndTurn,
  onResetGame,
  onForfeit,
  hasEnoughEnergy,
  isMyTurn = true, // Default to true for single player mode
  isHitInCooldown = false, // Default to false
}) => {
  const currentEnergy = gameState.currentPlayer === "red" 
    ? gameState.redEnergy 
    : gameState.blueEnergy;
    
  // Only allow ending turn when it's the player's turn and either energy is 0 or actions are disabled
  const canEndTurn = (currentEnergy === 0 || gameState.actionsDisabled) && isMyTurn;

  return (
    <div className="flex flex-col space-y-4">
      {gameState.gameOver ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="text-2xl font-bold text-white">
            {gameState.winner === "red" ? "Red" : "Blue"} Player Wins!
          </div>
          <Button 
            onClick={onResetGame}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-8 rounded-lg text-lg w-full"
          >
            New Game
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-2">
            <EnergyBattery 
              currentEnergy={currentEnergy} 
              maxEnergy={2} 
              playerColor={gameState.currentPlayer}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => onSelectAction("move")}
              className={cn(
                "bg-blue-700 hover:bg-blue-800 text-white py-3 px-4 rounded-lg flex items-center justify-center",
                gameState.selectedAction === "move" && "ring-2 ring-white",
                (!hasEnoughEnergy("move") || !isMyTurn) && "opacity-50 cursor-not-allowed"
              )}
              disabled={!hasEnoughEnergy("move") || !isMyTurn}
            >
              <ArrowRight className="mr-2" size={20} />
              Move
            </Button>
            <div className="relative">
              <Button
                onClick={() => onSelectAction("hit")}
                className={cn(
                  "bg-blue-700 hover:bg-blue-800 text-white py-3 px-4 rounded-lg flex items-center justify-center w-full",
                  gameState.selectedAction === "hit" && "ring-2 ring-white",
                  (!hasEnoughEnergy("hit") || gameState.actionsDisabled || !isMyTurn || isHitInCooldown) && "opacity-50 cursor-not-allowed"
                )}
                disabled={!hasEnoughEnergy("hit") || gameState.actionsDisabled || !isMyTurn || isHitInCooldown}
              >
                <Target className="mr-2" size={20} />
                Hit
              </Button>
              <CooldownIndicator isActive={isHitInCooldown && isMyTurn} />
            </div>
            <Button
              onClick={() => onSelectAction("wall")}
              className={cn(
                "bg-blue-700 hover:bg-blue-800 text-white py-3 px-4 rounded-lg flex items-center justify-center",
                gameState.selectedAction === "wall" && "ring-2 ring-white",
                (!hasEnoughEnergy("wall") || !isMyTurn) && "opacity-50 cursor-not-allowed"
              )}
              disabled={!hasEnoughEnergy("wall") || !isMyTurn}
            >
              <Square className="mr-2" size={20} />
              Wall
            </Button>
          </div>
          <Button
            onClick={onEndTurn}
            className={cn(
              "bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg flex items-center justify-center",
              !canEndTurn && "opacity-50 cursor-not-allowed"
            )}
            disabled={!canEndTurn}
          >
            <ArrowRight className="mr-2" size={20} />
            End Turn
          </Button>
        </>
      )}
    </div>
  );
};

export default GameControls;
