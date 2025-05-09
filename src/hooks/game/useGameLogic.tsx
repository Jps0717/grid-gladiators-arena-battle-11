
import { useState, useCallback, useEffect } from "react";
import { GameState, Position, ActionType, ValidMoves } from "../../types/gameTypes";
import { initializeGameState, getValidMoves, isPlayerJumpZone } from "../../utils/gameUtils";
import { toast } from "@/hooks/use-toast";
import { useGameActions } from "./useGameActions";
import { syncGameState } from "@/utils/supabase";

export const useGameLogic = () => {
  // Initialize game state using the function from gameUtils
  const [gameState, setGameState] = useState<GameState>(initializeGameState());
  const [hitUsedCount, setHitUsedCount] = useState<number>(0);
  const [energyGainPosition, setEnergyGainPosition] = useState<Position | null>(null);
  
  // Animation states (merged from useGameAnimations)
  const [highlightedCells, setHighlightedCells] = useState<Position[]>([]);
  const [animatingHit, setAnimatingHit] = useState<Position[]>([]);
  const [energyGainAnimation, setEnergyGainAnimation] = useState<boolean>(false);
  const [validMoves, setValidMoves] = useState<ValidMoves>({ moves: [], wallPlacements: [], hitTargets: [] });
  const [invalidWallCells, setInvalidWallCells] = useState<Position[]>([]);
  
  // Animation helper functions (from useGameAnimations)
  const animateEnergyGain = useCallback(() => {
    setEnergyGainAnimation(true);
    setTimeout(() => setEnergyGainAnimation(false), 1000);
  }, []);
  
  const playSound = useCallback((type: 'move' | 'hit' | 'wall' | 'energy' | 'win' | 'turn') => {
    console.log(`Playing sound: ${type}`);
    // In a real implementation, this would use the Web Audio API or an audio library
  }, []);

  // Validation functions (from useGameValidations)
  const updateValidMoves = useCallback(() => {
    if (gameState.gameOver) return;

    const currentPlayerPosition = 
      gameState.currentPlayer === "red" ? gameState.redPosition : gameState.bluePosition;
    
    const isJumpZone = isPlayerJumpZone(currentPlayerPosition, gameState.currentPlayer);
    const usedJump = gameState.currentPlayer === "red" ? gameState.redUsedJump : gameState.blueUsedJump;
    
    const moves = getValidMoves(
      gameState,
      currentPlayerPosition,
      isJumpZone,
      usedJump
    );
    
    setValidMoves(moves);
  }, [gameState]);

  // Update valid moves when game state changes
  useEffect(() => {
    updateValidMoves();
  }, [gameState, updateValidMoves]);

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
    playSound,
    invalidWallCells,
    setInvalidWallCells
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
    invalidWallCells,
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
