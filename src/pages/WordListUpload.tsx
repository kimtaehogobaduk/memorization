import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Sparkles, Loader2 } from "lucide-react";

interface WordResult {
  word: string;
  meaning: string;
  example: string;
  part_of_speech: string;
  pronunciation: string;
  frequency: number;
  difficulty: number;
  synonyms: string;
  antonyms: string;
  derivatives: { word: string; meaning: string }[];
  status: "pending" | "loading" | "done" | "error";
  error?: string;
}

const WordListUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vocabularyName, setVocabularyName] = useState("");
  const [wordText, setWordText] = useState("");
  const [words, setWords] = useState<WordResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setWordText(text);
    };
    reader.readAsText(file);
  };

  const parseWords = (text: string): string[] => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.length < 100);
  };

  const processWords = async () => {
    if (!wordText.trim()) {
      toast({ title: "단어를 입력해주세요", variant: "destructive" });
      return;
    }

    const wordList = parseWords(wordText);
    if (wordList.length === 0) {
      toast({ title: "유효한 단어가 없습니다", variant: "destructive" });
      return;
    }
    if (wordList.length > 200) {
      toast({ title: "최대 200개까지 가능합니다", variant: "destructive" });
      return;
    }

    setProcessing(true);
    setProgress(0);

    const initialWords: WordResult[] = wordList.map((w) => ({
      word: w,
      meaning: "",
      example: "",
      part_of_speech: "",
      pronunciation: "",
      frequency: 0,
      difficulty: 0,
      synonyms: "",
      antonyms: "",
      derivatives: [],
      status: "pending" as const,
    }));
    setWords(initialWords);

    const results = [...initialWords];
    const BATCH_SIZE = 3;

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (item, batchIdx) => {
        const idx = i + batchIdx;
        results[idx] = { ...results[idx], status: "loading" };
        setWords([...results]);

        try {
          const { data, error } = await api.getWordMeaning({ word: item.word });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);

          results[idx] = {
            ...results[idx],
            meaning: data.meaning || "",
            example: data.example || "",
            part_of_speech: data.part_of_speech || "",
            pronunciation: data.pronunciation || "",
            frequency: data.frequency || 0,
            difficulty: data.difficulty || 0,
            synonyms: data.synonyms || "",
            antonyms: data.antonyms || "",
            derivatives: data.derivatives || [],
            status: "done",
          };
        } catch (err) {
          results[idx] = {
            ...results[idx],
            status: "error",
            error: err instanceof Error ? err.message : "실패",
          };
        }
      });

      await Promise.all(promises);
      setWords([...results]);
      setProgress(Math.round(((i + batch.length) / results.length) * 100));

      // Rate limit pause between batches
      if (i + BATCH_SIZE < results.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setProcessing(false);
    setProgress(100);
    toast({ title: `${results.filter((w) => w.status === "done").length}개 단어 처리 완료!` });
  };

  const handleSave = async () => {
    const completedWords = words.filter((w) => w.status === "done");
    if (completedWords.length === 0) {
      toast({ title: "저장할 단어가 없습니다", variant: "destructive" });
      return;
    }

    const name = vocabularyName.trim() || `단어 목록 (${new Date().toLocaleDateString()})`;

    setSaving(true);
    try {
      if (user) {
        const { data: vocab, error: vocabError } = await supabase
          .from("vocabularies")
          .insert({
            name,
            description: `${completedWords.length}개 단어 - AI 자동 생성`,
            language: "english",
            user_id: user.id,
          })
          .select()
          .single();

        if (vocabError) throw vocabError;

        const wordsToInsert = completedWords.map((w, idx) => ({
          vocabulary_id: vocab.id,
          word: w.word,
          meaning: w.meaning,
          example: w.example || null,
          part_of_speech: w.part_of_speech || null,
          synonyms: w.synonyms || null,
          antonyms: w.antonyms || null,
          derivatives: w.derivatives.length > 0 ? w.derivatives : null,
          frequency: w.frequency,
          difficulty: w.difficulty,
          order_index: idx,
        }));

        const { error: wordsError } = await supabase.from("words").insert(wordsToInsert);
        if (wordsError) throw wordsError;

        toast({ title: "단어장이 생성되었습니다!" });
        navigate(`/vocabularies/${vocab.id}`);
      } else {
        const { localStorageService } = await import("@/services/localStorageService");
        const vocab = localStorageService.saveVocabulary({
          name,
          description: `${completedWords.length}개 단어 - AI 자동 생성`,
          language: "english",
        });
        const wordsToInsert = completedWords.map((w, idx) => ({
          vocabulary_id: vocab.id,
          word: w.word,
          meaning: w.meaning,
          example: w.example || null,
          note: null,
          part_of_speech: w.part_of_speech || null,
          chapter_id: null,
          order_index: idx,
        }));
        localStorageService.saveWords(wordsToInsert);
        toast({ title: "단어장이 생성되었습니다!" });
        navigate(`/vocabularies/${vocab.id}`);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "저장 중 오류가 발생했습니다", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const doneCount = words.filter((w) => w.status === "done").length;
  const errorCount = words.filter((w) => w.status === "error").length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="단어만 적어서 단어장 만들기" showBack />

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Step 1: Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              단어 입력
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              한 줄에 하나의 영어 단어를 입력하세요. AI가 자동으로 뜻, 품사, 발음, 예문 등을 채워줍니다.
            </p>

            <Input
              placeholder="단어장 이름 (선택)"
              value={vocabularyName}
              onChange={(e) => setVocabularyName(e.target.value)}
            />

            <Textarea
              placeholder={`apple\nbanana\ncomputer\nhappiness\n...`}
              value={wordText}
              onChange={(e) => setWordText(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              disabled={processing}
            />

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                텍스트 파일 업로드
              </Button>
              <Button
                onClick={processWords}
                disabled={processing || !wordText.trim()}
                className="flex-1"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {processing ? "처리 중..." : "AI로 채우기"}
              </Button>
            </div>

            {wordText.trim() && (
              <p className="text-xs text-muted-foreground">
                {parseWords(wordText).length}개 단어 감지됨 (최대 200개)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Progress */}
        {words.length > 0 && (
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span>진행률</span>
                <span>
                  {doneCount}/{words.length} 완료
                  {errorCount > 0 && <span className="text-destructive ml-1">({errorCount} 실패)</span>}
                </span>
              </div>
              <Progress value={progress} />
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {words.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                처리 결과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {words.map((w, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-sm ${
                      w.status === "done"
                        ? "bg-primary/5 border-primary/20"
                        : w.status === "error"
                        ? "bg-destructive/5 border-destructive/20"
                        : w.status === "loading"
                        ? "bg-muted/50 border-muted animate-pulse"
                        : "bg-muted/30 border-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{w.word}</span>
                      {w.status === "loading" && <Loader2 className="h-3 w-3 animate-spin" />}
                      {w.status === "done" && <span className="text-xs text-primary">✓</span>}
                      {w.status === "error" && (
                        <span className="text-xs text-destructive">✕</span>
                      )}
                    </div>
                    {w.status === "done" && (
                      <div className="mt-1 text-muted-foreground space-y-0.5">
                        <p>{w.meaning}</p>
                        {w.part_of_speech && (
                          <p className="text-xs">{w.part_of_speech} {w.pronunciation}</p>
                        )}
                      </div>
                    )}
                    {w.status === "error" && (
                      <p className="mt-1 text-xs text-destructive">{w.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save */}
        {doneCount > 0 && !processing && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {saving ? "저장 중..." : `${doneCount}개 단어로 단어장 만들기`}
          </Button>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default WordListUpload;
