import express from "express";
import cors from "cors";
import { extractVocabularyHandler } from "./extractVocabulary.js";
import { getWordMeaningHandler } from "./getWordMeaning.js";
import { generateAiQuizHandler } from "./generateAiQuiz.js";
import { validateMeaningHandler } from "./validateMeaning.js";
import { generateVocabulariesHandler } from "./generateVocabularies.js";
import { deleteUserHandler } from "./deleteUser.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.post("/api/extract-vocabulary", extractVocabularyHandler);
app.post("/api/get-word-meaning", getWordMeaningHandler);
app.post("/api/generate-ai-quiz", generateAiQuizHandler);
app.post("/api/validate-meaning", validateMeaningHandler);
app.post("/api/generate-vocabularies", generateVocabulariesHandler);
app.post("/api/delete-user", deleteUserHandler);

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
