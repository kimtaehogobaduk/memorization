import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Trash2, UserPlus, Crown } from "lucide-react";

interface Member {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  username: string | null;
}

const GroupSettings = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [vocabularies, setVocabularies] = useState<any[]>([]);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [vocabularyId, setVocabularyId] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id && user) {
      loadGroupData();
      loadVocabularies();
      loadMembers();
    }
  }, [id, user]);

  const loadGroupData = async () => {
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data.owner_id !== user?.id) {
        toast.error("그룹 설정 권한이 없습니다.");
        navigate(`/groups/${id}`);
        return;
      }

      setGroup(data);
      setName(data.name);
      setDescription(data.description || "");
      setVocabularyId(data.vocabulary_id || "");
      setIsPublic(data.is_public);
      setRequiresApproval(data.requires_approval);
      setCoverImageUrl(data.cover_image_url);
    } catch (error) {
      console.error("Error loading group:", error);
      toast.error("그룹 정보를 불러오는데 실패했습니다.");
    }
  };

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
    }
  };

  const loadMembers = async () => {
    try {
      const { data: membersData } = await supabase
        .from("group_members")
        .select("id, user_id, role")
        .eq("group_id", id);

      if (membersData) {
        const membersWithProfile = await Promise.all(
          membersData.map(async (member) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, username")
              .eq("id", member.user_id)
              .single();

            return {
              ...member,
              full_name: profile?.full_name || null,
              username: profile?.username || null,
            };
          })
        );

        setMembers(membersWithProfile);
      }
    } catch (error) {
      console.error("Error loading members:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }

    setCoverImage(file);
    setCoverImageUrl(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!coverImage) return coverImageUrl;

    try {
      const fileExt = coverImage.name.split('.').pop();
      const filePath = `${id}/cover.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('group-images')
        .upload(filePath, coverImage, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('group-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("이미지 업로드에 실패했습니다.");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("그룹 이름을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const imageUrl = await uploadImage();

      const { error } = await supabase
        .from("groups")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          vocabulary_id: vocabularyId || null,
          is_public: isPublic,
          requires_approval: requiresApproval,
          cover_image_url: imageUrl,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("그룹 정보가 수정되었습니다!");
      navigate(`/groups/${id}`);
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("그룹 정보 수정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("그룹이 삭제되었습니다.");
      navigate("/groups");
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("그룹 삭제에 실패했습니다.");
    }
  };

  const transferOwnership = async (newOwnerId: string) => {
    try {
      const { error } = await supabase
        .from("groups")
        .update({ owner_id: newOwnerId })
        .eq("id", id);

      if (error) throw error;

      await supabase
        .from("group_members")
        .update({ role: "member" })
        .eq("group_id", id)
        .eq("user_id", user?.id);

      await supabase
        .from("group_members")
        .update({ role: "owner" })
        .eq("group_id", id)
        .eq("user_id", newOwnerId);

      toast.success("리더 권한이 이양되었습니다.");
      navigate(`/groups/${id}`);
    } catch (error) {
      console.error("Error transferring ownership:", error);
      toast.error("권한 이양에 실패했습니다.");
    }
  };

  const toggleCoOwner = async (memberId: string) => {
    try {
      const member = members.find(m => m.user_id === memberId);
      const newRole = member?.role === "co-owner" ? "member" : "co-owner";

      const { error } = await supabase
        .from("group_members")
        .update({ role: newRole })
        .eq("group_id", id)
        .eq("user_id", memberId);

      if (error) throw error;

      toast.success(newRole === "co-owner" ? "공동 리더로 지정되었습니다." : "공동 리더 권한이 해제되었습니다.");
      loadMembers();
    } catch (error) {
      console.error("Error toggling co-owner:", error);
      toast.error("권한 변경에 실패했습니다.");
    }
  };

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <Header title="그룹 설정" showBack onBack={() => navigate(`/groups/${id}`)} />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>그룹 이미지</CardTitle>
              <CardDescription>그룹을 대표하는 이미지를 설정하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {coverImageUrl && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden">
                  <img src={coverImageUrl} alt="그룹 이미지" className="w-full h-full object-cover" />
                </div>
              )}
              <label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    이미지를 업로드하려면 클릭하세요
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </CardContent>
          </Card>

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

              <div className="space-y-2">
                <Label htmlFor="vocabulary">대표 단어장</Label>
                <Select value={vocabularyId} onValueChange={setVocabularyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="단어장을 선택하세요 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">선택 안 함</SelectItem>
                    {vocabularies.map((vocab) => (
                      <SelectItem key={vocab.id} value={vocab.id}>
                        {vocab.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

          <Card>
            <CardHeader>
              <CardTitle>권한 관리</CardTitle>
              <CardDescription>구성원의 권한을 관리하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {members
                .filter(m => m.user_id !== user?.id)
                .map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {member.full_name || member.username || "사용자"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.role === "co-owner" ? "공동 리더" : "멤버"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={member.role === "co-owner" ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleCoOwner(member.user_id)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {member.role === "co-owner" ? "공동 리더" : "공동 리더 지정"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="outline" size="sm">
                            <Crown className="w-4 h-4 mr-2" />
                            리더 이양
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>리더 권한을 이양하시겠습니까?</AlertDialogTitle>
                            <AlertDialogDescription>
                              이 작업은 되돌릴 수 없습니다. 리더 권한을 이양하면 본인은 일반 멤버가 됩니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={() => transferOwnership(member.user_id)}>
                              이양하기
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "저장 중..." : "변경사항 저장"}
            </Button>
          </div>
        </form>

        <Card className="mt-6 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">위험 구역</CardTitle>
            <CardDescription>이 작업들은 되돌릴 수 없습니다</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  그룹 삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>정말 그룹을 삭제하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    이 작업은 되돌릴 수 없습니다. 그룹과 관련된 모든 데이터가 삭제됩니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground"
                  >
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GroupSettings;
