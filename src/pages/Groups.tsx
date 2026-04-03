import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  member_count: number;
  is_owner: boolean;
}

const Groups = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (user) {
        loadGroups();
      } else {
        setLoadingGroups(false);
      }
    }
  }, [user, loading]);

  const loadGroups = async () => {
    try {
      setLoadingGroups(true);

      // Get groups where user is owner
      const { data: ownedGroups } = await supabase
        .from("groups")
        .select(`
          id,
          name,
          description,
          cover_image_url,
          owner_id,
          group_members(count)
        `)
        .eq("owner_id", user?.id);

      // Get groups where user is member
      const { data: memberGroups } = await supabase
        .from("group_members")
        .select(`
          groups(
            id,
            name,
            description,
            cover_image_url,
            owner_id,
            group_members(count)
          )
        `)
        .eq("user_id", user?.id);

      const allGroups = [
        ...(ownedGroups?.map(g => ({
          id: g.id,
          name: g.name,
          description: g.description,
          cover_image_url: g.cover_image_url,
          member_count: g.group_members?.[0]?.count || 0,
          is_owner: true,
        })) || []),
        ...(memberGroups?.map(m => ({
          id: m.groups.id,
          name: m.groups.name,
          description: m.groups.description,
          cover_image_url: m.groups.cover_image_url,
          member_count: m.groups.group_members?.[0]?.count || 0,
          is_owner: false,
        })) || []),
      ];

      setGroups(allGroups);
    } catch (error) {
      console.error("Error loading groups:", error);
      toast.error("그룹을 불러오는데 실패했습니다.");
    } finally {
      setLoadingGroups(false);
    }
  };

  if (loading || loadingGroups) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="그룹"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/groups/public")}>
              공개 그룹
            </Button>
            <Button size="icon" variant="outline" onClick={() => navigate("/groups/join")}>
              <LogIn className="w-5 h-5" />
            </Button>
            <Button size="icon" onClick={() => navigate("/groups/new")}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        }
      />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <img 
              src={new URL('@/assets/junsuk-22.png', import.meta.url).href} 
              alt="Junsuk peace signs" 
              className="w-40 h-40 mx-auto mb-4"
            />
            <h2 className="text-xl font-semibold mb-2">아직 그룹이 없습니다</h2>
            <p className="text-muted-foreground mb-6">
              그룹을 만들거나 가입해서 함께 학습해보세요!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/groups/public")} variant="outline">
                공개 그룹 찾기
              </Button>
              <Button onClick={() => navigate("/groups/join")} variant="outline">
                <LogIn className="w-5 h-5 mr-2" />
                코드로 가입
              </Button>
              <Button onClick={() => navigate("/groups/new")}>
                <Plus className="w-5 h-5 mr-2" />
                그룹 만들기
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {groups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/groups/${group.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {group.cover_image_url ? (
                        <img
                          src={group.cover_image_url}
                          alt={group.name}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gradient-junsuk flex items-center justify-center flex-shrink-0">
                          <Users className="w-10 h-10 text-white" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{group.name}</h3>
                          {group.is_owner && (
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                              관리자
                            </span>
                          )}
                        </div>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {group.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{group.member_count}명</span>
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

export default Groups;
