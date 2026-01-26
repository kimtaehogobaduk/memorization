import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useTutorial = () => {
  const { user } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTutorialStatus = async () => {
      if (!user) {
        // For non-logged-in users, check localStorage
        const completed = localStorage.getItem("tutorial_completed");
        setHasCompletedTutorial(completed === "true");
        setShowTutorial(completed !== "true");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_settings")
          .select("has_completed_tutorial")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching tutorial status:", error);
          setLoading(false);
          return;
        }

        if (data) {
          setHasCompletedTutorial(data.has_completed_tutorial ?? false);
          setShowTutorial(!data.has_completed_tutorial);
        } else {
          // No settings found, show tutorial
          setHasCompletedTutorial(false);
          setShowTutorial(true);
        }
      } catch (error) {
        console.error("Error checking tutorial status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkTutorialStatus();
  }, [user]);

  const completeTutorial = async () => {
    setShowTutorial(false);
    setHasCompletedTutorial(true);

    if (!user) {
      localStorage.setItem("tutorial_completed", "true");
      return;
    }

    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_settings")
          .update({ has_completed_tutorial: true })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("user_settings")
          .insert({ user_id: user.id, has_completed_tutorial: true });
      }
    } catch (error) {
      console.error("Error saving tutorial status:", error);
    }
  };

  const closeTutorial = () => {
    setShowTutorial(false);
  };

  const restartTutorial = () => {
    setShowTutorial(true);
  };

  const resetTutorial = async () => {
    setHasCompletedTutorial(false);
    
    if (!user) {
      localStorage.removeItem("tutorial_completed");
      return;
    }

    try {
      await supabase
        .from("user_settings")
        .update({ has_completed_tutorial: false })
        .eq("user_id", user.id);
    } catch (error) {
      console.error("Error resetting tutorial status:", error);
    }
  };

  return {
    showTutorial,
    hasCompletedTutorial,
    loading,
    completeTutorial,
    closeTutorial,
    restartTutorial,
    resetTutorial
  };
};
