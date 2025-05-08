
import React from "react";
import { PlayerType } from "../types/gameTypes";
import { cn } from "@/lib/utils";

interface EnergyBatteryProps {
  currentEnergy: number;
  maxEnergy: number;
  playerColor: PlayerType;
}

const EnergyBattery: React.FC<EnergyBatteryProps> = ({
  currentEnergy,
  maxEnergy,
  playerColor,
}) => {
  // Generate the energy cells
  const renderEnergyCells = () => {
    const cells = [];
    
    for (let i = 0; i < maxEnergy; i++) {
      const isActive = i < currentEnergy;
      cells.push(
        <div 
          key={i}
          className={cn(
            "w-12 h-12 border-2 rounded-lg flex items-center justify-center transition-all duration-300",
            playerColor === "red" 
              ? "border-game-red" 
              : "border-game-blue",
            isActive 
              ? playerColor === "red" 
                ? "bg-game-red" 
                : "bg-game-blue" 
              : "bg-transparent"
          )}
        >
          {isActive && (
            <div 
              className={cn(
                "w-6 h-6 rounded-full animate-pulse", 
                playerColor === "red" ? "bg-red-300" : "bg-blue-300"
              )}
            />
          )}
        </div>
      );
    }
    
    return cells;
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="text-white font-bold">Energy:</div>
      <div className="flex space-x-2">
        {renderEnergyCells()}
      </div>
    </div>
  );
};

export default EnergyBattery;
