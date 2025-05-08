
import React from "react";
import { Position, CellType } from "../types/gameTypes";
import { cn } from "@/lib/utils";
import { Zap, X } from "lucide-react";

interface CellProps {
  position: Position;
  type: CellType;
  isHighlighted: boolean;
  isAnimatingHit: boolean;
  hasWall: boolean;
  isInvalidWallPlacement?: boolean;
  onClick: (position: Position) => void;
  children?: React.ReactNode;
}

const Cell: React.FC<CellProps> = ({
  position,
  type,
  isHighlighted,
  isAnimatingHit,
  hasWall,
  isInvalidWallPlacement = false,
  onClick,
  children,
}) => {
  // Determine base style based on cell type
  const getCellBaseStyle = () => {
    switch (type) {
      case "base-red":
        return "bg-red-800"; // Darker red for base
      case "base-blue":
        return "bg-blue-800"; // Darker blue for base
      case "jump-red":
        return "bg-red-100";
      case "jump-blue":
        return "bg-blue-100";
      case "extra-energy":
        return "bg-yellow-300";
      default:
        return "bg-white";
    }
  };

  return (
    <div
      className={cn(
        "aspect-square relative flex items-center justify-center cursor-pointer transition-all duration-200 border border-gray-800",
        getCellBaseStyle(),
        isHighlighted && !isInvalidWallPlacement && "ring-2 ring-game-highlight ring-opacity-70 shadow-lg",
        isHighlighted && !isInvalidWallPlacement && "after:absolute after:inset-0 after:bg-yellow-100/30 after:rounded",
        isInvalidWallPlacement && "ring-2 ring-red-500 ring-opacity-70",
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
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap size={20} className="text-yellow-600 animate-pulse-energy" />
        </div>
      )}
      
      {/* Invalid wall placement indicator */}
      {isInvalidWallPlacement && (
        <div className="absolute inset-0 flex items-center justify-center z-10 animate-pulse">
          <X size={24} className="text-red-600 stroke-[3]" />
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
