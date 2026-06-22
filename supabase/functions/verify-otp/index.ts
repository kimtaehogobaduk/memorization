// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { email, purpose, code, payload } = body || {};
    if (!email || !purpose || !code) {
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const code_hash = await sha256(String(code));

    const { data: row, error: selErr } = await admin
      .from("otp_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("purpose", purpose)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selErr) throw selErr;
    if (!row) return new Response(JSON.stringify({ error: "코드가 만료되었거나 찾을 수 없어요." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (new Date(row.expires_at).getTime() < Date.now()) {
      await admin.from("otp_codes").update({ used: true }).eq("id", row.id);
      return new Response(JSON.stringify({ error: "코드가 만료되었어요. 다시 요청해주세요." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (row.attempts >= 5) {
      await admin.from("otp_codes").update({ used: true }).eq("id", row.id);
      return new Response(JSON.stringify({ error: "시도 횟수를 초과했어요. 다시 요청해주세요." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (row.code_hash !== code_hash) {
      await admin.from("otp_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      return new Response(JSON.stringify({ error: "코드가 일치하지 않아요." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark used
    await admin.from("otp_codes").update({ used: true }).eq("id", row.id);

    if (purpose === "signup") {
      const password = payload?.password;
      const full_name = payload?.full_name ?? "";
      if (!password || String(password).length < 6) {
        return new Response(JSON.stringify({ error: "비밀번호가 유효하지 않아요." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (cErr) {
        return new Response(JSON.stringify({ error: cErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true, user_id: created.user?.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (purpose === "recovery") {
      const newPassword = payload?.new_password;
      if (!newPassword || String(newPassword).length < 6) {
        return new Response(JSON.stringify({ error: "새 비밀번호가 유효하지 않아요." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const u = list?.users?.find((x: any) => (x.email || "").toLowerCase() === normalizedEmail);
      if (!u) return new Response(JSON.stringify({ error: "사용자를 찾을 수 없어요." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error: uErr } = await admin.auth.admin.updateUserById(u.id, { password: newPassword });
      if (uErr) return new Response(JSON.stringify({ error: uErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (purpose === "device_verify") {
      // Authenticate caller via JWT to get user_id
      const authz = req.headers.get("Authorization") || "";
      const token = authz.replace(/^Bearer\s+/i, "");
      if (!token) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
      const { data: ud, error: uErr } = await userClient.auth.getUser();
      if (uErr || !ud?.user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if ((ud.user.email || "").toLowerCase() !== normalizedEmail) {
        return new Response(JSON.stringify({ error: "이메일이 일치하지 않아요." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const device_id = payload?.device_id;
      const device_name = payload?.device_name ?? null;
      if (!device_id) return new Response(JSON.stringify({ error: "missing device" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error: insErr } = await admin.from("trusted_devices").upsert(
        { user_id: ud.user.id, device_id, device_name, last_seen_at: new Date().toISOString() },
        { onConflict: "user_id,device_id" }
      );
      if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "invalid purpose" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("verify-otp", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
