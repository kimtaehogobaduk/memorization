import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export const NetworkStatusBanner = () => {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div role="status" className="fixed top-2 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-warning/30 bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-lg">
      <span className="flex items-center gap-2 whitespace-nowrap">
        <WifiOff className="h-4 w-4 text-warning" />
        오프라인 · 저장된 단어장으로 학습 중
      </span>
    </div>
  );
};
