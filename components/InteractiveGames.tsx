import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Gamepad2, Type, MousePointerClick, Heart, AlertCircle, RefreshCw, BrainCircuit, Info, Timer, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { WordFallGame } from './games/WordFallGame';
import { FillBlanksGame } from './games/FillBlanksGame';
import { MemoryMatchGame } from './games/MemoryMatchGame';
import { WordScrambleGame } from './games/WordScrambleGame';
import { WordSearchGame } from './games/WordSearchGame';

import { FloatingWords, AmbientOrbs } from '@/components/AppBackground';
import { StudentLeaderboard } from '@/components/StudentLeaderboard';
import { LeaderboardForGame } from '@/components/LeaderboardForGame';

function WordScrambleCardAnimation() {
  const [letters, setLetters] = useState(['S','C','R','A','M','B','L','E'].map((c, i) => ({ id: i, char: c, rotate: Math.random() * 40 - 20, y: Math.random() * 20 - 10 })));

  const shuffle = () => {
    setLetters(l => {
      const shuffled = [...l].sort(() => Math.random() - 0.5);
      // Give them new random rotations/translations for extra scramble effect
      return shuffled.map(item => ({...item, rotate: Math.random() * 40 - 20, y: Math.random() * 20 - 10}));
    });
  };

  return (
    <div 
      className="absolute top-0 left-0 w-full h-full opacity-20 flex justify-center items-center gap-1 sm:gap-2"
      onMouseEnter={shuffle}
      onMouseLeave={shuffle}
    >
      {letters.map((l) => (
        <motion.span 
          layout
          key={l.id} 
          className="text-3xl font-black text-white mix-blend-overlay"
          animate={{ rotate: l.rotate, y: l.y }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {l.char}
        </motion.span>
      ))}
    </div>
  );
}

function WordSearchCardAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none p-3">
      <div className="relative w-full h-full">
        <div className="grid grid-cols-7 grid-rows-6 gap-0 w-full h-full absolute inset-0">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="flex justify-center items-center">
              <span 
                className={`font-mono text-lg font-black text-white mix-blend-overlay ${i % 3 === 0 ? 'opacity-40' : 'opacity-90'} group-hover:scale-125 transition-transform duration-500 z-10`}
                style={{ transitionDelay: `${(i % 5) * 50}ms` }}
              >
                {String.fromCharCode(65 + Math.floor(Math.random() * 26))}
              </span>
            </div>
          ))}
        </div>
        
        {/* Horizontal Highlight 1 (Row 1): Spans Cols 1 to 4 */}
        <div 
          className="absolute h-7 bg-white/50 mix-blend-overlay rounded-full blur-[0.5px] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-700 ease-out delay-100 -translate-y-1/2" 
          style={{ top: '25%', left: '14.28%', right: '28.57%' }}
        ></div>
        
        {/* Vertical Highlight 1 (Col 5): Spans Rows 0 to 3 */}
        <div 
          className="absolute w-7 bg-white/50 mix-blend-overlay rounded-full blur-[0.5px] scale-y-0 origin-top group-hover:scale-y-100 transition-transform duration-700 ease-out delay-500 -translate-x-1/2"
          style={{ left: '78.57%', top: '0%', bottom: '33.33%' }}
        ></div>
        
        {/* Horizontal Highlight 2 (Row 4): Spans Cols 0 to 3 */}
        <div 
          className="absolute h-7 bg-white/50 mix-blend-overlay rounded-full blur-[0.5px] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-700 ease-out delay-800 -translate-y-1/2"
          style={{ top: '75%', left: '0%', right: '42.85%' }}
        ></div>
      </div>
    </div>
  );
}

export function InteractiveGames({ onBack, backgroundWords }: { onBack: () => void; backgroundWords?: string[] }) {
  const [selectedGame, setSelectedGame] = useState<'word-fall' | 'fill-blanks' | 'memory-match' | 'word-scramble' | 'word-search' | null>(null);
  const [gameState, setGameState] = useState<'menu' | 'setup' | 'playing'>('menu');
  const [allWords, setAllWords] = useState<any[]>([]);
  
  const [gameWords, setGameWords] = useState<any[]>([]);

  // Setup filters
  const [subjectFilters, setSubjectFilters] = useState<string[]>([]);
  const [levelFilters, setLevelFilters] = useState<string[]>([]);
  
  // Game settings
  const [gameMode, setGameMode] = useState<'typing' | 'multiple-choice'>('multiple-choice');
  const [fallingType, setFallingType] = useState<'translation' | 'definition'>('translation');
  const [scrambleMode, setScrambleMode] = useState<'translation' | 'definition'>('definition');
  const [scrambleTimeLimit, setScrambleTimeLimit] = useState<number>(30);
  const [wordFallSpeed, setWordFallSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [wordFallMultiplayer, setWordFallMultiplayer] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState(api.getUser()?.name || '');
  const [memoryPreviewTime, setMemoryPreviewTime] = useState<number>(0);
  const [memoryTimeLimit, setMemoryTimeLimit] = useState<number>(0);
  const [wordSearchTimeLimit, setWordSearchTimeLimit] = useState<number>(120);
  const [wordSearchClueType, setWordSearchClueType] = useState<'translation' | 'definition'>('translation');

  useEffect(() => {
    api.getWords().then(words => {
      setAllWords(words);
    }).catch(console.error);
  }, []);

  const subjects = [...new Set(allWords.map((w) => w.subject))].filter(Boolean);
  const levels = [...new Set(allWords.map((w) => w.level))].filter(Boolean);

  const toggleSubject = (s: string) => setSubjectFilters(prev => prev.includes(s) ? prev.filter(p => p !== s) : [...prev, s]);
  const toggleLevel = (l: string) => setLevelFilters(prev => prev.includes(l) ? prev.filter(p => p !== l) : [...prev, l]);

  const filteredWords = allWords.filter(w => {
    const sMatch = subjectFilters.length === 0 || subjectFilters.includes(w.subject);
    const lMatch = levelFilters.length === 0 || levelFilters.includes(w.level);
    return sMatch && lMatch;
  });

  // Limit to 10 random words from the filtered list
  const getGameWordsArray = () => {
    return [...filteredWords].sort(() => Math.random() - 0.5).slice(0, 10);
  };

  const handleStartGame = () => {
    if (selectedGame === 'word-fall' && wordFallMultiplayer) {
      if (!roomId.trim() || !playerName.trim()) {
        alert("Please enter a valid Room Code to join multiplayer.");
        return;
      }
    }
    setGameWords(getGameWordsArray());
    setGameState('playing');
  };

  const handleGameOver = async (score: number) => {
    setGameState('menu');
  };

  if (gameState === 'playing' && selectedGame) {
    if (gameWords.length === 0) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No words found</h2>
          <p className="text-slate-600 mb-6">Please adjust your filters to include at least one word.</p>
          <Button onClick={() => setGameState('setup')} variant="outline">Back to Setup</Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
        <header className="w-full bg-slate-900/80 backdrop-blur-md flex-none shadow-sm z-50 absolute top-0 left-0 border-b border-white/5">
          <div className="container mx-auto px-6 h-16 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setGameState('menu')} className="rounded-full hover:bg-slate-800 text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight text-white">
              {selectedGame === 'word-fall' ? 'Word Fall' : selectedGame === 'fill-blanks' ? 'Fill-in the Blanks' : selectedGame === 'word-scramble' ? 'Word Scramble' : selectedGame === 'word-search' ? 'Word Search' : 'Memory Match'}
            </h1>
          </div>
        </header>
        <main className="flex-1 w-full h-full relative p-0 pt-16">
          {selectedGame === 'word-scramble' ? (
            <WordScrambleGame words={gameWords} timeLimit={scrambleTimeLimit} mode={scrambleMode} onGameOver={handleGameOver} />
          ) : selectedGame === 'word-fall' ? (
            <WordFallGame words={gameWords} mode={gameMode} fallingType={fallingType} speed={wordFallSpeed} isMultiplayer={wordFallMultiplayer} roomId={roomId} playerName={playerName} onGameOver={handleGameOver} />
          ) : selectedGame === 'fill-blanks' ? (
            <FillBlanksGame words={gameWords} mode={gameMode} onGameOver={handleGameOver} />
          ) : selectedGame === 'word-search' ? (
            <WordSearchGame words={gameWords} timeLimit={wordSearchTimeLimit} clueType={wordSearchClueType} onGameOver={handleGameOver} />
          ) : (
            <MemoryMatchGame words={gameWords} previewTime={memoryPreviewTime} timeLimit={memoryTimeLimit} onGameOver={handleGameOver} />
          )}
        </main>
      </div>
    );
  }

  const getCurrentGameConfigId = () => {
    if (!selectedGame) return '';
    if (selectedGame === 'word-scramble') return `WordScramble-${scrambleMode}-${scrambleTimeLimit}`;
    if (selectedGame === 'word-search') return `WordSearch-${wordSearchTimeLimit}-${wordSearchClueType}`;
    if (selectedGame === 'fill-blanks') return `FillBlanks-${gameMode}`;
    if (selectedGame === 'memory-match') return `MemoryMatch-${memoryPreviewTime}-${memoryTimeLimit}`;
    if (selectedGame === 'word-fall') return `WordFall-${gameMode}-${fallingType}-${wordFallSpeed}${wordFallMultiplayer ? '-MP' : ''}`;
    return '';
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 text-slate-900 font-sans">
      <FloatingWords backgroundWords={backgroundWords || []} />
      <AmbientOrbs />

      <header className="w-full border-b border-purple-200/50 bg-white/70 backdrop-blur-md flex-none shadow-sm z-10 relative">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => gameState === 'setup' ? setGameState('menu') : onBack()} className="rounded-full hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {gameState === 'menu' ? 'Interactive Games' : 'Game Setup'}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 custom-scrollbar">
        {gameState === 'menu' && (
          <div className="w-full max-w-[100rem] mx-auto flex flex-col xl:flex-row gap-8">
            <div className="flex-1 h-full flex flex-col">
              <div className="text-center md:text-left mb-6">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Choose a Game</h2>
                <p className="text-base text-slate-600">Select a mini-game to practice your vocabulary.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <div 
                className="bg-white flex flex-col border-2 border-slate-200 hover:border-purple-400 hover:shadow-xl hover:shadow-purple-500/10 transition-all cursor-pointer rounded-2xl overflow-hidden group"
                onClick={() => { setSelectedGame('word-fall'); setGameState('setup'); }}
              >
                <div className="h-40 bg-gradient-to-br from-indigo-500 to-purple-600 p-6 flex flex-col justify-end relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-full opacity-20">
                     {/* abstract falling shapes */}
                     <div className="absolute top-4 left-1/4 w-8 h-8 rounded bg-white rotate-12 group-hover:translate-y-20 transition-transform duration-1000"></div>
                     <div className="absolute top-12 left-1/2 w-12 h-12 rounded bg-white -rotate-12 group-hover:translate-y-16 transition-transform duration-1000 delay-100"></div>
                     <div className="absolute top-8 left-3/4 w-6 h-6 rounded bg-white rotate-45 group-hover:translate-y-24 transition-transform duration-1000 delay-200"></div>
                   </div>
                   <div className="flex justify-between items-end relative z-10 w-full gap-2">
                     <h3 className="text-xl font-extrabold text-white drop-shadow-sm leading-tight max-w-[75%] break-words">Word Fall</h3>
                     <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl flex-shrink-0">
                       <Gamepad2 className="w-6 h-6 text-white group-hover:-translate-y-1 transition-transform" />
                     </div>
                   </div>
                </div>
                <div className="p-5">
                  <p className="text-slate-600 text-sm font-medium leading-relaxed">Catch the falling definitions or translations before they hit the ground. A fast-paced reflex game!</p>
                </div>
              </div>

              <div 
                className="bg-white flex flex-col border-2 border-slate-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer rounded-2xl overflow-hidden group"
                onClick={() => { setSelectedGame('fill-blanks'); setGameState('setup'); }}
              >
                <div className="h-40 bg-gradient-to-br from-cyan-500 to-blue-600 p-6 flex flex-col justify-end relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-full opacity-30 flex flex-col justify-center gap-3 px-6 pb-4">
                     <div className="h-3 w-5/6 bg-white rounded-full translate-x-0 group-hover:translate-x-4 transition-transform duration-700 ease-out"></div>
                     <div className="flex gap-2 w-full items-center">
                        <div className="h-3 w-1/4 bg-white rounded-full"></div>
                        {/* The Blank */}
                        <div className="h-4 w-1/3 rounded overflow-hidden relative">
                           <div className="absolute inset-0 bg-white/30 border border-white border-dashed"></div>
                           {/* The Filler block */}
                           <div className="absolute inset-0 bg-white -translate-y-[101%] group-hover:translate-y-0 transition-transform duration-500 ease-out delay-300"></div>
                        </div>
                        <div className="h-3 flex-1 bg-white rounded-full"></div>
                     </div>
                   </div>
                   <div className="flex justify-between items-end relative z-10 w-full gap-2">
                     <h3 className="text-xl font-extrabold text-white drop-shadow-sm leading-tight max-w-[75%] break-words">Fill-in Blanks</h3>
                     <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl flex-shrink-0">
                       <Type className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                     </div>
                   </div>
                </div>
                <div className="p-5">
                  <p className="text-slate-600 text-sm font-medium leading-relaxed">Read AI-generated paragraphs and fill in the missing vocabulary words!</p>
                </div>
              </div>

              {/* Memory Match Card */}
              <div 
                className="bg-white flex flex-col border-2 border-slate-200 hover:border-rose-400 hover:shadow-xl hover:shadow-rose-500/10 transition-all cursor-pointer rounded-2xl overflow-hidden group"
                onClick={() => { setSelectedGame('memory-match'); setGameState('setup'); }}
              >
                <div className="h-40 bg-gradient-to-br from-rose-500 to-pink-600 p-6 flex flex-col justify-end relative overflow-hidden">
                   <div className="absolute inset-0 opacity-30 flex justify-center items-center gap-2 px-2 overflow-hidden perspective-1000 pb-4">
                     <div className="w-10 h-14 bg-white rounded-md border-2 border-rose-200 -rotate-12 translate-y-4 group-hover:rotate-0 group-hover:translate-y-0 group-hover:rotate-y-180 transition-all duration-700 ease-out"></div>
                     <div className="w-10 h-14 bg-white/60 rounded-md border-2 border-rose-200 rotate-6 -translate-y-2 group-hover:rotate-0 group-hover:translate-y-0 group-hover:shadow-[0_0_15px_rgba(255,255,255,1)] transition-all duration-700 ease-out delay-75"></div>
                     <div className="w-10 h-14 bg-white rounded-md border-2 border-rose-200 rotate-12 translate-y-4 group-hover:rotate-0 group-hover:translate-y-0 group-hover:-rotate-y-180 transition-all duration-700 ease-out delay-150"></div>
                   </div>
                   <div className="flex justify-between items-end relative z-10 w-full gap-2">
                     <h3 className="text-xl font-extrabold text-white drop-shadow-sm leading-tight max-w-[75%] break-words">Memory Match</h3>
                     <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl flex-shrink-0 group-hover:rotate-[360deg] transition-transform duration-700">
                       <span className="text-white text-xl font-black block leading-none">?</span>
                     </div>
                   </div>
                </div>
                <div className="p-5">
                  <p className="text-slate-600 text-sm font-medium leading-relaxed">Flip cards to match the vocabulary words with their translations! Test your memory and speed!</p>
                </div>
              </div>

              {/* Word Scramble Card */}
              <div 
                className="bg-white flex flex-col border-2 border-slate-200 hover:border-violet-400 hover:shadow-xl hover:shadow-violet-500/10 transition-all cursor-pointer rounded-2xl overflow-hidden group"
                onClick={() => { setSelectedGame('word-scramble'); setGameState('setup'); }}
              >
                <div className="h-40 bg-gradient-to-br from-violet-500 to-purple-600 p-6 flex flex-col justify-end relative overflow-hidden">
                   <WordScrambleCardAnimation />
                   <div className="flex justify-between items-end relative z-10 w-full gap-2 h-full">
                     <h3 className="text-xl font-extrabold text-white drop-shadow-sm leading-tight max-w-[75%] break-words">Word Scramble</h3>
                     <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl flex-shrink-0">
                       <RefreshCw className="w-6 h-6 text-white transition-transform duration-500 group-hover:rotate-180" />
                     </div>
                   </div>
                </div>
                <div className="p-5">
                  <p className="text-slate-600 text-sm font-medium leading-relaxed">Unscramble letters to reveal the target vocabulary word before time runs out!</p>
                </div>
              </div>

               {/* Word Search Card */}
              <div 
                className="bg-white flex flex-col border-2 border-slate-200 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10 transition-all cursor-pointer rounded-2xl overflow-hidden group"
                onClick={() => { setSelectedGame('word-search'); setGameState('setup'); }}
              >
                <div className="h-40 bg-gradient-to-br from-emerald-500 to-teal-600 p-6 flex flex-col justify-end relative overflow-hidden">
                   <WordSearchCardAnimation />
                   <div className="flex justify-between items-end relative z-10 w-full gap-2 h-full">
                     <h3 className="text-xl font-extrabold text-white drop-shadow-sm leading-tight max-w-[75%] break-words">Word Search</h3>
                     <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl flex-shrink-0">
                       <Search className="w-6 h-6 text-white group-hover:scale-125 transition-transform duration-500" />
                     </div>
                   </div>
                </div>
                <div className="p-5">
                  <p className="text-slate-600 text-sm font-medium leading-relaxed">Find hidden vocabulary words in the grid. Connect letters horizontally, vertically, or diagonally!</p>
                </div>
              </div>
            </div>
            </div>
            
            <div className="w-full xl:w-80 flex-shrink-0 h-full flex flex-col">
              <StudentLeaderboard />
            </div>
          </div>
        )}

        {gameState === 'setup' && (
          <div className="flex flex-col xl:flex-row gap-6 md:gap-8 h-full max-w-7xl mx-auto">
            <div className="flex-1 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-200/50 p-6 md:p-8 overflow-y-auto custom-scrollbar">
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6 tracking-tight">Game Settings</h2>
            
            <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
              {/* Context / Filters */}
              <div className="flex-1 space-y-4 md:space-y-6">
                <div>
                  <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-slate-500 mb-3 bg-slate-100/50 inline-block px-3 py-1 rounded-lg">1. Vocabulary Source</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    {subjects.length > 0 && (
                      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                          Subjects
                        </label>
                        <div className="space-y-3">
                          {subjects.map(s => (
                            <div key={s as string} className="flex items-center space-x-3 hover:bg-slate-50 p-1.5 -ml-1.5 rounded-lg transition-colors">
                              <Checkbox 
                                id={`sub-${s}`} 
                                checked={subjectFilters.includes(s as string)}
                                onCheckedChange={() => toggleSubject(s as string)}
                                className="border-purple-300 text-purple-600 h-5 w-5 rounded-md"
                              />
                              <label htmlFor={`sub-${s}`} className="text-sm font-semibold leading-none text-slate-700 cursor-pointer">{s as string}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {levels.length > 0 && (
                      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                          Levels
                        </label>
                        <div className="space-y-3">
                          {levels.map(l => (
                            <div key={l as string} className="flex items-center space-x-3 hover:bg-slate-50 p-1.5 -ml-1.5 rounded-lg transition-colors">
                              <Checkbox 
                                id={`lvl-${l}`} 
                                checked={levelFilters.includes(l as string)}
                                onCheckedChange={() => toggleLevel(l as string)}
                                className="border-blue-300 text-blue-600 h-5 w-5 rounded-md"
                              />
                              <label htmlFor={`lvl-${l}`} className="text-sm font-semibold leading-none text-slate-700 cursor-pointer">{l as string}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 font-medium mt-6 bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 flex items-start sm:items-center gap-3">
                    <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5 sm:mt-0" />
                    <span>A maximum of 10 random words from your selection will be used in the round.</span>
                  </p>
                </div>
              </div>

              {/* Game Modes */}
              <div className="w-px bg-slate-200 hidden lg:block"></div>

              <div className="flex-1 space-y-4 md:space-y-6 lg:max-w-md flex flex-col justify-between">
                <div className="space-y-4 md:space-y-6">
                  {selectedGame !== 'memory-match' && selectedGame !== 'word-scramble' && selectedGame !== 'word-search' && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">2. Input Mode</h3>
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      <div 
                        onClick={() => setGameMode('typing')}
                        className={`cursor-pointer p-2 md:p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 md:gap-2 shadow-sm ${gameMode === 'typing' ? 'border-purple-500 bg-purple-50/80 text-purple-700 shadow-purple-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                      >
                        <Type className="w-5 h-5 md:w-6 md:h-6" />
                        <span className="font-bold text-xs md:text-sm">Typing</span>
                      </div>
                      <div 
                        onClick={() => setGameMode('multiple-choice')}
                        className={`cursor-pointer p-2 md:p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 md:gap-2 shadow-sm ${gameMode === 'multiple-choice' ? 'border-purple-500 bg-purple-50/80 text-purple-700 shadow-purple-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                      >
                        <MousePointerClick className="w-5 h-5 md:w-6 md:h-6" />
                        <span className="font-bold text-xs md:text-sm text-center">Multiple Choice</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Specific Options based on mode */}
                {selectedGame === 'word-fall' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">3. Target Types</h3>
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <div 
                          onClick={() => setFallingType('translation')}
                          className={`cursor-pointer p-2 md:p-3 rounded-xl border-2 shadow-sm transition-all text-center font-bold text-xs md:text-sm ${fallingType === 'translation' ? 'border-blue-500 bg-blue-50/80 text-blue-700 shadow-blue-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                        >
                          Translation Focus
                        </div>
                        <div 
                          onClick={() => setFallingType('definition')}
                          className={`cursor-pointer p-2 md:p-3 rounded-xl border-2 shadow-sm transition-all text-center font-bold text-xs md:text-sm ${fallingType === 'definition' ? 'border-blue-500 bg-blue-50/80 text-blue-700 shadow-blue-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                        >
                          Definition Focus
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">4. Speed</h3>
                      <div className="grid grid-cols-3 gap-2 md:gap-3">
                        {['slow', 'normal', 'fast'].map(s => (
                          <div 
                            key={s}
                            onClick={() => setWordFallSpeed(s as 'slow' | 'normal' | 'fast')}
                            className={`cursor-pointer p-2 rounded-xl border-2 shadow-sm transition-all text-center font-bold capitalize text-xs md:text-sm ${wordFallSpeed === s ? 'border-emerald-500 bg-emerald-50/80 text-emerald-700 shadow-emerald-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">5. Play Mode</h3>
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <div 
                          onClick={() => setWordFallMultiplayer(false)}
                          className={`cursor-pointer p-2 rounded-xl border-2 shadow-sm transition-all text-center font-bold text-xs md:text-sm ${!wordFallMultiplayer ? 'border-indigo-500 bg-indigo-50/80 text-indigo-700 shadow-indigo-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                        >
                          Solo Practice
                        </div>
                        <div 
                          onClick={() => setWordFallMultiplayer(true)}
                          className={`cursor-pointer p-2 rounded-xl border-2 shadow-sm transition-all text-center font-bold text-xs md:text-sm ${wordFallMultiplayer ? 'border-indigo-500 bg-indigo-50/80 text-indigo-700 shadow-indigo-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                        >
                          Multiplayer (Live)
                        </div>
                      </div>
                    </div>
                    {wordFallMultiplayer && (
                      <div className="mt-4 bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 px-1">Room Code <span className="text-[10px] text-slate-400 font-normal lowercase">(Max 5 players)</span></label>
                        <input 
                          type="text" 
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 uppercase transition-colors"
                          placeholder="E.g. CLASS1"
                          value={roomId}
                          onChange={(e) => setRoomId(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}
                {selectedGame === 'word-scramble' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">2. Clue Type</h3>
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <div 
                          onClick={() => setScrambleMode('translation')}
                          className={`cursor-pointer p-2 md:p-3 rounded-xl border-2 shadow-sm transition-all text-center font-bold text-xs md:text-sm ${scrambleMode === 'translation' ? 'border-violet-500 bg-violet-50/80 text-violet-700 shadow-violet-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                        >
                          Translations
                        </div>
                        <div 
                          onClick={() => setScrambleMode('definition')}
                          className={`cursor-pointer p-2 md:p-3 rounded-xl border-2 shadow-sm transition-all text-center font-bold text-xs md:text-sm ${scrambleMode === 'definition' ? 'border-violet-500 bg-violet-50/80 text-violet-700 shadow-violet-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                        >
                          Definitions
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">3. Time Limit</h3>
                      <div className="grid grid-cols-3 gap-2 md:gap-3">
                        {[10, 20, 30].map(time => (
                          <div 
                            key={time}
                            onClick={() => setScrambleTimeLimit(time)}
                            className={`cursor-pointer rounded-xl border-2 p-2 md:p-3 flex flex-col items-center gap-1 md:gap-2 transition-all group ${scrambleTimeLimit === time ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm' : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50 text-slate-600'}`}
                          >
                            <Timer className={`w-6 h-6 md:w-8 md:h-8 ${scrambleTimeLimit === time ? 'text-violet-600' : 'text-slate-400 group-hover:text-violet-500'} transition-colors`} />
                            <span className="font-bold text-xs md:text-sm">{time}s</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {selectedGame === 'memory-match' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">2. Initial Reveal</h3>
                      <div className="grid grid-cols-3 gap-2 md:gap-3">
                        {[{v: 0, l: 'Blind'}, {v: 3, l: 'Quick Peek'}, {v: 5, l: 'Extended'}].map(p => (
                          <div 
                            key={p.v}
                            onClick={() => setMemoryPreviewTime(p.v)}
                            className={`cursor-pointer p-2 md:p-3 rounded-xl border-2 shadow-sm transition-all text-center font-bold text-xs md:text-sm flex items-center justify-center ${memoryPreviewTime === p.v ? 'border-rose-500 bg-rose-50/80 text-rose-700 shadow-rose-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                          >
                            {p.l}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">3. Time Attack</h3>
                      <div className="grid grid-cols-4 gap-2 md:gap-3">
                        {[0, 30, 45, 60].map(time => (
                          <div 
                            key={time}
                            onClick={() => setMemoryTimeLimit(time)}
                            className={`cursor-pointer rounded-xl border-2 p-2 md:p-3 flex flex-col items-center gap-1 md:gap-2 transition-all group ${memoryTimeLimit === time ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' : 'border-slate-200 hover:border-rose-300 hover:bg-slate-50 text-slate-600'}`}
                          >
                            <Timer className={`w-5 h-5 md:w-6 md:h-6 ${memoryTimeLimit === time ? 'text-rose-600' : 'text-slate-400 group-hover:text-rose-500'} transition-colors`} />
                            <span className="font-bold text-xs md:text-sm text-center">{time === 0 ? 'No Limit' : `${time}s`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                </div>

                {selectedGame === 'word-search' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">2. Clue Type</h3>
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <div 
                          onClick={() => setWordSearchClueType('translation')}
                          className={`cursor-pointer p-2 md:p-3 rounded-xl border-2 shadow-sm transition-all text-center font-bold text-xs md:text-sm ${wordSearchClueType === 'translation' ? 'border-emerald-500 bg-emerald-50/80 text-emerald-700 shadow-emerald-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                        >
                          Translations
                        </div>
                        <div 
                          onClick={() => setWordSearchClueType('definition')}
                          className={`cursor-pointer p-2 md:p-3 rounded-xl border-2 shadow-sm transition-all text-center font-bold text-xs md:text-sm ${wordSearchClueType === 'definition' ? 'border-emerald-500 bg-emerald-50/80 text-emerald-700 shadow-emerald-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                        >
                          Definitions
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">3. Time Attack</h3>
                      <div className="grid grid-cols-4 gap-2 md:gap-3">
                        {[0, 60, 120, 180].map(time => (
                          <div 
                            key={time}
                            onClick={() => setWordSearchTimeLimit(time)}
                            className={`cursor-pointer rounded-xl border-2 p-2 md:p-3 flex flex-col items-center gap-1 md:gap-2 transition-all group ${wordSearchTimeLimit === time ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50 text-slate-600'}`}
                          >
                            <Timer className={`w-5 h-5 md:w-6 md:h-6 ${wordSearchTimeLimit === time ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-500'} transition-colors`} />
                            <span className="font-bold text-xs md:text-sm text-center">{time === 0 ? 'No Limit' : `${time}s`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="pt-2">
                  <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border-2 border-slate-200/60 mb-3 md:mb-4 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2 text-sm md:text-base">
                      <Info className="w-4 h-4 text-purple-600" /> How to Play
                    </h3>
                    <p className="text-xs text-slate-600 leading-snug font-medium">
                      {selectedGame === 'word-fall' && 'Catch the falling words! Use multiple choice or type translations before they drop. Limit escapes!'}
                      {selectedGame === 'fill-blanks' && 'Read the AI-generated paragraph and figure out which of your vocabulary words belongs in the blank space. Use the context clues!'}
                      {selectedGame === 'memory-match' && 'Flip the cards to reveal words and their meanings. Match all pairs as quickly as possible. The fewer moves you make, the higher your score!'}
                      {selectedGame === 'word-scramble' && 'Unscramble the letters to reveal the correct word based on the clues before the time runs out. Shorter time limits will yield higher score bonuses!'}
                      {selectedGame === 'word-search' && 'Search the grid for hidden vocabulary. Check the translation or definition clues depending on your settings, and swipe over the grid connecting letters!'}
                    </p>
                  </div>
                  <Button 
                    onClick={handleStartGame} 
                    className="w-full h-12 md:h-14 text-base md:text-lg rounded-xl md:rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-purple-500/30 transition-all hover:scale-[1.02]"
                  >
                    Start Game
                  </Button>
                </div>
              </div>
            </div>
            </div>

          <div className="w-full xl:w-80 flex-shrink-0 flex flex-col">
              <LeaderboardForGame configId={getCurrentGameConfigId()} variant="light" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
