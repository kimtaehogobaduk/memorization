import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BookOpen, Search } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PublicVocabulary {
  id: string;
  name: string;
  description: string | null;
  language: string;
  created_at: string;
  words_count: number;
}

const PublicVocabularies = () => {
  const navigate = useNavigate();
  const [vocabularies, setVocabularies] = useState<PublicVocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadPublicVocabularies();
  }, []);

  const loadPublicVocabularies = async () => {
    try {
      setLoading(true);
      
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
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const vocabsWithCount = data?.map(v => ({
        id: v.id,
        name: v.name,
        description: v.description,
        language: v.language,
        created_at: v.created_at,
        words_count: v.words?.[0]?.count || 0,
      })) || [];

      setVocabularies(vocabsWithCount);
    } catch (error) {
      console.error("Error loading public vocabularies:", error);
      toast.error("공유 단어장을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const filteredVocabularies = vocabularies.filter(vocab =>
    vocab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vocab.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="공유 단어장" showBack onBack={() => navigate("/vocabularies")} />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="단어장 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredVocabularies.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <img 
              src={new URL('@/assets/junsuk-3-2.png', import.meta.url).href} 
              alt="Junsuk celebrating" 
              className="w-40 h-40 mx-auto mb-4"
            />
            <h2 className="text-xl font-semibold mb-2">
              {searchQuery ? "검색 결과가 없습니다" : "아직 공유된 단어장이 없습니다"}
            </h2>
            <p className="text-muted-foreground">
              {searchQuery ? "다른 검색어를 시도해보세요." : "첫 번째 공유 단어장을 만들어보세요!"}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredVocabularies.map((vocab, index) => (
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

export default PublicVocabularies;
