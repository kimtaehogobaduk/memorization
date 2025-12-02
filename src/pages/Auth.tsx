import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, Heart, UserPlus, LogIn as LoginIcon } from "lucide-react";
import { motion } from "framer-motion";
import junsuk01 from "@/assets/junsuk-01.png";
import junsuk30 from "@/assets/junsuk-30.png";
import junsuk272 from "@/assets/junsuk-27-2.png";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(email, password, fullName);
    
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("회원가입 성공! 로그인해주세요.");
      navigate("/");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);
    
    setLoading(false);

    if (error) {
      toast.error("로그인 실패: " + error.message);
    } else {
      toast.success("로그인 성공!");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-2xl">
        {/* Hero Section with Junsuk */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="bg-gradient-junsuk rounded-3xl p-8 shadow-junsuk relative">
            <div className="flex flex-col items-center text-center gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.3, rotate: -15 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ 
                  delay: 0.2, 
                  type: "spring",
                  stiffness: 120,
                  damping: 10
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-36 h-36"
              >
                <img 
                  src={isSignUp ? junsuk272 : junsuk30} 
                  alt="준섹이" 
                  className="w-full h-full object-contain drop-shadow-2xl"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <h1 className="text-4xl font-extrabold text-junsuk-blue drop-shadow-md">
                  {isSignUp ? "준섹이와 함께 시작! 🎉" : "다시 만나서 반가워요! 💙"}
                </h1>
                <p className="text-lg text-foreground/90 font-medium">
                  {isSignUp ? "지금 가입하고 단어 마스터가 되어보세요!" : "오늘도 열심히 공부해볼까요?"}
                </p>
                
                <div className="flex gap-2 justify-center pt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur rounded-full text-sm font-bold shadow-lg">
                    <Sparkles className="w-4 h-4 text-junsuk-yellow" />
                    즐겁게
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur rounded-full text-sm font-bold shadow-lg">
                    <Heart className="w-4 h-4 text-destructive" />
                    재미있게
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur rounded-full text-sm font-bold shadow-lg">
                    {isSignUp ? <UserPlus className="w-4 h-4 text-success" /> : <LoginIcon className="w-4 h-4 text-junsuk-blue" />}
                    {isSignUp ? "시작" : "학습"}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Auth Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-white/95 backdrop-blur border-2 shadow-xl">
            <CardContent className="p-8">
              <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-5">
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="name" className="text-base font-semibold">이름</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="홍길동"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-12 text-base"
                    />
                  </motion.div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-semibold">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base font-semibold">비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 text-base"
                  />
                  {isSignUp && (
                    <p className="text-sm text-muted-foreground">6자 이상 입력해주세요</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-bold bg-gradient-to-r from-junsuk-blue to-primary hover:opacity-90 transition-opacity" 
                  disabled={loading}
                >
                  {loading ? (
                    isSignUp ? "가입 중..." : "로그인 중..."
                  ) : (
                    <>
                      {isSignUp ? (
                        <>
                          <UserPlus className="w-5 h-5 mr-2" />
                          회원가입하기
                        </>
                      ) : (
                        <>
                          <LoginIcon className="w-5 h-5 mr-2" />
                          로그인하기
                        </>
                      )}
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setEmail("");
                    setPassword("");
                    setFullName("");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
                >
                  {isSignUp ? "이미 계정이 있으신가요? 로그인하기" : "계정이 없으신가요? 회원가입하기"}
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bottom Decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-muted-foreground">
            준섹이와 함께라면 단어 학습이 즐거워져요! 🚀
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
