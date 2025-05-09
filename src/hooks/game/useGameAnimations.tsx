
import { useState, useCallback } from "react";
import { Position } from "../../types/gameTypes";

export const useGameAnimations = () => {
  const [highlightedCells, setHighlightedCells] = useState<Position[]>([]);
  const [animatingHit, setAnimatingHit] = useState<Position[]>([]);
  const [energyGainAnimation, setEnergyGainAnimation] = useState<boolean>(false);
  
  // Function to animate energy gain
  const animateEnergyGain = useCallback(() => {
    setEnergyGainAnimation(true);
    
    // Reset animation state after a delay
    setTimeout(() => {
      setEnergyGainAnimation(false);
    }, 1000);
  }, []);
  
  // Helper function to play sound effects (placeholder for now)
  const playSound = useCallback((type: 'move' | 'hit' | 'wall' | 'energy' | 'win' | 'turn') => {
    console.log(`Playing sound: ${type}`);
    // In a real implementation, this would use the Web Audio API or an audio library
  }, []);
  
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
