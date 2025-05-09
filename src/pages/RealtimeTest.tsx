import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Users, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createGameSession, joinGameSession } from "@/utils/supabase";

// Define the game state type
type GameState = {
  players: Record<string, {
    position: { x: number, y: number },
    color: string,
    score: number
  }>;
};

// Define our custom presence type to avoid TypeScript errors
interface PlayerPresence {
  user: string;
  online_at: string;
  player_data?: {
    position: { x: number, y: number };
    color: string;
    score: number;
  }
}

const RealtimeTest = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isJoiningSession, setIsJoiningSession] = useState(false);
  const [gameState, setGameState] = useState<GameState>({ players: {} });
  const [playerColor, setPlayerColor] = useState<string>(() => {
    // Generate a random color for this player
    const colors = ['red', 'blue', 'green', 'purple', 'orange'];
    return colors[Math.floor(Math.random() * colors.length)];
  });
  const boardRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const [playerId] = useState(`player_${Math.random().toString(36).substring(2, 9)}`);
  const [collectibles, setCollectibles] = useState<{id: string, x: number, y: number}[]>([]);
  const [gameStarted, setGameStarted] = useState(false);

  // Handle creating a new game session
  const handleCreateSession = async () => {
    setIsCreatingSession(true);
    try {
      const newSessionId = await createGameSession();
      if (newSessionId) {
        toast({
          title: "Game session created!",
          description: "Share the code with a friend to join.",
        });
        navigate(`/realtimetest/${newSessionId}`);
      } else {
        toast({
          title: "Failed to create session",
          description: "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating session:", error);
      toast({
        title: "Error",
        description: "Failed to create game session",
        variant: "destructive",
      });
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Handle joining an existing game session
  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameCode) return;
    
    setIsJoiningSession(true);
    try {
      const success = await joinGameSession(gameCode);
      if (success) {
        navigate(`/realtimetest/${gameCode}`);
      }
    } catch (error) {
      console.error("Error joining session:", error);
      toast({
        title: "Error",
        description: "Failed to join game session",
        variant: "destructive",
      });
    } finally {
      setIsJoiningSession(false);
    }
  };

  // Copy session ID to clipboard
  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId);
      toast({
        title: "Game code copied!",
        description: "Share this code with your friend to join the game",
      });
    }
  };

  // Generate a new collectible at a random position
  const generateCollectible = () => {
    if (!boardRef.current) return null;
    
    const boardWidth = boardRef.current.clientWidth;
    const boardHeight = boardRef.current.clientHeight;
    
    return {
      id: `collectible_${Math.random().toString(36).substring(2, 9)}`,
      x: Math.floor(Math.random() * (boardWidth - 20)),
      y: Math.floor(Math.random() * (boardHeight - 20))
    };
  };

  // Add new collectibles to the game
  const spawnCollectibles = () => {
    if (!channelRef.current || !gameStarted) return;
    
    const newCollectible = generateCollectible();
    if (newCollectible) {
      // Broadcast the new collectible to all players
      channelRef.current.send({
        type: 'broadcast',
        event: 'spawn_collectible',
        payload: { collectible: newCollectible }
      });
    }
  };

  // Start the game
  const startGame = () => {
    if (!channelRef.current) return;
    
    setGameStarted(true);
    
    // Spawn initial collectibles
    for (let i = 0; i < 5; i++) {
      const collectible = generateCollectible();
      if (collectible) {
        setCollectibles(prev => [...prev, collectible]);
      }
    }
    
    // Broadcast game start
    channelRef.current.send({
      type: 'broadcast',
      event: 'game_started',
      payload: { collectibles }
    });
    
    toast({
      title: "Game started!",
      description: "Collect the dots to score points!",
    });
  };

  // Move player with keyboard controls
  useEffect(() => {
    if (!sessionId || !channelRef.current || !gameStarted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameState.players[playerId]) return;
      
      const speed = 15;
      const currentPos = gameState.players[playerId].position;
      let newPos = { ...currentPos };
      
      switch (e.key) {
        case 'ArrowUp':
          newPos.y = Math.max(0, currentPos.y - speed);
          break;
        case 'ArrowDown':
          newPos.y = Math.min(boardRef.current?.clientHeight || 500, currentPos.y + speed);
          break;
        case 'ArrowLeft':
          newPos.x = Math.max(0, currentPos.x - speed);
          break;
        case 'ArrowRight':
          newPos.x = Math.min(boardRef.current?.clientWidth || 500, currentPos.x + speed);
          break;
      }
      
      // Only send update if position changed
      if (newPos.x !== currentPos.x || newPos.y !== currentPos.y) {
        // Update local state immediately for responsive feel
        setGameState(prev => ({
          ...prev,
          players: {
            ...prev.players,
            [playerId]: {
              ...prev.players[playerId],
              position: newPos
            }
          }
        }));
        
        // Broadcast position update
        channelRef.current.send({
          type: 'broadcast',
          event: 'player_move',
          payload: { 
            playerId,
            position: newPos
          }
        });
        
        // Check for collectible collisions
        checkCollectibleCollisions(newPos);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sessionId, gameState, playerId, gameStarted]);

  // Check if player collects any collectibles
  const checkCollectibleCollisions = (position: {x: number, y: number}) => {
    if (!channelRef.current) return;
    
    const collisionRadius = 15;
    const collected = collectibles.filter(c => {
      const distance = Math.sqrt(
        Math.pow(position.x - c.x, 2) + Math.pow(position.y - c.y, 2)
      );
      return distance < collisionRadius;
    });
    
    if (collected.length > 0) {
      // Remove collected items
      const remainingCollectibles = collectibles.filter(
        c => !collected.some(col => col.id === c.id)
      );
      
      // Update score
      const newScore = (gameState.players[playerId]?.score || 0) + collected.length;
      
      // Broadcast score update
      channelRef.current.send({
        type: 'broadcast',
        event: 'collect_item',
        payload: { 
          playerId,
          collectedIds: collected.map(c => c.id),
          newScore
        }
      });
      
      // If all collectibles are collected, spawn more
      if (remainingCollectibles.length < 2) {
        setTimeout(spawnCollectibles, 1000);
      }
    }
  };

  // Set up realtime channel when sessionId is available
  useEffect(() => {
    if (!sessionId) return;

    // Create a realtime channel for this game session
    const channel = supabase.channel(`game_board_${sessionId}`);
    channelRef.current = channel;

    // Set up handlers for game events
    channel
      .on('broadcast', { event: 'player_move' }, (payload) => {
        const { playerId: movingPlayerId, position } = payload.payload;
        
        if (movingPlayerId !== playerId) { // Don't process our own broadcasts
          setGameState(prev => ({
            ...prev,
            players: {
              ...prev.players,
              [movingPlayerId]: {
                ...prev.players[movingPlayerId],
                position
              }
            }
          }));
        }
      })
      .on('broadcast', { event: 'game_started' }, (payload) => {
        if (!gameStarted) {
          setGameStarted(true);
          if (payload.payload.collectibles) {
            setCollectibles(payload.payload.collectibles);
          }
          toast({
            title: "Game started by another player",
            description: "Collect the dots to score points!",
          });
        }
      })
      .on('broadcast', { event: 'spawn_collectible' }, (payload) => {
        const { collectible } = payload.payload;
        if (collectible) {
          setCollectibles(prev => [...prev, collectible]);
        }
      })
      .on('broadcast', { event: 'collect_item' }, (payload) => {
        const { playerId: scoringPlayerId, collectedIds, newScore } = payload.payload;
        
        // Remove collected items
        setCollectibles(prev => prev.filter(c => !collectedIds.includes(c.id)));
        
        // Update player score
        setGameState(prev => ({
          ...prev,
          players: {
            ...prev.players,
            [scoringPlayerId]: {
              ...prev.players[scoringPlayerId],
              score: newScore
            }
          }
        }));
        
        // Show toast if another player collected
        if (scoringPlayerId !== playerId) {
          toast({
            title: "Point scored!",
            description: `Player ${scoringPlayerId.substring(7)} got a point!`,
          });
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        console.log('Presence state updated:', presenceState);
        
        // Convert presence state to game state
        Object.keys(presenceState).forEach(key => {
          // Cast the presenceState to our custom type
          const userPresence = presenceState[key][0] as unknown as PlayerPresence;
          
          if (userPresence && userPresence.player_data) {
            setGameState(prev => ({
              ...prev,
              players: {
                ...prev.players,
                [userPresence.user]: {
                  position: userPresence.player_data.position,
                  color: userPresence.player_data.color,
                  score: userPresence.player_data.score || 0
                }
              }
            }));
          }
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Player joined:', key, newPresences);
        
        // Cast to our custom type
        const presence = newPresences[0] as unknown as PlayerPresence;
        
        toast({
          title: "Player joined",
          description: `${presence.user} has joined the game`,
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Player left:', key, leftPresences);
        
        // Cast to our custom type
        const presence = leftPresences[0] as unknown as PlayerPresence;
        
        // Remove player from game state
        if (presence && presence.user) {
          setGameState(prev => {
            const newPlayers = { ...prev.players };
            delete newPlayers[presence.user];
            return { ...prev, players: newPlayers };
          });
        }
        
        toast({
          title: "Player left",
          description: `${presence.user} has left the game`,
        });
      })
      .subscribe(async (status) => {
        console.log(`Subscription status for game board: ${status}`);
        if (status === 'SUBSCRIBED') {
          // Set initial position
          const initialPosition = {
            x: Math.floor(Math.random() * 300) + 50,
            y: Math.floor(Math.random() * 200) + 50
          };
          
          // Update local game state
          setGameState(prev => ({
            ...prev,
            players: {
              ...prev.players,
              [playerId]: {
                position: initialPosition,
                color: playerColor,
                score: 0
              }
            }
          }));
          
          // Track this player's presence with game data
          await channel.track({
            user: playerId,
            online_at: new Date().toISOString(),
            player_data: {
              position: initialPosition,
              color: playerColor,
              score: 0
            }
          });
        }
      });

    return () => {
      console.log("Cleaning up realtime channel");
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [sessionId, playerId, playerColor]);

  // Update presence data when player data changes
  useEffect(() => {
    if (!channelRef.current || !sessionId || !playerId || !gameState.players[playerId]) return;
    
    const playerData = gameState.players[playerId];
    
    channelRef.current.track({
      user: playerId,
      online_at: new Date().toISOString(),
      player_data: {
        position: playerData.position,
        color: playerData.color,
        score: playerData.score || 0
      }
    });
    
  }, [sessionId, playerId, gameState.players[playerId]]);

  // Render different UI depending on whether we're in a game session
  if (!sessionId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-800 to-blue-900 p-4">
        <div className="bg-blue-900/70 p-8 rounded-lg border border-blue-400 max-w-md w-full">
          <h1 className="text-2xl font-bold text-white text-center mb-6">Realtime Game</h1>
          
          <div className="space-y-6">
            <div className="text-center">
              <Button 
                onClick={handleCreateSession}
                disabled={isCreatingSession}
                className="bg-blue-600 hover:bg-blue-700 w-full"
              >
                {isCreatingSession ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create New Game"
                )}
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="bg-gray-500/20 h-px flex-grow"></div>
              <span className="text-blue-200 text-sm">OR</span>
              <div className="bg-gray-500/20 h-px flex-grow"></div>
            </div>
            
            <form onSubmit={handleJoinSession}>
              <div className="space-y-3">
                <Input
                  type="text"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value)}
                  placeholder="Enter game code"
                  className="bg-blue-800/30 border-blue-600 text-white"
                />
                <Button 
                  type="submit"
                  disabled={isJoiningSession || !gameCode}
                  className="bg-green-600 hover:bg-green-700 w-full"
                >
                  {isJoiningSession ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join Game"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-blue-800 to-blue-900 p-4">
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button 
            onClick={() => navigate("/realtimetest")}
            variant="outline"
            className="border-blue-400 text-blue-100 hover:bg-blue-700/50"
          >
            Back
          </Button>
          
          <div className="flex items-center bg-blue-700/50 px-3 py-1 rounded-lg">
            <span className="text-sm font-mono text-white mr-2">Game Code: {sessionId}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-blue-600 p-1 h-6 w-6"
              onClick={copySessionId}
            >
              <Copy size={14} />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: playerColor }}
            />
            <span className="text-white text-sm">You</span>
          </div>
        </div>
        
        {/* Scoreboard */}
        <div className="bg-blue-900/50 p-3 rounded-lg mb-4">
          <h3 className="text-center text-white text-lg mb-2">Scoreboard</h3>
          <div className="flex justify-center gap-4">
            {Object.entries(gameState.players).map(([id, player]) => (
              <div key={id} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: player.color }}
                />
                <span className="text-white">
                  {id === playerId ? 'You' : `Player ${id.substring(7)}`}: {player.score || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="relative">
          {/* Game board */}
          <div 
            ref={boardRef}
            className="bg-slate-800 border-2 border-blue-500 rounded-lg h-[500px] w-full overflow-hidden relative"
            tabIndex={0} // Make the div focusable for keyboard events
          >
            {/* Collectibles */}
            {collectibles.map(collectible => (
              <div
                key={collectible.id}
                className="absolute w-5 h-5 rounded-full bg-yellow-400 animate-pulse"
                style={{
                  left: `${collectible.x}px`,
                  top: `${collectible.y}px`
                }}
              />
            ))}
            
            {/* Players */}
            {Object.entries(gameState.players).map(([id, player]) => (
              <div 
                key={id}
                className={`absolute w-8 h-8 rounded-full flex items-center justify-center transition-all duration-100 ${id === playerId ? 'ring-2 ring-white' : ''}`}
                style={{ 
                  left: `${player.position.x}px`, 
                  top: `${player.position.y}px`,
                  backgroundColor: player.color,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <span className="text-xs text-white font-bold">
                  {id === playerId ? 'You' : id.substring(7, 9)}
                </span>
              </div>
            ))}
            
            {/* Game instructions overlay */}
            {Object.keys(gameState.players).length > 0 && !gameStarted && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                <h2 className="text-white text-2xl mb-4">Collection Game</h2>
                <p className="text-blue-200 mb-6">Use arrow keys to move. Collect yellow dots for points!</p>
                <Button 
                  onClick={startGame}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Start Game
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 text-center text-white">
          <p>Use arrow keys to move your player</p>
        </div>
      </div>
    </div>
  );
};

export default RealtimeTest;
