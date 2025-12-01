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
import { uploadImageWithRetry, validateImageFile } from "@/utils/imageUpload";
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
  const [currentPage, setCurrentPage] = useState(0); // 0: 단어장 정보, 1+: 각 단어
  const [uploadingImage, setUploadingImage] = useState(false);

  const addWord = () => {
    const newId = (words.length + 1).toString();
    setWords([...words, { id: newId, word: "", meaning: "", example: "", note: "", part_of_speech: "", pronunciation: "", detailed_meaning: "", example_translation: "", frequency: 0, difficulty: 0, image_url: "" }]);
    setCurrentPage(words.length + 1); // 새 단어 페이지로 이동
  };

  const removeWord = (id: string) => {
    if (words.length > 1) {
      const wordIndex = words.findIndex(w => w.id === id);
      setWords(words.filter(w => w.id !== id));
      // 현재 페이지 조정
      if (currentPage > words.length - 1) {
        setCurrentPage(Math.max(0, words.length - 2));
      }
    }
  };

  const updateWord = (id: string, field: keyof WordInput, value: string | number) => {
    setWords(words.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const goToNextPage = () => {
    if (currentPage === 0) {
      // 단어장 정보 페이지에서 단어 페이지로
      if (!name.trim()) {
        toast.error("단어장 이름을 입력해주세요.");
        return;
      }
      setCurrentPage(1);
    } else if (currentPage < words.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const handleImageUpload = async (wordId: string, file: File) => {
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

      if (!publicUrl) {
        setUploadingImage(false);
        return;
      }

      updateWord(wordId, 'image_url', publicUrl);
      toast.success("이미지가 업로드되었습니다!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("이미지 업로드에 실패했습니다.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
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

  const currentWord = currentPage > 0 ? words[currentPage - 1] : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="새 단어장 만들기" showBack />
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 페이지 0: 단어장 정보 */}
        {currentPage === 0 && (
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
        )}

        {/* 페이지 1+: 각 단어 입력 */}
        {currentPage > 0 && currentWord && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold">단어 {currentPage}</span>
                {words.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeWord(currentWord.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>이미지 (선택)</Label>
                  {currentWord.image_url && (
                    <img src={currentWord.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-2" />
                  )}
                  <label>
                    <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="text-center text-sm text-muted-foreground">
                        {uploadingImage ? (
                          <div>업로드 중...</div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 mx-auto mb-2" />
                            <div>단어 이미지를</div>
                            <div>지정해 주세요</div>
                          </>
                        )}
                      </div>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(currentWord.id, file);
                      }}
                      disabled={uploadingImage}
                    />
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
                          onClick={() => updateWord(currentWord.id, "frequency", star)}
                          className="transition-colors"
                        >
                          <span className={`text-2xl ${currentWord.frequency >= star ? 'text-warning' : 'text-muted'}`}>
                            {currentWord.frequency >= star ? '★' : '☆'}
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
                          onClick={() => updateWord(currentWord.id, "difficulty", star)}
                          className="transition-colors"
                        >
                          <span className={`text-2xl ${currentWord.difficulty >= star ? 'text-warning' : 'text-muted'}`}>
                            {currentWord.difficulty >= star ? '★' : '☆'}
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
                  <Label htmlFor={`word-${currentWord.id}`}>단어 *</Label>
                  <Input
                    id={`word-${currentWord.id}`}
                    value={currentWord.word}
                    onChange={(e) => updateWord(currentWord.id, "word", e.target.value)}
                    placeholder="단어"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`meaning-${currentWord.id}`}>뜻 *</Label>
                  <Input
                    id={`meaning-${currentWord.id}`}
                    value={currentWord.meaning}
                    onChange={(e) => updateWord(currentWord.id, "meaning", e.target.value)}
                    placeholder="뜻"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`example-${currentWord.id}`}>예문 (선택)</Label>
                  <Input
                    id={`example-${currentWord.id}`}
                    value={currentWord.example}
                    onChange={(e) => updateWord(currentWord.id, "example", e.target.value)}
                    placeholder="예문"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`part_of_speech-${currentWord.id}`}>품사 (선택)</Label>
                  <Input
                    id={`part_of_speech-${currentWord.id}`}
                    value={currentWord.part_of_speech}
                    onChange={(e) => updateWord(currentWord.id, "part_of_speech", e.target.value)}
                    placeholder="예: 명사, 동사"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`pronunciation-${currentWord.id}`}>발음 (선택)</Label>
                  <Input
                    id={`pronunciation-${currentWord.id}`}
                    value={currentWord.pronunciation}
                    onChange={(e) => updateWord(currentWord.id, "pronunciation", e.target.value)}
                    placeholder="발음 기호"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`note-${currentWord.id}`}>메모 (선택)</Label>
                  <Input
                    id={`note-${currentWord.id}`}
                    value={currentWord.note}
                    onChange={(e) => updateWord(currentWord.id, "note", e.target.value)}
                    placeholder="추가 메모"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 페이지 네비게이션 */}
        <div className="mt-6 space-y-4">
          {/* 페이지 인디케이터 */}
          <div className="flex justify-center gap-2 flex-wrap">
            <Button
              type="button"
              variant={currentPage === 0 ? "default" : "outline"}
              size="sm"
              onClick={() => goToPage(0)}
              className="min-w-[60px]"
            >
              정보
            </Button>
            {words.map((word, index) => (
              <Button
                key={word.id}
                type="button"
                variant={currentPage === index + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => goToPage(index + 1)}
                className="min-w-[40px]"
              >
                {index + 1}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addWord}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* 이전/다음 버튼 */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={goToPrevPage}
              disabled={currentPage === 0}
            >
              이전
            </Button>
            {currentPage < words.length ? (
              <Button
                type="button"
                className="flex-1"
                onClick={goToNextPage}
              >
                다음
              </Button>
            ) : (
              <Button
                type="button"
                className="flex-1"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "생성 중..." : "단어장 만들기"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateVocabulary;
