import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2 } from "lucide-react";
import { WordManager } from "@/components/WordManager";

interface Chapter {
  id: string;
  name: string;
  description: string;
  order_index: number;
}

interface Word {
  id: string;
  chapter_id: string | null;
  word: string;
  meaning: string;
  example: string;
  note: string;
  part_of_speech: string;
  order_index: number;
}

const EditVocabulary = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("english");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    if (id && user) {
      loadVocabulary();
    }
  }, [id, user]);

  const loadVocabulary = async () => {
    try {
      const { data: vocab } = await supabase
        .from("vocabularies")
        .select("*")
        .eq("id", id)
        .single();

      if (vocab) {
        setName(vocab.name);
        setDescription(vocab.description || "");
        setLanguage(vocab.language);
      }

      const { data: chaptersData } = await supabase
        .from("chapters")
        .select("*")
        .eq("vocabulary_id", id)
        .order("order_index");

      setChapters(chaptersData || []);

      const { data: wordsData } = await supabase
        .from("words")
        .select("*")
        .eq("vocabulary_id", id)
        .order("order_index");

      setWords(wordsData || []);
    } catch (error) {
      console.error("Error loading vocabulary:", error);
      toast.error("단어장을 불러오는데 실패했습니다.");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await supabase
        .from("vocabularies")
        .update({ name, description, language })
        .eq("id", id);

      toast.success("단어장이 수정되었습니다!");
      navigate(`/vocabularies/${id}`);
    } catch (error) {
      console.error("Error updating vocabulary:", error);
      toast.error("단어장 수정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const addChapter = async () => {
    try {
      const { data } = await supabase
        .from("chapters")
        .insert({
          vocabulary_id: id,
          name: `Chapter ${chapters.length + 1}`,
          description: "",
          order_index: chapters.length,
        })
        .select()
        .single();

      if (data) {
        setChapters([...chapters, data]);
        toast.success("챕터가 추가되었습니다!");
      }
    } catch (error) {
      console.error("Error adding chapter:", error);
      toast.error("챕터 추가에 실패했습니다.");
    }
  };

  const deleteChapter = async (chapterId: string) => {
    try {
      await supabase.from("chapters").delete().eq("id", chapterId);
      setChapters(chapters.filter(c => c.id !== chapterId));
      toast.success("챕터가 삭제되었습니다!");
    } catch (error) {
      console.error("Error deleting chapter:", error);
      toast.error("챕터 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="단어장 수정" showBack onBack={() => navigate(`/vocabularies/${id}`)} />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="info">정보</TabsTrigger>
            <TabsTrigger value="chapters">챕터</TabsTrigger>
            <TabsTrigger value="words">단어</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">단어장 이름</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="단어장 이름"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="단어장 설명"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">언어</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">영어</SelectItem>
                      <SelectItem value="chinese">중국어</SelectItem>
                      <SelectItem value="japanese">일본어</SelectItem>
                      <SelectItem value="korean">한국어</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSave} disabled={loading} className="w-full">
                  {loading ? "저장 중..." : "저장"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chapters">
            <div className="space-y-4">
              <Button onClick={addChapter} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                챕터 추가
              </Button>

              {chapters.map((chapter) => (
                <Card key={chapter.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{chapter.name}</h3>
                      {chapter.description && (
                        <p className="text-sm text-muted-foreground">{chapter.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteChapter(chapter.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="words">
            <div className="space-y-4">
              {words.map((word) => (
                <WordManager
                  key={word.id}
                  word={word}
                  vocabularyId={id!}
                  onUpdate={loadVocabulary}
                  onDelete={async () => {
                    try {
                      await supabase.from("words").delete().eq("id", word.id);
                      toast.success("단어가 삭제되었습니다!");
                      loadVocabulary();
                    } catch (error) {
                      console.error("Error deleting word:", error);
                      toast.error("단어 삭제에 실패했습니다.");
                    }
                  }}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EditVocabulary;
