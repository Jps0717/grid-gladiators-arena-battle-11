
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlayerType } from "../types/gameTypes";
import { formatTime } from "../utils/gameUtils";
import { Home } from "lucide-react";

interface VictoryStatsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  stats: {
    winner: PlayerType;
    roundDuration: number;
    movesMade: {
      red: number;
      blue: number;
    };
    wallsPlaced: {
      red: number;
      blue: number;
    };
    wallsBroken: number;
    hitCount: {
      red: number;
      blue: number;
    };
  };
  onReturnHome?: () => void;
  autoReturnTimeout?: number;
  isMultiplayer?: boolean;
  isWinner?: boolean;
}

const VictoryStats: React.FC<VictoryStatsProps> = ({
  isOpen,
  onOpenChange,
  stats,
  onReturnHome,
  autoReturnTimeout = 0,
  isMultiplayer = false,
  isWinner = false,
}) => {
  const [countdown, setCountdown] = useState(autoReturnTimeout);
  
  // Auto-return countdown
  useEffect(() => {
    if (!isOpen || autoReturnTimeout <= 0) return;
    
    setCountdown(autoReturnTimeout);
    
    const timer = setInterval(() => {
      setCountdown(prevCount => {
        if (prevCount <= 1) {
          clearInterval(timer);
          if (onReturnHome) onReturnHome();
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isOpen, autoReturnTimeout, onReturnHome]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {isMultiplayer && isWinner ? (
              <span className="text-green-600 font-bold">YOU WIN!</span>
            ) : isMultiplayer && !isWinner ? (
              <span className="text-red-600 font-bold">YOU LOSE!</span>
            ) : (
              <span className={`font-bold ${stats.winner === 'red' ? 'text-game-red' : 'text-game-blue'}`}>
                {stats.winner?.toUpperCase()}
              </span>
            )}
            {!isMultiplayer && " WINS!"}
          </DialogTitle>
          <DialogDescription className="text-center">
            Game Statistics
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 my-4">
          <div className="col-span-2 bg-gray-100 p-3 rounded-lg">
            <p className="text-center font-medium">Round Duration: {formatTime(stats.roundDuration)}</p>
          </div>
          
          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="font-medium">Moves Made:</p>
            <div className="flex justify-between">
              <span className="text-game-red">Red: {stats.movesMade.red}</span>
              <span className="text-game-blue">Blue: {stats.movesMade.blue}</span>
            </div>
          </div>
          
          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="font-medium">Walls Placed:</p>
            <div className="flex justify-between">
              <span className="text-game-red">Red: {stats.wallsPlaced.red}</span>
              <span className="text-game-blue">Blue: {stats.wallsPlaced.blue}</span>
            </div>
          </div>
          
          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="font-medium">Hit Count:</p>
            <div className="flex justify-between">
              <span className="text-game-red">Red: {stats.hitCount.red}</span>
              <span className="text-game-blue">Blue: {stats.hitCount.blue}</span>
            </div>
          </div>
          
          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="font-medium">Walls Broken:</p>
            <p>{stats.wallsBroken}</p>
          </div>
        </div>
        
        {onReturnHome && (
          <div className="flex justify-center">
            <Button 
              onClick={onReturnHome}
              className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              <Home size={18} />
              Return to Home
              {autoReturnTimeout > 0 && countdown > 0 && (
                <span className="ml-1 text-xs bg-blue-800 px-2 py-0.5 rounded-full">
                  {countdown}s
                </span>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VictoryStats;
