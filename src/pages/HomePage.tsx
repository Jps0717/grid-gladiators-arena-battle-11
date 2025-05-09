
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Users, UserX, Zap } from "lucide-react";

const HomePage = () => {
  const { createGame, isLoading, sessionId } = useMultiplayer();
  const navigate = useNavigate();
  
  const handleCreateGame = async () => {
    const newSessionId = await createGame();
    if (newSessionId) {
      navigate(`/game/${newSessionId}`);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-800 to-blue-900 p-4">
      <div className="max-w-md w-full space-y-8 bg-blue-900/50 p-8 rounded-xl border border-blue-400 shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Grid Battle</h1>
          <p className="text-blue-200 mt-2">A strategic board game of energy and walls</p>
        </div>
        
        <div className="space-y-4">
          <Link to="/local">
            <Button 
              variant="outline" 
              className="w-full py-6 bg-blue-800/50 border-blue-400 hover:bg-blue-700 text-white flex items-center justify-between"
            >
              <div className="flex items-center">
                <UserX className="h-5 w-5 mr-3" />
                <span className="text-lg">Play Local Game</span>
              </div>
              <ArrowRight className="ml-2" />
            </Button>
          </Link>
          
          <Button 
            onClick={handleCreateGame}
            disabled={isLoading}
            className="w-full py-6 bg-green-700 hover:bg-green-600 text-white flex items-center justify-between"
          >
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-3" />
              <span className="text-lg">Create Online Game</span>
            </div>
            <ArrowRight className="ml-2" />
          </Button>
          
          <Link to="/lobby">
            <Button 
              variant="outline" 
              className="w-full py-6 bg-blue-800/50 border-blue-400 hover:bg-blue-700 text-white flex items-center justify-between"
            >
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-3" />
                <span className="text-lg">Join Online Game</span>
              </div>
              <ArrowRight className="ml-2" />
            </Button>
          </Link>
          
          <Link to="/realtimetest">
            <Button 
              variant="outline" 
              className="w-full py-6 bg-purple-800/50 border-purple-400 hover:bg-purple-700 text-white flex items-center justify-between"
            >
              <div className="flex items-center">
                <Zap className="h-5 w-5 mr-3" />
                <span className="text-lg">Realtime Test</span>
              </div>
              <ArrowRight className="ml-2" />
            </Button>
          </Link>
        </div>
        
        <div className="text-blue-300 text-sm text-center pt-4">
          <p>Made with Supabase Realtime</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
