import { useState, useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationProvider } from "./components/NotificationProvider";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Vocabularies from "./pages/Vocabularies";
import CreateVocabulary from "./pages/CreateVocabulary";
import ExcelUpload from "./pages/ExcelUpload";
import EditVocabulary from "./pages/EditVocabulary";
import VocabularyDetail from "./pages/VocabularyDetail";
import Study from "./pages/Study";
import Quiz from "./pages/Quiz";
import QuizMultiVocab from "./pages/QuizMultiVocab";
import QuizMultipleChoice from "./pages/QuizMultipleChoice";
import QuizWriting from "./pages/QuizWriting";
import QuizMatching from "./pages/QuizMatching";
import QuizResult from "./pages/QuizResult";
import QuizAI from "./pages/QuizAI";
import QuizAIResult from "./pages/QuizAIResult";
import QuizRandom from "./pages/QuizRandom";
import QuizSentence from "./pages/QuizSentence";
import Groups from "./pages/Groups";
import CreateGroup from "./pages/CreateGroup";
import JoinGroup from "./pages/JoinGroup";
import GroupDetail from "./pages/GroupDetail";
import GroupSettings from "./pages/GroupSettings";
import PublicGroups from "./pages/PublicGroups";
import PublicVocabularies from "./pages/PublicVocabularies";
import GenerateVocabularies from "./pages/GenerateVocabularies";
import WordListUpload from "./pages/WordListUpload";
import FileVocabularyUpload from "./pages/FileVocabularyUpload";
import Settings from "./pages/Settings";
import Statistics from "./pages/Statistics";
import Admin from "./pages/Admin";
import PhoneticGuide from "./pages/PhoneticGuide";
import ShareVocabulary from "./pages/ShareVocabulary";
import NotFound from "./pages/NotFound";
import { NetworkStatusBanner } from "./components/NetworkStatusBanner";
import { OnlineOnly } from "./components/OnlineOnly";
import { LogoProvider } from "./components/layout/LogoProvider";
import { InstallAppButton } from "./components/InstallAppButton";

const queryClient = new QueryClient();
const onlineOnly = (element: ReactNode) => <OnlineOnly>{element}</OnlineOnly>;

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1750);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LogoProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AnimatePresence mode="wait">
          {showSplash ? (
            <motion.div key="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-8 text-center">
              <div className="flex h-56 w-56 items-center justify-center rounded-full bg-primary/15 sm:h-64 sm:w-64">
                <img src="/icons/app-icon-512.png" alt="브이 포즈를 하는 준섹이" className="h-52 w-52 rounded-full object-contain sm:h-60 sm:w-60" />
              </div>
              <h1 className="mt-8 text-4xl font-black tracking-tight text-foreground">암기준섹</h1>
              <p className="mt-3 text-base text-muted-foreground">준섹이와 즐겁게 단어 암기</p>
            </motion.div>
          ) : (
            <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <BrowserRouter>
                <NotificationProvider />
                <NetworkStatusBanner />
                <InstallAppButton promotion />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/auth" element={onlineOnly(<Auth />)} />
                  <Route path="/vocabularies" element={<Vocabularies />} />
                  <Route path="/vocabularies/new" element={<CreateVocabulary />} />
                  <Route path="/vocabularies/excel" element={<ExcelUpload />} />
                  <Route path="/vocabularies/public" element={onlineOnly(<PublicVocabularies />)} />
                  <Route path="/vocabularies/generate" element={onlineOnly(<GenerateVocabularies />)} />
                  <Route path="/vocabularies/word-list" element={onlineOnly(<WordListUpload />)} />
                  <Route path="/vocabularies/file-upload" element={onlineOnly(<FileVocabularyUpload />)} />
                  <Route path="/vocabularies/:id/edit" element={<EditVocabulary />} />
                  <Route path="/vocabularies/:id" element={<VocabularyDetail />} />
                  <Route path="/share/:id" element={onlineOnly(<ShareVocabulary />)} />
                  <Route path="/study/:id" element={<Study />} />
                  <Route path="/quiz/multi" element={<QuizMultiVocab />} />
                  <Route path="/quiz/multi/multiple" element={<QuizMultipleChoice />} />
                  <Route path="/quiz/multi/writing" element={<QuizWriting />} />
                  <Route path="/quiz/multi/matching" element={<QuizMatching />} />
                  <Route path="/quiz/multi/random" element={<QuizRandom />} />
                  <Route path="/quiz/multi/ai" element={onlineOnly(<QuizAI />)} />
                  <Route path="/quiz/multi/ai-result" element={onlineOnly(<QuizAIResult />)} />
                  <Route path="/quiz/multi/sentence" element={onlineOnly(<QuizSentence />)} />
                  <Route path="/quiz/multi/result" element={<QuizResult />} />
                  <Route path="/quiz/:id" element={<Quiz />} />
                  <Route path="/quiz/:id/multiple" element={<QuizMultipleChoice />} />
                  <Route path="/quiz/:id/writing" element={<QuizWriting />} />
                  <Route path="/quiz/:id/matching" element={<QuizMatching />} />
                  <Route path="/quiz/:id/random" element={<QuizRandom />} />
                  <Route path="/quiz/:id/sentence" element={onlineOnly(<QuizSentence />)} />
                  <Route path="/quiz/:id/result" element={<QuizResult />} />
                  <Route path="/quiz/:id/ai" element={onlineOnly(<QuizAI />)} />
                  <Route path="/quiz/:id/ai-result" element={onlineOnly(<QuizAIResult />)} />
                  <Route path="/groups" element={onlineOnly(<Groups />)} />
                  <Route path="/groups/new" element={onlineOnly(<CreateGroup />)} />
                  <Route path="/groups/join" element={onlineOnly(<JoinGroup />)} />
                  <Route path="/groups/public" element={onlineOnly(<PublicGroups />)} />
                  <Route path="/groups/:id" element={onlineOnly(<GroupDetail />)} />
                  <Route path="/groups/:id/settings" element={onlineOnly(<GroupSettings />)} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/statistics" element={<Statistics />} />
                  <Route path="/admin" element={onlineOnly(<Admin />)} />
                  <Route path="/phonetic-guide" element={<PhoneticGuide />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </motion.div>
          )}
        </AnimatePresence>
      </TooltipProvider>
      </LogoProvider>
    </QueryClientProvider>
  );
};

export default App;
