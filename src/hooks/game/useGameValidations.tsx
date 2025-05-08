
import { useEffect, useState } from "react";
import { GameState, ValidMoves } from "../../types/gameTypes";
import { getValidMoves, isPlayerJumpZone } from "../../utils/gameUtils";

export const useGameValidations = (gameState: GameState) => {
  const [validMoves, setValidMoves] = useState<ValidMoves>({ 
    moves: [], 
    wallPlacements: [], 
    hitTargets: [] 
  });
  
  // Function to explicitly update valid moves
  const updateValidMoves = () => {
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
  };
  
  // Calculate valid moves when game state changes
  useEffect(() => {
    updateValidMoves();
  }, [gameState]);
  
  return { validMoves, updateValidMoves };
};
