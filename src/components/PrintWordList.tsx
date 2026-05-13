import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Download } from "lucide-react";
import { toast } from "sonner";

interface Word {
  id: string;
  word: string;
  meaning: string;
  example?: string | null;
  note?: string | null;
  part_of_speech?: string | null;
  synonyms?: string | null;
  antonyms?: string | null;
  pronunciation?: string | null;
}

type TableStyle = "bordered" | "striped" | "minimal" | "borderless";
type Orientation = "portrait" | "landscape";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  words: Word[];
  title: string;
}

const COLUMNS: { key: keyof Word; label: string }[] = [
  { key: "word", label: "단어" },
  { key: "meaning", label: "뜻" },
  { key: "part_of_speech", label: "품사" },
  { key: "pronunciation", label: "발음" },
  { key: "example", label: "예문" },
  { key: "synonyms", label: "유의어" },
  { key: "antonyms", label: "반의어" },
  { key: "note", label: "노트" },
];

const PALETTE = [
  "#000000", "#374151", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb", "#f3f4f6", "#ffffff",
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#fecaca", "#fed7aa", "#fef3c7", "#d9f99d", "#bbf7d0", "#a7f3d0", "#bae6fd", "#c7d2fe",
];

const ColorPalette = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
  <div>
    <Label className="text-xs mb-1 block">{label}</Label>
    <div className="grid grid-cols-8 gap-1">
      {PALETTE.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-6 h-6 rounded border-2 ${value === c ? "border-primary ring-2 ring-primary/40" : "border-border"}`}
          style={{ background: c }}
          aria-label={c}
        />
      ))}
    </div>
  </div>
);

const SETTINGS_KEY = "print_word_list_settings_v2";

interface Settings {
  selected: string[];
  fontSize: number;
  tableStyle: TableStyle;
  borderColor: string;
  headerBg: string;
  stripeColor: string;
  showHeader: boolean;
  showIndex: boolean;
  hideMeaning: boolean;
  hideWord: boolean;
  orientation: Orientation;
  shuffle: boolean;
}

const DEFAULTS: Settings = {
  selected: ["word", "meaning"],
  fontSize: 14,
  tableStyle: "bordered",
  borderColor: "#cccccc",
  headerBg: "#f3f4f6",
  stripeColor: "#fafafa",
  showHeader: true,
  showIndex: true,
  hideMeaning: false,
  hideWord: false,
  orientation: "portrait",
  shuffle: false,
};

export const PrintWordList = ({ open, onOpenChange, words, title }: Props) => {
  const [s, setS] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) setS({ ...DEFAULTS, ...JSON.parse(saved) });
    } catch {}
  }, []);

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) => setS(prev => ({ ...prev, [k]: v }));

  const saveSettings = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    toast.success("설정이 저장되었습니다");
  };

  const resetSettings = () => {
    setS(DEFAULTS);
    localStorage.removeItem(SETTINGS_KEY);
    toast.success("기본 설정으로 초기화되었습니다");
  };

  const toggleCol = (k: string) => {
    setS(prev => {
      const has = prev.selected.includes(k);
      return { ...prev, selected: has ? prev.selected.filter(x => x !== k) : [...prev.selected, k] };
    });
  };

  const buildHtml = (forPdf = false) => {
    const cols = COLUMNS.filter(c => s.selected.includes(c.key as string));
    let tableCss = "";
    if (s.tableStyle === "bordered") {
      tableCss = `table{border-collapse:collapse;width:100%}th,td{border:1px solid ${s.borderColor};padding:8px}`;
    } else if (s.tableStyle === "striped") {
      tableCss = `table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid ${s.borderColor}}tbody tr:nth-child(even){background:${s.stripeColor}}`;
    } else if (s.tableStyle === "minimal") {
      tableCss = `table{border-collapse:collapse;width:100%}th{border-bottom:2px solid ${s.borderColor};padding:8px;text-align:left}td{padding:8px;border-bottom:1px solid ${s.borderColor}}`;
    } else {
      tableCss = `table{border-collapse:collapse;width:100%}th,td{padding:8px;text-align:left}`;
    }

    const pageSize = s.orientation === "landscape" ? "A4 landscape" : "A4 portrait";
    const displayWords = s.shuffle ? [...words].sort(() => Math.random() - 0.5) : words;

    return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page{size:${pageSize};margin:15mm}
  body{font-family:system-ui,-apple-system,'Noto Sans KR',sans-serif;font-size:${s.fontSize}px;padding:${forPdf ? "0" : "20px"};color:#111;margin:0}
  h1{font-size:${s.fontSize + 6}px;margin-bottom:16px}
  ${tableCss}
  th{background:${s.headerBg};text-align:left;font-weight:600}
  .hidden-cell{color:transparent}
  @media print{.no-print{display:none}}
</style></head><body>
<h1>${title}</h1>
${forPdf ? "" : `<div class="no-print" style="margin-bottom:12px"><button onclick="window.print()">인쇄</button></div>`}
<table>
${s.showHeader ? `<thead><tr>${s.showIndex ? "<th>#</th>" : ""}${cols.map(c => `<th>${c.label}</th>`).join("")}</tr></thead>` : ""}
<tbody>
${displayWords.map((w, i) => `<tr>${s.showIndex ? `<td>${i + 1}</td>` : ""}${cols.map(c => {
  const v = (w[c.key] ?? "") as string;
  const hide = (s.hideMeaning && c.key === "meaning") || (s.hideWord && c.key === "word");
  const cls = hide ? "hidden-cell" : "";
  return `<td class="${cls}">${String(v).replace(/</g, "&lt;")}</td>`;
}).join("")}</tr>`).join("")}
</tbody>
</table>
${(s.hideMeaning || s.hideWord) ? `
<div style="page-break-before:always;margin-top:24px">
  <h2 style="font-size:${s.fontSize + 4}px;margin-bottom:12px">답지</h2>
  <table>
    <thead><tr><th>#</th>${s.hideWord ? `<th>단어</th>` : ""}${s.hideMeaning ? `<th>뜻</th>` : ""}</tr></thead>
    <tbody>
      ${displayWords.map((w, i) => `<tr><td>${i + 1}</td>${s.hideWord ? `<td>${String(w.word ?? "").replace(/</g, "&lt;")}</td>` : ""}${s.hideMeaning ? `<td>${String(w.meaning ?? "").replace(/</g, "&lt;")}</td>` : ""}</tr>`).join("")}
    </tbody>
  </table>
</div>` : ""}
</body></html>`;
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(buildHtml(false));
    win.document.close();
  };

  const handleDownloadPdf = async () => {
    try {
      toast.loading("PDF 생성 중...", { id: "pdf-gen" });
      const html2pdf = (await import("html2pdf.js")).default;
      const container = document.createElement("div");
      container.innerHTML = buildHtml(true);
      container.style.padding = "15mm";
      document.body.appendChild(container);
      await html2pdf()
        .from(container)
        .set({
          margin: 10,
          filename: `${title}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: s.orientation },
        })
        .save();
      document.body.removeChild(container);
      toast.success("PDF가 다운로드되었습니다", { id: "pdf-gen" });
    } catch (e) {
      console.error(e);
      toast.error("PDF 생성 실패", { id: "pdf-gen" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>단어 리스트 프린트</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">출력 항목</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {COLUMNS.map(c => (
                <label key={c.key as string} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={s.selected.includes(c.key as string)}
                    onCheckedChange={() => toggleCol(c.key as string)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold">글자 크기: {s.fontSize}px</Label>
            <Input type="range" min={10} max={28} value={s.fontSize} onChange={e => update("fontSize", Number(e.target.value))} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-sm font-semibold">표 스타일</Label>
              <Select value={s.tableStyle} onValueChange={(v: TableStyle) => update("tableStyle", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bordered">테두리 있음</SelectItem>
                  <SelectItem value="striped">줄무늬</SelectItem>
                  <SelectItem value="minimal">미니멀</SelectItem>
                  <SelectItem value="borderless">표 줄 없음</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold">용지 방향</Label>
              <Select value={s.orientation} onValueChange={(v: Orientation) => update("orientation", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">세로 (Portrait)</SelectItem>
                  <SelectItem value="landscape">가로 (Landscape)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <ColorPalette label="선 색상" value={s.borderColor} onChange={v => update("borderColor", v)} />
            <ColorPalette label="헤더 배경색" value={s.headerBg} onChange={v => update("headerBg", v)} />
            {s.tableStyle === "striped" && (
              <ColorPalette label="줄무늬 색" value={s.stripeColor} onChange={v => update("stripeColor", v)} />
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={s.showHeader} onCheckedChange={v => update("showHeader", !!v)} />
              헤더 표시
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={s.showIndex} onCheckedChange={v => update("showIndex", !!v)} />
              번호 표시
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={s.hideMeaning} onCheckedChange={v => update("hideMeaning", !!v)} />
              뜻 숨기기 (시험용)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={s.hideWord} onCheckedChange={v => update("hideWord", !!v)} />
              단어 숨기기 (시험용)
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={saveSettings}>설정 저장</Button>
            <Button variant="outline" onClick={resetSettings}>초기화</Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handlePrint} variant="secondary">
              <Printer className="w-4 h-4 mr-2" />인쇄
            </Button>
            <Button onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" />PDF 다운로드
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">{words.length} 단어</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
