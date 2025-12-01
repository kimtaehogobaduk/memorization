import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Vocabulary {
  id: string;
  name: string;
}

const CreateGroup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    if (user) {
      loadVocabularies();
    }
  }, [user]);

  const loadVocabularies = async () => {
    try {
      const { data } = await supabase
        .from("vocabularies")
        .select("id, name")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      setVocabularies(data || []);
    } catch (error) {
      console.error("Error loading vocabularies:", error);
      toast.error("단어장을 불러오는데 실패했습니다.");
    }
  };

  const generateJoinCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("그룹 이름을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const joinCode = generateJoinCode();
      
      const { data, error } = await supabase
        .from("groups")
        .insert({
          name,
          description,
          owner_id: user?.id,
          is_public: isPublic,
          requires_approval: requiresApproval,
          join_code: joinCode,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as group member
      await supabase
        .from("group_members")
        .insert({
          group_id: data.id,
          user_id: user?.id,
          role: "owner",
        });

      toast.success("그룹이 생성되었습니다!");
      navigate(`/groups/${data.id}`);
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("그룹 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <Header title="그룹 만들기" showBack onBack={() => navigate("/groups")} />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">그룹 이름 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 토익 스터디 그룹"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">그룹 설명</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="그룹에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>공개 범위 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isPublic">공개 그룹</Label>
                  <p className="text-sm text-muted-foreground">
                    누구나 검색하고 가입할 수 있습니다
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              {!isPublic && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requiresApproval">가입 승인 필요</Label>
                    <p className="text-sm text-muted-foreground">
                      관리자 승인 후 가입됩니다
                    </p>
                  </div>
                  <Switch
                    id="requiresApproval"
                    checked={requiresApproval}
                    onCheckedChange={setRequiresApproval}
                  />
                </div>
              )}
            </CardContent>
          </Card>


          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "생성 중..." : "그룹 만들기"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;
