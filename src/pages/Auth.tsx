import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { BookOpen, Users, Sparkles, Heart, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import junsuk01 from "@/assets/junsuk-01.png";
import junsuk30 from "@/assets/junsuk-30.png";

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
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Hero Section with Junsuk */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="bg-gradient-junsuk rounded-3xl p-10 shadow-junsuk relative">
            <div className="flex flex-col items-center text-center gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.3, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ 
                  delay: 0.2, 
                  type: "spring",
                  stiffness: 150,
                  damping: 12
                }}
                whileHover={{ scale: 1.15, rotate: 8 }}
                className="w-40 h-40"
              >
                <img 
                  src={isSignUp ? junsuk30 : junsuk01} 
                  alt="준섹이" 
                  className="w-full h-full object-contain drop-shadow-2xl filter brightness-105"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3"
              >
                <h1 className="text-5xl font-extrabold text-junsuk-blue drop-shadow-md">
                  암기준섹
                </h1>
                <p className="text-xl text-foreground/90 font-medium">
                  {isSignUp ? "준섹이와 함께 시작해요! 🎉" : "다시 만나서 반가워요! 💙"}
                </p>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex gap-3 justify-center pt-2 flex-wrap"
                >
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full text-base font-bold shadow-lg">
                    <Sparkles className="w-5 h-5 text-junsuk-yellow" />
                    즐겁게
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full text-base font-bold shadow-lg">
                    <Heart className="w-5 h-5 text-destructive" />
                    재미있게
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full text-base font-bold shadow-lg">
                    <Trophy className="w-5 h-5 text-warning" />
                    학습!
                  </span>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-white/95 backdrop-blur border-2 shadow-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-2">
                {isSignUp ? "회원가입" : "로그인"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {isSignUp 
                  ? "로그인하여 모든 기능을 사용하거나, 로그인 없이 단어장만 사용할 수 있습니다."
                  : "로그인하여 모든 기능을 사용하거나, 로그인 없이 단어장만 사용할 수 있습니다."
                }
              </p>

              <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4 mb-4">
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <Label htmlFor="name" className="font-semibold">이름</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="홍길동"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-11"
                    />
                  </motion.div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-semibold">비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11"
                  />
                  {isSignUp && (
                    <p className="text-sm text-muted-foreground">6자 이상 입력해주세요</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-bold bg-success hover:bg-success/90" 
                  disabled={loading}
                >
                  {loading ? (
                    isSignUp ? "가입 중..." : "로그인 중..."
                  ) : (
                    isSignUp ? "회원가입" : "로그인"
                  )}
                </Button>
              </form>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">
                    또는
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-12 text-base font-semibold mb-4"
                onClick={() => navigate("/vocabularies")}
              >
                <BookOpen className="w-5 h-5 mr-2" />
                로그인 없이 단어장 사용하기
              </Button>

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

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6"
        >
          <Card className="bg-white/80 backdrop-blur border-2">
            <CardContent className="p-6">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                💡 알아두세요
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>로그인 없이:</strong> 단어장 생성 및 학습 기능만 사용 가능 (기기 내 저장)
                  </div>
                </div>
                <div className="flex gap-2">
                  <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>로그인 시:</strong> 그룹 기능, 클라우드 동기화, 진도 추적 등 모든 기능 사용 가능
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
