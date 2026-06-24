import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { BookOpen, Users, Sparkles, Heart, Trophy, Eye, EyeOff, ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import junsuk01 from "@/assets/junsuk-01.png";
import junsuk30 from "@/assets/junsuk-30.png";
import { getDeviceId, getDeviceName } from "@/utils/deviceId";

type Mode = "login" | "signup" | "forgot";
type Step = "form" | "otp-signup" | "otp-recovery" | "otp-device" | "reset-password";

const Auth = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const resetAll = () => {
    setStep("form"); setOtp(""); setPassword(""); setNewPassword(""); setFullName("");
  };

  const requestOtp = async (purpose: "signup" | "recovery" | "device_verify") => {
    const { data, error } = await supabase.functions.invoke("send-otp", {
      body: { email: email.trim().toLowerCase(), purpose },
    });
    if (error || (data as any)?.error) {
      throw new Error((data as any)?.error || error?.message || "코드 발송 실패");
    }
    setResendCooldown(30);
  };

  // SIGNUP submit
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("비밀번호는 6자 이상이어야 해요."); return; }
    setLoading(true);
    try {
      await requestOtp("signup");
      setStep("otp-signup");
      toast.success("이메일로 6자리 코드를 보냈어요!");
    } catch (err: any) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  const handleVerifySignup = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { email: email.trim().toLowerCase(), purpose: "signup", code: otp, payload: { password, full_name: fullName } },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      // Auto sign-in & trust this device
      const { error: sErr } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (sErr) throw sErr;
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (uid) {
        await supabase.from("trusted_devices").upsert({
          user_id: uid, device_id: getDeviceId(), device_name: getDeviceName(),
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "user_id,device_id" });
      }
      toast.success("회원가입 완료! 환영해요 🎉");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "인증 실패");
    } finally { setLoading(false); }
  };

  // LOGIN submit
  const handleLogInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email.trim().toLowerCase(), password);
      if (error) throw new Error(error.message);
      // Check trusted device
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("세션을 가져올 수 없어요.");
      const did = getDeviceId();
      const { data: dev } = await supabase
        .from("trusted_devices").select("id").eq("user_id", uid).eq("device_id", did).maybeSingle();
      if (dev) {
        // Trusted; update last_seen and proceed
        await supabase.from("trusted_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", dev.id);
        toast.success("로그인 성공!");
        navigate("/");
        return;
      }
      // Not trusted: check user security preferences
      const { data: settings } = await supabase
        .from("user_settings")
        .select("new_device_verify_enabled, new_device_email_notify")
        .eq("user_id", uid)
        .maybeSingle();
      const verifyEnabled = settings?.new_device_verify_enabled ?? true;
      const notifyEnabled = settings?.new_device_email_notify ?? false;

      if (!verifyEnabled) {
        // Skip OTP, trust device immediately
        await supabase.from("trusted_devices").upsert({
          user_id: uid, device_id: did, device_name: getDeviceName(),
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "user_id,device_id" });
        if (notifyEnabled) {
          // Fire-and-forget notification email
          supabase.functions.invoke("send-otp", {
            body: { email: email.trim().toLowerCase(), purpose: "device_notify", metadata: { device_name: getDeviceName() } },
          }).catch(() => {});
        }
        toast.success("로그인 성공!");
        navigate("/");
        return;
      }
      // Verify required: send OTP
      await requestOtp("device_verify");
      setStep("otp-device");
      toast.message("새 기기에서 로그인하시는군요!", { description: "이메일로 보낸 6자리 코드를 입력해주세요." });
    } catch (err: any) {
      toast.error("로그인 실패: " + err.message);
    } finally { setLoading(false); }
  };

  const handleVerifyDevice = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: {
          email: email.trim().toLowerCase(), purpose: "device_verify", code: otp,
          payload: { device_id: getDeviceId(), device_name: getDeviceName() },
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("기기 인증 완료!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "인증 실패");
      // Sign out so unauthorized session doesn't leak
      await supabase.auth.signOut();
    } finally { setLoading(false); }
  };

  // FORGOT submit
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestOtp("recovery");
      setStep("otp-recovery");
      toast.success("이메일을 보냈어요. (가입된 이메일이라면) 코드를 확인해주세요.");
    } catch (err: any) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  const handleVerifyRecovery = () => {
    if (otp.length !== 6) return;
    setStep("reset-password");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("비밀번호는 6자 이상이어야 해요."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { email: email.trim().toLowerCase(), purpose: "recovery", code: otp, payload: { new_password: newPassword } },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("비밀번호가 변경되었어요. 로그인해주세요.");
      setMode("login"); resetAll(); setPassword("");
    } catch (err: any) {
      toast.error(err.message || "재설정 실패");
    } finally { setLoading(false); }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      const purpose = step === "otp-signup" ? "signup" : step === "otp-device" ? "device_verify" : "recovery";
      await requestOtp(purpose);
      toast.success("코드를 다시 보냈어요.");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const heading = mode === "signup" ? "회원가입" : mode === "forgot" ? "비밀번호 찾기" : "로그인";
  const isOtpStep = step.startsWith("otp-");

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
          <div className="bg-gradient-junsuk rounded-3xl p-10 shadow-junsuk relative">
            <div className="flex flex-col items-center text-center gap-6">
              <motion.div initial={{ opacity: 0, scale: 0.3, rotate: -20 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 150, damping: 12 }} whileHover={{ scale: 1.15, rotate: 8 }} className="w-40 h-40">
                <img src={mode === "signup" ? junsuk30 : junsuk01} alt="준섹이" className="w-full h-full object-contain drop-shadow-2xl filter brightness-105" />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-3">
                <h1 className="text-5xl font-extrabold text-junsuk-blue drop-shadow-md">암기준섹</h1>
                <p className="text-xl text-foreground/90 font-medium">
                  {mode === "signup" ? "준섹이와 함께 시작해요! 🎉" : mode === "forgot" ? "비밀번호를 잊으셨군요 🔐" : "다시 만나서 반가워요! 💙"}
                </p>
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="flex gap-3 justify-center pt-2 flex-wrap">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full text-base font-bold shadow-lg"><Sparkles className="w-5 h-5 text-junsuk-yellow" />즐겁게</span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full text-base font-bold shadow-lg"><Heart className="w-5 h-5 text-destructive" />재미있게</span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full text-base font-bold shadow-lg"><Trophy className="w-5 h-5 text-warning" />학습!</span>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="bg-white/95 backdrop-blur border-2 shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-2">
                {(isOtpStep || step === "reset-password") && (
                  <button onClick={() => { resetAll(); }} className="text-muted-foreground hover:text-foreground" type="button">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <h2 className="text-2xl font-bold">
                  {step === "otp-signup" && "이메일 인증"}
                  {step === "otp-device" && "새 기기 인증"}
                  {step === "otp-recovery" && "코드 확인"}
                  {step === "reset-password" && "새 비밀번호"}
                  {step === "form" && heading}
                </h2>
              </div>

              <AnimatePresence mode="wait">
                {/* === FORM STEP === */}
                {step === "form" && (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="text-muted-foreground mb-6">
                      로그인하면 동기화와 그룹 기능을 쓰고, 로그인 없이도 단어장 기능을 사용할 수 있어요.
                    </p>

                    <form onSubmit={mode === "signup" ? handleSignUpSubmit : mode === "forgot" ? handleForgotSubmit : handleLogInSubmit} className="space-y-4 mb-4">
                      {mode === "signup" && (
                        <div className="space-y-2">
                          <Label htmlFor="name" className="font-semibold">이름</Label>
                          <Input id="name" type="text" placeholder="홍길동" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-11" />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="email" className="font-semibold">이메일</Label>
                        <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
                      </div>

                      {mode !== "forgot" && (
                        <div className="space-y-2">
                          <Label htmlFor="password" className="font-semibold">비밀번호</Label>
                          <div className="relative">
                            <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11 pr-10" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {mode === "signup" && <p className="text-sm text-muted-foreground">6자 이상 입력해주세요</p>}
                        </div>
                      )}

                      <Button type="submit" className="w-full h-12 text-base font-bold bg-success hover:bg-success/90" disabled={loading}>
                        {loading ? "처리 중..." : mode === "signup" ? "인증코드 받기" : mode === "forgot" ? "재설정 코드 받기" : "로그인"}
                      </Button>
                    </form>

                    {mode === "login" && (
                      <div className="text-right mb-3">
                        <button type="button" onClick={() => { setMode("forgot"); resetAll(); }} className="text-sm text-muted-foreground hover:text-foreground underline">
                          비밀번호를 잊으셨나요?
                        </button>
                      </div>
                    )}

                    <div className="relative mb-4">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">또는</span></div>
                    </div>

                    <Button variant="outline" className="w-full h-12 text-base font-semibold mb-4" onClick={() => navigate("/vocabularies")}>
                      <BookOpen className="w-5 h-5 mr-2" />로그인 없이 단어장 사용하기
                    </Button>

                    <div className="text-center">
                      <button type="button" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); resetAll(); setEmail(""); setPassword(""); }}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors underline">
                        {mode === "signup" ? "이미 계정이 있으신가요? 로그인하기" : mode === "forgot" ? "로그인 화면으로" : "계정이 없으신가요? 회원가입하기"}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* === OTP STEP === */}
                {isOtpStep && (
                  <motion.div key="otp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-4">
                      {step === "otp-device" ? <ShieldCheck className="w-6 h-6 text-primary mt-0.5" /> : <Mail className="w-6 h-6 text-primary mt-0.5" />}
                      <div className="text-sm">
                        <p className="font-semibold">{email}</p>
                        <p className="text-muted-foreground">로 6자리 코드를 보냈어요. 10분 안에 입력해주세요.</p>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                          <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <Button className="w-full h-12 text-base font-bold" disabled={loading || otp.length !== 6}
                      onClick={step === "otp-signup" ? handleVerifySignup : step === "otp-device" ? handleVerifyDevice : handleVerifyRecovery}>
                      {loading ? "확인 중..." : "확인"}
                    </Button>

                    <div className="text-center">
                      <button type="button" onClick={resendOtp} disabled={resendCooldown > 0}
                        className="text-sm text-muted-foreground hover:text-foreground underline disabled:opacity-50 disabled:no-underline">
                        {resendCooldown > 0 ? `${resendCooldown}초 후 다시 보내기` : "코드 다시 받기"}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* === RESET PASSWORD STEP === */}
                {step === "reset-password" && (
                  <motion.form key="reset" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleResetPassword} className="space-y-4">
                    <p className="text-muted-foreground">새 비밀번호를 입력해주세요.</p>
                    <div className="space-y-2">
                      <Label htmlFor="newpw" className="font-semibold">새 비밀번호</Label>
                      <Input id="newpw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="h-11" />
                      <p className="text-sm text-muted-foreground">6자 이상</p>
                    </div>
                    <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
                      {loading ? "변경 중..." : "비밀번호 변경"}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mt-6">
          <Card className="bg-white/80 backdrop-blur border-2">
            <CardContent className="p-6">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">💡 알아두세요</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex gap-2"><BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0" /><div><strong>로그인 없이:</strong> AI 생성·AI 추출·단어장 생성·학습·설정 사용 가능 (기기 내 저장)</div></div>
                <div className="flex gap-2"><Users className="w-4 h-4 mt-0.5 flex-shrink-0" /><div><strong>로그인 시:</strong> 그룹·동기화·진도 추적 등 모든 기능</div></div>
                <div className="flex gap-2"><ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" /><div><strong>보안:</strong> 새 기기에서 로그인할 땐 6자리 이메일 코드를 한 번 더 확인해요.</div></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
