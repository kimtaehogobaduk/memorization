import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Plus, Sparkles, Trophy, Target } from "lucide-react";
import { motion } from "framer-motion";
import junsuk01 from "@/assets/junsuk-01.png";
import junsuk30 from "@/assets/junsuk-30.png";
import junsuk27 from "@/assets/junsuk-27.png";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  const quickActions = [
    { 
      icon: Plus, 
      label: "단어장 만들기", 
      color: "from-junsuk-blue to-primary",
      path: "/vocabularies/new",
      emoji: "📚"
    },
    { 
      icon: BookOpen, 
      label: "단어 학습하기", 
      color: "from-success to-emerald-400",
      path: "/vocabularies",
      emoji: "✏️"
    },
    { 
      icon: Users, 
      label: "그룹 활동", 
      color: "from-junsuk-yellow to-warning",
      path: "/groups",
      emoji: "👥"
    },
    { 
      icon: Trophy, 
      label: "내 통계", 
      color: "from-purple-400 to-pink-400",
      path: "/settings",
      emoji: "📊"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero pb-20">
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Hero Section with Junsuk */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mb-8 overflow-hidden"
        >
          <div className="bg-gradient-junsuk rounded-3xl p-8 shadow-junsuk relative">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h1 className="text-4xl font-bold mb-2 text-junsuk-blue">안녕! 👋</h1>
                  <p className="text-xl text-foreground/80 mb-4">
                    오늘도 준섹이와 함께<br />즐겁게 공부해볼까요?
                  </p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-2"
                >
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/60 backdrop-blur rounded-full text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-junsuk-yellow" />
                    화이팅!
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/60 backdrop-blur rounded-full text-sm font-medium">
                    <Target className="w-4 h-4 text-junsuk-blue" />
                    목표 달성
                  </span>
                </motion.div>
              </div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ 
                  delay: 0.3, 
                  type: "spring",
                  stiffness: 200,
                  damping: 10
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-32 h-32 flex-shrink-0"
              >
                <img 
                  src={junsuk01} 
                  alt="준섹이" 
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.5 + index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card 
                className="cursor-pointer overflow-hidden border-2 hover:border-primary transition-all shadow-lg hover:shadow-xl"
                onClick={() => navigate(action.path)}
              >
                <CardContent className={`p-6 bg-gradient-to-br ${action.color} relative`}>
                  <div className="absolute top-2 right-2 text-3xl opacity-30">
                    {action.emoji}
                  </div>
                  <action.icon className="w-8 h-8 mb-3 text-white drop-shadow" />
                  <p className="font-bold text-white text-lg drop-shadow">
                    {action.label}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Motivational Cards */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="bg-white/80 backdrop-blur border-2 border-success/20 hover:border-success transition-all">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-20 h-20 flex-shrink-0">
                  <img 
                    src={junsuk30} 
                    alt="준섹이 응원" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1 text-success">오늘의 목표</h3>
                  <p className="text-sm text-muted-foreground">
                    새로운 단어 10개를 학습하고 복습해보세요!
                  </p>
                </div>
                <Button 
                  size="sm" 
                  className="bg-success hover:bg-success/90"
                  onClick={() => navigate("/vocabularies")}
                >
                  시작
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 }}
          >
            <Card className="bg-white/80 backdrop-blur border-2 border-junsuk-blue/20 hover:border-junsuk-blue transition-all">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-20 h-20 flex-shrink-0">
                  <img 
                    src={junsuk27} 
                    alt="준섹이 공부" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1 text-junsuk-blue">학습 팁</h3>
                  <p className="text-sm text-muted-foreground">
                    매일 조금씩 꾸준히 하는 것이 가장 중요해요! 💪
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Dashboard;
