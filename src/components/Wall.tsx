
import React from "react";
import { Wall as WallType } from "../types/gameTypes";
import { cn } from "@/lib/utils";

interface WallProps {
  wall: WallType;
}

const Wall: React.FC<WallProps> = ({ wall }) => {
  // Calculate opacity based on HP (at HP=1, we want it to look damaged)
  const opacity = wall.hp < 2 ? 0.6 : 0.9;

  return (
    <div 
      className={cn(
        "absolute inset-0 border-4 flex items-center justify-center transition-all",
        wall.owner === "red" ? "border-game-red" : "border-game-blue",
        wall.broken && "hidden"
      )}
      style={{ opacity }}
    >
      <div 
        className={cn(
          "w-full h-full flex items-center justify-center text-sm font-bold",
          wall.owner === "red" ? "text-game-red" : "text-game-blue"
        )}
      >
        {wall.hp}
      </div>
    </div>
  );
};

export default Wall;
