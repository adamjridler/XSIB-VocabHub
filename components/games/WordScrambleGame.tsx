import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Timer, Trophy, Heart, Target } from 'lucide-react';
import { SoundToggle } from '@/components/ui/SoundToggle';
import confetti from 'canvas-confetti';
import { api } from '@/lib/api';
import { LeaderboardForGame } from '@/components/LeaderboardForGame';
import { playSound } from '@/lib/audio';

interface WordScrambleGameProps {
  words: any[];
  timeLimit: number;
  mode: 'translation' | 'definition';
  onGameOver: (score: number) => void;
}

export function WordScrambleGame({ words, timeLimit, mode, onGameOver }: WordScrambleGameProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [scrambledWords, setScrambledWords] = useState<{ id: string, chars: { id: string, char: string }[] }[]>([]);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);

  const gameWordsRef = useRef<any[]>([]);
  const timeSpentRef = useRef(0);
  const statsRef = useRef({ correct: 0, wrong: 0 });
  const isSuccess = gameOver && lives > 0 && gameWordsRef.current.length > 0 && currentWordIndex >= gameWordsRef.current.length;

  useEffect(() => {
    if (words.length > 0) {
      gameWordsRef.current = [...words].sort(() => Math.random() - 0.5);
      setupWord(0);
    } else {
      setGameOver(true);
    }
  }, [words]);

  useEffect(() => {
    if (gameOver || feedback) return;

    const timer = setInterval(() => {
      timeSpentRef.current += 1;
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentWordIndex, gameOver, feedback]);

  const setupWord = (index: number) => {
    if (index >= gameWordsRef.current.length) {
      setGameOver(true);
      return;
    }
    const wordObj = gameWordsRef.current[index];
    const wordsList = wordObj.word.toUpperCase().trim().split(/\s+/);
    
    // Scramble logic
    const newScrambledWords = wordsList.map((wordPart: string, wIdx: number) => {
      let chars = wordPart.split('');
      let scrambled = [...chars];
      let attempts = 0;
      while (scrambled.join('') === chars.join('') && attempts < 10 && chars.length > 1) {
        scrambled.sort(() => Math.random() - 0.5);
        attempts++;
      }
      return {
        id: `word-${wIdx}-${Date.now()}`,
        chars: scrambled.map((c, i) => ({ id: `scrambled-${wIdx}-${i}-${Date.now()}`, char: c }))
      };
    });

    setScrambledWords(newScrambledWords);
    setTimeLeft(timeLimit);
    setFeedback(null);
  };

  const handleTimeOut = () => {
    setFeedback('wrong');
    statsRef.current.wrong += 1;
    setTimeout(() => {
      setLives(prev => {
        if (prev <= 1) {
          setGameOver(true);
          return 0;
        } else {
          moveToNextWord();
          return prev - 1;
        }
      });
    }, 1500);
  };

  const checkAnswer = (currentScrambledWords: typeof scrambledWords) => {
    if (feedback) return;
    const wordObj = gameWordsRef.current[currentWordIndex];
    const targetWords = wordObj.word.toUpperCase().trim().split(/\s+/);
    
    const isCorrect = currentScrambledWords.every((sw, i) => {
       return sw.chars.map(l => l.char).join('') === targetWords[i];
    });

    if (isCorrect) {
      statsRef.current.correct += 1;
      setFeedback('correct');
      let multiplier = 1;
      if (timeLimit === 10) multiplier = 2;
      else if (timeLimit === 20) multiplier = 1.5;
      
      if (mode === 'definition') multiplier *= 1.5;
      
      const points = Math.round((300 + Math.max(0, timeLeft) * 30) * multiplier);
      setScore(s => s + points);
      playSound('correct');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#a855f7', '#3b82f6', '#ec4899']
      });
      setTimeout(() => {
        moveToNextWord();
      }, 1500);
    }
  };

  const handleReorder = (wordIndex: number, newOrder: { id: string, char: string }[]) => {
    if (feedback) return;
    const newScrambledWords = [...scrambledWords];
    newScrambledWords[wordIndex].chars = newOrder;
    setScrambledWords(newScrambledWords);
    checkAnswer(newScrambledWords);
  };

  const moveToNextWord = () => {
    const nextIdx = currentWordIndex + 1;
    setCurrentWordIndex(nextIdx);
    setupWord(nextIdx);
  };

  const currentWordObj = gameWordsRef.current[currentWordIndex];

  useEffect(() => {
    if (gameOver) {
      playSound(isSuccess ? 'level-complete' : 'game-over');
      const storedHighScore = parseInt(localStorage.getItem('wordScrambleHighScore') || '0', 10);
      if (score > storedHighScore) {
        localStorage.setItem('wordScrambleHighScore', score.toString());
        setHighScore(score);
      } else {
        setHighScore(storedHighScore);
      }
      
      const wordsCount = gameWordsRef.current.length || 1;
      let expectedMultiplier = 1;
      if (timeLimit === 10) expectedMultiplier = 2;
      else if (timeLimit === 20) expectedMultiplier = 1.5;
      if (mode === 'definition') expectedMultiplier *= 1.5;
      const maxPtsPerWord = Math.round((300 + timeLimit * 30) * expectedMultiplier);
      const configId = `WordScramble-${mode}-${timeLimit}`;
      api.recordGameSession('Word Scramble', score, wordsCount * maxPtsPerWord, configId);

      if (isSuccess) {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#3b82f6', '#10b981', '#f59e0b']
        });
      }
    }
  }, [gameOver, score, timeLimit, isSuccess]);

  if (gameOver) {
    const accuracy = Math.round((statsRef.current.correct / Math.max(1, statsRef.current.correct + statsRef.current.wrong)) * 100);
    const wordsPerMinute = timeSpentRef.current > 0 ? Math.round((statsRef.current.correct / (timeSpentRef.current / 60))) : 0;
    
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
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Main Score Area */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-2xl p-10 md:p-14 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 inset-x-0 h-2 opacity-60 ${isSuccess ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500' : 'bg-gradient-to-r from-transparent via-rose-500 to-transparent'}`}></div>
            
            <h2 className={`text-4xl md:text-6xl font-black uppercase tracking-widest mb-6 ${isSuccess ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]' : 'text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]'}`}>
              {isSuccess ? 'Victory!' : 'Game Over'}
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
            
            <Button onClick={() => onGameOver(score)} size="lg" className={`mt-6 h-16 px-12 rounded-full text-xl shadow-lg font-bold hover:scale-105 transition-all w-full md:w-auto ${isSuccess ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 text-white' : 'shadow-purple-600/30 bg-purple-600 hover:bg-purple-500'}`}>
              Continue Exploring
            </Button>
          </div>

          {/* Analytics Area */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-slate-400">
                <Target className="w-5 h-5 text-blue-400" />
                <span className="font-bold tracking-wide uppercase text-sm">Accuracy</span>
              </div>
              <p className="text-4xl font-black text-white">{accuracy}%</p>
              <p className="text-sm font-medium text-slate-500 mt-2">{statsRef.current.correct} correct, {statsRef.current.wrong} mistakes</p>
            </div>

            <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-slate-400">
                <Timer className="w-5 h-5 text-purple-400" />
                <span className="font-bold tracking-wide uppercase text-sm">Pace</span>
              </div>
              <p className="text-4xl font-black text-white">{wordsPerMinute}</p>
              <p className="text-sm font-medium text-slate-500 mt-2">Correct words per minute</p>
            </div>

            <LeaderboardForGame configId={`WordScramble-${mode}-${timeLimit}`} />
          </div>
        </div>
      </motion.div>
    );
  }

  if (!currentWordObj) return null;

  return (
    <div className="flex flex-col h-full bg-slate-950 p-4 sm:p-6 overflow-hidden items-center relative">
      <div className="w-full max-w-2xl flex flex-none items-center justify-between bg-slate-900/50 p-4 rounded-3xl border border-white/10 mb-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="bg-purple-500/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-purple-500/30 flex items-center gap-2">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 shrink-0" />
            <span className="font-bold sm:text-lg text-purple-100">{score}</span>
          </div>
          <div className="bg-red-500/20 px-2 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-red-500/30 flex items-center gap-1 sm:gap-2">
            {[...Array(3)].map((_, i) => (
              <Heart key={i} className={`w-3 h-3 sm:w-5 sm:h-5 shrink-0 ${i < lives ? 'fill-red-500 text-red-500' : 'text-red-500/30'}`} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs sm:text-sm xl:text-base font-medium hidden sm:inline-block">Word {currentWordIndex + 1} / {gameWordsRef.current.length}</span>
          <div className="flex items-center gap-2">
            <SoundToggle />
            <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl border flex items-center gap-2 font-bold sm:text-lg transition-colors shrink-0
              ${timeLeft <= 5 ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
              <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
              {timeLeft}s
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center space-y-4 sm:space-y-8 min-h-0 pt-2 sm:pt-4">
        <div className="text-center space-y-2 sm:space-y-4 shrink-0 w-full px-4 overflow-hidden">
          <p className="text-slate-400 uppercase tracking-widest text-xs sm:text-sm font-bold">Drag and drop to unscramble</p>
          <div className="text-lg sm:text-2xl md:text-3xl font-bold p-3 sm:p-6 bg-white/5 rounded-2xl sm:rounded-3xl border border-white/10 max-w-2xl mx-auto text-center text-blue-200 leading-snug break-words">
            {mode === 'translation' ? (currentWordObj.translation || currentWordObj.definition) : (currentWordObj.definition || currentWordObj.translation)}
          </div>
        </div>

        <div className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-4rem)] max-w-7xl shrink min-h-0 flex-1 flex flex-wrap justify-center items-center content-center overflow-auto scrollbar-none px-2 sm:px-4 gap-y-6 pb-8 pt-4">
          {scrambledWords.map((word, wIdx) => (
            <React.Fragment key={word.id}>
              {wIdx > 0 && (
                <div className="flex items-center justify-center shrink-0 w-6 sm:w-8 lg:w-12 h-10 sm:h-12 lg:h-16 mx-1 sm:mx-2 lg:mx-3">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-white/20"></div>
                </div>
              )}
              <Reorder.Group 
                axis="x"
                values={word.chars}
                onReorder={(newOrder) => handleReorder(wIdx, newOrder)}
                className="flex items-center justify-center gap-1.5 sm:gap-2 lg:gap-3 pb-2 shrink-0 max-w-full overflow-x-auto overflow-y-visible scrollbar-none px-1"
              >
                <AnimatePresence mode="popLayout">
                  {word.chars.map((l) => (
                    <Reorder.Item
                      key={l.id}
                      value={l}
                      className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 text-base sm:text-xl lg:text-3xl font-black rounded-lg lg:rounded-2xl transition-colors shrink-0
                        shadow-[0_4px_0_0_rgb(88,28,135)] bg-purple-600 border-2 border-purple-400 text-white flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-purple-500
                        ${feedback === 'correct' ? '!bg-green-500 !border-green-400 !shadow-[0_4px_0_0_rgb(21,128,61)]' : ''}
                        ${feedback === 'wrong' ? '!bg-red-500 !border-red-400 !shadow-[0_4px_0_0_rgb(185,28,28)]' : ''}`}
                    >
                      {l.char}
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
