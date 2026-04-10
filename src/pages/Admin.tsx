import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  BookOpen, 
  UsersRound, 
  TrendingUp, 
  Shield,
  Trash2,
  Search,
  Eye,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

type AppRole = "admin" | "elder" | "user";

interface StatsData {
  totalUsers: number;
  totalVocabularies: number;
  totalWords: number;
  totalGroups: number;
  publicVocabularies: number;
  publicGroups: number;
}

interface UserData {
  id: string;
  email: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    username: string | null;
  };
  role?: AppRole;
}

interface VocabularyData {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  user_id: string;
  word_count?: number;
}

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  owner_id: string;
  member_count?: number;
}

const Admin = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    totalVocabularies: 0,
    totalWords: 0,
    totalGroups: 0,
    publicVocabularies: 0,
    publicGroups: 0,
  });
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [vocabularies, setVocabularies] = useState<VocabularyData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  
  const [userSearch, setUserSearch] = useState("");
  const [vocabSearch, setVocabSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    // 로그인 안 되어 있으면 로그인 페이지로만 보냄
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);


  useEffect(() => {
    if (user && isAdmin) {
      loadStats();
      loadUsers();
      loadVocabularies();
      loadGroups();
    }
  }, [user, isAdmin]);

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      
      const [usersResult, vocabsResult, wordsResult, groupsResult] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("vocabularies").select("id, is_public", { count: "exact" }),
        supabase.from("words").select("id", { count: "exact", head: true }),
        supabase.from("groups").select("id, is_public", { count: "exact" }),
      ]);

      const publicVocabs = vocabsResult.data?.filter(v => v.is_public).length || 0;
      const publicGroups = groupsResult.data?.filter(g => g.is_public).length || 0;

      setStats({
        totalUsers: usersResult.count || 0,
        totalVocabularies: vocabsResult.count || 0,
        totalWords: wordsResult.count || 0,
        totalGroups: groupsResult.count || 0,
        publicVocabularies: publicVocabs,
        publicGroups: publicGroups,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      toast.error("통계 로딩 실패");
    } finally {
      setStatsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Get all users from auth.users via profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, username, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get roles for each user
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role as AppRole]) || []);

      const usersWithRoles: UserData[] = (profilesData || []).map(profile => ({
        id: profile.id,
        email: "", // We can't access auth.users directly
        created_at: profile.created_at || "",
        profile: {
          full_name: profile.full_name,
          username: profile.username,
        },
        role: rolesMap.get(profile.id) || "user",
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("사용자 목록 로딩 실패");
    }
  };

  const loadVocabularies = async () => {
    try {
      const { data, error } = await supabase
        .from("vocabularies")
        .select("id, name, description, is_public, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get word counts for each vocabulary
      const vocabsWithCounts = await Promise.all(
        (data || []).map(async (vocab) => {
          const { count } = await supabase
            .from("words")
            .select("id", { count: "exact", head: true })
            .eq("vocabulary_id", vocab.id);
          
          return {
            ...vocab,
            word_count: count || 0,
          };
        })
      );

      setVocabularies(vocabsWithCounts);
    } catch (error) {
      console.error("Error loading vocabularies:", error);
      toast.error("단어장 목록 로딩 실패");
    }
  };

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name, description, is_public, created_at, owner_id")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get member counts for each group
      const groupsWithCounts = await Promise.all(
        (data || []).map(async (group) => {
          const { count } = await supabase
            .from("group_members")
            .select("id", { count: "exact", head: true })
            .eq("group_id", group.id);
          
          return {
            ...group,
            member_count: count || 0,
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error) {
      console.error("Error loading groups:", error);
      toast.error("그룹 목록 로딩 실패");
    }
  };

  const handleDeleteVocabulary = async (vocabId: string) => {
    if (!confirm("정말 이 단어장을 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("vocabularies")
        .delete()
        .eq("id", vocabId);

      if (error) throw error;

      toast.success("단어장이 삭제되었습니다.");
      loadVocabularies();
      loadStats();
    } catch (error) {
      console.error("Error deleting vocabulary:", error);
      toast.error("단어장 삭제 실패");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("정말 이 그룹을 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;

      toast.success("그룹이 삭제되었습니다.");
      loadGroups();
      loadStats();
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("그룹 삭제 실패");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`정말 "${userName}" 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("인증 세션이 만료되었습니다.");
        return;
      }

      const response = await fetch(`/api/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '사용자 삭제 실패');
      }

      toast.success("사용자가 삭제되었습니다.");
      loadUsers();
      loadStats();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error instanceof Error ? error.message : "사용자 삭제 실패");
    }
  };

  const handleChangeRole = async (userId: string, newRole: AppRole) => {
    try {
      // First, delete existing role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Then insert the new role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      toast.success(`역할이 ${getRoleName(newRole)}(으)로 변경되었습니다.`);
      loadUsers();
    } catch (error) {
      console.error("Error changing role:", error);
      toast.error("역할 변경 실패");
    }
  };

  const getRoleName = (role: AppRole): string => {
    switch (role) {
      case "admin": return "관리자";
      case "elder": return "장로";
      case "user": return "사용자";
      default: return "사용자";
    }
  };

  const getRoleBadgeVariant = (role: AppRole): "default" | "secondary" | "outline" => {
    switch (role) {
      case "admin": return "default";
      case "elder": return "secondary";
      default: return "outline";
    }
  };

  const filteredUsers = users.filter(u => 
    u.profile?.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.profile?.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredVocabs = vocabularies.filter(v =>
    v.name.toLowerCase().includes(vocabSearch.toLowerCase()) ||
    v.description?.toLowerCase().includes(vocabSearch.toLowerCase())
  );

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
    g.description?.toLowerCase().includes(groupSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (!loading && user && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-destructive">관리자 권한이 필요한 페이지입니다.</div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="관리자 대시보드" />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              전체 통계
            </h2>
            <img 
              src={new URL('@/assets/junsuk-23.png', import.meta.url).href} 
              alt="Admin Junsuk" 
              className="w-20 h-20"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Users, label: "전체 사용자", value: stats.totalUsers, color: "text-primary" },
              { icon: BookOpen, label: "전체 단어장", value: stats.totalVocabularies, color: "text-success" },
              { icon: Activity, label: "전체 단어", value: stats.totalWords, color: "text-warning" },
              { icon: UsersRound, label: "전체 그룹", value: stats.totalGroups, color: "text-accent" },
              { icon: BookOpen, label: "공유 단어장", value: stats.publicVocabularies, color: "text-blue-500" },
              { icon: UsersRound, label: "공개 그룹", value: stats.publicGroups, color: "text-purple-500" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-gradient-card">
                  <CardContent className="p-4">
                    <stat.icon className={`w-6 h-6 mb-2 ${stat.color}`} />
                    <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-xl font-bold">{statsLoading ? "..." : stat.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              사용자
            </TabsTrigger>
            <TabsTrigger value="vocabularies">
              <BookOpen className="w-4 h-4 mr-2" />
              단어장
            </TabsTrigger>
            <TabsTrigger value="groups">
              <UsersRound className="w-4 h-4 mr-2" />
              그룹
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>사용자 관리</CardTitle>
                <CardDescription>전체 사용자 목록 및 역할 관리</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="사용자 검색..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filteredUsers.map((u) => (
                      <Card key={u.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {u.profile?.full_name || u.profile?.username || "이름 없음"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                ID: {u.id.slice(0, 8)}...
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                가입일: {new Date(u.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={u.role || "user"}
                                onValueChange={(value) => handleChangeRole(u.id, value as AppRole)}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">관리자</SelectItem>
                                  <SelectItem value="elder">장로</SelectItem>
                                  <SelectItem value="user">사용자</SelectItem>
                                </SelectContent>
                              </Select>
                              {u.id !== user?.id && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteUser(
                                    u.id, 
                                    u.profile?.full_name || u.profile?.username || "이름 없음"
                                  )}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        사용자가 없습니다.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vocabularies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>단어장 관리</CardTitle>
                <CardDescription>전체 단어장 목록 및 관리</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="단어장 검색..."
                    value={vocabSearch}
                    onChange={(e) => setVocabSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filteredVocabs.map((v) => (
                      <Card key={v.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium truncate">{v.name}</p>
                                {v.is_public && (
                                  <Badge variant="outline" className="text-xs">공개</Badge>
                                )}
                              </div>
                              {v.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {v.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <p className="text-xs text-muted-foreground">
                                  단어: {v.word_count}개
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  생성일: {new Date(v.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/vocabularies/${v.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteVocabulary(v.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {filteredVocabs.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        단어장이 없습니다.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>그룹 관리</CardTitle>
                <CardDescription>전체 그룹 목록 및 관리</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="그룹 검색..."
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filteredGroups.map((g) => (
                      <Card key={g.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium truncate">{g.name}</p>
                                {g.is_public && (
                                  <Badge variant="outline" className="text-xs">공개</Badge>
                                )}
                              </div>
                              {g.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {g.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <p className="text-xs text-muted-foreground">
                                  멤버: {g.member_count}명
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  생성일: {new Date(g.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/groups/${g.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteGroup(g.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {filteredGroups.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        그룹이 없습니다.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default Admin;
