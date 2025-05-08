
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
        return "bg-red-200";
      case "base-blue":
        return "bg-blue-200";
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
        isHighlighted && "ring-2 ring-game-highlight ring-opacity-70 shadow-lg",
        isHighlighted && "after:absolute after:inset-0 after:bg-yellow-100/30 after:rounded",
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
          <div className="text-yellow-600 w-7 h-7 opacity-80">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.8401 10.94C19.5701 10.64 19.1401 10.5 18.7701 10.6L14.0001 11.7201V7.51012C14.0001 7.06012 13.7501 6.65012 13.3601 6.44012C12.9701 6.23012 12.5001 6.25012 12.1301 6.48012L5.13007 11.48C4.78007 11.71 4.58007 12.08 4.60007 12.51C4.62007 12.92 4.86007 13.2701 5.21007 13.4701L9.54007 15.8401L7.59007 21.2901C7.41007 21.7601 7.52007 22.3 7.88007 22.6401C8.08007 22.8401 8.34007 22.9401 8.60007 22.9401C8.81007 22.9401 9.02007 22.8801 9.21007 22.7601L17.7101 16.9301C18.0801 16.6801 18.3101 16.2601 18.3001 15.8001C18.2901 15.3401 18.0501 14.9401 17.6501 14.7001L13.9101 12.5001L18.5901 11.9401C18.9601 11.8901 19.2801 11.6501 19.4401 11.3101C19.6101 10.9601 19.6101 10.5601 19.3801 10.2501L19.8401 10.94Z" />
            </svg>
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
