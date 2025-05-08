
import { useState } from "react";
import { Position } from "../../types/gameTypes";

export const useGameAnimations = () => {
  const [highlightedCells, setHighlightedCells] = useState<Position[]>([]);
  const [animatingHit, setAnimatingHit] = useState<Position[]>([]);
  const [energyGainAnimation, setEnergyGainAnimation] = useState<boolean>(false);
  
  // Function to animate energy gain
  const animateEnergyGain = () => {
    setEnergyGainAnimation(true);
    setTimeout(() => {
      setEnergyGainAnimation(false);
    }, 1200); // Match the duration of the CSS animation
  };
  
  // Function to play sound effects (placeholder for now)
  const playSound = (type: 'move' | 'hit' | 'wall' | 'energy' | 'win' | 'turn') => {
    // In a real implementation, this would play actual sounds
    console.log(`Playing sound: ${type}`);
  };
  
  return {
    highlightedCells,
    setHighlightedCells,
    animatingHit,
    setAnimatingHit,
    energyGainAnimation,
    animateEnergyGain,
    playSound
  };
};
