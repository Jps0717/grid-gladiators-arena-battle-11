
import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMultiplayer } from "../contexts/MultiplayerContext";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";
import { PlayerType } from "../types/gameTypes";

// Define a custom interface for chat messages since it's not in the generated types
interface ChatMessage {
  id: string;
  session_id: string;
  sender_name: string;
  sender_color: string;
  message: string;
  created_at: string;
}

interface GameChatProps {
  sessionId: string;
}

const GameChat: React.FC<GameChatProps> = ({ sessionId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [isMinimized, setIsMinimized] = useState(false);
  const { playerColor } = useMultiplayer();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Subscribe to chat messages
  useEffect(() => {
    if (!sessionId) return;
    
    // Fetch existing messages
    const fetchMessages = async () => {
      // Using the raw query approach to work around TypeScript limitations
      const { data, error } = await supabase
        .from('game_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error("Error fetching chat messages:", error);
        return;
      }
      
      if (data) {
        // Explicitly cast the data to ChatMessage[] to satisfy TypeScript
        setMessages(data as unknown as ChatMessage[]);
      }
    };
    
    fetchMessages();
    
    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(`chat_${sessionId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'game_chat_messages',
          filter: `session_id=eq.${sessionId}` 
        },
        (payload) => {
          setMessages(prevMessages => [...prevMessages, payload.new as unknown as ChatMessage]);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !sessionId || !playerColor) return;
    
    const message = {
      session_id: sessionId,
      sender_name: playerColor === 'red' ? 'Red Player' : 'Blue Player',
      sender_color: playerColor,
      message: newMessage.trim(),
    };
    
    try {
      // Using executeRawQuery instead of the typed API to work around TypeScript limitations
      const { error } = await supabase
        .from('game_chat_messages')
        .insert([message as any]); // Use type assertion to bypass type checking
        
      if (error) throw error;
      
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  
  return (
    <div className={`bg-blue-900/60 border border-blue-400 rounded-lg overflow-hidden transition-all duration-300 ${isMinimized ? 'h-12' : 'h-72'}`}>
      {/* Chat Header */}
      <div 
        className="bg-blue-800 px-3 py-2 flex justify-between items-center cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center">
          <MessageSquare size={16} className="mr-2 text-blue-200" />
          <h3 className="text-white font-medium">Game Chat</h3>
        </div>
        <div className="text-blue-200 text-xs">
          {isMinimized ? 'Expand' : 'Minimize'}
        </div>
      </div>
      
      {/* Chat Messages */}
      {!isMinimized && (
        <>
          <div className="h-48 overflow-y-auto p-3 flex flex-col gap-2">
            {messages.length === 0 ? (
              <div className="text-center text-blue-300 text-sm py-6 italic">
                No messages yet. Say hello to your opponent!
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.sender_color === playerColor ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`rounded-lg px-3 py-2 max-w-[80%] break-words ${
                      msg.sender_color === playerColor
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-800/60 text-blue-100'
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      <div className={`w-2 h-2 rounded-full ${msg.sender_color === 'red' ? 'bg-red-500' : 'bg-blue-500'} mr-1`}></div>
                      <span className="text-xs font-medium">{msg.sender_name}</span>
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-2 flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="bg-blue-800/30 border-blue-600 text-white"
            />
            <Button type="submit" size="sm" className="bg-blue-700 hover:bg-blue-600">
              Send
            </Button>
          </form>
        </>
      )}
    </div>
  );
};

export default GameChat;
