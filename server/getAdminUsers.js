import { createClient } from "@supabase/supabase-js";

export async function getAdminUsersHandler(req, res) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: "Supabase configuration missing" });
    }

    // Verify the requesting user is authenticated
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check admin role
    const { data: roleData } = await userSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return res.status(403).json({ error: "Admin access required" });
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "SERVICE_ROLE_KEY_MISSING" });
    }

    // Use admin API to list all users
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all users in batches (Supabase returns max 1000 per page)
    let allUsers = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data: { users: batch }, error: listError } = await adminSupabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) throw listError;
      if (!batch || batch.length === 0) break;

      allUsers = allUsers.concat(batch);
      if (batch.length < perPage) break;
      page++;
    }

    // Also fetch profiles and roles from database
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, created_at");

    const { data: roles } = await adminSupabase
      .from("user_roles")
      .select("user_id, role");

    const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
    const rolesMap = new Map((roles || []).map(r => [r.user_id, r.role]));

    const usersWithDetails = allUsers.map(u => ({
      id: u.id,
      email: u.email || "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
      profile: profilesMap.get(u.id) || null,
      role: rolesMap.get(u.id) || "user",
    }));

    return res.json({ users: usersWithDetails });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return res.status(500).json({ error: errorMessage });
  }
}
