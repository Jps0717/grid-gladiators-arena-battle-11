
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import { Users, UserPlus, ArrowRight, Loader2, Copy, Check } from "lucide-react";

const Lobby = () => {
  const { createGame, joinGame, isLoading, sessionId } = useMultiplayer();
  const [gameId, setGameId] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Create a new game and navigate to it
  const handleCreateGame = async () => {
    const newSessionId = await createGame();
    if (newSessionId) {
      setCreatedGameId(newSessionId);
      navigate(`/game/${newSessionId}`);
    }
  };

  // Join an existing game
  const handleJoinGame = async () => {
    if (gameId.trim() === "") return;
    await joinGame(gameId);
  };

  // Copy game ID to clipboard
  const copyToClipboard = () => {
    if (createdGameId) {
      navigator.clipboard.writeText(createdGameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-800 to-blue-900 p-4">
      <div className="max-w-md w-full bg-blue-900/50 p-8 rounded-xl border border-blue-400 shadow-xl">
        <h1 className="text-3xl text-center font-bold text-white mb-6">Game Lobby</h1>

        {createdGameId && (
          <div className="mb-6 p-4 bg-blue-800/70 rounded-lg border border-blue-500">
            <h2 className="text-lg text-blue-200 mb-2">Share this game code with a friend:</h2>
            <div className="flex items-center">
              <code className="bg-blue-800 p-2 rounded text-white flex-1 overflow-x-auto">
                {createdGameId}
              </code>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={copyToClipboard}
                className="ml-2 text-blue-200"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

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
