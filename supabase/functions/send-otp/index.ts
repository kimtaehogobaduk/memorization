// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY")!;
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

// UTF-8 safe base64 (for Korean subject/body)
function b64Utf8(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64UrlUtf8(s: string) {
  return b64Utf8(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function encodeSubject(s: string) {
  return `=?UTF-8?B?${b64Utf8(s)}?=`;
}
function buildRawEmail(to: string, subject: string, html: string) {
  const msg = [
    `From: 암기준섹 <me>`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    b64Utf8(html),
  ].join("\r\n");
  return b64UrlUtf8(msg);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generate6() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, "0");
}

function emailHtml(code: string, purposeLabel: string) {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><title>암기준섹 인증코드</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(30,64,175,0.12);">
        <tr><td style="background:linear-gradient(135deg,#60a5fa 0%,#a78bfa 50%,#f472b6 100%);padding:36px 24px;text-align:center;">
          <div style="font-size:56px;line-height:1;">📚✨</div>
          <h1 style="margin:14px 0 4px;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">암기준섹</h1>
          <p style="margin:0;color:rgba(255,255,255,0.95);font-size:14px;font-weight:600;">준섹이가 보낸 인증코드 💙</p>
        </td></tr>
        <tr><td style="padding:36px 32px 12px;">
          <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">${purposeLabel}</h2>
          <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">아래 6자리 코드를 입력해주세요. 코드는 <strong>10분간</strong> 유효해요.</p>
        </td></tr>
        <tr><td align="center" style="padding:24px 32px 8px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#eff6ff,#fdf4ff);border:2px dashed #a78bfa;border-radius:16px;padding:22px 32px;">
            <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:42px;font-weight:800;letter-spacing:14px;color:#4338ca;">${code}</div>
          </div>
        </td></tr>
        <tr><td style="padding:20px 32px 32px;">
          <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.6;">이 요청을 본인이 하지 않았다면 이 메일을 무시해주세요. 누군가 회원님의 이메일을 잘못 입력했을 수 있어요.</p>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;">— 준섹이 드림 🐥</p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 32px;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:11px;">© 암기준섹 · 즐겁게 재미있게 학습</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const purposeMap: Record<string, { label: string; subject: string }> = {
  signup: { label: "회원가입을 마무리해요!", subject: "[암기준섹] 회원가입 인증코드" },
  recovery: { label: "비밀번호 재설정 인증", subject: "[암기준섹] 비밀번호 재설정 코드" },
  device_verify: { label: "새 기기 로그인 확인", subject: "[암기준섹] 새 기기 로그인 인증코드" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email, purpose, metadata } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "invalid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!purposeMap[purpose]) {
      return new Response(JSON.stringify({ error: "invalid purpose" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // For recovery / device_verify: ensure user exists. (For signup, we want to allow new emails; also block if already exists.)
    const { data: usersList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = usersList?.users?.find((u: any) => (u.email || "").toLowerCase() === normalizedEmail);
    if (purpose === "signup" && existing) {
      return new Response(JSON.stringify({ error: "이미 가입된 이메일입니다." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if ((purpose === "recovery" || purpose === "device_verify") && !existing) {
      // For privacy don't reveal; but we do need to avoid sending to nonexistent. Return success-ish without sending.
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Invalidate previous unused codes
    await admin.from("otp_codes").update({ used: true }).eq("email", normalizedEmail).eq("purpose", purpose).eq("used", false);

    const code = generate6();
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insErr } = await admin.from("otp_codes").insert({
      email: normalizedEmail, code_hash, purpose, metadata: metadata ?? null, expires_at,
    });
    if (insErr) throw insErr;

    const { label, subject } = purposeMap[purpose];
    const html = emailHtml(code, label);

    const r = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "암기준섹 <onboarding@resend.dev>",
        to: [normalizedEmail],
        subject,
        html,
      }),
    });
    const body = await r.text();
    if (!r.ok) {
      console.error("resend error", r.status, body);
      return new Response(JSON.stringify({ error: "이메일 발송 실패", detail: body }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-otp", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
