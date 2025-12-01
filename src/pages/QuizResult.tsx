import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface IncorrectWord {
  id: string;
  word: string;
  meaning: string;
}

const QuizResult = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [incorrectWords, setIncorrectWords] = useState<IncorrectWord[]>([]);

  useEffect(() => {
    const scoreParam = parseInt(searchParams.get("score") || "0");
    const totalParam = parseInt(searchParams.get("total") || "0");
    const incorrectParam = searchParams.get("incorrect");
    
    setScore(scoreParam);
    setTotal(totalParam);
    
    if (incorrectParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(incorrectParam));
        setIncorrectWords(parsed);
      } catch (error) {
        console.error("Error parsing incorrect words:", error);
      }
    }
  }, [searchParams]);

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const correctCount = score;
  const incorrectCount = total - score;

  const handleRetryIncorrect = () => {
    if (incorrectWords.length === 0) return;
    
    const quizType = searchParams.get("quizType") || "multiple";
    const questionType = searchParams.get("questionType") || "meaning-to-word";
    const choices = searchParams.get("choices") || "4";
    const delay = searchParams.get("delay") || "2";
    const chapter = searchParams.get("chapter");
    
    const incorrectIds = incorrectWords.map(w => w.id).join(",");
    const params = new URLSearchParams({
      retry: "true",
      incorrectIds,
      delay,
    });
    
    if (chapter) {
      params.append("chapter", chapter);
    }
    
    if (quizType === "multiple") {
      params.append("type", questionType);
      params.append("choices", choices);
      navigate(`/quiz/${id}/multiple?${params.toString()}`);
    } else if (quizType === "writing") {
      navigate(`/quiz/${id}/writing?${params.toString()}`);
    } else if (quizType === "matching") {
      navigate(`/quiz/${id}/matching?${params.toString()}`);
    }
  };

  const handleStudyIncorrect = () => {
    if (incorrectWords.length === 0) return;
    
    const incorrectIds = incorrectWords.map(w => w.id).join(",");
    const chapter = searchParams.get("chapter");
    
    const params = new URLSearchParams({
      incorrectIds,
    });
    
    if (chapter) {
      params.append("chapter", chapter);
    }
    
    navigate(`/study/${id}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="퀴즈 결과" showBack />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* Score Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-8 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-7xl font-bold text-primary mb-4"
              >
                {percentage}%
              </motion.div>
              <div className="flex justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span>학습수: <span className="font-semibold">{correctCount}/{total}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span>복습수: <span className="font-semibold">{incorrectCount}/{total}</span></span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Incorrect Words List */}
        {incorrectWords.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground px-1">
              복습이 필요한 단어 ({incorrectWords.length}개)
            </h3>
            {incorrectWords.map((word, index) => (
              <motion.div
                key={word.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg">{word.word}</p>
                      <p className="text-sm text-muted-foreground mt-1">{word.meaning}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {incorrectWords.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button
              onClick={handleRetryIncorrect}
              className="w-full"
              size="lg"
              variant="default"
            >
              틀린단어 다시풀기
            </Button>
            <Button
              onClick={handleStudyIncorrect}
              className="w-full"
              size="lg"
              variant="outline"
            >
              틀린단어 공부하기
            </Button>
          </div>
        )}

        {incorrectWords.length === 0 && (
          <div className="text-center py-8">
            <p className="text-lg font-semibold text-success mb-4">🎉 완벽합니다!</p>
            <p className="text-muted-foreground mb-6">모든 문제를 맞히셨습니다.</p>
            <Button onClick={() => navigate(`/vocabularies/${id}`)}>
              단어장으로 돌아가기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizResult;
