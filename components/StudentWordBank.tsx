import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Search, Info, ArrowLeft, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AutoTextFit } from "@/components/ui/AutoTextFit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion } from "motion/react";

export function StudentWordBank({ onBack }: { onBack: () => void }) {
  const [words, setWords] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [subjectFilters, setSubjectFilters] = useState<string[]>([]);
  const [levelFilters, setLevelFilters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWords() {
      setIsLoading(true);
      try {
        const data = await api.getWords();
        // sort by newest first or alphabetical
        data.sort((a: any, b: any) => a.word.localeCompare(b.word));
        setWords(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadWords();
  }, []);

  const subjects = [...new Set(words.map((w) => w.subject))].filter(Boolean);
  const levels = [...new Set(words.map((w) => w.level))].filter(Boolean);

  const filteredWords = words.filter((w) => {
    const sMatch = subjectFilters.length === 0 || subjectFilters.includes(w.subject);
    const lMatch = levelFilters.length === 0 || levelFilters.includes(w.level);
    const searchMatch = w.word.toLowerCase().includes(search.toLowerCase()) || 
                       w.definition.toLowerCase().includes(search.toLowerCase());
    return sMatch && lMatch && searchMatch;
  });

  const toggleSubject = (s: string) => setSubjectFilters(prev => prev.includes(s) ? prev.filter(p => p !== s) : [...prev, s]);
  const toggleLevel = (l: string) => setLevelFilters(prev => prev.includes(l) ? prev.filter(p => p !== l) : [...prev, l]);

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 text-slate-900 font-sans selection:bg-purple-200 selection:text-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-300/30 blur-[100px]"
        />
        <motion.div 
          animate={{ x: [0, -100, 0], y: [0, 100, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-300/30 blur-[120px]"
        />
        <motion.div 
          animate={{ x: [0, 50, -50, 0], y: [0, 50, 0], scale: [1, 0.9, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[60%] w-[30vw] h-[30vw] rounded-full bg-indigo-300/30 blur-[90px]"
        />
        <motion.div 
          animate={{ x: [0, -40, 40, 0], y: [0, -60, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[20%] left-[30%] w-[25vw] h-[25vw] rounded-full bg-cyan-200/30 blur-[100px]"
        />
      </div>

      <header className="relative w-full border-b border-purple-200/50 bg-white/70 backdrop-blur-md flex-none z-10 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest text-slate-900">Word Bank</h1>
            <p className="text-xs text-slate-500 font-medium">Browse and study your vocabulary</p>
          </div>
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden flex flex-col md:flex-row z-10">
        {/* Sidebar */}
        <aside className="w-full md:w-64 lg:w-72 border-r border-purple-200/50 bg-white/70 backdrop-blur-md flex-none p-6 overflow-y-auto shrink-0 flex flex-col gap-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Search</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search words..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white/50 backdrop-blur-sm border border-purple-100 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 placeholder:text-slate-500 font-medium transition-all"
              />
            </div>
          </div>
          
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Subject</h2>
            <div className="space-y-3">
              {subjects.map(s => (
                <div key={s as string} className="flex items-center space-x-3">
                  <Checkbox
                    id={`student-sub-${s}`}
                    checked={subjectFilters.includes(s as string)}
                    onCheckedChange={() => toggleSubject(s as string)}
                    className="border-purple-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                  />
                  <label htmlFor={`student-sub-${s}`} className="text-sm font-medium text-slate-700 cursor-pointer">{s as string}</label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Level</h2>
            <div className="space-y-3">
              {levels.map(l => (
                <div key={l as string} className="flex items-center space-x-3">
                  <Checkbox
                    id={`student-lvl-${l}`}
                    checked={levelFilters.includes(l as string)}
                    onCheckedChange={() => toggleLevel(l as string)}
                    className="border-purple-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                  />
                  <label htmlFor={`student-lvl-${l}`} className="text-sm font-medium text-slate-700 cursor-pointer">{l as string}</label>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative">
          <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto">
            <h2 className="text-slate-800 font-bold text-2xl">
              All Words <span className="text-slate-400 font-medium text-lg ml-2">({filteredWords.length})</span>
            </h2>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <RefreshCw className="h-8 w-8 animate-spin mb-4" />
                <p className="text-sm font-bold tracking-widest uppercase">Loading Word Bank...</p>
              </div>
            ) : filteredWords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Info className="h-12 w-12 mb-4 text-slate-300" />
                <p className="text-lg font-bold">No words found</p>
                <p className="text-sm">Try adjusting your filters or search term.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6 pb-20">
                {filteredWords.map((word, i) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 < 0.5 ? i * 0.03 : 0 }}
                    key={word.id}
                  >
                    <Dialog>
                      <DialogTrigger render={<button className="group relative cursor-pointer text-left rounded-[2rem] border-2 border-purple-200/50 bg-white/60 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col aspect-[4/3] w-full" />}>
                          <div className="bg-purple-100/50 py-2 px-2 border-b-2 border-purple-200/50 flex-none w-full flex flex-col items-center justify-center min-h-[48px] gap-0.5">
                            <p className="text-center text-[#5c3e84] font-bold text-[9px] sm:text-[10px] tracking-wider uppercase w-full line-clamp-2 leading-tight">
                              {word.subject}
                            </p>
                            <p className="text-center text-[#5c3e84]/70 font-semibold text-[8px] sm:text-[9px] tracking-widest uppercase truncate w-full mt-0.5">
                              {word.level}
                            </p>
                          </div>
                          <div className="flex-1 flex items-center justify-center p-3 w-full min-h-0 overflow-hidden">
                            <h3 className="w-full text-center h-full flex items-center justify-center">
                              <AutoTextFit 
                                text={word.word} 
                                minFontSize={12} 
                                maxFontSize={32} 
                                className="font-bold tracking-tight text-black flex-1" 
                              />
                            </h3>
                          </div>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md rounded-3xl">
                        <DialogHeader>
                          <DialogTitle className="text-3xl font-bold pt-4">{word.word}</DialogTitle>
                          <div className="flex gap-2 pb-2">
                            <span className="text-[10px] uppercase font-bold tracking-widest bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{word.subject}</span>
                            <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{word.level}</span>
                          </div>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div>
                            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-1">Definition</span>
                            <p className="text-slate-900 leading-relaxed font-medium">{word.definition}</p>
                          </div>
                          {word.translation && (
                            <div>
                              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-1">Translation (Simplified Chinese)</span>
                              <p className="text-slate-900 leading-relaxed font-medium">{word.translation}</p>
                            </div>
                          )}
                          {word.example && word.example !== 'No example available.' && (
                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                              <span className="text-[10px] uppercase tracking-widest font-bold text-purple-400 block mb-1">Example</span>
                              <p className="text-purple-900 italic">"{word.example}"</p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
