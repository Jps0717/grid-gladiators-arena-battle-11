
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Users, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createGameSession, joinGameSession } from "@/utils/supabase";

const RealtimeTest = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isJoiningSession, setIsJoiningSession] = useState(false);
  const [cursorPositions, setCursorPositions] = useState<Record<string, { x: number, y: number, color: string }>>({});
  const [playerColor, setPlayerColor] = useState<string>(() => {
    // Generate a random color for this player
    const colors = ['red', 'blue', 'green', 'purple', 'orange'];
    return colors[Math.floor(Math.random() * colors.length)];
  });
  const boardRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const [playerId] = useState(`player_${Math.random().toString(36).substring(2, 9)}`);

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

  // Set up realtime channel when sessionId is available
  useEffect(() => {
    if (!sessionId) return;

    // Create a realtime channel for this game session
    const channel = supabase.channel(`game_board_${sessionId}`);
    channelRef.current = channel;

    // Set up broadcast to share cursor positions
    channel
      .on('broadcast', { event: 'cursor_move' }, (payload) => {
        const { senderId, x, y, color } = payload.payload;
        
        if (senderId !== playerId) { // Don't process our own broadcasts
          setCursorPositions(prev => ({
            ...prev,
            [senderId]: { x, y, color }
          }));
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        console.log('Presence state updated:', presenceState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
        toast({
          title: "Player joined",
          description: `${key} has joined the game`,
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
        // Remove cursor when user leaves
        setCursorPositions(prev => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
        toast({
          title: "Player left",
          description: `${key} has left the game`,
        });
      })
      .subscribe(async (status) => {
        console.log(`Subscription status for game board: ${status}`);
        if (status === 'SUBSCRIBED') {
          // Track this user's presence once subscribed
          await channel.track({
            user: playerId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      console.log("Cleaning up realtime channel");
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [sessionId, playerId]);

  // Handle mouse movement on the game board
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!sessionId || !boardRef.current || !channelRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100; // Convert to percentage
    const y = ((e.clientY - rect.top) / rect.height) * 100; // Convert to percentage

    // Broadcast cursor position to channel
    channelRef.current.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: { 
        senderId: playerId,
        x, 
        y,
        color: playerColor
      }
    });
  };

  // Render different UI depending on whether we're in a game session
  if (!sessionId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-800 to-blue-900 p-4">
        <div className="bg-blue-900/70 p-8 rounded-lg border border-blue-400 max-w-md w-full">
          <h1 className="text-2xl font-bold text-white text-center mb-6">Realtime Game Board Test</h1>
          
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
        
        <div className="relative">
          <div 
            ref={boardRef}
            className="bg-slate-800 border-2 border-blue-500 rounded-lg h-[500px] w-full overflow-hidden"
            onMouseMove={handleMouseMove}
          >
            {/* Display other players' cursors */}
            {Object.entries(cursorPositions).map(([id, { x, y, color }]) => (
              <div 
                key={id}
                className="absolute pointer-events-none"
                style={{ 
                  left: `${x}%`, 
                  top: `${y}%`, 
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="flex flex-col items-center">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <div className="bg-black/70 text-white text-xs rounded px-2 py-1 mt-1">
                    Player {id.substring(0, 4)}
                  </div>
                </div>
              </div>
            ))}
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-center">
                <h2 className="text-xl font-bold mb-2">Realtime Test</h2>
                <p className="text-blue-200">Move your cursor around to see real-time updates</p>
                <p className="text-blue-200 mt-4">Share your game code with others to join!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeTest;
