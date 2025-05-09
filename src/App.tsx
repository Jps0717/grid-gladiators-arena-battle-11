
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MultiplayerProvider } from "./contexts/MultiplayerContext";
import { useEffect } from "react";
import { setupCleanupCronJob } from "./utils/setupCronJob";
import HomePage from "./pages/HomePage";
import Index from "./pages/Index";
import GameMultiplayer from "./pages/GameMultiplayer";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Run cleanup job when app loads
  useEffect(() => {
    // Run cleanup every 12 hours
    const runCleanup = () => {
      console.log("Running scheduled cleanup job");
      setupCleanupCronJob().catch(console.error);
    };

    // Run once when app loads
    runCleanup();
    
    // Set up interval (12 hours)
    const cleanupInterval = setInterval(runCleanup, 12 * 60 * 60 * 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(cleanupInterval);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MultiplayerProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/local" element={<Index />} />
              <Route path="/game/:sessionId" element={<GameMultiplayer />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MultiplayerProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
