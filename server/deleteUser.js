import { createClient } from "@supabase/supabase-js";

export async function deleteUserHandler(req, res) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(400).json({ error: "No authorization header" });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: "Supabase configuration missing" });
    }

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return res.status(400).json({ error: "Unauthorized" });

    const { data: roleData } = await userSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) return res.status(400).json({ error: "Admin access required" });

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    if (userId === user.id) return res.status(400).json({ error: "Cannot delete your own account" });

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Service role key not configured" });
    }

    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return res.status(400).json({ error: errorMessage });
  }
}
