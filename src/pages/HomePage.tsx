
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-800 to-blue-900 p-4">
      <div className="text-center max-w-lg">
        <h1 className="text-5xl font-bold text-white mb-6">Grid Combat</h1>
        <p className="text-blue-200 mb-12 text-lg">
          A strategic two-player grid-based game of movement and capture
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link to="/lobby">
            <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6">
              Play Online
            </Button>
          </Link>
          
          <Link to="/local">
            <Button size="lg" variant="outline" className="w-full border-blue-400 text-blue-100 hover:bg-blue-700/50 text-lg py-6">
              Play Local
            </Button>
          </Link>
        </div>
        
        <p className="text-blue-300 text-sm">
          Play against friends online or challenge yourself in local mode
        </p>
      </div>
    </div>
  );
};

export default HomePage;
