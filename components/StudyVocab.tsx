import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, RefreshCw, CheckCircle2, MessageSquare, BookOpen, Brain, XCircle, PenTool, LayoutGrid } from "lucide-react";
import { AutoTextFit } from '@/components/ui/AutoTextFit';
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SentenceBuilder } from "./SentenceBuilder";
import { FloatingWords, AmbientOrbs } from "@/components/AppBackground";

export function StudyVocab({ onBack }: { onBack: () => void }) {
  const [studyMode, setStudyMode] = useState<'menu' | 'flashcards' | 'sentence-builder'>('menu');
  const [backgroundWords, setBackgroundWords] = useState<string[]>([]);

  useEffect(() => {
    // Fetch words for the menu background if needed, or rely on child components to show them
    api.getWords().then(words => {
      setBackgroundWords(words.map((w: any) => w.word).sort(() => Math.random() - 0.5).slice(0, 15));
    });
  }, []);

  if (studyMode === 'menu') {
    return (
      <div className="fixed inset-0 w-full h-full overflow-hidden flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 text-slate-900 font-sans selection:bg-purple-200">
        <FloatingWords backgroundWords={backgroundWords} />
        <AmbientOrbs />
        <header className="relative w-full bg-white/70 backdrop-blur-md flex-none z-10 px-6 py-4 flex items-center shadow-sm border-b border-purple-100">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-500 hover:text-slate-900 mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Study Vocab</h1>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center z-10">
          <div className="max-w-4xl w-full">
            <h2 className="text-3xl font-bold text-center mb-8 text-slate-800 tracking-tight">Choose a Study Mode</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card
                className="group relative bg-white/80 backdrop-blur border-2 border-transparent hover:border-purple-300 rounded-[2rem] shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer overflow-hidden p-8 flex flex-col items-center text-center"
                onClick={() => setStudyMode('flashcards')}
              >
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <LayoutGrid className="w-10 h-10 text-purple-600" />
                </div>
                <CardTitle className="text-2xl font-bold mb-4 tracking-tight">Smart Flashcards</CardTitle>
                <CardDescription className="text-base text-slate-500 font-medium">
                  Review definitions, translations, and AI-powered context examples.
                </CardDescription>
              </Card>

              <Card
                className="group relative bg-white/80 backdrop-blur border-2 border-transparent hover:border-emerald-300 rounded-[2rem] shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer overflow-hidden p-8 flex flex-col items-center text-center"
                onClick={() => setStudyMode('sentence-builder')}
              >
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <PenTool className="w-10 h-10 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl font-bold mb-4 tracking-tight">Sentence Builder</CardTitle>
                <CardDescription className="text-base text-slate-500 font-medium">
                  Combine two random words into a single sentence and get AI feedback.
                </CardDescription>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (studyMode === 'sentence-builder') {
    return <SentenceBuilder onBack={() => setStudyMode('menu')} />;
  }

  return <SmartFlashcards onBack={() => setStudyMode('menu')} backgroundWords={backgroundWords} />;
}

function SmartFlashcards({ onBack, backgroundWords }: { onBack: () => void, backgroundWords: string[] }) {
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [subjectFilters, setSubjectFilters] = useState<string[]>([]);
  const [levelFilters, setLevelFilters] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isFlipped, setIsFlipped] = useState(false);
  
  const [insightLoading, setInsightLoading] = useState(false);
  const [activeInsight, setActiveInsight] = useState<{type: string, data: any} | null>(null);
  
  const [practiceSentence, setPracticeSentence] = useState("");
  const [practiceFeedback, setPracticeFeedback] = useState<{correct: boolean, feedback: string} | null>(null);
  const [isPracticing, setIsPracticing] = useState(false);

  useEffect(() => {
    loadWords();
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setActiveInsight(null);
    setIsPracticing(false);
  }, [subjectFilters, levelFilters]);

  const loadWords = async () => {
    setLoading(true);
    const allWords = await api.getWords();
    const shuffled = [...allWords].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setCurrentIndex(0);
    setLoading(false);
  };

  const subjects = [...new Set(words.map((w: any) => w.subject))].filter(Boolean) as string[];
  const levels = [...new Set(words.map((w: any) => w.level))].filter(Boolean) as string[];

  const filteredWords = words.filter(w => {
    if (subjectFilters.length > 0 && !subjectFilters.includes(w.subject)) return false;
    if (levelFilters.length > 0 && !levelFilters.includes(w.level)) return false;
    return true;
  });

  const currentWord = filteredWords[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setActiveInsight(null);
    setIsPracticing(false);
    setPracticeSentence("");
    setPracticeFeedback(null);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredWords.length);
    }, 300);
  };

  const toggleSubject = (s: string) => {
      setSubjectFilters(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleLevel = (l: string) => {
      setLevelFilters(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  };

  const fetchInsight = async (type: string) => {
    if (activeInsight?.type === type) {
        setActiveInsight(null);
        return;
    }
    setInsightLoading(true);
    try {
      const res = await fetch('/api/vocab-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('appToken')}` },
        body: JSON.stringify({ word: currentWord.word, type })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveInsight({ type, data });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setActiveInsight({ type, error: errorData?.error || "Error fetching AI insight." });
      }
    } catch (err) {
      console.error(err);
      setActiveInsight({ type, error: "Network error fetching AI insight." });
    }
    setInsightLoading(false);
  };

  const checkSentence = async () => {
    if (!practiceSentence.trim()) return;
    setInsightLoading(true);
    try {
      const res = await fetch('/api/check-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('appToken')}` },
        body: JSON.stringify({ word: currentWord.word, sentence: practiceSentence })
      });
      if (res.ok) {
        const data = await res.json();
        setPracticeFeedback(data);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setPracticeFeedback({ correct: false, feedback: errorData?.error || "Error checking sentence. Please try again." });
      }
    } catch (err) {
      console.error(err);
      setPracticeFeedback({ correct: false, feedback: "Network error checking sentence." });
    }
    setInsightLoading(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 text-slate-900">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mb-4" />
        <p className="font-medium text-slate-500 uppercase tracking-widest text-sm">Preparing Deck...</p>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 text-slate-900 p-6">
        <div className="bg-white/80 backdrop-blur p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-purple-100">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="h-8 w-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Word Bank Empty</h2>
          <p className="text-slate-500 mb-8">There are no words available to study right now. Ask your teacher to add some vocab!</p>
          <Button onClick={onBack} className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl">Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 text-slate-900 font-sans selection:bg-purple-200">
      
      <FloatingWords backgroundWords={backgroundWords} />
      <AmbientOrbs />

      <header className="relative w-full border-b border-purple-200/50 bg-white/70 backdrop-blur-md flex-none z-10 px-6 py-4 flex items-center shadow-sm">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-500 hover:text-slate-900 mr-4">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Smart Flashcards</h1>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative z-10">
        <aside className="w-full md:w-64 border-r border-purple-200/50 bg-white/70 backdrop-blur-md flex-none flex flex-col overflow-y-auto shadow-sm">
          <div className="p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6">Deck Filters</h3>
            <div className="space-y-8">
              {subjects.length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 block">Subjects</label>
                  <div className="space-y-3">
                    {subjects.map(s => (
                      <div key={s} className="flex items-center space-x-3">
                        <Checkbox 
                          id={`subject-${s}`} 
                          checked={subjectFilters.includes(s)}
                          onCheckedChange={() => toggleSubject(s)}
                          className="border-purple-300 text-purple-600 focus:ring-purple-500 h-5 w-5"
                        />
                        <label htmlFor={`subject-${s}`} className="text-base font-medium leading-none text-slate-700 cursor-pointer">
                          {s}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {levels.length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 block">Levels</label>
                  <div className="space-y-3">
                    {levels.map(l => (
                      <div key={l} className="flex items-center space-x-3">
                        <Checkbox 
                          id={`level-${l}`} 
                          checked={levelFilters.includes(l)}
                          onCheckedChange={() => toggleLevel(l)}
                          className="border-purple-300 text-purple-600 focus:ring-purple-500 h-5 w-5"
                        />
                        <label htmlFor={`level-${l}`} className="text-base font-medium leading-none text-slate-700 cursor-pointer">
                          {l}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center bg-transparent">
          {filteredWords.length === 0 ? (
            <div className="text-center p-8 mt-20">
              <h2 className="text-2xl font-bold text-slate-500 mb-4">No words found for this filter</h2>
              <Button variant="outline" size="lg" className="mt-4" onClick={() => { setSubjectFilters([]); setLevelFilters([]); }}>Clear Filters</Button>
            </div>
          ) : (
            <div className="w-full max-w-7xl flex flex-col items-center h-full min-h-[600px]">
              <div className="flex justify-between w-full mb-4 px-2">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                  Card {currentIndex + 1} of {filteredWords.length}
                </span>
                <span className="text-xs uppercase font-bold tracking-widest bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full shadow-sm">
                  {currentWord?.subject} | {currentWord?.level}
                </span>
              </div>

              <div className="w-full flex-1 flex flex-col xl:flex-row gap-6 xl:gap-8 items-center xl:items-stretch justify-center relative">
                
                {/* Flashcard */}
                <div className={`w-full relative perspective-1000 flex-shrink-0 min-h-[400px] sm:min-h-[500px] transition-all duration-500 max-w-2xl ${isFlipped ? 'xl:w-1/2 xl:max-w-none' : 'xl:w-2/3'}`}>
                  <div 
                    className={`relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                    onClick={() => !isFlipped && setIsFlipped(true)}
                  >
                    <div className="absolute inset-0 backface-hidden w-full h-full bg-white rounded-[2.5rem] shadow-xl border border-slate-200 flex flex-col items-center justify-center p-8 md:p-12 text-center hover:border-purple-300 transition-colors">
                      <span className="text-base font-bold uppercase tracking-widest text-slate-400 mb-6 block">Tap to reveal</span>
                      <div className="w-full h-24 mb-6">
                        <AutoTextFit 
                          text={currentWord?.word || ""} 
                          minFontSize={24} 
                          maxFontSize={72} 
                          className="font-extrabold text-slate-900 tracking-tight" 
                        />
                      </div>
                    </div>
                    
                    <div className="absolute inset-0 backface-hidden w-full h-full bg-white rounded-[2.5rem] shadow-xl border-2 border-purple-200 rotate-y-180 flex flex-col p-8 lg:p-10 overflow-y-auto">
                      <div className="flex flex-col gap-2 mb-6">
                         <div className="flex justify-between items-start gap-4">
                           <div className="flex-1 w-0 min-w-0">
                             <AutoTextFit 
                               text={currentWord?.word || ""} 
                               minFontSize={20} 
                               maxFontSize={48} 
                               className="font-extrabold text-slate-900 tracking-tight text-left justify-start" 
                             />
                           </div>
                           <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }} className="text-slate-400 hover:text-slate-700 shrink-0">Hide Card</Button>
                         </div>
                      </div>
                      
                      <div className="space-y-6 flex-1 flex flex-col justify-center">
                        <div>
                          <span className="text-xs uppercase tracking-widest font-bold text-slate-400 block mb-2">Definition</span>
                          <p className="text-slate-900 leading-relaxed font-medium text-xl">{currentWord?.definition}</p>
                        </div>
                        {currentWord?.translation && (
                          <div>
                            <span className="text-xs uppercase tracking-widest font-bold text-slate-400 block mb-2">Translation</span>
                            <p className="text-slate-700 leading-relaxed font-medium text-lg">{currentWord?.translation}</p>
                          </div>
                        )}
                        {currentWord?.example && (
                          <div className="p-5 bg-purple-50 rounded-3xl border border-purple-100 text-center mt-2">
                            <span className="text-xs uppercase tracking-widest font-bold text-purple-500 block mb-2">Example</span>
                            <p className="text-slate-800 italic text-lg pb-1">"{currentWord?.example}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Features Section */}
                <div className={`w-full max-w-2xl xl:max-w-none flex flex-col transition-all duration-500 xl:min-h-[500px] ${isFlipped ? 'xl:w-1/2 opacity-100' : 'xl:w-0 opacity-0 pointer-events-none absolute xl:relative inset-0 xl:inset-auto overflow-hidden'}`}>
                  {isFlipped && (
                    <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-6 lg:p-8 shadow-xl border border-white h-full flex flex-col overflow-hidden w-full">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 text-center shrink-0">AI Insights</h3>
                      
                      {!isPracticing && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 shrink-0">
                              <Button 
                                  variant={activeInsight?.type === 'examples' ? "default" : "outline"}
                                  className={`text-sm h-14 rounded-2xl border-slate-200 shadow-sm whitespace-normal text-left px-3 ${activeInsight?.type === 'examples' ? 'bg-purple-600 text-white border-transparent' : 'bg-white hover:bg-purple-50 text-slate-700 hover:border-purple-200 hover:text-purple-700'}`}
                                  onClick={() => fetchInsight('examples')}
                                  disabled={insightLoading}
                              >
                                  <MessageSquare className={`w-4 h-4 mr-2 shrink-0 ${activeInsight?.type === 'examples' ? 'text-purple-200' : 'text-purple-500'}`} />
                                  More Examples
                              </Button>
                              <Button 
                                  variant={activeInsight?.type === 'usage' ? "default" : "outline"}
                                  className={`text-sm h-14 rounded-2xl border-slate-200 shadow-sm whitespace-normal text-left px-3 ${activeInsight?.type === 'usage' ? 'bg-blue-600 text-white border-transparent' : 'bg-white hover:bg-blue-50 text-slate-700 hover:border-blue-200 hover:text-blue-700'}`}
                                  onClick={() => fetchInsight('usage')}
                                  disabled={insightLoading}
                              >
                                  <BookOpen className={`w-4 h-4 mr-2 shrink-0 ${activeInsight?.type === 'usage' ? 'text-blue-200' : 'text-blue-500'}`} />
                                  Usage Notes
                              </Button>
                              <Button 
                                  variant="outline"
                                  className={`text-sm h-14 rounded-2xl border-slate-200 shadow-sm whitespace-normal text-left px-3 ${isPracticing ? 'bg-emerald-600 text-white border-transparent' : 'bg-white hover:bg-emerald-50 text-slate-700 hover:border-emerald-200 hover:text-emerald-700'}`}
                                  onClick={() => setIsPracticing(true)}
                                  disabled={insightLoading}
                              >
                                  <Brain className={`w-4 h-4 mr-2 shrink-0 ${isPracticing ? 'text-emerald-200' : 'text-emerald-500'}`} />
                                  Sentence Practice
                              </Button>
                          </div>
                      )}

                      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 rounded-3xl p-4 md:p-6 border border-slate-100">
                        {insightLoading ? (
                            <div className="flex justify-center items-center h-full">
                                <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
                            </div>
                        ) : (
                            <AnimatePresence mode="wait">
                                {activeInsight && !isPracticing && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="h-full"
                                    >
                                        {activeInsight.error && (
                                            <div className="text-red-500 bg-red-50 p-4 rounded-2xl text-base font-medium">
                                                {activeInsight.error}
                                            </div>
                                        )}

                                        {activeInsight.type === 'examples' && activeInsight.data && Array.isArray(activeInsight.data) && (
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-bold uppercase tracking-widest text-purple-500">Bonus Examples</h4>
                                                <ul className="space-y-3">
                                                    {activeInsight.data.map((ex: string, i: number) => (
                                                        <li key={i} className="text-slate-800 text-base bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-3 items-start">
                                                          <span className="text-purple-300 font-bold">{i+1}.</span>
                                                          <span className="leading-relaxed">{ex}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {activeInsight.type === 'usage' && activeInsight.data && (
                                            <div className="space-y-6">
                                                {activeInsight.data.partOfSpeech && (
                                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                                        <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2">Part of Speech</h4>
                                                        <p className="text-slate-800 text-sm font-semibold capitalize">{activeInsight.data.partOfSpeech}</p>
                                                    </div>
                                                )}
                                                
                                                {activeInsight.data.notes && (
                                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Usage Context</h4>
                                                        <p className="text-slate-700 text-sm leading-relaxed">{activeInsight.data.notes}</p>
                                                    </div>
                                                )}

                                                {(activeInsight.data.collocations?.length > 0) && (
                                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                                        <h4 className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3">Common Collocations</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {activeInsight.data.collocations.map((c: string) => <span key={c} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg">{c}</span>)}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {(activeInsight.data.forms?.length > 0) && (
                                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                                        <h4 className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-3">Different Forms</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {activeInsight.data.forms.map((f: string) => <span key={f} className="px-3 py-1 bg-purple-50 text-purple-700 text-sm font-semibold rounded-lg">{f}</span>)}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {(activeInsight.data.synonyms?.length > 0) && (
                                                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Synonyms</h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {activeInsight.data.synonyms.map((s: string) => <span key={s} className="px-3 py-1 bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg text-slate-700">{s}</span>)}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(activeInsight.data.antonyms?.length > 0) && (
                                                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Antonyms</h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {activeInsight.data.antonyms.map((s: string) => <span key={s} className="px-3 py-1 bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg text-slate-700">{s}</span>)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {isPracticing && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="h-full flex flex-col"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-600">Sentence Practice</h4>
                                            <Button variant="ghost" size="sm" onClick={() => { setIsPracticing(false); setPracticeFeedback(null); }} className="text-slate-500 hover:text-slate-800">Close</Button>
                                        </div>
                                        <p className="text-sm text-slate-700 mb-5 font-medium">Write a sentence using <span className="font-bold text-slate-900 border-b border-emerald-200 px-1">"{currentWord?.word}"</span>.</p>
                                        
                                        <div className="flex flex-col gap-3 shrink-0">
                                            <Input 
                                                value={practiceSentence}
                                                onChange={e => setPracticeSentence(e.target.value)}
                                                placeholder="Type your sentence here..."
                                                className="bg-white border-emerald-200 text-base h-12 rounded-xl px-4 shadow-sm"
                                                onKeyDown={e => { if (e.key === 'Enter') checkSentence(); }}
                                            />
                                            <Button onClick={checkSentence} disabled={insightLoading || !practiceSentence.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl text-base shadow-sm w-full">
                                                Check My Work
                                            </Button>
                                        </div>

                                        {practiceFeedback && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 p-5 rounded-2xl border flex flex-col gap-3 shadow-sm ${practiceFeedback.correct ? 'bg-white border-emerald-300' : 'bg-white border-rose-300'}`}>
                                                <div className="flex items-center gap-2">
                                                    {practiceFeedback.correct ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <XCircle className="h-6 w-6 text-rose-500" />}
                                                    <h5 className={`text-sm font-bold uppercase tracking-widest ${practiceFeedback.correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                        {practiceFeedback.correct ? 'Great job!' : 'Needs improvement'}
                                                    </h5>
                                                </div>
                                                <p className="text-base text-slate-800 leading-relaxed font-medium">{practiceFeedback.feedback}</p>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 w-full flex justify-center shrink-0">
                 <Button size="lg" className="h-14 px-12 rounded-full bg-slate-900 hover:bg-purple-600 text-white shadow-xl shadow-purple-900/20 font-bold text-base transition-all hover:scale-105 active:scale-95" onClick={handleNext}>
                     <span className="tracking-widest uppercase mr-2 opacity-90">Next Card</span>
                     &rarr;
                 </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
