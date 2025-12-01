import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Brain, CheckSquare, Edit3, Grid3x3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Quiz = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vocabularyName, setVocabularyName] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [wordCount, setWordCount] = useState(0);

  // Quiz settings
  const [quizType, setQuizType] = useState<"multiple" | "writing" | "matching" | "random">("multiple");
  const [questionType, setQuestionType] = useState<"word-to-meaning" | "meaning-to-word">("meaning-to-word");
  const [choiceCount, setChoiceCount] = useState(4);
  const [isRandomOrder, setIsRandomOrder] = useState(true);
  const [answerDelay, setAnswerDelay] = useState([2]);

  const chapterId = searchParams.get("chapter");

  useEffect(() => {
    if (id && user) {
      loadQuizData();
    }
  }, [id, user, chapterId]);

  const loadQuizData = async () => {
    try {
      const { data: vocab } = await supabase
        .from("vocabularies")
        .select("name")
        .eq("id", id)
        .single();

      if (vocab) {
        setVocabularyName(vocab.name);
      }

      if (chapterId) {
        const { data: chapter } = await supabase
          .from("chapters")
          .select("name")
          .eq("id", chapterId)
          .single();

        if (chapter) {
          setChapterName(chapter.name);
        }
      }

      const query = supabase
        .from("words")
        .select("id", { count: "exact" })
        .eq("vocabulary_id", id);

      if (chapterId) {
        query.eq("chapter_id", chapterId);
      }

      const { count } = await query;
      setWordCount(count || 0);
    } catch (error) {
      console.error("Error loading quiz data:", error);
      toast.error("퀴즈 데이터를 불러오는데 실패했습니다.");
    }
  };

  const startQuiz = () => {
    const params = new URLSearchParams({
      random: isRandomOrder.toString(),
      delay: answerDelay[0].toString(),
    });

    if (chapterId) {
      params.append("chapter", chapterId);
    }

    if (quizType === "random") {
      // Random type - randomly pick one of the quiz types
      const types = ["multiple", "writing", "matching"];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      if (randomType === "multiple") {
        params.append("type", questionType);
        params.append("choices", choiceCount.toString());
        navigate(`/quiz/${id}/multiple?${params.toString()}`);
      } else if (randomType === "writing") {
        navigate(`/quiz/${id}/writing?${params.toString()}`);
      } else {
        navigate(`/quiz/${id}/matching?${params.toString()}`);
      }
    } else if (quizType === "multiple") {
      params.append("type", questionType);
      params.append("choices", choiceCount.toString());
      navigate(`/quiz/${id}/multiple?${params.toString()}`);
    } else if (quizType === "writing") {
      navigate(`/quiz/${id}/writing?${params.toString()}`);
    } else if (quizType === "matching") {
      navigate(`/quiz/${id}/matching?${params.toString()}`);
    }
  };

  const quizOptions = [
    {
      type: "multiple",
      icon: CheckSquare,
      title: "객관식",
      description: "보기 중에서 정답 선택하기",
    },
    {
      type: "writing",
      icon: Edit3,
      title: "주관식",
      description: "단어 직접 입력하기",
    },
    {
      type: "matching",
      icon: Grid3x3,
      title: "단어 짝짓기",
      description: "단어와 뜻 연결하기",
    },
    {
      type: "random",
      icon: Brain,
      title: "모든 유형 랜덤풀기",
      description: "여러 유형을 랜덤하게 풀기",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title={chapterName ? `${chapterName} 퀴즈` : "퀴즈"} 
        showBack 
      />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              {vocabularyName}
            </CardTitle>
            <CardDescription>
              {chapterName || "전체"} • {wordCount}개 단어
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
                  quizType === option.type
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setQuizType(option.type as any)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${
                    quizType === option.type ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <option.icon className={`w-6 h-6 ${
                      quizType === option.type ? "text-primary" : "text-muted-foreground"
                    }`} />
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
            <CardHeader>
              <CardTitle className="text-base">객관식 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>문제 유형</Label>
                <Select value={questionType} onValueChange={(v: any) => setQuestionType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meaning-to-word">뜻 → 단어</SelectItem>
                    <SelectItem value="word-to-meaning">단어 → 뜻</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>보기 개수: {choiceCount}개</Label>
                <Slider
                  value={[choiceCount]}
                  onValueChange={(v) => setChoiceCount(v[0])}
                  min={3}
                  max={6}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">공통 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>랜덤 순서</Label>
              <Switch checked={isRandomOrder} onCheckedChange={setIsRandomOrder} />
            </div>

            {quizType !== "matching" && (
              <div className="space-y-2">
                <Label>답 표시 후 대기 시간: {answerDelay[0]}초</Label>
                <Slider
                  value={answerDelay}
                  onValueChange={setAnswerDelay}
                  min={1.5}
                  max={3}
                  step={0.5}
                  className="w-full"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={startQuiz}
          className="w-full"
          size="lg"
          disabled={wordCount === 0}
        >
          퀴즈 시작하기
        </Button>
      </div>
    </div>
  );
};

export default Quiz;
