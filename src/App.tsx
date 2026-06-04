/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import {
  BookOpen,
  Brain,
  Gamepad2,
  Sparkles,
  ArrowRight,
  Trophy,
  Globe,
  Flame,
  Target,
  Zap,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TeacherAuthModal } from "@/components/TeacherAuthModal";
import { TeacherDashboard } from "@/components/TeacherDashboard";
import { StudentWordBank } from "@/components/StudentWordBank";
import { StudyVocab } from "@/components/StudyVocab";
import { InteractiveGames } from "@/components/InteractiveGames";
import { StudentLogin } from "@/components/StudentLogin";
import { useState, useEffect, Fragment } from "react";
import { api } from "@/lib/api";
import { FloatingWords, AmbientOrbs } from "@/components/AppBackground";

import { StudentProfileModal } from "@/components/StudentProfileModal";

export default function App() {
  const [view, setView] = useState<
    | "login"
    | "hub"
    | "dashboard"
    | "word-bank"
    | "study"
    | "games"
    | "onboarding"
  >("login");
  const [stats, setStats] = useState<{
    words: number;
    subjects: number;
    games: number;
    contributors: number;
    topSubject: string;
    longestWord: string;
    totalSessions: number;
    recentScores: any[];
  }>({
    words: 0,
    subjects: 0,
    games: 5,
    contributors: 0,
    topSubject: "None",
    longestWord: "None",
    totalSessions: 0,
    recentScores: [],
  });
  const [studentStats, setStudentStats] = useState<{
    highScore: number;
    monthlyScore: number;
    gamesPlayed: number;
    lastPlayed: string;
    averageScore: number;
    accuracy: number;
    streak: number;
  } | null>(null);
  const [backgroundWords, setBackgroundWords] = useState<string[]>([]);
  
  const [initialGameData, setInitialGameData] = useState<{game: string, configId: string | null} | null>(null);

  const [pendingAction, setPendingAction] = useState<
    "word-bank" | "study" | "games" | null
  >(null);

  const handleStudentAction = (action: "word-bank" | "study" | "games") => {
    const user = api.getUser();
    if (user && user.role === "student") {
      setView(action);
    } else {
      setPendingAction(action);
      setView("login");
    }
  };

  useEffect(() => {
    async function checkAuthAndStats() {
      try {
        const [user, words, gameStats] = await Promise.all([
          api.me(),
          api.getWords().catch(() => []),
          api
            .getGameStats()
            .catch(() => ({ totalSessions: 0, recentScores: [] })),
        ]);

        const subjects = new Set(
          words.map((w: any) => w.subject).filter(Boolean),
        ).size;

        let contributors = 0;
        let topSubject = "None";
        let longestWord = "None";

        if (words && words.length > 0) {
          contributors = new Set(
            words.map((w: any) => w.teacherId).filter(Boolean),
          ).size;

          const subjectCounts = (words as any[]).reduce(
            (acc: any, w: any) => {
              if (w.subject) acc[w.subject] = (acc[w.subject] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );

          if (Object.keys(subjectCounts).length > 0) {
            topSubject = Object.keys(subjectCounts).reduce((a, b) =>
              subjectCounts[a] > subjectCounts[b] ? a : b,
            );
          }

          const longest = words.reduce((a: any, b: any) =>
            (a.word?.length || 0) > (b.word?.length || 0) ? a : b,
          );
          longestWord = longest.word || "None";
        }

        setStats({
          words: words.length,
          subjects,
          games: 5,
          contributors,
          topSubject,
          longestWord,
          totalSessions: gameStats.totalSessions,
          recentScores: gameStats.recentScores || [],
        });

        const bgWords = words
          .map((w: any) => w.word)
          .sort(() => Math.random() - 0.5)
          .slice(0, 15);
        if (bgWords.length < 10) {
          bgWords.push(
            "photosynthesis",
            "mitochondria",
            "democracy",
            "algorithm",
            "ecosystem",
            "metaphor",
            "velocity",
            "equilibrium",
            "catalyst",
            "paradigm",
          );
        }
        setBackgroundWords(bgWords.slice(0, 15));

        if (user) {
          setView(user.role === "student" ? "hub" : "dashboard");
        } else {
          setView("login");
        }
      } catch (e) {
        setView("login");
      }
    }
    checkAuthAndStats();
  }, []);

  const loadStudentStats = async (studentUser: any) => {
    try {
      const sessions = await api.getStudentSessions(studentUser.id);
      if (sessions && sessions.length > 0) {
        const gamesPlayed = sessions.length;
        let topScore = 0;
        let totalScore = 0;
        let totalMaxScore = 0;
        let monthlyScore = 0;
        let lastPlayed = new Date(sessions[0].createdAt).toLocaleDateString();

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        sessions.forEach((s: any) => {
          topScore = Math.max(topScore, s.score || 0);
          totalScore += (s.score || 0);
          totalMaxScore += (s.maxScore || s.score || 0);
          
          if (new Date(s.createdAt).getTime() >= startOfMonth) {
            monthlyScore += (s.score || 0);
          }
        });

        let streak = 0;
        const playedDates = new Set(sessions.map((s: any) => new Date(s.createdAt).toLocaleDateString()));
        let checkingDate = new Date();
        
        if (!playedDates.has(checkingDate.toLocaleDateString())) {
           checkingDate.setDate(checkingDate.getDate() - 1);
        }
        
        while (playedDates.has(checkingDate.toLocaleDateString())) {
           streak++;
           checkingDate.setDate(checkingDate.getDate() - 1);
        }

        setStudentStats({
          highScore: totalScore,
          monthlyScore,
          gamesPlayed,
          lastPlayed,
          averageScore: Math.round(totalScore / gamesPlayed),
          accuracy: totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0,
          streak,
        });
      } else {
        setStudentStats({
          highScore: studentUser.high_score || 0,
          monthlyScore: 0,
          gamesPlayed: 0,
          lastPlayed: "Never",
          averageScore: 0,
          accuracy: 0,
          streak: 0,
        });
      }
    } catch (err) {
      console.error("Failed to load student stats", err);
    }
  };

  useEffect(() => {
    if (view === "hub" || view === "games") {
      const user = api.getUser();
      if (user && user.role === "student") {
        loadStudentStats(user);
      }

      api.getGameStats()
        .then((gameStats) => {
          setStats((prev) => ({
            ...prev,
            totalSessions: gameStats.totalSessions,
            recentScores: gameStats.recentScores || [],
          }));
        })
        .catch((err) => console.error("Failed to fetch game stats", err));
    }
  }, [view]);

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

  if (view === "dashboard") {
    return <TeacherDashboard onLogout={() => setView("login")} />;
  }

  if (view === "word-bank") {
    return <StudentWordBank onBack={() => setView("hub")} />;
  }

  if (view === "study") {
    return <StudyVocab onBack={() => setView("hub")} />;
  }

  if (view === "games") {
    return (
      <InteractiveGames
        onBack={() => { setView("hub"); setInitialGameData(null); }}
        backgroundWords={backgroundWords}
        initialGameData={initialGameData}
        onGameComplete={() => {
          const user = api.getUser();
          if (user && user.role === "student") {
            loadStudentStats(user);
          }
          api.getGameStats().then((gameStats) => {
            setStats((prev) => ({
              ...prev,
              totalSessions: gameStats.totalSessions,
              recentScores: gameStats.recentScores || [],
            }));
          }).catch((err) => console.error(err));
        }}
      />
    );
  }

  if (view === "onboarding") {
    return (
      <div className="relative h-screen w-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <AmbientOrbs />
        <div className="z-10 bg-slate-800 p-8 rounded-3xl max-w-lg w-full text-center border border-slate-700 shadow-2xl">
          <PartyPopper className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4 tracking-tight">
            Welcome, {api.getUser()?.name}!
          </h1>
          <p className="text-slate-300 mb-8 leading-relaxed">
            Your account is ready. Going forward, you can sign in using your
            Name (<strong className="text-white">{api.getUser()?.name}</strong>)
            or Access Code (
            <strong className="text-white">{api.getUser()?.accessCode}</strong>)
            along with your password.
          </p>
          <div className="grid grid-cols-1 gap-4 mb-8 text-left">
            <div className="bg-slate-700/50 p-4 rounded-xl flex items-center gap-4">
              <BookOpen className="w-8 h-8 text-cyan-400 shrink-0" />
              <div>
                <h3 className="font-bold">Word Bank & Study</h3>
                <p className="text-xs text-slate-400">
                  Review terms and practice with smart flashcards.
                </p>
              </div>
            </div>
            <div className="bg-slate-700/50 p-4 rounded-xl flex items-center gap-4">
              <Gamepad2 className="w-8 h-8 text-purple-400 shrink-0" />
              <div>
                <h3 className="font-bold">Interactive Games</h3>
                <p className="text-xs text-slate-400">
                  Play games to earn points and climb the global leaderboard!
                </p>
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
                setView("hub");
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
            <img
              src="/vocabhubicon-small.png"
              alt="VocabHub Icon"
              className="w-8 h-8 rounded-full"
            />
            <span className="text-sm font-bold tracking-[0.1em] uppercase opacity-90 text-slate-900">
              XSIB VocabHub
            </span>
          </div>
          <nav className="flex items-center gap-4">
            {api.getUser() ? (
              <div className="flex items-center gap-4">
                {api.getUser()?.role === "student" ? (
                  <StudentProfileModal
                    user={api.getUser()}
                    onLogout={async () => {
                      await api.logout();
                      setView("login");
                    }}
                  />
                ) : (
                  <span className="text-sm font-bold text-purple-700 tracking-wide">
                    Welcome, {api.getUser()?.name}
                  </span>
                )}
                <Button
                  variant="ghost"
                  className="text-slate-500 hover:text-slate-900"
                  onClick={async () => {
                    await api.logout();
                    setView("login");
                  }}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <TeacherAuthModal onLoginSuccess={() => setView("dashboard")} />
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center container mx-auto px-6 relative z-10 overflow-y-auto custom-scrollbar">
        {view === "login" ? (
          <StudentLogin
            onLoginSuccess={(user: any) => {
              if (user?.isNewUser) {
                setView("onboarding");
              } else if (pendingAction) {
                setView(pendingAction);
                setPendingAction(null);
              } else {
                setView("hub");
              }
            }}
          />
        ) : view === "hub" ? (
          <div className="w-full max-w-7xl flex flex-col pb-8">
            {/* Hero Section */}
            <section className="flex flex-col items-start text-left w-full mt-2 mb-4">
              <div className="flex flex-col items-start justify-center">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <span className="block text-sm font-bold tracking-[0.2em] text-slate-500 mb-0 uppercase">
                    XSIB
                  </span>
                  <span className="block text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-slate-900">
                    Vocab
                    <span className="text-transparent bg-clip-text bg-gradient-to-br from-purple-600 to-indigo-600">
                      Hub.
                    </span>
                  </span>
                </motion.h1>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 lg:gap-6 items-stretch w-full">
              <div className="flex flex-col items-start text-left w-full h-full">
                {/* Features Section */}
              <section className="w-full mb-3">
                <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <motion.div variants={itemVariants} className="h-full">
                  <Card
                    className="h-full flex flex-col bg-white/70 backdrop-blur-md border border-purple-200/50 rounded-2xl shadow-lg shadow-purple-500/5 hover:bg-white/90 transition-all hover:-translate-y-1 hover:shadow-purple-500/20 hover:border-purple-400 duration-300 cursor-pointer overflow-hidden group relative"
                    onClick={() => handleStudentAction("word-bank")}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <BookOpen className="w-20 h-20 text-purple-600 -rotate-12 translate-x-4 -translate-y-4" />
                    </div>
                    <CardHeader className="pb-1 pt-4 relative z-10">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md mb-2 transform group-hover:scale-110 transition-transform duration-300">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base text-slate-900 font-bold tracking-tight">
                        View Word Bank
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 relative z-10 flex-grow">
                      <CardDescription className="text-sm text-slate-600 font-medium">
                        Browse and search through the entire collection of terms
                        curated by your teachers.
                      </CardDescription>
                    </CardContent>
                    <div className="px-6 pb-5 pt-2 mt-auto relative z-10 border-t border-purple-100/50 flex justify-between items-center bg-white/50">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Learn</span>
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants} className="h-full">
                  <Card
                    className="h-full flex flex-col bg-white/70 backdrop-blur-md border border-purple-200/50 rounded-2xl shadow-lg shadow-purple-500/5 hover:bg-white/90 transition-all hover:-translate-y-1 hover:shadow-purple-500/20 hover:border-purple-400 duration-300 cursor-pointer overflow-hidden group relative"
                    onClick={() => handleStudentAction("study")}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Brain className="w-20 h-20 text-purple-600 -rotate-12 translate-x-4 -translate-y-4" />
                    </div>
                    <CardHeader className="pb-1 pt-4 relative z-10">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md mb-2 transform group-hover:scale-110 transition-transform duration-300">
                        <Brain className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base text-slate-900 font-bold tracking-tight">
                        Study Vocab
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 relative z-10 flex-grow">
                      <CardDescription className="text-sm text-slate-600 font-medium">
                        Review terms, definitions, and example sentences with
                        interactive smart flashcards.
                      </CardDescription>
                    </CardContent>
                    <div className="px-6 pb-5 pt-2 mt-auto relative z-10 border-t border-purple-100/50 flex justify-between items-center bg-white/50">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Practice</span>
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants} className="h-full">
                  <Card
                    className="h-full flex flex-col bg-white/70 backdrop-blur-md border border-purple-200/50 rounded-2xl shadow-lg shadow-purple-500/5 hover:bg-white/90 transition-all hover:-translate-y-1 hover:shadow-purple-500/20 hover:border-purple-400 duration-300 cursor-pointer overflow-hidden group relative"
                    onClick={() => handleStudentAction("games")}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Gamepad2 className="w-20 h-20 text-purple-600 -rotate-12 translate-x-4 -translate-y-4" />
                    </div>
                    <CardHeader className="pb-1 pt-4 relative z-10">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md mb-2 transform group-hover:scale-110 transition-transform duration-300">
                        <Gamepad2 className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base text-slate-900 font-bold tracking-tight">
                        Interactive Games
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 relative z-10 flex-grow">
                      <CardDescription className="text-sm text-slate-600 font-medium">
                        Test your knowledge with exciting mini-games and
                        quizzes. Learning shouldn't be boring.
                      </CardDescription>
                    </CardContent>
                    <div className="px-6 pb-5 pt-2 mt-auto relative z-10 border-t border-purple-100/50 flex justify-between items-center bg-white/50">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Play</span>
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            </section>

            {/* Analytics Highlights Section */}
            <section className="w-full max-w-4xl mb-2 flex flex-col flex-grow">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-purple-600" />
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Global Stats
                </h2>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                className="grid grid-cols-1 md:grid-cols-3 gap-2"
              >
                <motion.div
                  variants={itemVariants}
                  className="bg-white/80 backdrop-blur-md border border-purple-200/50 rounded-xl p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-orange-100 text-orange-600 rounded">
                      <Flame className="h-3 w-3" />
                    </div>
                    <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                      Total Words
                    </h3>
                  </div>
                  <p className="text-lg font-[800] text-slate-900">
                    {stats.words}
                    <span className="text-sm font-bold text-slate-400 ml-1">
                      words
                    </span>
                  </p>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="bg-white/80 backdrop-blur-md border border-purple-200/50 rounded-xl p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-blue-100 text-blue-600 rounded">
                      <BookOpen className="h-3 w-3" />
                    </div>
                    <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                      Active Subjects
                    </h3>
                  </div>
                  <p className="text-lg font-[800] text-slate-900">
                    {stats.subjects}
                    <span className="text-sm font-bold text-slate-400 ml-1">
                      subjects
                    </span>
                  </p>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  className="bg-white/80 backdrop-blur-md border border-purple-200/50 rounded-xl p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-green-100 text-green-600 rounded">
                      <Gamepad2 className="h-3 w-3" />
                    </div>
                    <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                      Sessions Played
                    </h3>
                  </div>
                  <p className="text-lg font-[800] text-slate-900">
                    {stats.totalSessions}
                    <span className="text-sm font-bold text-slate-400 ml-1">
                      games
                    </span>
                  </p>
                </motion.div>
              </motion.div>

              {/* Rolling Info Bar for Recent High Scores */}
              {stats.recentScores && stats.recentScores.length > 0 && (
                <div className="mt-auto pt-3 w-full flex flex-col items-center justify-end pb-0">
                  <div className="mb-2 text-center flex flex-col items-center">
                    <h3 className="text-sm font-bold text-purple-600 uppercase tracking-widest flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      Latest Top Scores
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Can you beat these scores?
                    </p>
                  </div>
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="flex overflow-hidden bg-slate-900 text-white rounded-full py-2 px-4 shadow-lg border border-slate-700 w-full relative"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10"></div>

                    <TooltipProvider>
                      <div className="flex items-center gap-4 animate-[scroll_40s_linear_infinite] hover:[animation-play-state:paused] whitespace-nowrap min-w-max">
                        {/* Double the array for seamless scrolling */}
                        {[...stats.recentScores, ...stats.recentScores].map(
                          (scoreObj, idx) => (
                            <Fragment key={idx}>
                              <Tooltip delay={300}>
                                <TooltipTrigger
                                  className="group relative flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-800 rounded-md px-3 py-2 transition-colors"
                                onClick={() => {
                                  if (scoreObj.configId) {
                                    setInitialGameData({ game: scoreObj.game, configId: scoreObj.configId });
                                    setView('games');
                                  }
                                }}
                              >
                                <Trophy className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-purple-300">
                                  {scoreObj.game}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="font-semibold text-slate-100">
                                  {scoreObj.studentName}
                                </span>
                                <span className="text-emerald-400 font-mono font-bold bg-emerald-400/20 px-2 py-0.5 rounded-md group-hover:bg-emerald-400/30 transition-colors">
                                  {scoreObj.score}
                                </span>
                                <span className="text-slate-600 ml-4 mr-0">|</span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-800 text-white font-medium border-slate-700 shadow-xl">
                                <p>Click to apply this game setup and play!</p>
                              </TooltipContent>
                            </Tooltip>
                          </Fragment>
                        ),
                        )}
                      </div>
                    </TooltipProvider>
                  </motion.div>
                </div>
              )}
            </section>
            </div>

            {/* Right Column: Individual Stats Dashboard */}
            <div className="w-full mt-4 lg:mt-0 sticky top-24">
              {studentStats && studentStats.streak > 0 && (
                <div className="bg-gradient-to-r from-orange-500/20 to-rose-500/20 border border-orange-500/30 rounded-xl p-3 mb-4 flex items-center justify-between z-20 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-400 to-rose-500 text-white rounded-lg shadow-inner">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-orange-600 uppercase tracking-widest leading-tight">On Fire!</p>
                      <p className="text-sm font-semibold text-slate-700">You're on a {studentStats.streak} day streak</p>
                    </div>
                  </div>
                </div>
              )}
              <Card className="bg-slate-900 border-slate-800 text-white shadow-xl shadow-purple-900/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-purple-600/20 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-blue-600/20 blur-3xl pointer-events-none"></div>

                <CardHeader className="relative z-10 border-b border-slate-800/80 pb-3">
                  <CardTitle className="text-lg text-white font-bold flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    My Progress
                  </CardTitle>
                  <CardDescription className="text-slate-400">Your personal learning statistics</CardDescription>
                </CardHeader>
                <CardContent className="relative z-10 pt-3">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-xl p-4 border border-purple-500/20 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-purple-500/20 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/20 text-purple-300 rounded-lg">
                            <Trophy className="w-5 h-5" />
                          </div>
                          <span className="font-semibold text-purple-100">Overall Score</span>
                        </div>
                        <span className="text-3xl font-black text-white">{studentStats?.highScore || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/20 text-blue-300 rounded-lg">
                            <Target className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-semibold text-blue-100 block">Monthly Score</span>
                            <span className="text-[10px] text-blue-300/70 uppercase tracking-widest">{new Date().toLocaleString('default', { month: 'short' })}</span>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-blue-100">{studentStats?.monthlyScore || 0}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Gamepad2 className="w-3 h-3"/> Played
                        </span>
                        <span className="text-xl font-bold text-slate-100">{studentStats?.gamesPlayed || 0}</span>
                      </div>
                      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Target className="w-3 h-3"/> Accuracy
                        </span>
                        <span className="text-xl font-bold text-emerald-400">{studentStats?.accuracy || 0}%</span>
                      </div>
                      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 flex flex-col justify-center col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Avg Score</span>
                        <span className="text-xl font-bold text-slate-100">{studentStats?.averageScore || 0}</span>
                      </div>
                      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 flex flex-col justify-center col-span-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Last Played</span>
                        <span className="text-sm font-bold text-slate-100 mt-1">{studentStats?.lastPlayed || "Never"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
