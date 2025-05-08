
import React, { useState } from "react";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Swords, Users, User, ArrowRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const { createGame, joinGame, isLoading } = useMultiplayer();
  const [gameCode, setGameCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();
  
  // We know Supabase is now configured
  const isSupabaseConfigured = true;
  
  const handleCreateGame = async () => {
    await createGame();
  };
  
  const handleJoinGame = async () => {
    if (!gameCode.trim()) return;
    await joinGame(gameCode.trim());
  };
  
  const handlePlaySingleplayer = () => {
    navigate("/single-player");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-800 to-blue-900 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Tactical Grid</h1>
          <p className="text-blue-200">A strategic board game of movement and walls</p>
        </div>
        
        {isJoining ? (
          <div className="bg-blue-700/40 p-6 rounded-lg border border-blue-500">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <Users className="mr-2" />
              Join a Game
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-blue-200 block mb-1">Game Code</label>
                <Input
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value)}
                  placeholder="Enter game code"
                  className="bg-blue-900/50 border-blue-500 text-white placeholder:text-blue-300"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsJoining(false)}
                  variant="outline"
                  className="flex-1 border-blue-400 text-white"
                >
                  Back
                </Button>
                <Button
                  onClick={handleJoinGame}
                  disabled={!gameCode.trim() || isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
                >
                  {isLoading ? "Joining..." : "Join Game"}
                  {!isLoading && <ArrowRight size={16} />}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              onClick={handlePlaySingleplayer}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg flex items-center justify-center h-auto"
            >
              <User className="mr-2 h-5 w-5" />
              <span className="text-lg">Single Player Mode</span>
            </Button>
            
            <Button
              onClick={handleCreateGame}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex items-center justify-center h-auto"
            >
              <Swords className="mr-2 h-5 w-5" />
              <span className="text-lg">
                {isLoading ? "Creating Game..." : "Create Multiplayer Game"}
              </span>
            </Button>
            
            <Button
              onClick={() => setIsJoining(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg flex items-center justify-center h-auto"
            >
              <Users className="mr-2 h-5 w-5" />
              <span className="text-lg">Join Multiplayer Game</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
