import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, BookOpen, Flame, RotateCcw } from "lucide-react";
import { studyNotes, FavoriteWord } from "@/lib/studyNotes";
import { motion } from "framer-motion";

const Statistics = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteWord[]>([]);

  useEffect(() => {
    setFavorites(studyNotes.getFavorites());
  }, []);

  const memorizedCount = favorites.length;

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
                  <p className="text-3xl font-bold">{memorizedCount}</p>
                </div>
              </div>
              <Button onClick={() => navigate("/vocabularies")} className="w-full">
                <BookOpen className="w-4 h-4 mr-2" />
                단어장 보러가기
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">즐겨찾기 목록</h3>
          {favorites.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                아직 즐겨찾기한 단어가 없습니다.
              </CardContent>
            </Card>
          ) : (
            favorites.map((word) => (
              <Card key={word.id}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-lg">{word.word}</p>
                    <p className="text-sm text-muted-foreground mt-1">{word.meaning}</p>
                    <Badge variant="secondary" className="mt-2">즐겨찾기</Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => {
                    studyNotes.removeFavorite(word.id);
                    setFavorites(studyNotes.getFavorites());
                  }}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Statistics;
