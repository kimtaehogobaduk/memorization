import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  words: Word[];
  title: string;
}

const COLUMNS: { key: keyof Word; label: string; required?: boolean }[] = [
  { key: "word", label: "단어", required: true },
  { key: "meaning", label: "뜻", required: true },
  { key: "part_of_speech", label: "품사" },
  { key: "pronunciation", label: "발음" },
  { key: "example", label: "예문" },
  { key: "synonyms", label: "유의어" },
  { key: "antonyms", label: "반의어" },
  { key: "note", label: "노트" },
];

export const PrintWordList = ({ open, onOpenChange, words, title }: Props) => {
  const [selected, setSelected] = useState<Set<string>>(new Set(["word", "meaning"]));
  const [fontSize, setFontSize] = useState(14);
  const [tableStyle, setTableStyle] = useState<TableStyle>("bordered");
  const [borderColor, setBorderColor] = useState("#cccccc");
  const [headerBg, setHeaderBg] = useState("#f3f4f6");
  const [stripeColor, setStripeColor] = useState("#fafafa");
  const [showHeader, setShowHeader] = useState(true);
  const [showIndex, setShowIndex] = useState(true);
  const [hideMeaning, setHideMeaning] = useState(false);

  const toggle = (k: string, required?: boolean) => {
    if (required) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const handlePrint = () => {
    const cols = COLUMNS.filter(c => selected.has(c.key as string));
    const win = window.open("", "_blank");
    if (!win) return;

    let tableCss = "";
    if (tableStyle === "bordered") {
      tableCss = `table{border-collapse:collapse;width:100%}th,td{border:1px solid ${borderColor};padding:8px}`;
    } else if (tableStyle === "striped") {
      tableCss = `table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid ${borderColor}}tbody tr:nth-child(even){background:${stripeColor}}`;
    } else if (tableStyle === "minimal") {
      tableCss = `table{border-collapse:collapse;width:100%}th{border-bottom:2px solid ${borderColor};padding:8px;text-align:left}td{padding:8px;border-bottom:1px solid ${borderColor}}`;
    } else {
      tableCss = `table{border-collapse:collapse;width:100%}th,td{padding:8px;text-align:left}`;
    }

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body{font-family:system-ui,sans-serif;font-size:${fontSize}px;padding:20px;color:#111}
  h1{font-size:${fontSize + 6}px;margin-bottom:16px}
  ${tableCss}
  th{background:${headerBg};text-align:left;font-weight:600}
  .hidden-cell{color:transparent}
  @media print{.no-print{display:none}}
</style></head><body>
<h1>${title}</h1>
<div class="no-print" style="margin-bottom:12px"><button onclick="window.print()">인쇄</button></div>
<table>
${showHeader ? `<thead><tr>${showIndex ? "<th>#</th>" : ""}${cols.map(c => `<th>${c.label}</th>`).join("")}</tr></thead>` : ""}
<tbody>
${words.map((w, i) => `<tr>${showIndex ? `<td>${i + 1}</td>` : ""}${cols.map(c => {
  const v = (w[c.key] ?? "") as string;
  const cls = (hideMeaning && c.key === "meaning") ? "hidden-cell" : "";
  return `<td class="${cls}">${String(v).replace(/</g, "&lt;")}</td>`;
}).join("")}</tr>`).join("")}
</tbody>
</table>
</body></html>`;
    win.document.write(html);
    win.document.close();
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
                    checked={selected.has(c.key as string)}
                    disabled={c.required}
                    onCheckedChange={() => toggle(c.key as string, c.required)}
                  />
                  {c.label}{c.required && <span className="text-xs text-muted-foreground">(필수)</span>}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold">글자 크기: {fontSize}px</Label>
            <Input type="range" min={10} max={28} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
          </div>

          <div>
            <Label className="text-sm font-semibold">표 스타일</Label>
            <Select value={tableStyle} onValueChange={(v: TableStyle) => setTableStyle(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bordered">테두리 있음</SelectItem>
                <SelectItem value="striped">줄무늬</SelectItem>
                <SelectItem value="minimal">미니멀 (가로선만)</SelectItem>
                <SelectItem value="borderless">표 줄 없음</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">선 색상</Label>
              <Input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">헤더 색</Label>
              <Input type="color" value={headerBg} onChange={e => setHeaderBg(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">줄무늬 색</Label>
              <Input type="color" value={stripeColor} onChange={e => setStripeColor(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={showHeader} onCheckedChange={v => setShowHeader(!!v)} />
              헤더 표시
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={showIndex} onCheckedChange={v => setShowIndex(!!v)} />
              번호 표시
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={hideMeaning} onCheckedChange={v => setHideMeaning(!!v)} />
              뜻 숨기기 (시험용)
            </label>
          </div>

          <Button onClick={handlePrint} className="w-full">
            <Printer className="w-4 h-4 mr-2" />인쇄하기 ({words.length} 단어)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
