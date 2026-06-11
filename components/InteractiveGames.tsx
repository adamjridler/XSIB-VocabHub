import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Gamepad2, Type, MousePointerClick, Heart, AlertCircle, RefreshCw, BrainCircuit, Info, Timer, Search, LayoutGrid, Swords, Maximize } from 'lucide-react';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { WordFallGame } from './games/WordFallGame';
import { FillBlanksGame } from './games/FillBlanksGame';
import { MemoryMatchGame } from './games/MemoryMatchGame';
import { WordScrambleGame } from './games/WordScrambleGame';
import { WordSearchGame } from './games/WordSearchGame';
import { MiniCrosswordGame } from './games/MiniCrosswordGame';
import { MultiplayerMemoryMatchGame } from './games/MultiplayerMemoryMatchGame';

import { ScaleWrapper } from '@/components/ScaleWrapper';

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

function MiniCrosswordCardAnimation() {
  const [letters, setLetters] = useState<{ id: number; char: string; x: number; y: number; delay: number }[]>([]);

  useEffect(() => {
    // Generate a static "crossword" layout
    const newLetters = [];
    const words = [
      { text: "WORDS", x: 1, y: 1, dir: 'H' },
      { text: "PLAY", x: 3, y: 0, dir: 'V' }
    ];
    let id = 0;
    words.forEach(w => {
      for (let i = 0; i < w.text.length; i++) {
        newLetters.push({
          id: id++,
          char: w.text[i],
          x: w.dir === 'H' ? w.x + i : w.x,
          y: w.dir === 'H' ? w.y : w.y + i,
          delay: Math.random() * 0.4
        });
      }
    });
    setLetters(newLetters);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none p-2 flex justify-center items-center opacity-40 group-hover:opacity-80 transition-opacity duration-500">
      <div className="relative w-[120px] h-[120px] transform rotate-12 group-hover:scale-110 transition-transform duration-500">
        {letters.map(l => (
          <div
            key={l.id}
            className="absolute bg-white/40 group-hover:bg-white rounded-sm w-[22px] h-[22px] flex items-center justify-center font-black text-amber-600 text-xs shadow-sm shadow-black/5 transition-colors duration-300"
            style={{ left: `${l.x * 24}px`, top: `${l.y * 24}px` }}
          >
            <span 
              className="opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300 ease-out"
              style={{ transitionDelay: `${l.delay}s` }}
            >
              {l.char}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InteractiveGames({ onBack, backgroundWords, onGameComplete, initialGameData }: { onBack: () => void; backgroundWords?: string[], onGameComplete?: () => void, initialGameData?: { game: string, configId: string | null } | null }) {
  const [selectedGame, setSelectedGame] = useState<'word-fall' | 'fill-blanks' | 'memory-match' | 'word-scramble' | 'word-search' | 'mini-crossword' | 'multiplayer-memory' | null>(null);
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
  const [wordFallTimeLimit, setWordFallTimeLimit] = useState<number>(60);
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState(api.getUser()?.name || '');
  const [memoryPreviewTime, setMemoryPreviewTime] = useState<number>(0);
  const [memoryTimeLimit, setMemoryTimeLimit] = useState<number>(0);
  const [wordSearchTimeLimit, setWordSearchTimeLimit] = useState<number>(120);
  const [wordSearchClueType, setWordSearchClueType] = useState<'translation' | 'definition'>('translation');
  const [crosswordTimeLimit, setCrosswordTimeLimit] = useState<number>(300);
  const [multiplayerTurnTime, setMultiplayerTurnTime] = useState<number>(15);
  const [multiplayerMode, setMultiplayerMode] = useState<'translation' | 'definition'>('translation');
  const [roomAction, setRoomAction] = useState<'create' | 'join'>('create');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);

  useEffect(() => {
    if (initialGameData) {
      let sg: any = null;
      if (initialGameData.game === 'Word Scramble') sg = 'word-scramble';
      if (initialGameData.game === 'Word Search') sg = 'word-search';
      if (initialGameData.game === 'Mini Crossword') sg = 'mini-crossword';
      if (initialGameData.game === 'Fill in the Blanks') sg = 'fill-blanks';
      if (initialGameData.game === 'Memory Match') sg = 'memory-match';
      if (initialGameData.game === 'Word Fall') sg = 'word-fall';
      
      if (sg) {
        setSelectedGame(sg);
        setGameState('setup');
        if (initialGameData.configId) {
          const cId = initialGameData.configId;
          const parts = cId.split('-');
          if (sg === 'word-scramble') {
            // WordScramble-${scrambleMode}-${scrambleTimeLimit}
            if (parts.length >= 3) {
              setScrambleMode(parts[1] as any);
              setScrambleTimeLimit(Number(parts[2]));
            }
          } else if (sg === 'word-search') {
            // WordSearch-${wordSearchTimeLimit}-${wordSearchClueType}
            if (parts.length >= 3) {
              setWordSearchTimeLimit(Number(parts[1]));
              setWordSearchClueType(parts[2] as any);
            }
          } else if (sg === 'mini-crossword') {
            if (parts.length >= 2) {
              setCrosswordTimeLimit(Number(parts[1]));
            }
          } else if (sg === 'fill-blanks') {
            // FillBlanks-${gameMode}
            // gameMode could be "multiple-choice", so we should reconstruct it if there are multiple parts
            const modeStr = cId.replace('FillBlanks-', '');
            setGameMode(modeStr as any);
          } else if (sg === 'memory-match') {
            // MemoryMatch-${memoryPreviewTime}-${memoryTimeLimit}
            if (parts.length >= 3) {
              setMemoryPreviewTime(Number(parts[1]));
              setMemoryTimeLimit(Number(parts[2]));
            }
          } else if (sg === 'word-fall') {
            const match = cId.match(/^WordFall-(multiple-choice|typing|english-to-spanish|spanish-to-english)-(.*)$/);
            if (match) {
              let m = match[1];
              if (m === 'english-to-spanish' || m === 'spanish-to-english') m = 'typing';
              setGameMode(m as any);
              const rParts = match[2].split('-');
              if (rParts.length >= 2) {
                setFallingType(rParts[0] as any);
                setWordFallSpeed(rParts[1] as any);
              }
              if (rParts.length >= 3) {
                  setWordFallTimeLimit(Number(rParts[2]));
              }
            }
          }
        }
      }
    }
  }, [initialGameData]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gameState === 'playing') {
        const message = 'Are you sure you want to abandon the active game? Progress will be lost.';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

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

  // Limit words based on the game type to prevent repetition but keep within game limits
  const getGameWordsArray = () => {
    const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
    
    switch (selectedGame) {
      case 'word-fall':
        // Word fall can handle a huge list of words natively
        return shuffled;
      case 'memory-match':
        // Memory match gets too crowded with more than ~8-12 words (16-24 cards)
        return shuffled.slice(0, 10);
      case 'mini-crossword':
        return shuffled.slice(0, 10);
      case 'word-search':
        // Word search generates a grid based on words, 10-15 is typically a good limit
        return shuffled.slice(0, 15);
      case 'fill-blanks':
      case 'word-scramble':
        // These can handle a decent amount to cycle through
        return shuffled.slice(0, 30);
      default:
        return shuffled.slice(0, 10);
    }
  };

  const enterGame = () => {
    setGameWords(getGameWordsArray());
    setGameState('playing');
  };

  const handleStartGame = () => {
    if (!document.fullscreenElement) {
      setShowFullscreenPrompt(true);
    } else {
      enterGame();
    }
  };

  const confirmFullscreenEnter = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.error("Could not activate fullscreen:", err);
    }
    setShowFullscreenPrompt(false);
    enterGame();
  };

  const skipFullscreenEnter = () => {
    setShowFullscreenPrompt(false);
    enterGame();
  };

  const handleGameOver = async (score: number) => {
    setGameState('menu');
    if (onGameComplete) {
      onGameComplete();
    }
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
      <ScaleWrapper>
        <div className="flex flex-col h-full w-full min-h-0 overflow-hidden bg-slate-950 text-slate-100 font-sans relative">
          
          <AnimatePresence>
            {showExitConfirm && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                style={{ zIndex: 9999 }}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-sm w-full text-center text-slate-900 mx-auto"
                >
                  <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2 tracking-tight">Exit Game?</h3>
                  <p className="text-slate-600 mb-8">Are you sure you want to abandon the active game? Progress will be lost.</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setShowExitConfirm(false)}>Cancel</Button>
                    <Button variant="destructive" className="flex-1 bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20" onClick={() => { setShowExitConfirm(false); setGameState('menu'); }}>Exit Game</Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <header className="w-full bg-slate-900/80 backdrop-blur-md flex-none shadow-sm z-50 absolute top-0 left-0 border-b border-white/5">
            <div className="container mx-auto px-4 md:px-6 h-16 flex items-center gap-2 md:gap-4">
              <Button variant="ghost" size="icon" onClick={() => setShowExitConfirm(true)} className="rounded-full hover:bg-slate-800 text-white shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold tracking-tight text-white">
                {selectedGame === 'word-fall' ? 'Word Fall' : selectedGame === 'fill-blanks' ? 'Fill-in the Blanks' : selectedGame === 'word-scramble' ? 'Word Scramble' : selectedGame === 'word-search' ? 'Word Search' : selectedGame === 'mini-crossword' ? 'Mini Crossword' : 'Memory Match'}
              </h1>
            </div>
          </header>
          <main className="flex-1 min-h-0 w-full h-full relative p-0 pt-16 flex flex-col">
            {selectedGame === 'word-scramble' ? (
              <WordScrambleGame words={gameWords} timeLimit={scrambleTimeLimit} mode={scrambleMode} onGameOver={handleGameOver} />
            ) : selectedGame === 'word-fall' ? (
              <WordFallGame words={gameWords} mode={gameMode} fallingType={fallingType} speed={wordFallSpeed} timeLimit={wordFallTimeLimit} onGameOver={handleGameOver} />
            ) : selectedGame === 'mini-crossword' ? (
              <MiniCrosswordGame words={gameWords} timeLimit={crosswordTimeLimit} onGameOver={handleGameOver} />
            ) : selectedGame === 'fill-blanks' ? (
              <FillBlanksGame words={gameWords} mode={gameMode} onGameOver={handleGameOver} />
            ) : selectedGame === 'word-search' ? (
              <WordSearchGame words={gameWords} timeLimit={wordSearchTimeLimit} clueType={wordSearchClueType} onGameOver={handleGameOver} />
            ) : selectedGame === 'multiplayer-memory' ? (
              <MultiplayerMemoryMatchGame words={gameWords} mode={multiplayerMode} turnTimeLimit={multiplayerTurnTime} roomId={roomId} isHost={roomAction === 'create'} onGameOver={handleGameOver} />
            ) : (
              <MemoryMatchGame words={gameWords} previewTime={memoryPreviewTime} timeLimit={memoryTimeLimit} onGameOver={handleGameOver} />
            )}
          </main>
        </div>
      </ScaleWrapper>
    );
  }

  const getCurrentGameConfigId = () => {
    if (!selectedGame) return '';
    if (selectedGame === 'word-scramble') return `WordScramble-${scrambleMode}-${scrambleTimeLimit}`;
    if (selectedGame === 'word-search') return `WordSearch-${wordSearchTimeLimit}-${wordSearchClueType}`;
    if (selectedGame === 'mini-crossword') return `Crossword-${crosswordTimeLimit}`;
    if (selectedGame === 'fill-blanks') return `FillBlanks-${gameMode}`;
    if (selectedGame === 'memory-match') return `MemoryMatch-${memoryPreviewTime}-${memoryTimeLimit}`;
    if (selectedGame === 'word-fall') return `WordFall-${gameMode}-${fallingType}-${wordFallSpeed}-${wordFallTimeLimit}`;
    return '';
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 text-slate-900 font-sans">
      <FloatingWords backgroundWords={backgroundWords || []} />
      <AmbientOrbs />

      <AnimatePresence>
        {showFullscreenPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 z-[9999]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-md w-full text-center text-slate-900 mx-auto"
            >
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Maximize className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight">Play in Full Screen?</h3>
              <p className="text-slate-600 mb-8 font-medium">For the best experience without distractions, we recommend playing in full screen mode.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="flex-1 h-12 text-base font-semibold" onClick={skipFullscreenEnter}>Skip for now</Button>
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12 text-base font-semibold text-white shadow-lg shadow-indigo-500/30" onClick={confirmFullscreenEnter}>Enter Full Screen</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <div className="text-center md:text-left mb-4">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Choose a Game</h2>
                <p className="text-sm text-slate-600">Select a mini-game to practice your vocabulary.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div 
                className="bg-white flex flex-col border-2 border-slate-200 hover:border-purple-400 hover:shadow-xl hover:shadow-purple-500/10 transition-all cursor-pointer rounded-2xl overflow-hidden group"
                onClick={() => { setSelectedGame('word-fall'); setGameState('setup'); }}
              >
                <div className="h-32 bg-gradient-to-br from-indigo-500 to-purple-600 p-4 pb-3 flex flex-col justify-end relative overflow-hidden">
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
                <div className="p-4">
                  <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">Catch the falling definitions or translations before they hit the ground. A fast-paced reflex game!</p>
                </div>
              </div>

              <div 
                className="bg-white flex flex-col border-2 border-slate-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer rounded-2xl overflow-hidden group"
                onClick={() => { setSelectedGame('fill-blanks'); setGameState('setup'); }}
              >
                <div className="h-32 bg-gradient-to-br from-cyan-500 to-blue-600 p-4 pb-3 flex flex-col justify-end relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-full opacity-30 flex flex-col justify-center gap-3 px-6 pb-2">
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
                <div className="p-4">
                  <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">Read AI-generated paragraphs and fill in the missing vocabulary words!</p>
                </div>
              </div>

              {/* Memory Match Card */}
              <div 
                className="bg-white flex flex-col border-2 border-slate-200 hover:border-rose-400 hover:shadow-xl hover:shadow-rose-500/10 transition-all cursor-pointer rounded-2xl overflow-hidden group"
                onClick={() => { setSelectedGame('memory-match'); setGameState('setup'); }}
              >
                <div className="h-32 bg-gradient-to-br from-rose-500 to-pink-600 p-4 pb-3 flex flex-col justify-end relative overflow-hidden">
                   <div className="absolute inset-0 opacity-30 flex justify-center items-center gap-2 px-2 overflow-hidden perspective-1000 pb-2">
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
                <div className="p-4">
                  <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">Flip cards to match the vocabulary words with their translations! Test your memory and speed!</p>
                </div>
              </div>

              {/* Word Scramble Card */}
              <div 
                className="bg-white flex flex-col border-2 border-slate-200 hover:border-violet-400 hover:shadow-xl hover:shadow-violet-500/10 transition-all cursor-pointer rounded-2xl overflow-hidden group"
                onClick={() => { setSelectedGame('word-scramble'); setGameState('setup'); }}
              >
                <div className="h-32 bg-gradient-to-br from-violet-500 to-purple-600 p-4 pb-3 flex flex-col justify-end relative overflow-hidden">
                   <WordScrambleCardAnimation />
                   <div className="flex justify-between items-end relative z-10 w-full gap-2 h-full">
                     <h3 className="text-xl font-extrabold text-white drop-shadow-sm leading-tight max-w-[75%] break-words">Word Scramble</h3>
                     <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl flex-shrink-0">
                       <RefreshCw className="w-6 h-6 text-white transition-transform duration-500 group-hover:rotate-180" />
                     </div>
                   </div>
                </div>
                <div className="p-4">
                  <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">Unscramble letters to reveal the target vocabulary word before time runs out!</p>
                </div>
              </div>

               {/* Word Search Card */}
              <div 
                className="bg-white flex flex-col border-2 border-slate-200 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10 transition-all cursor-pointer rounded-2xl overflow-hidden group"
                onClick={() => { setSelectedGame('word-search'); setGameState('setup'); }}
              >
                <div className="h-32 bg-gradient-to-br from-emerald-500 to-teal-600 p-4 pb-3 flex flex-col justify-end relative overflow-hidden">
                   <WordSearchCardAnimation />
                   <div className="flex justify-between items-end relative z-10 w-full gap-2 h-full">
                     <h3 className="text-xl font-extrabold text-white drop-shadow-sm leading-tight max-w-[75%] break-words">Word Search</h3>
                     <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl flex-shrink-0">
                       <Search className="w-6 h-6 text-white group-hover:scale-125 transition-transform duration-500" />
                     </div>
                   </div>
                </div>
                 <div className="p-4">
                  <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">Find hidden vocabulary words in the grid. Connect letters horizontally, vertically, or diagonally!</p>
                </div>
              </div>

              {/* Mini Crossword Card */}
              <div 
                className="bg-white flex flex-col border-2 border-slate-200 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10 transition-all cursor-pointer rounded-2xl overflow-hidden group"
                onClick={() => { setSelectedGame('mini-crossword'); setGameState('setup'); }}
              >
                <div className="h-32 bg-gradient-to-br from-amber-500 to-orange-600 p-4 pb-3 flex flex-col justify-end relative overflow-hidden">
                   <MiniCrosswordCardAnimation />
                   <div className="flex justify-between items-end relative z-10 w-full gap-2 h-full">
                     <h3 className="text-xl font-extrabold text-white drop-shadow-sm leading-tight max-w-[75%] break-words">Mini Crossword</h3>
                     <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl flex-shrink-0">
                       <LayoutGrid className="w-6 h-6 text-white group-hover:scale-125 transition-transform duration-500" />
                     </div>
                   </div>
                </div>
                <div className="p-4">
                  <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">Solve intersecting clues using your vocabulary! An automated mini crossword.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center md:text-left mb-4">
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Multiplayer Games</h2>
              <p className="text-sm text-slate-600">Play with friends using room codes!</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Multiplayer Memory */}
              <div 
                className="bg-white flex flex-col border-2 border-slate-200 hover:border-fuchsia-400 hover:shadow-xl hover:shadow-fuchsia-500/10 transition-all cursor-pointer rounded-2xl overflow-hidden group"
                onClick={() => { setSelectedGame('multiplayer-memory'); setGameState('setup'); }}
              >
                <div className="h-32 bg-gradient-to-br from-fuchsia-500 to-pink-600 p-4 pb-3 flex flex-col justify-end relative overflow-hidden">
                   <div className="absolute inset-0 opacity-30 flex justify-center items-center gap-2 px-2 overflow-hidden perspective-1000 pb-2">
                     <div className="w-10 h-14 bg-white rounded-md border-2 border-fuchsia-200 -rotate-12 translate-y-4 group-hover:rotate-0 group-hover:translate-y-0 group-hover:rotate-y-180 transition-all duration-700 ease-out"></div>
                     <div className="w-10 h-14 bg-white/60 rounded-md border-2 border-fuchsia-200 rotate-6 -translate-y-2 group-hover:rotate-0 group-hover:translate-y-0 group-hover:shadow-[0_0_15px_rgba(255,255,255,1)] transition-all duration-700 ease-out delay-75"></div>
                     <div className="w-10 h-14 bg-white rounded-md border-2 border-fuchsia-200 rotate-12 translate-y-4 group-hover:rotate-0 group-hover:translate-y-0 group-hover:-rotate-y-180 transition-all duration-700 ease-out delay-150"></div>
                   </div>
                   <div className="flex justify-between items-end relative z-10 w-full gap-2 h-full">
                     <h3 className="text-xl font-extrabold text-white drop-shadow-sm leading-tight max-w-[75%] break-words">Multiplayer Memory Match</h3>
                     <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl flex-shrink-0 group-hover:rotate-[360deg] transition-transform duration-700">
                       <span className="text-white text-xl font-black block leading-none">?</span>
                     </div>
                   </div>
                </div>
                <div className="p-4">
                  <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">Play memory match against up to 3 friends! Create a room and see who has the best memory.</p>
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
          <div className={`flex flex-col ${selectedGame === 'multiplayer-memory' ? '' : 'xl:flex-row'} gap-6 md:gap-8 h-full max-w-7xl mx-auto`}>
            <div className="flex-1 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-200/50 p-6 md:p-8 overflow-y-auto custom-scrollbar">
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6 tracking-tight">Game Settings</h2>
            
            <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
              {/* Context / Filters */}
              {!(selectedGame === 'multiplayer-memory' && roomAction === 'join') && (
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
              )}

              {/* Game Modes */}
              <div className="w-px bg-slate-200 hidden lg:block"></div>

              <div className="flex-1 space-y-4 md:space-y-6 lg:max-w-md flex flex-col justify-between">
                <div className="space-y-4 md:space-y-6">
                  {selectedGame !== 'memory-match' && selectedGame !== 'word-scramble' && selectedGame !== 'word-search' && selectedGame !== 'mini-crossword' && selectedGame !== 'multiplayer-memory' && (
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
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">5. Time Limit</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
                        {[
                          { label: '1 Minute', value: 60 },
                          { label: '2 Minutes', value: 120 },
                          { label: '3 Minutes', value: 180 }
                        ].map(t => (
                          <div 
                            key={t.value}
                            onClick={() => setWordFallTimeLimit(t.value)}
                            className={`cursor-pointer p-2 rounded-xl border-2 shadow-sm transition-all text-center font-bold text-xs md:text-sm ${wordFallTimeLimit === t.value ? 'border-rose-500 bg-rose-50/80 text-rose-700 shadow-rose-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                          >
                            {t.label}
                          </div>
                        ))}
                      </div>
                    </div>
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
                
                {selectedGame === 'multiplayer-memory' && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                       <Button variant={roomAction === 'create' ? 'default' : 'outline'} className="flex-1" onClick={() => setRoomAction('create')}>Create Room</Button>
                       <Button variant={roomAction === 'join' ? 'default' : 'outline'} className="flex-1" onClick={() => setRoomAction('join')}>Join Room</Button>
                    </div>
                    {roomAction === 'join' ? (
                       <div>
                         <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">Room Code</h3>
                         <input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value.toUpperCase().slice(0,6))} maxLength={6} placeholder="Enter 6-digit code" className="w-full text-center text-2xl font-black tracking-widest p-4 border-2 border-slate-200 rounded-xl focus:border-fuchsia-500 outline-none uppercase" />
                       </div>
                    ) : (
                    <>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">2. Clue Type</h3>
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <div 
                          onClick={() => setMultiplayerMode('translation')}
                          className={`cursor-pointer p-2 md:p-3 rounded-xl border-2 shadow-sm transition-all text-center font-bold text-xs md:text-sm ${multiplayerMode === 'translation' ? 'border-fuchsia-500 bg-fuchsia-50/80 text-fuchsia-700 shadow-fuchsia-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                        >
                          Translations
                        </div>
                        <div 
                          onClick={() => setMultiplayerMode('definition')}
                          className={`cursor-pointer p-2 md:p-3 rounded-xl border-2 shadow-sm transition-all text-center font-bold text-xs md:text-sm ${multiplayerMode === 'definition' ? 'border-fuchsia-500 bg-fuchsia-50/80 text-fuchsia-700 shadow-fuchsia-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                        >
                          Definitions
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">3. Turn Time Limit</h3>
                      <div className="grid grid-cols-3 gap-2 md:gap-3">
                        {[10, 15, 20].map(time => (
                          <div 
                            key={time}
                            onClick={() => setMultiplayerTurnTime(time)}
                            className={`cursor-pointer rounded-xl border-2 p-2 md:p-3 flex flex-col items-center gap-1 md:gap-2 transition-all group ${multiplayerTurnTime === time ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 shadow-sm' : 'border-slate-200 hover:border-fuchsia-300 hover:bg-slate-50 text-slate-600'}`}
                          >
                            <Timer className={`w-5 h-5 md:w-6 md:h-6 ${multiplayerTurnTime === time ? 'text-fuchsia-600' : 'text-slate-400 group-hover:text-fuchsia-500'} transition-colors`} />
                            <span className="font-bold text-xs md:text-sm text-center">{time}s</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    </>
                    )}
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
                {selectedGame === 'mini-crossword' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 bg-slate-100/50 inline-block px-2 py-1 rounded-md">2. Time Limit</h3>
                      <div className="grid grid-cols-4 gap-2 md:gap-3">
                        {[0, 120, 300, 600].map(time => (
                          <div 
                            key={time}
                            onClick={() => setCrosswordTimeLimit(time)}
                            className={`cursor-pointer rounded-xl border-2 p-2 md:p-3 flex flex-col items-center gap-1 md:gap-2 transition-all group ${crosswordTimeLimit === time ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50 text-slate-600'}`}
                          >
                            <Timer className={`w-5 h-5 md:w-6 md:h-6 ${crosswordTimeLimit === time ? 'text-amber-600' : 'text-slate-400 group-hover:text-amber-500'} transition-colors`} />
                            <span className="font-bold text-xs md:text-sm text-center">{time === 0 ? 'No Limit' : `${time / 60}m`}</span>
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
                    <p className="text-xs text-slate-600 leading-snug font-medium space-y-1">
                      {selectedGame === 'word-fall' && 'Catch the falling words! Use multiple choice or type translations before they drop. Limit escapes! Typing mode, faster speeds, and focusing on definitions will increase your score multiplier.'}
                      {selectedGame === 'fill-blanks' && 'Read the AI-generated paragraph and figure out which of your vocabulary words belongs in the blank space. Typing mode yields higher score multipliers than multiple choice. You only have 2 minutes to complete the game!'}
                      {selectedGame === 'memory-match' && 'Flip the cards to reveal words and their meanings. Match all pairs as quickly as possible. Less preview time and stricter time limits will increase your score multiplier.'}
                      {selectedGame === 'word-scramble' && 'Unscramble the letters to reveal the correct word based on the clues before the time runs out. Shorter time limits and definition clues yield higher score multipliers!'}
                      {selectedGame === 'word-search' && 'Search the grid for hidden vocabulary. Stricter time limits and definition clues yield higher score multipliers!'}
                      {selectedGame === 'mini-crossword' && 'Solve the generated mini crossword by typing answers based on the definitions! Faster times give higher score multipliers!'}
                      {selectedGame === 'multiplayer-memory' && 'Join a room with friends or create your own! Match words to their translations/definitions before the turn time runs out!'}
                    </p>
                  </div>
                  <Button 
                    onClick={handleStartGame} 
                    className="w-full h-12 md:h-14 text-base md:text-lg rounded-xl md:rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold shadow-lg shadow-fuchsia-500/30 transition-all hover:scale-[1.02]"
                  >
                    {selectedGame === 'multiplayer-memory' && roomAction === 'join' ? 'Join Game' : selectedGame === 'multiplayer-memory' ? 'Create Room' : 'Start Game'}
                  </Button>
                </div>
              </div>
            </div>
            </div>

          {selectedGame !== 'multiplayer-memory' && (
            <div className="w-full xl:w-80 flex-shrink-0 flex flex-col">
              <LeaderboardForGame configId={getCurrentGameConfigId()} variant="light" />
            </div>
          )}
          </div>
        )}
      </main>
    </div>
  );
}
