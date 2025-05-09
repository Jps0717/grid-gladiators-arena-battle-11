
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import { Users, UserPlus, ArrowRight, Loader2 } from "lucide-react";

const Lobby = () => {
  const { createGame, joinGame, isLoading } = useMultiplayer();
  const [gameId, setGameId] = useState<string>("");
  const navigate = useNavigate();

  // Create a new game and navigate to it
  const handleCreateGame = async () => {
    const sessionId = await createGame();
    if (sessionId) {
      navigate(`/game/${sessionId}`);
    }
  };

  // Join an existing game
  const handleJoinGame = async () => {
    if (gameId.trim() === "") return;
    await joinGame(gameId);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-800 to-blue-900 p-4">
      <div className="max-w-md w-full bg-blue-900/50 p-8 rounded-xl border border-blue-400 shadow-xl">
        <h1 className="text-3xl text-center font-bold text-white mb-6">Game Lobby</h1>

        <div className="space-y-6">
          <div>
            <Button
              onClick={handleCreateGame}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white py-3 w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
              Create New Game
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-blue-300/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-blue-900/50 px-2 text-blue-200">OR</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-white text-lg font-medium">Join Existing Game</h2>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter game code"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                className="bg-blue-800/50 border-blue-400 text-white"
              />
              <Button
                onClick={handleJoinGame}
                disabled={isLoading || gameId.trim() === ""}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="border-blue-400 text-blue-100 hover:bg-blue-700/50"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
