import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Trophy, Medal } from 'lucide-react';
import { motion } from 'motion/react';

interface LeaderboardForGameProps {
  configId: string;
}

export function LeaderboardForGame({ configId }: LeaderboardForGameProps) {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaders() {
      setLoading(true);
      const data = await api.getGameLeaderboard(configId);
      setLeaders(data);
      setLoading(false);
    }
    fetchLeaders();
  }, [configId]);

  if (loading) {
    return (
      <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 flex flex-col justify-center animate-pulse min-h-[160px]">
        <div className="h-6 w-32 bg-slate-800 rounded-full mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-800 rounded-full w-full"></div>
          <div className="h-4 bg-slate-800 rounded-full w-4/5"></div>
          <div className="h-4 bg-slate-800 rounded-full w-5/6"></div>
        </div>
      </div>
    );
  }

  if (leaders.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/40 p-5 rounded-3xl border border-white/5 flex flex-col justify-start">
      <div className="flex items-center gap-3 mb-4 text-slate-400">
        <Trophy className="w-5 h-5 text-amber-500" />
        <span className="font-bold tracking-wide uppercase text-sm">Mode Top Scores</span>
      </div>
      <div className="flex flex-col gap-3">
        {leaders.map((leader, i) => (
           <motion.div 
             key={i}
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: i * 0.1 }}
             className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-white/5"
           >
             <div className="flex items-center gap-3">
               <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${i === 0 ? 'bg-amber-500 text-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : i === 1 ? 'bg-slate-300 text-slate-900' : 'bg-orange-700 text-orange-100'}`}>
                 {i + 1}
               </div>
               <span className="font-semibold text-slate-200">{leader.studentName || 'Anonymous'}</span>
             </div>
             <span className="font-black text-emerald-400">{leader.score}</span>
           </motion.div>
        ))}
      </div>
    </div>
  );
}
