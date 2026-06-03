import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Trophy, Calendar, Medal } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function HallOfFame() {
  const [data, setData] = useState<Record<string, Record<string, any[]>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHallOfFame = async () => {
      setLoading(true);
      try {
        const result = await api.getHallOfFameData();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch hall of fame", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHallOfFame();
  }, []);

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const getTrophyColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-500 fill-yellow-500/20'; // Gold
      case 1: return 'text-slate-400 fill-slate-400/20'; // Silver
      case 2: return 'text-amber-700 fill-amber-700/20'; // Bronze
      default: return 'text-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Sort months descending
  const sortedMonths = Object.keys(data).sort((a, b) => b.localeCompare(a));

  if (sortedMonths.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-center">
        <Trophy className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-700 mb-2">No Hall of Fame Data Yet</h3>
        <p>Students must play games to appear in the Hall of Fame.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto animate-in fade-in duration-500 pb-6 pr-2 space-y-12">
      <header className="mb-4 flex-none">
        <h1 className="text-3xl font-bold uppercase tracking-widest text-slate-900 mb-1 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          Hall of Fame
        </h1>
        <p className="text-slate-500 font-light text-sm">
          Top 3 students for each grade level, historically tracked by month.
        </p>
      </header>

      {sortedMonths.map(monthKey => {
        const monthData = data[monthKey];
        const gradeLevels = Object.keys(monthData).sort();

        return (
          <section key={monthKey} className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-2">
              <Calendar className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-wider">{formatMonth(monthKey)}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {gradeLevels.map(grade => {
                const students = monthData[grade];
                if (students.length === 0) return null;

                return (
                  <Card key={grade} className="border-2 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                      <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-600 flex justify-between items-center">
                        <span>Grade Level: <span className="text-purple-600">{grade}</span></span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-100">
                        {students.map((student, idx) => (
                          <div key={student.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-8 flex justify-center">
                                <Medal className={`w-6 h-6 ${getTrophyColor(idx)}`} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{student.name}</p>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Rank {idx + 1}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-black text-emerald-500">{student.score}</span>
                              <span className="text-xs text-slate-400 font-bold ml-1 uppercase">pts</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
