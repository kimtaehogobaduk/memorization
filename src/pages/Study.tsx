import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
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
  example: string | null;
}

const Study = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vocabularyName, setVocabularyName] = useState("");

  useEffect(() => {
    if (id && user) {
      loadWords();
    }
  }, [id, user]);

  const loadWords = async () => {
    try {
      setLoading(true);

      const { data: vocabData } = await supabase
        .from("vocabularies")
        .select("name")
        .eq("id", id)
        .single();

      if (vocabData) {
        setVocabularyName(vocabData.name);
      }

      const { data, error } = await supabase
        .from("words")
        .select("id, word, meaning, example")
        .eq("vocabulary_id", id)
        .order("order_index", { ascending: true });

      if (error) throw error;

      setWords(data || []);
    } catch (error) {
      console.error("Error loading words:", error);
      toast.error("단어를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (isCorrect: boolean) => {
    const currentWord = words[currentIndex];

    try {
      // Update or insert study progress
      const { data: existingProgress } = await supabase
        .from("study_progress")
        .select("*")
        .eq("user_id", user?.id)
        .eq("word_id", currentWord.id)
        .single();

      if (existingProgress) {
        await supabase
          .from("study_progress")
          .update({
            correct_count: isCorrect ? existingProgress.correct_count + 1 : existingProgress.correct_count,
            incorrect_count: !isCorrect ? existingProgress.incorrect_count + 1 : existingProgress.incorrect_count,
            last_studied_at: new Date().toISOString(),
          })
          .eq("id", existingProgress.id);
      } else {
        await supabase
          .from("study_progress")
          .insert({
            user_id: user?.id,
            word_id: currentWord.id,
            vocabulary_id: id,
            correct_count: isCorrect ? 1 : 0,
            incorrect_count: !isCorrect ? 1 : 0,
          });
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }

    // Move to next card
    if (currentIndex < words.length - 1) {
      setFlipped(false);
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 300);
    } else {
      toast.success("학습 완료!");
      navigate(`/vocabularies/${id}`);
    }
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
          <p className="mb-4">학습할 단어가 없습니다.</p>
          <Button onClick={() => navigate(`/vocabularies/${id}`)}>
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header title={vocabularyName} showBack />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {words.length}
            </span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              <Card
                className="p-8 cursor-pointer bg-gradient-card shadow-lg"
                onClick={() => setFlipped(!flipped)}
              >
                <motion.div
                  initial={false}
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ duration: 0.6 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {!flipped ? (
                    <div className="text-center" style={{ backfaceVisibility: "hidden" }}>
                      <p className="text-sm text-muted-foreground mb-4">단어</p>
                      <h2 className="text-4xl font-bold mb-6">{currentWord.word}</h2>
                      <p className="text-sm text-muted-foreground">
                        카드를 터치하여 뜻 보기
                      </p>
                    </div>
                  ) : (
                    <div
                      className="text-center"
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      <p className="text-sm text-muted-foreground mb-4">뜻</p>
                      <h2 className="text-2xl font-bold mb-4">{currentWord.meaning}</h2>
                      {currentWord.example && (
                        <p className="text-sm text-muted-foreground italic">
                          {currentWord.example}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              </Card>

              {flipped && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex gap-4"
                >
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnswer(false);
                    }}
                  >
                    <X className="w-5 h-5 mr-2 text-destructive" />
                    모르겠어요
                  </Button>
                  <Button
                    className="flex-1 bg-success hover:bg-success/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnswer(true);
                    }}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    알아요
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Study;
