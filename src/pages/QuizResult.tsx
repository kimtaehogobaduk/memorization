import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Star } from "lucide-react";
import { motion } from "framer-motion";
import junsuk30 from "@/assets/junsuk-30.png";
import junsuk01 from "@/assets/junsuk-01.png";
import junsuk27 from "@/assets/junsuk-27.png";
import junsuk04 from "@/assets/junsuk-04.png";
import junsuk13 from "@/assets/junsuk-13.png";
import junsuk15 from "@/assets/junsuk-15.png";
import { studyNotes } from "@/lib/studyNotes";

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

  const getJunsukImage = () => {
    if (percentage === 100) return junsuk15;
    if (percentage >= 90) return junsuk30;
    if (percentage >= 70) return junsuk01;
    if (percentage >= 50) return junsuk27;
    if (percentage >= 30) return junsuk04;
    return junsuk13;
  };

  const getJunsukMessage = () => {
    if (percentage === 100) return "완벽해요! 최고예요! 🌟";
    if (percentage >= 90) return "완벽해요! 🎉";
    if (percentage >= 70) return "잘했어요! 👏";
    if (percentage >= 50) return "조금만 더 힘내요! 💪";
    if (percentage >= 30) return "다시 한번 도전해봐요! 📚";
    return "천천히 복습해봐요! 🔄";
  };

  const handleRetryIncorrect = () => {
    if (incorrectWords.length === 0) return;
    const quizType = searchParams.get("quizType") || "multiple";
    const questionType = searchParams.get("questionType") || "meaning-to-word";
    const choices = searchParams.get("choices") || "4";
    const delay = searchParams.get("delay") || "2";
    const chapter = searchParams.get("chapter");
    const incorrectIds = incorrectWords.map(w => w.id).join(",");
    const params = new URLSearchParams({ retry: "true", incorrectIds, delay });
    if (chapter) params.append("chapter", chapter);
    if (quizType === "multiple") {
      params.append("type", questionType);
      params.append("choices", choices);
      navigate(`/quiz/${id}/multiple?${params.toString()}`);
    } else if (quizType === "writing") {
      params.append("type", questionType);
      navigate(`/quiz/${id}/writing?${params.toString()}`);
    } else if (quizType === "matching") {
      navigate(`/quiz/${id}/matching?${params.toString()}`);
    }
  };

  const handleStudyIncorrect = () => {
    if (incorrectWords.length === 0) return;
    const incorrectIds = incorrectWords.map(w => w.id).join(",");
    const chapter = searchParams.get("chapter");
    const params = new URLSearchParams({ incorrectIds });
    if (chapter) params.append("chapter", chapter);
    navigate(`/study/${id}?${params.toString()}`);
  };

  const handleSaveFavorites = () => {
    incorrectWords.forEach((word) => {
      studyNotes.toggleFavorite({ id: word.id, word: word.word, meaning: word.meaning, vocabularyId: id || null });
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="퀴즈 결과" showBack onBack={() => navigate(`/vocabularies/${id}`)} />
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          <Card className="p-8 bg-gradient-junsuk border-2 border-junsuk-blue/30 shadow-junsuk">
            <div className="text-center space-y-6">
              <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: "spring", stiffness: 180, damping: 12 }} whileHover={{ scale: 1.1, rotate: 5 }} className="w-40 h-40 mx-auto">
                <img src={getJunsukImage()} alt="준섹이" className="w-full h-full object-contain drop-shadow-2xl" />
              </motion.div>
              <div>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring", stiffness: 200 }} className="text-7xl font-extrabold text-junsuk-blue mb-2">{percentage}%</motion.div>
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-2xl font-bold text-foreground">{getJunsukMessage()}</motion.p>
              </div>
              <div className="flex justify-center gap-8 text-base">
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-md">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span>학습수: <span className="font-bold">{correctCount}/{total}</span></span>
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-md">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span>복습수: <span className="font-bold">{incorrectCount}/{total}</span></span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {incorrectWords.length > 0 && (
          <div className="grid grid-cols-1 gap-3 pt-4">
            <Button onClick={handleRetryIncorrect} className="w-full" size="lg">틀린단어 다시풀기</Button>
            <Button onClick={handleStudyIncorrect} className="w-full" size="lg" variant="outline">틀린단어 공부하기</Button>
            <Button onClick={handleSaveFavorites} className="w-full" size="lg" variant="secondary">
              <Star className="w-4 h-4 mr-2" />
              틀린단어 즐겨찾기 저장
            </Button>
          </div>
        )}

        {incorrectWords.length === 0 && (
          <div className="text-center py-8">
            <p className="text-lg font-semibold text-success mb-4">🎉 완벽합니다!</p>
            <p className="text-muted-foreground mb-6">모든 문제를 맞히셨습니다.</p>
            <Button onClick={() => navigate(`/vocabularies/${id}`)}>단어장으로 돌아가기</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizResult;
