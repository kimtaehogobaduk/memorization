import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, BookOpen, Flame, RotateCcw, Volume2, Brain, Eye, EyeOff } from "lucide-react";
import { studyNotes, FavoriteWord } from "@/lib/studyNotes";
import { motion } from "framer-motion";

const Statistics = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteWord[]>([]);
  const [hiddenMeanings, setHiddenMeanings] = useState<Set<string>>(new Set());
  const [hideAll, setHideAll] = useState(false);

  useEffect(() => {
    setFavorites(studyNotes.getFavorites());
  }, []);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleMeaning = (wordId: string) => {
    setHiddenMeanings(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  };

  const toggleHideAll = () => {
    if (hideAll) {
      setHiddenMeanings(new Set());
    } else {
      setHiddenMeanings(new Set(favorites.map(f => f.id)));
    }
    setHideAll(!hideAll);
  };

  const isMeaningHidden = (wordId: string) => hiddenMeanings.has(wordId);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="학습 통계" showBack onBack={() => navigate(-1)} />
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Flame className="w-6 h-6 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">즐겨찾기한 단어</p>
                  <p className="text-3xl font-bold">{favorites.length}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => navigate("/vocabularies")} className="flex-1">
                  <BookOpen className="w-4 h-4 mr-2" />단어장 보러가기
                </Button>
                {favorites.length >= 4 && (
                  <Button variant="secondary" className="flex-1" onClick={() => {
                    // Store favorites as temporary quiz words in localStorage
                    const quizWords = favorites.map(f => ({ id: f.id, word: f.word, meaning: f.meaning }));
                    localStorage.setItem("temp_quiz_words", JSON.stringify(quizWords));
                    navigate("/quiz/favorites?type=meaning-to-word&random=true");
                  }}>
                    <Brain className="w-4 h-4 mr-2" />빠른 퀴즈
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">즐겨찾기 목록</h3>
            {favorites.length > 0 && (
              <Button size="sm" variant="ghost" onClick={toggleHideAll}>
                {hideAll ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                {hideAll ? "뜻 보기" : "뜻 숨기기"}
              </Button>
            )}
          </div>
          {favorites.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                아직 즐겨찾기한 단어가 없습니다.
              </CardContent>
            </Card>
          ) : (
            favorites.map((word) => (
              <motion.div key={word.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="cursor-pointer" onClick={() => toggleMeaning(word.id)}>
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">{word.word}</p>
                        <button type="button" onClick={(e) => { e.stopPropagation(); speak(word.word); }} className="text-muted-foreground hover:text-primary">
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                      {isMeaningHidden(word.id) ? (
                        <p className="text-sm text-muted-foreground mt-1 italic">탭하여 뜻 보기</p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">{word.meaning}</p>
                      )}
                      <Badge variant="secondary" className="mt-2">즐겨찾기</Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={(e) => {
                      e.stopPropagation();
                      studyNotes.removeFavorite(word.id);
                      setFavorites(studyNotes.getFavorites());
                    }}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Statistics;
