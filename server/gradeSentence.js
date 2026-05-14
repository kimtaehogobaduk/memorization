export async function gradeSentenceHandler(req, res) {
  try {
    const { word, meaning, sentence } = req.body || {};
    if (!word || !sentence) {
      return res.json({ correct: false, reason: "단어와 문장이 필요합니다." });
    }
    const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
    if (!CEREBRAS_API_KEY) {
      return res.json({ correct: true, reason: "AI 채점을 사용할 수 없어 정답으로 처리합니다.", fallback: true });
    }

    const prompt = `당신은 영어 학습자를 위한 엄격하지만 공정한 영작 채점관입니다.

주어진 단어: "${word}"
${meaning ? `단어의 뜻: "${meaning}"` : ""}
사용자가 작성한 문장: "${sentence}"

기준:
1. 문장에 주어진 단어("${word}")가 사용되었는가? (활용형 허용)
2. 영어 문법이 올바른가?
3. 단어가 자연스럽게 쓰였는가?
4. 너무 짧거나 의미 없는 문장은 오답.

엄격하지만 공정하게. 작은 오타는 허용.

JSON 형식으로만 응답:
{"correct": true, "reason": "..."} 또는 {"correct": false, "reason": "..."}`;

    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${CEREBRAS_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1-8b",
        messages: [
          { role: "system", content: "당신은 영어 작문 채점 AI입니다. 반드시 JSON 객체로만 응답하세요." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("Cerebras grade-sentence error:", response.status);
      return res.json({ correct: true, reason: "AI 채점 실패. 정답 처리합니다.", fallback: true });
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || "";
    let parsed = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch {}
      }
    }
    res.json({
      correct: !!parsed.correct,
      reason: parsed.reason || (parsed.correct ? "잘 작성했습니다!" : "문장에 문제가 있습니다."),
    });
  } catch (error) {
    console.error("grade-sentence error:", error);
    res.json({ correct: true, reason: "오류 발생. 정답 처리합니다.", error: true });
  }
}
