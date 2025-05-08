
import { supabase } from "@/integrations/supabase/client";

// Set up a scheduled task to clean up stale game sessions
export const setupCleanupCronJob = async (): Promise<boolean> => {
  try {
    // Call the cleanup function manually once
    const { data, error } = await supabase.functions.invoke('cleanup-sessions');
    
    if (error) {
      console.error('Error invoking cleanup function:', error);
      return false;
    }
    
    console.log('Manual cleanup result:', data);
    return true;
  } catch (error) {
    console.error('Error setting up cleanup job:', error);
    return false;
  }
};
