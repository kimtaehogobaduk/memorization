import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

const ExcelUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [vocabularyName, setVocabularyName] = useState("");
  const [loading, setLoading] = useState(false);

  const downloadTemplate = () => {
    // CSV template content
    const template = "단어,뜻,예문,품사,메모\nword,meaning,example,part of speech,note\nhello,안녕,Hello world!,noun,인사말";
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "단어장_템플릿.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("템플릿이 다운로드되었습니다!");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file extension
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        setFile(selectedFile);
      } else {
        toast.error("CSV 또는 Excel 파일만 업로드 가능합니다.");
      }
    }
  };

  const parseCSV = (text: string): any[] => {
    // Remove NULL bytes that cause PostgreSQL errors
    const cleanText = text.replace(/\u0000/g, '');
    
    const lines = cleanText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const words = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values[0] && values[1]) { // At least word and meaning required
        words.push({
          word: values[0],
          meaning: values[1],
          example: values[2] || null,
          part_of_speech: values[3] || null,
          note: values[4] || null,
        });
      }
    }

    return words;
  };

  const parseExcel = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          console.log("[ExcelUpload] Parsed Excel data:", jsonData);

          const words = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row[0] && row[1]) { // At least word and meaning required
              words.push({
                word: String(row[0]).trim(),
                meaning: String(row[1]).trim(),
                example: row[2] ? String(row[2]).trim() : null,
                part_of_speech: row[3] ? String(row[3]).trim() : null,
                note: row[4] ? String(row[4]).trim() : null,
              });
            }
          }

          console.log("[ExcelUpload] Parsed words:", words);
          resolve(words);
        } catch (error) {
          console.error("[ExcelUpload] Error parsing Excel:", error);
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsBinaryString(file);
    });
  };

  const handleUpload = async () => {
    if (!file || !vocabularyName.trim()) {
      toast.error("단어장 이름과 파일을 모두 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      let words: any[] = [];
      const ext = file.name.split('.').pop()?.toLowerCase();

      console.log("[ExcelUpload] File type:", ext);

      if (ext === 'csv') {
        const text = await file.text();
        words = parseCSV(text);
      } else if (ext === 'xlsx' || ext === 'xls') {
        words = await parseExcel(file);
      }

      console.log("[ExcelUpload] Parsed words count:", words.length);

      if (words.length === 0) {
        toast.error("올바른 형식의 데이터가 없습니다. 템플릿을 확인해주세요.");
        setLoading(false);
        return;
      }

      if (user) {
        // Create vocabulary in Supabase
        const { data: vocabulary, error: vocabError } = await supabase
          .from("vocabularies")
          .insert({
            user_id: user.id,
            name: vocabularyName.trim(),
            language: "english",
          })
          .select()
          .single();

        if (vocabError) {
          console.error("[ExcelUpload] Vocabulary creation error:", vocabError);
          throw vocabError;
        }

        const wordsToInsert = words.map((w, index) => ({
          vocabulary_id: vocabulary.id,
          word: w.word,
          meaning: w.meaning,
          example: w.example,
          part_of_speech: w.part_of_speech,
          note: w.note,
          order_index: index,
        }));

        const { error: wordsError } = await supabase
          .from("words")
          .insert(wordsToInsert);

        if (wordsError) {
          console.error("[ExcelUpload] Words insertion error:", wordsError);
        throw wordsError;
      }

      toast.success(`단어장이 생성되었습니다! (${words.length}개 단어)`);
      navigate(`/vocabularies/${vocabulary.id}`);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("파일 업로드에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Excel로 단어장 만들기" showBack />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>템플릿 다운로드</CardTitle>
            <CardDescription>
              먼저 템플릿을 다운로드하여 단어를 입력하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadTemplate} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              템플릿 다운로드
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>파일 형식</CardTitle>
            <CardDescription>
              CSV 파일 형식: 단어, 뜻, 예문, 품사, 메모
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li>• 첫 번째 줄: 헤더 (단어,뜻,예문,품사,메모)</li>
              <li>• 두 번째 줄부터: 데이터</li>
              <li>• 단어와 뜻은 필수, 나머지는 선택</li>
              <li>• 쉼표(,)로 구분</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>파일 업로드</CardTitle>
            <CardDescription>
              작성한 파일을 업로드하여 단어장을 생성하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vocab-name">단어장 이름</Label>
              <Input
                id="vocab-name"
                value={vocabularyName}
                onChange={(e) => setVocabularyName(e.target.value)}
                placeholder="예: 토익 필수 단어"
              />
            </div>

            <div className="space-y-2">
              <Label>파일 선택</Label>
              <label className="block">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                  {file ? (
                    <div>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        다른 파일을 선택하려면 클릭하세요
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium">파일을 선택하세요</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        CSV 또는 Excel 파일 (.csv, .xlsx, .xls)
                      </p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || !vocabularyName.trim() || loading}
              className="w-full"
              size="lg"
            >
              {loading ? "업로드 중..." : "단어장 만들기"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExcelUpload;
