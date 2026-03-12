import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import splashImage from "@/assets/splash-screen.jpg";
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
import Admin from "./pages/Admin";
import PhoneticGuide from "./pages/PhoneticGuide";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1750); // 1.75초

    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AnimatePresence mode="wait">
          {showSplash ? (
            <motion.div
              key="splash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background"
            >
              <img 
                src={splashImage} 
                alt="암기준섹" 
                className="max-w-full max-h-full object-contain p-4"
              />
            </motion.div>
          ) : (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <BrowserRouter>
                <NotificationProvider />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/vocabularies" element={<Vocabularies />} />
                  <Route path="/vocabularies/new" element={<CreateVocabulary />} />
                  <Route path="/vocabularies/excel" element={<ExcelUpload />} />
                  <Route path="/vocabularies/public" element={<PublicVocabularies />} />
                  <Route path="/vocabularies/generate" element={<GenerateVocabularies />} />
                  <Route path="/vocabularies/word-list" element={<WordListUpload />} />
                  <Route path="/vocabularies/:id/edit" element={<EditVocabulary />} />
                  <Route path="/vocabularies/:id" element={<VocabularyDetail />} />
                  <Route path="/study/:id" element={<Study />} />
                  <Route path="/quiz/multi" element={<QuizMultiVocab />} />
                  <Route path="/quiz/multi/multiple" element={<QuizMultipleChoice />} />
                  <Route path="/quiz/multi/writing" element={<QuizWriting />} />
                  <Route path="/quiz/multi/matching" element={<QuizMatching />} />
                  <Route path="/quiz/multi/random" element={<QuizRandom />} />
                  <Route path="/quiz/:id" element={<Quiz />} />
                  <Route path="/quiz/:id/multiple" element={<QuizMultipleChoice />} />
                  <Route path="/quiz/:id/writing" element={<QuizWriting />} />
                  <Route path="/quiz/:id/matching" element={<QuizMatching />} />
                  <Route path="/quiz/:id/random" element={<QuizRandom />} />
                  <Route path="/quiz/:id/result" element={<QuizResult />} />
                  <Route path="/quiz/:id/ai" element={<QuizAI />} />
                  <Route path="/quiz/:id/ai-result" element={<QuizAIResult />} />
                  <Route path="/groups" element={<Groups />} />
                  <Route path="/groups/new" element={<CreateGroup />} />
                  <Route path="/groups/join" element={<JoinGroup />} />
                  <Route path="/groups/public" element={<PublicGroups />} />
                  <Route path="/groups/:id" element={<GroupDetail />} />
                  <Route path="/groups/:id/settings" element={<GroupSettings />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/phonetic-guide" element={<PhoneticGuide />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </motion.div>
          )}
        </AnimatePresence>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
