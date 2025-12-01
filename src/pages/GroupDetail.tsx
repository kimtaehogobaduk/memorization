import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  BookOpen, 
  Trophy, 
  Settings, 
  Copy, 
  UserMinus,
  Target
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  description: string | null;
  join_code: string;
  is_public: boolean;
  requires_approval: boolean;
  owner_id: string;
  vocabulary_id: string | null;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  username: string | null;
  learned_words: number;
  memorized_words: number;
  accuracy: number;
}

interface VocabularyInfo {
  id: string;
  name: string;
  word_count: number;
}

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyInfo | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (id && user) {
      loadGroupData();
    }
  }, [id, user]);

  const loadGroupData = async () => {
    try {
      setLoading(true);

      // Load group info
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", id)
        .single();

      if (groupError) throw groupError;

      setGroup(groupData);
      setIsOwner(groupData.owner_id === user?.id);

      // Load vocabulary info if exists
      if (groupData.vocabulary_id) {
        const { data: vocabData } = await supabase
          .from("vocabularies")
          .select("id, name")
          .eq("id", groupData.vocabulary_id)
          .single();

        if (vocabData) {
          const { count } = await supabase
            .from("words")
            .select("id", { count: "exact" })
            .eq("vocabulary_id", vocabData.id);

          setVocabulary({
            ...vocabData,
            word_count: count || 0,
          });
        }
      }

      // Load members with their progress
      const { data: membersData } = await supabase
        .from("group_members")
        .select("id, user_id, role")
        .eq("group_id", id);

      if (membersData) {
        // Get profile and progress for each member
        const membersWithProgress = await Promise.all(
          membersData.map(async (member) => {
            // Get profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, username")
              .eq("id", member.user_id)
              .single();

            // Get progress
            const { data: progress } = await supabase
              .from("study_progress")
              .select("correct_count, incorrect_count, is_memorized")
              .eq("user_id", member.user_id);

            const learnedWords = progress?.length || 0;
            const memorizedWords = progress?.filter(p => p.is_memorized).length || 0;
            const totalAnswers = progress?.reduce((sum, p) => sum + (p.correct_count || 0) + (p.incorrect_count || 0), 0) || 0;
            const correctAnswers = progress?.reduce((sum, p) => sum + (p.correct_count || 0), 0) || 0;
            const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

            return {
              ...member,
              full_name: profile?.full_name || null,
              username: profile?.username || null,
              learned_words: learnedWords,
              memorized_words: memorizedWords,
              accuracy,
            };
          })
        );

        setMembers(membersWithProgress);
      }
    } catch (error) {
      console.error("Error loading group data:", error);
      toast.error("그룹 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const copyJoinCode = () => {
    if (group) {
      navigator.clipboard.writeText(group.join_code);
      toast.success("가입 코드가 복사되었습니다!");
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm("정말 이 구성원을 내보내시겠습니까?")) return;

    try {
      await supabase.from("group_members").delete().eq("id", memberId);
      toast.success("구성원이 제거되었습니다.");
      loadGroupData();
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("구성원 제거에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">그룹을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const avgProgress = members.length > 0
    ? Math.round(members.reduce((sum, m) => sum + m.memorized_words, 0) / members.length)
    : 0;

  return (
    <div className="min-h-screen bg-background pb-6">
      <Header
        title={group.name}
        showBack
        onBack={() => navigate("/groups")}
        action={
          isOwner && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/groups/${id}/settings`)}
            >
              <Settings className="w-5 h-5" />
            </Button>
          )
        }
      />

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {group.description && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <p className="text-muted-foreground">{group.description}</p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">대시보드</TabsTrigger>
            <TabsTrigger value="members">구성원</TabsTrigger>
            <TabsTrigger value="vocabulary">단어장</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  그룹 진도 현황
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">평균 외운 단어 수</span>
                    <span className="text-lg font-bold">{avgProgress}개</span>
                  </div>
                  <Progress value={vocabulary ? (avgProgress / vocabulary.word_count) * 100 : 0} />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{members.length}</p>
                    <p className="text-sm text-muted-foreground">구성원</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle>가입 코드</CardTitle>
                  <CardDescription>
                    이 코드를 공유하여 구성원을 초대하세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Input
                      value={group.join_code}
                      readOnly
                      className="text-center text-2xl tracking-wider font-mono"
                    />
                    <Button onClick={copyJoinCode} variant="outline" size="icon">
                      <Copy className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-3">
            {members.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">
                            {member.full_name || member.username || "사용자"}
                          </h4>
                          {member.role === "owner" && (
                            <Badge variant="default">관리자</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">학습</p>
                            <p className="font-semibold">{member.learned_words}개</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">외움</p>
                            <p className="font-semibold">{member.memorized_words}개</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">정답률</p>
                            <p className="font-semibold">{member.accuracy}%</p>
                          </div>
                        </div>
                      </div>
                      {isOwner && member.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMember(member.id)}
                        >
                          <UserMinus className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="vocabulary" className="space-y-4">
            {vocabulary ? (
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/vocabularies/${vocabulary.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-primary" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{vocabulary.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {vocabulary.word_count}개 단어
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    아직 연결된 단어장이 없습니다.
                  </p>
                  {isOwner && (
                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={() => navigate(`/groups/${id}/settings`)}
                    >
                      단어장 연결하기
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GroupDetail;
