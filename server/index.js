import express from "express";
import cors from "cors";
import { extractVocabularyHandler } from "./extractVocabulary.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.post("/api/extract-vocabulary", extractVocabularyHandler);

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
