
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import { Users, Plus, ArrowRight, Copy, Loader2 } from "lucide-react";

interface GameSession {
  id: string;
  created_at: string;
  status: string;
}

const GameLobby = () => {
  const [games, setGames] = useState<GameSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const { createGame, joinGame, isLoading: isActionLoading } = useMultiplayer();
  const navigate = useNavigate();

  // Fetch available games
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const { data, error } = await supabase
          .from('game_sessions')
          .select('id, created_at, status')
          .eq('status', 'waiting')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setGames(data || []);
      } catch (error) {
        console.error("Error fetching games:", error);
        toast({
          title: "Error loading games",
          description: "Could not load available games. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGames();

    // Set up subscription for real-time updates
    const channel = supabase
      .channel('game_lobby_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions' },
        (payload) => {
          // Refresh the games list when changes occur
          fetchGames();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle create new game
  const handleCreateGame = async () => {
    try {
      const sessionId = await createGame();
      if (sessionId) {
        navigate(`/game/${sessionId}`);
      }
    } catch (error) {
      console.error("Error creating game:", error);
    }
  };

  // Handle join game by code
  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Enter a game code",
        description: "Please enter a valid game code to join",
        variant: "destructive",
      });
      return;
    }

    try {
      const success = await joinGame(joinCode.trim());
      if (!success) {
        toast({
          title: "Could not join game",
          description: "Invalid game code or game is no longer available",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error joining game:", error);
    }
  };

  // Join existing game from list
  const handleJoinGame = async (sessionId: string) => {
    try {
      const success = await joinGame(sessionId);
      if (!success) {
        // Refresh games list if join failed
        setGames(prevGames => prevGames.filter(game => game.id !== sessionId));
        toast({
          title: "Could not join game",
          description: "This game is no longer available",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error joining game:", error);
    }
  };

  // Copy game code to clipboard
  const copyGameCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopySuccess(true);
    toast({
      title: "Game code copied!",
      description: "Share this code with your friend to join",
    });
    
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-800 to-blue-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Grid Gladiators Lobby</h1>
          <Button
            onClick={handleCreateGame}
            disabled={isActionLoading}
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
          >
            {isActionLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
              </>
            ) : (
              <>
                <Plus size={18} /> Create New Game
              </>
            )}
          </Button>
        </div>

        {/* Join by code */}
        <div className="bg-blue-900/50 p-4 rounded-lg border border-blue-400 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Join by Code</h2>
          <div className="flex gap-3">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter game code"
              className="bg-blue-800/30 border-blue-600 text-white"
            />
            <Button
              onClick={handleJoinByCode}
              disabled={isActionLoading || !joinCode.trim()}
              className="bg-blue-700 hover:bg-blue-600 px-6"
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining...
                </>
              ) : (
                "Join"
              )}
            </Button>
          </div>
        </div>

        {/* Available games list */}
        <div className="bg-blue-900/50 p-4 rounded-lg border border-blue-400">
          <h2 className="text-xl font-semibold text-white mb-4">Available Games</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-200"></div>
              <p className="text-blue-200 mt-2">Loading available games...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8 text-blue-200">
              <Users size={48} className="mx-auto mb-2 opacity-50" />
              <p>No games available. Create a new game to get started!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {games.map((game) => (
                <div 
                  key={game.id} 
                  className="bg-blue-800/40 border border-blue-500 rounded-lg p-4 hover:bg-blue-800/60 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-mono text-blue-200">#{game.id.substring(0, 8)}...</h3>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyGameCode(game.id)}
                          className="text-blue-300 hover:bg-blue-700/30 p-1 ml-1"
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                      <p className="text-xs text-blue-300 mt-1">
                        Created {new Date(game.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleJoinGame(game.id)}
                      disabled={isActionLoading}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500"
                    >
                      {isActionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ArrowRight size={16} className="mr-1" />
                          Join
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameLobby;
