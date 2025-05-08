
import React from "react";
import { Position, CellType } from "../types/gameTypes";
import { cn } from "@/lib/utils";

interface CellProps {
  position: Position;
  type: CellType;
  isHighlighted: boolean;
  isAnimatingHit: boolean;
  hasWall: boolean;
  onClick: (position: Position) => void;
  children?: React.ReactNode;
}

const Cell: React.FC<CellProps> = ({
  position,
  type,
  isHighlighted,
  isAnimatingHit,
  hasWall,
  onClick,
  children,
}) => {
  // Determine base style based on cell type
  const getCellBaseStyle = () => {
    switch (type) {
      case "base-red":
        return "bg-game-red/20";
      case "base-blue":
        return "bg-game-blue/20";
      case "jump-red":
        return "bg-red-200";
      case "jump-blue":
        return "bg-blue-200";
      case "extra-energy":
        return "bg-game-energy/30";
      default:
        return "bg-white";
    }
  };

  return (
    <div
      className={cn(
        "aspect-square relative flex items-center justify-center cursor-pointer transition-all duration-200",
        getCellBaseStyle(),
        isHighlighted && "ring-2 ring-game-highlight shadow-md",
        isHighlighted && "after:absolute after:inset-0 after:bg-yellow-100/40 after:rounded",
        hasWall && "bg-opacity-60"
      )}
      onClick={() => onClick(position)}
      data-position={`${position.row}-${position.col}`}
    >
      {/* Special cell type indicators */}
      {type === "jump-red" && (
        <div className="absolute w-full h-full flex items-center justify-center opacity-30">
          <div className="w-6 h-6 border-2 border-game-red rounded-full"></div>
        </div>
      )}
      {type === "jump-blue" && (
        <div className="absolute w-full h-full flex items-center justify-center opacity-30">
          <div className="w-6 h-6 border-2 border-game-blue rounded-full"></div>
        </div>
      )}
      {type === "extra-energy" && (
        <div className="absolute w-full h-full flex items-center justify-center">
          <div className="w-7 h-7 animate-pulse text-yellow-500 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]">
            ⚡
          </div>
        </div>
      )}
      
      {/* Hit animation */}
      {isAnimatingHit && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-red-500 animate-hit-wave opacity-70"></div>
        </div>
      )}
      
      {children}
    </div>
  );
};

export default Cell;
