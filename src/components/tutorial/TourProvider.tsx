import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import junsuk01 from "@/assets/junsuk-01.png";

interface TourStep {
  /** value of the data-tour attribute to highlight. Omit for a centered step. */
  tourId?: string;
  /** route the user must be on for this step. The tour navigates here automatically. */
  route?: string;
  title: string;
  description: string;
  image?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    route: "/dashboard",
    title: "암기준섹 둘러보기 🎉",
    description:
      "준섹이가 주요 기능을 화면에서 하나씩 직접 보여드릴게요. '다음'을 눌러 시작해볼까요?",
    image: junsuk01,
  },
  {
    route: "/dashboard",
    tourId: "dashboard-hero",
    title: "여기는 홈이에요 🏠",
    description: "매일 학습 목표와 준섹이의 응원 메시지를 이곳에서 확인할 수 있어요.",
  },
  {
    route: "/dashboard",
    tourId: "qa-create",
    title: "단어장 만들기 📚",
    description:
      "이 버튼으로 나만의 단어장을 만들어요. AI 자동 입력과 엑셀 업로드도 지원해요.",
  },
  {
    route: "/dashboard",
    tourId: "qa-study",
    title: "단어 학습하기 ✏️",
    description: "플래시카드로 단어를 외우고, 퀴즈로 얼마나 외웠는지 점검할 수 있어요.",
  },
  {
    route: "/dashboard",
    tourId: "qa-groups",
    title: "그룹 활동 👥",
    description: "친구들과 그룹을 만들어 단어장을 공유하고 함께 공부할 수 있어요.",
  },
  {
    route: "/vocabularies",
    tourId: "vocab-add",
    title: "단어장 추가하기 ➕",
    description:
      "단어장 페이지의 + 버튼이에요. 직접 입력, AI 생성, 엑셀, 파일 추출 등 다양한 방법으로 단어장을 만들 수 있어요.",
  },
  {
    route: "/vocabularies",
    tourId: "nav-public",
    title: "공유 단어장 🌐",
    description: "다른 사람들이 공개한 단어장을 탐색하고 내 것으로 가져올 수 있어요.",
  },
  {
    route: "/groups",
    tourId: "nav-groups",
    title: "그룹 탭 🤝",
    description: "그룹을 새로 만들거나, 친구가 알려준 코드로 그룹에 참여할 수 있어요.",
  },
  {
    route: "/settings",
    tourId: "nav-settings",
    title: "설정 ⚙️",
    description:
      "프로필과 학습 설정을 바꿀 수 있어요. 이 튜토리얼도 설정에서 언제든 다시 볼 수 있답니다.",
  },
  {
    route: "/dashboard",
    title: "준비 완료! 🚀",
    description: "이제 준섹이와 함께 즐겁게 단어를 외워볼까요? 화이팅!",
    image: junsuk01,
  },
];

interface TourContextValue {
  isActive: boolean;
  startTour: (onFinish?: () => void) => void;
  stopTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
};

const TOOLTIP_WIDTH = 320;
const PADDING = 8;

export const TourProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const onFinishRef = useRef<(() => void) | null>(null);

  const step = isActive ? TOUR_STEPS[stepIndex] : null;

  const startTour = useCallback((onFinish?: () => void) => {
    onFinishRef.current = onFinish ?? null;
    setStepIndex(0);
    setRect(null);
    setIsActive(true);
  }, []);

  const stopTour = useCallback(() => {
    setIsActive(false);
    setRect(null);
  }, []);

  const finishTour = useCallback(() => {
    setIsActive(false);
    setRect(null);
    onFinishRef.current?.();
    onFinishRef.current = null;
  }, []);

  // Locate the target element for the current step (navigating between pages if needed).
  useEffect(() => {
    if (!isActive || !step) return;

    // Navigate to the right page first; the location change re-runs this effect.
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
      return;
    }

    if (!step.tourId) {
      setRect(null);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tryFind = () => {
      if (cancelled) return;
      const el = document.querySelector(
        `[data-tour="${step.tourId}"]`
      ) as HTMLElement | null;

      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        timer = setTimeout(() => {
          if (!cancelled) setRect(el.getBoundingClientRect());
        }, 350);
      } else if (attempts < 40) {
        attempts++;
        timer = setTimeout(tryFind, 60);
      } else {
        // Element never appeared - fall back to a centered tooltip.
        setRect(null);
      }
    };

    tryFind();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isActive, stepIndex, step, location.pathname, navigate]);

  // Keep the highlight aligned while scrolling/resizing.
  useEffect(() => {
    if (!isActive || !step?.tourId) return;
    const update = () => {
      const el = document.querySelector(
        `[data-tour="${step.tourId}"]`
      ) as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isActive, stepIndex, step]);

  const handleNext = () => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setRect(null);
      setStepIndex((i) => i + 1);
    } else {
      finishTour();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setRect(null);
      setStepIndex((i) => i - 1);
    }
  };

  const tooltipPosition = useMemo(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 360;
    const vh = typeof window !== "undefined" ? window.innerHeight : 640;

    if (!rect) {
      return {
        left: Math.max(16, vw / 2 - TOOLTIP_WIDTH / 2),
        top: vh / 2 - 130,
        centered: true,
      };
    }

    const spaceBelow = vh - rect.bottom;
    const placeBelow = spaceBelow > 240 || spaceBelow > rect.top;
    const top = placeBelow ? rect.bottom + 16 : Math.max(16, rect.top - 16 - 220);

    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.min(Math.max(16, left), vw - TOOLTIP_WIDTH - 16);

    return { left, top, centered: false };
  }, [rect]);

  const value = useMemo(
    () => ({ isActive, startTour, stopTour }),
    [isActive, startTour, stopTour]
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isActive && step && (
              <motion.div
                key="tour"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200]"
              >
                {/* Click blocker */}
                <div className="absolute inset-0" />

                {/* Spotlight hole */}
                {rect ? (
                  <motion.div
                    initial={false}
                    animate={{
                      top: rect.top - PADDING,
                      left: rect.left - PADDING,
                      width: rect.width + PADDING * 2,
                      height: rect.height + PADDING * 2,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="absolute rounded-xl pointer-events-none"
                    style={{
                      boxShadow:
                        "0 0 0 9999px rgba(15, 23, 42, 0.6), 0 0 0 3px hsl(var(--primary))",
                    }}
                  >
                    <span className="absolute inset-0 rounded-xl ring-4 ring-primary/40 animate-pulse" />
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 bg-slate-900/60" />
                )}

                {/* Tooltip card */}
                <motion.div
                  key={stepIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute pointer-events-auto"
                  style={{
                    left: tooltipPosition.left,
                    top: tooltipPosition.top,
                    width: TOOLTIP_WIDTH,
                  }}
                >
                  <div className="bg-white rounded-2xl shadow-2xl border-2 border-primary/20 overflow-hidden">
                    <div className="flex items-start gap-3 p-4">
                      {step.image && (
                        <img
                          src={step.image}
                          alt="준섹이"
                          className="w-14 h-14 object-contain flex-shrink-0 drop-shadow"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base mb-1 text-foreground">
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                      <button
                        onClick={finishTour}
                        aria-label="튜토리얼 닫기"
                        className="p-1 rounded-full hover:bg-muted transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>

                    {/* Progress dots */}
                    <div className="flex justify-center gap-1.5 px-4">
                      {TOUR_STEPS.map((_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 rounded-full transition-all ${
                            i === stepIndex
                              ? "w-5 bg-primary"
                              : i < stepIndex
                                ? "w-1.5 bg-primary/40"
                                : "w-1.5 bg-muted"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-2 p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePrev}
                        disabled={stepIndex === 0}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        이전
                      </Button>

                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {stepIndex + 1} / {TOUR_STEPS.length}
                      </span>

                      <Button size="sm" onClick={handleNext}>
                        {stepIndex === TOUR_STEPS.length - 1 ? (
                          <>
                            완료
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

                    <button
                      onClick={finishTour}
                      className="w-full py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors border-t"
                    >
                      건너뛰기
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </TourContext.Provider>
  );
};
