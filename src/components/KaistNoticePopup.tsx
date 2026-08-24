import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Calendar, MapPin, Phone, Globe } from "lucide-react";
import kaistPoster from "@/assets/kaist-poster.jpg.asset.json";

const AUTO_CLOSE_SECONDS = 5;

/**
 * KAIST IP영재기업인교육원 18기 신입생 모집 홍보 팝업.
 * 방문할 때마다 표시되며, 5초 뒤에 닫기 버튼이 활성화됩니다.
 */
export const KaistNoticePopup = () => {
  const [open, setOpen] = useState(true);
  const [remaining, setRemaining] = useState(AUTO_CLOSE_SECONDS);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [open]);

  const canClose = remaining <= 0;
  const handleClose = () => {
    if (!canClose) return;
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="kaist-notice"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            {canClose ? (
              <button
                onClick={handleClose}
                aria-label="닫기"
                className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
              >
                <X className="h-5 w-5" />
              </button>
            ) : (
              <div className="absolute top-3 right-3 z-10 flex h-9 min-w-9 items-center justify-center rounded-full bg-black/40 px-3 text-sm font-bold text-white backdrop-blur">
                {remaining}
              </div>
            )}

            {/* 상단 배너 */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 px-5 py-3 text-center">
              <p className="flex items-center justify-center gap-2 text-sm font-extrabold text-white">
                <Sparkles className="h-4 w-4 text-amber-300" />
                중학생 여러분, 미래를 주도할 창의적 인재를 찾습니다!
              </p>
            </div>

            <div className="max-h-[calc(92vh-3rem)] overflow-y-auto">
              {/* 포스터 이미지 */}
              <div className="relative">
                <img
                  src={kaistPoster.url}
                  alt="KAIST IP영재기업인교육원 18기 신입생 모집 포스터"
                  className="w-full max-h-[55vh] object-contain bg-slate-50"
                  loading="eager"
                />
              </div>

              {/* 설명글 */}
              <div className="px-5 py-4 text-slate-800">
                <h3 className="text-lg font-extrabold text-blue-800">
                  🚀 KAIST IP영재기업인교육원 18기 신입생 모집
                </h3>
                <p className="mt-1 text-sm leading-relaxed">
                  전국 중학생을 위한 특별한 기회! 인문학·미래기술·지식재산·창업까지
                  아우르는 융합 교육으로 여러분의 잠재력을 끌어올려 보세요.
                  KAIST 교수·CEO 멘토와 함께하며, 특허 출원·해외연수까지
                  경험할 수 있습니다.
                </p>

                <ul className="mt-3 space-y-1.5 text-sm">
                  <li className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                    <span>
                      <strong>원서접수:</strong> 2026.08.27.(목) ~ 09.23.(수) 17:00
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                    <span>
                      <strong>설명회:</strong> 09.05.(토) 오프라인 / 09.08.(화) 온라인
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Globe className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                    <span>
                      <strong>지원:</strong> ipceo.kaist.ac.kr 홈페이지 → 공지사항
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                    <span>
                      <strong>문의:</strong> 042-350-6212, 6213
                    </span>
                  </li>
                </ul>

                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  ※ 5초 후 닫기 버튼이 나타납니다.
                </p>

                <button
                  onClick={handleClose}
                  disabled={!canClose}
                  className="mt-3 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {canClose ? "닫기" : `${remaining}초 후 닫기 가능`}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default KaistNoticePopup;
