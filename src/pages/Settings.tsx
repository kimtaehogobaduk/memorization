import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LogOut, User, Upload, Settings as SettingsIcon, Zap, BookOpen, TrendingUp, Award, Users, Type } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const Settings = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Quiz settings state
  const [answerDelay, setAnswerDelay] = useState(2.0);
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const [quizFontSize, setQuizFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [settingsLoading, setSettingsLoading] = useState(false);
  
  // Stats state
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
      loadProfile();
      loadUserSettings();
      loadStats();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setUsername(data.username || "");
        setStatusMessage(data.status_message || "");
        setAvatarPreview(data.avatar_url);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadUserSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setAnswerDelay(data.answer_reveal_delay || 2.0);
        setAutoPlayAudio(data.auto_play_audio || false);
        setQuizFontSize((data.quiz_font_size as 'small' | 'medium' | 'large') || 'medium');
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("이미지 크기는 2MB 이하여야 합니다.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return avatarPreview;

    try {
      const fileExt = avatarFile.name.split('.').pop();
      const filePath = `${user?.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("이미지 업로드에 실패했습니다.");
      return null;
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);

    try {
      const avatarUrl = await uploadAvatar();

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user?.id,
          full_name: fullName.trim() || null,
          username: username.trim() || null,
          status_message: statusMessage.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("프로필이 업데이트되었습니다!");
      loadProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("프로필 업데이트에 실패했습니다.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSettingsUpdate = async () => {
    setSettingsLoading(true);

    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user?.id,
          answer_reveal_delay: answerDelay,
          auto_play_audio: autoPlayAudio,
          quiz_font_size: quizFontSize,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("설정이 저장되었습니다!");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("설정 저장에 실패했습니다.");
    } finally {
      setSettingsLoading(false);
    }
  };

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
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="설정" />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              프로필
            </TabsTrigger>
            <TabsTrigger value="stats">
              <TrendingUp className="w-4 h-4 mr-2" />
              통계
            </TabsTrigger>
            <TabsTrigger value="quiz">
              <Zap className="w-4 h-4 mr-2" />
              퀴즈 설정
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>프로필 정보</CardTitle>
                  <CardDescription>
                    다른 사용자에게 표시되는 프로필 정보입니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="프로필"
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-12 h-12 text-primary" />
                        </div>
                      )}
                    </div>
                    <label>
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          이미지 변경
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">이름</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="이름을 입력하세요"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">사용자명</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="사용자명을 입력하세요"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="statusMessage">상태 메시지</Label>
                    <Textarea
                      id="statusMessage"
                      value={statusMessage}
                      onChange={(e) => setStatusMessage(e.target.value)}
                      placeholder="상태 메시지를 입력하세요"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" disabled={profileLoading}>
                {profileLoading ? "저장 중..." : "프로필 저장"}
              </Button>
            </form>

            <Card>
              <CardContent className="p-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={signOut}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  로그아웃
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>학습 통계</CardTitle>
                <CardDescription>내 학습 현황을 한눈에 확인하세요</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: BookOpen, label: "내 단어장", value: stats.vocabularies, color: "text-primary" },
                    { icon: TrendingUp, label: "학습한 단어", value: stats.words, color: "text-success" },
                    { icon: Award, label: "외운 단어", value: stats.memorized, color: "text-warning" },
                    { icon: Users, label: "참여 그룹", value: stats.groups, color: "text-accent" },
                  ].map((stat, index) => (
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quiz" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>퀴즈 설정</CardTitle>
                <CardDescription>
                  퀴즈 학습 시 적용되는 설정입니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>오답 시 정답 표시 시간</Label>
                      <p className="text-sm text-muted-foreground">
                        틀렸을 때 정답을 보여주는 시간: {answerDelay}초
                      </p>
                    </div>
                  </div>
                  <Slider
                    value={[answerDelay]}
                    onValueChange={(values) => setAnswerDelay(values[0])}
                    min={1.0}
                    max={5.0}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1초</span>
                    <span>5초</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      퀴즈 글자 크기
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      문제와 보기의 글자 크기를 조절합니다
                    </p>
                  </div>
                  <RadioGroup value={quizFontSize} onValueChange={(value) => setQuizFontSize(value as 'small' | 'medium' | 'large')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="small" id="small" />
                      <Label htmlFor="small" className="font-normal cursor-pointer">
                        작게
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium" className="font-normal cursor-pointer">
                        보통 (기본)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="large" id="large" />
                      <Label htmlFor="large" className="font-normal cursor-pointer">
                        크게
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="autoPlayAudio">자동 음성 재생</Label>
                    <p className="text-sm text-muted-foreground">
                      단어 표시 시 자동으로 발음 재생
                    </p>
                  </div>
                  <Switch
                    id="autoPlayAudio"
                    checked={autoPlayAudio}
                    onCheckedChange={setAutoPlayAudio}
                  />
                </div>

                <Button
                  onClick={handleSettingsUpdate}
                  className="w-full"
                  disabled={settingsLoading}
                >
                  {settingsLoading ? "저장 중..." : "설정 저장"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default Settings;
