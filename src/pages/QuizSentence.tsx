import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { apiGradeSentence } from "@/services/api";
import { isLocalVocab, loadLocalWords } from "@/utils/localVocabHelper";
import { useQuizSound } from "@/hooks/useQuizSound";

interface Word { id: string; word: string; meaning: string; }

const QuizSentence = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { playCorrectSound, playIncorrectSound } = useQuizSound();

  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentence, setSentence] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; reason: string } | null>(null);
  const [score, setScore] = useState(0);
  const [incorrectWords, setIncorrectWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  const isRandom = searchParams.get("random") === "true";
  const chapterId = searchParams.get("chapter");
  const isRetry = searchParams.get("retry") === "true";
  const incorrectIds = searchParams.get("incorrectIds")?.split(",") || [];
  const idsParam = searchParams.get("ids");
  const vocabIds = idsParam ? idsParam.split(",") : [id];
  const questionCountParam = searchParams.get("count");

  useEffect(() => { loadWords(); }, [id, idsParam]);

  const loadWords = async () => {
    try {
      setLoading(true);
      const hasLocal = vocabIds.some(vid => vid && isLocalVocab(vid));
      let wordsData: Word[] = [];
      if (hasLocal) {
        for (const vid of vocabIds) {
          if (vid && isLocalVocab(vid)) {
            wordsData.push(...loadLocalWords(vid).map(w => ({ id: w.id, word: w.word, meaning: w.meaning })));
          }
        }
      } else {
        let q = supabase.from("words").select("id, word, meaning").in("vocabulary_id", vocabIds).limit(100);
        if (chapterId) q = q.eq("chapter_id", chapterId);
        if (isRetry && incorrectIds.length > 0) q = q.in("id", incorrectIds);
        const { data, error } = await q;
        if (error) throw error;
        wordsData = data || [];
      }
      if (isRetry && incorrectIds.length > 0) wordsData = wordsData.filter(w => incorrectIds.includes(w.id));
      if (isRandom && !isRetry) wordsData = wordsData.sort(() => Math.random() - 0.5);
      if (questionCountParam && !isRetry) {
        const c = parseInt(questionCountParam);
        if (!isNaN(c) && c > 0) wordsData = wordsData.slice(0, c);
      }
      setWords(wordsData);
    } catch (e) {
      console.error(e);
      toast.error("단어를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isChecking || result || !sentence.trim()) return;
    const cw = words[currentIndex];
    setIsChecking(true);
    try {
      const res = await apiGradeSentence(cw.word, cw.meaning, sentence.trim());
      setResult({ correct: res.correct, reason: res.reason });
      if (res.correct) { playCorrectSound(); setScore(s => s + 1); }
      else { playIncorrectSound(); setIncorrectWords(prev => [...prev, cw]); }
    } catch (e) {
      console.error(e);
      toast.error("채점에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleNext = () => {
    if (!result) return;
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSentence("");
      setResult(null);
    } else {
      const params = new URLSearchParams({
        score: score.toString(),
        total: words.length.toString(),
        incorrect: encodeURIComponent(JSON.stringify(incorrectWords)),
        quizType: "sentence",
      });
      if (chapterId) params.append("chapter", chapterId);
      if (vocabIds.length > 1 || !id) {
        params.append("ids", vocabIds.join(","));
        navigate(`/quiz/result?${params.toString()}`);
      } else {
        navigate(`/quiz/${id}/result?${params.toString()}`);
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin" /></div>;
  }
  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">퀴즈할 단어가 없습니다.</p>
          <Button onClick={() => navigate(`/quiz/${id}`)}>돌아가기</Button>
        </div>
      </div>
    );
  }

  const current = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header title="문장 작성 퀴즈" showBack onBack={() => navigate(`/quiz/${id}`)} />
      <div className="max-w-screen-md mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{currentIndex + 1} / {words.length}</span>
            <span className="text-sm font-medium">정답: {score}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="p-8 text-center bg-primary text-primary-foreground mb-4">
              <p className="text-sm opacity-80 mb-2">아래 단어로 영어 문장을 만들어보세요</p>
              <h2 className="font-bold text-4xl mb-1">{current.word}</h2>
              <p className="opacity-90 text-base">{current.meaning}</p>
            </Card>

            <Textarea
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder="이 단어를 사용한 영어 문장을 입력하세요..."
              disabled={!!result || isChecking}
              rows={4}
              className="text-lg"
            />

            {!result ? (
              <Button
                className="w-full mt-4 h-12"
                onClick={handleSubmit}
                disabled={isChecking || !sentence.trim()}
              >
                {isChecking ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI 채점 중...</> : "제출"}
              </Button>
            ) : (
              <>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  <Card className={`p-4 ${result.correct ? "bg-success/10 border-success" : "bg-destructive/10 border-destructive"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {result.correct ? <Check className="w-5 h-5 text-success" /> : <X className="w-5 h-5 text-destructive" />}
                      <span className="font-bold">{result.correct ? "정답!" : "오답"}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{result.reason}</p>
                  </Card>
                </motion.div>
                <Button className="w-full mt-4 h-12" onClick={handleNext}>
                  <Check className="w-4 h-4 mr-2" />
                  {currentIndex < words.length - 1 ? "다음 문제" : "결과 보기"}
                </Button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuizSentence;
