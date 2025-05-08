
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
              {/* Main horizontal crack */}
              <div className="absolute top-[45%] left-0 h-[3px] w-full bg-gray-900 transform -translate-y-1/2 skew-y-3">
                <div className="absolute top-[-1px] left-[30%] h-[1px] w-[40%] bg-gray-700"></div>
                <div className="absolute bottom-[-1px] left-[20%] h-[1px] w-[30%] bg-gray-700"></div>
              </div>
              
              {/* Left crack */}
              <div className="absolute top-0 left-[30%] h-full w-[2px] bg-gray-900 transform -rotate-[15deg]">
                <div className="absolute top-[40%] -left-[2px] h-[20%] w-[1px] bg-gray-700 transform rotate-[30deg]"></div>
              </div>
              
              {/* Right crack */}
              <div className="absolute top-[20%] right-[25%] h-[80%] w-[2px] bg-gray-900 transform rotate-[12deg]">
                <div className="absolute top-[30%] -right-[2px] h-[15%] w-[1px] bg-gray-700 transform -rotate-[25deg]"></div>
              </div>
              
              {/* Small diagonal cracks */}
              <div className="absolute top-[15%] left-[60%] h-[25%] w-[1px] bg-gray-800 transform rotate-[35deg]"></div>
              <div className="absolute bottom-[20%] left-[15%] h-[15%] w-[1px] bg-gray-800 transform -rotate-[20deg]"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wall;
