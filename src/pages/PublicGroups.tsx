import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Users, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PublicGroup {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  member_count: number;
  vocabulary_name: string | null;
}

const PublicGroups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<PublicGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadPublicGroups();
  }, []);

  const loadPublicGroups = async () => {
    try {
      setLoading(true);
      
      // Get public groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select(`
          id,
          name,
          description,
          cover_image_url,
          vocabulary_id
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;

      // Get member counts and vocabulary names for each group
      const groupsWithDetails = await Promise.all(
        (groupsData || []).map(async (group) => {
          // Get member count
          const { count } = await supabase
            .from("group_members")
            .select("id", { count: "exact", head: true })
            .eq("group_id", group.id);

          // Get vocabulary name if exists
          let vocabularyName = null;
          if (group.vocabulary_id) {
            const { data: vocabData } = await supabase
              .from("vocabularies")
              .select("name")
              .eq("id", group.vocabulary_id)
              .single();
            vocabularyName = vocabData?.name || null;
          }

          return {
            ...group,
            member_count: count || 0,
            vocabulary_name: vocabularyName,
          };
        })
      );

      // Sort by member count (highest first)
      groupsWithDetails.sort((a, b) => b.member_count - a.member_count);

      setGroups(groupsWithDetails);
    } catch (error) {
      console.error("Error loading public groups:", error);
      toast.error("공개 그룹을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }

    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .single();

      if (existingMember) {
        toast.info("이미 가입한 그룹입니다.");
        navigate(`/groups/${groupId}`);
        return;
      }

      // Join the group
      const { error } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: "member",
        });

      if (error) throw error;

      toast.success("그룹에 가입했습니다!");
      navigate(`/groups/${groupId}`);
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error("그룹 가입에 실패했습니다.");
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="공개 그룹 찾기" showBack onBack={() => navigate("/groups")} />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="그룹 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">공개 그룹이 없습니다</h2>
            <p className="text-muted-foreground">
              {searchQuery ? "검색 결과가 없습니다" : "아직 공개된 그룹이 없습니다"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGroups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {group.cover_image_url ? (
                        <img
                          src={group.cover_image_url}
                          alt={group.name}
                          className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Users className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1">{group.name}</h3>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {group.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{group.member_count}명</span>
                          </div>
                          {group.vocabulary_name && (
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              <span className="truncate">{group.vocabulary_name}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">공개</Badge>
                          <Button
                            size="sm"
                            onClick={() => handleJoinGroup(group.id)}
                          >
                            가입하기
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default PublicGroups;
