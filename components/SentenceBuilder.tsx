import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Shuffle, Filter } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FloatingWords, AmbientOrbs } from "@/components/AppBackground";

// Helper to safely render fixed sentences with highlighted <b> tags
function HighlightedText({ text }: { text: string }) {
  if (!text) return null;
  // Splitting by <b> and </b> to create segments
  const parts = text.split(/(<\/?b>)/g);
  let isBold = false;
  return (
    <>
      {parts.map((part, i) => {
        if (part === '<b>') {
          isBold = true;
          return null;
        }
        if (part === '</b>') {
          isBold = false;
          return null;
        }
        if (isBold) {
          return <span key={i} className="bg-emerald-200 text-emerald-900 font-bold px-1 rounded mx-0.5">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function SentenceBuilder({ onBack }: { onBack: () => void }) {
  const [allWords, setAllWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPair, setCurrentPair] = useState<[any, any] | null>(null);
  
  const [practiceSentence, setPracticeSentence] = useState("");
  const [practiceFeedback, setPracticeFeedback] = useState<{correct: boolean, feedback: string, fixedSentence?: string} | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  
  const [subjectFilters, setSubjectFilters] = useState<string[]>([]);
  const [levelFilters, setLevelFilters] = useState<string[]>([]);

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    setLoading(true);
    const wordsData = await api.getWords();
    setAllWords(wordsData);
    pickRandomPair(wordsData, [], []);
    setLoading(false);
  };

  const subjects = useMemo(() => {
    const subs = new Set<string>();
    allWords.forEach(w => {
      if (w.subject) subs.add(w.subject);
    });
    return Array.from(subs).sort();
  }, [allWords]);
  
  const levels = useMemo(() => {
    const lvls = new Set<string>();
    allWords.forEach(w => {
      if (w.level) lvls.add(w.level);
    });
    return Array.from(lvls).sort();
  }, [allWords]);

  const filteredWords = useMemo(() => {
    return allWords.filter(w => {
      if (subjectFilters.length > 0 && !subjectFilters.includes(w.subject)) return false;
      if (levelFilters.length > 0 && !levelFilters.includes(w.level)) return false;
      return true;
    });
  }, [allWords, subjectFilters, levelFilters]);

  // When filters change, auto-pick a new pair if the current pair is invalid or if requested
  useEffect(() => {
    if (allWords.length > 0) {
       pickRandomPair(allWords, subjectFilters, levelFilters);
    }
  }, [subjectFilters, levelFilters]);

  const toggleSubject = (s: string) => {
    setSubjectFilters(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleLevel = (l: string) => {
    setLevelFilters(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  };

  const pickRandomPair = (wordList = allWords, subs = subjectFilters, lvls = levelFilters) => {
    const list = wordList.filter(w => {
      if (subs.length > 0 && !subs.includes(w.subject)) return false;
      if (lvls.length > 0 && !lvls.includes(w.level)) return false;
      return true;
    });
    
    if (list.length < 2) {
      setCurrentPair(null);
      setPracticeSentence("");
      setPracticeFeedback(null);
      return;
    }
    
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    setCurrentPair([shuffled[0], shuffled[1]]);
    setPracticeSentence("");
    setPracticeFeedback(null);
  };

  const checkSentence = async () => {
    if (!practiceSentence.trim() || !currentPair) return;
    setInsightLoading(true);
    try {
      const res = await fetch('/api/check-two-words-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('appToken')}` },
        body: JSON.stringify({ 
          word1: currentPair[0].word, 
          word2: currentPair[1].word, 
          sentence: practiceSentence 
        })
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
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
        <p className="font-medium text-slate-500 uppercase tracking-widest text-sm">Preparing Words...</p>
      </div>
    );
  }

  if (allWords.length < 2) {
    return (
      <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 text-slate-900 p-6">
        <div className="bg-white/80 backdrop-blur p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-emerald-100">
          <h2 className="text-2xl font-bold mb-2">Not Enough Words</h2>
          <p className="text-slate-500 mb-8">You need at least two words in your vocab bank to use the Sentence Builder.</p>
          <Button onClick={onBack} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">Return to Menu</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 text-slate-900 font-sans selection:bg-purple-200">
      
      <FloatingWords backgroundWords={allWords.map((w: any) => w.word).sort(() => Math.random() - 0.5).slice(0, 15)} />
      <AmbientOrbs />

      <header className="relative w-full border-b border-purple-200/50 bg-white/70 backdrop-blur-md flex-none z-10 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-500 hover:text-slate-900 mr-2 md:mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Sentence Builder</h1>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Left Sidebar for Filters */}
        <aside className="w-64 border-r border-slate-200 bg-white/50 backdrop-blur-md hidden md:flex flex-col overflow-y-auto">
          <div className="p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6">Filters</h3>
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
                          className="border-emerald-300 text-emerald-600 focus:ring-emerald-500 h-5 w-5"
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
                          className="border-emerald-300 text-emerald-600 focus:ring-emerald-500 h-5 w-5"
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
          <div className="w-full max-w-7xl flex flex-col h-full items-center">
            
            <div className="mb-4 text-center shrink-0 w-full">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">Combine These Words</h2>
              <p className="text-sm sm:text-base text-slate-600 font-medium">Write a grammatically correct sentence using both words.</p>
            </div>

            {!currentPair ? (
               <div className="flex-1 flex flex-col items-center justify-center w-full">
                 <div className="bg-white p-6 rounded-3xl shadow-md text-center border border-amber-200 max-w-sm">
                   <h3 className="text-lg font-bold text-amber-700 mb-2">Not Enough Words</h3>
                   <p className="text-amber-600 text-sm mb-4">You need at least two words matching your filters to practice.</p>
                   <Button onClick={() => { setSubjectFilters([]); setLevelFilters([]); }} className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl">Clear Filters</Button>
                 </div>
               </div>
            ) : (
               <div className="flex-1 flex flex-col lg:flex-row w-full gap-6 max-w-6xl mx-auto items-start">
                 
                 {/* Left Column: Word Cards & Input */}
                 <div className="flex flex-col flex-1 w-full max-w-3xl">
                   {/* Word Cards */}
                   <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 mb-6 shrink-0 w-full">
                     <Card className="flex flex-col items-center justify-center p-4 sm:p-5 flex-1 bg-white rounded-2xl shadow-md border-2 border-emerald-100">
                       <span className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">{currentPair[0]?.word}</span>
                       <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">{currentPair[0]?.subject} {currentPair[0]?.level ? `| ${currentPair[0]?.level}` : ''}</span>
                       <span className="text-sm text-slate-600 mt-2 text-center line-clamp-2" title={currentPair[0]?.definition}>"{currentPair[0]?.definition}"</span>
                     </Card>
                     <div className="hidden sm:flex items-center justify-center shrink-0 w-8">
                        <span className="text-xl font-bold text-emerald-400">+</span>
                     </div>
                     <Card className="flex flex-col items-center justify-center p-4 sm:p-5 flex-1 bg-white rounded-2xl shadow-md border-2 border-emerald-100">
                       <span className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">{currentPair[1]?.word}</span>
                       <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">{currentPair[1]?.subject} {currentPair[1]?.level ? `| ${currentPair[1]?.level}` : ''}</span>
                       <span className="text-sm text-slate-600 mt-2 text-center line-clamp-2" title={currentPair[1]?.definition}>"{currentPair[1]?.definition}"</span>
                     </Card>
                   </div>

                   {/* Input Area */}
                   <div className="w-full bg-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-100 flex flex-col gap-4 shrink-0">
                      <div className="flex justify-between items-center">
                          <label className="text-xs sm:text-sm font-bold uppercase tracking-widest text-emerald-600">Your Sentence</label>
                          <Button variant="ghost" size="sm" onClick={() => pickRandomPair()} className="h-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-2 sm:px-3 text-xs sm:text-sm">
                             <Shuffle className="w-3.5 h-3.5 mr-1.5" /> Skip
                          </Button>
                      </div>
                      
                      <Input 
                         value={practiceSentence}
                         onChange={e => setPracticeSentence(e.target.value)}
                         placeholder="Type your combined sentence here..."
                         className="bg-slate-50 border-emerald-200 text-base sm:text-lg h-14 sm:h-16 rounded-xl px-4 shadow-inner focus-visible:ring-emerald-500"
                         onKeyDown={e => { if (e.key === 'Enter' && practiceSentence.trim() && !insightLoading) checkSentence(); }}
                       />
                       <Button 
                         onClick={checkSentence} 
                         disabled={insightLoading || !practiceSentence.trim()} 
                         className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 sm:h-14 rounded-xl text-base sm:text-lg font-bold shadow-md shadow-emerald-500/20 mt-2"
                       >
                         {insightLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Check My Sentence"}
                       </Button>
                   </div>
                 </div>

                 {/* Right Column: Feedback Area */}
                 <div className="flex-1 w-full lg:w-80 shrink-0 h-full flex flex-col">
                   <AnimatePresence mode="wait">
                       {practiceFeedback ? (
                           <motion.div 
                             key="feedback"
                             initial={{ opacity: 0, x: 20 }} 
                             animate={{ opacity: 1, x: 0 }} 
                             exit={{ opacity: 0, scale: 0.95 }}
                             className={`w-full p-5 sm:p-6 rounded-2xl border-2 shadow-md flex flex-col h-full min-h-[300px] ${practiceFeedback.correct ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}
                           >
                               <div className="flex items-center gap-3 mb-4">
                                   {practiceFeedback.correct ? <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-600 shrink-0" /> : <XCircle className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 shrink-0" />}
                                   <h5 className={`text-lg sm:text-xl font-bold tracking-tight ${practiceFeedback.correct ? 'text-emerald-800' : 'text-rose-800'}`}>
                                       {practiceFeedback.correct ? 'Brilliant!' : 'Needs a tweak'}
                                   </h5>
                               </div>
                               <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-medium mb-4 flex-1">
                                 {practiceFeedback.feedback}
                               </p>
                               
                               {practiceFeedback.fixedSentence && (
                                   <div className="bg-white/90 p-4 rounded-xl border border-emerald-200 mb-6 shadow-sm">
                                      <h6 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">Suggested Improvement</h6>
                                      <p className="text-base sm:text-lg text-slate-900 leading-snug">
                                        <HighlightedText text={practiceFeedback.fixedSentence} />
                                      </p>
                                   </div>
                               )}

                               <div className="flex justify-end mt-auto shrink-0">
                                  <Button onClick={() => pickRandomPair()} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 text-sm font-bold shadow-lg shadow-slate-900/20">
                                      Try Another Pair
                                  </Button>
                               </div>
                           </motion.div>
                       ) : (
                         <div className="w-full h-full min-h-[300px] rounded-2xl border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center p-6 text-center text-emerald-600/50">
                            <CheckCircle2 className="w-12 h-12 mb-4 opacity-50" />
                            <p className="font-medium">Write your sentence to get AI feedback here.</p>
                         </div>
                       )}
                   </AnimatePresence>
                 </div>

               </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}


