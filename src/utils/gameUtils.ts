
import { Position, PlayerType, GameState, ValidMoves, Wall, CellType } from "../types/gameTypes";

// Format seconds into MM:SS format
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Get the base cells coordinates
export const getBaseCells = (): { redBase: Position; blueBase: Position } => ({
  redBase: { row: 0, col: 0 },
  blueBase: { row: 3, col: 4 }
});

// Get the jump zone cells coordinates
export const getJumpZones = (): { redJumps: Position[]; blueJumps: Position[] } => ({
  redJumps: [
    { row: 1, col: 0 },  // Red's first jump cell at (1,0)
    { row: 0, col: 1 }   // Red's second jump cell at (0,1)
  ],
  blueJumps: [
    { row: 2, col: 4 },  // Blue's first jump cell at (2,4)
    { row: 3, col: 3 }   // Blue's second jump cell at (3,3)
  ]
});

// Get the extra energy cells coordinates
export const getExtraEnergyCells = (): Position[] => [
  { row: 0, col: 4 },
  { row: 3, col: 0 }  // The second extra energy cell at bottom left
];

// Check if a position is an extra energy cell
export const isExtraEnergyCell = (pos: Position): boolean => {
  const extraEnergyCells = getExtraEnergyCells();
  return extraEnergyCells.some(cell => positionsEqual(cell, pos));
};

// Check if two positions are equal
export const positionsEqual = (pos1: Position, pos2: Position): boolean => {
  return pos1.row === pos2.row && pos1.col === pos2.col;
};

// Check if a position exists in an array of positions
export const positionInArray = (pos: Position, posArray: Position[]): boolean => {
  return posArray.some(p => positionsEqual(p, pos));
};

// Check if a position is within the board boundaries
export const isWithinBoard = (pos: Position): boolean => {
  return pos.row >= 0 && pos.row <= 3 && pos.col >= 0 && pos.col <= 4;
};

// Get the adjacent positions (orthogonally)
export const getAdjacentPositions = (pos: Position): Position[] => {
  const directions = [
    { row: -1, col: 0 }, // up
    { row: 1, col: 0 },  // down
    { row: 0, col: -1 }, // left
    { row: 0, col: 1 }   // right
  ];
  
  return directions
    .map(dir => ({
      row: pos.row + dir.row,
      col: pos.col + dir.col
    }))
    .filter(isWithinBoard);
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
    .map(dir => ({
      row: pos.row + dir.row,
      col: pos.col + dir.col
    }))
    .filter(isWithinBoard);
};

// Get all surrounding positions (adjacent + diagonal)
export const getSurroundingPositions = (pos: Position): Position[] => {
  const adjacent = getAdjacentPositions(pos);
  const diagonal = getDiagonalPositions(pos);
  
  return [...adjacent, ...diagonal];
};

// Get allowed diagonal positions from jump zones (only to other jump zones)
export const getJumpDiagonalPositions = (pos: Position, player: PlayerType): Position[] => {
  const { redJumps, blueJumps } = getJumpZones();
  const playerJumps = player === "red" ? redJumps : blueJumps;
  
  // If not on a jump zone, no diagonal jumps are allowed
  if (!positionInArray(pos, playerJumps)) {
    return [];
  }
  
  // Get all possible diagonal positions
  const allDiagonals = getDiagonalPositions(pos);
  
  // When on a jump zone, we want to allow jumps to the other jump zone of the same player
  return allDiagonals.filter(diagPos => 
    positionInArray(diagPos, playerJumps) && !positionsEqual(diagPos, pos)
  );
};

// Check if a position is a jump zone for any player
export const isAnyJumpZone = (pos: Position): boolean => {
  const { redJumps, blueJumps } = getJumpZones();
  return positionInArray(pos, redJumps) || positionInArray(pos, blueJumps);
};

// Find a wall at a specific position
export const findWallAtPosition = (walls: Wall[], pos: Position): Wall | undefined => {
  return walls.find(wall => positionsEqual(wall.position, pos));
};

// Check if a position is a base cell
export const isBaseCell = (pos: Position): boolean => {
  const { redBase, blueBase } = getBaseCells();
  return positionsEqual(pos, redBase) || positionsEqual(pos, blueBase);
};

// Calculate valid moves for a player
export const getValidMoves = (
  state: GameState,
  playerPosition: Position,
  isJumpZone: boolean,
  usedJump: boolean
): ValidMoves => {
  const validMoves: ValidMoves = {
    moves: [],
    wallPlacements: [],
    hitTargets: [],
  };
  
  // Calculate valid movement positions
  const adjacentPositions = getAdjacentPositions(playerPosition);
  validMoves.moves = adjacentPositions.filter(pos => {
    // Cannot move to a cell with a wall
    if (findWallAtPosition(state.walls, pos)) return false;
    
    // Can move to opponent's position (to capture)
    return true;
  });
  
  // Add diagonal moves if on jump zone and haven't used jump this turn
  if (isJumpZone && !usedJump) {
    const jumpDiagonalPositions = getJumpDiagonalPositions(playerPosition, state.currentPlayer);
    const validDiagonalMoves = jumpDiagonalPositions.filter(pos => {
      // Cannot move to a cell with a wall
      if (findWallAtPosition(state.walls, pos)) return false;
      
      // Can move to opponent's position (to capture)
      return true;
    });
    
    validMoves.moves = [...validMoves.moves, ...validDiagonalMoves];
  }
  
  // Calculate valid wall placement positions
  validMoves.wallPlacements = adjacentPositions.filter(pos => {
    // Cannot place a wall where there is already a wall
    if (findWallAtPosition(state.walls, pos)) return false;
    
    // Cannot place a wall on the opponent's position
    const opponentPosition = state.currentPlayer === "red" ? state.bluePosition : state.redPosition;
    if (positionsEqual(pos, opponentPosition)) return false;
    
    // Cannot place a wall on your own position
    if (positionsEqual(pos, playerPosition)) return false;
    
    // Cannot place a wall on any base cell
    if (isBaseCell(pos)) return false;
    
    // Cannot place a wall on any jump zone cell (red or blue)
    if (isAnyJumpZone(pos)) return false;
    
    return true;
  });
  
  // Calculate valid hit targets
  const surroundingPositions = getSurroundingPositions(playerPosition); // Use surrounding (adjacent + diagonal) positions
  validMoves.hitTargets = surroundingPositions.filter(pos => {
    // Can only hit walls
    const wallAtPosition = findWallAtPosition(state.walls, pos);
    return !!wallAtPosition;
  });
  
  return validMoves;
};

// Initialize a new game state
export const initializeGameState = (): GameState => {
  const { redBase, blueBase } = getBaseCells();
  
  // Randomly decide who goes first
  const randomStartingPlayer: PlayerType = Math.random() > 0.5 ? "red" : "blue";
  
  return {
    currentPlayer: randomStartingPlayer,
    redPosition: { ...redBase },
    bluePosition: { ...blueBase },
    walls: [],
    redEnergy: 1,
    blueEnergy: 1,
    redUsedJump: false,
    blueUsedJump: false,
    selectedAction: null,
    gameOver: false,
    winner: null,
    lastActionWasWall: false,
    actionsDisabled: false,
  };
};

// Get CSS class for a cell based on its position
export const getCellClass = (pos: Position, gameState: GameState): CellType => {
  const { redBase, blueBase } = getBaseCells();
  const { redJumps, blueJumps } = getJumpZones();
  
  // Check if this is a base cell
  if (positionsEqual(pos, redBase)) return "base-red";
  if (positionsEqual(pos, blueBase)) return "base-blue";
  
  // Check if this is a jump zone, now differentiating between team colors
  if (positionInArray(pos, redJumps)) return "jump-red";
  if (positionInArray(pos, blueJumps)) return "jump-blue";
  
  // Check if this is an extra energy cell
  if (isExtraEnergyCell(pos)) return "extra-energy";
  
  return "empty";
};

// Check if a position is a jump zone for the current player
export const isPlayerJumpZone = (pos: Position, player: PlayerType): boolean => {
  const { redJumps, blueJumps } = getJumpZones();
  
  if (player === "red" && positionInArray(pos, redJumps)) return true;
  if (player === "blue" && positionInArray(pos, blueJumps)) return true;
  
  return false;
};

