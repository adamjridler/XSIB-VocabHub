import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Trophy, Timer, Search, Clock, Target, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '@/lib/api';
import { LeaderboardForGame } from '@/components/LeaderboardForGame';
import { playSound } from '@/lib/audio';

interface WordSearchGameProps {
  words: any[];
  timeLimit?: number;
  clueType?: 'translation' | 'definition';
  onGameOver: (score: number) => void;
}

const GRID_SIZE = 12;

type Direction = [number, number];

const DIRECTIONS: { [key: string]: Direction } = {
  RIGHT: [0, 1],
  DOWN: [1, 0],
  DIAGONAL_DOWN_RIGHT: [1, 1],
  LEFT: [0, -1],
  UP: [-1, 0],
  DIAGONAL_UP_LEFT: [-1, -1],
  DIAGONAL_UP_RIGHT: [-1, 1],
  DIAGONAL_DOWN_LEFT: [1, -1]
};

function generateGrid(wordsArray: any[]): { grid: string[][]; wordsMap: any } {
  let grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
  const wordsMap: any = {};
  
  // Try to place each word
  for (const wObj of wordsArray) {
    const rawWord = wObj.word;
    const word = rawWord.toUpperCase().replace(/[^A-Z]/g, '');
    if (!word || word.length > GRID_SIZE || word.length < 2) continue;
    
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 100) {
      const dirKey = Object.keys(DIRECTIONS)[Math.floor(Math.random() * Object.keys(DIRECTIONS).length)];
      const [dr, dc] = DIRECTIONS[dirKey];
      
      const r = Math.floor(Math.random() * GRID_SIZE);
      const c = Math.floor(Math.random() * GRID_SIZE);
      
      // Check if fits
      const endR = r + (word.length - 1) * dr;
      const endC = c + (word.length - 1) * dc;
      
      if (endR >= 0 && endR < GRID_SIZE && endC >= 0 && endC < GRID_SIZE) {
        let valid = true;
        for (let i = 0; i < word.length; i++) {
          const charInGrid = grid[r + i * dr][c + i * dc];
          if (charInGrid !== '' && charInGrid !== word[i]) {
            valid = false;
            break;
          }
        }
        
        if (valid) {
          const positions = [];
          for (let i = 0; i < word.length; i++) {
            grid[r + i * dr][c + i * dc] = word[i];
            positions.push(`${r + i * dr},${c + i * dc}`);
          }
          wordsMap[wObj.id] = { id: wObj.id, word: rawWord, translation: wObj.translation, definition: wObj.definition, found: false, positions };
          placed = true;
        }
      }
      attempts++;
    }
  }
  
  // Fill empty spaces with random letters
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }
  }
  
  return { grid, wordsMap };
}

export function WordSearchGame({ words, timeLimit = 120, clueType = 'translation', onGameOver }: WordSearchGameProps) {
  const [grid, setGrid] = useState<string[][]>([]);
  const [wordsToFind, setWordsToFind] = useState<any>({});
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const gameWordsRef = useRef<any[]>([]);

  useEffect(() => {
    if (words.length > 0) {
      gameWordsRef.current = [...words].sort(() => Math.random() - 0.5).slice(0, 8);
      const { grid, wordsMap } = generateGrid(gameWordsRef.current);
      setGrid(grid);
      setWordsToFind(wordsMap);
    } else {
      setGameOver(true);
    }
  }, [words]);

  useEffect(() => {
    if (gameOver || timeLimit === 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameOver, timeLimit]);
  
  const handleGameOver = () => {
    setGameOver(true);
  };

  const handleClue = () => {
    const unfoundWords = Object.values(wordsToFind).filter((w: any) => !w.found);
    if (unfoundWords.length > 0) {
      const word = unfoundWords[Math.floor(Math.random() * unfoundWords.length)] as any;
      let posToReveal = word.positions[0];
      for (const pos of word.positions) {
        if (!revealedCells.has(pos)) {
          posToReveal = pos;
          break;
        }
      }
      setRevealedCells(prev => new Set(prev).add(posToReveal));
      setScore(s => Math.max(0, s - 30));
    }
  };

  useEffect(() => {
    if (gameOver) {
      const isSuccess = Object.values(wordsToFind).every((w: any) => w.found) && Object.keys(wordsToFind).length > 0;
      playSound(isSuccess ? 'level-complete' : 'game-over');
      const storedHighScore = parseInt(localStorage.getItem('wordSearchHighScore') || '0');
      if (score > storedHighScore) {
        localStorage.setItem('wordSearchHighScore', score.toString());
        setHighScore(score);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#ec4899', '#3b82f6']
        });
      } else {
        setHighScore(storedHighScore);
      }
      
      const wordsCount = Object.keys(wordsToFind).length;
      const configId = `WordSearch-${timeLimit}-${clueType}`;
      api.recordGameSession('Word Search', score, wordsCount * 100 || 1, configId);
    }
  }, [gameOver, score]);

  const allFound = Object.keys(wordsToFind).length > 0 && Object.values(wordsToFind).every((w: any) => w.found);
  useEffect(() => {
    if (allFound && !gameOver) {
      handleGameOver();
    }
  }, [allFound, gameOver]);


  const getCellId = (r: number, c: number) => `${r},${c}`;

  const handlePointerDown = (r: number, c: number) => {
    setIsDragging(true);
    setSelectedCells([getCellId(r, c)]);
  };

  const handlePointerEnter = (r: number, c: number) => {
    if (isDragging) {
      // Allow only straight lines horizontally, vertically, or diagonally.
      const current = getCellId(r, c);
      if (!selectedCells.includes(current)) {
         // simple line selection
         const start = selectedCells[0].split(',').map(Number);
         const sr = start[0], sc = start[1];
         
         const dr = r - sr;
         const dc = c - sc;
         
         const steps = Math.max(Math.abs(dr), Math.abs(dc));
         if (steps === 0) return;
         
         const stepR = dr / steps;
         const stepC = dc / steps;
         
         // Only integer steps (horizontal, vertical, diagonal)
         if (Number.isInteger(stepR) && Number.isInteger(stepC)) {
           const newSelection = [];
           for (let i = 0; i <= steps; i++) {
             newSelection.push(getCellId(sr + stepR * i, sc + stepC * i));
           }
           setSelectedCells(newSelection);
         }
      }
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    
    // Check if selected cells match any word
    let wordFound = null;
    let isReversed = false;
    
    const selectedSorted = [...selectedCells]; // order from start to end
    const selectedReversed = [...selectedCells].reverse();
    
    for (const key of Object.keys(wordsToFind)) {
      const matchWord = wordsToFind[key];
      if (matchWord.found) continue;
      
      const posStr = matchWord.positions.join('|');
      const selStr = selectedSorted.join('|');
      const selRevStr = selectedReversed.join('|');
      
      if (posStr === selStr || posStr === selRevStr) {
        wordFound = key;
        break;
      }
    }
    
    if (wordFound) {
      setWordsToFind((prev: any) => ({
        ...prev,
        [wordFound]: { ...prev[wordFound], found: true }
      }));
      let multiplier = 1;
      if (timeLimit === 60) multiplier *= 2;
      else if (timeLimit === 120) multiplier *= 1.5;
      else if (timeLimit === 0) multiplier *= 0.5;

      if (clueType === 'definition') multiplier *= 1.5;
      
      const points = Math.round(100 * multiplier);
      setScore(s => s + points);
      playSound('correct');
      
      // Celebration
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#a855f7', '#22c55e']
      });
    }
    
    setSelectedCells([]);
  };

  // Find all cells that are part of found words
  const foundCells = new Set<string>();
  Object.values(wordsToFind).forEach((w: any) => {
    if (w.found) {
      w.positions.forEach((pos: string) => foundCells.add(pos));
    }
  });

  if (gameOver) {
    const isSuccess = Object.values(wordsToFind).every((w: any) => w.found) && Object.keys(wordsToFind).length > 0;
    const wordsFoundCount = Object.values(wordsToFind).filter((w: any) => w.found).length;
    const totalWords = Object.keys(wordsToFind).length;

    return (
      <motion.div 
        initial={isSuccess 
          ? { opacity: 0, scale: 0.9, y: 50, filter: 'blur(10px)' } 
          : { opacity: 0, scale: 1.1, filter: 'blur(10px)' }} 
        animate={isSuccess 
          ? { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' } 
          : { opacity: 1, scale: 1, filter: 'blur(0px)', x: [-15, 15, -15, 15, 0] }} 
        transition={isSuccess 
          ? { type: "spring", bounce: 0.4, duration: 0.8 } 
          : { duration: 0.6, ease: "easeOut" }}
        className={`flex flex-col items-center justify-center min-h-full w-full p-6 md:p-12 relative z-50 overflow-y-auto ${isSuccess ? 'bg-gradient-to-b from-indigo-950 to-slate-950' : 'bg-slate-950/90 backdrop-blur-sm'}`}
      >
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-6">
          
          {/* Main Score Area */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-2xl p-10 md:p-14 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 inset-x-0 h-2 opacity-60 ${isSuccess ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500' : 'bg-gradient-to-r from-transparent via-rose-500 to-transparent'}`}></div>
            
            <h2 className={`text-4xl md:text-6xl font-black uppercase tracking-widest mb-6 ${isSuccess ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]' : 'text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]'} text-center text-balance`}>
              {isSuccess ? 'Victory!' : "Time's Up"}
            </h2>
            
            <p className="text-sm md:text-base font-semibold text-slate-400 uppercase tracking-[0.2em] mb-2">Final Score</p>
            <p className={`text-7xl md:text-9xl font-black text-white mb-4 ${isSuccess ? 'drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]' : 'drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]'}`}>{score}</p>
            
            {score >= highScore && score > 0 && (
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                transition={{ type: "spring", delay: 0.5 }}
                className="bg-amber-500/20 text-amber-300 px-6 py-2 rounded-full text-sm font-bold tracking-wider uppercase border border-amber-500/50 flex flex-row items-center gap-2 mb-8 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
              >
                <Trophy className="w-5 h-5" /> New High Score!
              </motion.div>
            )}
            
            <Button onClick={() => onGameOver(score)} size="lg" className={`mt-6 h-16 px-12 rounded-full text-xl shadow-lg font-bold hover:scale-105 transition-all w-full md:w-auto ${isSuccess ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 text-white' : 'shadow-rose-600/30 bg-rose-600 hover:bg-rose-500'}`}>
              Continue Exploring
            </Button>
          </div>

          {/* Analytics Area */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-slate-400">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="font-bold tracking-wide uppercase text-sm">Words Found</span>
              </div>
              <p className="text-4xl font-black text-white">{wordsFoundCount} <span className="text-base font-medium text-slate-500">of {totalWords}</span></p>
            </div>

            <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-slate-400">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="font-bold tracking-wide uppercase text-sm">Time Left</span>
              </div>
              <p className="text-4xl font-black text-white">{timeLeft}s</p>
            </div>

            <LeaderboardForGame configId={`WordSearch-${timeLimit}-${clueType}`} />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div 
      className="flex flex-col h-full items-center p-4 sm:p-8 relative touch-none select-none"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <div className="flex gap-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-3">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-500">Score</span>
              <span className="block text-xl font-black text-white leading-none">{score}</span>
            </div>
          </div>
          
          <Button 
            onClick={handleClue}
            className="bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-500/50 rounded-2xl h-auto py-3 px-6"
          >
            <div className="flex flex-col items-center">
               <span className="text-xs uppercase font-bold tracking-widest text-purple-400">Clue</span>
               <span className="text-sm font-black">-30 pts</span>
            </div>
          </Button>
        </div>

        {timeLimit > 0 && (
          <div className="bg-slate-900 border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-3">
            <Timer className={`h-5 w-5 ${timeLeft <= 30 ? 'text-red-500' : 'text-blue-500'}`} />
            <div className="min-w-[4rem]">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Time Left</span>
              <span className={`block text-xl font-black leading-none ${timeLeft <= 30 ? 'text-red-400' : 'text-white'}`}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl justify-center">
        {/* The Grid */}
        <div 
          className="bg-slate-900 p-2 sm:p-4 rounded-3xl border border-white/10 shadow-xl w-full max-w-lg aspect-square"
          onPointerMove={(e) => {
            if (!isDragging) return;
            const elem = document.elementFromPoint(e.clientX, e.clientY);
            if (!elem) return;
            const cellId = elem.getAttribute('data-cell');
            if (cellId) {
              const [r, c] = cellId.split(',').map(Number);
              handlePointerEnter(r, c);
            }
          }}
        >
          <div 
            className="grid gap-1 w-full h-full touch-none"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
          >
            {grid.map((row, r) => (
              row.map((char, c) => {
                const id = getCellId(r, c);
                const isSelected = selectedCells.includes(id);
                const isFound = foundCells.has(id);
                const isRevealed = revealedCells.has(id);
                
                return (
                   <div
                    key={id}
                    data-cell={id}
                    onPointerDown={(e) => { 
                      try {
                        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                          e.currentTarget.releasePointerCapture(e.pointerId); 
                        }
                      } catch(err) {} 
                      handlePointerDown(r, c); 
                    }}
                    onPointerEnter={() => handlePointerEnter(r, c)}
                    className={`
                      flex flex-col items-center justify-center 
                      rounded sm:rounded-lg font-black text-sm sm:text-xl md:text-2xl cursor-pointer
                      transition-colors duration-100 ease-out select-none
                      ${isSelected 
                        ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)] scale-105 z-10' 
                        : isFound 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : isRevealed
                            ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)] animate-pulse'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }
                    `}
                  >
                    {char}
                  </div>
                );
              })
            ))}
          </div>
        </div>

        {/* Word List */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-white/10 shadow-xl md:min-w-[250px] self-start md:self-stretch flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-purple-400">
            <Search className="w-5 h-5" />
            <h3 className="font-bold uppercase tracking-wider text-sm">Words to Find</h3>
          </div>
          <div className="flex flex-wrap md:flex-col gap-2 md:gap-3">
            {Object.values(wordsToFind).map((w: any) => (
              <div 
                key={w.id} 
                className={`
                  px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-300
                  ${w.found 
                    ? 'bg-green-500/10 text-green-500 border-green-500/20 line-through opacity-50' 
                    : 'bg-slate-800 text-slate-200 border-slate-700 shadow-sm'}
                `}
              >
                {clueType === 'translation' ? w.translation || w.word : clueType === 'definition' ? w.definition || w.word : w.word}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
