import { useState, useCallback, useEffect } from "react";
import { GameState, Position, ActionType, PlayerType } from "@/types/gameTypes";
import { positionsEqual, isValidMove, isValidHitTarget, canPlaceWall, boardHasValidPath, isJumpCell, isExtraEnergyCell } from "@/utils/gameUtils";

const initialGameState: GameState = {
  currentPlayer: "red",
  redPosition: { row: 3, col: 2 },
  bluePosition: { row: 0, col: 2 },
  walls: [],
  redEnergy: 2,
  blueEnergy: 2,
  redUsedJump: false,
  blueUsedJump: false,
  selectedAction: null,
  gameOver: false,
  winner: null,
  lastActionWasWall: false,
  actionsDisabled: false
};

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [highlightedCells, setHighlightedCells] = useState<Position[]>([]);
  const [animatingHit, setAnimatingHit] = useState<Position[]>([]);
  const [energyGainPosition, setEnergyGainPosition] = useState<Position | null>(null);
  const [invalidWallCells, setInvalidWallCells] = useState<Position[]>([]);
  const [hitUsedCount, setHitUsedCount] = useState(0);

  // Reset game state
  const resetGame = useCallback(() => {
    setGameState(initialGameState);
    setHighlightedCells([]);
    setAnimatingHit([]);
    setInvalidWallCells([]);
    setHitUsedCount(0);
  }, []);

  // Select action (move, hit, wall)
  const selectAction = useCallback((action: ActionType) => {
    setGameState(prev => {
      if (prev.gameOver) return prev;
      
      // Clear highlighted cells when changing action
      setHighlightedCells([]);
      setInvalidWallCells([]);
      
      // Toggle off if same action is selected
      if (prev.selectedAction === action) {
        return { ...prev, selectedAction: null };
      }
      
      // Show valid moves for the selected action
      const currentPosition = prev.currentPlayer === "red" ? prev.redPosition : prev.bluePosition;
      const opponentPosition = prev.currentPlayer === "red" ? prev.bluePosition : prev.redPosition;
      
      if (action === "move") {
        const validMoves = getValidMoves(currentPosition, opponentPosition, prev.walls, prev.currentPlayer);
        setHighlightedCells(validMoves);
      } else if (action === "hit") {
        const validHitTargets = getValidHitTargets(currentPosition, opponentPosition, prev.walls);
        setHighlightedCells(validHitTargets);
      } else if (action === "wall") {
        const validWallPlacements = getValidWallPlacements(prev.walls);
        setHighlightedCells(validWallPlacements);
      }
      
      return { ...prev, selectedAction: action };
    });
  }, []);

  // Handle cell click based on selected action
  const handleCellClick = useCallback((position: Position) => {
    setGameState(prev => {
      if (prev.gameOver || prev.actionsDisabled || !prev.selectedAction) return prev;

      const currentPosition = prev.currentPlayer === "red" ? prev.redPosition : prev.bluePosition;
      const opponentPosition = prev.currentPlayer === "red" ? prev.bluePosition : prev.redPosition;

      // Get current player's energy
      const currentEnergy = prev.currentPlayer === "red" ? prev.redEnergy : prev.blueEnergy;
      
      // Handle move action
      if (prev.selectedAction === "move") {
        // Check if valid move and have energy
        if (isValidMove(currentPosition, position, opponentPosition, prev.walls) && currentEnergy > 0) {
          // Check if landing on a jump cell
          const isOnJumpCell = isJumpCell(position, prev.currentPlayer);
          const isOnEnergyCell = isExtraEnergyCell(position);
          
          // Animate energy gain if landing on energy cell
          if (isOnEnergyCell) {
            setEnergyGainPosition(position);
            setTimeout(() => setEnergyGainPosition(null), 1000);
          }
          
          // Update position based on player color
          if (prev.currentPlayer === "red") {
            // Update energy and jump status
            const newRedEnergy = isOnEnergyCell ? Math.min(prev.redEnergy, 2) + 1 : prev.redEnergy - 1;
            const newRedUsedJump = isOnJumpCell ? true : prev.redUsedJump;
            
            return {
              ...prev,
              redPosition: position,
              redEnergy: newRedEnergy,
              redUsedJump: newRedUsedJump,
              selectedAction: null,
              lastActionWasWall: false,
              // Check if player landed on opponent base
              gameOver: position.row === 0 && position.col === 2 ? true : prev.gameOver,
              winner: position.row === 0 && position.col === 2 ? "red" : prev.winner
            };
          } else {
            // Update energy and jump status
            const newBlueEnergy = isOnEnergyCell ? Math.min(prev.blueEnergy, 2) + 1 : prev.blueEnergy - 1;
            const newBlueUsedJump = isOnJumpCell ? true : prev.blueUsedJump;
            
            return {
              ...prev,
              bluePosition: position,
              blueEnergy: newBlueEnergy,
              blueUsedJump: newBlueUsedJump,
              selectedAction: null,
              lastActionWasWall: false,
              // Check if player landed on opponent base
              gameOver: position.row === 3 && position.col === 2 ? true : prev.gameOver,
              winner: position.row === 3 && position.col === 2 ? "blue" : prev.winner
            };
          }
        }
      }
      
      // Handle hit action
      else if (prev.selectedAction === "hit" && currentEnergy >= 1) {
        if (isValidHitTarget(currentPosition, position, opponentPosition, prev.walls)) {
          // Check if hitting a wall
          const wallIndex = prev.walls.findIndex(wall => 
            positionsEqual(wall.position, position) && !wall.broken);
          
          // Set hit animation
          setAnimatingHit([position]);
          setTimeout(() => setAnimatingHit([]), 500);
          setHitUsedCount(prev => prev + 1);
          
          if (wallIndex !== -1) {
            // Hit a wall - damage or destroy it
            const newWalls = [...prev.walls];
            if (newWalls[wallIndex].hp === 1) {
              // Wall is destroyed
              newWalls[wallIndex] = {
                ...newWalls[wallIndex],
                broken: true
              };
            } else {
              // Wall is damaged
              newWalls[wallIndex] = {
                ...newWalls[wallIndex],
                hp: newWalls[wallIndex].hp - 1
              };
            }
            
            // Update energy
            if (prev.currentPlayer === "red") {
              return {
                ...prev,
                walls: newWalls,
                redEnergy: prev.redEnergy - 1,
                selectedAction: null,
                lastActionWasWall: false
              };
            } else {
              return {
                ...prev,
                walls: newWalls,
                blueEnergy: prev.blueEnergy - 1,
                selectedAction: null,
                lastActionWasWall: false
              };
            }
          }
          
          // Check if hitting the other player
          else if (positionsEqual(position, opponentPosition)) {
            // Push opponent back
            const pushDirection = {
              row: position.row - currentPosition.row,
              col: position.col - currentPosition.col
            };
            
            // Calculate the push position
            const pushPosition = {
              row: position.row + pushDirection.row,
              col: position.col + pushDirection.col
            };
            
            // Check if push position is valid (not out of bounds or into a wall)
            const isValidPushPosition = 
              pushPosition.row >= 0 && pushPosition.row < 4 &&
              pushPosition.col >= 0 && pushPosition.col < 5 &&
              !prev.walls.some(wall => positionsEqual(wall.position, pushPosition) && !wall.broken);
            
            // If push position is valid, move the opponent there
            const newOpponentPosition = isValidPushPosition ? pushPosition : opponentPosition;
            
            // Check if player pushed opponent onto their own base (win condition)
            let gameOver = prev.gameOver;
            let winner = prev.winner;
            
            if (prev.currentPlayer === "red") {
              // Red player pushed blue to the red base
              if (newOpponentPosition.row === 3 && newOpponentPosition.col === 2) {
                gameOver = true;
                winner = "red";
              }
              
              return {
                ...prev,
                bluePosition: newOpponentPosition,
                redEnergy: prev.redEnergy - 1,
                selectedAction: null,
                lastActionWasWall: false,
                gameOver,
                winner
              };
            } else {
              // Blue player pushed red to the blue base
              if (newOpponentPosition.row === 0 && newOpponentPosition.col === 2) {
                gameOver = true;
                winner = "blue";
              }
              
              return {
                ...prev,
                redPosition: newOpponentPosition,
                blueEnergy: prev.blueEnergy - 1,
                selectedAction: null,
                lastActionWasWall: false,
                gameOver,
                winner
              };
            }
          }
        }
      }
      
      // Handle wall action
      else if (prev.selectedAction === "wall" && currentEnergy >= 2) {
        // Check if valid wall placement
        if (canPlaceWall(position, prev.walls)) {
          // Check if wall doesn't block all paths between bases
          const newWalls = [...prev.walls, { position, hp: 2, owner: prev.currentPlayer }];
          
          if (boardHasValidPath(newWalls)) {
            // Subtract energy and place wall
            if (prev.currentPlayer === "red") {
              return {
                ...prev,
                walls: newWalls,
                redEnergy: prev.redEnergy - 2,
                selectedAction: null,
                lastActionWasWall: true,
                actionsDisabled: true // Disable further actions after placing wall
              };
            } else {
              return {
                ...prev,
                walls: newWalls,
                blueEnergy: prev.blueEnergy - 2,
                selectedAction: null,
                lastActionWasWall: true,
                actionsDisabled: true // Disable further actions after placing wall
              };
            }
          } else {
            // Show invalid wall placement
            setInvalidWallCells([position]);
            setTimeout(() => setInvalidWallCells([]), 1000);
          }
        } else {
          // Show invalid wall placement
          setInvalidWallCells([position]);
          setTimeout(() => setInvalidWallCells([]), 1000);
        }
      }
      
      // No action taken, return unchanged state
      return prev;
    });
  }, []);

  // End current turn and switch to next player
  const endTurn = useCallback(() => {
    setGameState(prev => {
      if (prev.gameOver) return prev;
      
      // Switch player and reset actions
      const nextPlayer = prev.currentPlayer === "red" ? "blue" : "red";
      
      return {
        ...prev,
        currentPlayer: nextPlayer,
        selectedAction: null,
        actionsDisabled: false // Re-enable actions for next player
      };
    });
    
    // Reset UI states
    setHighlightedCells([]);
    setAnimatingHit([]);
    setInvalidWallCells([]);
    setHitUsedCount(0);
  }, []);

  // Get valid moves for current player
  const getValidMoves = useCallback((currentPos: Position, opponentPos: Position, walls: any[], player: PlayerType) => {
    const validMoves: Position[] = [];
    const directions = [
      { row: -1, col: 0 }, // up
      { row: 1, col: 0 },  // down
      { row: 0, col: -1 }, // left
      { row: 0, col: 1 }   // right
    ];
    
    // Add valid moves in each direction
    directions.forEach(dir => {
      const newPos = {
        row: currentPos.row + dir.row,
        col: currentPos.col + dir.col
      };
      
      if (isValidMove(currentPos, newPos, opponentPos, walls)) {
        validMoves.push(newPos);
      }
    });
    
    // Check for jump if player hasn't used it yet
    const hasNotUsedJump = player === "red" ? !gameState.redUsedJump : !gameState.blueUsedJump;
    if (hasNotUsedJump) {
      const jumpCell = { row: player === "red" ? 1 : 2, col: 2 };
      if (isValidMove(currentPos, jumpCell, opponentPos, walls)) {
        validMoves.push(jumpCell);
      }
    }
    
    return validMoves;
  }, [gameState.redUsedJump, gameState.blueUsedJump]);

  // Get valid hit targets
  const getValidHitTargets = useCallback((currentPos: Position, opponentPos: Position, walls: any[]) => {
    const validTargets: Position[] = [];
    const directions = [
      { row: -1, col: 0 }, // up
      { row: 1, col: 0 },  // down
      { row: 0, col: -1 }, // left
      { row: 0, col: 1 }   // right
    ];
    
    // Add valid hit targets in each direction
    directions.forEach(dir => {
      const targetPos = {
        row: currentPos.row + dir.row,
        col: currentPos.col + dir.col
      };
      
      if (isValidHitTarget(currentPos, targetPos, opponentPos, walls)) {
        validTargets.push(targetPos);
      }
    });
    
    return validTargets;
  }, []);

  // Get valid wall placements
  const getValidWallPlacements = useCallback((walls: any[]) => {
    const validPlacements: Position[] = [];
    
    // Check all board positions
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const pos = { row, col };
        if (canPlaceWall(pos, walls)) {
          // Check if placing a wall here doesn't block all paths
          const newWalls = [...walls, { position: pos, hp: 2, owner: gameState.currentPlayer }];
          if (boardHasValidPath(newWalls)) {
            validPlacements.push(pos);
          }
        }
      }
    }
    
    return validPlacements;
  }, [gameState.currentPlayer]);

  // Check if player has enough energy for action
  const hasEnoughEnergy = useCallback((action: ActionType) => {
    const currentEnergy = gameState.currentPlayer === "red" 
      ? gameState.redEnergy 
      : gameState.blueEnergy;
    
    if (action === "move") return currentEnergy >= 1;
    if (action === "hit") return currentEnergy >= 1 && hitUsedCount < 1;
    if (action === "wall") return currentEnergy >= 2;
    
    return false;
  }, [gameState, hitUsedCount]);

  // Update game state from database (for multiplayer)
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
  }, []);

  // Sync with database (for multiplayer)
  const syncWithDatabase = useCallback(async (sessionId: string): Promise<void> => {
    // This function would be implemented to sync game state with Supabase
    console.log("[GameLogic] Syncing game state with database, sessionId:", sessionId);
    console.log("[GameLogic] Current player being synced:", gameState.currentPlayer);
    
    // This would call the Supabase function syncGameState from utils/supabase.ts
    return Promise.resolve();
  }, [gameState]);

  const isHitInCooldown = hitUsedCount > 0;

  return {
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
  };
};

export default useGameLogic;
