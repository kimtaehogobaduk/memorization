import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ChevronDown, Upload } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface WordInput {
  id: string;
  word: string;
  meaning: string;
  example: string;
  note: string;
  part_of_speech: string;
  pronunciation: string;
  detailed_meaning: string;
  example_translation: string;
  frequency: number;
  difficulty: number;
  image_url: string;
}

const CreateVocabulary = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("english");
  const [words, setWords] = useState<WordInput[]>([
    { id: "1", word: "", meaning: "", example: "", note: "", part_of_speech: "", pronunciation: "", detailed_meaning: "", example_translation: "", frequency: 0, difficulty: 0, image_url: "" },
  ]);
  const [expandedWords, setExpandedWords] = useState<Set<string>>(new Set());

  const addWord = () => {
    const newId = (words.length + 1).toString();
    setWords([...words, { id: newId, word: "", meaning: "", example: "", note: "", part_of_speech: "", pronunciation: "", detailed_meaning: "", example_translation: "", frequency: 0, difficulty: 0, image_url: "" }]);
  };

  const removeWord = (id: string) => {
    if (words.length > 1) {
      setWords(words.filter(w => w.id !== id));
    }
  };

  const updateWord = (id: string, field: keyof WordInput, value: string | number) => {
    setWords(words.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedWords);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedWords(newExpanded);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("단어장 이름을 입력해주세요.");
      return;
    }

    const validWords = words.filter(w => w.word.trim() && w.meaning.trim());
    
    if (validWords.length === 0) {
      toast.error("최소 1개 이상의 단어를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      if (user) {
        // Save to Supabase
        const { data: vocabulary, error: vocabError } = await supabase
          .from("vocabularies")
          .insert({
            user_id: user.id,
            name: name.trim(),
            description: description.trim() || null,
            language,
          })
          .select()
          .single();

        if (vocabError) throw vocabError;

        const wordsToInsert = validWords.map((w, index) => ({
          vocabulary_id: vocabulary.id,
          word: w.word.trim(),
          meaning: w.meaning.trim(),
          example: w.example.trim() || null,
          note: w.note.trim() || null,
          part_of_speech: w.part_of_speech || null,
          order_index: index,
        }));

        const { error: wordsError } = await supabase
          .from("words")
          .insert(wordsToInsert);

        if (wordsError) throw wordsError;

        toast.success("단어장이 생성되었습니다!");
        navigate(`/vocabularies/${vocabulary.id}`);
      } else {
        // Save to localStorage
        const { localStorageService } = await import("@/services/localStorageService");
        const vocabulary = localStorageService.saveVocabulary({
          name: name.trim(),
          description: description.trim() || null,
          language,
        });

        const wordsToInsert = validWords.map((w, index) => ({
          vocabulary_id: vocabulary.id,
          word: w.word.trim(),
          meaning: w.meaning.trim(),
          example: w.example.trim() || null,
          note: w.note.trim() || null,
          part_of_speech: w.part_of_speech || null,
          order_index: index,
        }));

        localStorageService.saveWords(wordsToInsert);

        toast.success("단어장이 생성되었습니다!");
        navigate(`/vocabularies/${vocabulary.id}`);
      }
    } catch (error) {
      console.error("Error creating vocabulary:", error);
      toast.error("단어장 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="새 단어장 만들기" showBack />
      
      <form onSubmit={handleSubmit} className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">단어장 이름 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 토익 필수 단어"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명 (선택)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="단어장에 대한 설명을 입력하세요"
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
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">단어 입력</h2>
          <Button type="button" variant="outline" size="sm" onClick={addWord}>
            <Plus className="w-4 h-4 mr-2" />
            단어 추가
          </Button>
        </div>

        <div className="space-y-4">
          {words.map((word, index) => (
            <Card key={word.id}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    단어 {index + 1}
                  </span>
                  {words.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeWord(word.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label>이미지 (선택)</Label>
                    <label>
                      <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="text-center text-sm text-muted-foreground">
                          <Upload className="w-6 h-6 mx-auto mb-2" />
                          <div>단어 이미지를</div>
                          <div>지정해 주세요</div>
                        </div>
                      </div>
                      <input type="file" accept="image/*" className="hidden" />
                    </label>
                  </div>

                  {/* Frequency and Difficulty */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="space-y-2">
                      <Label>사용빈도</Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => updateWord(word.id, "frequency", star)}
                            className="transition-colors"
                          >
                            <span className={`text-2xl ${word.frequency >= star ? 'text-warning' : 'text-muted'}`}>
                              {word.frequency >= star ? '★' : '☆'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>난이도</Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => updateWord(word.id, "difficulty", star)}
                            className="transition-colors"
                          >
                            <span className={`text-2xl ${word.difficulty >= star ? 'text-warning' : 'text-muted'}`}>
                              {word.difficulty >= star ? '★' : '☆'}
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
                    <Label htmlFor={`word-${word.id}`}>단어 *</Label>
                    <Input
                      id={`word-${word.id}`}
                      value={word.word}
                      onChange={(e) => updateWord(word.id, "word", e.target.value)}
                      placeholder="단어"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`meaning-${word.id}`}>뜻 *</Label>
                    <Input
                      id={`meaning-${word.id}`}
                      value={word.meaning}
                      onChange={(e) => updateWord(word.id, "meaning", e.target.value)}
                      placeholder="뜻"
                    />
                  </div>

                  <Collapsible open={expandedWords.has(word.id)} onOpenChange={() => toggleExpanded(word.id)}>
                    <CollapsibleTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                        더보기
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedWords.has(word.id) ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-3 mt-3">
                      <div className="space-y-2">
                        <Label htmlFor={`example-${word.id}`}>예문 (선택)</Label>
                        <Input
                          id={`example-${word.id}`}
                          value={word.example}
                          onChange={(e) => updateWord(word.id, "example", e.target.value)}
                          placeholder="예문"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`part_of_speech-${word.id}`}>품사 (선택)</Label>
                        <Input
                          id={`part_of_speech-${word.id}`}
                          value={word.part_of_speech}
                          onChange={(e) => updateWord(word.id, "part_of_speech", e.target.value)}
                          placeholder="예: 명사, 동사"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`pronunciation-${word.id}`}>발음 (선택)</Label>
                        <Input
                          id={`pronunciation-${word.id}`}
                          value={word.pronunciation}
                          onChange={(e) => updateWord(word.id, "pronunciation", e.target.value)}
                          placeholder="발음 기호"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`note-${word.id}`}>메모 (선택)</Label>
                        <Input
                          id={`note-${word.id}`}
                          value={word.note}
                          onChange={(e) => updateWord(word.id, "note", e.target.value)}
                          placeholder="추가 메모"
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/vocabularies")}
            disabled={loading}
          >
            취소
          </Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "생성 중..." : "단어장 만들기"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateVocabulary;
