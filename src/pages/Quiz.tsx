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
import { Brain, CheckSquare, Edit3, Grid3x3, Printer } from "lucide-react";
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
      loadUserSettings();
    }
  }, [id, user, chapterId]);

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

  const exportToTestPaper = async () => {
    try {
      const query = supabase
        .from("words")
        .select("word, meaning, part_of_speech")
        .eq("vocabulary_id", id);

      if (chapterId) {
        query.eq("chapter_id", chapterId);
      }

      const { data: words, error } = await query;

      if (error) throw error;
      if (!words || words.length === 0) {
        toast.error("단어가 없습니다.");
        return;
      }

      // Shuffle words if random order is enabled
      const shuffledWords = isRandomOrder 
        ? [...words].sort(() => Math.random() - 0.5)
        : words;

      // Generate test paper HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${vocabularyName} 시험지</title>
          <style>
            @media print {
              @page { margin: 2cm; }
              body { margin: 0; }
              .page-break { page-break-before: always; }
            }
            body {
              font-family: 'Malgun Gothic', sans-serif;
              max-width: 21cm;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #333;
              padding-bottom: 15px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .header .info {
              margin-top: 10px;
              font-size: 14px;
              color: #666;
            }
            .question {
              margin-bottom: 25px;
              padding: 10px 0;
              border-bottom: 1px dashed #ddd;
            }
            .question-number {
              font-weight: bold;
              display: inline-block;
              min-width: 40px;
            }
            .question-content {
              display: inline;
              font-size: 16px;
            }
            .answer-blank {
              border-bottom: 1px solid #333;
              display: inline-block;
              min-width: 200px;
              margin-left: 10px;
            }
            .answer-section {
              margin-top: 40px;
            }
            .answer-section h2 {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 10px;
              border-bottom: 2px solid #333;
            }
            .answer-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
            }
            .answer-item {
              padding: 8px;
              background: #f5f5f5;
              border-radius: 4px;
            }
            .answer-number {
              font-weight: bold;
              margin-right: 8px;
            }
            .pos {
              color: #666;
              font-size: 12px;
              margin-left: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${vocabularyName} 시험지</h1>
            <div class="info">
              ${chapterName ? chapterName + " • " : ""}총 ${shuffledWords.length}문제
            </div>
          </div>

          <div class="questions">
            ${shuffledWords.map((word, index) => `
              <div class="question">
                <span class="question-number">${index + 1}.</span>
                <span class="question-content">
                  ${questionType === "word-to-meaning" ? word.word : word.meaning}
                  ${word.part_of_speech ? `<span class="pos">(${word.part_of_speech})</span>` : ""}
                </span>
                <span class="answer-blank"></span>
              </div>
            `).join("")}
          </div>

          <div class="page-break"></div>

          <div class="answer-section">
            <h2>정답</h2>
            <div class="answer-grid">
              ${shuffledWords.map((word, index) => `
                <div class="answer-item">
                  <span class="answer-number">${index + 1}.</span>
                  <span>${questionType === "word-to-meaning" ? word.meaning : word.word}</span>
                </div>
              `).join("")}
            </div>
          </div>
        </body>
        </html>
      `;

      // Open in new window and trigger print
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }

      toast.success("시험지가 생성되었습니다!");
    } catch (error) {
      console.error("Error exporting test paper:", error);
      toast.error("시험지 생성에 실패했습니다.");
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
        onBack={() => navigate(`/vocabularies/${id}`)}
      />
      
      {/* Junsuk study encouragement */}
      <div className="max-w-screen-xl mx-auto px-4 pt-4">
        <div className="bg-gradient-card rounded-lg p-4 mb-4 flex items-center gap-4">
          <img 
            src={new URL('@/assets/junsuk-26-2.png', import.meta.url).href} 
            alt="Junsuk studying hard" 
            className="w-16 h-16"
          />
          <div>
            <p className="font-semibold text-sm">열심히 공부해봐요!</p>
            <p className="text-xs text-muted-foreground">퀴즈 설정을 선택하고 시작해보세요</p>
          </div>
        </div>
      </div>
      
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

        <div className="space-y-3">
          <Button
            onClick={startQuiz}
            className="w-full"
            size="lg"
            disabled={wordCount === 0}
          >
            퀴즈 시작하기
          </Button>

          <Button
            onClick={exportToTestPaper}
            variant="outline"
            className="w-full"
            size="lg"
            disabled={wordCount === 0}
          >
            <Printer className="w-5 h-5 mr-2" />
            시험지로 내보내기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
