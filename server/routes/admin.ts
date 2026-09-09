// Admin-only routes. Service-role credentials are read on the server only.
import type { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "../config";

export async function handleDeleteUser(req: Request, res: Response) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(400).json({ error: "No authorization header" });

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { data: roleData } = await userSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) return res.status(403).json({ error: "Admin access required" });

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    if (userId === user.id) return res.status(400).json({ error: "Cannot delete your own account" });

    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    res.status(400).json({ error: errorMessage });
  }
}

export async function handleGetAdminUsers(req: Request, res: Response) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ error: "No authorization header" });

    // 요청자가 관리자인지 확인
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { data: roleData } = await userSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    if (!roleData) return res.status(403).json({ error: "Admin access required" });

    // 서비스 롤 키로 RLS 우회하여 profiles 전체 읽기
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [profilesResult, rolesResult] = await Promise.all([
      adminSupabase
        .from("profiles")
        .select("id, email, full_name, username, created_at")
        .order("created_at", { ascending: false }),
      adminSupabase
        .from("user_roles")
        .select("user_id, role"),
    ]);

    if (profilesResult.error) throw profilesResult.error;

    const rolesMap = new Map((rolesResult.data || []).map(r => [r.user_id, r.role]));

    const users = (profilesResult.data || []).map(p => ({
      id: p.id,
      email: (p as any).email || "",
      created_at: p.created_at || "",
      last_sign_in_at: null,
      profile: {
        full_name: p.full_name || null,
        username: p.username || null,
      },
      role: (rolesMap.get(p.id) || "user") as "admin" | "elder" | "user",
    }));

    res.json({ users });
  } catch (error) {
    console.error("admin/users error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}
