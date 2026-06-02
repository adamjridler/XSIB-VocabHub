import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  { id: 'school', label: 'School' },
  { id: 'PDP', label: 'PDP' },
  { id: 'IB1', label: 'IB1' },
  { id: 'IB2', label: 'IB2' }
];

export function StudentLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [categoryIndex, setCategoryIndex] = useState(0);

  useEffect(() => {
    async function fetchLeaderboard() {
      const data = await api.getStudentLeaderboard();
      setLeaderboard(data);
    }
    fetchLeaderboard();
  }, []);

  if (leaderboard.length === 0) return null;

  const currentCategory = CATEGORIES[categoryIndex];
  
  const filteredLeaderboard = leaderboard.filter(student => {
    if (currentCategory.id === 'school') return true;
    return student.gradeLevel === currentCategory.id;
  }).slice(0, 10); // show top 10 for the current category

  const nextCategory = () => setCategoryIndex((i) => (i + 1) % CATEGORIES.length);
  const prevCategory = () => setCategoryIndex((i) => (i - 1 + CATEGORIES.length) % CATEGORIES.length);

  return (
    <Card className="bg-white/80 backdrop-blur-md border border-purple-200/50 rounded-3xl shadow-lg overflow-hidden flex flex-col h-full">
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-2 flex-shrink-0">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Global Leaderboard</h3>
        </div>
        
        <div className="flex items-center justify-between mb-4 bg-slate-100 rounded-full py-1 px-3 shadow-inner">
          <button onClick={prevCategory} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div className="text-sm font-bold text-slate-700 uppercase tracking-widest w-24 text-center">
            {currentCategory.label}
          </div>
          <button onClick={nextCategory} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        
        <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2 overflow-x-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentCategory.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {filteredLeaderboard.length === 0 ? (
                 <div className="text-center py-6 text-slate-400 font-medium text-sm">
                   No scores in this category yet.
                 </div>
              ) : (
                filteredLeaderboard.map((student, index) => (
                  <motion.div 
                    key={student.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-2xl ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-100 border border-yellow-200' :
                      index === 1 ? 'bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200' :
                      index === 2 ? 'bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200' :
                      'bg-white border border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm text-sm ${
                        index === 0 ? 'bg-yellow-400 text-white' :
                        index === 1 ? 'bg-slate-300 text-slate-700' :
                        index === 2 ? 'bg-orange-400 text-white' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{student.name}</h4>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{student.gradeLevel}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-lg text-slate-900 leading-none mb-0.5">{student.highScore}</div>
                      <div className="text-[9px] uppercase font-bold text-slate-400 tracking-widest leading-none">Score</div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
