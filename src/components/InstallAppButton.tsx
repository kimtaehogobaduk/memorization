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
let installed = window.matchMedia("(display-mode: standalone)").matches;
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

export const InstallAppButton = ({ compact = false, className }: { compact?: boolean; className?: string }) => {
  const [, refresh] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const listener = () => refresh(value => value + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const install = async () => {
    if (!deferredPrompt) {
      setHelpOpen(true);
      return;
    }
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") toast.success("앱 설치를 시작했어요. 홈 화면을 확인해주세요!");
      deferredPrompt = null;
    } finally {
      setInstalling(false);
    }
  };

  const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <>
      <Button
        type="button"
        variant={compact ? "outline" : "secondary"}
        size={compact ? "sm" : "default"}
        className={className}
        onClick={install}
        disabled={installed || installing}
      >
        {installed ? <Check className="mr-1 h-4 w-4" /> : <Download className="mr-1 h-4 w-4" />}
        {installed ? "앱 설치됨" : installing ? "설치 확인 중…" : "앱 설치"}
      </Button>
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
