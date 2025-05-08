
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Set up a scheduled task to clean up stale game sessions
export const setupCleanupCronJob = async (): Promise<boolean> => {
  try {
    // Call the cleanup function
    const { data, error } = await supabase.functions.invoke('cleanup-sessions');
    
    if (error) {
      console.error('Error invoking cleanup function:', error);
      return false;
    }
    
    if (data && data.totalDeleted > 0) {
      // Only notify if games were actually cleaned up
      toast({
        title: "Game Cleanup",
        description: `${data.totalDeleted} stale game sessions were automatically removed`,
      });
    }
    
    console.log('Cleanup result:', data);
    return true;
  } catch (error) {
    console.error('Error setting up cleanup job:', error);
    return false;
  }
};
