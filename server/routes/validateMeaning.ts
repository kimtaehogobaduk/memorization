// AI-assisted meaning validation for writing quizzes.
import type { Request, Response } from "express";
import { CEREBRAS_API_KEY, GEMINI_API_KEY } from "../config";

export async function handleValidateMeaning(req: Request, res: Response) {
  try {
    const { word, userAnswer, correctMeaning } = req.body;
    if (!word || !userAnswer) return res.json({ valid: false });
    if (!CEREBRAS_API_KEY && !GEMINI_API_KEY) return res.json({ valid: false, fallback: true });

    const prompt = `You are a strict but fair vocabulary quiz grader for Korean learners studying English.

English word: "${word}"
Stored meaning (Korean): "${correctMeaning}"
User's answer (Korean): "${userAnswer}"

Judge if the user's answer is an acceptable Korean meaning for "${word}".

ACCEPT if:
- The answer is a recognized Korean translation of this English word
- The answer is a close synonym of the stored meaning (e.g. "빠른" for "신속한")
- The answer captures the same core concept, even with slightly different wording
- Minor particle or conjugation differences are OK

REJECT if:
- The answer is vague, overly broad, or too general
- The answer refers to a different concept
- The answer is too short or meaningless

Respond with ONLY: {"valid": true} or {"valid": false}`;

    if (CEREBRAS_API_KEY) {
      const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${CEREBRAS_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-oss-120b",
          messages: [
            { role: "system", content: "You are a quiz grading assistant. Respond ONLY with a JSON object. No extra text." },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 100,
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const content = payload?.choices?.[0]?.message?.content || "";
        const match = content.match(/"valid"\s*:\s*(true|false)/);
        const valid = match ? match[1] === "true" : false;
        return res.json({ valid });
      }
    }

    if (GEMINI_API_KEY) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const content = payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const match = content.match(/"valid"\s*:\s*(true|false)/);
        const valid = match ? match[1] === "true" : false;
        return res.json({ valid });
      }
    }

    return res.json({ valid: false, fallback: true });
  } catch (error) {
    console.error("validate-meaning error:", error);
    res.json({ valid: false, error: true });
  }
}
