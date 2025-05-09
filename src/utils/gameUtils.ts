import { Position, Wall, CellType, GameState, PlayerType } from "../types/gameTypes";

// Initialize game state
export const initializeGameState = (): GameState => ({
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
});

// Check if two positions are equal
export const positionsEqual = (pos1: Position, pos2: Position): boolean => {
  return pos1.row === pos2.row && pos1.col === pos2.col;
};

// Get the cell type based on position
export const getCellClass = (pos: Position, gameState?: GameState): CellType => {
  // Base cells
  if (pos.row === 3 && pos.col === 2) return "base-red";
  if (pos.row === 0 && pos.col === 2) return "base-blue";
  
  // Jump cells
  if (pos.row === 1 && pos.col === 2) return "jump-red";
  if (pos.row === 2 && pos.col === 2) return "jump-blue";
  
  // Energy cells at the corners
  if ((pos.row === 0 && pos.col === 0) || 
      (pos.row === 0 && pos.col === 4) || 
      (pos.row === 3 && pos.col === 0) || 
      (pos.row === 3 && pos.col === 4)) {
    return "extra-energy";
  }
  
  return "empty";
};

// Check if a position is a jump cell for the given player
export const isJumpCell = (pos: Position, player: PlayerType): boolean => {
  return (player === "red" && pos.row === 1 && pos.col === 2) ||
         (player === "blue" && pos.row === 2 && pos.col === 2);
};

// Check if a position is an energy cell
export const isExtraEnergyCell = (pos: Position): boolean => {
  return (pos.row === 0 && pos.col === 0) || 
         (pos.row === 0 && pos.col === 4) || 
         (pos.row === 3 && pos.col === 0) || 
         (pos.row === 3 && pos.col === 4);
};

// Check if a move is valid
export const isValidMove = (
  currentPos: Position,
  newPos: Position,
  opponentPos: Position,
  walls: Wall[]
): boolean => {
  // Check if out of bounds
  if (newPos.row < 0 || newPos.row > 3 || newPos.col < 0 || newPos.col > 4) {
    return false;
  }
  
  // Check if position is occupied by opponent
  if (positionsEqual(newPos, opponentPos)) {
    return false;
  }
  
  // Check if position contains a wall
  if (walls.some(wall => positionsEqual(wall.position, newPos) && !wall.broken)) {
    return false;
  }
  
  // Check if moving only one cell in any direction (manhattan distance = 1)
  const rowDiff = Math.abs(newPos.row - currentPos.row);
  const colDiff = Math.abs(newPos.col - currentPos.col);
  return (rowDiff + colDiff === 1);
};

// Check if a position is a valid hit target
export const isValidHitTarget = (
  currentPos: Position,
  targetPos: Position,
  opponentPos: Position,
  walls: Wall[]
): boolean => {
  // Check if out of bounds
  if (targetPos.row < 0 || targetPos.row > 3 || targetPos.col < 0 || targetPos.col > 4) {
    return false;
  }
  
  // Check if target is adjacent to current position (manhattan distance = 1)
  const rowDiff = Math.abs(targetPos.row - currentPos.row);
  const colDiff = Math.abs(targetPos.col - currentPos.col);
  if (rowDiff + colDiff !== 1) {
    return false;
  }
  
  // Target can be either opponent or a wall
  return positionsEqual(targetPos, opponentPos) || 
         walls.some(wall => positionsEqual(wall.position, targetPos) && !wall.broken);
};

// Check if a wall can be placed at the given position
export const canPlaceWall = (pos: Position, walls: Wall[]): boolean => {
  // Check if out of bounds
  if (pos.row < 0 || pos.row > 3 || pos.col < 0 || pos.col > 4) {
    return false;
  }
  
  // Check if position already has a wall (broken or not)
  if (walls.some(wall => positionsEqual(wall.position, pos))) {
    return false;
  }
  
  // Cannot place walls on base cells
  if ((pos.row === 0 && pos.col === 2) || (pos.row === 3 && pos.col === 2)) {
    return false;
  }
  
  return true;
};

// Check if the board has a valid path between bases
export const boardHasValidPath = (walls: Wall[]): boolean => {
  // Find all walls that aren't broken
  const intactWalls = walls.filter(wall => !wall.broken);
  
  // Use BFS to find a path from red base to blue base
  const redBase = { row: 3, col: 2 };
  const blueBase = { row: 0, col: 2 };
  
  // BFS queue
  const queue = [redBase];
  // Keep track of visited cells
  const visited: Record<string, boolean> = {};
  visited[`${redBase.row},${redBase.col}`] = true;
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    // Check if reached blue base
    if (positionsEqual(current, blueBase)) {
      return true;
    }
    
    // Explore in all four directions
    const directions = [
      { row: -1, col: 0 }, // up
      { row: 1, col: 0 },  // down
      { row: 0, col: -1 }, // left
      { row: 0, col: 1 }   // right
    ];
    
    for (const dir of directions) {
      const nextPos = {
        row: current.row + dir.row,
        col: current.col + dir.col
      };
      
      // Check if valid cell
      if (nextPos.row < 0 || nextPos.row > 3 || nextPos.col < 0 || nextPos.col > 4) {
        continue;
      }
      
      // Check if already visited
      const key = `${nextPos.row},${nextPos.col}`;
      if (visited[key]) {
        continue;
      }
      
      // Check if wall in the way
      const hasWall = intactWalls.some(wall => positionsEqual(wall.position, nextPos));
      if (hasWall) {
        continue;
      }
      
      // Mark as visited and add to queue
      visited[key] = true;
      queue.push(nextPos);
    }
  }
  
  // No path found
  return false;
};

// NEW EXPORTS BELOW - Adding the missing exports to fix the build errors

// Format time for display (MM:SS)
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Get adjacent positions (up, down, left, right)
export const getAdjacentPositions = (pos: Position): Position[] => {
  const directions = [
    { row: -1, col: 0 }, // up
    { row: 1, col: 0 },  // down
    { row: 0, col: -1 }, // left
    { row: 0, col: 1 }   // right
  ];
  
  return directions
    .map(dir => ({ row: pos.row + dir.row, col: pos.col + dir.col }))
    .filter(newPos => newPos.row >= 0 && newPos.row <= 3 && newPos.col >= 0 && newPos.col <= 4);
};

// Get diagonal positions
export const getDiagonalPositions = (pos: Position): Position[] => {
  const directions = [
    { row: -1, col: -1 }, // up-left
    { row: -1, col: 1 },  // up-right
    { row: 1, col: -1 },  // down-left
    { row: 1, col: 1 }    // down-right
  ];
  
  return directions
    .map(dir => ({ row: pos.row + dir.row, col: pos.col + dir.col }))
    .filter(newPos => newPos.row >= 0 && newPos.row <= 3 && newPos.col >= 0 && newPos.col <= 4);
};

// Get all surrounding positions (adjacent + diagonal)
export const getSurroundingPositions = (pos: Position): Position[] => {
  return [...getAdjacentPositions(pos), ...getDiagonalPositions(pos)];
};

// Find a wall at a specific position
export const findWallAtPosition = (walls: Wall[], pos: Position): Wall | undefined => {
  return walls.find(wall => positionsEqual(wall.position, pos) && !wall.broken);
};

// Check if a position is a base cell
export const isBaseCell = (pos: Position): boolean => {
  return (pos.row === 0 && pos.col === 2) || (pos.row === 3 && pos.col === 2);
};

// Check if a position is any player's jump zone
export const isAnyJumpZone = (pos: Position): boolean => {
  return (pos.row === 1 && pos.col === 2) || (pos.row === 2 && pos.col === 2);
};

// Check if a position is a jump zone for a specific player
export const isPlayerJumpZone = (pos: Position, player: PlayerType): boolean => {
  return (player === "red" && pos.row === 1 && pos.col === 2) ||
         (player === "blue" && pos.row === 2 && pos.col === 2);
};

// Get valid moves, wall placements, and hit targets
export const getValidMoves = (
  gameState: GameState,
  playerPosition: Position,
  isJumpZone: boolean,
  usedJump: boolean
): { moves: Position[], wallPlacements: Position[], hitTargets: Position[] } => {
  const opponentPosition = gameState.currentPlayer === "red" ? gameState.bluePosition : gameState.redPosition;
  
  // Calculate valid moves
  let validMoves = getAdjacentPositions(playerPosition)
    .filter(pos => {
      // Check if the position is occupied by opponent
      if (positionsEqual(pos, opponentPosition)) {
        return false;
      }
      
      // Check if there's a wall
      if (gameState.walls.some(wall => positionsEqual(wall.position, pos) && !wall.broken)) {
        return false;
      }
      
      return true;
    });
  
  // Add diagonal moves if on jump zone and haven't used jump
  if (isJumpZone && !usedJump) {
    validMoves = [
      ...validMoves,
      ...getDiagonalPositions(playerPosition)
        .filter(pos => {
          // Check if the position is occupied by opponent
          if (positionsEqual(pos, opponentPosition)) {
            return false;
          }
          
          // Check if there's a wall
          if (gameState.walls.some(wall => positionsEqual(wall.position, pos) && !wall.broken)) {
            return false;
          }
          
          return true;
        })
    ];
  }
  
  // Calculate valid wall placements
  const validWallPlacements = getAdjacentPositions(playerPosition)
    .filter(pos => {
      // Check if position already has a wall
      if (gameState.walls.some(wall => positionsEqual(wall.position, pos))) {
        return false;
      }
      
      // Cannot place on player positions
      if (positionsEqual(pos, gameState.redPosition) || positionsEqual(pos, gameState.bluePosition)) {
        return false;
      }
      
      // Cannot place on base cells
      if (isBaseCell(pos)) {
        return false;
      }
      
      // Cannot place on jump zones
      if (isAnyJumpZone(pos)) {
        return false;
      }
      
      return true;
    });
  
  // Calculate valid hit targets
  const validHitTargets = getSurroundingPositions(playerPosition)
    .filter(pos => {
      // Can hit opponent
      if (positionsEqual(pos, opponentPosition)) {
        return true;
      }
      
      // Can hit walls
      if (gameState.walls.some(wall => positionsEqual(wall.position, pos) && !wall.broken)) {
        return true;
      }
      
      return false;
    });
  
  return {
    moves: validMoves,
    wallPlacements: validWallPlacements,
    hitTargets: validHitTargets
  };
};
