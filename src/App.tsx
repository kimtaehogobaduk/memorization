import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import QuizMultipleChoice from "./pages/QuizMultipleChoice";
import QuizWriting from "./pages/QuizWriting";
import QuizMatching from "./pages/QuizMatching";
import QuizResult from "./pages/QuizResult";
import Groups from "./pages/Groups";
import CreateGroup from "./pages/CreateGroup";
import JoinGroup from "./pages/JoinGroup";
import GroupDetail from "./pages/GroupDetail";
import GroupSettings from "./pages/GroupSettings";
import PublicGroups from "./pages/PublicGroups";
import PublicVocabularies from "./pages/PublicVocabularies";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/vocabularies" element={<Vocabularies />} />
          <Route path="/vocabularies/new" element={<CreateVocabulary />} />
          <Route path="/vocabularies/excel" element={<ExcelUpload />} />
          <Route path="/vocabularies/public" element={<PublicVocabularies />} />
          <Route path="/vocabularies/:id/edit" element={<EditVocabulary />} />
          <Route path="/vocabularies/:id" element={<VocabularyDetail />} />
          <Route path="/study/:id" element={<Study />} />
          <Route path="/quiz/:id" element={<Quiz />} />
          <Route path="/quiz/:id/multiple" element={<QuizMultipleChoice />} />
          <Route path="/quiz/:id/writing" element={<QuizWriting />} />
          <Route path="/quiz/:id/matching" element={<QuizMatching />} />
          <Route path="/quiz/:id/result" element={<QuizResult />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/new" element={<CreateGroup />} />
          <Route path="/groups/join" element={<JoinGroup />} />
          <Route path="/groups/public" element={<PublicGroups />} />
          <Route path="/groups/:id" element={<GroupDetail />} />
          <Route path="/groups/:id/settings" element={<GroupSettings />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
