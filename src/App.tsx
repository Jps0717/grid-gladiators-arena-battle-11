
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MultiplayerProvider } from "./contexts/MultiplayerContext";
import HomePage from "./pages/HomePage";
import Index from "./pages/Index";
import GameMultiplayer from "./pages/GameMultiplayer";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MultiplayerProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/single-player" element={<Index />} />
            <Route path="/game/:sessionId" element={<GameMultiplayer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MultiplayerProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
