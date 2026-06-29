import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Brain, CheckSquare, Edit3, Grid3x3, Sparkles, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isLocalVocab, loadLocalWords, loadLocalVocabulary, getLocalSettings } from "@/utils/localVocabHelper";

const QuizMultiVocab = () => {
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [vocabularyNames, setVocabularyNames] = useState<string[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [quizLoading, setQuizLoading] = useState(true);

  // Quiz settings
  const [quizType, setQuizType] = useState<"multiple" | "writing" | "matching" | "random" | "ai" | "sentence">("multiple");
  const [questionType, setQuestionType] = useState<"word-to-meaning" | "meaning-to-word">("meaning-to-word");
  const [choiceCount, setChoiceCount] = useState(4);
  const [questionCount, setQuestionCount] = useState<number | "">("");
  const [isRandomOrder, setIsRandomOrder] = useState(true);
  const [answerDelay, setAnswerDelay] = useState([2]);
  const [aiDifficulty, setAiDifficulty] = useState<string>("중");
  const [aiCustomRequest, setAiCustomRequest] = useState("");
  const [dynamicMatching, setDynamicMatching] = useState(false);

  const vocabIds = searchParams.get("ids")?.split(",") || [];

  useEffect(() => {
    if (loading) return;
    if (vocabIds.length > 0 && user) {
      loadQuizData();
      loadUserSettings();
    } else {
      toast.error("단어장을 선택해주세요.");
      navigate("/vocabularies");
    }
  }, [vocabIds.join(","), user?.id, loading]);

  const loadUserSettings = async () => {
    try {
      const { data } = await supabase
        .from("user_settings")
        .select("answer_reveal_delay")
        .eq("user_id", user?.id)
        .single();
      if (data && data.answer_reveal_delay) {
        setAnswerDelay([data.answer_reveal_delay]);
      }
    } catch (error) {
      console.error("Error loading user settings:", error);
    }
  };

  const loadQuizData = async () => {
    try {
      setQuizLoading(true);
      const hasLocal = vocabIds.some(vid => isLocalVocab(vid));
      if (hasLocal) {
        let localNames: string[] = [];
        let localCount = 0;
        for (const vid of vocabIds) {
          if (isLocalVocab(vid)) {
            const vocab = loadLocalVocabulary(vid);
            if (vocab) localNames.push(vocab.name);
            localCount += loadLocalWords(vid).length;
          }
        }
        setVocabularyNames(localNames);
        setWordCount(localCount);
        return;
      }
      const { data: vocabs } = await supabase.from("vocabularies").select("name").in("id", vocabIds);
      if (vocabs) setVocabularyNames(vocabs.map(v => v.name));
      const { count } = await supabase.from("words").select("id", { count: "exact" }).in("vocabulary_id", vocabIds);
      setWordCount(count || 0);
    } catch (error) {
      console.error("Error loading quiz data:", error);
      toast.error("퀴즈 데이터를 불러오는데 실패했습니다.");
    } finally {
      setQuizLoading(false);
    }
  };

  const startQuiz = () => {
    const params = new URLSearchParams({
      ids: vocabIds.join(","),
      random: isRandomOrder.toString(),
      delay: answerDelay[0].toString(),
    });
    if (questionCount !== "" && questionCount > 0) {
      params.append("count", questionCount.toString());
    }

    if (quizType === "random") {
      params.append("choices", choiceCount.toString());
      navigate(`/quiz/multi/random?${params.toString()}`);
    } else if (quizType === "multiple") {
      params.append("type", questionType);
      params.append("choices", choiceCount.toString());
      navigate(`/quiz/multi/multiple?${params.toString()}`);
    } else if (quizType === "writing") {
      navigate(`/quiz/multi/writing?${params.toString()}`);
    } else if (quizType === "matching") {
      if (dynamicMatching) params.append("dynamic", "true");
      navigate(`/quiz/multi/matching?${params.toString()}`);
    } else if (quizType === "ai") {
      params.append("difficulty", aiDifficulty);
      if (aiCustomRequest.trim()) params.append("customRequest", aiCustomRequest.trim());
      navigate(`/quiz/multi/ai?${params.toString()}`);
    } else if (quizType === "sentence") {
      navigate(`/quiz/multi/sentence?${params.toString()}`);
    }
  };

  const quizOptions = [
    { type: "multiple", icon: CheckSquare, title: "객관식", description: "보기 중에서 정답 선택하기" },
    { type: "writing", icon: Edit3, title: "주관식", description: "단어 직접 입력하기" },
    { type: "matching", icon: Grid3x3, title: "단어 짝짓기", description: "단어와 뜻 연결하기" },
    { type: "sentence", icon: PenLine, title: "단어로 문장 작성", description: "주어진 단어로 영어 문장을 만들고 AI가 채점해요" },
    { type: "random", icon: Brain, title: "모든 유형 랜덤풀기", description: "여러 유형을 랜덤하게 풀기" },
    { type: "ai", icon: Sparkles, title: "AI로 출제", description: "AI가 다양한 유형의 문제를 만들어줘요" },
  ];

  if (loading || quizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="통합 퀴즈" showBack onBack={() => navigate("/vocabularies")} />
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              {vocabularyNames.length}개 단어장 통합
            </CardTitle>
            <CardDescription>
              {vocabularyNames.join(", ")} • {wordCount}개 단어
            </CardDescription>
          </CardHeader>
        </Card>

        <div>
          <h3 className="text-sm font-semibold mb-3">퀴즈 유형</h3>
          <div className="grid grid-cols-1 gap-3">
            {quizOptions.map((option) => (
              <Card
                key={option.type}
                className={`cursor-pointer transition-all ${
                  quizType === option.type ? "border-primary bg-primary/5" : "hover:border-primary/50"
                }`}
                onClick={() => setQuizType(option.type as any)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${quizType === option.type ? "bg-primary/10" : "bg-muted"}`}>
                    <option.icon className={`w-6 h-6 ${quizType === option.type ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{option.title}</h4>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {quizType === "multiple" && (
          <Card>
            <CardHeader><CardTitle className="text-base">객관식 설정</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>문제 유형</Label>
                <Select value={questionType} onValueChange={(v: any) => setQuestionType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meaning-to-word">뜻 → 단어</SelectItem>
                    <SelectItem value="word-to-meaning">단어 → 뜻</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>보기 개수: {choiceCount}개</Label>
                <Slider value={[choiceCount]} onValueChange={(v) => setChoiceCount(v[0])} min={3} max={6} step={1} />
              </div>
            </CardContent>
          </Card>
        )}

        {quizType === "matching" && (
          <Card>
            <CardHeader><CardTitle className="text-base">단어 짝짓기 설정</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="block mb-1">동적 교체 모드</Label>
                  <p className="text-xs text-muted-foreground">맞춘 단어가 사라지고 새 단어가 들어옵니다</p>
                </div>
                <Switch checked={dynamicMatching} onCheckedChange={setDynamicMatching} />
              </div>
            </CardContent>
          </Card>
        )}

        {quizType === "ai" && (
          <Card>
            <CardHeader><CardTitle className="text-base">AI 출제 설정</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>난이도</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { value: "상", label: "상", color: "bg-green-100 text-green-700 border-green-300" },
                    { value: "중", label: "중", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
                    { value: "하", label: "하", color: "bg-orange-100 text-orange-700 border-orange-300" },
                    { value: "최하", label: "최하", color: "bg-red-100 text-red-700 border-red-300" },
                    { value: "극상", label: "극상", color: "bg-purple-100 text-purple-700 border-purple-300" },
                  ].map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setAiDifficulty(d.value)}
                      className={`py-2 rounded-lg border font-medium text-sm transition-all ${
                        aiDifficulty === d.value ? `${d.color} border-current scale-105 shadow-md` : "bg-muted text-muted-foreground border-transparent hover:border-muted-foreground/30"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                {aiDifficulty === "극상" && (
                  <p className="text-xs text-destructive font-medium mt-1">⚠️ 원어민도 틸릴 수 있는 극한 난이도입니다!</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>요청사항 (선택)</Label>
                <Textarea value={aiCustomRequest} onChange={(e) => setAiCustomRequest(e.target.value)} placeholder="예: 의학 관련 문맥으로 출제해줘, 빈칸 채우기 위주로 해줘..." className="resize-none" rows={3} />
                <p className="text-xs text-muted-foreground">AI가 문제 생성 시 참고합니다.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">공통 설정</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>문항 수 (전체: {wordCount}문항)</Label>
              <Input
                type="number" min={1} max={wordCount} placeholder={`${wordCount}`}
                value={questionCount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") setQuestionCount("");
                  else { const num = parseInt(val); if (!isNaN(num) && num > 0) setQuestionCount(Math.min(num, wordCount)); }
                }}
              />
              <p className="text-xs text-muted-foreground">비워두면 전체 단어로 진행됩니다</p>
            </div>
            <div className="flex items-center justify-between">
              <Label>랜덤 순서</Label>
              <Switch checked={isRandomOrder} onCheckedChange={setIsRandomOrder} />
            </div>
            {quizType !== "matching" && (
              <div className="space-y-2">
                <Label>답 표시 후 대기 시간: {answerDelay[0]}초</Label>
                <Slider value={answerDelay} onValueChange={setAnswerDelay} min={1.5} max={3} step={0.5} />
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={startQuiz} className="w-full" size="lg" disabled={wordCount === 0}>
          퀴즈 시작하기
        </Button>
      </div>
    </div>
  );
};

export default QuizMultiVocab;
