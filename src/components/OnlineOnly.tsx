import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export const OnlineOnly = ({ children }: { children: ReactNode }) => {
  const online = useOnlineStatus();
  const navigate = useNavigate();

  if (online) return children;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-8 text-center">
          <WifiOff className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="text-xl font-bold">인터넷 연결이 필요해요</h1>
          <p className="text-sm text-muted-foreground">그룹, 공유 단어장 찾기, AI 기능은 온라인에서 사용할 수 있어요. 오프라인에서도 내 단어장 학습과 일반 퀴즈는 계속할 수 있습니다.</p>
          <Button className="w-full" onClick={() => navigate("/vocabularies")}>내 단어장으로 이동</Button>
        </CardContent>
      </Card>
    </div>
  );
};
