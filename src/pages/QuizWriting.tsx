import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuizSound } from "@/hooks/useQuizSound";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isLocalVocab, loadLocalWords, getLocalSettings } from "@/utils/localVocabHelper";

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
  const { playCorrectSound, playIncorrectSound } = useQuizSound();
  
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
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
  const vocabIds = idsParam ? idsParam.split(",") : [id];
  const questionType = searchParams.get("type") || "meaning-to-word";
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

  const applySmartReview = async (wordsData: Word[]): Promise<Word[]> => {
    const smartReview = user
      ? await supabase.from("user_settings").select("*").eq("user_id", user.id).single().then(() => {
          const s = localStorage.getItem("local_settings");
          return s ? JSON.parse(s).smart_review : false;
        })
      : (getLocalSettings() as any).smart_review;
    
    if (!smartReview || !user) return wordsData;
    
    try {
      const wordIds = wordsData.map(w => w.id);
      const { data: progressData } = await supabase
        .from("study_progress")
        .select("word_id, correct_count, incorrect_count")
        .eq("user_id", user.id)
        .in("word_id", wordIds);
      
      if (!progressData || progressData.length === 0) return wordsData;
      
      const progressMap = new Map(progressData.map(p => [p.word_id, p]));
      return [...wordsData].sort((a, b) => {
        const pa = progressMap.get(a.id);
        const pb = progressMap.get(b.id);
        const rateA = pa ? (pa.incorrect_count || 0) / ((pa.correct_count || 0) + 1) : 0.5;
        const rateB = pb ? (pb.incorrect_count || 0) / ((pb.correct_count || 0) + 1) : 0.5;
        return rateB - rateA;
      });
    } catch {
      return wordsData;
    }
  };

  const loadWords = async () => {
    try {
      setLoading(true);

      const hasLocal = vocabIds.some(vid => vid && isLocalVocab(vid));
      if (hasLocal) {
        let allWords: Word[] = [];
        for (const vid of vocabIds) {
          if (vid && isLocalVocab(vid)) {
            allWords.push(...loadLocalWords(vid).map(w => ({ id: w.id, word: w.word, meaning: w.meaning })));
          }
        }
        if (isRetry && incorrectIds.length > 0) {
          allWords = allWords.filter(w => incorrectIds.includes(w.id));
        }
        if (isRandom && !isRetry) {
          allWords = allWords.sort(() => Math.random() - 0.5);
        }
        if (questionCountParam && !isRetry) {
          const count = parseInt(questionCountParam);
          if (!isNaN(count) && count > 0) allWords = allWords.slice(0, count);
        }
        setWords(allWords);
        return;
      }

      let query = supabase
        .from("words")
        .select("id, word, meaning")
        .in("vocabulary_id", vocabIds)
        .limit(100);

      if (chapterId) {
        query = query.eq("chapter_id", chapterId);
      }

      if (isRetry && incorrectIds.length > 0) {
        query = query.in("id", incorrectIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      let wordsData = data || [];
      
      if (!isRandom && !isRetry) {
        wordsData = await applySmartReview(wordsData);
      }
      
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

  const normalizeText = (text: string) => {
    return text.toLowerCase().replace(/[\s,?.!]/g, "");
  };

  // Check if user's meaning answer matches any part of the stored meaning
  const checkMeaningLocally = (userAns: string, correctMeaning: string): boolean => {
    const normalized = normalizeText(userAns);
    if (!normalized) return false;

    // Split stored meaning by common delimiters
    const meanings = correctMeaning.split(/[,;/]/).map(m => normalizeText(m));
    
    // Check if user answer matches any meaning part
    return meanings.some(m => m && (m === normalized || m.includes(normalized) || normalized.includes(m)));
  };

  // AI-based validation for meaning answers
  const validateMeaningWithAI = async (word: string, userAns: string, correctMeaning: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("validate-meaning", {
        body: { word, userAnswer: userAns, correctMeaning },
      });
      if (error) throw error;
      return data?.valid === true;
    } catch (e) {
      console.error("AI validation failed:", e);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (isSubmitted || isChecking) return;

    const currentWord = words[currentIndex];
    let correct = false;

    if (questionType === "meaning-to-word") {
      // Original: type the word
      const normalized = normalizeText(userAnswer);
      const correctNormalized = normalizeText(currentWord.word);
      correct = normalized === correctNormalized;
    } else {
      // word-to-meaning: type the meaning
      setIsChecking(true);
      
      // Step 1: Local check
      correct = checkMeaningLocally(userAnswer, currentWord.meaning);
      
      // Step 2: If local check fails, try AI validation
      if (!correct && userAnswer.trim().length > 0) {
        correct = await validateMeaningWithAI(currentWord.word, userAnswer, currentWord.meaning);
      }
      
      setIsChecking(false);
    }

    setIsSubmitted(true);
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
          questionType: questionType,
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
  
  const questionSizeClass = fontSize === 'small' ? 'text-2xl' : fontSize === 'large' ? 'text-5xl' : 'text-3xl';
  const inputSizeClass = fontSize === 'small' ? 'text-base' : fontSize === 'large' ? 'text-2xl' : 'text-xl';
  const answerSizeClass = fontSize === 'small' ? 'text-lg' : fontSize === 'large' ? 'text-3xl' : 'text-2xl';

  const isWordToMeaning = questionType === "word-to-meaning";
  const questionText = isWordToMeaning ? currentWord.word : currentWord.meaning;
  const correctAnswer = isWordToMeaning ? currentWord.meaning : currentWord.word;
  const placeholderText = isWordToMeaning ? "뜻을 입력하세요" : "단어를 입력하세요";
  const promptText = isWordToMeaning 
    ? "다음 단어의 뜻을 입력하세요" 
    : "다음 뜻에 해당하는 단어를 입력하세요";

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
                {promptText}
              </p>
              <h2 className={`font-bold mb-2 ${questionSizeClass}`}>{questionText}</h2>
            </Card>

            <div className="space-y-4">
              <Input
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSubmitted && !isChecking) {
                    handleSubmit();
                  }
                }}
                placeholder={placeholderText}
                className={`py-6 ${inputSizeClass}`}
                disabled={isSubmitted || isChecking}
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
                            정답: <span className={`font-semibold ${answerSizeClass}`}>{correctAnswer}</span>
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
                  disabled={!userAnswer.trim() || isChecking}
                  className="w-full"
                  size="lg"
                >
                  {isChecking ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      채점 중...
                    </span>
                  ) : "제출"}
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
