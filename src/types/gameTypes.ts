
export type PlayerType = "red" | "blue";

export type Position = {
  row: number;
  col: number;
};

export type ActionType = "move" | "hit" | "wall";

export type CellType = "empty" | "base-red" | "base-blue" | "jump-red" | "jump-blue" | "extra-energy";

export type Wall = {
  position: Position;
  hp: number;
  owner: PlayerType;
  broken?: boolean;
};

export type GameState = {
  currentPlayer: PlayerType;
  redPosition: Position;
  bluePosition: Position;
  walls: Wall[];
  redEnergy: number;
  blueEnergy: number;
  redUsedJump: boolean;
  blueUsedJump: boolean;
  selectedAction: ActionType | null;
  gameOver: boolean;
  winner: PlayerType | null;
  lastActionWasWall: boolean;
  actionsDisabled: boolean;
};

export type ValidMoves = {
  moves: Position[];
  wallPlacements: Position[];
  hitTargets: Position[];
};

export type PlayerData = {
  id: string;
  color: string;
  display_name: string;
  session_id: string | null;
  created_at: string;
  last_activity?: string;
  has_left?: boolean;
};
