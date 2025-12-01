import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, TrendingUp, Award } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    vocabularies: 0,
    words: 0,
    memorized: 0,
    groups: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const [vocabResult, groupsResult, progressResult] = await Promise.all([
        supabase.from("vocabularies").select("id", { count: "exact" }).eq("user_id", user?.id),
        supabase.from("group_members").select("id", { count: "exact" }).eq("user_id", user?.id),
        supabase.from("study_progress").select("id, is_memorized", { count: "exact" }).eq("user_id", user?.id),
      ]);

      const memorizedCount = progressResult.data?.filter(p => p.is_memorized).length || 0;

      setStats({
        vocabularies: vocabResult.count || 0,
        words: progressResult.count || 0,
        memorized: memorizedCount,
        groups: groupsResult.count || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      toast.error("통계를 불러오는데 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  const statCards = [
    { icon: BookOpen, label: "내 단어장", value: stats.vocabularies, color: "text-primary" },
    { icon: TrendingUp, label: "학습한 단어", value: stats.words, color: "text-success" },
    { icon: Award, label: "외운 단어", value: stats.memorized, color: "text-warning" },
    { icon: Users, label: "참여 그룹", value: stats.groups, color: "text-accent" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">안녕하세요! 👋</h1>
          <p className="text-muted-foreground">오늘도 열심히 학습해볼까요?</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-gradient-card">
                <CardContent className="p-6">
                  <stat.icon className={`w-8 h-8 mb-3 ${stat.color}`} />
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>빠른 시작</CardTitle>
            <CardDescription>원하는 작업을 선택하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => navigate("/vocabularies/new")}
            >
              <BookOpen className="w-5 h-5 mr-3" />
              새 단어장 만들기
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => navigate("/vocabularies")}
            >
              <TrendingUp className="w-5 h-5 mr-3" />
              단어 학습하기
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => navigate("/groups")}
            >
              <Users className="w-5 h-5 mr-3" />
              그룹 관리
            </Button>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Dashboard;
