import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuizSound } from "@/hooks/useQuizSound";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
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

const QuizMultipleChoice = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playCorrectSound, playIncorrectSound } = useQuizSound();
  
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(0);
  const [incorrectWords, setIncorrectWords] = useState<Word[]>([]);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  const questionType = searchParams.get("type") || "meaning-to-word";
  const choiceCount = parseInt(searchParams.get("choices") || "4");
  const isRandom = searchParams.get("random") === "true";
  const answerDelay = parseFloat(searchParams.get("delay") || "2");
  const chapterId = searchParams.get("chapter");
  const isRetry = searchParams.get("retry") === "true";
  const incorrectIds = searchParams.get("incorrectIds")?.split(",") || [];
  const idsParam = searchParams.get("ids");
  const vocabIds = idsParam ? idsParam.split(",") : [id]; // Support multi-vocab
  const questionCountParam = searchParams.get("count");
 
  useEffect(() => {
    if (id || (vocabIds && vocabIds.length > 0)) {
      loadWords();
      loadUserSettings();
    }
  }, [id, idsParam]);

  const loadUserSettings = async () => {
    if (!user) {
      const local = getLocalSettings();
      setFontSize(local.quiz_font_size as 'small' | 'medium' | 'large');
      return;
    }
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

  useEffect(() => {
    if (words.length > 0 && currentIndex < words.length) {
      generateChoices();
      setTimer(0);
    }
  }, [currentIndex, words]);

  useEffect(() => {
    if (selectedAnswer === null && words.length > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [selectedAnswer, words]);

  const loadWords = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("words")
        .select("id, word, meaning, part_of_speech")
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

      if (questionCountParam && !isRetry) {
        const count = parseInt(questionCountParam);
        if (!isNaN(count) && count > 0) {
          wordsData = wordsData.slice(0, count);
        }
      }

      setWords(wordsData);
    } catch (error) {
      console.error("Error loading words:", error);
      toast.error("단어를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const generateChoices = () => {
    const currentWord = words[currentIndex];
    const correctAnswer = questionType === "meaning-to-word" ? currentWord.word : currentWord.meaning;
    
    const otherWords = words.filter((_, i) => i !== currentIndex);
    const shuffled = otherWords.sort(() => Math.random() - 0.5);
    const wrongChoices = shuffled
      .slice(0, choiceCount - 1)
      .map(w => questionType === "meaning-to-word" ? w.word : w.meaning);

    const allChoices = [correctAnswer, ...wrongChoices].sort(() => Math.random() - 0.5);
    setChoices(allChoices);
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return;

    const currentWord = words[currentIndex];
    const correctAnswer = questionType === "meaning-to-word" ? currentWord.word : currentWord.meaning;
    const correct = answer === correctAnswer;

    setSelectedAnswer(answer);
    setIsCorrect(correct);

    if (correct) {
      playCorrectSound();
      setScore(score + 1);
    } else {
      playIncorrectSound();
      setIncorrectWords([...incorrectWords, currentWord]);
    }

    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        const finalScore = score + (correct ? 1 : 0);
        const finalIncorrect = correct ? incorrectWords : [...incorrectWords, currentWord];
        
        const params = new URLSearchParams({
          score: finalScore.toString(),
          total: words.length.toString(),
          incorrect: encodeURIComponent(JSON.stringify(finalIncorrect)),
          quizType: "multiple",
          questionType,
          choices: choiceCount.toString(),
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
        <div className="text-center">
          <img 
            src={new URL('@/assets/junsuk-08.png', import.meta.url).href} 
            alt="Junsuk surprised" 
            className="w-40 h-40 mx-auto mb-6 animate-bounce"
          />
          <p className="text-2xl font-semibold">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img 
            src={new URL('@/assets/junsuk-16.png', import.meta.url).href} 
            alt="Junsuk shy" 
            className="w-24 h-24 mx-auto mb-4"
          />
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
  const question = questionType === "meaning-to-word" ? currentWord.meaning : currentWord.word;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const questionSizeClass = fontSize === 'small' ? 'text-2xl' : fontSize === 'large' ? 'text-5xl' : 'text-4xl';
  const choiceSizeClass = fontSize === 'small' ? 'text-base' : fontSize === 'large' ? 'text-2xl' : 'text-lg';

  return (
    <div className="min-h-screen bg-background">
      <Header title="객관식 퀴즈" showBack onBack={() => navigate(`/quiz/${id}`)} />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {words.length}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                ⏱ {formatTime(timer)}
              </span>
              <span className="text-sm font-medium">
                정답: {score} / {currentIndex + (isCorrect !== null ? 1 : 0)}
              </span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-8 text-center bg-primary text-primary-foreground">
                <p className="text-sm opacity-80 mb-4">
                  {questionType === "meaning-to-word" ? "뜻에 해당하는 단어는?" : "단어의 뜻은?"}
                </p>
                <h2 className={cn("font-bold mb-2", questionSizeClass)}>{question}</h2>
                {currentWord.part_of_speech && questionType === "word-to-meaning" && (
                  <p className={cn("opacity-90 mt-2", fontSize === 'small' ? 'text-base' : fontSize === 'large' ? 'text-xl' : 'text-lg')}>{currentWord.part_of_speech}</p>
                )}
              </Card>

              <div className="grid grid-cols-1 gap-3 mt-6">
                {choices.map((choice, index) => {
                  const correctAnswer = questionType === "meaning-to-word" ? currentWord.word : currentWord.meaning;
                  const isThisCorrect = choice === correctAnswer;
                  const isSelected = choice === selectedAnswer;
                  
                  let bgColor = "bg-card hover:bg-muted/50";
                  if (selectedAnswer !== null) {
                    if (isThisCorrect) {
                      bgColor = "bg-success/20 border-success";
                    } else if (isSelected && !isThisCorrect) {
                      bgColor = "bg-destructive/20 border-destructive";
                    }
                  }

                  return (
                    <Button
                      key={index}
                      variant="outline"
                      className={cn(
                        "w-full h-auto py-4 justify-start",
                        choiceSizeClass,
                        bgColor,
                        selectedAnswer !== null && "cursor-default"
                      )}
                      onClick={() => handleAnswer(choice)}
                      disabled={selectedAnswer !== null}
                    >
                      <span className="font-semibold mr-3 text-muted-foreground">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <span className="flex-1 text-left">{choice}</span>
                      {selectedAnswer !== null && isThisCorrect && (
                        <Check className="w-5 h-5 text-success ml-2" />
                      )}
                      {selectedAnswer !== null && isSelected && !isThisCorrect && (
                        <X className="w-5 h-5 text-destructive ml-2" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default QuizMultipleChoice;
