import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, BookOpen, Trash2, Share2, Library, ChevronDown, ChevronRight, Download, FileText, Sparkles, PenLine } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Vocabulary {
  id: string;
  name: string;
  description: string | null;
  language: string;
  created_at: string;
  words_count: number;
}

interface Bookshelf {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  vocabularies: Vocabulary[];
  isExpanded?: boolean;
}

const Vocabularies = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [bookshelves, setBookshelves] = useState<Bookshelf[]>([]);
  const [loadingVocabs, setLoadingVocabs] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newBookshelfName, setNewBookshelfName] = useState("");
  const [newBookshelfDesc, setNewBookshelfDesc] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBookshelf, setSelectedBookshelf] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      loadVocabularies();
      if (user) {
        loadBookshelves();
      }
    }
  }, [user, loading]);

  const loadBookshelves = async () => {
    try {
      const { data: shelfData, error } = await supabase
        .from("bookshelves")
        .select(`
          id,
          name,
          description,
          created_at,
          bookshelf_vocabularies(
            vocabulary_id,
            vocabularies(
              id,
              name,
              description,
              language,
              created_at
            )
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const shelves: Bookshelf[] = await Promise.all(
        (shelfData || []).map(async (shelf: any) => {
          const vocabIds = shelf.bookshelf_vocabularies.map((bv: any) => bv.vocabularies.id);
          
          // Count words for each vocabulary
          const vocabsWithCount = await Promise.all(
            shelf.bookshelf_vocabularies.map(async (bv: any) => {
              const { count } = await supabase
                .from("words")
                .select("id", { count: "exact" })
                .eq("vocabulary_id", bv.vocabularies.id);
              
              return {
                ...bv.vocabularies,
                words_count: count || 0,
              };
            })
          );

          return {
            id: shelf.id,
            name: shelf.name,
            description: shelf.description,
            created_at: shelf.created_at,
            vocabularies: vocabsWithCount,
            isExpanded: false,
          };
        })
      );

      setBookshelves(shelves);
    } catch (error) {
      console.error("Error loading bookshelves:", error);
    }
  };

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
      if (user) loadBookshelves();
    } catch (error) {
      console.error("Error deleting vocabulary:", error);
      toast.error("단어장 삭제에 실패했습니다.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      if (user) {
        const { error } = await supabase
          .from("vocabularies")
          .delete()
          .in("id", selectedIds);

        if (error) throw error;
      } else {
        const { localStorageService } = await import("@/services/localStorageService");
        selectedIds.forEach(id => localStorageService.deleteVocabulary(id));
      }

      toast.success(`${selectedIds.length}개의 단어장이 삭제되었습니다.`);
      setSelectedIds([]);
      setIsSelectionMode(false);
      loadVocabularies();
      if (user) loadBookshelves();
    } catch (error) {
      console.error("Error bulk deleting:", error);
      toast.error("단어장 삭제에 실패했습니다.");
    }
  };

  const handleExportToExcel = async (vocabId: string) => {
    try {
      let words: any[] = [];
      
      if (user) {
        const { data, error } = await supabase
          .from("words")
          .select("word, meaning, example, part_of_speech, note")
          .eq("vocabulary_id", vocabId)
          .order("order_index");

        if (error) throw error;
        words = data || [];
      } else {
        const { localStorageService } = await import("@/services/localStorageService");
        words = localStorageService.getWordsByVocabulary(vocabId);
      }

      const vocab = vocabularies.find(v => v.id === vocabId);
      const exportData = words.map(w => ({
        "단어": w.word,
        "뜻": w.meaning,
        "예문": w.example || "",
        "품사": w.part_of_speech || "",
        "메모": w.note || "",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "단어장");
      XLSX.writeFile(wb, `${vocab?.name || "단어장"}.xlsx`);
      
      toast.success("Excel 파일로 내보내기가 완료되었습니다.");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("내보내기에 실패했습니다.");
    }
  };

  const createBookshelf = async () => {
    if (!newBookshelfName.trim()) {
      toast.error("책장 이름을 입력해주세요.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("bookshelves")
        .insert({
          user_id: user?.id,
          name: newBookshelfName.trim(),
          description: newBookshelfDesc.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("책장이 생성되었습니다.");
      setNewBookshelfName("");
      setNewBookshelfDesc("");
      setIsCreateDialogOpen(false);
      loadBookshelves();
    } catch (error) {
      console.error("Error creating bookshelf:", error);
      toast.error("책장 생성에 실패했습니다.");
    }
  };

  const addToBookshelf = async (vocabId: string, bookshelfId: string) => {
    try {
      const { error } = await supabase
        .from("bookshelf_vocabularies")
        .insert({
          bookshelf_id: bookshelfId,
          vocabulary_id: vocabId,
        });

      if (error) throw error;

      toast.success("책장에 추가되었습니다.");
      loadBookshelves();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("이미 해당 책장에 추가된 단어장입니다.");
      } else {
        console.error("Error adding to bookshelf:", error);
        toast.error("책장에 추가하는데 실패했습니다.");
      }
    }
  };

  const removeFromBookshelf = async (vocabId: string, bookshelfId: string) => {
    try {
      const { error } = await supabase
        .from("bookshelf_vocabularies")
        .delete()
        .eq("bookshelf_id", bookshelfId)
        .eq("vocabulary_id", vocabId);

      if (error) throw error;

      toast.success("책장에서 제거되었습니다.");
      loadBookshelves();
    } catch (error) {
      console.error("Error removing from bookshelf:", error);
      toast.error("제거하는데 실패했습니다.");
    }
  };

  const toggleBookshelf = (id: string) => {
    setBookshelves(prev => prev.map(shelf => 
      shelf.id === id ? { ...shelf, isExpanded: !shelf.isExpanded } : shelf
    ));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const startMultiQuiz = () => {
    if (selectedIds.length === 0) {
      toast.error("최소 1개 이상의 단어장을 선택해주세요.");
      return;
    }
    navigate(`/quiz/multi?ids=${selectedIds.join(",")}`);
  };

  if (loading || loadingVocabs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  // Filter out vocabularies that are in bookshelves
  const vocabsInBookshelves = new Set(
    bookshelves.flatMap(shelf => shelf.vocabularies.map(v => v.id))
  );
  const unorganizedVocabs = vocabularies.filter(v => !vocabsInBookshelves.has(v.id));

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="내 단어장"
        action={
          <div className="flex gap-2">
            {isSelectionMode ? (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={selectedIds.length === 0}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      삭제 ({selectedIds.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>
                        선택한 {selectedIds.length}개의 단어장이 영구적으로 삭제됩니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive">
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" size="sm" onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedIds([]);
                }}>
                  취소
                </Button>
                <Button size="sm" onClick={startMultiQuiz} disabled={selectedIds.length === 0}>
                  통합 퀴즈 ({selectedIds.length})
                </Button>
              </>
            ) : (
              <>
                {user && (
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Library className="w-4 h-4 mr-1" />
                        책장
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>새 책장 만들기</DialogTitle>
                        <DialogDescription>
                          관련 단어장들을 묶어서 관리할 수 있습니다.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="shelf-name">책장 이름</Label>
                          <Input
                            id="shelf-name"
                            value={newBookshelfName}
                            onChange={(e) => setNewBookshelfName(e.target.value)}
                            placeholder="예: TOEIC 단어장"
                          />
                        </div>
                        <div>
                          <Label htmlFor="shelf-desc">설명 (선택)</Label>
                          <Textarea
                            id="shelf-desc"
                            value={newBookshelfDesc}
                            onChange={(e) => setNewBookshelfDesc(e.target.value)}
                            placeholder="책장에 대한 설명을 입력하세요"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={createBookshelf}>만들기</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                <Button variant="outline" size="sm" onClick={() => navigate("/vocabularies/public")}>
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsSelectionMode(true)}>
                  선택
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate("/vocabularies/word-list")}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      단어만 입력 (AI)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/vocabularies/new")}>
                      <PenLine className="w-4 h-4 mr-2" />
                      단어와 뜻 등등 입력
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/vocabularies/excel")}>
                      <FileText className="w-4 h-4 mr-2" />
                      엑셀/CSV 업로드
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
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
            <img 
              src={new URL('@/assets/junsuk-16.png', import.meta.url).href} 
              alt="Junsuk" 
              className="w-32 h-32 mx-auto mb-4"
            />
            <h2 className="text-xl font-semibold mb-2">아직 단어장이 없습니다</h2>
            <p className="text-muted-foreground mb-6">첫 단어장을 만들어보세요!</p>
            <Button onClick={() => navigate("/vocabularies/new")}>
              <Plus className="w-5 h-5 mr-2" />
              단어장 만들기
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Bookshelves */}
            {user && bookshelves.map((shelf) => (
              <div key={shelf.id} className="space-y-2">
                <Card 
                  className="cursor-pointer bg-gradient-to-r from-primary/10 to-accent/10 hover:shadow-md transition-all"
                  onClick={() => toggleBookshelf(shelf.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {shelf.isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-primary" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-primary" />
                      )}
                      <Library className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="font-bold">{shelf.name}</h3>
                        {shelf.description && (
                          <p className="text-sm text-muted-foreground">{shelf.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {shelf.vocabularies.length}개
                    </span>
                  </CardContent>
                </Card>

                {shelf.isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-6 space-y-2"
                  >
                    {shelf.vocabularies.map((vocab) => (
                      <Card
                        key={vocab.id}
                        className={`cursor-pointer hover:shadow-lg transition-shadow ${
                          isSelectionMode && selectedIds.includes(vocab.id) ? "border-primary bg-primary/5" : ""
                        }`}
                        onClick={() => {
                          if (isSelectionMode) {
                            toggleSelection(vocab.id);
                          } else {
                            navigate(`/vocabularies/${vocab.id}`);
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            {isSelectionMode && (
                              <div 
                                className="mr-3 pt-1" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelection(vocab.id);
                                }}
                              >
                                <Checkbox
                                  checked={selectedIds.includes(vocab.id)}
                                  onCheckedChange={() => toggleSelection(vocab.id)}
                                />
                              </div>
                            )}
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
                            {!isSelectionMode && (
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportToExcel(vocab.id);
                                  }}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="text-destructive">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>책장에서 제거하시겠습니까?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        단어장은 삭제되지 않고 책장에서만 제거됩니다.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>취소</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeFromBookshelf(vocab.id, shelf.id);
                                        }}
                                      >
                                        제거
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}

            {/* Unorganized vocabularies */}
            {unorganizedVocabs.length > 0 && (
              <div className="space-y-4">
                {user && bookshelves.length > 0 && (
                  <h3 className="text-sm font-semibold text-muted-foreground px-1">
                    미분류 단어장
                  </h3>
                )}
                {unorganizedVocabs.map((vocab, index) => (
                  <motion.div
                    key={vocab.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={`cursor-pointer hover:shadow-lg transition-shadow ${
                        isSelectionMode && selectedIds.includes(vocab.id) ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => {
                        if (isSelectionMode) {
                          toggleSelection(vocab.id);
                        } else {
                          navigate(`/vocabularies/${vocab.id}`);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          {isSelectionMode && (
                            <div 
                              className="mr-3 pt-1" 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelection(vocab.id);
                              }}
                            >
                              <Checkbox
                                checked={selectedIds.includes(vocab.id)}
                                onCheckedChange={() => toggleSelection(vocab.id)}
                              />
                            </div>
                          )}
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
                          {!isSelectionMode && (
                            <div className="flex gap-2">
                              {user && bookshelves.length > 0 && (
                                <Dialog>
                                  <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon">
                                      <Library className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>책장에 추가</DialogTitle>
                                      <DialogDescription>
                                        단어장을 추가할 책장을 선택하세요.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-2">
                                      {bookshelves.map((shelf) => (
                                        <Button
                                          key={shelf.id}
                                          variant="outline"
                                          className="w-full justify-start"
                                          onClick={() => addToBookshelf(vocab.id, shelf.id)}
                                        >
                                          <Library className="w-4 h-4 mr-2" />
                                          {shelf.name}
                                        </Button>
                                      ))}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportToExcel(vocab.id);
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
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
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Vocabularies;
