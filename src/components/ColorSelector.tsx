
import React from 'react';
import { Button } from "@/components/ui/button";
import { PlayerType } from '../types/gameTypes';

interface ColorSelectorProps {
  availableColors: PlayerType[];
  onSelectColor: (color: PlayerType) => void;
  selectedColor: PlayerType | null;
  opponentColor: PlayerType | null;
  isHost: boolean;
}

const ColorSelector = ({ 
  availableColors, 
  onSelectColor, 
  selectedColor, 
  opponentColor,
  isHost
}: ColorSelectorProps) => {
  return (
    <div className="bg-blue-900/50 p-8 rounded-lg border border-blue-400">
      <h2 className="text-2xl font-bold text-white text-center mb-6">
        Choose Your Color
      </h2>
      
      <div className="flex flex-col space-y-6">
        {opponentColor && (
          <div className="text-center">
            <p className="text-blue-200 mb-2">Opponent has chosen:</p>
            <div className={`inline-block w-20 h-20 rounded-full ${opponentColor === "red" ? "bg-red-600" : "bg-blue-600"} border-4 border-white`}></div>
          </div>
        )}
        
        <div className="flex justify-center space-x-6">
          <ColorButton 
            color="red" 
            onSelect={() => onSelectColor("red")} 
            isSelected={selectedColor === "red"}
            isDisabled={!availableColors.includes("red")}
          />
          <ColorButton 
            color="blue" 
            onSelect={() => onSelectColor("blue")} 
            isSelected={selectedColor === "blue"}
            isDisabled={!availableColors.includes("blue")}
          />
        </div>
        
        {selectedColor ? (
          <div className="text-center mt-4">
            <p className="text-blue-200">You've selected:</p>
            <p className={`text-xl font-bold ${selectedColor === "red" ? "text-red-400" : "text-blue-400"} mt-1`}>
              {selectedColor === "red" ? "Red" : "Blue"}
            </p>
            <p className="text-blue-200 mt-4">
              {opponentColor ? 
                "Game will start when both players are ready" : 
                "Waiting for opponent to choose a color..."}
            </p>
          </div>
        ) : (
          <p className="text-blue-200 text-center">
            {isHost ? 
              "As the host, you get to choose first" : 
              "Your opponent has created the game, now choose your color"}
          </p>
        )}
      </div>
    </div>
  );
};

interface ColorButtonProps {
  color: PlayerType;
  onSelect: () => void;
  isSelected: boolean;
  isDisabled: boolean;
}

const ColorButton = ({ color, onSelect, isSelected, isDisabled }: ColorButtonProps) => {
  return (
    <Button
      onClick={onSelect}
      disabled={isDisabled}
      className={`
        w-24 h-24 rounded-full p-0 transition-all
        ${color === "red" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
        ${isSelected ? "ring-4 ring-white ring-offset-2 ring-offset-blue-900" : ""}
        ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}
      `}
      aria-label={`Select ${color} color`}
    />
  );
};

export default ColorSelector;
