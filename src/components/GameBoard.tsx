
import React from "react";
import Cell from "./Cell";
import GamePiece from "./GamePiece";
import Wall from "./Wall";
import { GameState, Position, CellType } from "../types/gameTypes";
import { getCellClass, positionsEqual, isExtraEnergyCell, isAnyJumpZone, isBaseCell } from "../utils/gameUtils";

interface GameBoardProps {
  gameState: GameState;
  highlightedCells: Position[];
  animatingHit: Position[];
  invalidWallCells?: Position[];
  energyGainPosition?: Position | null;
  onCellClick: (position: Position) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  highlightedCells = [],
  animatingHit = [],
  invalidWallCells = [],
  energyGainPosition = null,
  onCellClick,
}) => {
  const renderBoard = () => {
    const cells = [];

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const position = { row, col };
        const cellType: CellType = getCellClass(position, gameState);

        const isHighlighted = highlightedCells.some(pos => positionsEqual(pos, position));
        const isInvalidWallPlacement = invalidWallCells.some(pos => positionsEqual(pos, position));
        
        const wallAtPosition = gameState.walls.find(wall => positionsEqual(wall.position, position));
        const isAnimatingHit = animatingHit.some(pos => positionsEqual(pos, position));

        const hasRedPlayer = positionsEqual(position, gameState.redPosition);
        const hasBluePlayer = positionsEqual(position, gameState.bluePosition);

        const redWins = gameState.gameOver && gameState.winner === "red";
        const blueWins = gameState.gameOver && gameState.winner === "blue";
        const playersOverlap = positionsEqual(gameState.redPosition, gameState.bluePosition);

        // Determine captured status - a player is captured if there's a winner (game is over)
        const isRedCaptured = gameState.gameOver && gameState.winner === "blue";
        const isBlueCaptured = gameState.gameOver && gameState.winner === "red"; 
        
        // Determine if player is gaining energy (on an energy cell)
        const isRedGainingEnergy = hasRedPlayer && energyGainPosition && positionsEqual(position, energyGainPosition);
        const isBlueGainingEnergy = hasBluePlayer && energyGainPosition && positionsEqual(position, energyGainPosition);

        cells.push(
          <Cell
            key={`${row}-${col}`}
            position={position}
            type={cellType}
            isHighlighted={isHighlighted}
            isAnimatingHit={isAnimatingHit}
            isInvalidWallPlacement={isInvalidWallPlacement}
            hasWall={!!wallAtPosition}
            onClick={onCellClick}
          >
            {wallAtPosition && <Wall wall={wallAtPosition} />}

            {hasBluePlayer && (
              <GamePiece
                key={`blue-${isBlueCaptured ? "captured" : "active"}`}
                player="blue"
                isWinner={blueWins}
                isCaptured={isBlueCaptured}
                isGainingEnergy={isBlueGainingEnergy}
                style={playersOverlap ? { position: 'absolute', zIndex: redWins ? 5 : 10 } : undefined}
              />
            )}
            
            {hasRedPlayer && (
              <GamePiece
                key={`red-${isRedCaptured ? "captured" : "active"}`}
                player="red"
                isWinner={redWins}
                isCaptured={isRedCaptured}
                isGainingEnergy={isRedGainingEnergy}
                style={playersOverlap ? { position: 'absolute', zIndex: blueWins ? 5 : 10 } : undefined}
              />
            )}
          </Cell>
        );
      }
    }

    return cells;
  };

  return (
    <div className="grid grid-cols-5 gap-1 border-4 border-gray-900 rounded-lg overflow-hidden shadow-lg bg-gray-900 p-1">
      {renderBoard()}
    </div>
  );
};

export default GameBoard;
