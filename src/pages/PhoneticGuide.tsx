import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const PhoneticGuide = () => {
  const playSound = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.7;
    speechSynthesis.speak(utterance);
  };

  const vowels = [
    { symbol: "iː", example: "bee", korean: "이~", word: "bee" },
    { symbol: "ɪ", example: "bit", korean: "이", word: "bit" },
    { symbol: "e", example: "bed", korean: "에", word: "bed" },
    { symbol: "æ", example: "cat", korean: "애", word: "cat" },
    { symbol: "ɑː", example: "car", korean: "아~", word: "car" },
    { symbol: "ɒ", example: "hot", korean: "오", word: "hot" },
    { symbol: "ɔː", example: "law", korean: "오~", word: "law" },
    { symbol: "ʊ", example: "put", korean: "우", word: "put" },
    { symbol: "uː", example: "too", korean: "우~", word: "too" },
    { symbol: "ʌ", example: "cup", korean: "어", word: "cup" },
    { symbol: "ɜː", example: "bird", korean: "어~", word: "bird" },
    { symbol: "ə", example: "about", korean: "어 (약하게)", word: "about" },
  ];

  const diphthongs = [
    { symbol: "eɪ", example: "day", korean: "에이", word: "day" },
    { symbol: "aɪ", example: "my", korean: "아이", word: "my" },
    { symbol: "ɔɪ", example: "boy", korean: "오이", word: "boy" },
    { symbol: "aʊ", example: "now", korean: "아우", word: "now" },
    { symbol: "əʊ", example: "go", korean: "오우", word: "go" },
    { symbol: "ɪə", example: "near", korean: "이어", word: "near" },
    { symbol: "eə", example: "hair", korean: "에어", word: "hair" },
    { symbol: "ʊə", example: "tour", korean: "우어", word: "tour" },
  ];

  const consonants = [
    { symbol: "p", example: "pen", korean: "ㅍ", word: "pen" },
    { symbol: "b", example: "bad", korean: "ㅂ", word: "bad" },
    { symbol: "t", example: "tea", korean: "ㅌ", word: "tea" },
    { symbol: "d", example: "did", korean: "ㄷ", word: "did" },
    { symbol: "k", example: "cat", korean: "ㅋ", word: "cat" },
    { symbol: "g", example: "get", korean: "ㄱ", word: "get" },
    { symbol: "f", example: "fall", korean: "ㅍ (입술)", word: "fall" },
    { symbol: "v", example: "van", korean: "ㅂ (입술+성대)", word: "van" },
    { symbol: "θ", example: "think", korean: "ㅆ (혀 끝)", word: "think" },
    { symbol: "ð", example: "this", korean: "ㄷ (혀 끝+성대)", word: "this" },
    { symbol: "s", example: "see", korean: "ㅅ", word: "see" },
    { symbol: "z", example: "zoo", korean: "ㅈ (성대)", word: "zoo" },
    { symbol: "ʃ", example: "she", korean: "쉬", word: "she" },
    { symbol: "ʒ", example: "vision", korean: "쥐 (성대)", word: "vision" },
    { symbol: "tʃ", example: "church", korean: "ㅊ", word: "church" },
    { symbol: "dʒ", example: "judge", korean: "ㅈ", word: "judge" },
    { symbol: "m", example: "man", korean: "ㅁ", word: "man" },
    { symbol: "n", example: "no", korean: "ㄴ", word: "no" },
    { symbol: "ŋ", example: "sing", korean: "ㅇ (받침)", word: "sing" },
    { symbol: "h", example: "hat", korean: "ㅎ", word: "hat" },
    { symbol: "l", example: "leg", korean: "ㄹ", word: "leg" },
    { symbol: "r", example: "red", korean: "ㄹ (혀 말기)", word: "red" },
    { symbol: "w", example: "wet", korean: "ㅜ", word: "wet" },
    { symbol: "j", example: "yes", korean: "ㅣ", word: "yes" },
  ];

  const PhoneticTable = ({ data, title }: { data: typeof vowels; title: string }) => (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">{title}</h3>
      <div className="grid gap-2">
        {data.map((item, index) => (
          <div 
            key={index} 
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl font-mono font-bold text-primary min-w-[60px]">
                {item.symbol}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{item.example}</span>
                <span className="text-xs text-muted-foreground">{item.korean}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => playSound(item.word)}
              className="hover:bg-primary/10"
            >
              <Volume2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="발음 기호 가이드" showBack />
      
      {/* Junsuk intro */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="bg-gradient-card rounded-lg p-4 mb-4 flex items-center gap-4">
          <img 
            src={new URL('@/assets/junsuk-26.png', import.meta.url).href} 
            alt="Junsuk teaching" 
            className="w-16 h-16"
          />
          <div>
            <p className="font-semibold text-sm">발음 기호를 배워볼까요?</p>
            <p className="text-xs text-muted-foreground">IPA 기호를 알면 정확한 발음을 할 수 있어요!</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>IPA (국제 음성 기호)란?</CardTitle>
            <CardDescription>
              International Phonetic Alphabet의 약자로, 전 세계 모든 언어의 발음을 표기하는 표준 기호입니다.
              사전에서 단어 옆에 /.../ 안에 표기됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-center">
                <span className="text-lg font-semibold">beautiful</span>
                <span className="text-primary ml-2 font-mono">/ˈbjuː.tɪ.fəl/</span>
              </p>
              <p className="text-center text-sm text-muted-foreground mt-2">
                ˈ 는 강세 위치를 나타냅니다 (다음 음절에 강세)
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="vowels" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vowels">모음</TabsTrigger>
            <TabsTrigger value="diphthongs">이중모음</TabsTrigger>
            <TabsTrigger value="consonants">자음</TabsTrigger>
          </TabsList>

          <TabsContent value="vowels">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">모음 (Vowels)</CardTitle>
                <CardDescription>
                  입을 열고 공기가 막힘없이 나오는 소리입니다. 
                  ː 기호는 길게 발음함을 의미합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PhoneticTable data={vowels} title="단모음" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diphthongs">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">이중모음 (Diphthongs)</CardTitle>
                <CardDescription>
                  두 개의 모음이 합쳐져서 하나의 소리처럼 발음됩니다.
                  시작 모음에서 끝 모음으로 부드럽게 이동합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PhoneticTable data={diphthongs} title="이중모음" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consonants">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">자음 (Consonants)</CardTitle>
                <CardDescription>
                  공기의 흐름이 입, 혀, 입술 등에 의해 막히거나 좁아지면서 나는 소리입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PhoneticTable data={consonants} title="자음" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">추가 기호</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <span className="text-2xl font-mono font-bold text-primary min-w-[60px]">ˈ</span>
                <div>
                  <span className="font-medium">주강세</span>
                  <p className="text-xs text-muted-foreground">다음 음절을 강하게 발음</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <span className="text-2xl font-mono font-bold text-primary min-w-[60px]">ˌ</span>
                <div>
                  <span className="font-medium">부강세</span>
                  <p className="text-xs text-muted-foreground">다음 음절을 약간 강하게 발음</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <span className="text-2xl font-mono font-bold text-primary min-w-[60px]">.</span>
                <div>
                  <span className="font-medium">음절 구분</span>
                  <p className="text-xs text-muted-foreground">음절 사이를 구분</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <span className="text-2xl font-mono font-bold text-primary min-w-[60px]">ː</span>
                <div>
                  <span className="font-medium">장음</span>
                  <p className="text-xs text-muted-foreground">앞의 소리를 길게 발음</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default PhoneticGuide;
