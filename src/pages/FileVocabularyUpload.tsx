import { useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
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
import { motion } from "framer-motion";
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
  Trash2,
  Plus,
} from "lucide-react";
import junsuk04 from "@/assets/junsuk-04.png";
import junsuk08 from "@/assets/junsuk-08.png";
import junsuk14 from "@/assets/junsuk-14.png";

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

interface SelectedFile {
  file: File;
  previewUrl: string | null;
  id: string;
}

const FileVocabularyUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vocabularyName, setVocabularyName] = useState("");
  const [includeDetails, setIncludeDetails] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];

    const newFiles: SelectedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!validTypes.includes(file.type)) {
        toast({
          title: `${file.name}: 지원하지 않는 파일 형식`,
          description: "이미지(JPG, PNG, WebP) 또는 PDF 파일만 가능합니다.",
          variant: "destructive",
        });
        continue;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast({ title: `${file.name}: 파일 크기가 20MB를 초과합니다`, variant: "destructive" });
        continue;
      }

      const previewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null;

      newFiles.push({
        file,
        previewUrl,
        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
      });
    }

    if (newFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setResult(null);
      setError(null);
    }

    // Reset input value so same file can be re-selected
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result); // Keep full data URL for puter
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const buildPrompt = (includeDetails: boolean) => {
    const detailsPrompt = includeDetails
      ? `For each word, also extract or generate:
- "meaning": Korean meaning/definition (한국어 뜻)
- "example": example sentence if available
- "part_of_speech": part of speech (품사, in Korean like 명사, 동사, 형용사)
- "pronunciation": pronunciation guide
- "synonyms": comma-separated synonyms if available
- "antonyms": comma-separated antonyms if available  
- "derivatives": array of {word, meaning} for derivative words if available`
      : `Only extract the word itself. Do NOT include meanings, examples, or other details.`;

    return `You are a vocabulary extraction expert. You analyze images and documents of vocabulary lists/word books and extract structured data.

CRITICAL RULES:
1. Extract ALL English words from the document.
2. If the document has sections like "Day 1", "Day 2", "Unit 1", "Chapter 1", "Part 1", etc., group words into chapters accordingly.
3. If there are no clear sections, put all words in a single chapter called "전체 단어".
4. The vocabulary name should be inferred from the document title if visible, otherwise use "".
5. ${detailsPrompt}

Return ONLY valid JSON in this exact format:
{
  "vocabulary_name": "string or empty",
  "chapters": [
    {
      "name": "Day 1",
      "words": [
        {
          "word": "example"${includeDetails ? `,
          "meaning": "예시",
          "example": "This is an example.",
          "part_of_speech": "명사",
          "pronunciation": "ɪɡˈzæmpəl",
          "synonyms": "instance, sample",
          "antonyms": "original",
          "derivatives": [{"word": "exemplary", "meaning": "모범적인"}]` : ""}
        }
      ]
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no markdown, no code fences, no explanation.`;
  };

  const parseAIResponse = (content: string): ExtractionResult => {
    let jsonStr = content.trim();
    
    // Remove markdown fences
    jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    // Find JSON object
    const jsonStart = jsonStr.indexOf("{");
    if (jsonStart === -1) throw new Error("No JSON object found");
    jsonStr = jsonStr.substring(jsonStart);

    const lastBrace = jsonStr.lastIndexOf("}");
    if (lastBrace !== -1) {
      jsonStr = jsonStr.substring(0, lastBrace + 1);
    }

    const tryParse = (value: string) => JSON.parse(value);

    let parsed: any;
    try {
      parsed = tryParse(jsonStr);
    } catch {
      // Fix trailing commas and control chars
      let repaired = jsonStr
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, (ch) =>
          ch === "\n" || ch === "\r" || ch === "\t" ? ch : ""
        );

      try {
        parsed = tryParse(repaired);
      } catch {
        // Balance brackets
        let openBraces = 0, openBrackets = 0;
        for (const char of repaired) {
          if (char === "{") openBraces++;
          else if (char === "}") openBraces--;
          else if (char === "[") openBrackets++;
          else if (char === "]") openBrackets--;
        }
        repaired = repaired.replace(/,\s*$/, "");
        repaired += "]".repeat(Math.max(0, openBrackets));
        repaired += "}".repeat(Math.max(0, openBraces));
        parsed = tryParse(repaired);
      }
    }

    // Validate
    if (!parsed.chapters || !Array.isArray(parsed.chapters)) {
      parsed = { vocabulary_name: "", chapters: [{ name: "전체 단어", words: [] }] };
    }

    parsed.chapters = parsed.chapters
      .map((ch: any) => ({
        name: ch.name || "전체 단어",
        words: (ch.words || [])
          .filter((w: any) => w.word && typeof w.word === "string" && w.word.trim().length > 0)
          .map((w: any) => ({
            word: w.word.trim(),
            meaning: w.meaning || "",
            example: w.example || "",
            part_of_speech: w.part_of_speech || "",
            pronunciation: w.pronunciation || "",
            synonyms: w.synonyms || "",
            antonyms: w.antonyms || "",
            derivatives: Array.isArray(w.derivatives) ? w.derivatives : [],
          })),
      }))
      .filter((ch: any) => ch.words.length > 0);

    const totalWords = parsed.chapters.reduce(
      (sum: number, ch: any) => sum + ch.words.length,
      0
    );

    return {
      vocabulary_name: parsed.vocabulary_name || "",
      chapters: parsed.chapters,
      total_words: totalWords,
    };
  };

  const waitForPuter = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.puter?.ai) {
        resolve();
        return;
      }
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.puter?.ai) {
          clearInterval(interval);
          resolve();
        } else if (attempts > 30) {
          clearInterval(interval);
          reject(new Error("Puter AI를 불러올 수 없습니다. 페이지를 새로고침해주세요."));
        }
      }, 200);
    });
  };

  const handleExtract = async () => {
    if (selectedFiles.length === 0) return;

    setExtracting(true);
    setError(null);
    setResult(null);
    setExtractionProgress(0);

    try {
      await waitForPuter();

      const systemPrompt = buildPrompt(includeDetails);
      const allChapters: ExtractedChapter[] = [];
      let vocabName = "";

      for (let fi = 0; fi < selectedFiles.length; fi++) {
        setExtractionProgress(Math.round(((fi) / selectedFiles.length) * 100));

        const { file } = selectedFiles[fi];
        const dataUrl = await fileToBase64(file);

        const response = await window.puter.ai.chat([
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
              {
                type: "text",
                text: "이 단어장/문서에서 모든 영어 단어를 추출해주세요. Day나 Unit 등의 구분이 있으면 챕터로 나눠주세요.",
              },
            ],
          },
        ], {
          model: "gpt-4o",
        });

        const content = response?.message?.content || "";
        if (!content) {
          console.warn(`File ${fi + 1} returned empty response, skipping`);
          continue;
        }

        const fileResult = parseAIResponse(content);

        if (fileResult.vocabulary_name && !vocabName) {
          vocabName = fileResult.vocabulary_name;
        }

        // If multiple files, prefix chapter names with file info
        if (selectedFiles.length > 1) {
          const fileName = file.name.replace(/\.[^.]+$/, "");
          fileResult.chapters = fileResult.chapters.map((ch) => ({
            ...ch,
            name: fileResult.chapters.length === 1 && ch.name === "전체 단어"
              ? fileName
              : `${fileName} - ${ch.name}`,
          }));
        }

        allChapters.push(...fileResult.chapters);
      }

      setExtractionProgress(100);

      if (allChapters.length === 0) {
        throw new Error("추출된 단어가 없습니다. 다른 파일을 시도해주세요.");
      }

      const totalWords = allChapters.reduce((sum, ch) => sum + ch.words.length, 0);
      const mergedResult: ExtractionResult = {
        vocabulary_name: vocabName,
        chapters: allChapters.map((ch) => ({ ...ch, expanded: true })),
        total_words: totalWords,
      };

      setResult(mergedResult);
      if (mergedResult.vocabulary_name && !vocabularyName) {
        setVocabularyName(mergedResult.vocabulary_name);
      }

      toast({
        title: `${totalWords}개 단어가 추출되었습니다!`,
        description: `${allChapters.length}개 챕터 (${selectedFiles.length}개 파일)`,
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
      return { ...ch, words: ch.words.filter((_, wi) => wi !== wordIdx) };
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

    const name = vocabularyName.trim() || `단어장 (${new Date().toLocaleDateString()})`;

    setSaving(true);
    try {
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

      const hasMultipleChapters = result.chapters.length > 1;

      if (hasMultipleChapters) {
        for (let ci = 0; ci < result.chapters.length; ci++) {
          const ch = result.chapters[ci];
          const { data: chapterData, error: chapterError } = await supabase
            .from("chapters")
            .insert({ vocabulary_id: vocab.id, name: ch.name, order_index: ci })
            .select()
            .single();

          if (chapterError) throw chapterError;

          const wordsToInsert = ch.words.map((w, wi) => ({
            vocabulary_id: vocab.id,
            chapter_id: chapterData.id,
            word: w.word,
            meaning: w.meaning || w.word,
            example: w.example || null,
            part_of_speech: w.part_of_speech || null,
            synonyms: w.synonyms || null,
            antonyms: w.antonyms || null,
            derivatives: w.derivatives && w.derivatives.length > 0 ? w.derivatives : null,
            frequency: 0,
            difficulty: 0,
            order_index: wi,
          }));

          const { error: wordsError } = await supabase.from("words").insert(wordsToInsert);
          if (wordsError) throw wordsError;
        }
      } else {
        const allWords = result.chapters[0]?.words || [];
        const wordsToInsert = allWords.map((w, idx) => ({
          vocabulary_id: vocab.id,
          word: w.word,
          meaning: w.meaning || w.word,
          example: w.example || null,
          part_of_speech: w.part_of_speech || null,
          synonyms: w.synonyms || null,
          antonyms: w.antonyms || null,
          derivatives: w.derivatives && w.derivatives.length > 0 ? w.derivatives : null,
          frequency: 0,
          difficulty: 0,
          order_index: idx,
        }));

        const { error: wordsError } = await supabase.from("words").insert(wordsToInsert);
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
        {/* Hero with Junsuk */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-junsuk rounded-2xl p-6 shadow-junsuk overflow-hidden"
        >
          <div className="flex items-center gap-4">
            <motion.img
              src={junsuk04}
              alt="준섹이"
              className="w-24 h-24 object-contain drop-shadow-xl"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 150, damping: 12 }}
              whileHover={{ scale: 1.1, rotate: 5 }}
            />
            <div>
              <h2 className="text-xl font-bold text-foreground">
                📄 파일에서 단어를 뽑아볼까요?
              </h2>
              <p className="text-sm text-foreground/70 mt-1">
                이미지나 PDF를 올리면 AI가 자동으로 단어를 추출해요!
              </p>
            </div>
          </div>
          {/* Floating decoration */}
          <motion.img
            src={junsuk14}
            alt=""
            className="absolute -bottom-2 -right-2 w-16 h-16 object-contain opacity-30"
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Step 1: File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              파일 업로드
              {selectedFiles.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({selectedFiles.length}개 선택됨)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              단어장 이미지나 PDF를 업로드하면 AI가 자동으로 단어를 추출합니다.
              <strong className="text-primary"> 여러 파일을 한번에</strong> 업로드할 수 있어요!
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
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className="w-full h-32 border-dashed border-2 flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                이미지 또는 PDF 파일을 선택하세요 (여러 개 가능)
              </span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG, WebP, PDF (최대 20MB)
              </span>
            </Button>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((sf) => (
                  <motion.div
                    key={sf.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                  >
                    {sf.previewUrl ? (
                      <img
                        src={sf.previewUrl}
                        alt=""
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <FileText className="h-10 w-10 p-2 text-primary bg-primary/10 rounded" />
                    )}
                    <span className="text-sm flex-1 truncate">{sf.file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(sf.file.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeFile(sf.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </motion.div>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={extracting}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  파일 더 추가하기
                </Button>
              </div>
            )}

            {selectedFiles.length > 0 && (
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
                {extracting
                  ? "AI 추출 중..."
                  : `AI로 단어 추출하기 (${selectedFiles.length}개 파일)`}
              </Button>
            )}

            {extracting && (
              <div className="space-y-2">
                <Progress value={extractionProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  {extractionProgress}% 처리 중...
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                <img src={junsuk08} alt="" className="w-10 h-10 object-contain shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Results */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  추출 결과 ({result.total_words}개 단어, {result.chapters.length}개 챕터)
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
                                    <span className="font-medium text-sm">{word.word}</span>
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
          </motion.div>
        )}

        {/* Step 3: Save */}
        {result && result.total_words > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
              {saving ? "저장 중..." : `${result.total_words}개 단어로 단어장 만들기`}
            </Button>
          </motion.div>
        )}

        {/* Empty state with Junsuk */}
        {selectedFiles.length === 0 && !result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center py-8 text-center"
          >
            <motion.img
              src={junsuk08}
              alt="준섹이"
              className="w-28 h-28 object-contain mb-4"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            />
            <p className="text-muted-foreground text-sm">
              위 버튼을 눌러 파일을 업로드해보세요!
            </p>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default FileVocabularyUpload;
