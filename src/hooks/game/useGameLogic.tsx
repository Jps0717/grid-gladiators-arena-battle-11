
import { useState, useCallback } from "react";
import { GameState, Position, ActionType } from "../../types/gameTypes";
import { initializeGameState } from "../../utils/gameUtils";
import { toast } from "@/hooks/use-toast";
import { useGameValidations } from "./useGameValidations";
import { useGameActions } from "./useGameActions";
import { useGameAnimations } from "./useGameAnimations";
import { syncGameState } from "@/utils/supabase";

export const useGameLogic = () => {
  // Initialize game state using the function from gameUtils
  const [gameState, setGameState] = useState<GameState>(initializeGameState());
  const [hitUsedCount, setHitUsedCount] = useState<number>(0);
  const [energyGainPosition, setEnergyGainPosition] = useState<Position | null>(null);
  
  // Custom hooks for game functionality
  const { validMoves, updateValidMoves } = useGameValidations(gameState);
  const { 
    highlightedCells, 
    setHighlightedCells, 
    animatingHit, 
    setAnimatingHit,
    energyGainAnimation,
    animateEnergyGain,
    playSound
  } = useGameAnimations();
  
  const {
    resetGame,
    nextPlayer,
    selectAction,
    hasEnoughEnergy,
    hitAllAdjacentCells,
    movePlayer,
    placeWall,
    handleCellClick,
    endTurn,
    triggerEnergyGainAnimation,
    isHitInCooldown
  } = useGameActions({
    gameState,
    setGameState,
    validMoves,
    highlightedCells,
    setHighlightedCells,
    animatingHit,
    setAnimatingHit,
    hitUsedCount,
    setHitUsedCount,
    updateValidMoves,
    animateEnergyGain,
    setEnergyGainPosition,
    playSound
  });

  // Function to forcefully update game state from external sources (like Supabase)
  const updateGameStateFromDatabase = useCallback((newState: GameState) => {
    console.log("[GameLogic] Updating game state from database:", newState);
    
    // Make sure the newState has a currentPlayer field
    if (!newState.currentPlayer) {
      console.warn("[GameLogic] Received game state without currentPlayer, using default 'red'");
      newState.currentPlayer = 'red';
    }
    
    console.log(`[GameLogic] Current player from database: ${newState.currentPlayer}`);
    
    setGameState(newState);
    // Reset highlighted cells and animations when state is updated externally
    setHighlightedCells([]);
    setAnimatingHit([]);
    // Reset hit used count when state is updated externally
    setHitUsedCount(0);
  }, [setHighlightedCells, setAnimatingHit]);

  // Sync the current game state with the database
  const syncWithDatabase = useCallback(async (sessionId: string): Promise<void> => {
    if (sessionId) {
      console.log("[GameLogic] Syncing game state with database");
      console.log(`[GameLogic] Current player being synced: ${gameState.currentPlayer}`);
      try {
        await syncGameState(sessionId, gameState);
        return Promise.resolve();
      } catch (error) {
        console.error("[GameLogic] Error syncing with database:", error);
        return Promise.reject(error);
      }
    }
    return Promise.resolve();
  }, [gameState]);

  return {
    gameState,
    setGameState,
    validMoves,
    highlightedCells,
    animatingHit,
    energyGainAnimation,
    energyGainPosition,
    selectAction,
    handleCellClick,
    resetGame,
    endTurn,
    hasEnoughEnergy,
    isHitInCooldown,
    updateGameStateFromDatabase,
    syncWithDatabase
  };
};
