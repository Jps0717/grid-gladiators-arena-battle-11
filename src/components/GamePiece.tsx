
import React from "react";
import { PlayerType } from "../types/gameTypes";
import { cn } from "@/lib/utils";

interface GamePieceProps {
  player: PlayerType;
  isWinner?: boolean;
  isCaptured?: boolean;
  isGainingEnergy?: boolean;
  style?: React.CSSProperties;
}

const GamePiece: React.FC<GamePieceProps> = ({
  player,
  isWinner = false,
  isCaptured = false,
  isGainingEnergy = false,
  style = {},
}) => {
  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
        player === "red" ? "bg-game-red" : "bg-game-blue",
        isWinner && "ring-2 ring-yellow-300 shadow-lg scale-110",
        isCaptured && "opacity-50 scale-75",
        isGainingEnergy && "animate-pulse-energy"
      )}
      style={style}
    >
      <div className={cn(
        "w-4 h-4 rounded-full", 
        player === "red" ? "bg-red-300" : "bg-blue-300",
        isWinner && "bg-yellow-200"
      )}></div>
    </div>
  );
};

export default GamePiece;
