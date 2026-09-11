import React, { useState, useEffect } from "react";
import { Download, Smartphone, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallAppBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (already installed & opened as app)
    const isApp =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isApp);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setDeferredPrompt(null);
      setTimeout(() => setInstalledSuccess(false), 4000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isStandalone || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // General instructions
      alert("브라우저 메뉴(⋮ 또는 공유 버튼)에서 '앱 설치' 또는 '홈 화면에 추가'를 눌러주세요!");
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md px-4 py-2.5 flex items-center justify-between gap-3 text-sm z-50 sticky top-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div className="truncate">
            <p className="font-semibold text-xs md:text-sm">암기준섹 앱을 핸드폰에 설치하세요</p>
            <p className="text-[11px] text-blue-100 hidden sm:block">
              홈 화면에 추가하여 웹 주소창 없이 전체 화면 앱으로 사용할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="bg-white text-blue-700 hover:bg-blue-50 font-semibold text-xs h-8 px-3 rounded-full shadow-sm flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>앱 설치하기</span>
          </Button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-white/80 hover:text-white p-1 rounded-full"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">아이폰(iOS)에 앱 설치하기</h3>
            <ol className="text-left text-sm text-slate-600 space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">1.</span>
                <span>사파리 하단의 <strong>공유 아이콘 (네모 위 화살표)</strong>을 누릅니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">2.</span>
                <span>메뉴 목록에서 <strong>'홈 화면에 추가'</strong>를 선택합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">3.</span>
                <span>우측 상단 <strong>'추가'</strong>를 누르면 바탕화면에 바로 설치됩니다!</span>
              </li>
            </ol>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              onClick={() => setShowIOSGuide(false)}
            >
              확인
            </Button>
          </div>
        </div>
      )}

      {installedSuccess && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">앱이 성공적으로 설치되었습니다!</span>
        </div>
      )}
    </>
  );
};
