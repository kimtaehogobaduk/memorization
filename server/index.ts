import cors from "cors";
import express from "express";
import { PORT } from "./config";
import { handleDeleteUser, handleGetAdminUsers } from "./routes/admin";
import { handleExtractVocabulary } from "./routes/extractVocabulary";
import { handleGenerateAiQuiz } from "./routes/generateAiQuiz";
import { handleGenerateVocabularies } from "./routes/generateVocabularies";
import { handleGetWordMeaning } from "./routes/wordMeaning";
import { handleGradeSentence } from "./routes/gradeSentence";
import { handleValidateMeaning } from "./routes/validateMeaning";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.post("/api/get-word-meaning", handleGetWordMeaning);
app.post("/api/validate-meaning", handleValidateMeaning);
app.post("/api/grade-sentence", handleGradeSentence);
app.post("/api/generate-ai-quiz", handleGenerateAiQuiz);
app.post("/api/extract-vocabulary", handleExtractVocabulary);
app.post("/api/generate-vocabularies", handleGenerateVocabularies);
app.post("/api/delete-user", handleDeleteUser);
app.get("/api/admin/users", handleGetAdminUsers);
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
