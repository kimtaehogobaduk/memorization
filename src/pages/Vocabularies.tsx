import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, BookOpen, Trash2, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Vocabulary {
  id: string;
  name: string;
  description: string | null;
  language: string;
  created_at: string;
  words_count: number;
}

const Vocabularies = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loadingVocabs, setLoadingVocabs] = useState(true);

  useEffect(() => {
    if (!loading) {
      loadVocabularies();
    }
  }, [user, loading]);

  const loadVocabularies = async () => {
    try {
      setLoadingVocabs(true);
      
      if (user) {
        // Load from Supabase
        const { data, error } = await supabase
          .from("vocabularies")
          .select(`
            id,
            name,
            description,
            language,
            created_at,
            words:words(count)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const vocabsWithCount = data?.map(v => ({
          ...v,
          words_count: v.words?.[0]?.count || 0,
        })) || [];

        setVocabularies(vocabsWithCount);
      } else {
        // Load from localStorage
        const { localStorageService } = await import("@/services/localStorageService");
        const localVocabs = localStorageService.getVocabularies();
        const vocabsWithCount = localVocabs.map(v => {
          const words = localStorageService.getWordsByVocabulary(v.id);
          return {
            ...v,
            words_count: words.length,
          };
        });
        setVocabularies(vocabsWithCount);
      }
    } catch (error) {
      console.error("Error loading vocabularies:", error);
      toast.error("단어장을 불러오는데 실패했습니다.");
    } finally {
      setLoadingVocabs(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (user) {
        const { error } = await supabase
          .from("vocabularies")
          .delete()
          .eq("id", id);

        if (error) throw error;
      } else {
        const { localStorageService } = await import("@/services/localStorageService");
        localStorageService.deleteVocabulary(id);
      }

      toast.success("단어장이 삭제되었습니다.");
      loadVocabularies();
    } catch (error) {
      console.error("Error deleting vocabulary:", error);
      toast.error("단어장 삭제에 실패했습니다.");
    }
  };

  if (loading || loadingVocabs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="내 단어장"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/vocabularies/public")}>
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/vocabularies/excel")}>
              Excel
            </Button>
            <Button size="icon" onClick={() => navigate("/vocabularies/new")}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        }
      />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {vocabularies.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">아직 단어장이 없습니다</h2>
            <p className="text-muted-foreground mb-6">첫 단어장을 만들어보세요!</p>
            <Button onClick={() => navigate("/vocabularies/new")}>
              <Plus className="w-5 h-5 mr-2" />
              단어장 만들기
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {vocabularies.map((vocab, index) => (
              <motion.div
                key={vocab.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/vocabularies/${vocab.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{vocab.name}</h3>
                        {vocab.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {vocab.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{vocab.language}</span>
                          <span>{vocab.words_count}개 단어</span>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                            <AlertDialogDescription>
                              이 작업은 되돌릴 수 없습니다. 단어장과 모든 단어가 삭제됩니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(vocab.id);
                              }}
                              className="bg-destructive text-destructive-foreground"
                            >
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Vocabularies;
