import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuizSound } from "@/hooks/useQuizSound";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/integrations/api/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AIQuestion {
  id: string;
  wordId: string;
  type: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

interface Word {
  id: string;
  word: string;
  meaning: string;
  part_of_speech: string | null;
  example: string | null;
}

const QuizAI = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playCorrectSound, playIncorrectSound } = useQuizSound();

  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("AI가 문제를 만들고 있어요...");
  const [timer, setTimer] = useState(0);
  const [results, setResults] = useState<Array<{
    question: AIQuestion;
    selectedIndex: number;
    isCorrect: boolean;
  }>>([]);

  const difficulty = searchParams.get("difficulty") || "중";
  const customRequest = searchParams.get("customRequest") || "";
  const chapterId = searchParams.get("chapter");
  const answerDelay = parseFloat(searchParams.get("delay") || "2");

  useEffect(() => {
    if (id && user) loadAndGenerate();
  }, [id, user]);

  useEffect(() => {
    if (selectedAnswer === null && questions.length > 0) {
      const interval = setInterval(() => setTimer(prev => prev + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [selectedAnswer, questions]);

  const loadAndGenerate = async () => {
    try {
      setLoading(true);
      setLoadingMessage("단어를 불러오는 중...");

      let query = supabase
        .from("words")
        .select("id, word, meaning, part_of_speech, example")
        .eq("vocabulary_id", id)
        .limit(30);

      if (chapterId) query = query.eq("chapter_id", chapterId);
      const { data: words, error } = await query;
      if (error) throw error;
      if (!words || words.length === 0) {
        toast.error("퀴즈할 단어가 없습니다.");
        navigate(`/vocabularies/${id}`);
        return;
      }

      setLoadingMessage("AI가 문제를 생성하고 있어요... 🧠");
      const shuffled = [...words].sort(() => Math.random() - 0.5);

      const { data: fnData, error: fnError } = await api.generateAiQuiz({ words: shuffled, difficulty, customRequest });

      if (fnError) throw fnError;
      if (fnData?.error) throw new Error(fnData.error);
      if (!fnData?.questions?.length) throw new Error("문제 생성 실패");

      setQuestions(fnData.questions);
    } catch (err) {
      console.error("AI quiz error:", err);
      toast.error("AI 퀴즈 생성에 실패했습니다. 다시 시도해주세요.");
      navigate(`/quiz/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (choiceIndex: number) => {
    if (selectedAnswer !== null) return;
    const q = questions[currentIndex];
    const correct = choiceIndex === q.correctIndex;

    setSelectedAnswer(choiceIndex);
    if (correct) {
      playCorrectSound();
      setScore(s => s + 1);
    } else {
      playIncorrectSound();
    }

    setResults(prev => [...prev, { question: q, selectedIndex: choiceIndex, isCorrect: correct }]);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(i => i + 1);
        setSelectedAnswer(null);
      } else {
        // Navigate to AI result page
        const finalScore = score + (correct ? 1 : 0);
        const finalResults = [...results, { question: q, selectedIndex: choiceIndex, isCorrect: correct }];

        // Store results in sessionStorage since URL would be too long
        sessionStorage.setItem("aiQuizResults", JSON.stringify(finalResults));

        const params = new URLSearchParams({
          score: finalScore.toString(),
          total: questions.length.toString(),
          difficulty,
        });
        if (chapterId) params.append("chapter", chapterId);
        navigate(`/quiz/${id}/ai-result?${params.toString()}`);
      }
    }, answerDelay * 1000);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "fill_blank": return "빈칸 채우기";
      case "best_fit": return "가장 적합한 단어";
      case "synonym_trap": return "유의어/반의어 함정";
      case "context_meaning": return "문맥 속 의미";
      default: return "객관식";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6">
          <img
            src={new URL("@/assets/junsuk-08.png", import.meta.url).href}
            alt="준섹이 생각중"
            className="w-40 h-40 mx-auto animate-bounce"
          />
          <div className="space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-xl font-semibold">{loadingMessage}</p>
            <p className="text-sm text-muted-foreground">난이도: {difficulty}</p>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const q = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const difficultyColor = {
    "하": "text-green-600 bg-green-100",
    "중": "text-yellow-600 bg-yellow-100",
    "상": "text-orange-600 bg-orange-100",
    "극상": "text-red-600 bg-red-100",
  }[difficulty] || "text-primary bg-primary/10";

  return (
    <div className="min-h-screen bg-background">
      <Header title="AI 퀴즈" showBack onBack={() => navigate(`/quiz/${id}`)} />

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{currentIndex + 1} / {questions.length}</span>
            <div className="flex items-center gap-3">
              <span className={cn("text-xs font-bold px-2 py-1 rounded-full", difficultyColor)}>
                난이도: {difficulty}
              </span>
              <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                ⏱ {formatTime(timer)}
              </span>
              <span className="text-sm font-medium">
                정답: {score} / {currentIndex + (selectedAnswer !== null ? 1 : 0)}
              </span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-6 text-center bg-primary text-primary-foreground mb-6">
              <span className="inline-block text-xs px-2 py-1 rounded-full bg-white/20 mb-3">
                {getTypeLabel(q.type)}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold whitespace-pre-line">{q.question}</h2>
            </Card>

            <div className="grid grid-cols-1 gap-3">
              {q.choices.map((choice, i) => {
                const isCorrect = i === q.correctIndex;
                const isSelected = i === selectedAnswer;

                let bgColor = "bg-card hover:bg-muted/50";
                if (selectedAnswer !== null) {
                  if (isCorrect) bgColor = "bg-success/20 border-success";
                  else if (isSelected) bgColor = "bg-destructive/20 border-destructive";
                }

                return (
                  <Button
                    key={i}
                    variant="outline"
                    className={cn("w-full h-auto py-4 justify-start text-lg", bgColor, selectedAnswer !== null && "cursor-default")}
                    onClick={() => handleAnswer(i)}
                    disabled={selectedAnswer !== null}
                  >
                    <span className="font-semibold mr-3 text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                    <span className="flex-1 text-left">{choice}</span>
                    {selectedAnswer !== null && isCorrect && <Check className="w-5 h-5 text-success ml-2" />}
                    {selectedAnswer !== null && isSelected && !isCorrect && <X className="w-5 h-5 text-destructive ml-2" />}
                  </Button>
                );
              })}
            </div>

            {/* Show explanation after answering */}
            {selectedAnswer !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4"
              >
                <Card className="p-4 bg-muted/50 border-dashed">
                  <p className="text-sm font-semibold mb-1">💡 해설</p>
                  <p className="text-sm text-muted-foreground">{q.explanation}</p>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuizAI;
