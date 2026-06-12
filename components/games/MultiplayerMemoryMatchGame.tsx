import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, Users, Timer, Info } from 'lucide-react';
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

interface MultiplayerMemoryMatchGameProps {
  words: Word[];
  mode: 'translation' | 'definition';
  turnTimeLimit: number;
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

interface CardType {
  id: string;
  matchId: string;
  text: string;
  type: 'word' | 'meaning';
  matched: boolean;
  matchedBy?: string;
}

interface GameState {
  roomId: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'ended';
  players: Player[];
  cards: CardType[];
  flippedIds: string[];
  currentTurnIndex: number;
  turnEndsAt: number | null;
  mode: 'translation' | 'definition';
  turnTimeLimit: number;
}

export function MultiplayerMemoryMatchGame({ words, mode, turnTimeLimit, roomId, isHost, onGameOver }: MultiplayerMemoryMatchGameProps) {
  const [gameState, setGameState] = useState<GameState>({
    roomId: isHost ? Math.floor(100000 + Math.random() * 900000).toString() : roomId,
    hostId: '',
    status: 'lobby',
    players: [],
    cards: [],
    flippedIds: [],
    currentTurnIndex: 0,
    turnEndsAt: null,
    mode,
    turnTimeLimit
  });

  const [localFlipped, setLocalFlipped] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(turnTimeLimit);
  const channelRef = useRef<any>(null);
  const gameStateRef = useRef(gameState);
  const user = api.getUser();
  const isMyTurn = gameState.status === 'playing' && gameState.players[gameState.currentTurnIndex]?.uid === user?.id;
  const myPlayer = gameState.players.find(p => p.uid === user?.id);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!user) return;
    
    // We utilize a simple Broadcast channel
    const channelId = isHost ? gameState.roomId : roomId;
    const channel = supabase.channel(`game-${channelId}`, {
      config: { broadcast: { ack: true } }
    });

    channelRef.current = channel;

    channel.on('broadcast', { event: 'state' }, ({ payload }) => {
      setGameState(payload);
    });

    channel.on('broadcast', { event: 'join' }, ({ payload }) => {
      if (isHost && gameStateRef.current.status === 'lobby') {
        setGameState(prev => {
          if (prev.players.length >= 4 || prev.players.find(p => p.uid === payload.user.uid)) return prev;
          const newPlayers = [...prev.players, { ...payload.user, score: 0, online: true }];
          const newState = { ...prev, players: newPlayers };
          // Broadcast full state down
          setTimeout(() => channel.send({ type: 'broadcast', event: 'state', payload: newState }), 100);
          return newState;
        });
      }
    });

    channel.on('broadcast', { event: 'action' }, ({ payload }) => {
      if (isHost && gameStateRef.current.status === 'playing') {
        handlePlayerAction(payload);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        if (!isHost) {
          channel.send({ type: 'broadcast', event: 'join', payload: { user: { uid: user.id, name: user.name } } });
        } else {
          // Initialize Host
          const initialCards: CardType[] = [];
          words.slice(0, 8).forEach(w => {
            initialCards.push({ id: `${w.id}-word`, matchId: w.id, text: w.word, type: 'word', matched: false });
            initialCards.push({ id: `${w.id}-meaning`, matchId: w.id, text: mode === 'translation' ? w.translation || w.definition : w.definition || w.translation, type: 'meaning', matched: false });
          });
          initialCards.sort(() => Math.random() - 0.5);

          const newState: GameState = {
            ...gameState,
            hostId: user.id,
            players: [{ uid: user.id, name: user.name, score: 0, online: true }],
            cards: initialCards
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

  // Turn Timer
  useEffect(() => {
    if (gameState.status !== 'playing' || !gameState.turnEndsAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((gameState.turnEndsAt! - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      if (isHost && remaining === 0) {
         // Auto-pass turn
         passTurn();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameState.status, gameState.turnEndsAt, gameState.currentTurnIndex]);

  // Sync local flipped state with canonical state immediately when changed
  useEffect(() => {
    setLocalFlipped(gameState.flippedIds);
    if (gameState.status === 'ended' && myPlayer?.score) {
       // Only save the points to high score if I have any
       if (myPlayer.score > 0) {
          api.recordGameSession('multiplayer-memory', myPlayer.score, 1000);
       }
    }
  }, [gameState.flippedIds, gameState.status]);

  const broadcastState = (state: GameState) => {
    channelRef.current?.send({ type: 'broadcast', event: 'state', payload: state });
  };

  const passTurn = (currentState?: GameState) => {
    setGameState(prev => {
      const state = currentState || prev;
      const nextIndex = (state.currentTurnIndex + 1) % state.players.length;
      const newState: GameState = {
        ...state,
        flippedIds: [],
        currentTurnIndex: nextIndex,
        turnEndsAt: Date.now() + (state.turnTimeLimit * 1000)
      };
      broadcastState(newState);
      return newState;
    });
  };

  const handlePlayerAction = (action: any) => {
     if (action.type === 'flip') {
        setGameState(prev => {
           if (prev.flippedIds.length >= 2 || prev.flippedIds.includes(action.cardId)) return prev;
           
           const card = prev.cards.find(c => c.id === action.cardId);
           if (!card || card.matched) return prev;

           const newFlipped = [...prev.flippedIds, action.cardId];
           let newState = { ...prev, flippedIds: newFlipped };

           if (newFlipped.length === 2) {
              const c1 = prev.cards.find(c => c.id === newFlipped[0])!;
              const c2 = prev.cards.find(c => c.id === newFlipped[1])!;
              
              if (c1.matchId === c2.matchId && c1.type !== c2.type) {
                 // Match! Give points and keep turn
                 const activePlayerUID = prev.players[prev.currentTurnIndex].uid;
                 const newPlayers = prev.players.map(p => p.uid === activePlayerUID ? { ...p, score: p.score + 500 } : p);
                 const newCards = prev.cards.map(c => newFlipped.includes(c.id) ? { ...c, matched: true, matchedBy: activePlayerUID } : c);
                 
                 const allMatched = newCards.every(c => c.matched);
                 playSound('correct');
                 
                 newState = {
                    ...newState,
                    players: newPlayers,
                    cards: newCards,
                    status: allMatched ? 'ended' : 'playing',
                 };
                 
                 if (allMatched) {
                    confetti({ particleCount: 150, spread: 80 });
                    broadcastState(newState);
                    return newState;
                 } else {
                    const nextIndex = (newState.currentTurnIndex + 1) % newState.players.length;
                    newState.flippedIds = [];
                    newState.currentTurnIndex = nextIndex;
                    newState.turnEndsAt = Date.now() + (newState.turnTimeLimit * 1000);
                 }
              } else {
                 newState.turnEndsAt = Date.now() + 2500;
                 setTimeout(() => passTurn(), 1500);
              }
           }
           
           broadcastState(newState);
           return newState;
        });
     }
  };

  const handleCardClick = (cardId: string) => {
    if (!isMyTurn) return;
    if (localFlipped.length >= 2 || localFlipped.includes(cardId)) return;
    const card = gameState.cards.find(c => c.id === cardId);
    if (!card || card.matched) return;

    // Optimistic UI
    setLocalFlipped(prev => [...prev, cardId]);
    if (isHost) {
      handlePlayerAction({ type: 'flip', cardId });
    } else {
      channelRef.current?.send({ type: 'broadcast', event: 'action', payload: { type: 'flip', cardId } });
    }
  };

  const startGame = () => {
    if (!isHost) return;
    const newState: GameState = {
      ...gameState,
      status: 'playing',
      turnEndsAt: Date.now() + (gameState.turnTimeLimit * 1000)
    };
    setGameState(newState);
    broadcastState(newState);
  };

  if (gameState.status === 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto w-full p-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl w-full text-center">
          <Users className="w-16 h-16 text-fuchsia-400 mx-auto mb-4" />
          <h2 className="text-3xl font-black text-white mb-2">Waiting Room</h2>
          {isHost ? (
            <p className="text-fuchsia-200 mb-6 font-medium">Share this Room Code with up to 3 friends:</p>
          ) : (
            <p className="text-fuchsia-200 mb-6 font-medium">Waiting for the host to start the game...</p>
          )}

          <div className="bg-slate-900/50 rounded-2xl p-6 mb-8 border border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <p className="text-sm uppercase tracking-widest text-slate-400 font-bold mb-2">Room Code</p>
            <p className="text-6xl font-black text-white tracking-[0.2em] relative z-10">{gameState.roomId}</p>
          </div>

          <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-8">
            <h3 className="text-sm font-bold text-white mb-3 text-left uppercase tracking-widest">Players ({gameState.players.length}/4)</h3>
            <div className="flex justify-center flex-wrap gap-3">
              <AnimatePresence>
                {gameState.players.map((p, i) => (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-fuchsia-500/20 border border-fuchsia-400/30 rounded-full px-4 py-2 flex items-center gap-2"
                    key={p.uid}
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                    <span className="text-white font-bold text-sm tracking-wide">{p.name || 'Anonymous'}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {isHost ? (
            <Button 
              onClick={startGame} 
              disabled={gameState.players.length < 2}
              className={`w-full h-14 text-lg rounded-2xl font-bold shadow-lg transition-all ${
                gameState.players.length >= 2 
                  ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:scale-[1.02] text-white shadow-fuchsia-500/30' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {gameState.players.length >= 2 ? 'Start Game' : 'Waiting for more players...'}
            </Button>
          ) : (
            <div className="h-14 w-full rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center">
              <span className="text-white font-medium animate-pulse tracking-wide">Waiting...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full p-4 md:p-6 pb-24 z-10 space-y-4">
      {/* Top Header */}
      <div className="flex justify-between items-end">
         <div className="flex gap-2 items-center">
            {gameState.players.map((p, index) => (
               <div key={p.uid} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${gameState.currentTurnIndex === index ? 'bg-fuchsia-500/20 border border-fuchsia-400/50 shadow-[0_0_15px_rgba(217,70,239,0.3)] scale-110' : 'bg-white/5 border border-white/10 opacity-70'}`}>
                  <span className={`text-xs font-bold uppercase tracking-wider ${gameState.currentTurnIndex === index ? 'text-fuchsia-300' : 'text-slate-400'}`}>{p.name}</span>
                  <span className="text-lg font-black text-white">{p.score}</span>
               </div>
            ))}
         </div>
         <div className="flex flex-col items-end text-right">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Turn Time</span>
            <div className="flex items-center gap-2 bg-slate-900/50 border border-white/10 px-4 py-2 rounded-xl">
               <Timer className={`w-5 h-5 ${timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`} />
               <span className={`text-2xl font-black ${timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</span>
            </div>
         </div>
      </div>

      {gameState.status === 'playing' ? (
         <>
         <div className="text-center my-2 h-8">
            {isMyTurn ? (
               <span className="text-lg font-bold text-fuchsia-300 animate-pulse">Your Turn! Select two cards.</span>
            ) : (
               <span className="text-lg font-medium text-slate-400">Waiting for {gameState.players[gameState.currentTurnIndex]?.name}'s turn...</span>
            )}
         </div>

         <div className="flex-1 min-h-0 w-full rounded-3xl bg-white/5 border border-white/10 p-2 sm:p-4 md:p-6 overflow-hidden shadow-2xl flex flex-col items-center">
           <div className="flex flex-wrap justify-center content-center gap-2 sm:gap-3 lg:gap-4 h-full w-full">
             {gameState.cards.map((card) => {
               const isFlipped = localFlipped.includes(card.id) || card.matched;
               const isMatched = card.matched;
               const matchedPlayer = isMatched ? gameState.players.find(p => p.uid === card.matchedBy) : null;

               return (
                 <motion.div
                   key={card.id}
                   className={`relative cursor-pointer [perspective:1000px] select-none flex-shrink-0 ${(!isMyTurn && !isFlipped) ? 'opacity-70 pointer-events-none' : ''}`}
                   style={{ width: 'clamp(85px, min(22vw, 16vh), 180px)', height: 'clamp(75px, min(18vw, 13vh), 140px)' }}
                   onClick={() => handleCardClick(card.id)}
                   whileHover={isMyTurn && !isFlipped ? { scale: 1.05, translateY: -5 } : {}}
                   whileTap={isMyTurn && !isFlipped ? { scale: 0.95 } : {}}
                 >
                   <motion.div
                     className="w-full h-full relative [transform-style:preserve-3d] shadow-lg rounded-xl sm:rounded-2xl"
                     initial={false}
                     animate={{ rotateY: isFlipped ? 180 : 0 }}
                     transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
                   >
                     {/* Front of card (hidden state) */}
                     <div className="absolute inset-0 [backface-visibility:hidden] bg-gradient-to-br from-fuchsia-600 via-fuchsia-500 to-pink-600 rounded-xl sm:rounded-2xl flex items-center justify-center border-2 border-fuchsia-400/50 shadow-[inset_0_0_20px_rgba(255,255,255,0.2)] overflow-hidden">
                       <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-[bg-pan_3s_linear_infinite]"></div>
                       <span className="text-white/40 font-black text-4xl sm:text-5xl drop-shadow-md z-10 transition-transform duration-300 hover:scale-110">?</span>
                     </div>
                     
                     {/* Back of card (revealed state) */}
                     <div className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl sm:rounded-2xl flex items-center justify-center p-2 sm:p-3 text-center border-2 border-b-4 z-10 transition-all duration-300 ${
                       isMatched 
                         ? 'bg-gradient-to-b from-fuchsia-50 to-fuchsia-100 border-fuchsia-400 text-fuchsia-800 shadow-[0_0_20px_rgba(232,121,249,0.3)] scale-105'
                         : 'bg-gradient-to-b from-white to-slate-50 border-slate-200 text-slate-800 shadow-xl shadow-black/10'
                     }`}>
                       {isMatched && (
                         <motion.div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white pointer-events-none" initial={{ opacity: 0.8, scale: 0.9 }} animate={{ opacity: 0, scale: 1.1 }} transition={{ duration: 0.5, ease: "easeOut" }}></motion.div>
                       )}
                       <div className="w-full h-full flex flex-col justify-center items-center gap-1 z-20 text-center overflow-hidden">
                         {isMatched && card.type === 'word' && matchedPlayer && (
                            <span className="text-[10px] sm:text-xs font-bold text-fuchsia-500 uppercase tracking-widest">{matchedPlayer.name}</span>
                         )}
                        <AutoTextFit 
                          text={card.text} 
                          minFontSize={10} 
                          maxFontSize={card.type === 'word' ? 24 : 18} 
                          className="font-bold leading-tight drop-shadow-sm w-full"
                        />
                       </div>
                     </div>
                   </motion.div>
                 </motion.div>
               );
             })}
           </div>
         </div>
         </>
      ) : (
         <div className="flex flex-col items-center justify-center flex-1 w-full max-w-lg mx-auto">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9, y: 20 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl w-full text-center shadow-2xl relative overflow-hidden"
           >
             <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-fuchsia-500/20 blur-3xl pointer-events-none"></div>
             <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-6 shrink-0" />
             <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Game Over!</h2>

             <div className="space-y-4 my-8">
                {gameState.players.sort((a,b) => b.score - a.score).map((p, idx) => (
                   <div key={p.uid} className={`flex justify-between items-center p-4 rounded-xl border ${idx === 0 ? 'bg-yellow-500/20 border-yellow-400/50' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex items-center gap-3">
                         <span className={`text-xl font-black ${idx === 0 ? 'text-yellow-400' : 'text-slate-400'}`}>#{idx + 1}</span>
                         <span className="text-lg font-bold text-white">{p.name}</span>
                      </div>
                      <span className="text-xl font-black text-white">{p.score} pt</span>
                   </div>
                ))}
             </div>

             <div className="flex flex-col gap-3">
               <Button onClick={() => onGameOver(myPlayer?.score || 0)} className="w-full h-14 bg-white hover:bg-slate-100 text-slate-900 font-bold text-lg rounded-xl transition-all hover:scale-[1.02]">
                 Exit Game
               </Button>
             </div>
           </motion.div>
         </div>
      )}
    </div>
  );
}
