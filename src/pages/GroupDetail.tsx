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
import { GroupChat } from "@/components/group/GroupChat";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Users, 
  BookOpen, 
  Trophy, 
  Settings, 
  Copy, 
  UserMinus,
  MessageSquare,
  LogOut
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
  const [isMember, setIsMember] = useState(false);
  const [sharedVocabularies, setSharedVocabularies] = useState<any[]>([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [myVocabularies, setMyVocabularies] = useState<any[]>([]);

  useEffect(() => {
    if (id && user) {
      loadGroupData();
      loadSharedVocabularies();
      loadMyVocabularies();
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

      // Check if user is a member
      const { data: memberData } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", id)
        .eq("user_id", user?.id)
        .single();
      
      setIsMember(!!memberData);

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

  const handleLeaveGroup = async () => {
    try {
      await supabase
        .from("group_members")
        .delete()
        .eq("group_id", id)
        .eq("user_id", user?.id);

      toast.success("그룹에서 탈퇴했습니다.");
      navigate("/groups");
    } catch (error) {
      console.error("Error leaving group:", error);
      toast.error("그룹 탈퇴에 실패했습니다.");
    }
  };

  const loadSharedVocabularies = async () => {
    try {
      const { data: sharedData } = await supabase
        .from("group_vocabularies")
        .select("*")
        .eq("group_id", id);

      if (sharedData) {
        const vocabsWithDetails = await Promise.all(
          sharedData.map(async (shared) => {
            // Get vocabulary details
            const { data: vocabData } = await supabase
              .from("vocabularies")
              .select("name")
              .eq("id", shared.vocabulary_id)
              .single();

            // Get word count
            const { count } = await supabase
              .from("words")
              .select("id", { count: "exact", head: true })
              .eq("vocabulary_id", shared.vocabulary_id);

            // Get sharer's profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, username")
              .eq("id", shared.shared_by)
              .single();

            return {
              ...shared,
              vocabulary_name: vocabData?.name || "알 수 없음",
              word_count: count || 0,
              shared_by_name: profile?.full_name || profile?.username || "알 수 없음",
            };
          })
        );

        setSharedVocabularies(vocabsWithDetails);
      }
    } catch (error) {
      console.error("Error loading shared vocabularies:", error);
    }
  };

  const loadMyVocabularies = async () => {
    try {
      const { data } = await supabase
        .from("vocabularies")
        .select("id, name")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      setMyVocabularies(data || []);
    } catch (error) {
      console.error("Error loading vocabularies:", error);
    }
  };

  const handleShareVocabulary = async (vocabularyId: string) => {
    if (!user?.id || !id) {
      toast.error("로그인 상태를 확인해주세요.");
      return;
    }

    try {
      // First verify membership
      const { data: memberCheck } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!memberCheck) {
        toast.error("그룹 멤버만 단어장을 공유할 수 있습니다.");
        return;
      }

      const { error } = await supabase
        .from("group_vocabularies")
        .insert({
          group_id: id,
          vocabulary_id: vocabularyId,
          shared_by: user.id,
        });

      if (error) {
        console.error("Share error details:", error.code, error.message, error.details);
        if (error.code === "23505") {
          toast.error("이미 공유된 단어장입니다.");
        } else if (error.code === "42501") {
          toast.error("공유 권한이 없습니다. 본인이 만든 단어장만 공유할 수 있습니다.");
        } else {
          toast.error(`공유 실패: ${error.message}`);
        }
        return;
      }

      toast.success("단어장이 공유되었습니다!");
      setShowShareDialog(false);
      loadSharedVocabularies();
    } catch (error: any) {
      console.error("Error sharing vocabulary:", error);
      toast.error(error?.message || "단어장 공유에 실패했습니다.");
    }
  };

  const handleUnshareVocabulary = async (sharedVocabId: string) => {
    try {
      const { error } = await supabase
        .from("group_vocabularies")
        .delete()
        .eq("id", sharedVocabId);

      if (error) throw error;

      toast.success("단어장 공유가 해제되었습니다.");
      loadSharedVocabularies();
    } catch (error) {
      console.error("Error unsharing vocabulary:", error);
      toast.error("공유 해제에 실패했습니다.");
    }
  };

  const handleCopyVocabulary = async (vocab: any) => {
    try {
      // Create new vocabulary
      const { data: newVocab, error: vocabError } = await supabase
        .from("vocabularies")
        .insert({
          user_id: user?.id,
          name: `${vocab.vocabulary_name} (복사본)`,
          description: `${vocab.shared_by_name}님이 공유한 단어장`,
          language: "english",
        })
        .select()
        .single();

      if (vocabError) throw vocabError;

      // Copy words
      const { data: words } = await supabase
        .from("words")
        .select("*")
        .eq("vocabulary_id", vocab.vocabulary_id);

      if (words && words.length > 0) {
        const wordsToInsert = words.map((word, index) => ({
          vocabulary_id: newVocab.id,
          word: word.word,
          meaning: word.meaning,
          example: word.example,
          note: word.note,
          part_of_speech: word.part_of_speech,
          order_index: index,
        }));

        const { error: wordsError } = await supabase
          .from("words")
          .insert(wordsToInsert);

        if (wordsError) throw wordsError;
      }

      toast.success("단어장이 내 단어장에 복사되었습니다!");
      navigate(`/vocabularies/${newVocab.id}`);
    } catch (error) {
      console.error("Error copying vocabulary:", error);
      toast.error("단어장 복사에 실패했습니다.");
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">대시보드</TabsTrigger>
            <TabsTrigger value="members">구성원</TabsTrigger>
            <TabsTrigger value="vocabulary">단어장</TabsTrigger>
            <TabsTrigger value="chat">채팅</TabsTrigger>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>공유된 단어장</span>
                  {isMember && (
                    <Button
                      size="sm"
                      onClick={() => setShowShareDialog(true)}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      내 단어장 공유하기
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  그룹 멤버들이 공유한 단어장입니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sharedVocabularies.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      아직 공유된 단어장이 없습니다.
                    </p>
                    {isMember && (
                      <Button
                        className="mt-4"
                        variant="outline"
                        onClick={() => setShowShareDialog(true)}
                      >
                        첫 단어장 공유하기
                      </Button>
                    )}
                  </div>
                ) : (
                  sharedVocabularies.map((vocab, index) => (
                    <motion.div
                      key={vocab.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => navigate(`/vocabularies/${vocab.vocabulary_id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">
                                  {vocab.vocabulary_name}
                                </h3>
                                <Badge variant="secondary">{vocab.word_count}개</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                공유자: {vocab.shared_by_name || "알 수 없음"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(vocab.created_at).toLocaleDateString("ko-KR")}
                              </p>
                            </div>
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              {vocab.shared_by !== user?.id && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCopyVocabulary(vocab)}
                                >
                                  내 단어장에 복사
                                </Button>
                              )}
                              {(vocab.shared_by === user?.id || isOwner) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUnshareVocabulary(vocab.id)}
                                >
                                  공유 해제
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  그룹 채팅
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GroupChat groupId={id!} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {!isOwner && isMember && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <LogOut className="w-4 h-4 mr-2" />
                    그룹 탈퇴
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>그룹을 탈퇴하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                      탈퇴 후 다시 가입하려면 초대 코드나 승인이 필요할 수 있습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLeaveGroup}>
                      탈퇴하기
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>단어장 공유하기</DialogTitle>
            <DialogDescription>
              그룹에 공유할 단어장을 선택하세요
            </DialogDescription>
          </DialogHeader>
          {myVocabularies.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                공유할 단어장이 없습니다.
              </p>
              <Button onClick={() => navigate("/vocabularies/new")}>
                단어장 만들기
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {myVocabularies.map((vocab) => (
                  <Card
                    key={vocab.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleShareVocabulary(vocab.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{vocab.name}</h3>
                        <Button size="sm">공유하기</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupDetail;
