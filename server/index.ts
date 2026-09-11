import cors from "cors";
import express from "express";
import path from "path";
import { PORT } from "./config";
import { handleDeleteUser, handleGetAdminUsers } from "./routes/admin";
import { handleExtractVocabulary } from "./routes/extractVocabulary";
import { handleGenerateAiQuiz } from "./routes/generateAiQuiz";
import { handleGenerateVocabularies } from "./routes/generateVocabularies";
import { handleGetWordMeaning } from "./routes/wordMeaning";
import { handleGradeSentence } from "./routes/gradeSentence";
import { handleValidateMeaning } from "./routes/validateMeaning";

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // API routes FIRST
  app.post("/api/get-word-meaning", handleGetWordMeaning);
  app.post("/api/validate-meaning", handleValidateMeaning);
  app.post("/api/grade-sentence", handleGradeSentence);
  app.post("/api/generate-ai-quiz", handleGenerateAiQuiz);
  app.post("/api/extract-vocabulary", handleExtractVocabulary);
  app.post("/api/generate-vocabularies", handleGenerateVocabularies);
  app.post("/api/delete-user", handleDeleteUser);
  app.get("/api/admin/users", handleGetAdminUsers);
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  // Vite middleware for development, static serve for production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
