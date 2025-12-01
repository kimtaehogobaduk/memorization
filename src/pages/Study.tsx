import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, X, Eye, EyeOff, FileText, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Word {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
}

type ViewMode = "word-only" | "meaning-only" | "both" | "example";

const Study = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vocabularyName, setVocabularyName] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("word-only");

  const isRandom = searchParams.get("random") === "true";
  const chapterId = searchParams.get("chapter");
  const incorrectIds = searchParams.get("incorrectIds")?.split(",") || [];

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

      let query = supabase
        .from("words")
        .select("id, word, meaning, example")
        .eq("vocabulary_id", id);

      if (chapterId) {
        query = query.eq("chapter_id", chapterId);
      }

      if (incorrectIds.length > 0) {
        query = query.in("id", incorrectIds);
      }

      const { data, error } = await query.order("order_index", { ascending: true });

      if (error) throw error;

      let wordsData = data || [];
      if (isRandom && incorrectIds.length === 0) {
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

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("음성 재생을 지원하지 않는 브라우저입니다.");
    }
  };

  const renderCardContent = () => {
    switch (viewMode) {
      case "word-only":
        return (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">단어</p>
            <h2 className="text-4xl font-bold">{currentWord.word}</h2>
          </div>
        );
      case "meaning-only":
        return (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">뜻</p>
            <h2 className="text-2xl font-bold">{currentWord.meaning}</h2>
          </div>
        );
      case "both":
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">{currentWord.word}</h2>
            <p className="text-xl text-muted-foreground">{currentWord.meaning}</p>
          </div>
        );
      case "example":
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">{currentWord.word}</h2>
            <p className="text-lg text-muted-foreground mb-3">{currentWord.meaning}</p>
            {currentWord.example && (
              <p className="text-sm text-muted-foreground italic">
                {currentWord.example}
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title={vocabularyName} showBack onBack={() => navigate(`/vocabularies/${id}`)} />
      
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

        {/* View Mode Buttons */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={viewMode === "word-only" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("word-only")}
          >
            <Eye className="w-4 h-4 mr-1" />
            단어만
          </Button>
          <Button
            variant={viewMode === "meaning-only" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("meaning-only")}
          >
            <EyeOff className="w-4 h-4 mr-1" />
            뜻만
          </Button>
          <Button
            variant={viewMode === "both" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("both")}
          >
            단어+뜻
          </Button>
          <Button
            variant={viewMode === "example" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("example")}
          >
            <FileText className="w-4 h-4 mr-1" />
            예문 포함
          </Button>
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
              <Card className="p-8 bg-gradient-card shadow-lg">
                <div className="mb-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => speak(currentWord.word)}
                    className="text-primary"
                  >
                    <Volume2 className="w-5 h-5" />
                  </Button>
                </div>
                {renderCardContent()}
              </Card>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex gap-4"
              >
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleAnswer(false)}
                >
                  <X className="w-5 h-5 mr-2 text-destructive" />
                  모르겠어요
                </Button>
                <Button
                  className="flex-1 bg-success hover:bg-success/90"
                  onClick={() => handleAnswer(true)}
                >
                  <Check className="w-5 h-5 mr-2" />
                  알아요
                </Button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Study;
