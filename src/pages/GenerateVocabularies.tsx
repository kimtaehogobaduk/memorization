import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiGenerateVocabularies } from "@/services/api";
import { motion } from "framer-motion";

const GenerateVocabularies = () => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const totalVocabularies = 100;
  const batchSize = 5; // Generate 5 at a time to avoid timeouts
  const totalBatches = Math.ceil(totalVocabularies / batchSize);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const generateBatch = async (startIndex: number) => {
    return await apiGenerateVocabularies(batchSize, startIndex);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setCurrentBatch(0);
    setLogs([]);
    addLog("단어장 생성을 시작합니다...");

    try {
      let totalProcessed = 0;

      for (let batch = 0; batch < totalBatches; batch++) {
        setCurrentBatch(batch + 1);
        const startIndex = batch * batchSize;
        addLog(`배치 ${batch + 1}/${totalBatches} 생성 중... (${startIndex + 1}-${Math.min(startIndex + batchSize, totalVocabularies)})`);
        console.log("[GenerateVocabularies] Starting batch", batch + 1, "startIndex", startIndex);

        const result = await generateBatch(startIndex);
        console.log("[GenerateVocabularies] Batch result", result);
        
        if (result?.success) {
          totalProcessed += result.processed ?? batchSize;
          addLog(`배치 ${batch + 1} 완료: ${result.processed}개 단어장 생성됨`);
        } else {
          addLog(`배치 ${batch + 1} 실패: ${result?.error || '알 수 없는 오류'}`);
        }

        const nextProgress = Math.min(100, (totalProcessed / totalVocabularies) * 100);
        console.log("[GenerateVocabularies] Progress", nextProgress);
        setProgress(nextProgress);

        // Add a small delay between batches to avoid rate limiting
        if (batch < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      addLog("모든 단어장 생성 완료!");
      toast.success(`${totalVocabularies}개의 단어장이 생성되었습니다!`);
    } catch (error) {
      console.error("Error generating vocabularies:", error);
      const message = error instanceof Error ? error.message : String(error);
      addLog(`오류 발생: ${message}`);
      toast.error("단어장 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <Header
        title="단어장 자동 생성"
        showBack
        onBack={() => navigate("/dashboard")}
      />

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="mb-6 bg-gradient-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold">AI 단어장 자동 생성</h2>
                  <p className="text-muted-foreground">
                    다양한 주제의 단어장 {totalVocabularies}개를 자동으로 생성합니다
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">생성될 단어장 정보:</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• 총 {totalVocabularies}개의 단어장</li>
                    <li>• 각 단어장당 100개의 단어</li>
                    <li>• TOEIC, TOEFL, 일상회화, 비즈니스, 여행 등 다양한 주제</li>
                    <li>• 모든 단어장은 공개 상태로 생성됩니다</li>
                  </ul>
                </div>

                {!isGenerating && progress === 0 && (
                  <Button 
                    onClick={handleGenerate} 
                    className="w-full"
                    size="lg"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    생성 시작
                  </Button>
                )}

                {isGenerating && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          진행 상황: 배치 {currentBatch}/{totalBatches}
                        </span>
                        <span className="text-sm font-medium">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-3" />
                    </div>

                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>생성 중...</span>
                    </div>
                  </div>
                )}

                {progress === 100 && !isGenerating && (
                  <Button 
                    onClick={() => navigate("/vocabularies/public")} 
                    className="w-full"
                    variant="outline"
                  >
                    공유 단어장 보기
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Logs */}
          {logs.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">생성 로그</h3>
                <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="space-y-1 font-mono text-xs">
                    {logs.map((log, index) => (
                      <div key={index} className="text-muted-foreground">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default GenerateVocabularies;
