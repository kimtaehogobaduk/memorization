import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuizSound } from "@/hooks/useQuizSound";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isLocalVocab, loadLocalWords, getLocalSettings } from "@/utils/localVocabHelper";

interface Word {
  id: string;
  word: string;
  meaning: string;
  part_of_speech: string | null;
}

type QuestionType = "multiple" | "writing";

interface QuestionPlan {
  word: Word;
  type: QuestionType;
  questionDirection: "word-to-meaning" | "meaning-to-word";
}

const QuizRandom = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playCorrectSound, playIncorrectSound } = useQuizSound();

  const [words, setWords] = useState<Word[]>([]);
  const [plan, setPlan] = useState<QuestionPlan[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Multiple choice state
  const [choices, setChoices] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  // Writing state
  const [userAnswer, setUserAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [incorrectWords, setIncorrectWords] = useState<Word[]>([]);
  const [timer, setTimer] = useState(0);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const inputRef = useRef<HTMLInputElement>(null);

  const isRandom = searchParams.get("random") === "true";
  const answerDelay = parseFloat(searchParams.get("delay") || "2");
  const chapterId = searchParams.get("chapter");
  const choiceCount = parseInt(searchParams.get("choices") || "4");
  const isRetry = searchParams.get("retry") === "true";
  const incorrectIds = searchParams.get("incorrectIds")?.split(",") || [];
  const idsParam = searchParams.get("ids");
  const vocabIds = idsParam ? idsParam.split(",") : [id];
  const questionCountParam = searchParams.get("count");

  useEffect(() => {
    if ((id || (vocabIds && vocabIds.length > 0)) && user) {
      loadWords();
      loadUserSettings();
    }
  }, [id, idsParam, user]);

  const loadUserSettings = async () => {
    try {
      const { data } = await supabase
        .from("user_settings")
        .select("quiz_font_size")
        .eq("user_id", user?.id)
        .single();
      if (data?.quiz_font_size) {
        setFontSize(data.quiz_font_size as 'small' | 'medium' | 'large');
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const loadWords = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("words")
        .select("id, word, meaning, part_of_speech")
        .in("vocabulary_id", vocabIds)
        .limit(100);

      if (chapterId) query = query.eq("chapter_id", chapterId);
      if (isRetry && incorrectIds.length > 0) query = query.in("id", incorrectIds);

      const { data, error } = await query;
      if (error) throw error;

      let wordsData = data || [];
      if (isRandom && !isRetry) {
        wordsData = wordsData.sort(() => Math.random() - 0.5);
      }

      if (questionCountParam && !isRetry) {
        const count = parseInt(questionCountParam);
        if (!isNaN(count) && count > 0) {
          wordsData = wordsData.slice(0, count);
        }
      }

      setWords(wordsData);

      // Build per-question plan with random types
      const types: QuestionType[] = ["multiple", "writing"];
      const directions: Array<"word-to-meaning" | "meaning-to-word"> = ["word-to-meaning", "meaning-to-word"];
      const questionPlan = wordsData.map((word) => ({
        word,
        type: types[Math.floor(Math.random() * types.length)],
        questionDirection: directions[Math.floor(Math.random() * directions.length)],
      }));
      setPlan(questionPlan);
    } catch (error) {
      console.error("Error loading words:", error);
      toast.error("단어를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Generate choices when index changes for multiple choice questions
  useEffect(() => {
    if (plan.length > 0 && currentIndex < plan.length) {
      const current = plan[currentIndex];
      if (current.type === "multiple") {
        generateChoices(current);
      }
      setSelectedAnswer(null);
      setUserAnswer("");
      setIsSubmitted(false);
      setIsCorrect(null);
      setTimer(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, plan]);

  // Timer
  useEffect(() => {
    if (selectedAnswer === null && !isSubmitted && plan.length > 0) {
      const interval = setInterval(() => setTimer(prev => prev + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [selectedAnswer, isSubmitted, plan]);

  const generateChoices = (current: QuestionPlan) => {
    const correctAnswer = current.questionDirection === "meaning-to-word" ? current.word.word : current.word.meaning;
    const otherWords = words.filter(w => w.id !== current.word.id);
    const shuffled = otherWords.sort(() => Math.random() - 0.5);
    const wrongChoices = shuffled
      .slice(0, choiceCount - 1)
      .map(w => current.questionDirection === "meaning-to-word" ? w.word : w.meaning);
    setChoices([correctAnswer, ...wrongChoices].sort(() => Math.random() - 0.5));
  };

  const goNext = (correct: boolean, currentWord: Word) => {
    setTimeout(() => {
      if (currentIndex < plan.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        const finalScore = score + (correct ? 1 : 0);
        const finalIncorrect = correct ? incorrectWords : [...incorrectWords, currentWord];
        const params = new URLSearchParams({
          score: finalScore.toString(),
          total: plan.length.toString(),
          incorrect: encodeURIComponent(JSON.stringify(finalIncorrect)),
          quizType: "random",
          choices: choiceCount.toString(),
          delay: answerDelay.toString(),
        });
        if (chapterId) params.append("chapter", chapterId);
        if (vocabIds.length > 1 || !id) {
          params.append("ids", vocabIds.join(","));
          navigate(`/quiz/result?${params.toString()}`);
        } else {
          navigate(`/quiz/${id}/result?${params.toString()}`);
        }
      }
    }, answerDelay * 1000);
  };

  // Multiple choice answer
  const handleMultipleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return;
    const current = plan[currentIndex];
    const correctAnswer = current.questionDirection === "meaning-to-word" ? current.word.word : current.word.meaning;
    const correct = answer === correctAnswer;

    setSelectedAnswer(answer);
    setIsCorrect(correct);
    if (correct) { playCorrectSound(); setScore(s => s + 1); }
    else { playIncorrectSound(); setIncorrectWords(prev => [...prev, current.word]); }
    goNext(correct, current.word);
  };

  // Writing answer
  const handleWritingSubmit = () => {
    if (isSubmitted || !userAnswer.trim()) return;
    const current = plan[currentIndex];
    const correctAnswer = current.word.word;
    const correct = userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();

    setIsSubmitted(true);
    setIsCorrect(correct);
    if (correct) { playCorrectSound(); setScore(s => s + 1); }
    else { playIncorrectSound(); setIncorrectWords(prev => [...prev, current.word]); }
    goNext(correct, current.word);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src={new URL('@/assets/junsuk-08.png', import.meta.url).href} alt="Loading" className="w-40 h-40 mx-auto mb-6 animate-bounce" />
          <p className="text-2xl font-semibold">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (plan.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">퀴즈할 단어가 없습니다.</p>
          <Button onClick={() => navigate(vocabIds.length > 1 ? "/vocabularies" : `/vocabularies/${id}`)}>돌아가기</Button>
        </div>
      </div>
    );
  }

  const current = plan[currentIndex];
  const progress = ((currentIndex + 1) / plan.length) * 100;
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const questionSizeClass = fontSize === 'small' ? 'text-2xl' : fontSize === 'large' ? 'text-5xl' : 'text-4xl';
  const choiceSizeClass = fontSize === 'small' ? 'text-base' : fontSize === 'large' ? 'text-2xl' : 'text-lg';

  const question = current.type === "writing"
    ? current.word.meaning
    : current.questionDirection === "meaning-to-word" ? current.word.meaning : current.word.word;

  const typeLabel = current.type === "multiple" ? "객관식" : "주관식";
  const questionLabel = current.type === "writing"
    ? "뜻을 보고 단어를 입력하세요"
    : current.questionDirection === "meaning-to-word" ? "뜻에 해당하는 단어는?" : "단어의 뜻은?";

  return (
    <div className="min-h-screen bg-background">
      <Header title="랜덤 퀴즈" showBack onBack={() => navigate(`/quiz/${id}`)} />
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{currentIndex + 1} / {plan.length}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{typeLabel}</span>
              <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">⏱ {formatTime(timer)}</span>
              <span className="text-sm font-medium">정답: {score} / {currentIndex + (isCorrect !== null ? 1 : 0)}</span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {/* Question card */}
            <Card className="p-8 text-center bg-primary text-primary-foreground">
              <p className="text-sm opacity-80 mb-4">{questionLabel}</p>
              <h2 className={cn("font-bold mb-2", questionSizeClass)}>{question}</h2>
              {current.word.part_of_speech && current.type === "multiple" && current.questionDirection === "word-to-meaning" && (
                <p className="opacity-90 mt-2 text-lg">{current.word.part_of_speech}</p>
              )}
            </Card>

            {/* Answer area */}
            {current.type === "multiple" ? (
              <div className="grid grid-cols-1 gap-3 mt-6">
                {choices.map((choice, index) => {
                  const correctAnswer = current.questionDirection === "meaning-to-word" ? current.word.word : current.word.meaning;
                  const isThisCorrect = choice === correctAnswer;
                  const isSelected = choice === selectedAnswer;
                  let bgColor = "bg-card hover:bg-muted/50";
                  if (selectedAnswer !== null) {
                    if (isThisCorrect) bgColor = "bg-success/20 border-success";
                    else if (isSelected) bgColor = "bg-destructive/20 border-destructive";
                  }
                  return (
                    <Button key={index} variant="outline" className={cn("w-full h-auto py-4 justify-start", choiceSizeClass, bgColor, selectedAnswer !== null && "cursor-default")} onClick={() => handleMultipleAnswer(choice)} disabled={selectedAnswer !== null}>
                      <span className="font-semibold mr-3 text-muted-foreground">{String.fromCharCode(65 + index)}.</span>
                      <span className="flex-1 text-left">{choice}</span>
                      {selectedAnswer !== null && isThisCorrect && <Check className="w-5 h-5 text-success ml-2" />}
                      {selectedAnswer !== null && isSelected && !isThisCorrect && <X className="w-5 h-5 text-destructive ml-2" />}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleWritingSubmit()}
                    placeholder="단어를 입력하세요..."
                    disabled={isSubmitted}
                    className={cn("text-lg h-14", isSubmitted && isCorrect && "border-success", isSubmitted && !isCorrect && "border-destructive")}
                    autoFocus
                  />
                  <Button onClick={handleWritingSubmit} disabled={isSubmitted || !userAnswer.trim()} className="h-14 px-6">확인</Button>
                </div>
                {isSubmitted && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className={cn("p-4", isCorrect ? "bg-success/10 border-success" : "bg-destructive/10 border-destructive")}>
                      <div className="flex items-center gap-2 mb-2">
                        {isCorrect ? <Check className="w-5 h-5 text-success" /> : <X className="w-5 h-5 text-destructive" />}
                        <span className="font-bold">{isCorrect ? "정답!" : "오답"}</span>
                      </div>
                      {!isCorrect && <p className="text-sm">정답: <span className="font-bold text-primary">{current.word.word}</span></p>}
                    </Card>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuizRandom;
