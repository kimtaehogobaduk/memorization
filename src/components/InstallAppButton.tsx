import { useEffect, useState } from "react";
import { Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
let installed = isStandalone();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  notify();
});
window.addEventListener("appinstalled", () => {
  installed = true;
  deferredPrompt = null;
  notify();
});

export const InstallAppButton = ({ compact = false, className, promotion = false }: { compact?: boolean; className?: string; promotion?: boolean }) => {
  const [, refresh] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [promotionOpen, setPromotionOpen] = useState(false);

  useEffect(() => {
    const listener = () => refresh(value => value + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  useEffect(() => {
    if (!promotion || installed || isStandalone()) return;
    try {
      if (sessionStorage.getItem("amgijunsek-install-promotion-seen")) return;
    } catch { /* The prompt still works when storage is unavailable. */ }
    const timer = window.setTimeout(() => {
      if (installed || isStandalone()) return;
      try { sessionStorage.setItem("amgijunsek-install-promotion-seen", "1"); } catch { /* Optional session preference. */ }
      setPromotionOpen(true);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [promotion]);

  useEffect(() => {
    if (installed) setPromotionOpen(false);
  });

  const install = async () => {
    setPromotionOpen(false);
    if (!deferredPrompt) {
      setHelpOpen(true);
      return;
    }
    const prompt = deferredPrompt;
    deferredPrompt = null;
    notify();
    setInstalling(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") toast.success("앱 설치를 시작했어요. 홈 화면을 확인해주세요!");
    } catch {
      setHelpOpen(true);
    } finally {
      setInstalling(false);
    }
  };

  const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  return (
    <>
      {promotion ? (
        <Dialog open={promotionOpen && !installed} onOpenChange={setPromotionOpen}>
          <DialogContent className="max-w-sm rounded-lg">
            <DialogHeader className="items-center text-center sm:text-center">
              <img src="/icons/app-icon-192.png" alt="준섹이 앱 아이콘" className="mb-3 h-24 w-24 rounded-lg object-contain" />
              <DialogTitle className="text-2xl">암기준섹 앱 설치</DialogTitle>
              <DialogDescription className="pt-2 leading-6">
                홈 화면에서 바로 열고, 저장된 단어장은 인터넷 없이도 공부해요.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={install} disabled={installing} className="w-full">
              <Download className="mr-2 h-4 w-4" />앱 설치
            </Button>
            <Button variant="ghost" onClick={() => setPromotionOpen(false)}>나중에</Button>
          </DialogContent>
        </Dialog>
      ) : <Button
        type="button"
        variant={compact ? "outline" : "secondary"}
        size={compact ? "sm" : "default"}
        className={className}
        onClick={install}
        disabled={installed || installing}
      >
        {installed ? <Check className="mr-1 h-4 w-4" /> : <Download className="mr-1 h-4 w-4" />}
        {installed ? "앱 설치됨" : installing ? "설치 확인 중…" : "앱 설치"}
      </Button>}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>홈 화면에 암기준섹 추가</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm leading-6">
                {isAppleMobile ? (
                  <p>Safari 하단의 <strong>공유</strong> 버튼을 누른 뒤 <strong>홈 화면에 추가</strong>를 선택해주세요.</p>
                ) : (
                  <p>브라우저 주소창의 <strong>설치 아이콘</strong> 또는 메뉴의 <strong>앱 설치 / 홈 화면에 추가</strong>를 선택해주세요.</p>
                )}
                <p>설치 후에는 저장된 단어장을 오프라인에서도 학습할 수 있어요.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};
