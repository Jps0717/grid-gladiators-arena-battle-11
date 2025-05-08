
import { useCallback, useRef } from "react";
import { 
  GameState, 
  Position, 
  ActionType, 
  ValidMoves 
} from "../../types/gameTypes";
import { 
  positionsEqual, 
  isExtraEnergyCell,
  getSurroundingPositions,
  initializeGameState,
  findWallAtPosition
} from "../../utils/gameUtils";
import { toast } from "@/hooks/use-toast";

interface GameActionsProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  validMoves: ValidMoves;
  highlightedCells: Position[];
  setHighlightedCells: React.Dispatch<React.SetStateAction<Position[]>>;
  animatingHit: Position[];
  setAnimatingHit: React.Dispatch<React.SetStateAction<Position[]>>;
  hitUsedCount: number;
  setHitUsedCount: React.Dispatch<React.SetStateAction<number>>;
  updateValidMoves: () => void;
  animateEnergyGain: () => void;
  setEnergyGainPosition: React.Dispatch<React.SetStateAction<Position | null>>;
  playSound: (type: 'move' | 'hit' | 'wall' | 'energy' | 'win' | 'turn') => void;
}

export const useGameActions = ({
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
}: GameActionsProps) => {
  
  // Track if the last action was a hit
  const lastActionWasHit = useRef(false);
  
  // Check if a player has enough energy for an action
  const hasEnoughEnergy = useCallback((action: ActionType): boolean => {
    const currentEnergy = gameState.currentPlayer === "red" 
      ? gameState.redEnergy 
      : gameState.blueEnergy;
    
    // Check if actions are disabled due to wall placement
    if (gameState.actionsDisabled) {
      return false;
    }
    
    if (action === "move" && currentEnergy < 1) return false;
    if (action === "wall" && currentEnergy < 1) return false;
    
    // For hit action, check if we've already used hit the maximum number of times
    if (action === "hit" && hitUsedCount >= currentEnergy) return false;
    
    return true;
  }, [gameState.redEnergy, gameState.blueEnergy, gameState.currentPlayer, gameState.actionsDisabled, hitUsedCount]);

  // Reset game
  const resetGame = useCallback(() => {
    // Create a fresh game state directly
    const freshGameState = initializeGameState();
    
    setGameState(freshGameState);
    setHighlightedCells([]);
    setAnimatingHit([]);
    setHitUsedCount(0);
    lastActionWasHit.current = false;
    
    // Add a toast to inform the user about the reset with the randomized starting player
    setTimeout(() => {
      toast({
        title: "New Game Started",
        description: `${freshGameState.currentPlayer === "red" ? "Red" : "Blue"} goes first with 1 energy.`,
      });
    }, 100);
  }, [setGameState, setHighlightedCells, setAnimatingHit, setHitUsedCount]);

  // Switch to the next player
  const nextPlayer = useCallback(() => {
    setGameState((prev) => {
      const switchingTo = prev.currentPlayer === "red" ? "blue" : "red";
      
      // Determine energy for the next player:
      // 1. Default is 1 energy when switching turns
      // 2. If opponent placed a wall, give 2 energy (capped at 2)
      const newEnergy = prev.lastActionWasWall ? 2 : 1;

      return {
        ...prev,
        currentPlayer: switchingTo,
        selectedAction: null,
        lastActionWasWall: false,
        actionsDisabled: false,
        redUsedJump: switchingTo === "red" ? false : prev.redUsedJump,
        blueUsedJump: switchingTo === "blue" ? false : prev.blueUsedJump,
        redEnergy: switchingTo === "red" ? newEnergy : prev.redEnergy,
        blueEnergy: switchingTo === "blue" ? newEnergy : prev.blueEnergy,
      };
    });
    
    // Reset hit used count for the new player's turn
    setHitUsedCount(0);
    
    // Reset the lastActionWasHit flag when switching players
    lastActionWasHit.current = false;
    
    toast({
      title: `${gameState.currentPlayer === "red" ? "Blue" : "Red"}'s Turn`,
      description: `${gameState.currentPlayer === "red" ? "Blue" : "Red"} player, it's your turn now!`,
    });
  }, [gameState.currentPlayer, setGameState, setHitUsedCount]);

  // Hit adjacent cells
  const hitAllAdjacentCells = useCallback(() => {
    // Check if player has already used hit the maximum number of times
    const currentEnergy = gameState.currentPlayer === "red" 
      ? gameState.redEnergy 
      : gameState.blueEnergy;
    
    if (hitUsedCount >= currentEnergy) {
      toast({
        title: "Hit limit reached",
        description: `You can only hit up to ${currentEnergy} times per turn based on your energy.`,
        variant: "destructive",
      });
      return;
    }
    
    // Get current player position
    const currentPlayerPosition = 
      gameState.currentPlayer === "red" ? gameState.redPosition : gameState.bluePosition;
    
    // Get all surrounding positions (adjacent + diagonal)
    const surroundingPositions = getSurroundingPositions(currentPlayerPosition);
    
    // Set all surrounding positions to show hit animation
    setAnimatingHit(surroundingPositions);
    
    // Process hits after animation
    setTimeout(() => {
      // Clear animation
      setAnimatingHit([]);
      
      setGameState((prev) => {
        // Create a copy of walls to modify
        const updatedWalls = [...prev.walls];
        let hitCount = 0;
        let destroyedCount = 0;
        
        // Process each adjacent and diagonal cell
        surroundingPositions.forEach(pos => {
          // Find if there's a wall at this position
          const wallIndex = prev.walls.findIndex(w => 
            positionsEqual(w.position, pos)
          );
          
          // If there's a wall, reduce its HP
          if (wallIndex !== -1) {
            const wall = { ...updatedWalls[wallIndex] };
            wall.hp -= 1;
            hitCount++;
            
            // Remove wall if HP is 0
            if (wall.hp <= 0) {
              updatedWalls.splice(wallIndex, 1);
              destroyedCount++;
            } else {
              updatedWalls[wallIndex] = wall;
            }
          }
        });
        
        // Determine if we should deduct energy for consecutive hits
        const shouldDeductEnergy = lastActionWasHit.current;
        
        // Set lastActionWasHit to true since we just performed a hit
        lastActionWasHit.current = true;
        
        // Update energy levels if this is the second consecutive hit
        const updatedRedEnergy = prev.currentPlayer === "red" 
          ? (shouldDeductEnergy ? Math.max(0, prev.redEnergy - 1) : prev.redEnergy)
          : prev.redEnergy;
        
        const updatedBlueEnergy = prev.currentPlayer === "blue" 
          ? (shouldDeductEnergy ? Math.max(0, prev.blueEnergy - 1) : prev.blueEnergy) 
          : prev.blueEnergy;
        
        // Show appropriate toast based on hit results
        if (hitCount === 0) {
          toast({
            title: "No Walls Hit",
            description: "No walls were in range to hit.",
          });
        } else if (destroyedCount > 0) {
          toast({
            title: "Walls Destroyed",
            description: `${destroyedCount} wall${destroyedCount > 1 ? 's' : ''} destroyed!`,
          });
        } else {
          toast({
            title: "Walls Damaged",
            description: `${hitCount} wall${hitCount > 1 ? 's' : ''} damaged!`,
          });
        }
        
        // Show a toast if energy was deducted
        if (shouldDeductEnergy) {
          toast({
            title: "Energy Lost",
            description: "You lost 1 energy for hitting twice in a row!",
            variant: "destructive",
          });
        }
        
        // Increment hit used count
        setHitUsedCount(prevCount => prevCount + 1);
        
        return {
          ...prev,
          walls: updatedWalls,
          selectedAction: null,  // Clear the selected action after hit
          redEnergy: updatedRedEnergy,
          blueEnergy: updatedBlueEnergy,
        };
      });
      
      // Clear highlighted cells
      setHighlightedCells([]);
      
    }, 800); // Delay to match the animation
  }, [
    gameState.currentPlayer, 
    gameState.redPosition, 
    gameState.bluePosition, 
    gameState.redEnergy, 
    gameState.blueEnergy, 
    hitUsedCount, 
    setAnimatingHit, 
    setGameState, 
    setHitUsedCount, 
    setHighlightedCells
  ]);

  // Select an action
  const selectAction = useCallback((action: ActionType) => {
    setGameState((prev) => ({ ...prev, selectedAction: action }));
    
    // Update highlighted cells based on the selected action
    if (action === "move") {
      setHighlightedCells(validMoves.moves || []);
      // Reset the lastActionWasHit flag when switching to move action
      lastActionWasHit.current = false;
    } else if (action === "hit") {
      // Check if player has already used hit the maximum number of times
      const currentEnergy = gameState.currentPlayer === "red" 
        ? gameState.redEnergy 
        : gameState.blueEnergy;
      
      if (hitUsedCount >= currentEnergy) {
        toast({
          title: "Hit limit reached",
          description: `You can only hit up to ${currentEnergy} times per turn based on your energy.`,
          variant: "destructive",
        });
        return;
      }
      
      // Immediately trigger the hit action when the button is clicked
      hitAllAdjacentCells();
    } else if (action === "wall") {
      setHighlightedCells(validMoves.wallPlacements || []);
      // Reset the lastActionWasHit flag when switching to wall action
      lastActionWasHit.current = false;
    }
  }, [
    validMoves, 
    gameState.currentPlayer, 
    gameState.redEnergy, 
    gameState.blueEnergy, 
    hitUsedCount, 
    hitAllAdjacentCells,
    setGameState,
    setHighlightedCells
  ]);

  // Trigger energy gain animation
  const triggerEnergyGainAnimation = useCallback((position: Position) => {
    setEnergyGainPosition(position);
    animateEnergyGain();
    
    // Clear the animation after a delay
    setTimeout(() => {
      setEnergyGainPosition(null);
    }, 1200);
  }, [setEnergyGainPosition, animateEnergyGain]);

  // Perform a move action
  const movePlayer = useCallback((position: Position) => {
    if (!hasEnoughEnergy("move")) {
      toast({
        title: "Not enough energy",
        description: "You need 1 energy to move.",
        variant: "destructive",
      });
      return;
    }
    
    // Reset lastActionWasHit flag when moving
    lastActionWasHit.current = false;
    
    setGameState((prev) => {
      // Check if player is moving to opponent's position (win condition)
      const opponentPosition = prev.currentPlayer === "red" ? prev.bluePosition : prev.redPosition;
      if (positionsEqual(position, opponentPosition)) {
        toast({
          title: `${prev.currentPlayer === "red" ? "Red" : "Blue"} Wins!`,
          description: `${prev.currentPlayer === "red" ? "Red" : "Blue"} player has captured the opponent!`,
        });
        
        return {
          ...prev,
          gameOver: true,
          winner: prev.currentPlayer,
        };
      }
      
      // Calculate if this is a diagonal move (using jump zone)
      const currentPos = prev.currentPlayer === "red" ? prev.redPosition : prev.bluePosition;
      const isDiagonal = 
        Math.abs(position.row - currentPos.row) === 1 && 
        Math.abs(position.col - currentPos.col) === 1;
      
      // Check if the target position is an extra energy cell
      const isExtraEnergy = isExtraEnergyCell(position);
      
      // If moving to an extra energy cell, trigger animation
      if (isExtraEnergy) {
        triggerEnergyGainAnimation(position);
      }
      
      // Update player position
      const newState = {
        ...prev,
        redPosition: prev.currentPlayer === "red" ? position : prev.redPosition,
        bluePosition: prev.currentPlayer === "blue" ? position : prev.bluePosition,
        redEnergy: prev.currentPlayer === "red" 
          ? (prev.redEnergy - 1 + (isExtraEnergy ? 1 : 0)) 
          : prev.redEnergy,
        blueEnergy: prev.currentPlayer === "blue" 
          ? (prev.blueEnergy - 1 + (isExtraEnergy ? 1 : 0)) 
          : prev.blueEnergy,
      };
      
      // If this was a diagonal move, mark jump as used
      if (isDiagonal) {
        newState.redUsedJump = prev.currentPlayer === "red" ? true : prev.redUsedJump;
        newState.blueUsedJump = prev.currentPlayer === "blue" ? true : prev.blueUsedJump;
      }
      
      // Show toast if player landed on extra energy cell
      if (isExtraEnergy) {
        setTimeout(() => {
          toast({
            title: "Extra Energy!",
            description: "You gained 1 energy from the energy cell.",
          });
        }, 100);
      }
      
      return newState;
    });
    
    // Clear highlighted cells
    setHighlightedCells([]);
  }, [hasEnoughEnergy, setGameState, setHighlightedCells, triggerEnergyGainAnimation]);

  // Place a wall
  const placeWall = useCallback((position: Position) => {
    if (!hasEnoughEnergy("wall")) {
      toast({
        title: "Not enough energy",
        description: "You need 1 energy to place a wall.",
        variant: "destructive",
      });
      return;
    }
    
    // Reset lastActionWasHit flag when placing a wall
    lastActionWasHit.current = false;
    
    setGameState((prev) => {
      // Create a new wall
      const newWall = {
        position: position,
        hp: 2,
        owner: prev.currentPlayer,
      };
      
      return {
        ...prev,
        walls: [...prev.walls, newWall],
        redEnergy: prev.currentPlayer === "red" ? prev.redEnergy - 1 : prev.redEnergy,
        blueEnergy: prev.currentPlayer === "blue" ? prev.blueEnergy - 1 : prev.blueEnergy,
        lastActionWasWall: true,
        actionsDisabled: true,
        selectedAction: null,
      };
    });
    
    // Clear highlighted cells
    setHighlightedCells([]);
    
    // Show toast to remind player to end turn
    toast({
      title: "Wall Placed",
      description: "Wall placed. Please end your turn now.",
    });
  }, [hasEnoughEnergy, setGameState, setHighlightedCells]);

  // Handle cell click based on the selected action
  const handleCellClick = useCallback((position: Position) => {
    if (gameState.gameOver) return;
    
    const { selectedAction } = gameState;
    
    if (!selectedAction) {
      toast({
        title: "Select an action",
        description: "Please select Move, Hit, or Wall action first.",
      });
      return;
    }
    
    // Check if the clicked cell is valid for the selected action
    switch (selectedAction) {
      case "move":
        if (validMoves.moves && validMoves.moves.some(pos => positionsEqual(pos, position))) {
          movePlayer(position);
          setGameState(prev => ({ ...prev, selectedAction: null }));
        }
        break;
        
      case "hit":
        // Hit is now triggered directly when the button is clicked
        // This case should not be reached anymore
        break;
        
      case "wall":
        if (validMoves.wallPlacements && validMoves.wallPlacements.some(pos => positionsEqual(pos, position))) {
          placeWall(position);
        }
        break;
    }
  }, [gameState, validMoves, movePlayer, placeWall, setGameState]);

  // End turn manually
  const endTurn = useCallback(() => {
    nextPlayer();
  }, [nextPlayer]);

  return {
    resetGame,
    nextPlayer,
    selectAction,
    hasEnoughEnergy,
    hitAllAdjacentCells,
    movePlayer,
    placeWall,
    handleCellClick,
    endTurn,
    triggerEnergyGainAnimation
  };
};
