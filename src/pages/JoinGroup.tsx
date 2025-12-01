import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const JoinGroup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!joinCode.trim()) {
      toast.error("가입 코드를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // Find group by join code
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("join_code", joinCode.toUpperCase())
        .single();

      if (groupError || !group) {
        toast.error("유효하지 않은 가입 코드입니다.");
        setLoading(false);
        return;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", group.id)
        .eq("user_id", user?.id)
        .single();

      if (existingMember) {
        toast.info("이미 가입된 그룹입니다.");
        navigate(`/groups/${group.id}`);
        return;
      }

      // Join group
      const { error: joinError } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user?.id,
          role: "member",
        });

      if (joinError) throw joinError;

      toast.success(`${group.name} 그룹에 가입했습니다!`);
      navigate(`/groups/${group.id}`);
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error("그룹 가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <Header title="그룹 가입" showBack onBack={() => navigate("/groups")} />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>그룹 코드로 가입하기</CardTitle>
            <CardDescription>
              그룹 관리자에게 받은 8자리 코드를 입력하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinCode">가입 코드</Label>
                <Input
                  id="joinCode"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="예: ABC12345"
                  maxLength={8}
                  className="text-center text-2xl tracking-wider font-mono"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "가입 중..." : "그룹 가입하기"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">💡 가입 코드를 모르시나요?</h3>
          <p className="text-sm text-muted-foreground">
            그룹 관리자에게 가입 코드를 요청하거나, 공개 그룹을 검색해보세요.
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinGroup;
