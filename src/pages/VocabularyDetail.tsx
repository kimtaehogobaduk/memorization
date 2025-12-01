import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlayCircle } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Word {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  note: string | null;
  part_of_speech: string | null;
}

interface Vocabulary {
  id: string;
  name: string;
  description: string | null;
  language: string;
}

const VocabularyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vocabulary, setVocabulary] = useState<Vocabulary | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && user) {
      loadVocabulary();
    }
  }, [id, user]);

  const loadVocabulary = async () => {
    try {
      setLoading(true);

      const { data: vocabData, error: vocabError } = await supabase
        .from("vocabularies")
        .select("*")
        .eq("id", id)
        .single();

      if (vocabError) throw vocabError;

      const { data: wordsData, error: wordsError } = await supabase
        .from("words")
        .select("*")
        .eq("vocabulary_id", id)
        .order("order_index", { ascending: true });

      if (wordsError) throw wordsError;

      setVocabulary(vocabData);
      setWords(wordsData || []);
    } catch (error) {
      console.error("Error loading vocabulary:", error);
      toast.error("단어장을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (!vocabulary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">단어장을 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <Header
        title={vocabulary.name}
        showBack
        action={
          words.length > 0 && (
            <Button
              onClick={() => navigate(`/study/${id}`)}
              className="bg-gradient-primary"
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              학습 시작
            </Button>
          )
        }
      />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {vocabulary.description && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <p className="text-muted-foreground">{vocabulary.description}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            전체 단어 ({words.length})
          </h2>
        </div>

        <div className="space-y-3">
          {words.map((word, index) => (
            <motion.div
              key={word.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{word.word}</h3>
                      {word.part_of_speech && (
                        <span className="text-xs text-muted-foreground">
                          {word.part_of_speech}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-foreground mb-2">{word.meaning}</p>
                  {word.example && (
                    <p className="text-sm text-muted-foreground italic mb-2">
                      예문: {word.example}
                    </p>
                  )}
                  {word.note && (
                    <p className="text-sm text-muted-foreground">
                      메모: {word.note}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {words.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">아직 단어가 없습니다.</p>
            <Button onClick={() => navigate(`/vocabularies/${id}/edit`)}>
              단어 추가하기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VocabularyDetail;
