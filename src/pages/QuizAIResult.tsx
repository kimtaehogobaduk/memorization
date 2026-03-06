import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Printer, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import junsuk30 from "@/assets/junsuk-30.png";
import junsuk01 from "@/assets/junsuk-01.png";
import junsuk27 from "@/assets/junsuk-27.png";
import junsuk04 from "@/assets/junsuk-04.png";
import junsuk13 from "@/assets/junsuk-13.png";
import junsuk15 from "@/assets/junsuk-15.png";

interface QuizResultItem {
  question: {
    id: string;
    wordId: string;
    type: string;
    question: string;
    choices: string[];
    correctIndex: number;
    explanation: string;
  };
  selectedIndex: number;
  isCorrect: boolean;
}

const QuizAIResult = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<QuizResultItem[]>([]);
  const [showExplanations, setShowExplanations] = useState(false);
  const [printWithExplanations, setPrintWithExplanations] = useState(false);

  const score = parseInt(searchParams.get("score") || "0");
  const total = parseInt(searchParams.get("total") || "0");
  const difficulty = searchParams.get("difficulty") || "중";
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  useEffect(() => {
    const stored = sessionStorage.getItem("aiQuizResults");
    if (stored) {
      try {
        setResults(JSON.parse(stored));
      } catch { /* ignore */ }
    }
  }, []);

  const getJunsukImage = () => {
    if (percentage === 100) return junsuk15;
    if (percentage >= 90) return junsuk30;
    if (percentage >= 70) return junsuk01;
    if (percentage >= 50) return junsuk27;
    if (percentage >= 30) return junsuk04;
    return junsuk13;
  };

  const getJunsukMessage = () => {
    if (percentage === 100) return "완벽해요! AI도 놀랐어요! 🌟";
    if (percentage >= 90) return "대단해요! 🎉";
    if (percentage >= 70) return "잘했어요! 👏";
    if (percentage >= 50) return "조금만 더 힘내요! 💪";
    if (percentage >= 30) return "다시 도전해봐요! 📚";
    return "천천히 복습해봐요! 🔄";
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "fill_blank": return "빈칸 채우기";
      case "best_fit": return "적합한 단어";
      case "synonym_trap": return "유의어 함정";
      case "context_meaning": return "문맥 의미";
      default: return "객관식";
    }
  };

  const handlePrint = () => {
    const incorrectResults = results.filter(r => !r.isCorrect);
    const correctResults = results.filter(r => r.isCorrect);

    const questionsHtml = results.map((r, i) => `
      <div class="question ${r.isCorrect ? 'correct' : 'incorrect'}">
        <div class="q-header">
          <span class="q-number">${i + 1}.</span>
          <span class="q-type">[${getTypeLabel(r.question.type)}]</span>
          <span class="q-result ${r.isCorrect ? 'result-correct' : 'result-incorrect'}">${r.isCorrect ? '✓' : '✗'}</span>
        </div>
        <div class="q-text">${r.question.question}</div>
        <div class="choices">
          ${r.question.choices.map((c, ci) => `
            <div class="choice ${ci === r.question.correctIndex ? 'choice-correct' : ''} ${ci === r.selectedIndex && !r.isCorrect ? 'choice-wrong' : ''}">
              <span class="choice-marker">${["①", "②", "③", "④"][ci]}</span> ${c}
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");

    const explanationsHtml = printWithExplanations ? `
      <div class="page-break"></div>
      <div class="explanations-section">
        <h2>📝 해설지</h2>
        ${results.map((r, i) => `
          <div class="explanation-item">
            <div class="exp-header">
              <strong>${i + 1}.</strong> ${r.question.question.substring(0, 60)}${r.question.question.length > 60 ? '...' : ''}
            </div>
            <div class="exp-answer">정답: ${r.question.choices[r.question.correctIndex]}</div>
            <div class="exp-text">${r.question.explanation}</div>
          </div>
        `).join("")}
      </div>
    ` : "";

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>AI 퀴즈 결과</title>
    <style>
      @media print { @page { margin: 2cm; } .page-break { page-break-before: always; } }
      body { font-family: 'Malgun Gothic', sans-serif; max-width: 21cm; margin: 0 auto; padding: 20px; line-height: 1.6; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 15px; }
      .header h1 { margin: 0; font-size: 22px; }
      .header .info { margin-top: 8px; font-size: 14px; color: #666; }
      .score-box { text-align: center; font-size: 28px; font-weight: bold; margin: 20px 0; padding: 15px; background: #f0f0f0; border-radius: 8px; }
      .question { margin-bottom: 20px; padding: 12px; border: 1px solid #ddd; border-radius: 6px; }
      .question.incorrect { border-left: 4px solid #e74c3c; }
      .question.correct { border-left: 4px solid #27ae60; }
      .q-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
      .q-number { font-weight: bold; font-size: 16px; }
      .q-type { font-size: 11px; background: #eee; padding: 2px 6px; border-radius: 4px; }
      .q-result { font-weight: bold; margin-left: auto; }
      .result-correct { color: #27ae60; }
      .result-incorrect { color: #e74c3c; }
      .q-text { font-size: 15px; margin-bottom: 10px; }
      .choices { margin-left: 20px; }
      .choice { margin: 4px 0; padding: 4px 8px; border-radius: 3px; }
      .choice-correct { background: #d4edda; font-weight: bold; }
      .choice-wrong { background: #f8d7da; text-decoration: line-through; }
      .choice-marker { font-weight: bold; display: inline-block; min-width: 24px; }
      .explanations-section h2 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
      .explanation-item { margin-bottom: 16px; padding: 10px; background: #fafafa; border-radius: 6px; border-left: 3px solid #3498db; }
      .exp-header { font-size: 14px; margin-bottom: 4px; }
      .exp-answer { font-size: 13px; color: #27ae60; font-weight: bold; margin-bottom: 4px; }
      .exp-text { font-size: 13px; color: #555; }
    </style></head><body>
    <div class="header">
      <h1>AI 퀴즈 결과</h1>
      <div class="info">난이도: ${difficulty} • 총 ${total}문제</div>
    </div>
    <div class="score-box">${score} / ${total} (${percentage}%)</div>
    ${questionsHtml}
    ${explanationsHtml}
    </body></html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 250);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="AI 퀴즈 결과" showBack onBack={() => navigate(`/vocabularies/${id}`)} />

      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* Score Card */}
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          <Card className="p-8 bg-gradient-junsuk border-2 border-junsuk-blue/30 shadow-junsuk">
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 180, damping: 12 }}
                className="w-40 h-40 mx-auto"
              >
                <img src={getJunsukImage()} alt="준섹이" className="w-full h-full object-contain drop-shadow-2xl" />
              </motion.div>

              <div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                  className="text-7xl font-extrabold text-junsuk-blue mb-2"
                >
                  {percentage}%
                </motion.div>
                <p className="text-sm text-muted-foreground mb-1">난이도: {difficulty}</p>
                <p className="text-2xl font-bold">{getJunsukMessage()}</p>
              </div>

              <div className="flex justify-center gap-8 text-base">
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-md">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span>정답: <span className="font-bold">{score}/{total}</span></span>
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-md">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span>오답: <span className="font-bold">{total - score}/{total}</span></span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Explanations Toggle */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <Label className="font-semibold">해설 보기</Label>
            </div>
            <Switch checked={showExplanations} onCheckedChange={setShowExplanations} />
          </div>
        </Card>

        {/* Results List */}
        {showExplanations && results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground px-1">문제별 해설 ({results.length}문제)</h3>
            {results.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className={cn("p-4", r.isCorrect ? "border-l-4 border-l-success" : "border-l-4 border-l-destructive")}>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      {r.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm">{i + 1}.</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{getTypeLabel(r.question.type)}</span>
                        </div>
                        <p className="text-sm font-medium">{r.question.question}</p>

                        <div className="mt-2 space-y-1">
                          {r.question.choices.map((c, ci) => (
                            <p key={ci} className={cn(
                              "text-xs px-2 py-1 rounded",
                              ci === r.question.correctIndex && "bg-success/10 text-success font-semibold",
                              ci === r.selectedIndex && !r.isCorrect && "bg-destructive/10 text-destructive line-through",
                            )}>
                              {String.fromCharCode(65 + ci)}. {c}
                            </p>
                          ))}
                        </div>

                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                          💡 {r.question.explanation}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Print Options */}
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">해설지도 같이 프린트하기</Label>
            <Switch checked={printWithExplanations} onCheckedChange={setPrintWithExplanations} />
          </div>
          <Button onClick={handlePrint} variant="outline" className="w-full" size="lg">
            <Printer className="w-5 h-5 mr-2" />
            결과 프린트하기
          </Button>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button onClick={() => navigate(`/quiz/${id}`)} className="w-full" size="lg">
            다시 도전하기
          </Button>
          <Button onClick={() => navigate(`/vocabularies/${id}`)} variant="outline" className="w-full" size="lg">
            단어장으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuizAIResult;
