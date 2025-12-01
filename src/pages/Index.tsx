import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, LogIn } from "lucide-react";
import { motion } from "framer-motion";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Word Master</h1>
          <p className="text-muted-foreground">효과적인 단어 학습 플랫폼</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>시작하기</CardTitle>
            <CardDescription>
              로그인하여 모든 기능을 사용하거나, 로그인 없이 단어장만 사용할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate("/auth")}
            >
              <LogIn className="w-5 h-5 mr-2" />
              로그인 / 회원가입
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  또는
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => navigate("/vocabularies")}
            >
              <BookOpen className="w-5 h-5 mr-2" />
              로그인 없이 단어장 사용하기
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">💡 알아두세요</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
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
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Index;
