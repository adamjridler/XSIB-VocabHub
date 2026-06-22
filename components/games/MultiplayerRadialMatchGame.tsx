import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, Users, Timer, Info, Play, CheckCircle2, XCircle } from 'lucide-react';
import { AutoTextFit } from '@/components/ui/AutoTextFit';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { playSound } from '@/lib/audio';

interface Word {
  id: string;
  word: string;
  translation: string;
  definition: string;
}

interface MultiplayerRadialMatchGameProps {
  words: Word[];
  mode: 'translation' | 'definition';
  optionsCount: number;
  roomId: string;
  isHost: boolean;
  onGameOver: (score: number) => void;
}

interface Player {
  uid: string;
  name: string;
  score: number;
  online: boolean;
}

interface Option {
  id: string;
  text: string;
  matchId: string;
}

interface RoundData {
  targetId: string;
  targetText: string;
  clueText: string;
  options: Option[];
}

interface Guess {
  uid: string;
  wordId: string;
  timestamp: number;
  correct: boolean;
  points: number;
}

interface GameState {
  roomId: string;
  hostId: string;
  status: 'lobby' | 'countdown' | 'playing' | 'roundEnded' | 'ended';
  players: Player[];
  mode: 'translation' | 'definition';
  optionsCount: number;
  rounds: RoundData[];
  currentRoundIndex: number;
  
  // Timers and State for Round
  countdownEndAt: number | null;
  roundStartAt: number | null;
  roundEndsAt: number | null;
  roundGuesses: Guess[];
  roundWinnerUid: string | null;
}

export function MultiplayerRadialMatchGame({ words, mode, optionsCount, roomId, isHost, onGameOver }: MultiplayerRadialMatchGameProps) {
  const [gameState, setGameState] = useState<GameState>({
    roomId: isHost ? Math.floor(100000 + Math.random() * 900000).toString() : roomId,
    hostId: '',
    status: 'lobby',
    players: [],
    mode,
    optionsCount,
    rounds: [],
    currentRoundIndex: 0,
    countdownEndAt: null,
    roundStartAt: null,
    roundEndsAt: null,
    roundGuesses: [],
    roundWinnerUid: null
  });

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [countdownLeft, setCountdownLeft] = useState<number>(0);
  const [localPenaltyAt, setLocalPenaltyAt] = useState<number>(0); // Timestamp until local player is locked out from guessing again
  const [localCorrect, setLocalCorrect] = useState<boolean>(false); // Immediate local correct feedback

  const channelRef = useRef<any>(null);
  const gameStateRef = useRef(gameState);
  
  useEffect(() => {
    setLocalCorrect(false);
  }, [gameState.currentRoundIndex]);

  const user = api.getUser();
  const myPlayer = gameState.players.find(p => p.uid === user?.id);

  useEffect(() => {
    gameStateRef.current = gameState;
    if (gameState.status === 'ended' && user?.id) {
       const myEndScore = gameState.players.find(p => p.uid === user.id)?.score || 0;
       api.recordGameSession('radial_match', myEndScore, gameState.rounds.length * 1000);
    }
  }, [gameState]);

  useEffect(() => {
    if (!user) return;
    
    const channelId = isHost ? gameState.roomId : roomId;
    const channel = supabase.channel(`radial-${channelId}`, {
      config: { broadcast: { ack: true } }
    });

    channelRef.current = channel;

    channel.on('broadcast', { event: 'state' }, ({ payload }) => {
      setGameState(payload);
    });

    channel.on('broadcast', { event: 'join' }, ({ payload }) => {
      if (isHost && gameStateRef.current.status === 'lobby') {
        setGameState(prev => {
          if (prev.players.length >= 8 || prev.players.find(p => p.uid === payload.user.uid)) return prev;
          const newPlayers = [...prev.players, { ...payload.user, score: 0, online: true }];
          const newState = { ...prev, players: newPlayers };
          setTimeout(() => channel.send({ type: 'broadcast', event: 'state', payload: newState }), 100);
          return newState;
        });
      }
    });

    channel.on('broadcast', { event: 'guess' }, ({ payload }) => {
      if (isHost && gameStateRef.current.status === 'playing') {
        handlePlayerGuess(payload);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        if (!isHost) {
          channel.send({ type: 'broadcast', event: 'join', payload: { user: { uid: user.id, name: user.name } } });
        } else {
          // Initialize Host
          const newState: GameState = {
            ...gameState,
            hostId: user.id,
            players: [{ uid: user.id, name: user.name, score: 0, online: true }],
            optionsCount,
            mode
          };
          setGameState(newState);
          setTimeout(() => channel.send({ type: 'broadcast', event: 'state', payload: newState }), 200);
        }
      }
    });

    return () => {
      channel.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, roomId]);

  // Timers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (gameState.status === 'countdown' && gameState.countdownEndAt) {
        const remaining = Math.max(0, Math.ceil((gameState.countdownEndAt - now) / 1000));
        setCountdownLeft(remaining);
        if (isHost && remaining === 0) {
          startRound();
        }
      } else if (gameState.status === 'playing' && gameState.roundEndsAt) {
        const remaining = Math.max(0, Math.ceil((gameState.roundEndsAt - now) / 1000));
        setTimeLeft(remaining);
        if (isHost && remaining === 0) {
          endRoundTimeout();
        }
      } else if (gameState.status === 'roundEnded' && gameState.roundEndsAt) {
          const remaining = Math.max(0, Math.ceil((gameState.roundEndsAt - now) / 1000));
          if (isHost && remaining === 0) {
              if (gameState.currentRoundIndex + 1 < gameState.rounds.length) {
                  startCountdown(gameState.currentRoundIndex + 1);
              } else {
                  endGame();
              }
          }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameState.status, gameState.countdownEndAt, gameState.roundEndsAt]);

  const broadcastState = (state: GameState) => {
    channelRef.current?.send({ type: 'broadcast', event: 'state', payload: state });
  };

  const generateRounds = (): RoundData[] => {
    const totalRounds = Math.min(10, words.length);
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    const rounds: RoundData[] = [];

    for (let i = 0; i < totalRounds; i++) {
      const target = shuffledWords[i];
      const otherWords = shuffledWords.filter(w => w.id !== target.id);
      
      const decoys = [...otherWords].sort(() => Math.random() - 0.5).slice(0, optionsCount - 1);
      const allOptions = [target, ...decoys].map(w => ({
        id: Math.random().toString(36).substr(2, 9),
        text: w.word,
        matchId: w.id
      })).sort(() => Math.random() - 0.5);

      rounds.push({
        targetId: target.id,
        targetText: target.word,
        clueText: mode === 'translation' ? target.translation || target.definition : target.definition || target.translation,
        options: allOptions
      });
    }
    return rounds;
  };

  const startGame = () => {
    if (!isHost) return;
    const rounds = generateRounds();
    setGameState(prev => {
      const newState: GameState = {
        ...prev,
        rounds,
        status: 'countdown',
        countdownEndAt: Date.now() + 3000,
        currentRoundIndex: 0
      };
      broadcastState(newState);
      return newState;
    });
  };

  const startCountdown = (index: number) => {
    setGameState(prev => {
      const newState: GameState = {
           ...prev,
           status: 'countdown',
           countdownEndAt: Date.now() + 3000,
           currentRoundIndex: index,
           roundGuesses: [],
           roundWinnerUid: null
      };
      broadcastState(newState);
      return newState;
    });
  }

  const startRound = () => {
    setGameState(prev => {
      const newState: GameState = {
        ...prev,
        status: 'playing',
        roundStartAt: Date.now(),
        roundEndsAt: Date.now() + 15000, // 15 seconds max per round
        roundGuesses: [],
        roundWinnerUid: null
      };
      // playSound('start');
      broadcastState(newState);
      return newState;
    });
  };

  const endRoundTimeout = () => {
      setGameState(prev => {
          const newState: GameState = {
              ...prev,
              status: 'roundEnded',
              roundEndsAt: Date.now() + 3000 // 3 seconds to show timeout
          };
          broadcastState(newState);
          return newState;
      });
  }

  const endGame = () => {
      setGameState(prev => {
          const newState: GameState = {
              ...prev,
              status: 'ended'
          };
          confetti({ particleCount: 200, spread: 120 });
          broadcastState(newState);
          return newState;
      });
  }

  const handlePlayerGuess = (guess: { uid: string, wordId: string, matchId: string }) => {
    setGameState(prev => {
      if (prev.status !== 'playing') return prev;
      if (prev.roundGuesses.some(g => g.uid === guess.uid && g.correct)) return prev; // already got it right

      const currentRound = prev.rounds[prev.currentRoundIndex];
      const isCorrect = guess.matchId === currentRound.targetId;
      const responseTime = Date.now() - (prev.roundStartAt || Date.now());
      // Max 1000 points, linearly degrading over 15 seconds down to 100 points
      const points = isCorrect ? Math.max(100, Math.floor(1000 - (responseTime / 15000) * 900)) : -200;

      const newGuess: Guess = {
        uid: guess.uid,
        wordId: guess.wordId,
        timestamp: Date.now(),
        correct: isCorrect,
        points
      };

      let newPlayers = prev.players;
      let newStatus = prev.status;
      let newRoundEndsAt = prev.roundEndsAt;
      let newWinnerUid = prev.roundWinnerUid;

      if (isCorrect) {
          playSound('correct');
          newPlayers = prev.players.map(p => p.uid === guess.uid ? { ...p, score: p.score + points } : p);
          
          const newGuesses = [...prev.roundGuesses, newGuess];
          const correctCount = newGuesses.filter(g => g.correct).length;
          
          if (!prev.roundWinnerUid) {
              newWinnerUid = guess.uid;
          }

          if (correctCount >= prev.players.length) {
              // Everyone has guessed correctly
              newStatus = 'roundEnded';
              newRoundEndsAt = Date.now() + 3000;
          }
      } else {
          // playSound('wrong');
          newPlayers = prev.players.map(p => p.uid === guess.uid ? { ...p, score: Math.max(0, p.score + points) } : p);
      }

      const newState: GameState = {
        ...prev,
        players: newPlayers,
        status: newStatus,
        roundEndsAt: newRoundEndsAt,
        roundWinnerUid: newWinnerUid,
        roundGuesses: [...prev.roundGuesses, newGuess]
      };

      broadcastState(newState);
      return newState;
    });
  };

  const submitGuess = (option: Option) => {
    if (gameState.status !== 'playing' || Date.now() < localPenaltyAt || localCorrect) return;
    
    // Check if we guessed incorrectly
    const currentRound = gameState.rounds[gameState.currentRoundIndex];
    const isCorrect = option.matchId === currentRound.targetId;
    if (!isCorrect) {
       // Lock out for 1.5 seconds locally
       setLocalPenaltyAt(Date.now() + 1500);
    } else {
       setLocalCorrect(true);
    }
    
    if (!user?.id) return;
    const payload = { uid: user.id, wordId: option.id, matchId: option.matchId };

    if (isHost) {
        handlePlayerGuess(payload);
    } else {
        channelRef.current?.send({ 
            type: 'broadcast', 
            event: 'guess', 
            payload
        });
    }
  };

  // Rendering helpers
  const currentRound = gameState.rounds[gameState.currentRoundIndex];

  if (gameState.status === 'lobby') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative p-4 lg:p-8">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white max-w-2xl w-full text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
          
          <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm tracking-wider mb-6">
            ROOM CODE: {gameState.roomId}
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-2">Radial Rush</h2>
          <p className="text-slate-600 mb-8 font-medium">Wait for players to join. First player to tap the correct match wins the round!</p>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
              <Users className="w-4 h-4" /> Players ({gameState.players.length}/8)
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <AnimatePresence>
                {gameState.players.map((p) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 font-bold text-slate-700 flex items-center gap-2"
                    key={p.uid}
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    {p.name}
                  </motion.div>
                ))}
              </AnimatePresence>
              {gameState.players.length === 0 && (
                <p className="text-slate-400 italic">Waiting for players...</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isHost ? (
              <Button onClick={startGame} disabled={gameState.players.length < 1} className="w-full sm:w-auto px-8 h-12 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30">
                Start Game
              </Button>
            ) : (
              <div className="text-slate-500 font-medium flex items-center gap-2 bg-slate-100 px-6 py-3 rounded-xl">
                <Clock className="w-5 h-5 animate-spin-slow" /> Waiting for host to start...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Calculate coordinates for options
  const getCoordinates = (index: number, total: number, radius = 300) => {
      const isMobile = window.innerWidth < 640;
      const actualRadius = isMobile ? radius * 0.65 : radius;
      // Start from top (offset -90 deg)
      const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
      return {
          x: Math.cos(angle) * actualRadius,
          y: Math.sin(angle) * actualRadius
      };
  };

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-slate-900 p-2 md:p-6 lg:p-12">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900/90 to-slate-900 pointer-events-none"></div>

      {/* Top Bar: Players & Scores */}
      <div className="relative z-20 flex justify-between items-start w-full max-w-6xl mx-auto pointer-events-none">
          <div className="flex flex-wrap gap-2 pointer-events-auto">
             {gameState.players.map(p => {
                 const isP = p.uid === user?.id;
                 return (
                     <div key={p.uid} className={`px-3 md:px-4 py-2 rounded-xl backdrop-blur-md border ${isP ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-100' : 'bg-white/5 border-white/10 text-slate-300'} flex items-center gap-2`}>
                         <span className="font-bold text-xs md:text-sm">{p.name} {isP && '(You)'}</span>
                         <span className="font-black text-sm md:text-base text-white">{p.score}</span>
                     </div>
                 );
             })}
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-black text-lg md:text-xl pointer-events-auto shadow-xl">
              Round {Math.min(gameState.rounds.length, gameState.currentRoundIndex + 1)} / {gameState.rounds.length}
          </div>
      </div>

      {/* Points Scorebar */}
      {gameState.status === 'playing' && (
      <div className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 h-[60%] w-10 md:w-16 z-20 pointer-events-none">
          <div className="bg-slate-800/80 rounded-full w-full h-full border border-slate-700/80 overflow-hidden relative backdrop-blur-md shadow-2xl flex flex-col justify-end">
             <motion.div 
                 initial={{ height: '100%' }}
                 animate={{ height: '10%' }}
                 transition={{ duration: 15, ease: 'linear' }}
                 className="w-full bg-gradient-to-t from-amber-400 to-yellow-500 rounded-full relative"
             >
                 <div className="absolute top-0 left-0 right-0 h-4 bg-white/30 blur-sm rounded-full"></div>
             </motion.div>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="-rotate-90 font-black text-xs md:text-sm text-yellow-50 drop-shadow-md tracking-widest whitespace-nowrap">
                   ROUND POINTS
                 </div>
             </div>
          </div>
      </div>
      )}

      {/* Main Game Area */}
      <div className="flex-1 w-full h-full relative flex items-center justify-center">
         <AnimatePresence mode="wait">
            {gameState.status === 'countdown' && (
                <motion.div 
                    key="countdown"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0, filter: 'blur(10px)' }}
                    className="absolute inset-0 flex flex-col items-center justify-center z-50 text-white"
                >
                    <span className="text-8xl md:text-[12rem] font-black drop-shadow-[0_0_50px_rgba(99,102,241,0.8)] text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 to-indigo-100">
                      {countdownLeft > 0 ? countdownLeft : 'GO!'}
                    </span>
                </motion.div>
            )}

            {(gameState.status === 'playing' || gameState.status === 'roundEnded') && currentRound && (
                <motion.div 
                    key={`round-${gameState.currentRoundIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <div className="relative w-full h-full max-w-[800px] max-h-[800px] flex items-center justify-center">
                        
                        {/* Center Clue */}
                        <motion.div 
                           initial={{ scale: 0 }}
                           animate={{ scale: 1 }}
                           transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                           className={`absolute z-30 w-56 h-56 md:w-[320px] md:h-[320px] rounded-[2rem] md:rounded-[3rem] flex flex-col items-center justify-center p-6 md:p-10 text-center shadow-2xl backdrop-blur-md border border-white/20 transition-colors duration-500 overflow-hidden
                                ${gameState.status === 'roundEnded' && gameState.roundWinnerUid ? 'bg-emerald-500/20 shadow-emerald-500/40 border-emerald-500/50' : 
                                  gameState.status === 'roundEnded' && !gameState.roundWinnerUid ? 'bg-rose-500/20 shadow-rose-500/40 border-rose-500/50' : 
                                  'bg-indigo-600/30 shadow-indigo-600/40 text-white'}`}
                        >
                            {gameState.status === 'roundEnded' ? (
                                <div className="flex flex-col items-center max-w-full">
                                  <span className="text-lg md:text-xl text-white font-bold mb-2">
                                      {gameState.roundGuesses.filter(g => g.correct).length > 0 
                                        ? "Correct Guesses:"
                                        : "Time's up!"}
                                  </span>
                                  {gameState.roundGuesses.filter(g => g.correct).length > 0 && (
                                      <span className="text-sm md:text-base text-emerald-300 font-medium mb-3 text-center">
                                          {gameState.roundGuesses.filter(g => g.correct).map(g => gameState.players.find(p => p.uid === g.uid)?.name).join(', ')}
                                      </span>
                                  )}
                                  <span className="text-sm md:text-base text-white/70 font-medium line-clamp-3">
                                      {currentRound.targetText} = {currentRound.clueText}
                                  </span>
                                </div>
                            ) : (
                                <>
                                  <AutoTextFit minFontSize={14} maxFontSize={36} wrap={true} className="font-extrabold text-white text-center leading-tight w-full h-full flex items-center justify-center mb-2" text={currentRound.clueText} />
                                  <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/20">
                                      <motion.div 
                                          className="h-full bg-indigo-400"
                                          initial={{ width: '100%' }}
                                          animate={{ width: '0%' }}
                                          transition={{ duration: 15, ease: 'linear' }}
                                      />
                                  </div>
                                </>
                            )}
                        </motion.div>

                        {/* Options */}
                        <div className="absolute inset-0 origin-center pointer-events-none flex items-center justify-center">
                            {currentRound.options.map((opt, i) => {
                                const { x, y } = getCoordinates(i, currentRound.options.length, 300); // increased radius
                                
                                const myGuess = gameState.roundGuesses.find(g => g.uid === user?.id && g.wordId === opt.id);
                                const isCorrectTarget = opt.matchId === currentRound.targetId;
                                const isRoundEnded = gameState.status === 'roundEnded';
                                
                                let bgClass = 'bg-slate-800 border-slate-600 hover:bg-slate-700 hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)]';
                                
                                if (isRoundEnded) {
                                    if (isCorrectTarget) bgClass = 'bg-emerald-600 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.6)] z-40';
                                    else if (myGuess && !myGuess.correct) bgClass = 'bg-rose-900/50 border-rose-800/50 text-white/30 truncate';
                                    else bgClass = 'bg-slate-800/50 border-slate-700/50 text-white/50';
                                } else {
                                    if (myGuess && !myGuess.correct) bgClass = 'bg-rose-900 border-rose-500 shadow-rose-500/20 text-white pointer-events-none opacity-50 scale-95 origin-center';
                                    else if (localCorrect && isCorrectTarget) bgClass = 'bg-emerald-600 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.6)] z-40 pointer-events-none scale-110';
                                }

                                const isLocalPenalty = !isRoundEnded && Date.now() < localPenaltyAt;

                                return (
                                    <motion.button
                                        key={opt.id}
                                        initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                        animate={{ opacity: 1, scale: 1, x, y }}
                                        transition={{ 
                                            type: 'spring', 
                                            stiffness: 200, 
                                            damping: 20, 
                                            delay: gameState.status === 'playing' ? 0.2 + (i * 0.05) : 0 
                                        }}
                                        onClick={() => submitGuess(opt)}
                                        disabled={gameState.status !== 'playing' || !!myGuess || isLocalPenalty || localCorrect}
                                        className={`absolute w-28 h-20 md:w-36 md:h-24 rounded-2xl flex items-center justify-center p-3 text-center transition-all duration-200 border-2 text-white shadow-xl pointer-events-auto ${bgClass}`}
                                        style={{ marginLeft: '-3.5rem', marginTop: '-2.5rem' }} // Center anchor loosely
                                    >
                                        <AutoTextFit minFontSize={12} maxFontSize={18} wrap={true} className="font-bold leading-tight" text={opt.text} />
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            )}

            {gameState.status === 'ended' && (
                <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute inset-0 flex items-center justify-center z-50 bg-slate-900/40 backdrop-blur-sm p-4"
                >
                    <div className="bg-slate-800 border items-center flex flex-col border-slate-700 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trophy className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2">Game Over!</h2>
                        <h3 className="text-indigo-400 font-medium mb-6">Final Scores</h3>

                        <div className="w-full flex justify-center space-y-2 flex-col items-center">
                            {gameState.players.sort((a,b) => b.score - a.score).map((p, i) => (
                                <div key={p.uid} className={`flex w-full items-center justify-between p-4 rounded-xl ${i === 0 ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30' : 'bg-slate-700/50'}`}>
                                    <div className="flex items-center gap-3 text-white">
                                        <span className={`font-black ${i === 0 ? 'text-amber-400' : 'text-slate-400'}`}>#{i+1}</span>
                                        <span className="font-bold">{p.name} {p.uid === user?.id && '(You)'}</span>
                                    </div>
                                    <span className={`font-black text-xl ${i===0 ? 'text-amber-400' : 'text-white'}`}>{p.score}</span>
                                </div>
                            ))}
                        </div>

                        <Button 
                           onClick={() => onGameOver(myPlayer?.score || 0)} 
                           className="w-full h-14 mt-8 bg-indigo-600 hover:bg-indigo-500 text-white text-lg rounded-xl font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
                        >
                            Exit Game
                        </Button>
                    </div>
                </motion.div>
            )}
         </AnimatePresence>
      </div>
    </div>
  );
}
