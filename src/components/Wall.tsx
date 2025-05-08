
import React from "react";
import { Wall as WallType } from "../types/gameTypes";
import { cn } from "@/lib/utils";

interface WallProps {
  wall: WallType;
}

const Wall: React.FC<WallProps> = ({ wall }) => {
  return (
    <div 
      className={cn(
        "absolute inset-0 flex items-center justify-center transition-all",
        wall.broken && "hidden"
      )}
    >
      <div 
        className={cn(
          "w-full h-full flex items-center justify-center text-sm font-bold",
          wall.hp === 2 ? (
            wall.owner === "red" ? "bg-game-red/90 text-white" : "bg-game-blue/90 text-white"
          ) : (
            "bg-gray-500/95 text-white"
          )
        )}
      >
        {/* Wall HP */}
        <div className="z-10">{wall.hp}</div>
        
        {/* Cracks overlay for damaged walls */}
        {wall.hp === 1 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-full overflow-hidden">
              {/* Left crack */}
              <div className="absolute top-0 left-1/4 h-full w-0.5 bg-gray-800 transform -rotate-12"></div>
              
              {/* Right crack */}
              <div className="absolute top-1/4 right-1/3 h-3/4 w-0.5 bg-gray-800 transform rotate-12"></div>
              
              {/* Horizontal crack */}
              <div className="absolute top-1/2 left-0 h-0.5 w-full bg-gray-800 transform -translate-y-1/2 skew-y-3"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wall;
