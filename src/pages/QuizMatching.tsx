import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Word {
  id: string;
  word: string;
  meaning: string;
}

interface MatchPair {
  id: string;
  word: Word;
  matched: boolean;
}

const QuizMatching = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [leftPairs, setLeftPairs] = useState<MatchPair[]>([]);
  const [rightPairs, setRightPairs] = useState<MatchPair[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  const isRandom = searchParams.get("random") === "true";
  const chapterId = searchParams.get("chapter");
  const wordsPerPage = 6;

  useEffect(() => {
    if (id && user) {
      loadWords();
    }
  }, [id, user]);

  useEffect(() => {
    if (allWords.length > 0) {
      setupPage();
    }
  }, [currentPage, allWords]);

  const loadWords = async () => {
    try {
      setLoading(true);

      const query = supabase
        .from("words")
        .select("id, word, meaning")
        .eq("vocabulary_id", id);

      if (chapterId) {
        query.eq("chapter_id", chapterId);
      }

      const { data, error } = await query;

      if (error) throw error;

      let wordsData = data || [];
      if (isRandom) {
        wordsData = wordsData.sort(() => Math.random() - 0.5);
      }

      setAllWords(wordsData);
    } catch (error) {
      console.error("Error loading words:", error);
      toast.error("단어를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const setupPage = () => {
    const start = currentPage * wordsPerPage;
    const pageWords = allWords.slice(start, start + wordsPerPage);

    const left: MatchPair[] = pageWords.map(w => ({
      id: w.id,
      word: w,
      matched: false,
    }));

    const right: MatchPair[] = [...pageWords]
      .sort(() => Math.random() - 0.5)
      .map(w => ({
        id: w.id,
        word: w,
        matched: false,
      }));

    setLeftPairs(left);
    setRightPairs(right);
    setSelectedLeft(null);
    setSelectedRight(null);
  };

  const handleLeftClick = (id: string) => {
    const pair = leftPairs.find(p => p.id === id);
    if (pair?.matched) return;
    setSelectedLeft(selectedLeft === id ? null : id);
  };

  const handleRightClick = (id: string) => {
    const pair = rightPairs.find(p => p.id === id);
    if (pair?.matched) return;
    setSelectedRight(selectedRight === id ? null : id);

    // Check match
    if (selectedLeft && selectedLeft === id) {
      setLeftPairs(leftPairs.map(p => 
        p.id === id ? { ...p, matched: true } : p
      ));
      setRightPairs(rightPairs.map(p => 
        p.id === id ? { ...p, matched: true } : p
      ));
      setScore(score + 1);
      setSelectedLeft(null);
      setSelectedRight(null);

      // Check if page is complete
      const allMatched = leftPairs.every(p => p.id === id || p.matched);
      if (allMatched) {
        setTimeout(() => {
          const nextPage = currentPage + 1;
          const totalPages = Math.ceil(allWords.length / wordsPerPage);
          
          if (nextPage < totalPages) {
            setCurrentPage(nextPage);
          } else {
            toast.success(`퀴즈 완료! ${score + 1}/${allWords.length} 정답`);
            navigate(`/vocabularies/${id}`);
          }
        }, 1000);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (allWords.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">퀴즈할 단어가 없습니다.</p>
          <Button onClick={() => navigate(`/vocabularies/${id}`)}>
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(allWords.length / wordsPerPage);
  const progress = ((currentPage * wordsPerPage + leftPairs.filter(p => p.matched).length) / allWords.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header title="단어 짝짓기" showBack />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              페이지 {currentPage + 1} / {totalPages}
            </span>
            <span className="text-sm font-medium">
              정답: {score} / {allWords.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-4"
          >
            {/* Left side - Words */}
            <div className="space-y-3">
              {leftPairs.map((pair, index) => (
                <motion.div
                  key={pair.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={cn(
                      "p-4 cursor-pointer transition-all",
                      pair.matched && "opacity-50 bg-success/20 border-success",
                      selectedLeft === pair.id && !pair.matched && "border-primary bg-primary/10"
                    )}
                    onClick={() => handleLeftClick(pair.id)}
                  >
                    <p className="font-semibold text-center">{pair.word.word}</p>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Right side - Meanings */}
            <div className="space-y-3">
              {rightPairs.map((pair, index) => (
                <motion.div
                  key={pair.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={cn(
                      "p-4 cursor-pointer transition-all",
                      pair.matched && "opacity-50 bg-success/20 border-success",
                      selectedRight === pair.id && !pair.matched && "border-primary bg-primary/10"
                    )}
                    onClick={() => handleRightClick(pair.id)}
                  >
                    <p className="text-sm text-center">{pair.word.meaning}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuizMatching;
