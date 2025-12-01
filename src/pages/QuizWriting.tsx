import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Word {
  id: string;
  word: string;
  meaning: string;
}

const QuizWriting = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [incorrectWords, setIncorrectWords] = useState<Word[]>([]);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  const isRandom = searchParams.get("random") === "true";
  const answerDelay = parseFloat(searchParams.get("delay") || "2");
  const chapterId = searchParams.get("chapter");
  const isRetry = searchParams.get("retry") === "true";
  const incorrectIds = searchParams.get("incorrectIds")?.split(",") || [];
  const idsParam = searchParams.get("ids");
  const vocabIds = idsParam ? idsParam.split(",") : [id]; // Support multi-vocab
 
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
        .select("id, word, meaning")
        .in("vocabulary_id", vocabIds)
        .limit(100); // 최대 100개로 제한

      if (chapterId) {
        query = query.eq("chapter_id", chapterId);
      }

      if (isRetry && incorrectIds.length > 0) {
        query = query.in("id", incorrectIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      let wordsData = data || [];
      if (isRandom && !isRetry) {
        wordsData = wordsData.sort(() => Math.random() - 0.5);
      }

      setWords(wordsData);
    } catch (error) {
      console.error("Error loading words:", error);
      toast.error("단어를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const normalizeText = (text: string) => {
    // Remove spaces, punctuation, and convert to lowercase
    return text.toLowerCase().replace(/[\s,?.!]/g, "");
  };

  const handleSubmit = () => {
    if (isSubmitted) return;

    const currentWord = words[currentIndex];
    const normalized = normalizeText(userAnswer);
    const correctNormalized = normalizeText(currentWord.word);
    const correct = normalized === correctNormalized;

    setIsSubmitted(true);
    setIsCorrect(correct);

    if (correct) {
      setScore(score + 1);
    } else {
      setIncorrectWords([...incorrectWords, currentWord]);
    }

    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setUserAnswer("");
        setIsSubmitted(false);
        setIsCorrect(null);
      } else {
        const finalScore = score + (correct ? 1 : 0);
        const finalIncorrect = correct ? incorrectWords : [...incorrectWords, currentWord];
        
        const params = new URLSearchParams({
          score: finalScore.toString(),
          total: words.length.toString(),
          incorrect: encodeURIComponent(JSON.stringify(finalIncorrect)),
          quizType: "writing",
          delay: answerDelay.toString(),
        });
        
        if (chapterId) {
          params.append("chapter", chapterId);
        }
        
        if (vocabIds.length > 1 || !id) {
          params.append("ids", vocabIds.join(","));
          navigate(`/quiz/result?${params.toString()}`);
        } else {
          navigate(`/quiz/${id}/result?${params.toString()}`);
        }
      }
    }, answerDelay * 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">퀴즈할 단어가 없습니다.</p>
          <Button onClick={() => navigate(vocabIds.length > 1 ? "/vocabularies" : `/vocabularies/${id}`)}>
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;
  
  const questionSizeClass = fontSize === 'small' ? 'text-2xl' : fontSize === 'large' ? 'text-5xl' : 'text-3xl';
  const inputSizeClass = fontSize === 'small' ? 'text-base' : fontSize === 'large' ? 'text-2xl' : 'text-xl';
  const answerSizeClass = fontSize === 'small' ? 'text-lg' : fontSize === 'large' ? 'text-3xl' : 'text-2xl';

  return (
    <div className="min-h-screen bg-background">
      <Header title="주관식 퀴즈" showBack onBack={() => navigate(`/quiz/${id}`)} />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {words.length}
            </span>
            <span className="text-sm font-medium">
              정답: {score} / {currentIndex + (isCorrect !== null ? 1 : 0)}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card className="p-8 text-center bg-gradient-card">
              <p className="text-sm text-muted-foreground mb-4">
                다음 뜻에 해당하는 단어를 입력하세요
              </p>
              <h2 className={`font-bold mb-2 ${questionSizeClass}`}>{currentWord.meaning}</h2>
            </Card>

            <div className="space-y-4">
              <Input
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSubmitted) {
                    handleSubmit();
                  }
                }}
                placeholder="단어를 입력하세요"
                className={`py-6 ${inputSizeClass}`}
                disabled={isSubmitted}
                autoFocus
              />

              {isSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={`p-6 ${
                    isCorrect 
                      ? "bg-success/20 border-success" 
                      : "bg-destructive/20 border-destructive"
                  }`}>
                    <div className="flex items-center gap-3">
                      {isCorrect ? (
                        <Check className="w-6 h-6 text-success" />
                      ) : (
                        <X className="w-6 h-6 text-destructive" />
                      )}
                      <div className="flex-1">
                        <p className={`font-semibold ${fontSize === 'small' ? 'text-base' : fontSize === 'large' ? 'text-xl' : 'text-lg'}`}>
                          {isCorrect ? "정답입니다!" : "틀렸습니다"}
                        </p>
                        {!isCorrect && (
                          <p className={`mt-1 ${fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-lg' : 'text-base'}`}>
                            정답: <span className={`font-semibold ${answerSizeClass}`}>{currentWord.word}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {!isSubmitted && (
                <Button
                  onClick={handleSubmit}
                  disabled={!userAnswer.trim()}
                  className="w-full"
                  size="lg"
                >
                  제출
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuizWriting;
