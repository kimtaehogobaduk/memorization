import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
  Image,
  ChevronDown,
  ChevronRight,
  Check,
  X,
} from "lucide-react";

interface ExtractedWord {
  word: string;
  meaning?: string;
  example?: string;
  part_of_speech?: string;
  pronunciation?: string;
  synonyms?: string;
  antonyms?: string;
  derivatives?: { word: string; meaning: string }[];
}

interface ExtractedChapter {
  name: string;
  words: ExtractedWord[];
  expanded?: boolean;
}

interface ExtractionResult {
  vocabulary_name?: string;
  chapters: ExtractedChapter[];
  total_words: number;
}

const FileVocabularyUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vocabularyName, setVocabularyName] = useState("");
  const [includeDetails, setIncludeDetails] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];

    if (!validTypes.includes(file.type)) {
      toast({
        title: "지원하지 않는 파일 형식입니다",
        description: "이미지(JPG, PNG, WebP) 또는 PDF 파일을 업로드해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "파일 크기가 20MB를 초과합니다", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setError(null);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleExtract = async () => {
    if (!selectedFile) return;

    setExtracting(true);
    setError(null);
    setResult(null);

    try {
      const base64 = await fileToBase64(selectedFile);

      const { data, error: fnError } = await supabase.functions.invoke(
        "extract-vocabulary",
        {
          body: {
            file_base64: base64,
            file_type: selectedFile.type,
            include_details: includeDetails,
          },
        }
      );

      if (fnError) {
        let detailedMessage = fnError.message || "추출 함수 호출 중 오류가 발생했습니다";
        const contextResponse = (fnError as { context?: Response }).context;

        if (contextResponse) {
          try {
            const payload = await contextResponse.json();
            if (payload?.error && typeof payload.error === "string") {
              detailedMessage = payload.error;
            }
          } catch {
            // ignore parsing errors and keep original message
          }
        }

        throw new Error(detailedMessage);
      }
      if (data?.error) throw new Error(data.error);

      const extractionResult: ExtractionResult = {
        vocabulary_name: data.vocabulary_name || "",
        chapters: (data.chapters || []).map((ch: ExtractedChapter) => ({
          ...ch,
          expanded: true,
        })),
        total_words: data.total_words || 0,
      };

      setResult(extractionResult);
      if (extractionResult.vocabulary_name && !vocabularyName) {
        setVocabularyName(extractionResult.vocabulary_name);
      }

      toast({
        title: `${extractionResult.total_words}개 단어가 추출되었습니다!`,
        description: `${extractionResult.chapters.length}개 챕터`,
      });
    } catch (err) {
      console.error("Extraction error:", err);
      const message =
        err instanceof Error ? err.message : "파일 처리 중 오류가 발생했습니다";
      setError(message);
      toast({ title: message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const toggleChapter = (idx: number) => {
    if (!result) return;
    const updated = { ...result };
    updated.chapters = updated.chapters.map((ch, i) =>
      i === idx ? { ...ch, expanded: !ch.expanded } : ch
    );
    setResult(updated);
  };

  const removeWord = (chapterIdx: number, wordIdx: number) => {
    if (!result) return;
    const updated = { ...result };
    updated.chapters = updated.chapters.map((ch, i) => {
      if (i !== chapterIdx) return ch;
      return {
        ...ch,
        words: ch.words.filter((_, wi) => wi !== wordIdx),
      };
    });
    updated.chapters = updated.chapters.filter((ch) => ch.words.length > 0);
    updated.total_words = updated.chapters.reduce(
      (sum, ch) => sum + ch.words.length,
      0
    );
    setResult(updated);
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: "로그인이 필요합니다", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (!result || result.total_words === 0) {
      toast({ title: "저장할 단어가 없습니다", variant: "destructive" });
      return;
    }

    const name =
      vocabularyName.trim() ||
      `단어장 (${new Date().toLocaleDateString()})`;

    setSaving(true);
    try {
      // Create vocabulary
      const { data: vocab, error: vocabError } = await supabase
        .from("vocabularies")
        .insert({
          name,
          description: `${result.total_words}개 단어 - 파일 업로드 AI 추출`,
          language: "english",
          user_id: user.id,
        })
        .select()
        .single();

      if (vocabError) throw vocabError;

      // Create chapters if more than one
      const hasMultipleChapters = result.chapters.length > 1;

      if (hasMultipleChapters) {
        for (let ci = 0; ci < result.chapters.length; ci++) {
          const ch = result.chapters[ci];

          // Create chapter
          const { data: chapterData, error: chapterError } = await supabase
            .from("chapters")
            .insert({
              vocabulary_id: vocab.id,
              name: ch.name,
              order_index: ci,
            })
            .select()
            .single();

          if (chapterError) throw chapterError;

          // Insert words for this chapter
          const wordsToInsert = ch.words.map((w, wi) => ({
            vocabulary_id: vocab.id,
            chapter_id: chapterData.id,
            word: w.word,
            meaning: w.meaning || w.word,
            example: w.example || null,
            part_of_speech: w.part_of_speech || null,
            synonyms: w.synonyms || null,
            antonyms: w.antonyms || null,
            derivatives:
              w.derivatives && w.derivatives.length > 0
                ? w.derivatives
                : null,
            frequency: 0,
            difficulty: 0,
            order_index: wi,
          }));

          const { error: wordsError } = await supabase
            .from("words")
            .insert(wordsToInsert);
          if (wordsError) throw wordsError;
        }
      } else {
        // Single chapter - no chapter record needed
        const allWords = result.chapters[0]?.words || [];
        const wordsToInsert = allWords.map((w, idx) => ({
          vocabulary_id: vocab.id,
          word: w.word,
          meaning: w.meaning || w.word,
          example: w.example || null,
          part_of_speech: w.part_of_speech || null,
          synonyms: w.synonyms || null,
          antonyms: w.antonyms || null,
          derivatives:
            w.derivatives && w.derivatives.length > 0 ? w.derivatives : null,
          frequency: 0,
          difficulty: 0,
          order_index: idx,
        }));

        const { error: wordsError } = await supabase
          .from("words")
          .insert(wordsToInsert);
        if (wordsError) throw wordsError;
      }

      toast({ title: "단어장이 생성되었습니다!" });
      navigate(`/vocabularies/${vocab.id}`);
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: "저장 중 오류가 발생했습니다", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="파일로 단어장 만들기" showBack />

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Step 1: File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              파일 업로드
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              단어장 이미지나 PDF를 업로드하면 AI가 자동으로 단어를 추출합니다.
              Day1, Day2 등의 구분이 있으면 자동으로 챕터로 나눕니다.
            </p>

            <Input
              placeholder="단어장 이름 (선택)"
              value={vocabularyName}
              onChange={(e) => setVocabularyName(e.target.value)}
            />

            <div className="flex items-center space-x-2">
              <Switch
                id="include-details"
                checked={includeDetails}
                onCheckedChange={setIncludeDetails}
              />
              <Label htmlFor="include-details" className="text-sm">
                뜻, 예문, 파생어 등도 함께 추출
              </Label>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className="w-full h-32 border-dashed border-2 flex flex-col items-center justify-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                이미지 또는 PDF 파일을 선택하세요
              </span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG, WebP, PDF (최대 20MB)
              </span>
            </Button>

            {selectedFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm flex-1 truncate">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(1)}MB
                </span>
              </div>
            )}

            {previewUrl && (
              <div className="rounded-lg overflow-hidden border max-h-64">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {selectedFile && (
              <Button
                onClick={handleExtract}
                disabled={extracting}
                className="w-full"
              >
                {extracting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {extracting ? "AI 추출 중..." : "AI로 단어 추출하기"}
              </Button>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                추출 결과 ({result.total_words}개 단어,{" "}
                {result.chapters.length}개 챕터)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3">
                  {result.chapters.map((chapter, ci) => (
                    <div key={ci} className="border rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors text-left"
                        onClick={() => toggleChapter(ci)}
                      >
                        <span className="font-semibold text-sm">
                          {chapter.name} ({chapter.words.length}개)
                        </span>
                        {chapter.expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      {chapter.expanded && (
                        <div className="divide-y">
                          {chapter.words.map((word, wi) => (
                            <div
                              key={wi}
                              className="p-3 flex items-start justify-between gap-2 group"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {word.word}
                                  </span>
                                  {word.part_of_speech && (
                                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      {word.part_of_speech}
                                    </span>
                                  )}
                                </div>
                                {word.meaning && (
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {word.meaning}
                                  </p>
                                )}
                                {word.example && (
                                  <p className="text-xs text-muted-foreground mt-0.5 italic">
                                    {word.example}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={() => removeWord(ci, wi)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Save */}
        {result && result.total_words > 0 && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {saving
              ? "저장 중..."
              : `${result.total_words}개 단어로 단어장 만들기`}
          </Button>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default FileVocabularyUpload;
