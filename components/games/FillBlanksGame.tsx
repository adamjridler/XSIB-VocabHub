import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Trophy, Target, BookOpen, Clock } from 'lucide-react';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/lib/api';
import { LeaderboardForGame } from '@/components/LeaderboardForGame';
import { playSound } from '@/lib/audio';

interface FillBlanksGameProps {
  words: any[];
  mode: 'typing' | 'multiple-choice';
  onGameOver: (score: number) => void;
}

export function FillBlanksGame({ words, mode, onGameOver }: FillBlanksGameProps) {
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [roundEnd, setRoundEnd] = useState(false);
  const [paragraph, setParagraph] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Record<number, 'correct' | 'wrong' | null>>({});

  const statsRef = useRef({
    blanksFilledCorrectly: 0,
    blanksFilledWrong: 0,
    paragraphsCompleted: 0,
  });

  useEffect(() => {
    if (lives <= 0 || timeLeft <= 0) {
      setRoundEnd(true);
    }
  }, [lives, timeLeft]);

  // Timer
  useEffect(() => {
    if (roundEnd || loading) return;
    const interval = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [roundEnd, loading]);

  const loadNewParagraph = async () => {
    setLoading(true);
    try {
      const wordsToUse = words.sort(() => Math.random() - 0.5).slice(0, 5).map(w => w.word);
      const res = await api.generateBlanks(wordsToUse);
      setParagraph(res.text);
      setAnswers(res.answers);
      setUserAnswers({});
      setFeedback({});
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNewParagraph();
  }, [words]);

  const handleInput = (index: number, val: string) => {
    setUserAnswers(prev => ({ ...prev, [index]: val }));
    // reset feedback for this blank if typing
    if (mode === 'typing') {
      setFeedback(prev => ({ ...prev, [index]: null }));
    }
  };

  const handleCheckAnswers = () => {
    let allCorrect = true;
    let newFeedback: Record<number, 'correct' | 'wrong'> = {};
    let newScore = score;
    let wrongCount = 0;
    
    let newCorrectStats = 0;
    let newWrongStats = 0;

    answers.forEach((ans, i) => {
      const userAnswer = (userAnswers[i] || '').trim().toLowerCase();
      if (userAnswer === ans.toLowerCase()) {
        newFeedback[i] = 'correct';
        newScore += (mode === 'typing' ? 100 : 50);
        newCorrectStats++;
      } else {
        newFeedback[i] = 'wrong';
        wrongCount++;
        allCorrect = false;
        newWrongStats++;
      }
    });

    statsRef.current.blanksFilledCorrectly += newCorrectStats;
    statsRef.current.blanksFilledWrong += newWrongStats;

    if (newCorrectStats > 0) {
      playSound('correct');
    }

    setFeedback(newFeedback);
    setScore(newScore);

    if (wrongCount > 0) {
      setLives(l => l - 1); // 1 wrong submission = 1 lost life (even if multiple wrong in the same submission)
    }

    if (allCorrect) {
      statsRef.current.paragraphsCompleted++;
      setTimeout(() => {
        loadNewParagraph();
      }, 1500);
    }
  };

  const formatParagraph = () => {
    if (!paragraph) return null;
    
    // Split by <blank:index>
    const parts = paragraph.split(/(<blank:\d+>)/g);
    
    return parts.map((part, i) => {
      const match = part.match(/<blank:(\d+)>/);
      if (match) {
        const idx = parseInt(match[1], 10);
        
        if (mode === 'multiple-choice') {
          return (
            <motion.div key={i} className="inline-block mx-1 relative" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
              <select
                className={`w-full border-b-4 bg-slate-900 focus:outline-none appearance-none cursor-pointer text-center px-4 py-1.5 rounded-xl shadow-lg font-bold text-lg md:text-xl transition-all duration-300 ${
                   feedback[idx] === 'correct' ? 'border-emerald-500 text-emerald-400 shadow-emerald-900/50 bg-emerald-950/20' :
                   feedback[idx] === 'wrong' ? 'border-rose-500 text-rose-400 shadow-rose-900/50 bg-rose-950/20 animate-shake' :
                   'border-indigo-500 text-indigo-300 hover:border-indigo-400 hover:bg-slate-800 shadow-indigo-900/20'
                 }`}
                 value={userAnswers[idx] || ''}
                 onChange={(e) => handleInput(idx, e.target.value)}
                 disabled={feedback[idx] === 'correct'}
              >
                 <option value="" disabled>___</option>
                 {words.map(w => w.word).sort().map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              {feedback[idx] === 'correct' && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 rounded-xl border-2 border-emerald-400 pointer-events-none" />
              )}
            </motion.div>
          );
        } else {
          // typing
          return (
            <motion.div key={i} className="inline-block mx-1 relative" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
              <input
                type="text"
                className={`border-b-4 bg-slate-900 focus:outline-none text-center px-4 py-1.5 w-32 md:w-40 rounded-xl shadow-lg font-bold text-lg md:text-xl transition-all duration-300 ${
                  feedback[idx] === 'correct' ? 'border-emerald-500 text-emerald-400 shadow-emerald-900/50 bg-emerald-950/20' :
                  feedback[idx] === 'wrong' ? 'border-rose-500 text-rose-400 shadow-rose-900/50 bg-rose-950/20 animate-shake' :
                  'border-indigo-500 text-indigo-300 focus:border-indigo-400 focus:bg-slate-800 hover:bg-slate-800 shadow-indigo-900/20'
                }`}
                value={userAnswers[idx] || ''}
                onChange={(e) => handleInput(idx, e.target.value)}
                disabled={feedback[idx] === 'correct'}
                placeholder="_____"
              />
              {feedback[idx] === 'correct' && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 rounded-xl border-2 border-emerald-400 pointer-events-none" />
              )}
            </motion.div>
          );
        }
      }
      // regular text
      return <span key={i} className="leading-relaxed">{part}</span>;
    });
  };

  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    if (roundEnd) {
      playSound('game-over');
      const storedHighScore = parseInt(localStorage.getItem('fillBlanksHighScore') || '0', 10);
      if (score > storedHighScore) {
        localStorage.setItem('fillBlanksHighScore', score.toString());
        setHighScore(score);
      } else {
        setHighScore(storedHighScore);
      }
      
      const maxPossibleScore = (statsRef.current.blanksFilledCorrectly + statsRef.current.blanksFilledWrong) * 50 || 1;
      const configId = `FillBlanks-${mode}`;
      api.recordGameSession('Fill in the Blanks', score, maxPossibleScore, configId);
    }
  }, [roundEnd, score]);

  if (roundEnd) {
    const stats = statsRef.current;
    
    const totalAttempted = stats.blanksFilledCorrectly + stats.blanksFilledWrong;
    const accuracy = totalAttempted > 0 
      ? Math.round((stats.blanksFilledCorrectly / totalAttempted) * 100) 
      : 0;

    const timeSpent = 120 - Math.max(0, timeLeft);
    const pace = timeSpent > 0 ? ((stats.blanksFilledCorrectly / timeSpent) * 60).toFixed(1) : '0.0';

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }} 
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', x: [-10, 10, -10, 10, 0] }} 
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center justify-center min-h-full w-full bg-slate-950/90 backdrop-blur-sm p-6 md:p-12 relative z-50 overflow-y-auto"
      >
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Main Score Area */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-2xl p-10 md:p-14 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-60"></div>
            
            <h2 className="text-4xl md:text-6xl font-black text-rose-500 uppercase tracking-widest mb-6 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">
              {timeLeft <= 0 ? "Time's Up" : "Game Over"}
            </h2>
            
            <p className="text-sm md:text-base font-semibold text-slate-400 uppercase tracking-[0.2em] mb-2">Final Score</p>
            <p className="text-7xl md:text-9xl font-black text-white mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{score}</p>
            
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
            
            <Button onClick={() => onGameOver(score)} size="lg" className="mt-6 h-16 px-12 rounded-full text-xl shadow-blue-600/30 bg-blue-600 hover:bg-blue-500 font-bold hover:scale-105 transition-all w-full md:w-auto shadow-lg">
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
              <p className="text-sm font-medium text-slate-500 mt-2">{stats.blanksFilledCorrectly} correct, {stats.blanksFilledWrong} mistakes</p>
            </div>

            <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-slate-400">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <span className="font-bold tracking-wide uppercase text-sm">Pace</span>
              </div>
              <p className="text-4xl font-black text-white">{pace}</p>
              <p className="text-sm font-medium text-slate-500 mt-2">Correct blanks / minute</p>
            </div>

            <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-slate-400">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                <span className="font-bold tracking-wide uppercase text-sm">Paragraphs Done</span>
              </div>
              <p className="text-4xl font-black text-white">{stats.paragraphsCompleted}</p>
            </div>
            
            <LeaderboardForGame configId={`FillBlanks-${mode}`} />
          </div>
        </div>
      </motion.div>
    );
  }

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 overflow-hidden relative shadow-2xl">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Top Bar */}
      <div className="w-full p-6 md:p-8 flex justify-between items-center bg-transparent shrink-0 relative z-20">
        <div className="flex gap-2 bg-slate-900/50 backdrop-blur-md p-3 rounded-2xl border border-white/5">
          {[...Array(3)].map((_, i) => (
            <Heart key={i} className={`w-8 h-8 ${i < lives ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-slate-700'}`} />
          ))}
        </div>
        <div className="text-slate-100 font-bold text-2xl font-mono bg-slate-900/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          Time: <span className={timeLeft <= 30 ? 'text-rose-400 animate-pulse' : 'text-blue-300'}>{formatTime(timeLeft)}</span>
        </div>
        <div className="flex items-center gap-3">
          <SoundToggle />
          <div className="text-emerald-300 font-bold text-3xl font-mono bg-slate-900/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5 shadow-[0_0_15px_rgba(16,185,129,0.2)] min-w-[120px] text-center">
            {score.toString().padStart(5, '0')}
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 overflow-y-auto w-full relative z-10">
        <div className="min-h-full p-6 md:p-12 flex flex-col items-center">
        {loading ? (
          <div className="mt-32 flex flex-col items-center justify-center text-blue-300">
            <RefreshCw className="w-16 h-16 animate-spin mb-6 text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
            <p className="font-bold tracking-widest uppercase text-lg">Generating paragraph...</p>
          </div>
        ) : (
          <div className="mt-8 md:mt-16 w-full max-w-5xl bg-slate-900/40 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl">
            <div className="text-2xl md:text-3xl text-slate-100 leading-[2.5] font-medium break-words whitespace-pre-wrap">
              {formatParagraph()}
            </div>

            <div className="mt-16 flex justify-center">
              <Button 
                size="lg" 
                onClick={handleCheckAnswers} 
                className="h-16 px-16 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] font-bold text-xl transition-transform hover:scale-105"
              >
                Submit Answers
              </Button>
            </div>
            
            {/* Feedback Messages */}
            {Object.keys(feedback).length > 0 && Object.values(feedback).every(f => f === 'correct') && Object.keys(feedback).length === answers.length && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center bg-emerald-950/50 text-emerald-400 p-4 rounded-xl border border-emerald-500/30 flex items-center justify-center gap-3 font-bold text-xl shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                 <CheckCircle2 className="w-8 h-8" /> Perfect! Loading next...
              </motion.div>
            )}
            {Object.values(feedback).includes('wrong') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center bg-rose-950/50 text-rose-400 p-4 rounded-xl border border-rose-500/30 flex items-center justify-center gap-3 font-bold text-xl shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                 <XCircle className="w-8 h-8" /> Not quite right. Try again!
              </motion.div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
