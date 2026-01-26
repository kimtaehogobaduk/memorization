import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  BookOpen, 
  Users, 
  Plus, 
  Upload, 
  Share2, 
  Settings, 
  Brain, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Home,
  FileText,
  PenTool,
  Gamepad2,
  Trophy,
  HelpCircle
} from "lucide-react";
import junsuk01 from "@/assets/junsuk-01.png";
import junsuk30 from "@/assets/junsuk-30.png";
import junsuk27 from "@/assets/junsuk-27.png";

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
  tips?: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "암기준섹에 오신 것을 환영해요! 🎉",
    description: "준섹이와 함께 즐겁게 단어를 학습할 수 있는 플랫폼이에요. 지금부터 주요 기능들을 알려드릴게요!",
    icon: <Sparkles className="w-8 h-8 text-junsuk-yellow" />,
    image: junsuk01,
    tips: ["튜토리얼은 언제든 설정에서 다시 볼 수 있어요"]
  },
  {
    title: "단어장 만들기 📚",
    description: "나만의 단어장을 만들어보세요! 영어, 일본어, 중국어 등 다양한 언어를 지원해요.",
    icon: <Plus className="w-8 h-8 text-junsuk-blue" />,
    image: junsuk30,
    tips: [
      "AI가 자동으로 뜻, 예문, 발음을 입력해줘요",
      "Excel 파일로 한번에 많은 단어를 업로드할 수 있어요",
      "챕터로 단어를 분류할 수 있어요"
    ]
  },
  {
    title: "단어 학습하기 ✏️",
    description: "플래시카드 모드로 단어를 학습하세요. 단어, 뜻, 예문을 다양한 방식으로 볼 수 있어요.",
    icon: <Brain className="w-8 h-8 text-success" />,
    image: junsuk27,
    tips: [
      "플래시카드를 넘기면서 암기해요",
      "단어만, 뜻만, 또는 둘 다 볼 수 있어요",
      "음성 자동 재생 기능도 있어요"
    ]
  },
  {
    title: "퀴즈로 테스트하기 🎯",
    description: "객관식, 주관식, 매칭 퀴즈로 학습한 내용을 점검해보세요!",
    icon: <Gamepad2 className="w-8 h-8 text-warning" />,
    tips: [
      "객관식: 4개 보기 중 정답 선택",
      "주관식: 직접 답을 입력",
      "매칭: 단어와 뜻을 연결",
      "여러 단어장을 합쳐서 퀴즈를 볼 수도 있어요"
    ]
  },
  {
    title: "그룹 활동 👥",
    description: "친구들과 함께 학습하세요! 그룹을 만들거나 참여하여 단어장을 공유할 수 있어요.",
    icon: <Users className="w-8 h-8 text-junsuk-yellow" />,
    tips: [
      "그룹 코드로 친구 초대하기",
      "그룹 내 단어장 공유",
      "멤버들의 학습 진도 확인",
      "그룹 채팅으로 소통"
    ]
  },
  {
    title: "공유 단어장 탐색 🌐",
    description: "다른 사용자들이 공개한 단어장을 찾아보고 내 단어장에 추가할 수 있어요.",
    icon: <Share2 className="w-8 h-8 text-primary" />,
    tips: [
      "다양한 주제의 단어장 탐색",
      "마음에 드는 단어장 복사하기",
      "내 단어장도 공개할 수 있어요"
    ]
  },
  {
    title: "하단 네비게이션 바 🧭",
    description: "화면 아래에 있는 메뉴로 빠르게 이동할 수 있어요.",
    icon: <Home className="w-8 h-8 text-muted-foreground" />,
    tips: [
      "🏠 홈: 대시보드로 이동",
      "📚 단어장: 내 단어장 목록",
      "🔗 공유: 공개된 단어장 탐색",
      "👥 그룹: 그룹 활동",
      "⚙️ 설정: 프로필 및 설정"
    ]
  },
  {
    title: "준비 완료! 🚀",
    description: "이제 준섹이와 함께 단어 학습을 시작해볼까요? 화이팅!",
    icon: <Trophy className="w-8 h-8 text-warning" />,
    image: junsuk01,
    tips: [
      "꾸준히 조금씩 학습하는 게 가장 효과적이에요",
      "어려운 단어는 반복해서 복습하세요",
      "그룹 활동으로 동기부여를 받아보세요"
    ]
  }
];

interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const TutorialOverlay = ({ isOpen, onClose, onComplete }: TutorialOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const step = tutorialSteps[currentStep];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20 }}
            className="w-full max-w-lg"
          >
            <Card className="bg-white border-2 shadow-2xl overflow-hidden">
              {/* Header with progress */}
              <div className="bg-gradient-junsuk p-4 relative">
                <button 
                  onClick={handleSkip}
                  className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-foreground/70" />
                </button>
                
                {/* Progress dots */}
                <div className="flex justify-center gap-1.5 mb-3">
                  {tutorialSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentStep 
                          ? "w-6 bg-junsuk-blue" 
                          : index < currentStep 
                            ? "w-1.5 bg-junsuk-blue/50" 
                            : "w-1.5 bg-white/50"
                      }`}
                    />
                  ))}
                </div>

                {/* Icon and Image */}
                <div className="flex flex-col items-center gap-3">
                  {step.image ? (
                    <motion.img
                      key={currentStep}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", damping: 12 }}
                      src={step.image}
                      alt="준섹이"
                      className="w-28 h-28 object-contain drop-shadow-lg"
                    />
                  ) : (
                    <motion.div
                      key={currentStep}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", damping: 12 }}
                      className="w-20 h-20 rounded-full bg-white/80 flex items-center justify-center shadow-lg"
                    >
                      {step.icon}
                    </motion.div>
                  )}
                </div>
              </div>

              <CardContent className="p-6">
                {/* Title and Description */}
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center mb-4"
                >
                  <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
                  <p className="text-muted-foreground">{step.description}</p>
                </motion.div>

                {/* Tips */}
                {step.tips && step.tips.length > 0 && (
                  <motion.div
                    key={`tips-${currentStep}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-muted/50 rounded-xl p-4 mb-6"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">💡 팁</span>
                    </div>
                    <ul className="space-y-1.5">
                      {step.tips.map((tip, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* Navigation buttons */}
                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="flex-1"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    이전
                  </Button>
                  
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {currentStep + 1} / {tutorialSteps.length}
                  </span>
                  
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-junsuk-blue hover:bg-junsuk-blue/90"
                  >
                    {currentStep === tutorialSteps.length - 1 ? (
                      <>
                        시작하기
                        <Sparkles className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      <>
                        다음
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Skip button */}
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="w-full mt-3 text-muted-foreground"
                >
                  건너뛰기
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
