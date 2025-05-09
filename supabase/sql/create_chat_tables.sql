
-- Create a table for chat messages in game sessions
CREATE TABLE IF NOT EXISTS public.game_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_color TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on the messages table
ALTER TABLE public.game_chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages for a specific session
CREATE POLICY "Anyone can read chat messages for a session"
ON public.game_chat_messages
FOR SELECT
USING (true);

-- Allow anyone to insert chat messages
CREATE POLICY "Anyone can insert chat messages"
ON public.game_chat_messages
FOR INSERT
WITH CHECK (true);

-- Add realtime support for the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_chat_messages;
