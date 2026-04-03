import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Brain, CheckSquare, Edit3, Grid3x3, Printer, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isLocalVocab, loadLocalWords, loadLocalVocabulary, getLocalSettings } from "@/utils/localVocabHelper";

const Quiz = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vocabularyName, setVocabularyName] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [wordCount, setWordCount] = useState(0);

  // Quiz settings
  const [quizType, setQuizType] = useState<"multiple" | "writing" | "matching" | "random" | "ai">("multiple");
  const [questionType, setQuestionType] = useState<"word-to-meaning" | "meaning-to-word">("meaning-to-word");
  const [choiceCount, setChoiceCount] = useState(4);
  const [questionCount, setQuestionCount] = useState<number | "">("");
  const [isRandomOrder, setIsRandomOrder] = useState(true);
  const [answerDelay, setAnswerDelay] = useState([2]);
  const [aiDifficulty, setAiDifficulty] = useState<string>("중");
  const [aiCustomRequest, setAiCustomRequest] = useState("");

  const chapterId = searchParams.get("chapter");

  useEffect(() => {
    if (id && user) {
      loadQuizData();
      loadUserSettings();
    }
  }, [id, user, chapterId]);

  const loadUserSettings = async () => {
    try {
      const { data } = await supabase
        .from("user_settings")
        .select("answer_reveal_delay")
        .eq("user_id", user?.id)
        .single();

      if (data && data.answer_reveal_delay) {
        setAnswerDelay([data.answer_reveal_delay]);
      }
    } catch (error) {
      console.error("Error loading user settings:", error);
    }
  };

  const loadQuizData = async () => {
    try {
      const { data: vocab } = await supabase
        .from("vocabularies")
        .select("name")
        .eq("id", id)
        .single();

      if (vocab) {
        setVocabularyName(vocab.name);
      }

      if (chapterId) {
        const { data: chapter } = await supabase
          .from("chapters")
          .select("name")
          .eq("id", chapterId)
          .single();

        if (chapter) {
          setChapterName(chapter.name);
        }
      }

      const query = supabase
        .from("words")
        .select("id", { count: "exact" })
        .eq("vocabulary_id", id);

      if (chapterId) {
        query.eq("chapter_id", chapterId);
      }

      const { count } = await query;
      setWordCount(count || 0);
    } catch (error) {
      console.error("Error loading quiz data:", error);
      toast.error("퀴즈 데이터를 불러오는데 실패했습니다.");
    }
  };

  const exportToTestPaper = async () => {
    try {
      const query = supabase
        .from("words")
        .select("id, word, meaning, part_of_speech")
        .eq("vocabulary_id", id);

      if (chapterId) {
        query.eq("chapter_id", chapterId);
      }

      const { data: words, error } = await query;

      if (error) throw error;
      if (!words || words.length === 0) {
        toast.error("단어가 없습니다.");
        return;
      }

      // Shuffle words if random order is enabled
      let shuffledWords = isRandomOrder 
        ? [...words].sort(() => Math.random() - 0.5)
        : [...words];

      // Apply question count limit
      const effectiveCount = questionCount !== "" && questionCount > 0 && questionCount < shuffledWords.length
        ? questionCount
        : shuffledWords.length;
      shuffledWords = shuffledWords.slice(0, effectiveCount);

      let questionsHtml = "";
      let answersHtml = "";

      if (quizType === "ai") {
        // AI quiz export: call edge function to generate questions
        toast.info("AI가 시험 문제를 생성하고 있습니다... 잠시만 기다려주세요.");
        
        const limitedWords = shuffledWords.slice(0, 20);
        const { data: fnData, error: fnError } = await supabase.functions.invoke("generate-ai-quiz", {
          body: { words: limitedWords, difficulty: aiDifficulty, customRequest: aiCustomRequest },
        });

        if (fnError || fnData?.error || !fnData?.questions?.length) {
          toast.error("AI 문제 생성에 실패했습니다. 다시 시도해주세요.");
          return;
        }

        const aiQuestions = fnData.questions;
        const getTypeLabel = (type: string) => {
          switch (type) {
            case "fill_blank": return "빈칸 채우기";
            case "best_fit": return "적합한 단어";
            case "synonym_trap": return "유의어 함정";
            case "context_meaning": return "문맥 의미";
            default: return "객관식";
          }
        };

        questionsHtml = aiQuestions.map((q: any, i: number) => `
          <div class="question">
            <div class="q-meta">
              <span class="question-number">${i + 1}.</span>
              <span class="q-type">[${getTypeLabel(q.type)}]</span>
            </div>
            <div class="question-content">${q.question}</div>
            <div class="choices">
              ${q.choices.map((c: string, ci: number) => `
                <div class="choice">
                  <span class="choice-marker">${["①", "②", "③", "④"][ci]}</span> ${c}
                </div>
              `).join("")}
            </div>
          </div>
        `).join("");

        answersHtml = `
          <div class="answer-grid">
            ${aiQuestions.map((q: any, i: number) => `
              <div class="answer-item">
                <span class="answer-number">${i + 1}.</span>
                <span>${q.choices[q.correctIndex]}</span>
              </div>
            `).join("")}
          </div>
          <div class="page-break"></div>
          <div class="explanation-section">
            <h2>📝 해설지</h2>
            ${aiQuestions.map((q: any, i: number) => `
              <div class="explanation-item">
                <strong>${i + 1}.</strong> ${q.question.substring(0, 80)}${q.question.length > 80 ? '...' : ''}
                <div class="exp-answer">정답: ${q.choices[q.correctIndex]}</div>
                <div class="exp-text">${q.explanation}</div>
              </div>
            `).join("")}
          </div>
        `;

        const difficultyLabel = { "하": "하 (쉬움)", "중": "중 (보통)", "상": "상 (어려움)", "극상": "극상 (원어민 수준)" }[aiDifficulty] || aiDifficulty;

        const html = `
          <!DOCTYPE html><html><head><meta charset="UTF-8"><title>${vocabularyName} AI 시험지</title>
          <style>
            @media print { @page { margin: 2cm; } body { margin: 0; } .page-break { page-break-before: always; } }
            body { font-family: 'Malgun Gothic', sans-serif; max-width: 21cm; margin: 0 auto; padding: 20px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 15px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header .info { margin-top: 10px; font-size: 14px; color: #666; }
            .question { margin-bottom: 25px; padding: 10px 0; border-bottom: 1px dashed #ddd; }
            .q-meta { margin-bottom: 6px; }
            .question-number { font-weight: bold; display: inline-block; min-width: 30px; }
            .q-type { font-size: 11px; background: #eee; padding: 2px 6px; border-radius: 4px; margin-left: 4px; }
            .question-content { font-size: 16px; margin-bottom: 10px; }
            .choices { margin-left: 30px; }
            .choice { margin: 8px 0; font-size: 15px; }
            .choice-marker { display: inline-block; min-width: 30px; font-weight: bold; }
            .answer-section { margin-top: 40px; }
            .answer-section h2, .explanation-section h2 { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
            .answer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
            .answer-item { padding: 8px; background: #f5f5f5; border-radius: 4px; }
            .answer-number { font-weight: bold; margin-right: 8px; }
            .explanation-item { margin-bottom: 14px; padding: 10px; background: #fafafa; border-radius: 6px; border-left: 3px solid #3498db; }
            .exp-answer { font-size: 13px; color: #27ae60; font-weight: bold; margin: 4px 0; }
            .exp-text { font-size: 13px; color: #555; }
          </style></head><body>
          <div class="header">
            <h1>${vocabularyName} AI 시험지</h1>
            <div class="info">${chapterName ? chapterName + " • " : ""}AI 출제 (${difficultyLabel}) • 총 ${aiQuestions.length}문제</div>
          </div>
          <div class="questions">${questionsHtml}</div>
          <div class="page-break"></div>
          <div class="answer-section"><h2>정답</h2>${answersHtml}</div>
          </body></html>
        `;

        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 250);
        }
        toast.success("AI 시험지가 생성되었습니다!");
        return;
      }

      // For random type, mix all quiz types
      if (quizType === "random") {
        const quizTypes = ["multiple-word-to-meaning", "multiple-meaning-to-word", "writing", "matching"];
        let questionNumber = 1;
        const allAnswers: Array<{ num: number; answer: string }> = [];

        shuffledWords.forEach((word, index) => {
          const randomType = quizTypes[Math.floor(Math.random() * quizTypes.length)];
          
          if (randomType === "multiple-word-to-meaning" || randomType === "multiple-meaning-to-word") {
            const wrongChoices = shuffledWords
              .filter(w => w.word !== word.word)
              .sort(() => Math.random() - 0.5)
              .slice(0, choiceCount - 1);
            
            const isWordToMeaning = randomType === "multiple-word-to-meaning";
            const correctAnswer = isWordToMeaning ? word.meaning : word.word;
            const question = isWordToMeaning ? word.word : word.meaning;
            const allChoices = [...wrongChoices.map(w => 
              isWordToMeaning ? w.meaning : w.word
            ), correctAnswer].sort(() => Math.random() - 0.5);

            questionsHtml += `
              <div class="question">
                <div class="question-number">${questionNumber}.</div>
                <div class="question-content">
                  ${question}
                  ${word.part_of_speech ? `<span class="pos">(${word.part_of_speech})</span>` : ""}
                </div>
                <div class="choices">
                  ${allChoices.map((choice, i) => `
                    <div class="choice">
                      <span class="choice-marker">${["①", "②", "③", "④", "⑤", "⑥"][i]}</span> ${choice}
                    </div>
                  `).join("")}
                </div>
              </div>
            `;
            allAnswers.push({ num: questionNumber, answer: correctAnswer });
            questionNumber++;
          } else if (randomType === "writing") {
            const question = Math.random() > 0.5 ? word.word : word.meaning;
            const answer = question === word.word ? word.meaning : word.word;
            
            questionsHtml += `
              <div class="question">
                <span class="question-number">${questionNumber}.</span>
                <span class="question-content">
                  ${question}
                  ${word.part_of_speech ? `<span class="pos">(${word.part_of_speech})</span>` : ""}
                </span>
                <span class="answer-blank"></span>
              </div>
            `;
            allAnswers.push({ num: questionNumber, answer });
            questionNumber++;
          }
        });

        const matchingWords = shuffledWords.filter(() => Math.random() < 0.3).slice(0, 8);
        if (matchingWords.length >= 6) {
          const groupSize = Math.min(matchingWords.length, 8);
          const matchingGroup = matchingWords.slice(0, groupSize);
          const leftSide = matchingGroup.map(w => w.word);
          const rightSide = [...matchingGroup].sort(() => Math.random() - 0.5).map(w => w.meaning);

          questionsHtml += `
            <div class="matching-container">
              <div class="matching-column">
                <h3>단어</h3>
                ${leftSide.map((word, i) => `
                  <div class="matching-item">
                    <span class="matching-number">${questionNumber + i}.</span>
                    <span>${word}</span>
                    <span class="matching-blank">( )</span>
                  </div>
                `).join("")}
              </div>
              <div class="matching-column">
                <h3>뜻</h3>
                ${rightSide.map((meaning, i) => `
                  <div class="matching-item">
                    <span class="matching-letter">${String.fromCharCode(65 + i)}.</span>
                    <span>${meaning}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          `;

          matchingGroup.forEach((word, i) => {
            const meaningIndex = rightSide.findIndex(m => m === word.meaning);
            const letter = String.fromCharCode(65 + meaningIndex);
            allAnswers.push({ num: questionNumber + i, answer: letter });
          });
          questionNumber += groupSize;
        }

        answersHtml = `
          <div class="answer-grid">
            ${allAnswers.map(({ num, answer }) => `
              <div class="answer-item">
                <span class="answer-number">${num}.</span>
                <span>${answer}</span>
              </div>
            `).join("")}
          </div>
        `;

      } else if (quizType === "multiple") {
        questionsHtml = shuffledWords.map((word, index) => {
          const wrongChoices = shuffledWords
            .filter(w => w.word !== word.word)
            .sort(() => Math.random() - 0.5)
            .slice(0, choiceCount - 1);
          
          const correctAnswer = questionType === "word-to-meaning" ? word.meaning : word.word;
          const allChoices = [...wrongChoices.map(w => 
            questionType === "word-to-meaning" ? w.meaning : w.word
          ), correctAnswer].sort(() => Math.random() - 0.5);

          const question = questionType === "word-to-meaning" ? word.word : word.meaning;

          return `
            <div class="question">
              <div class="question-number">${index + 1}.</div>
              <div class="question-content">
                ${question}
                ${word.part_of_speech ? `<span class="pos">(${word.part_of_speech})</span>` : ""}
              </div>
              <div class="choices">
                ${allChoices.map((choice, i) => `
                  <div class="choice">
                    <span class="choice-marker">${["①", "②", "③", "④", "⑤", "⑥"][i]}</span> ${choice}
                  </div>
                `).join("")}
              </div>
            </div>
          `;
        }).join("");

        answersHtml = `
          <div class="answer-grid">
            ${shuffledWords.map((word, index) => {
              const answer = questionType === "word-to-meaning" ? word.meaning : word.word;
              return `
                <div class="answer-item">
                  <span class="answer-number">${index + 1}.</span>
                  <span>${answer}</span>
                </div>
              `;
            }).join("")}
          </div>
        `;

      } else if (quizType === "writing") {
        questionsHtml = shuffledWords.map((word, index) => {
          const question = questionType === "word-to-meaning" ? word.word : word.meaning;
          return `
            <div class="question">
              <span class="question-number">${index + 1}.</span>
              <span class="question-content">
                ${question}
                ${word.part_of_speech ? `<span class="pos">(${word.part_of_speech})</span>` : ""}
              </span>
              <span class="answer-blank"></span>
            </div>
          `;
        }).join("");

        answersHtml = `
          <div class="answer-grid">
            ${shuffledWords.map((word, index) => {
              const answer = questionType === "word-to-meaning" ? word.meaning : word.word;
              return `
                <div class="answer-item">
                  <span class="answer-number">${index + 1}.</span>
                  <span>${answer}</span>
                </div>
              `;
            }).join("")}
          </div>
        `;

      } else if (quizType === "matching") {
        const groupSize = 6;
        const totalGroups = Math.ceil(shuffledWords.length / groupSize);
        let questionNumber = 1;
        const allAnswers: Array<{ num: number; answer: string }> = [];

        for (let groupIndex = 0; groupIndex < totalGroups; groupIndex++) {
          const startIdx = groupIndex * groupSize;
          const endIdx = Math.min(startIdx + groupSize, shuffledWords.length);
          const groupWords = shuffledWords.slice(startIdx, endIdx);
          
          const leftSide = groupWords.map(w => w.word);
          const rightSide = [...groupWords].sort(() => Math.random() - 0.5).map(w => w.meaning);

          questionsHtml += `
            ${groupIndex > 0 ? '<div class="page-break"></div>' : ''}
            <div class="matching-container">
              <div class="matching-column">
                <h3>단어</h3>
                ${leftSide.map((word, i) => `
                  <div class="matching-item">
                    <span class="matching-number">${questionNumber + i}.</span>
                    <span>${word}</span>
                    <span class="matching-blank">( )</span>
                  </div>
                `).join("")}
              </div>
              <div class="matching-column">
                <h3>뜻</h3>
                ${rightSide.map((meaning, i) => `
                  <div class="matching-item">
                    <span class="matching-letter">${String.fromCharCode(65 + i)}.</span>
                    <span>${meaning}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          `;

          groupWords.forEach((word, i) => {
            const meaningIndex = rightSide.findIndex(m => m === word.meaning);
            const letter = String.fromCharCode(65 + meaningIndex);
            allAnswers.push({ num: questionNumber + i, answer: letter });
          });
          
          questionNumber += groupWords.length;
        }

        answersHtml = `
          <div class="answer-grid">
            ${allAnswers.map(({ num, answer }) => `
              <div class="answer-item">
                <span class="answer-number">${num}.</span>
                <span>${answer}</span>
              </div>
            `).join("")}
          </div>
        `;
      }

      const quizTypeLabel = 
        quizType === "random" ? "모든 유형 섞기" :
        quizType === "multiple" ? "객관식" :
        quizType === "writing" ? "주관식" :
        "단어 짝짓기";

      const questionTypeLabel = 
        questionType === "word-to-meaning" ? "단어 → 뜻" : "뜻 → 단어";

      // Generate test paper HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${vocabularyName} 시험지</title>
          <style>
            @media print {
              @page { margin: 2cm; }
              body { margin: 0; }
              .page-break { page-break-before: always; }
            }
            body {
              font-family: 'Malgun Gothic', sans-serif;
              max-width: 21cm;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #333;
              padding-bottom: 15px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .header .info {
              margin-top: 10px;
              font-size: 14px;
              color: #666;
            }
            .question {
              margin-bottom: 25px;
              padding: 10px 0;
              border-bottom: 1px dashed #ddd;
            }
            .question-number {
              font-weight: bold;
              display: inline-block;
              min-width: 40px;
            }
            .question-content {
              display: inline;
              font-size: 16px;
            }
            .choices {
              margin-top: 10px;
              margin-left: 40px;
            }
            .choice {
              margin: 8px 0;
              font-size: 15px;
            }
            .choice-marker {
              display: inline-block;
              min-width: 30px;
              font-weight: bold;
            }
            .answer-blank {
              border-bottom: 1px solid #333;
              display: inline-block;
              min-width: 200px;
              margin-left: 10px;
            }
            .matching-container {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin: 20px 0;
            }
            .matching-column h3 {
              text-align: center;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #333;
            }
            .matching-item {
              margin: 12px 0;
              padding: 8px;
              background: #f9f9f9;
              border-radius: 4px;
            }
            .matching-number, .matching-letter {
              font-weight: bold;
              display: inline-block;
              min-width: 30px;
            }
            .matching-blank {
              margin-left: 10px;
              font-weight: bold;
            }
            .answer-section {
              margin-top: 40px;
            }
            .answer-section h2 {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 10px;
              border-bottom: 2px solid #333;
            }
            .answer-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
            }
            .answer-item {
              padding: 8px;
              background: #f5f5f5;
              border-radius: 4px;
            }
            .answer-number {
              font-weight: bold;
              margin-right: 8px;
            }
            .pos {
              color: #666;
              font-size: 12px;
              margin-left: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${vocabularyName} 시험지</h1>
            <div class="info">
              ${chapterName ? chapterName + " • " : ""}${quizTypeLabel}${quizType === "multiple" ? " (" + questionTypeLabel + ")" : ""} • 총 ${shuffledWords.length}문제
            </div>
          </div>

          <div class="questions">
            ${questionsHtml}
          </div>

          <div class="page-break"></div>

          <div class="answer-section">
            <h2>정답</h2>
            ${answersHtml}
          </div>
        </body>
        </html>
      `;

      // Open in new window and trigger print
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }

      toast.success("시험지가 생성되었습니다!");
    } catch (error) {
      console.error("Error exporting test paper:", error);
      toast.error("시험지 생성에 실패했습니다.");
    }
  };

  const startQuiz = () => {
    const params = new URLSearchParams({
      random: isRandomOrder.toString(),
      delay: answerDelay[0].toString(),
    });

    if (chapterId) {
      params.append("chapter", chapterId);
    }

    if (questionCount !== "" && questionCount < wordCount) {
      params.append("count", questionCount.toString());
    }

    if (quizType === "ai") {
      params.append("difficulty", aiDifficulty);
      if (aiCustomRequest.trim()) {
        params.append("customRequest", aiCustomRequest.trim());
      }
      navigate(`/quiz/${id}/ai?${params.toString()}`);
      return;
    }

    if (quizType === "random") {
      params.append("choices", choiceCount.toString());
      navigate(`/quiz/${id}/random?${params.toString()}`);
    
    } else if (quizType === "multiple") {
      params.append("type", questionType);
      params.append("choices", choiceCount.toString());
      navigate(`/quiz/${id}/multiple?${params.toString()}`);
    } else if (quizType === "writing") {
      params.append("type", questionType);
      navigate(`/quiz/${id}/writing?${params.toString()}`);
    } else if (quizType === "matching") {
      navigate(`/quiz/${id}/matching?${params.toString()}`);
    }
  };

  const quizOptions = [
    {
      type: "multiple",
      icon: CheckSquare,
      title: "객관식",
      description: "보기 중에서 정답 선택하기",
    },
    {
      type: "writing",
      icon: Edit3,
      title: "주관식",
      description: "단어 직접 입력하기",
    },
    {
      type: "matching",
      icon: Grid3x3,
      title: "단어 짝짓기",
      description: "단어와 뜻 연결하기",
    },
    {
      type: "random",
      icon: Brain,
      title: "모든 유형 랜덤풀기",
      description: "여러 유형을 랜덤하게 풀기",
    },
    {
      type: "ai",
      icon: Sparkles,
      title: "AI로 출제",
      description: "AI가 다양한 유형의 문제를 만들어줘요",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title={chapterName ? `${chapterName} 퀴즈` : "퀴즈"} 
        showBack
        onBack={() => navigate(`/vocabularies/${id}`)}
      />
      
      {/* Junsuk study encouragement */}
      <div className="max-w-screen-xl mx-auto px-4 pt-4">
        <div className="bg-gradient-card rounded-lg p-4 mb-4 flex items-center gap-4">
          <img 
            src={new URL('@/assets/junsuk-26-2.png', import.meta.url).href} 
            alt="Junsuk studying hard" 
            className="w-16 h-16"
          />
          <div>
            <p className="font-semibold text-sm">열심히 공부해봐요!</p>
            <p className="text-xs text-muted-foreground">퀴즈 설정을 선택하고 시작해보세요</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              {vocabularyName}
            </CardTitle>
            <CardDescription>
              {chapterName || "전체"} • {wordCount}개 단어
            </CardDescription>
          </CardHeader>
        </Card>

        <div>
          <h3 className="text-sm font-semibold mb-3">퀴즈 유형</h3>
          <div className="grid grid-cols-1 gap-3">
            {quizOptions.map((option) => (
              <Card
                key={option.type}
                className={`cursor-pointer transition-all ${
                  quizType === option.type
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setQuizType(option.type as any)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${
                    quizType === option.type ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <option.icon className={`w-6 h-6 ${
                      quizType === option.type ? "text-primary" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{option.title}</h4>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {quizType === "multiple" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">객관식 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>문제 유형</Label>
                <Select value={questionType} onValueChange={(v: any) => setQuestionType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meaning-to-word">뜻 → 단어</SelectItem>
                    <SelectItem value="word-to-meaning">단어 → 뜻</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>보기 개수: {choiceCount}개</Label>
                <Slider
                  value={[choiceCount]}
                  onValueChange={(v) => setChoiceCount(v[0])}
                  min={3}
                  max={6}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {quizType === "writing" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">주관식 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>문제 유형</Label>
              <Select value={questionType} onValueChange={(v: any) => setQuestionType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meaning-to-word">뜻 → 단어</SelectItem>
                  <SelectItem value="word-to-meaning">단어 → 뜻</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {quizType === "ai" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI 출제 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>난이도</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: "하", label: "하", color: "bg-green-100 text-green-700 border-green-300" },
                    { value: "중", label: "중", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
                    { value: "상", label: "상", color: "bg-orange-100 text-orange-700 border-orange-300" },
                    { value: "극상", label: "극상", color: "bg-red-100 text-red-700 border-red-300" },
                  ].map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setAiDifficulty(d.value)}
                      className={`py-2 px-3 rounded-lg border-2 text-sm font-bold transition-all ${
                        aiDifficulty === d.value
                          ? `${d.color} border-current scale-105 shadow-md`
                          : "bg-muted text-muted-foreground border-transparent hover:border-muted-foreground/30"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                {aiDifficulty === "극상" && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    ⚠️ 원어민도 틀릴 수 있는 극한 난이도입니다!
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>요청사항 (선택)</Label>
                <Textarea
                  value={aiCustomRequest}
                  onChange={(e) => setAiCustomRequest(e.target.value)}
                  placeholder="예: 의학 관련 문맥으로 출제해줘, 빈칸 채우기 위주로 해줘..."
                  className="resize-none"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">AI가 문제 생성 시 참고합니다.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">공통 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>문항 수 (전체: {wordCount}문항)</Label>
              <Input
                type="number"
                min={1}
                max={wordCount}
                placeholder={`${wordCount}`}
                value={questionCount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setQuestionCount("");
                  } else {
                    const num = parseInt(val);
                    if (!isNaN(num) && num > 0) {
                      setQuestionCount(Math.min(num, wordCount));
                    }
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">비워두면 전체 단어로 진행됩니다</p>
            </div>

            <div className="flex items-center justify-between">
              <Label>랜덤 순서</Label>
              <Switch checked={isRandomOrder} onCheckedChange={setIsRandomOrder} />
            </div>

            {quizType !== "matching" && (
              <div className="space-y-2">
                <Label>답 표시 후 대기 시간: {answerDelay[0]}초</Label>
                <Slider
                  value={answerDelay}
                  onValueChange={setAnswerDelay}
                  min={1.5}
                  max={3}
                  step={0.5}
                  className="w-full"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button
            onClick={startQuiz}
            className="w-full"
            size="lg"
            disabled={wordCount === 0}
          >
            퀴즈 시작하기
          </Button>

          <Button
            onClick={exportToTestPaper}
            variant="outline"
            className="w-full"
            size="lg"
            disabled={wordCount === 0}
          >
            <Printer className="w-5 h-5 mr-2" />
            시험지로 내보내기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
