import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/lib/api';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { playSound } from '@/lib/audio';
import { Trophy, HelpCircle, CheckCircle, CheckCircle2, Clock, ArrowRight, Keyboard, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeaderboardForGame } from '@/components/LeaderboardForGame';

interface MiniCrosswordGameProps {
  words: { word: string; definition: string }[];
  timeLimit?: number;
  onGameOver: (score: number, maxScore: number) => void;
}

interface PlacedWord {
  id: number;
  word: string;
  definition: string;
  x: number;
  y: number;
  dir: 'H' | 'V';
  number: number; // For clues (e.g., "1 Across")
}

interface GridCell {
  char: string;
  wordIds: number[];
  x: number;
  y: number;
  number?: number;
  isFilled: boolean;
  value: string; // What the user typed
  isCorrect: boolean;
}

export function MiniCrosswordGame({ words, timeLimit = 300, onGameOver }: MiniCrosswordGameProps) {
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [gameStatus, setGameStatus] = useState<'playing' | 'gameover'>('playing');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [completedWordIds, setCompletedWordIds] = useState<number[]>([]);
  
  const gridSize = 15;
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate crossword layout
  useEffect(() => {
    generateCrossword();
  }, [words]);

  const generateCrossword = () => {
    setLoading(true);
    // 1. Sort words by length (longest first)
    // Only use up to 6 words to ensure it fits reasonably in a mini crossword
    const shuffledWords = [...words]
      .filter(w => !w.word.includes(' ') && !w.word.includes('-')) // Skip complex words
      .map(w => ({ ...w, word: w.word.toUpperCase() }))
      .sort((a, b) => b.word.length - a.word.length)
      .slice(0, 6);

    if (shuffledWords.length < 2) {
      setErrorMessage("Not enough simple words to generate a crossword.");
      setLoading(false);
      return;
    }

    const _placedWords: PlacedWord[] = [];
    const _grid: string[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));

    const canPlace = (wordStr: string, startX: number, startY: number, dir: 'H' | 'V') => {
      if (dir === 'H') {
        if (startX + wordStr.length > gridSize || startX < 0 || startY < 0 || startY >= gridSize) return false;
        
        // Bounds check before & after word
        if (startX > 0 && _grid[startY][startX - 1] !== '') return false;
        if (startX + wordStr.length < gridSize && _grid[startY][startX + wordStr.length] !== '') return false;

        for (let i = 0; i < wordStr.length; i++) {
          const x = startX + i;
          const char = wordStr[i];
          const existingChar = _grid[startY][x];

          if (existingChar === char) continue; // Intersection ok
          if (existingChar !== '') return false; // Collision

          // Check adjacent squares (top and bottom) for non-intersecting letters
          if (startY > 0 && _grid[startY - 1][x] !== '') return false;
          if (startY < gridSize - 1 && _grid[startY + 1][x] !== '') return false;
        }
      } else {
        if (startY + wordStr.length > gridSize || startY < 0 || startX < 0 || startX >= gridSize) return false;
        
        // Bounds check before & after word
        if (startY > 0 && _grid[startY - 1][startX] !== '') return false;
        if (startY + wordStr.length < gridSize && _grid[startY + wordStr.length][startX] !== '') return false;

        for (let i = 0; i < wordStr.length; i++) {
          const y = startY + i;
          const char = wordStr[i];
          const existingChar = _grid[y][startX];

          if (existingChar === char) continue; // Intersection ok
          if (existingChar !== '') return false; // Collision

          // Check adjacent squares (left and right) for non-intersecting letters
          if (startX > 0 && _grid[y][startX - 1] !== '') return false;
          if (startX < gridSize - 1 && _grid[y][startX + 1] !== '') return false;
        }
      }
      return true;
    };

    const placeWordInGrid = (wInfo: typeof shuffledWords[0], startX: number, startY: number, dir: 'H'|'V', id: number) => {
      for (let i = 0; i < wInfo.word.length; i++) {
        if (dir === 'H') _grid[startY][startX + i] = wInfo.word[i];
        else _grid[startY + i][startX] = wInfo.word[i];
      }
      _placedWords.push({
        id,
        word: wInfo.word,
        definition: wInfo.definition,
        x: startX,
        y: startY,
        dir,
        number: 0
      });
    };

    // Place first word in middle
    const firstWord = shuffledWords[0];
    const startX = Math.floor((gridSize - firstWord.word.length) / 2);
    const startY = Math.floor(gridSize / 2);
    placeWordInGrid(firstWord, startX, startY, 'H', 0);

    // Try to place the rest
    for (let i = 1; i < shuffledWords.length; i++) {
      const pWord = shuffledWords[i];
      let isPlaced = false;

      // Shuffle placed words for random intersections
      const currentPlaced = [..._placedWords].sort(() => Math.random() - 0.5);

      for (const placedWord of currentPlaced) {
        if (isPlaced) break; // Break out if placed
        // Find common letters
        for (let j = 0; j < pWord.word.length; j++) {
          const c = pWord.word[j];
          for (let k = 0; k < placedWord.word.length; k++) {
             if (placedWord.word[k] === c) {
               // Potential intersection!
               const intersectX = placedWord.dir === 'H' ? placedWord.x + k : placedWord.x;
               const intersectY = placedWord.dir === 'H' ? placedWord.y : placedWord.y + k;
               
               const newDir = placedWord.dir === 'H' ? 'V' : 'H';
               const newStartX = newDir === 'H' ? intersectX - j : intersectX;
               const newStartY = newDir === 'H' ? intersectY : intersectY - j;

               if (canPlace(pWord.word, newStartX, newStartY, newDir)) {
                 placeWordInGrid(pWord, newStartX, newStartY, newDir, i);
                 isPlaced = true;
                 break;
               }
             }
          }
          if (isPlaced) break;
        }
      }
    }

    // Now, post-process placed words to find bounds and center them visually
    // Oh wait, we just extract the active cells into a new grid structure

    // Assign clue numbers
    _placedWords.sort((a, b) => {
      if (a.y === b.y) return a.x - b.x;
      return a.y - b.y;
    });

    let currentClueNum = 1;
    for (let i = 0; i < _placedWords.length; i++) {
      // Check if another word starts at same x,y
      const sameStart = _placedWords.find(w => w !== _placedWords[i] && w.x === _placedWords[i].x && w.y === _placedWords[i].y);
      if (sameStart && _placedWords.indexOf(sameStart) < i) {
        _placedWords[i].number = sameStart.number;
      } else {
        _placedWords[i].number = currentClueNum++;
      }
    }

    const stateGrid: GridCell[][] = [];
    for (let y = 0; y < gridSize; y++) {
      const row: GridCell[] = [];
      for (let x = 0; x < gridSize; x++) {
        const char = _grid[y][x];
        if (char !== '') {
          const matchingWords = _placedWords.filter(w => {
            if (w.dir === 'H') return w.y === y && x >= w.x && x < w.x + w.word.length;
            if (w.dir === 'V') return w.x === x && y >= w.y && y < w.y + w.word.length;
            return false;
          });
          const startWord = matchingWords.find(w => w.x === x && w.y === y);
          
          row.push({
            char,
            wordIds: matchingWords.map(w => w.id),
            x,
            y,
            number: startWord?.number,
            isFilled: false,
            value: '',
            isCorrect: false
          });
        } else {
          row.push({ char: '', wordIds: [], x, y, isFilled: false, value: '', isCorrect: false });
        }
      }
      stateGrid.push(row);
    }
    
    // Bounds finding to trim the grid visually
    let minX = gridSize, maxX = 0, minY = gridSize, maxY = 0;
    stateGrid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell.char !== '') {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      });
    });

    const trimmedGrid = stateGrid.slice(minY, maxY + 1).map(row => row.slice(minX, maxX + 1));
    
    // Adjust x/y coords back in words and cells
    trimmedGrid.forEach((row, y) => {
      row.forEach(cell => {
        cell.x = cell.x - minX;
        cell.y = cell.y - minY;
      });
    });

    _placedWords.forEach(w => {
      w.x -= minX;
      w.y -= minY;
    });

    setGrid(trimmedGrid);
    setPlacedWords(_placedWords);
    
    if (_placedWords.length > 0) {
      handleSelectWord(-1, _placedWords[0]); // Select first word
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (timeLimit > 0 && gameStatus === 'playing') {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLimit, gameStatus]);

  const endGame = () => {
    if (gameStatus === 'gameover') return;
    setGameStatus('gameover');
    
    playSound('game-over');
    
    let totalCorrectWords = 0;
    placedWords.forEach(word => {
      let isWordCorrect = true;
      for (let i = 0; i < word.word.length; i++) {
        const cx = word.dir === 'H' ? word.x + i : word.x;
        const cy = word.dir === 'H' ? word.y : word.y + i;
        if (!grid[cy][cx].isCorrect) {
          isWordCorrect = false;
          break;
        }
      }
      if (isWordCorrect) totalCorrectWords++;
    });
    
    const finalScore = Math.max(0, totalCorrectWords * 500 + (timeRemaining > 0 ? Math.floor(timeRemaining * 2) : 0) - (hintsUsed * 50));
    const maxPossScore = placedWords.length * 500 + (timeLimit * 2);
    setScore(finalScore);
    
    // api record moved to when endGame is called
    const configId = `Crossword-${timeLimit}`;
    api.recordGameSession('Mini Crossword', finalScore, maxPossScore, configId);
  };

  // Unified key handling
  const processKey = (key: string) => {
    if (gameStatus !== 'playing' || !selectedCell) return;

    if (key === 'Backspace') {
      const newGrid = [...grid].map(row => [...row]);
      const cell = newGrid[selectedCell.y][selectedCell.x];
      
      if (cell.value !== '') {
        cell.value = '';
        cell.isCorrect = false;
      } else if (selectedWordId !== null) {
        // Move backward
        const currentWord = placedWords.find(w => w.id === selectedWordId);
        if (currentWord) {
          const cx = selectedCell.x;
          const cy = selectedCell.y;
          let nextX = cx;
          let nextY = cy;
          
          if (currentWord.dir === 'H') nextX = Math.max(currentWord.x, cx - 1);
          else nextY = Math.max(currentWord.y, cy - 1);
          
          if (nextX !== cx || nextY !== cy) {
             setSelectedCell({ x: nextX, y: nextY });
          }
        }
      }
      setGrid(newGrid);
    } else if (key.length === 1 && key.match(/[a-zA-Z]/)) {
      const char = key.toUpperCase();
      const newGrid = [...grid].map(row => [...row]);
      const cell = newGrid[selectedCell.y][selectedCell.x];
      cell.value = char;
      cell.isCorrect = char === cell.char;
      
      setGrid(newGrid);
      
      // Move forward automatically
      if (selectedWordId !== null) {
        const currentWord = placedWords.find(w => w.id === selectedWordId);
        if (currentWord) {
           const cx = selectedCell.x;
           const cy = selectedCell.y;
           let nextX = cx;
           let nextY = cy;
           
           if (currentWord.dir === 'H') nextX = Math.min(currentWord.x + currentWord.word.length - 1, cx + 1);
           else nextY = Math.min(currentWord.y + currentWord.word.length - 1, cy + 1);
           
           if (nextX !== cx || nextY !== cy) {
              setSelectedCell({ x: nextX, y: nextY });
           }
        }
      }
    } else if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowUp') {
       // Simple navigation based on cell neighbors
       let nx = selectedCell.x;
       let ny = selectedCell.y;
       
       if (key === 'ArrowRight' && nx < grid[0].length - 1 && grid[ny][nx+1].char !== '') nx++;
       if (key === 'ArrowLeft' && nx > 0 && grid[ny][nx-1].char !== '') nx--;
       if (key === 'ArrowDown' && ny < grid.length - 1 && grid[ny+1][nx].char !== '') ny++;
       if (key === 'ArrowUp' && ny > 0 && grid[ny-1][nx].char !== '') ny--;
       
       if (nx !== selectedCell.x || ny !== selectedCell.y) {
         setSelectedCell({x: nx, y: ny});
         const newCell = grid[ny][nx];
         if (selectedWordId !== null) {
            if (!newCell.wordIds.includes(selectedWordId)) {
               setSelectedWordId(newCell.wordIds[0]);
            }
         } else {
            setSelectedWordId(newCell.wordIds[0]);
         }
       }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
       // Prevent processing window events if we're focused on the hidden input, 
       // unless it's a structural key like arrows or backspace which we can handle here.
       // We'll let the hidden input handle composition.
       if (e.target === inputRef.current) {
          if (e.key === 'Backspace' || e.key.startsWith('Arrow')) {
              e.preventDefault();
              processKey(e.key);
          } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
              // Let the onChange handle regular character typing to avoid double execution on mobile vs desktop
              return;
          } else {
             return;
          }
       } else {
          // If not focused on input, process everything
          if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', ' '].includes(e.key)) {
             e.preventDefault();
          }
          processKey(e.key);
       }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, selectedCell, selectedWordId, placedWords]);

  useEffect(() => {
    // Check if puzzle is fully solved and track completed words
    if (!loading && grid.length > 0 && gameStatus === 'playing') {
      let isSolved = true;
      let newCompletedWordIds = [...completedWordIds];
      let didCompleteNewWord = false;

      placedWords.forEach(word => {
        let isWordCorrect = true;
        for (let i = 0; i < word.word.length; i++) {
          const cx = word.dir === 'H' ? word.x + i : word.x;
          const cy = word.dir === 'H' ? word.y : word.y + i;
          if (!grid[cy][cx].isCorrect) {
            isWordCorrect = false;
            break;
          }
        }
        
        if (isWordCorrect && !newCompletedWordIds.includes(word.id)) {
          newCompletedWordIds.push(word.id);
          didCompleteNewWord = true;
        }
      });

      if (didCompleteNewWord) {
         setCompletedWordIds(newCompletedWordIds);
         playSound('correct');
      }

      grid.forEach(row => row.forEach(cell => {
         if (cell.char !== '' && !cell.isCorrect) isSolved = false;
      }));
      
      if (isSolved) {
        playSound('level-complete');
        endGame();
      }
      
      // Update Live Score (words * 500 - hints * 50)
      const currentScore = Math.max(0, newCompletedWordIds.length * 500 - (hintsUsed * 50));
      setScore(currentScore);
    }
  }, [grid, gameStatus, loading, placedWords, completedWordIds, hintsUsed]);

  const handleCellClick = (x: number, y: number, cell: GridCell) => {
    if (gameStatus !== 'playing') return;
    
    inputRef.current?.focus();
    
    if (selectedCell?.x === x && selectedCell?.y === y) {
      // Toggle word direction if cell belongs to multiple words
      if (cell.wordIds.length > 1) {
        const nextIdIndex = (cell.wordIds.indexOf(selectedWordId!) + 1) % cell.wordIds.length;
        setSelectedWordId(cell.wordIds[nextIdIndex]);
      }
    } else {
      setSelectedCell({ x, y });
      if (!cell.wordIds.includes(selectedWordId!)) {
        setSelectedWordId(cell.wordIds[0]);
      }
    }
  };

  const handleSelectWord = (index: number, word: PlacedWord) => {
    setSelectedWordId(word.id);
    setSelectedCell({ x: word.x, y: word.y });
  };

  const handleHint = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (gameStatus !== 'playing' || !selectedCell || score <= 0) return;
    
    const newGrid = [...grid].map(row => [...row]);
    let foundCell = null;
    let newSelectedCell = null;
    
    if (selectedWordId !== null) {
       const word = placedWords.find(w => w.id === selectedWordId);
       if (word) {
         for (let i = 0; i < word.word.length; i++) {
           const cx = word.dir === 'H' ? word.x + i : word.x;
           const cy = word.dir === 'H' ? word.y : word.y + i;
           if (!newGrid[cy][cx].isCorrect) {
             foundCell = newGrid[cy][cx];
             newSelectedCell = { x: cx, y: cy };
             break;
           }
         }
       }
    }
    
    if (!foundCell && !newGrid[selectedCell.y][selectedCell.x].isCorrect) {
       foundCell = newGrid[selectedCell.y][selectedCell.x];
    }

    if (foundCell && !foundCell.isCorrect) {
       foundCell.value = foundCell.char;
       foundCell.isCorrect = true;
       setHintsUsed(hintsUsed + 1); // Avoid functional update double invocation side-effects just in case
       if (newSelectedCell) {
           setSelectedCell(newSelectedCell);
       }
       playSound('correct');
       setGrid(newGrid);
    }
  };

  if (gameStatus === 'gameover') {
    const isSuccess = completedWordIds.length === placedWords.length && placedWords.length > 0;
    const wordsFoundCount = completedWordIds.length;
    const totalWords = placedWords.length;
    const maxPossScore = placedWords.length * 500 + (timeLimit * 2);

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
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mt-6">
          
          {/* Main Score Area */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 inset-x-0 h-2 opacity-60 ${isSuccess ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500' : 'bg-gradient-to-r from-transparent via-rose-500 to-transparent'}`}></div>
            
            <h2 className={`text-4xl md:text-5xl font-black uppercase tracking-widest mb-4 ${isSuccess ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]' : 'text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]'} text-center text-balance`}>
              {isSuccess ? 'Victory!' : "Time's Up"}
            </h2>
            
            <p className="text-xs md:text-sm font-semibold text-slate-400 uppercase tracking-[0.2em] mb-2">Final Score</p>
            <p className={`text-6xl md:text-8xl font-black text-white mb-4 ${isSuccess ? 'drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]' : 'drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]'}`}>{score}</p>
            
            <Button onClick={() => onGameOver(score, maxPossScore)} size="lg" className={`mt-4 h-14 px-10 rounded-full text-lg shadow-lg font-bold hover:scale-105 transition-all w-full md:w-auto ${isSuccess ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 text-white' : 'shadow-rose-600/30 bg-rose-600 hover:bg-rose-500'}`}>
              Continue Exploring
            </Button>
          </div>

          {/* Analytics Area */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="bg-slate-900/40 p-4 md:p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-1 text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-bold tracking-wide uppercase text-xs">Words Solved</span>
              </div>
              <p className="text-3xl font-black text-white">{wordsFoundCount} <span className="text-sm font-medium text-slate-500">of {totalWords}</span></p>
            </div>

            <div className="bg-slate-900/40 p-4 md:p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-1 text-slate-400">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="font-bold tracking-wide uppercase text-xs">Time Left</span>
              </div>
              <p className="text-3xl font-black text-white">{Math.ceil(timeRemaining)}s</p>
            </div>

            <LeaderboardForGame configId={`Crossword-${timeLimit}`} limit={4} />
          </div>
        </div>
      </motion.div>
    );
  }

  if (loading) {
     return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-lg border border-slate-100 min-h-[400px]">
           <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
           <p className="text-slate-600 font-medium">Generating Mini Crossword...</p>
        </div>
     );
  }

  if (errorMessage) {
     return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-lg border border-rose-100 min-h-[400px]">
           <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-xl">⚠️</span>
           </div>
           <p className="text-rose-600 font-bold mb-2">{errorMessage}</p>
           <button 
              onClick={() => onGameOver(0, 0)}
              className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
           >
              Return to Menu
           </button>
        </div>
     );
  }

  const selectedWordInfo = placedWords.find(w => w.id === selectedWordId);

  return (
    <div className="max-w-5xl mx-auto w-full h-full flex flex-col min-h-0 pb-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="relative">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
              <circle
                cx="28" cy="28" r="24"
                stroke="currentColor" strokeWidth="4" fill="transparent"
                strokeDasharray={24 * 2 * Math.PI}
                strokeDashoffset={24 * 2 * Math.PI * (1 - timeRemaining / timeLimit)}
                className={`${timeRemaining < 30 ? 'text-rose-500' : 'text-indigo-500'} transition-all duration-1000 ease-linear`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-slate-700">{Math.ceil(timeRemaining)}</span>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">Mini Crossword</h2>
            <div className="flex items-center gap-2">
              <SoundToggle />
              <span className="text-slate-500 text-sm font-medium border-l border-slate-300 pl-2">Score: {score}</span>
            </div>
          </div>
        </div>
        
        {selectedWordInfo && gameStatus === 'playing' && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 max-w-md w-full animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-2 justify-between">
              <div className="flex items-start gap-2">
                <span className="font-black text-indigo-400 mt-0.5">{selectedWordInfo.number}{selectedWordInfo.dir}</span>
                <p className="text-indigo-900 font-medium text-sm">
                  "{selectedWordInfo.definition}"
                </p>
              </div>
              <button 
                onClick={handleHint}
                disabled={score <= 0}
                className="bg-indigo-200 hover:bg-indigo-300 text-indigo-800 text-xs font-bold px-2 py-1 rounded transition-colors whitespace-nowrap flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hint (-50)
              </button>
            </div>
            <div className="mt-2 text-xs font-bold text-indigo-400 tracking-wider uppercase">
               Length: {selectedWordInfo.word.length} letters
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Crossword Grid */}
        <div className="flex-1 bg-slate-50 rounded-2xl p-2 sm:p-4 border-2 border-slate-200 flex items-center justify-center shadow-inner min-h-[300px] lg:min-h-0 overflow-hidden relative w-full h-full">
           <div 
             className="relative user-select-none" 
             style={{ 
               touchAction: 'none',
               display: 'grid',
               gridTemplateColumns: `repeat(${grid[0]?.length || 1}, minmax(0, 1fr))`,
               gridTemplateRows: `repeat(${grid.length || 1}, minmax(0, 1fr))`,
               aspectRatio: `${grid[0]?.length || 1} / ${grid.length || 1}`,
               width: '100%',
               maxWidth: 'calc(100vh - 300px)', // A fallback max-width relative to height to help aspect-ratio
               maxHeight: '100%',
               margin: 'auto',
               gap: '1px',
               backgroundColor: '#0f172a', // slate-900
               border: '1px solid #0f172a'
             }}
           >
              {grid.flatMap((row, y) => 
                  row.map((cell, x) => {
                    const isCellEmpty = cell.char === '';
                    const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                    const isPartOfSelectedWord = selectedWordId !== null && cell.wordIds.includes(selectedWordId);
                    
                    return (
                      <div 
                        key={`${x}-${y}`}
                        onClick={() => !isCellEmpty && handleCellClick(x, y, cell)}
                        className={`
                          relative flex items-center justify-center text-xl md:text-2xl font-bold font-mono transition-all duration-200
                          ${isCellEmpty ? 'bg-transparent' : 'bg-white cursor-pointer'}
                          ${!isCellEmpty && isSelected ? 'bg-amber-200 z-10 ring-4 ring-amber-400/50 scale-105' : ''}
                          ${!isCellEmpty && !isSelected && isPartOfSelectedWord ? 'bg-amber-50' : ''}
                          ${cell.isCorrect ? 'text-emerald-500' : 'text-slate-800'}
                          ${gameStatus === 'gameover' && cell.isCorrect ? 'bg-emerald-50' : ''}
                        `}
                      >
                         {/* Clue Number */}
                         {cell.number && !isCellEmpty && (
                           <span className="absolute top-0.5 left-0.5 text-[8px] sm:text-[10px] leading-none font-bold text-slate-500 select-none pointer-events-none">
                              {cell.number}
                           </span>
                         )}
                         {/* Value */}
                         {(!isCellEmpty && cell.value !== '') && (
                            <motion.span 
                               initial={{ scale: 0.5, opacity: 0 }}
                               animate={{ scale: 1, opacity: 1 }}
                            >
                               {cell.value}
                            </motion.span>
                         )}
                         {/* Answer reveal on GameOver */}
                         {(gameStatus === 'gameover' && !isCellEmpty && !cell.isCorrect) && (
                            <span className="text-rose-500 line-through decoration-rose-300 opacity-60">
                               {cell.char}
                            </span>
                         )}
                      </div>
                    );
                  })
              )}
           </div>
        </div>

        {/* Clues */}
        <div className="lg:w-80 flex flex-col gap-4 flex-1 min-h-[250px] lg:min-h-0">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="bg-slate-900 text-white p-3 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              Across
            </div>
            <div className="p-2 flex-1 overflow-y-auto">
               {placedWords.filter(w => w.dir === 'H').map((word, idx) => (
                 <div 
                   key={word.id}
                   onClick={() => handleSelectWord(idx, word)}
                   className={`
                     p-3 rounded-lg mb-2 text-sm cursor-pointer transition-colors border
                     ${selectedWordId === word.id ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50'}
                   `}
                 >
                   <span className="font-black text-slate-500 mr-2">{word.number}.</span>
                   <span className={selectedWordId === word.id ? 'text-amber-900 font-medium' : 'text-slate-700'}>{word.definition}</span>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="bg-slate-900 text-white p-3 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              Down
            </div>
            <div className="p-2 flex-1 overflow-y-auto">
               {placedWords.filter(w => w.dir === 'V').map((word, idx) => (
                 <div 
                   key={word.id}
                   onClick={() => handleSelectWord(idx, word)}
                   className={`
                     p-3 rounded-lg mb-2 text-sm cursor-pointer transition-colors border
                     ${selectedWordId === word.id ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50'}
                   `}
                 >
                   <span className="font-black text-slate-500 mr-2">{word.number}.</span>
                   <span className={selectedWordId === word.id ? 'text-amber-900 font-medium' : 'text-slate-700'}>{word.definition}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Keyboard Warning */}
      <div className="mt-6 md:hidden bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3">
         <Keyboard className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
         <p className="text-xs text-blue-800 font-medium leading-relaxed">
            Please use your device's virtual keyboard to type letters. Tap a square to select a word.
         </p>
      </div>
      
      {/* Hidden input to bring up on-screen keyboard on mobile when cell is selected */}
      <input 
         ref={inputRef}
         type="text" 
         className="absolute opacity-0 top-0 pointer-events-none" 
         autoFocus 
         value={selectedCell ? grid[selectedCell.y]?.[selectedCell.x]?.value || '' : ''}
         onChange={(e) => {
            const val = e.target.value;
            // Native backspace and arrows are handled by the physical keydown.
            // On mobile, if deleting, the value is simply an empty string.
            if (val.length === 0) {
               // Backspace on virtual keyboard is tracked by keydown anyway, 
               // but we can ensure processKey('Backspace') clears the cell.
               return; 
            }
            const lastChar = val.slice(-1);
            if (lastChar.match(/[a-zA-Z]/)) {
               processKey(lastChar);
            }
         }}
      />
    </div>
  );
}
