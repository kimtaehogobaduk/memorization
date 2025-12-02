import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn as LoginIcon } from "lucide-react";
import { motion } from "framer-motion";

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">암기준섹</h1>
          <p className="text-muted-foreground">효과적인 단어 학습 플랫폼</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isSignUp ? "회원가입" : "로그인"}</CardTitle>
            <CardDescription>
              {isSignUp 
                ? "암기준섹과 함께 단어 학습을 시작하세요"
                : "암기준섹으로 돌아오신 것을 환영합니다"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="홍길동"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                {isSignUp && (
                  <p className="text-xs text-muted-foreground">6자 이상 입력해주세요</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading}
              >
                <LoginIcon className="w-5 h-5 mr-2" />
                {loading ? (
                  isSignUp ? "가입 중..." : "로그인 중..."
                ) : (
                  isSignUp ? "회원가입" : "로그인"
                )}
              </Button>
            </form>

            <div className="text-center">
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
    </div>
  );
};

export default Auth;
