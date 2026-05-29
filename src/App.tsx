/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { BookOpen, Brain, Gamepad2, Sparkles, ArrowRight, Trophy, Flame, Target, Zap, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TeacherAuthModal } from '@/components/TeacherAuthModal';
import { TeacherDashboard } from '@/components/TeacherDashboard';
import { StudentWordBank } from '@/components/StudentWordBank';
import { StudyVocab } from '@/components/StudyVocab';
import { InteractiveGames } from '@/components/InteractiveGames';
import { StudentLogin } from '@/components/StudentLogin';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { FloatingWords, AmbientOrbs } from '@/components/AppBackground';

export default function App() {
  const [view, setView] = useState<'login' | 'hub' | 'dashboard' | 'word-bank' | 'study' | 'games' | 'onboarding'>('login');
  const [stats, setStats] = useState({ words: 0, subjects: 0, games: 5, contributors: 0, topSubject: 'None', longestWord: 'None', totalSessions: 0, averagePercent: 0 });
  const [backgroundWords, setBackgroundWords] = useState<string[]>([]);
  
  const [pendingAction, setPendingAction] = useState<'word-bank' | 'study' | 'games' | null>(null);

  const handleStudentAction = (action: 'word-bank' | 'study' | 'games') => {
    const user = api.getUser();
    if (user && user.role === 'student') {
      setView(action);
    } else {
      setPendingAction(action);
      setView('login');
    }
  };

  useEffect(() => {
    async function checkAuthAndStats() {
      try {
        const [user, words, gameStats] = await Promise.all([
          api.me(),
          api.getWords().catch(() => []),
          api.getGameStats().catch(() => ({ totalSessions: 0, averagePercent: 0 }))
        ]);
        
        const subjects = new Set(words.map((w: any) => w.subject).filter(Boolean)).size;
        
        let contributors = 0;
        let topSubject = 'None';
        let longestWord = 'None';
        
        if (words && words.length > 0) {
          contributors = new Set(words.map((w: any) => w.teacherId).filter(Boolean)).size;
          
          const subjectCounts = (words as any[]).reduce((acc: any, w: any) => {
            if (w.subject) acc[w.subject] = (acc[w.subject] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          if (Object.keys(subjectCounts).length > 0) {
              topSubject = Object.keys(subjectCounts).reduce((a, b) => subjectCounts[a] > subjectCounts[b] ? a : b);
          }
          
          const longest = words.reduce((a: any, b: any) => (a.word?.length || 0) > (b.word?.length || 0) ? a : b);
          longestWord = longest.word || 'None';
        }
        
        setStats({ 
            words: words.length, 
            subjects, 
            games: 5,
            contributors,
            topSubject,
            longestWord,
            totalSessions: gameStats.totalSessions,
            averagePercent: gameStats.averagePercent
        });
        
        const bgWords = words.map((w: any) => w.word).sort(() => Math.random() - 0.5).slice(0, 15);
        if (bgWords.length < 10) {
            bgWords.push('photosynthesis', 'mitochondria', 'democracy', 'algorithm', 'ecosystem', 'metaphor', 'velocity', 'equilibrium', 'catalyst', 'paradigm');
        }
        setBackgroundWords(bgWords.slice(0, 15));

        if (user) {
          setView(user.role === 'student' ? 'hub' : 'dashboard');
        } else {
          setView('login');
        }
      } catch (e) {
        setView('login');
      }
    }
    checkAuthAndStats();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };



  if (view === 'dashboard') {
    return <TeacherDashboard onLogout={() => setView('login')} />;
  }

  if (view === 'word-bank') {
    return <StudentWordBank onBack={() => setView('hub')} />;
  }

  if (view === 'study') {
    return <StudyVocab onBack={() => setView('hub')} />;
  }

  if (view === 'games') {
    return <InteractiveGames onBack={() => setView('hub')} backgroundWords={backgroundWords} />;
  }

  if (view === 'onboarding') {
    return (
      <div className="relative h-screen w-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <AmbientOrbs />
        <div className="z-10 bg-slate-800 p-8 rounded-3xl max-w-lg w-full text-center border border-slate-700 shadow-2xl">
          <PartyPopper className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4 tracking-tight">Welcome, {api.getUser()?.name}!</h1>
          <p className="text-slate-300 mb-8 leading-relaxed">
            Your account is ready. Going forward, you can sign in using your Name (<strong className="text-white">{api.getUser()?.name}</strong>) or Access Code (<strong className="text-white">{api.getUser()?.accessCode}</strong>) along with your password.
          </p>
          <div className="grid grid-cols-1 gap-4 mb-8 text-left">
            <div className="bg-slate-700/50 p-4 rounded-xl flex items-center gap-4">
              <BookOpen className="w-8 h-8 text-cyan-400 shrink-0" />
              <div>
                <h3 className="font-bold">Word Bank & Study</h3>
                <p className="text-xs text-slate-400">Review terms and practice with smart flashcards.</p>
              </div>
            </div>
            <div className="bg-slate-700/50 p-4 rounded-xl flex items-center gap-4">
              <Gamepad2 className="w-8 h-8 text-purple-400 shrink-0" />
              <div>
                <h3 className="font-bold">Interactive Games</h3>
                <p className="text-xs text-slate-400">Play games to earn points and climb the global leaderboard!</p>
              </div>
            </div>
          </div>
          <Button 
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-6 text-lg rounded-xl transition-all shadow-lg shadow-blue-500/25"
            onClick={() => {
              if (pendingAction) {
                setView(pendingAction);
                setPendingAction(null);
              } else {
                setView('hub');
              }
            }}
          >
            Enter the Hub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 text-slate-900 font-sans selection:bg-purple-200 selection:text-slate-900">
      <FloatingWords backgroundWords={backgroundWords} />
      <AmbientOrbs />

      {/* Navigation */}
      <header className="w-full border-b border-purple-200/50 bg-white/70 backdrop-blur-md flex-none shadow-sm z-10 relative">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center text-white font-bold">X</div>
            <span className="text-xs font-bold tracking-[0.2em] uppercase opacity-80 text-slate-900">XSIB Educational Network</span>
          </div>
          <nav className="flex items-center gap-4">
            {api.getUser() ? (
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-purple-700 tracking-wide">
                  Welcome, {api.getUser()?.name}
                </span>
                <Button variant="ghost" className="text-slate-500 hover:text-slate-900" onClick={() => { api.logout(); setView('login'); }}>
                  Logout
                </Button>
              </div>
            ) : (
              <TeacherAuthModal onLoginSuccess={() => setView('dashboard')} />
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center container mx-auto px-6 relative z-10 overflow-y-auto custom-scrollbar">
        {view === 'login' ? (
          <StudentLogin onLoginSuccess={(user: any) => {
            if (user?.isNewUser) {
              setView('onboarding');
            } else if (pendingAction) {
              setView(pendingAction);
              setPendingAction(null);
            } else {
              setView('hub');
            }
          }} />
        ) : view === 'hub' ? (
          <>
            {/* Hero Section */}
            <section className="flex flex-col items-center text-center max-w-5xl w-full mb-6">
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl font-[800] leading-[0.85] tracking-[-0.04em] uppercase text-slate-900 mb-3"
          >
            XSIB<br />
            <span className="text-purple-600">
              VocabHub.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm md:text-base text-slate-600 font-medium max-w-2xl mb-4"
          >
            Level up your language skills with interactive flashcards and fun games based on what you learned in class this week.
          </motion.p>


        </section>

        {/* Features Section */}
        <section className="w-full max-w-4xl mb-6">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <motion.div variants={itemVariants}>
              <Card 
                className="h-full bg-white/70 backdrop-blur-md border border-purple-200/50 rounded-2xl shadow-lg shadow-purple-500/5 hover:bg-white/90 transition-all hover:shadow-purple-500/10 hover:border-purple-300 duration-300 cursor-pointer"
                onClick={() => handleStudentAction('word-bank')}
              >
                <CardHeader className="pb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center text-white shadow-md mb-4">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl text-slate-900 font-bold tracking-tight">View Word Bank</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-slate-600 font-medium">
                    Browse and search through the entire collection of terms curated by your teachers.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card 
                className="h-full bg-white/70 backdrop-blur-md border border-purple-200/50 rounded-2xl shadow-lg shadow-purple-500/5 hover:bg-white/90 transition-all hover:shadow-purple-500/10 hover:border-purple-300 duration-300 cursor-pointer"
                onClick={() => handleStudentAction('study')}
              >
                <CardHeader className="pb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center text-white shadow-md mb-4">
                    <Brain className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl text-slate-900 font-bold tracking-tight">Study Vocab</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-slate-600 font-medium">
                    Review terms, definitions, and example sentences with interactive smart flashcards.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card 
                className="h-full bg-white/70 backdrop-blur-md border border-purple-200/50 rounded-2xl shadow-lg shadow-purple-500/5 hover:bg-white/90 transition-all hover:shadow-purple-500/10 hover:border-purple-300 duration-300 cursor-pointer"
                onClick={() => handleStudentAction('games')}
              >
                <CardHeader className="pb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center text-white shadow-md mb-4">
                    <Gamepad2 className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl text-slate-900 font-bold tracking-tight">Interactive Games</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-slate-600 font-medium">
                    Test your knowledge with exciting mini-games and quizzes. Learning shouldn't be boring.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </section>

        {/* Analytics Highlights Section */}
        <section className="w-full max-w-4xl mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Global Stats</h2>
          </div>
          
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-md border border-purple-200/50 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                  <Flame className="h-4 w-4" />
                </div>
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Total Words</h3>
              </div>
              <p className="text-2xl font-[800] text-slate-900">{stats.words}<span className="text-sm font-bold text-slate-400 ml-1">words</span></p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-md border border-purple-200/50 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                  <BookOpen className="h-4 w-4" />
                </div>
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Active Subjects</h3>
              </div>
              <p className="text-2xl font-[800] text-slate-900">{stats.subjects}<span className="text-sm font-bold text-slate-400 ml-1">subjects</span></p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-md border border-purple-200/50 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                  <Gamepad2 className="h-4 w-4" />
                </div>
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Sessions Played</h3>
              </div>
              <p className="text-2xl font-[800] text-slate-900">{stats.totalSessions}<span className="text-sm font-bold text-slate-400 ml-1">games</span></p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-md border border-purple-200/50 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                  <Target className="h-4 w-4" />
                </div>
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Avg. Score</h3>
              </div>
              <p className="text-2xl font-[800] text-slate-900">{stats.averagePercent}<span className="text-sm font-bold text-slate-400 ml-1">%</span></p>
            </motion.div>
          </motion.div>
        </section>
        </>
        ) : null}
      </main>
    </div>
  );
}
