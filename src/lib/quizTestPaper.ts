import { toast } from "sonner";
import { apiGenerateAIQuiz } from "@/services/api";
import { isLocalVocab, loadLocalWords } from "@/utils/localVocabHelper";
import { supabase } from "@/integrations/supabase/client";
import { AI_TEST_PAPER_STYLES, TEST_PAPER_STYLES } from "@/lib/quizTestPaperStyles";

export interface QuizTestPaperOptions {
  id?: string;
  chapterId: string | null;
  vocabularyName: string;
  chapterName: string;
  quizType: "multiple" | "writing" | "matching" | "random" | "ai" | "sentence";
  questionType: "word-to-meaning" | "meaning-to-word";
  choiceCount: number;
  questionCount: number | "";
  isRandomOrder: boolean;
  aiDifficulty: string;
  aiCustomRequest: string;
}

/** Fetches the selected words, builds the printable HTML, and opens the browser print dialog. */
export const exportQuizTestPaper = async ({
  id,
  chapterId,
  vocabularyName,
  chapterName,
  quizType,
  questionType,
  choiceCount,
  questionCount,
  isRandomOrder,
  aiDifficulty,
  aiCustomRequest,
}: QuizTestPaperOptions) => {
    try {
      let words: { id: string; word: string; meaning: string; part_of_speech: string | null }[] = [];

      if (isLocalVocab(id)) {
        const localWords = loadLocalWords(id!);
        words = localWords.map(w => ({
          id: w.id,
          word: w.word,
          meaning: w.meaning,
          part_of_speech: w.part_of_speech,
        }));
      } else {
        const query = supabase
          .from("words")
          .select("id, word, meaning, part_of_speech")
          .eq("vocabulary_id", id)
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true });

        if (chapterId) {
          query.eq("chapter_id", chapterId);
        }

        const { data, error } = await query;
        if (error) throw error;
        words = data || [];
      }

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
        let fnData: any;
        try {
          fnData = await apiGenerateAIQuiz(limitedWords, aiDifficulty, aiCustomRequest);
        } catch {
          toast.error("AI 문제 생성에 실패했습니다. 다시 시도해주세요.");
          return;
        }

        if (!fnData?.questions?.length) {
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
          <style>${AI_TEST_PAPER_STYLES}</style></head><body>
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
        const shouldRandomizeQuestions = isRandomOrder;
        let questionNumber = 1;
        const allAnswers: Array<{ num: number; answer: string }> = [];

        shuffledWords.forEach((word, index) => {
          const randomType = shouldRandomizeQuestions
            ? quizTypes[Math.floor(Math.random() * quizTypes.length)]
            : quizTypes[index % quizTypes.length];

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
            const question = shouldRandomizeQuestions
              ? (Math.random() > 0.5 ? word.word : word.meaning)
              : (index % 2 === 0 ? word.word : word.meaning);
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

        const matchingWords = shouldRandomizeQuestions
          ? shuffledWords.filter(() => Math.random() < 0.3).slice(0, 8)
          : shuffledWords.slice(0, Math.min(8, shuffledWords.length));
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
          <style>${TEST_PAPER_STYLES}</style>
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
