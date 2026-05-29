import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, MousePointerClick, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { LeaderboardForGame } from '@/components/LeaderboardForGame';

interface Word {
  id: string;
  word: string;
  translation: string;
  definition: string;
}

interface MemoryMatchGameProps {
  words: Word[];
  previewTime?: number;
  timeLimit?: number;
  onGameOver: (score: number) => void;
}

interface CardType {
  id: string;
  matchId: string;
  text: string;
  type: 'word' | 'meaning';
}

export function MemoryMatchGame({ words, previewTime = 0, timeLimit = 0, onGameOver }: MemoryMatchGameProps) {
  const [cards, setCards] = useState<CardType[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [roundEnd, setRoundEnd] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [isPreview, setIsPreview] = useState(previewTime > 0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  
  // Stats
  const startTimeRef = useRef<number>(Date.now());
  const [timePassed, setTimePassed] = useState(0);
  
  // Timer for time attack
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    // Generate cards when words change
    const newCards: CardType[] = [];
    words.forEach(w => {
      newCards.push({
        id: `${w.id}-word`,
        matchId: w.id,
        text: w.word,
        type: 'word'
      });
      newCards.push({
        id: `${w.id}-meaning`,
        matchId: w.id,
        text: w.translation || w.definition,
        type: 'meaning'
      });
    });
    
    // Shuffle
    for (let i = newCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
    }
    
    setCards(newCards);
    setFlippedIds([]);
    setMatchedIds([]);
    setMoves(0);
    setScore(0);
    setRoundEnd(false);
    setIsTimeUp(false);
    setIsPreview(previewTime > 0);
    setTimeLeft(timeLimit);
    startTimeRef.current = Date.now();
  }, [words, previewTime, timeLimit]);

  useEffect(() => {
    if (previewTime > 0) {
      setIsPreview(true);
      const timer = setTimeout(() => {
        setIsPreview(false);
        startTimeRef.current = Date.now(); // reset start time to after preview ends
      }, previewTime * 1000);
      return () => clearTimeout(timer);
    } else {
      setIsPreview(false);
      startTimeRef.current = Date.now();
    }
  }, [words, previewTime]);

  useEffect(() => {
    if (roundEnd || isPreview) return;
    
    const interval = setInterval(() => {
      const passed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimePassed(passed);
      
      if (timeLimit > 0) {
        const remaining = timeLimit - passed;
        setTimeLeft(remaining > 0 ? remaining : 0);
        if (remaining <= 0) {
          setRoundEnd(true);
          setIsTimeUp(true);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [roundEnd, isPreview, timeLimit]);

  useEffect(() => {
    if (cards.length > 0 && matchedIds.length === words.length) {
      setRoundEnd(true);
    }
  }, [matchedIds, words.length, cards.length]);

  useEffect(() => {
    if (roundEnd) {
      const storedHighScore = parseInt(localStorage.getItem('memoryMatchHighScore') || '0', 10);
      if (score > storedHighScore) {
        localStorage.setItem('memoryMatchHighScore', score.toString());
        setHighScore(score);
      } else {
        setHighScore(storedHighScore);
      }
      const configId = `MemoryMatch-${previewTime}-${timeLimit}`;
      api.recordGameSession('Memory Match', score, words.length * 150, configId);
      
      const isSuccess = matchedIds.length >= words.length;
      if (isSuccess) {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#3b82f6', '#10b981', '#f59e0b']
        });
      }
    }
  }, [roundEnd, score, words.length, matchedIds.length]);

  const handleCardClick = (id: string) => {
    if (isPreview || flippedIds.length >= 2 || flippedIds.includes(id)) return;
    const card = cards.find(c => c.id === id);
    if (!card || matchedIds.includes(card.matchId)) return;
    
    // ... rest is same
    const newFlippedIds = [...flippedIds, id];
    setFlippedIds(newFlippedIds);

    if (newFlippedIds.length === 2) {
      const currentMoves = moves + 1;
      setMoves(currentMoves);
      const card1 = cards.find(c => c.id === newFlippedIds[0]);
      const card2 = cards.find(c => c.id === newFlippedIds[1]);

      if (card1 && card2 && card1.matchId === card2.matchId) {
        // match!
        setTimeout(() => {
          setMatchedIds(prev => [...prev, card1.matchId]);
          setScore(s => s + 100 + Math.max(0, 50 - currentMoves * 2));
          setFlippedIds([]);
        }, 500);
      } else {
        // no match
        setTimeout(() => {
          setFlippedIds(prev => {
            if (prev.length === 2 && prev[0] === newFlippedIds[0] && prev[1] === newFlippedIds[1]) {
              return [];
            }
            return prev;
          });
        }, 1000);
      }
    }
  };

  if (roundEnd) {
    const isSuccess = matchedIds.length >= words.length;
    const accuracy = moves > 0 ? Math.round((matchedIds.length / moves) * 100) : 0;

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
              {isSuccess ? 'Victory!' : "Game Over"}
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
                <Target className="w-5 h-5 text-emerald-500" />
                <span className="font-bold tracking-wide uppercase text-sm">Accuracy</span>
              </div>
              <p className="text-4xl font-black text-white">{accuracy}%</p>
              <p className="text-sm font-medium text-slate-500 mt-2">{matchedIds.length} matches / {moves} moves</p>
            </div>

            <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-slate-400">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="font-bold tracking-wide uppercase text-sm">Time</span>
              </div>
              <p className="text-4xl font-black text-white">{timePassed}s</p>
            </div>

            <LeaderboardForGame configId={`MemoryMatch-${previewTime}-${timeLimit}`} />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center p-4 sm:p-8 pt-6">
      {/* Top Bar */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-8 bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Score</span>
            <span className="text-2xl font-black text-rose-400 tracking-tight">{score}</span>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Moves</span>
            <span className="text-2xl font-black text-white tracking-tight">{moves}</span>
          </div>
        </div>
        <div className={`flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-xl font-mono font-bold ${timeLimit > 0 && timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-rose-300'}`}>
          <Clock className="w-5 h-5" />
          <span>
            {timeLimit > 0 ? (
              <>
                {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:
                {(timeLeft % 60).toString().padStart(2, '0')}
              </>
            ) : (
              <>
                {Math.floor(timePassed / 60).toString().padStart(2, '0')}:
                {(timePassed % 60).toString().padStart(2, '0')}
              </>
            )}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="w-full max-w-5xl flex-1 flex items-center justify-center pb-8">
        <div className={`grid grid-cols-4 sm:grid-cols-5 gap-3 max-w-full`}>
          <AnimatePresence>
            {cards.map(card => {
              const isMatched = matchedIds.includes(card.matchId);
              const isFlipped = isPreview || flippedIds.includes(card.id) || isMatched;
              
              return (
                <motion.div
                  key={card.id}
                  className="relative [perspective:1000px] select-none"
                  style={{ width: 'clamp(60px, 15vw, 120px)', height: 'clamp(80px, 20vw, 160px)' }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: isFlipped ? 1.05 : 1.1, translateY: isFlipped ? 0 : -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="w-full h-full relative [transform-style:preserve-3d] cursor-pointer shadow-lg rounded-xl sm:rounded-2xl"
                    initial={false}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
                    onClick={() => handleCardClick(card.id)}
                  >
                    {/* Front of card (hidden, showing logo/pattern) */}
                    <div 
                      className="absolute inset-0 [backface-visibility:hidden] bg-gradient-to-br from-rose-600 via-rose-500 to-pink-600 rounded-xl sm:rounded-2xl flex items-center justify-center border-2 border-rose-400/50 shadow-[inset_0_0_20px_rgba(255,255,255,0.2)] overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-[bg-pan_3s_linear_infinite]"></div>
                      <span className="text-white/40 font-black text-4xl sm:text-5xl drop-shadow-md z-10 transition-transform duration-300 hover:scale-110">?</span>
                    </div>

                    {/* Back of card (revealed text) */}
                    <div 
                      className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl sm:rounded-2xl flex items-center justify-center p-3 text-center border-2 border-b-4 z-10 transition-all duration-300 ${
                        isMatched 
                        ? 'bg-gradient-to-b from-rose-50 to-rose-100 border-rose-400 text-rose-800 shadow-[0_0_20px_rgba(244,63,94,0.3)] scale-105' 
                        : 'bg-gradient-to-b from-white to-slate-50 border-slate-200 text-slate-800 shadow-xl shadow-black/10'
                      }`}
                    >
                      {isMatched && (
                        <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-rose-400 animate-ping opacity-20 pointer-events-none"></div>
                      )}
                      <span className="font-bold text-sm sm:text-base leading-tight drop-shadow-sm z-20">
                        {card.text}
                      </span>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
