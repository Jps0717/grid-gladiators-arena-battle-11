
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
        "absolute inset-2 flex items-center justify-center transition-all rounded-md",
        wall.broken && "hidden"
      )}
    >
      <div 
        className={cn(
          "w-full h-full flex items-center justify-center text-sm font-bold rounded-md shadow-md",
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
            <div className="w-full h-full overflow-hidden rounded-md">
              {/* Organic cracks based on the example image */}
              <div className="absolute top-[40%] left-[5%] right-[30%] h-[2px] bg-black opacity-80" 
                style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)", transform: "rotate(2deg) scaleY(0.8)" }}>
              </div>
              
              <div className="absolute top-[30%] right-[15%] w-[2px] h-[45%] bg-black opacity-80"
                style={{ clipPath: "polygon(0 0, 100% 8%, 100% 100%, 0% 92%)", transform: "rotate(15deg)" }}>
              </div>
              
              <div className="absolute top-[20%] left-[35%] w-[1.5px] h-[35%] bg-black opacity-70"
                style={{ clipPath: "polygon(0 10%, 100% 0, 100% 100%, 0% 90%)", transform: "rotate(-10deg)" }}>
              </div>
              
              <div className="absolute bottom-[20%] left-[25%] right-[40%] h-[2px] bg-black opacity-75"
                style={{ clipPath: "polygon(0 0, 100% 30%, 100% 100%, 0% 70%)", transform: "rotate(-3deg) scaleY(0.7)" }}>
              </div>
              
              {/* Small hairline cracks */}
              <div className="absolute top-[55%] right-[30%] w-[1px] h-[20%] bg-black opacity-60"
                style={{ transform: "rotate(25deg)" }}>
              </div>
              <div className="absolute top-[35%] left-[40%] w-[1px] h-[15%] bg-black opacity-50"
                style={{ transform: "rotate(-20deg)" }}>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wall;
