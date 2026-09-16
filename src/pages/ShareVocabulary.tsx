import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ShareVocabulary = () => {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");
  const [vocabId, setVocabId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) { setStatus("denied"); return; }
      // Accept both legacy UUID links and friendly share codes
      const query = supabase
        .from("vocabularies")
        .select("id, is_public");
      let data: { id: string; is_public: boolean | null } | null = null;
      if (UUID_RE.test(id)) {
        data = (await query.eq("id", id).maybeSingle()).data;
      } else {
        data = (await query.eq("share_code", id).maybeSingle()).data;
        // "-1" suffix should resolve to the first (unsuffixed) vocabulary
        if (!data && id.endsWith("-1")) {
          data = (await query.eq("share_code", id.slice(0, -2)).maybeSingle()).data;
        }
      }
      if (!active) return;
      if (data?.is_public) {
        sessionStorage.setItem("share_mode_vocab", data.id);
        setVocabId(data.id);
        setStatus("ok");
      } else {
        setStatus("denied");
      }
    })();
    return () => { active = false; };
  }, [id]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        단어장을 여는 중...
      </div>
    );
  }

  if (status === "denied" || !vocabId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center space-y-2">
            <p className="font-semibold">링크를 열 수 없어요</p>
            <p className="text-sm text-muted-foreground">
              이 단어장은 공유가 해제되었거나 존재하지 않습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Navigate to={`/vocabularies/${vocabId}`} replace />;
};

export default ShareVocabulary;
