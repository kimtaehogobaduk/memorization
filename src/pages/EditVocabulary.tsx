import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadImageWithRetry, validateImageFile } from "@/utils/imageUpload";
import { Plus, Trash2, Sparkles, Loader2, Upload, List } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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

interface Derivative {
  word: string;
  meaning: string;
}

interface NewWordInput {
  word: string;
  meaning: string;
  example: string;
  note: string;
  part_of_speech: string;
  pronunciation: string;
  frequency: number;
  difficulty: number;
  image_url: string;
  synonyms: string;
  antonyms: string;
  derivatives: Derivative[];
}

const emptyNewWord = (): NewWordInput => ({
  word: "",
  meaning: "",
  example: "",
  note: "",
  part_of_speech: "",
  pronunciation: "",
  frequency: 0,
  difficulty: 0,
  image_url: "",
  synonyms: "",
  antonyms: "",
  derivatives: [],
});

const EditVocabulary = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("english");
  const [isPublic, setIsPublic] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [activeTab, setActiveTab] = useState("info");
  const [aiAutoMeaning, setAiAutoMeaning] = useState(false);

  // New word form state (matches CreateVocabulary format)
  const [newWord, setNewWord] = useState<NewWordInput>(emptyNewWord());
  const [addingWord, setAddingWord] = useState(false);
  const [fetchingNewMeaning, setFetchingNewMeaning] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bulk input mode
  const [wordInputMode, setWordInputMode] = useState<"single" | "bulk">("single");
  const [bulkText, setBulkText] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkResults, setBulkResults] = useState<Array<{ word: string; status: "pending" | "loading" | "done" | "error"; error?: string }>>([]);

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
        setIsPublic(vocab.is_public || false);
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

  const fetchAIMeaningForNew = useCallback(async (wordText: string) => {
    const trimmedWord = wordText.trim();
    if (!trimmedWord || !aiAutoMeaning) return;

    setFetchingNewMeaning(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-word-meaning", {
        body: { word: trimmedWord },
      });

      if (error) {
        let backendMessage = "";
        const context = (error as { context?: Response }).context;
        if (context) {
          const parsed = await context.clone().json().catch(() => null);
          backendMessage = parsed?.error ?? "";
        }
        throw new Error(backendMessage || error.message);
      }

      setNewWord(prev => ({
        ...prev,
        meaning: data?.meaning || prev.meaning,
        example: data?.example || prev.example,
        part_of_speech: data?.part_of_speech || prev.part_of_speech,
        pronunciation: data?.pronunciation || prev.pronunciation,
        frequency: data?.frequency || prev.frequency,
        difficulty: data?.difficulty || prev.difficulty,
        synonyms: data?.synonyms || prev.synonyms,
        antonyms: data?.antonyms || prev.antonyms,
        derivatives: Array.isArray(data?.derivatives) && data.derivatives.length > 0
          ? data.derivatives
          : prev.derivatives,
      }));
    } catch (error) {
      console.error("Error fetching AI meaning:", error);
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("rate limit") || message.includes("429")) {
        toast.error("요청이 많아요. 잠시 후 다시 시도해주세요.");
      } else if (message.includes("payment") || message.includes("402")) {
        toast.error("AI 사용 한도를 확인해주세요.");
      } else {
        toast.error("AI 뜻 자동입력에 실패했습니다.");
      }
    } finally {
      setFetchingNewMeaning(false);
    }
  }, [aiAutoMeaning]);

  const handleNewWordChange = (value: string) => {
    setNewWord(prev => ({ ...prev, word: value }));
    const trimmed = value.trim();
    if (aiAutoMeaning && trimmed.length >= 3) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchAIMeaningForNew(trimmed);
      }, 1500);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (!validateImageFile(file, 5)) return;
    try {
      setUploadingImage(true);
      const fileName = `${Math.random()}.jpg`;
      const filePath = `temp/${fileName}`;
      const publicUrl = await uploadImageWithRetry('word-images', filePath, file, {
        compress: true,
        maxSize: 600,
      });
      if (!publicUrl) { setUploadingImage(false); return; }
      setNewWord(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("이미지가 업로드되었습니다!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("이미지 업로드에 실패했습니다.");
    } finally {
      setUploadingImage(false);
    }
  };

  const addDerivative = () => {
    setNewWord(prev => ({ ...prev, derivatives: [...prev.derivatives, { word: "", meaning: "" }] }));
  };

  const updateDerivative = (index: number, field: "word" | "meaning", value: string) => {
    setNewWord(prev => {
      const newDerivatives = [...prev.derivatives];
      newDerivatives[index] = { ...newDerivatives[index], [field]: value };
      return { ...prev, derivatives: newDerivatives };
    });
  };

  const removeDerivative = (index: number) => {
    setNewWord(prev => ({
      ...prev,
      derivatives: prev.derivatives.filter((_, i) => i !== index),
    }));
  };

  const handleBulkProcess = async () => {
    const wordList = bulkText
      .split("\n")
      .map(w => w.trim())
      .filter(w => w.length > 0 && w.length < 100);

    if (wordList.length === 0) {
      toast.error("단어를 입력해주세요.");
      return;
    }
    if (wordList.length > 200) {
      toast.error("최대 200개까지 입력 가능합니다.");
      return;
    }

    setBulkProcessing(true);
    setBulkTotal(wordList.length);
    setBulkProgress(0);
    setBulkResults(wordList.map(w => ({ word: w, status: "pending" as const })));

    let successCount = 0;
    const batchSize = 3;

    for (let i = 0; i < wordList.length; i += batchSize) {
      const batch = wordList.slice(i, i + batchSize);
      const promises = batch.map(async (wordText, batchIdx) => {
        const globalIdx = i + batchIdx;
        setBulkResults(prev => prev.map((r, ri) => ri === globalIdx ? { ...r, status: "loading" } : r));

        try {
          // Fetch AI meaning
          let aiData: any = {};
          try {
            const { data, error } = await supabase.functions.invoke("get-word-meaning", {
              body: { word: wordText },
            });
            if (!error && data) aiData = data;
          } catch {}

          // Insert word
          const { error: insertError } = await supabase
            .from("words")
            .insert({
              vocabulary_id: id,
              word: wordText,
              meaning: aiData.meaning || wordText,
              example: aiData.example || null,
              part_of_speech: aiData.part_of_speech || null,
              order_index: words.length + globalIdx,
              frequency: aiData.frequency || 0,
              difficulty: aiData.difficulty || 0,
              synonyms: aiData.synonyms || null,
              antonyms: aiData.antonyms || null,
              derivatives: Array.isArray(aiData.derivatives) && aiData.derivatives.length > 0
                ? JSON.stringify(aiData.derivatives) : null,
            } as any);

          if (insertError) throw insertError;

          successCount++;
          setBulkResults(prev => prev.map((r, ri) => ri === globalIdx ? { ...r, status: "done" } : r));
        } catch (err) {
          setBulkResults(prev => prev.map((r, ri) => ri === globalIdx ? { ...r, status: "error", error: "실패" } : r));
        }

        setBulkProgress(prev => prev + 1);
      });

      await Promise.all(promises);
      if (i + batchSize < wordList.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    toast.success(`${successCount}/${wordList.length}개 단어가 추가되었습니다!`);
    setBulkProcessing(false);
    setBulkText("");
    loadVocabulary();
  };

  const handleAddWord = async () => {
    if (!newWord.word.trim() || !newWord.meaning.trim()) {
      toast.error("단어와 뜻을 입력해주세요.");
      return;
    }

    setAddingWord(true);
    try {
      const { error } = await supabase
        .from("words")
        .insert({
          vocabulary_id: id,
          word: newWord.word.trim(),
          meaning: newWord.meaning.trim(),
          example: newWord.example.trim() || null,
          part_of_speech: newWord.part_of_speech.trim() || null,
          note: newWord.note.trim() || null,
          order_index: words.length,
          image_url: newWord.image_url || null,
          frequency: newWord.frequency || 0,
          difficulty: newWord.difficulty || 0,
          synonyms: newWord.synonyms.trim() || null,
          antonyms: newWord.antonyms.trim() || null,
          derivatives: newWord.derivatives.length > 0 ? JSON.stringify(newWord.derivatives) : null,
        } as any);

      if (error) throw error;

      toast.success("단어가 추가되었습니다!");
      setNewWord(emptyNewWord());
      loadVocabulary();
    } catch (error) {
      console.error("Error adding word:", error);
      toast.error("단어 추가에 실패했습니다.");
    } finally {
      setAddingWord(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await supabase
        .from("vocabularies")
        .update({ name, description, language, is_public: isPublic })
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
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="단어장 이름" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="단어장 설명" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">언어</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">영어</SelectItem>
                      <SelectItem value="chinese">중국어</SelectItem>
                      <SelectItem value="japanese">일본어</SelectItem>
                      <SelectItem value="korean">한국어</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is-public">공개 단어장</Label>
                  <Switch id="is-public" checked={isPublic} onCheckedChange={setIsPublic} />
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
                    <Button variant="ghost" size="icon" onClick={() => deleteChapter(chapter.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="words">
            <div className="space-y-4">
              {/* Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={wordInputMode === "single" ? "default" : "outline"}
                  className="flex-1 flex items-center gap-2"
                  onClick={() => setWordInputMode("single")}
                >
                  <Plus className="w-4 h-4" />
                  단어 하나씩 추가
                </Button>
                <Button
                  type="button"
                  variant={wordInputMode === "bulk" ? "default" : "outline"}
                  className="flex-1 flex items-center gap-2"
                  onClick={() => setWordInputMode("bulk")}
                >
                  <List className="w-4 h-4" />
                  단어 일괄 입력 (AI)
                </Button>
              </div>

              {wordInputMode === "bulk" ? (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      단어 일괄 입력 (AI 자동 채우기)
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      한 줄에 단어 하나씩 입력하세요. AI가 뜻, 품사, 예문 등을 자동으로 채워줍니다. (최대 200개)
                    </p>
                    <Textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder={"apple\nbanana\ncomprehensive\nambiguous"}
                      rows={10}
                      disabled={bulkProcessing}
                    />
                    <div className="text-sm text-muted-foreground text-right">
                      {bulkText.split("\n").filter(l => l.trim()).length}개 단어
                    </div>

                    {bulkProcessing && (
                      <div className="space-y-2">
                        <Progress value={bulkTotal > 0 ? (bulkProgress / bulkTotal) * 100 : 0} />
                        <p className="text-sm text-center text-muted-foreground">
                          {bulkProgress} / {bulkTotal} 처리 중...
                        </p>
                      </div>
                    )}

                    {bulkResults.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {bulkResults.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className={
                              r.status === "done" ? "text-green-500" :
                              r.status === "error" ? "text-destructive" :
                              r.status === "loading" ? "text-primary" : "text-muted-foreground"
                            }>
                              {r.status === "done" ? "✓" : r.status === "error" ? "✗" : r.status === "loading" ? "⟳" : "·"}
                            </span>
                            <span>{r.word}</span>
                            {r.status === "loading" && <Loader2 className="w-3 h-3 animate-spin" />}
                          </div>
                        ))}
                      </div>
                    )}

                    <Button onClick={handleBulkProcess} disabled={bulkProcessing || !bulkText.trim()} className="w-full">
                      {bulkProcessing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI 처리 중...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" /> AI로 일괄 추가</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
              {/* AI Toggle */}
              <Button
                type="button"
                variant={aiAutoMeaning ? "default" : "outline"}
                className="w-full flex items-center gap-2"
                onClick={() => setAiAutoMeaning(!aiAutoMeaning)}
              >
                <Sparkles className="w-4 h-4" />
                AI 자동 입력 (뜻/빈도/난이도/유의어/반의어/파생어)
                {aiAutoMeaning && <span className="ml-auto text-xs">켜짐</span>}
              </Button>

              {/* Add New Word Form */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    새 단어 추가
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Image Upload */}
                    <div className="space-y-2">
                      <Label>이미지 (선택)</Label>
                      {newWord.image_url && (
                        <img src={newWord.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-2" />
                      )}
                      <label>
                        <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="text-center text-sm text-muted-foreground">
                            {uploadingImage ? <div>업로드 중...</div> : (
                              <>
                                <Upload className="w-6 h-6 mx-auto mb-2" />
                                <div>단어 이미지를</div>
                                <div>지정해 주세요</div>
                              </>
                            )}
                          </div>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }} disabled={uploadingImage} />
                      </label>
                    </div>

                    {/* Frequency and Difficulty */}
                    <div className="md:col-span-2 space-y-3">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          사용빈도
                          {fetchingNewMeaning && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                        </Label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} type="button" onClick={() => setNewWord(prev => ({ ...prev, frequency: star }))} className="transition-colors">
                              <span className={`text-2xl ${newWord.frequency >= star ? 'text-warning' : 'text-muted'}`}>
                                {newWord.frequency >= star ? '★' : '☆'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>난이도</Label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} type="button" onClick={() => setNewWord(prev => ({ ...prev, difficulty: star }))} className="transition-colors">
                              <span className={`text-2xl ${newWord.difficulty >= star ? 'text-warning' : 'text-muted'}`}>
                                {newWord.difficulty >= star ? '★' : '☆'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Word Input Fields */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        단어 *
                        {aiAutoMeaning && (
                          <span className="text-xs text-primary flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI 자동입력
                          </span>
                        )}
                      </Label>
                      <Input value={newWord.word} onChange={(e) => handleNewWordChange(e.target.value)} placeholder="단어" />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        뜻 *
                        {fetchingNewMeaning && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                      </Label>
                      <Input value={newWord.meaning} onChange={(e) => setNewWord(prev => ({ ...prev, meaning: e.target.value }))} placeholder="뜻" />
                    </div>

                    <div className="space-y-2">
                      <Label>예문 (선택)</Label>
                      <Input value={newWord.example} onChange={(e) => setNewWord(prev => ({ ...prev, example: e.target.value }))} placeholder="예문" />
                    </div>

                    <div className="space-y-2">
                      <Label>품사 (선택)</Label>
                      <Input value={newWord.part_of_speech} onChange={(e) => setNewWord(prev => ({ ...prev, part_of_speech: e.target.value }))} placeholder="예: 명사, 동사" />
                    </div>

                    <div className="space-y-2">
                      <Label>발음 (선택)</Label>
                      <Input value={newWord.pronunciation} onChange={(e) => setNewWord(prev => ({ ...prev, pronunciation: e.target.value }))} placeholder="발음 기호" />
                    </div>

                    {/* Synonyms */}
                    <div className="space-y-2">
                      <Label>유의어 (선택)</Label>
                      <Input value={newWord.synonyms} onChange={(e) => setNewWord(prev => ({ ...prev, synonyms: e.target.value }))} placeholder="예: happy, joyful, glad" />
                    </div>

                    {/* Antonyms */}
                    <div className="space-y-2">
                      <Label>반의어 (선택)</Label>
                      <Input value={newWord.antonyms} onChange={(e) => setNewWord(prev => ({ ...prev, antonyms: e.target.value }))} placeholder="예: sad, unhappy" />
                    </div>

                    {/* Derivatives */}
                    <div className="space-y-2">
                      <Label className="flex items-center justify-between">
                        <span>파생어 (선택)</span>
                        <Button type="button" variant="outline" size="sm" onClick={addDerivative}>
                          <Plus className="w-3 h-3 mr-1" /> 추가
                        </Button>
                      </Label>
                      {newWord.derivatives.map((d, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input
                            value={d.word}
                            onChange={(e) => updateDerivative(i, "word", e.target.value)}
                            placeholder="파생어"
                            className="flex-1"
                          />
                          <Input
                            value={d.meaning}
                            onChange={(e) => updateDerivative(i, "meaning", e.target.value)}
                            placeholder="뜻"
                            className="flex-1"
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeDerivative(i)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Label>메모 (선택)</Label>
                      <Input value={newWord.note} onChange={(e) => setNewWord(prev => ({ ...prev, note: e.target.value }))} placeholder="추가 메모" />
                    </div>
                  </div>

                  <Button onClick={handleAddWord} disabled={addingWord} className="w-full">
                    {addingWord ? "추가 중..." : "단어 추가"}
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Words */}
              {words.map((word) => (
                <WordManager
                  key={word.id}
                  word={word}
                  vocabularyId={id!}
                  onUpdate={loadVocabulary}
                  aiAutoMeaning={aiAutoMeaning}
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
