import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Trophy, Flame, Target, BarChart3, Activity } from 'lucide-react';
import { AutoTextFit } from '@/components/ui/AutoTextFit';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { api } from '@/lib/api';
import { LeaderboardForGame } from '@/components/LeaderboardForGame';
import { playSound } from '@/lib/audio';

interface WordFallGameProps {
  words: any[];
  mode: 'typing' | 'multiple-choice';
  fallingType: 'translation' | 'definition';
  speed?: 'slow' | 'normal' | 'fast';
  timeLimit?: number;
  onGameOver: (score: number) => void;
}

export function WordFallGame({ words, mode, fallingType, speed = 'normal', timeLimit = 0, onGameOver }: WordFallGameProps) {
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [activeDrops, setActiveDrops] = useState<any[]>([]); // falling words
  const [input, setInput] = useState('');
  const [roundEnd, setRoundEnd] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    if (timeLimit > 0 && !roundEnd) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setRoundEnd(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLimit, roundEnd]);

  const isGameStarted = true;
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>();
  
  // Game config
  let fallSpeed = 0.003;
  let spawnInterval = 3000;
  if (speed === 'slow') {
    fallSpeed = 0.0015;
    spawnInterval = 4500;
  } else if (speed === 'fast') {
    fallSpeed = 0.0045;
    spawnInterval = 2000;
  }
  
  const FALL_SPEED = fallSpeed;
  const SPAWN_INTERVAL = spawnInterval;

  const activeDropsRef = useRef<any[]>([]);
  const livesRef = useRef(3);
  const wordQueueRef = useRef<any[]>([]);
  
  const statsRef = useRef({
    correct: 0,
    missed: 0,
    currentStreak: 0,
    highestStreak: 0,
    wordMisses: {} as Record<string, number>
  });

  useEffect(() => {
    livesRef.current = lives;
    
    if (lives <= 0) {
      setRoundEnd(true);
    }
  }, [lives, score]);

  useEffect(() => {
    if (roundEnd || !isGameStarted) return; // Don't run game loops if round is over

    // Spawn loop
    const spawnTimer = setInterval(() => {
      const prev = activeDropsRef.current;
      // Limit max active falling items to 3
      if (prev.filter(d => !d.status || d.status === 'falling').length >= 3) return;

      const LANES = ['left', 'center', 'right'];
      // Ensure no other drop is in the same lane near the top
      const availableLanes = LANES.filter(lane => !prev.some(p => p.x === lane && p.y < 35));
      if (availableLanes.length === 0) return;
      
      const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];

      if (wordQueueRef.current.length === 0) {
        wordQueueRef.current = [...words].sort(() => Math.random() - 0.5);
      }
      const randomWord = wordQueueRef.current.shift();
      const textToFall = fallingType === 'translation' ? randomWord.translation || randomWord.definition : randomWord.definition;
      
      const options = [randomWord.word];
      let attempts = 0;
      while (options.length < Math.min(4, words.length) && attempts < 50) {
        const rand = words[Math.floor(Math.random() * words.length)].word;
        if (!options.includes(rand)) options.push(rand);
        attempts++;
      }
      options.sort(() => Math.random() - 0.5);

      activeDropsRef.current = [...prev, {
        id: Math.random().toString(),
        wordRef: randomWord,
        text: textToFall,
        y: -10, // Start just above
        x: lane,
        options,
        status: 'falling'
      }];
      setActiveDrops(activeDropsRef.current);
    }, SPAWN_INTERVAL);

    // Initial spawn
    if (wordQueueRef.current.length === 0) {
      wordQueueRef.current = [...words].sort(() => Math.random() - 0.5);
    }
    const firstWord = wordQueueRef.current.shift();
    const options = [firstWord.word];
    let attempts = 0;
    while (options.length < Math.min(4, words.length) && attempts < 50) {
      const rand = words[Math.floor(Math.random() * words.length)].word;
      if (!options.includes(rand)) options.push(rand);
      attempts++;
    }
    options.sort(() => Math.random() - 0.5);

    activeDropsRef.current = [{
      id: Math.random().toString(),
      wordRef: firstWord,
      text: fallingType === 'translation' ? firstWord.translation || firstWord.definition : firstWord.definition,
      y: -5,
      x: 'center', // Center initially
      options,
      status: 'falling'
    }];
    setActiveDrops(activeDropsRef.current);

    // Fall loop
    let lastTime = performance.now();
    const updateLoop = (time: number) => {
      const dt = Math.max(1, Math.min(time - lastTime, 50)); // Clamp dt 
      
      let livesLost = 0;
      
      const currentDrops = activeDropsRef.current;
      let remainingDrops = [];
      
      for (let i = 0; i < currentDrops.length; i++) {
        const drop = { ...currentDrops[i] };
        if (!drop.status || drop.status === 'falling') {
          drop.y += FALL_SPEED * dt;
          
          // Check collision with danger zone (approx 85%)
          if (drop.y > 85) { 
            livesLost += 1;
            drop.status = 'missed';
            drop.statusTimer = 0;
            remainingDrops.push(drop);
            
            // Update stats
            statsRef.current.missed += 1;
            statsRef.current.currentStreak = 0;
            const word = drop.wordRef.word;
            statsRef.current.wordMisses[word] = (statsRef.current.wordMisses[word] || 0) + 1;
          } else {
            remainingDrops.push(drop);
          }
        } else {
          // Animating correct/wrong/missed state
          drop.statusTimer = (drop.statusTimer || 0) + dt;
          if (drop.statusTimer < 800) { // Keep for 800ms
            remainingDrops.push(drop);
          }
        }
      }
      
      activeDropsRef.current = remainingDrops;
      setActiveDrops(remainingDrops);
      
      if (livesLost > 0) {
        setLives(l => {
          const updated = Math.max(0, l - livesLost);
          livesRef.current = updated;
          if (updated <= 0) setRoundEnd(true);
          return updated;
        });
      }

      lastTime = time;
      frameRef.current = requestAnimationFrame(updateLoop);
    };
    
    frameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      clearInterval(spawnTimer);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [words, fallingType, roundEnd, isGameStarted]);

  const handleInputSubmit = (value: string) => {
    // Check if the typed word matches any active drop's original word
    const drops = activeDropsRef.current;
    const matchedIndex = drops.findIndex(d => d.status === 'falling' && d.wordRef.word.toLowerCase() === value.toLowerCase().trim());
    
    if (matchedIndex !== -1) {
      // Hit!
      const copy = [...drops];
      const dropY = copy[matchedIndex].y || 0;
      let multiplier = 1;
      if (mode === 'typing') multiplier *= 1.5;
      if (speed === 'fast') multiplier *= 1.5;
      if (speed === 'slow') multiplier *= 0.8;
      if (fallingType === 'definition') multiplier *= 1.5;
      
      const basePoints = 10 + Math.round((1 - Math.min(1, dropY / 85)) * 9) * 10;
      const points = Math.round(basePoints * multiplier);
      setScore(s => Math.min(5000, s + points));
      playSound('correct');
      copy[matchedIndex] = { ...copy[matchedIndex], status: 'correct', statusTimer: 0, pointsEaten: points };
      activeDropsRef.current = copy;
      setActiveDrops(copy);
      setInput('');

      const dropEl = document.getElementById(`drop-${copy[matchedIndex].id}`);
      let originX = 0.5;
      let originY = 0.8;
      
      if (dropEl) {
        const rect = dropEl.getBoundingClientRect();
        originX = (rect.left + rect.width / 2) / window.innerWidth;
        originY = (rect.top + rect.height / 2) / window.innerHeight;
      }
      
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x: originX, y: originY },
        colors: ['#a855f7', '#3b82f6', '#ec4899']
      });
      
      statsRef.current.correct += 1;
      statsRef.current.currentStreak += 1;
      if (statsRef.current.currentStreak > statsRef.current.highestStreak) {
        statsRef.current.highestStreak = statsRef.current.currentStreak;
      }
    } else {
      setLives(l => {
        const updated = Math.max(0, l - 1);
        livesRef.current = updated;
        if (updated <= 0) setRoundEnd(true);
        return updated;
      });
      setInput('');
      
      statsRef.current.missed += 1;
      statsRef.current.currentStreak = 0;
      // We don't know which word they intended to type, so we can't cleanly tally wordMisses here.
    }
  };

  const handleChoice = (selectedWordString: string, dropId: string, event: React.MouseEvent) => {
    const drops = activeDropsRef.current;
    const dropIndex = drops.findIndex(d => d.id === dropId);
    if (dropIndex === -1 || drops[dropIndex].status !== 'falling') return;
    
    if (drops[dropIndex].wordRef.word === selectedWordString) {
      const copy = [...drops];
      const dropY = copy[dropIndex].y || 0;
      let multiplier = 1;
      if (mode === 'typing') multiplier *= 1.5;
      if (speed === 'fast') multiplier *= 1.5;
      if (speed === 'slow') multiplier *= 0.8;
      if (fallingType === 'definition') multiplier *= 1.5;

      const basePoints = 10 + Math.round((1 - Math.min(1, dropY / 85)) * 9) * 10;
      const points = Math.round(basePoints * multiplier);
      setScore(s => Math.min(5000, s + points));
      playSound('correct');
      copy[dropIndex] = { ...copy[dropIndex], status: 'correct', statusTimer: 0, pointsEaten: points };
      activeDropsRef.current = copy;
      setActiveDrops(copy);

      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const originX = (rect.left + rect.width / 2) / window.innerWidth;
      const originY = (rect.top + rect.height / 2) / window.innerHeight;
      
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x: originX, y: originY },
        colors: ['#a855f7', '#3b82f6', '#ec4899']
      });
      
      statsRef.current.correct += 1;
      statsRef.current.currentStreak += 1;
      if (statsRef.current.currentStreak > statsRef.current.highestStreak) {
        statsRef.current.highestStreak = statsRef.current.currentStreak;
      }
    } else {
      setLives(l => {
        const updated = Math.max(0, l - 1);
        livesRef.current = updated;
        if (updated <= 0) setRoundEnd(true);
        return updated;
      });
      const copy = [...drops];
      copy[dropIndex] = { ...copy[dropIndex], status: 'wrong', statusTimer: 0 };
      activeDropsRef.current = copy;
      setActiveDrops(copy);
      
      statsRef.current.missed += 1;
      statsRef.current.currentStreak = 0;
      const word = drops[dropIndex].wordRef.word;
      statsRef.current.wordMisses[word] = (statsRef.current.wordMisses[word] || 0) + 1;
    }
  };

  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    if (roundEnd) {
      playSound('game-over');
      const storedHighScore = parseInt(localStorage.getItem('wordFallHighScore') || '0', 10);
      if (score > storedHighScore) {
        localStorage.setItem('wordFallHighScore', score.toString());
        setHighScore(score);
      } else {
        setHighScore(storedHighScore);
      }
      
      let expectedMultiplier = 1;
      if (mode === 'typing') expectedMultiplier *= 1.5;
      if (speed === 'fast') expectedMultiplier *= 1.5;
      if (speed === 'slow') expectedMultiplier *= 0.8;
      if (fallingType === 'definition') expectedMultiplier *= 1.5;
      const trueMaxPerWord = Math.round(100 * expectedMultiplier);
      const maxPossibleScore = Math.min(5000, Math.max(1, (statsRef.current.correct + statsRef.current.missed) * trueMaxPerWord));
      const configId = `WordFall-${mode}-${fallingType}-${speed}-${timeLimit}`;
      api.recordGameSession('Word Fall', score, maxPossibleScore, configId);
    }
  }, [roundEnd, score]);

  if (roundEnd) {
    const stats = statsRef.current;
    
    // Calculate most difficult word
    let mostDifficultWord = "None";
    let maxMisses = 0;
    for (const [word, misses] of Object.entries(stats.wordMisses)) {
      const missesCount = misses as number;
      if (missesCount > maxMisses) {
        maxMisses = missesCount;
        mostDifficultWord = word;
      }
    }
    
    const accuracy = stats.correct + stats.missed > 0 
      ? Math.round((stats.correct / (stats.correct + stats.missed)) * 100) 
      : 0;

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
              {(timeLimit > 0 && timeLeft <= 0) ? "Time's Up!" : "Game Over"}
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
            
            <Button onClick={() => onGameOver(score)} size="lg" className="mt-6 h-16 px-12 rounded-full text-xl shadow-purple-600/30 bg-purple-600 hover:bg-purple-500 font-bold hover:scale-105 transition-all w-full md:w-auto shadow-lg">
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
              <p className="text-sm font-medium text-slate-500 mt-2">{stats.correct} correct, {stats.missed} missed</p>
            </div>

            <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-slate-400">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-bold tracking-wide uppercase text-sm">Best Streak</span>
              </div>
              <p className="text-4xl font-black text-white">{stats.highestStreak} <span className="text-base font-medium text-slate-500">words</span></p>
            </div>

            <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2 text-slate-400">
                  <Activity className="w-5 h-5 text-rose-500" />
                  <span className="font-bold tracking-wide uppercase text-sm">Hardest Word</span>
                </div>
                <p className="text-3xl font-bold text-white max-w-[12rem] truncate" title={mostDifficultWord}>{mostDifficultWord}</p>
              </div>
              {maxMisses > 0 && (
                <div className="text-right">
                  <span className="bg-rose-500/20 text-rose-400 px-4 py-2 rounded-full text-xs font-bold border border-rose-500/30">
                    {maxMisses} misses
                  </span>
                </div>
              )}
            </div>
            
            <LeaderboardForGame configId={`WordFall-${mode}-${fallingType}-${speed}-${timeLimit}`} />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 overflow-hidden relative shadow-2xl z-0">
      {/* Dynamic Animated Background - CSS based for performance */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent opacity-60 animate-[spin_60s_linear_infinite]"></div>
        <div className="absolute -bottom-[50%] -right-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent opacity-60 animate-[spin_40s_linear_infinite_reverse]"></div>
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full p-6 md:p-8 flex items-start justify-between z-20 pointer-events-none">
        <div className="flex gap-2 bg-slate-900/50 backdrop-blur-md p-3 rounded-2xl border border-white/5">
          {[...Array(3)].map((_, i) => (
            <Heart key={i} className={`w-8 h-8 ${i < lives ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-slate-700'}`} />
          ))}
          {timeLimit > 0 && (
            <div className="ml-4 flex items-center justify-center font-mono text-xl font-bold text-slate-100 min-w-[3rem]">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
        <div className="flex items-start gap-3 pointer-events-auto">
          <SoundToggle />
          <div className="bg-slate-900/50 backdrop-blur-md px-6 py-3 text-purple-300 font-bold text-3xl font-mono rounded-2xl border border-white/5 shadow-[0_0_15px_rgba(168,85,247,0.2)] text-right">
            {score.toString().padStart(5, '0')}
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-transparent">
        {/* Danger Zone Indicator */}
        <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-rose-600/30 via-rose-900/10 to-transparent pointer-events-none flex items-end justify-center pb-4 border-b-2 border-rose-500/70 z-10">
          <motion.div 
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="text-rose-400/90 uppercase tracking-[0.8em] font-black text-2xl drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]"
          >
            Danger Zone
          </motion.div>
        </div>
        <AnimatePresence>
          {activeDrops.map(drop => {
            let styling = 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-xl border-white/20 shadow-[0_0_30px_rgba(168,85,247,0.2)]';
            if (drop.status === 'correct') {
              styling = 'bg-emerald-500/90 backdrop-blur-xl border-emerald-300 shadow-[0_0_60px_rgba(16,185,129,0.8)] scale-110 opacity-0 pointer-events-none ring-4 ring-emerald-400';
            } else if (drop.status === 'wrong' || drop.status === 'missed') {
              styling = 'bg-rose-600/90 backdrop-blur-xl border-rose-300 shadow-[0_0_60px_rgba(244,63,94,0.8)] scale-90 opacity-0 pointer-events-none ring-4 ring-rose-400';
            }

            // Proximity glow: calculate glow mix based on distance to danger zone (85%)
            let boxShadow = drop.status !== 'falling' ? undefined : '0 0 30px rgba(168,85,247,0.2)';
            let borderColor = 'rgba(255,255,255,0.2)';
            if (drop.status === 'falling' && drop.y > 50) {
              // start glowing increasingly red between 50% and 85%
              const intensity = Math.min(1, (drop.y - 50) / 35);
              boxShadow = `0 0 ${30 + intensity * 40}px rgba(${168 + intensity*87}, ${85 - intensity*22}, ${247 - intensity*153}, ${0.2 + intensity * 0.6})`;
              borderColor = `rgba(255, ${255 - intensity * 200}, ${255 - intensity * 200}, ${0.2 + intensity * 0.4})`;
            }

            let positionStyles: any = { 
              top: `${drop.y}%`, 
              transition: drop.status !== 'falling' ? 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
              boxShadow: boxShadow,
              borderColor: borderColor
            };

            if (drop.x === 'left') {
              positionStyles.left = '1rem';
            } else if (drop.x === 'right') {
              positionStyles.right = '1rem';
            } else {
              positionStyles.left = '50%';
            }

            return (
            <motion.div
              key={drop.id}
              id={`drop-${drop.id}`}
              initial={{ x: drop.x === 'center' ? "-50%" : "0%" }}
              animate={drop.status === 'falling' ? {
                rotate: [-2, 2, -2],
                y: [0, -3, 0],
                x: drop.x === 'center' ? "-50%" : "0%"
              } : { 
                rotate: 0, 
                y: 0,
                x: drop.x === 'center' ? "-50%" : "0%"
              }}
              transition={{ repeat: drop.status === 'falling' ? Infinity : 0, duration: 2, ease: "easeInOut" }}
              className={`absolute text-center p-5 md:p-6 rounded-3xl border text-white font-medium z-20 w-[calc(100vw-2rem)] sm:w-auto max-w-[calc(100vw-2rem)] md:max-w-md ${styling}`}
              style={positionStyles}
            >
              {/* Particle Explosions on Correct/Wrong */}
              {drop.status && drop.status !== 'falling' && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {[...Array(12)].map((_, i) => {
                    const angle = (i / 12) * Math.PI * 2;
                    const distance = 120;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                        animate={{ 
                          opacity: 0, 
                          scale: 1.5, 
                          x: Math.cos(angle) * distance, 
                          y: Math.sin(angle) * distance 
                        }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={`absolute w-4 h-4 rounded-full ${drop.status === 'correct' ? 'bg-emerald-400' : 'bg-rose-400'}`}
                      />
                    );
                  })}
                </div>
              )}

              <div className="relative text-xl md:text-2xl py-2 px-2 sm:px-6 whitespace-normal w-full leading-tight text-white drop-shadow-md flex flex-col items-center gap-2">
                {drop.text}
                {drop.status === 'correct' && (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="w-10 h-10 text-white mt-3 shrink-0" />
                    <span className="font-extrabold text-3xl text-yellow-300 drop-shadow-lg mt-2 font-mono">+{drop.pointsEaten || 100}</span>
                  </div>
                )}
                {(drop.status === 'wrong' || drop.status === 'missed') && <XCircle className="w-10 h-10 text-white mt-3 shrink-0" />}
              </div>
              
              {mode === 'multiple-choice' && drop.status === 'falling' && (
                <div className="mt-6 grid grid-cols-2 gap-3 pointer-events-auto relative">
                  {drop.options?.map((opt: string) => (
                    <Button 
                      key={opt}
                      size="lg" 
                      variant="secondary" 
                      className="p-1 font-bold bg-white/10 w-full h-[60px] hover:bg-white/20 text-white border border-white/10 hover:border-white/40 backdrop-blur-sm transition-all shadow-inner"
                      onClick={(e) => handleChoice(opt, drop.id, e)}
                    >
                      <AutoTextFit text={opt} minFontSize={12} maxFontSize={18} className="w-full font-bold" />
                    </Button>
                  ))}
                </div>
              )}
            </motion.div>
          )})}
        </AnimatePresence>
      </div>

      {/* Input Area (Typing Mode) */}
      {mode === 'typing' && (
        <div className="p-6 bg-slate-800 z-20">
          <input
            autoFocus
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && input.trim()) {
                handleInputSubmit(input);
              }
            }}
            placeholder="Type word and press Enter..."
            className="w-full h-16 rounded-2xl bg-white/10 border-2 border-white/20 text-white px-6 text-xl text-center focus:outline-none focus:border-purple-500 placeholder:text-white/30"
          />
        </div>
      )}
    </div>
  );
}
