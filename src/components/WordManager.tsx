import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Trash2, Upload, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadImageWithRetry, validateImageFile } from "@/utils/imageUpload";

interface WordManagerProps {
  word: any;
  onUpdate: () => void;
  onDelete: () => void;
  vocabularyId: string;
  aiAutoMeaning?: boolean;
}

export const WordManager = ({ word, onUpdate, onDelete, vocabularyId, aiAutoMeaning = false }: WordManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editedWord, setEditedWord] = useState(word);
  const [uploading, setUploading] = useState(false);
  const [fetchingMeaning, setFetchingMeaning] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAIMeaning = useCallback(async (wordText: string) => {
    if (!wordText.trim() || !aiAutoMeaning) return;
    
    setFetchingMeaning(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-word-meaning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ word: wordText.trim() }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setEditedWord((prev: any) => ({
          ...prev,
          meaning: data.meaning || prev.meaning,
          example: data.example || prev.example,
          part_of_speech: data.part_of_speech || prev.part_of_speech,
        }));
      }
    } catch (error) {
      console.error("Error fetching AI meaning:", error);
    } finally {
      setFetchingMeaning(false);
    }
  }, [aiAutoMeaning]);

  const handleWordChange = (value: string) => {
    setEditedWord({ ...editedWord, word: value });
    
    if (aiAutoMeaning && value.trim()) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        fetchAIMeaning(value);
      }, 600);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("words")
        .update({
          word: editedWord.word,
          meaning: editedWord.meaning,
          example: editedWord.example || null,
          note: editedWord.note || null,
          part_of_speech: editedWord.part_of_speech || null,
        })
        .eq("id", word.id);

      if (error) throw error;

      toast.success("단어가 수정되었습니다!");
      onUpdate();
    } catch (error) {
      console.error("Error updating word:", error);
      toast.error("단어 수정에 실패했습니다.");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateImageFile(file, 5)) return;

    try {
      setUploading(true);
      
      const fileName = `${Math.random()}.jpg`;
      const filePath = `${vocabularyId}/${fileName}`;

      const publicUrl = await uploadImageWithRetry('word-images', filePath, file, {
        compress: true,
        maxSize: 600,
      });

      if (!publicUrl) {
        setUploading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("words")
        .update({ image_url: publicUrl })
        .eq("id", word.id);

      if (updateError) throw updateError;

      setEditedWord({ ...editedWord, image_url: publicUrl });
      toast.success("이미지가 업로드되었습니다!");
      onUpdate();
    } catch (error) {
      console.error("Error updating word:", error);
      toast.error("단어 업데이트에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{word.word}</h3>
            <p className="text-muted-foreground">{word.meaning}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              더보기
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label>이미지</Label>
              <div className="flex gap-2">
                {editedWord.image_url && (
                  <img src={editedWord.image_url} alt={word.word} className="w-20 h-20 object-cover rounded" />
                )}
                <label className="flex-1">
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    {uploading ? "업로드 중..." : (
                      <>
                        <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">이미지 업로드</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                단어
                {aiAutoMeaning && (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI 자동입력
                  </span>
                )}
              </Label>
              <Input
                value={editedWord.word}
                onChange={(e) => handleWordChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                뜻
                {fetchingMeaning && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
              </Label>
              <Input
                value={editedWord.meaning}
                onChange={(e) => setEditedWord({ ...editedWord, meaning: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>예문 (선택)</Label>
              <Input
                value={editedWord.example || ""}
                onChange={(e) => setEditedWord({ ...editedWord, example: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>품사 (선택)</Label>
              <Input
                value={editedWord.part_of_speech || ""}
                onChange={(e) => setEditedWord({ ...editedWord, part_of_speech: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>메모 (선택)</Label>
              <Input
                value={editedWord.note || ""}
                onChange={(e) => setEditedWord({ ...editedWord, note: e.target.value })}
              />
            </div>

            <Button onClick={handleSave} className="w-full">
              저장
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
