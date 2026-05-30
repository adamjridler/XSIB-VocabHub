import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  PlusCircle, 
  Library, 
  Settings, 
  LogOut, 
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2, BarChart3, Search, SortAsc, Users, Maximize2, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';

import { AdminAccessCodes } from '@/components/AdminAccessCodes';
import { AdminStudentUsage } from '@/components/AdminStudentUsage';

const SUBJECTS = [
  'Chinese A', 'English B', 'Geography', 'Business Management', 
  'Economics', 'ESS', 'Physics', 'Chemistry', 'Biology', 
  'Mathematics', 'Art', 'Music', 'TOK', 'Global Perspectives'
];

const LEVELS = ['PDP', 'IB1', 'IB2'];

const parseDate = (val: any): Date => {
  if (!val) return new Date(0);
  if (typeof val.toDate === 'function') return val.toDate();
  if (typeof val.seconds === 'number') return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

export function TeacherDashboard({ onLogout }: { onLogout: () => void }) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [wordInputs, setWordInputs] = useState<string[]>(['', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'upload' | 'bank' | 'settings' | 'access_codes' | 'student_usage'>('analytics');
  const [allWords, setAllWords] = useState<any[]>([]);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [subjectFilters, setSubjectFilters] = useState<string[]>([]);
  const [levelFilters, setLevelFilters] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState('all');
  const [flippedWords, setFlippedWords] = useState<Record<string, boolean>>({});
  const [editingData, setEditingData] = useState<{word: string, definition: string, example: string, translation: string}>({word:'', definition:'', example:'', translation:''});

  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  const [stagingWords, setStagingWords] = useState<any[] | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setUser(api.getUser());
    api.getWords().then(setAllWords);
  }, []);

  const handleDeleteWord = async (id: string) => {
    await api.deleteWord(id);
    setAllWords((prev) => prev.filter(w => w.id !== id));
    setConfirmDeleteId(null);
  };

  const handleEditWord = (wordObj: any) => {
    setEditingWordId(wordObj.id);
    setEditingData({ word: wordObj.word, definition: wordObj.definition, example: wordObj.example, translation: wordObj.translation || '' });
  };

  const handleSaveEdit = async () => {
    if (!editingWordId) return;
    await api.updateWord(editingWordId, editingData);
    setAllWords((prev) => prev.map(w => w.id === editingWordId ? { ...w, ...editingData } : w));
    setEditingWordId(null);
  };

  const submitLogout = async () => {
    await api.logout();
    onLogout();
  };

  const updateWord = (index: number, value: string) => {
    const newWords = [...wordInputs];
    newWords[index] = value;
    setWordInputs(newWords);
  };

  const removeWord = (index: number) => {
    if (wordInputs.length <= 1) return;
    const newWords = [...wordInputs];
    newWords.splice(index, 1);
    setWordInputs(newWords);
  };

  const addWordPlaceholder = () => {
    setWordInputs([...wordInputs, '']);
  };

  const handleStagingUpdate = (id: string, updates: any) => {
    setStagingWords(prev => prev ? prev.map(w => w.id === id ? { ...w, ...updates } : w) : null);
  };

  const handleStagingDelete = (id: string) => {
    setStagingWords(prev => prev ? prev.filter(w => w.id !== id) : null);
  };

  const applySuggestion = (id: string, suggestion: string) => {
    handleStagingUpdate(id, { word: suggestion, error: false, definition: "Loading definition...", example: "Loading...", translation: "Loading translation..." });
    const API_BASE = import.meta.env.VITE_API_URL || '';
    fetch(`${API_BASE}/api/define`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('appToken')}` },
      body: JSON.stringify({ word: suggestion })
    }).then(r => r.json()).then(data => {
      if (data.error) {
         handleStagingUpdate(id, { error: true, definition: data.error, example: '', translation: '', suggestion: data.suggestion });
      } else {
         handleStagingUpdate(id, { word: data.word || suggestion, error: false, definition: data.definition, example: data.example, translation: data.translation });
      }
    }).catch(err => {
         handleStagingUpdate(id, { error: true, definition: 'Error loading suggestion.', example: '', translation: '' });
    });
  };

  const handleStagingSubmit = async () => {
    if (!stagingWords) return;
    const validWords = stagingWords.filter(w => !w.error);
    if (validWords.length === 0) {
      setErrorMessage("No valid words to submit.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.addWords(validWords, selectedSubject, selectedLevel, user.uid);
      setSuccessMessage(`Successfully saved ${validWords.length} words.`);
      setWordInputs(['', '', '']);
      setStagingWords(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving words to the backend.');
    }
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const validInputs = wordInputs.map(w => w.trim().toLowerCase()).filter(w => w.length > 0);

    if (!selectedSubject || !selectedLevel || validInputs.length === 0) {
      setErrorMessage('Please fill in all required fields and add at least one word.');
      return;
    }
    
    if (!user) {
      setErrorMessage('You must be signed in to upload words.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    const processedWords = validInputs.map((word, i) => ({
      id: `temp_${i}`,
      word,
      isLoading: true,
      error: false,
      definition: 'Loading definition...',
      example: 'Loading example...',
      translation: 'Loading translation...'
    }));
    
    setStagingWords([...processedWords]);

    // Process in batches of 3 to avoid overwhelming the server and causing "Failed to fetch" errors.
    const BATCH_SIZE = 3;
    for (let i = 0; i < validInputs.length; i += BATCH_SIZE) {
      const batch = validInputs.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (word, batchIdx) => {
        const actualIdx = i + batchIdx;
        try {
          const API_BASE = import.meta.env.VITE_API_URL || '';
          const response = await fetch(`${API_BASE}/api/define`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('appToken')}`
            },
            body: JSON.stringify({ word })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.error) {
              processedWords[actualIdx] = { id: `temp_${actualIdx}`, word, isLoading: false, error: true, definition: data.error, example: 'No example available.', translation: 'None', suggestion: data.suggestion };
            } else {
              processedWords[actualIdx] = {
                id: `temp_${actualIdx}`,
                word: data.word || word,
                isLoading: false,
                error: false,
                definition: data.definition || 'No definition found.',
                example: data.example || 'No example available.',
                translation: data.translation || 'No translation available.'
              };
            }
          } else {
            processedWords[actualIdx] = { id: `temp_${actualIdx}`, word, isLoading: false, error: true, definition: 'Error communicating with AI.', example: 'No example available.', translation: 'None' };
          }
        } catch (err: any) {
          processedWords[actualIdx] = { id: `temp_${actualIdx}`, word, isLoading: false, error: true, definition: err.message || 'Network error.', example: 'No example available.', translation: 'None' };
        }
      }));
      setStagingWords([...processedWords]);
    }
  };

  let displayWords = [...allWords];
  if (subjectFilters.length > 0) {
    displayWords = displayWords.filter(w => subjectFilters.includes(w.subject));
  }
  if (levelFilters.length > 0) {
    displayWords = displayWords.filter(w => levelFilters.includes(w.level));
  }
  if (filterDate !== 'all') {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    displayWords = displayWords.filter(w => {
      const age = now - parseDate(w.createdAt).getTime();
      if (filterDate === 'today') return age <= day;
      if (filterDate === 'week') return age <= 7 * day;
      if (filterDate === 'month') return age <= 30 * day;
      if (filterDate === 'year') return age <= 365 * day;
      return true;
    });
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayWords = displayWords.filter(w => w.word.toLowerCase().includes(q) || w.definition?.toLowerCase().includes(q) || w.subject?.toLowerCase().includes(q));
  }
  
  displayWords.sort((a, b) => {
    if (sortBy === 'newest') return parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime();
    if (sortBy === 'oldest') return parseDate(a.createdAt).getTime() - parseDate(b.createdAt).getTime();
    if (sortBy === 'az') return a.word.localeCompare(b.word);
    if (sortBy === 'za') return b.word.localeCompare(a.word);
    if (sortBy === 'subject') return (a.subject || '').localeCompare(b.subject || '');
    if (sortBy === 'level') return (a.level || '').localeCompare(b.level || '');
    return 0;
  });

  const toggleSubject = (s: string) => setSubjectFilters(prev => prev.includes(s) ? prev.filter(p => p !== s) : [...prev, s]);
  const toggleLevel = (l: string) => setLevelFilters(prev => prev.includes(l) ? prev.filter(p => p !== l) : [...prev, l]);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-50 text-slate-900 font-sans selection:bg-purple-200 selection:text-purple-900">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-200 bg-white/90 flex flex-col pt-6 pb-4 flex-none  shadow-lg relative z-10">
        <div className="px-6 flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center text-white font-bold">X</div>
          <span className="text-xs font-bold tracking-[0.2em] uppercase opacity-80">XSIB Staff</span>
        </div>

        <nav className="flex-1 px-4 space-y-2">

          <button 
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium uppercase tracking-widest transition-colors ${activeTab === 'analytics' ? 'bg-purple-100 text-purple-600' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </button>
          <button 
            onClick={() => setActiveTab('upload')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium uppercase tracking-widest transition-colors ${activeTab === 'upload' ? 'bg-purple-100 text-purple-600' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}
          >
            <PlusCircle className="h-4 w-4" />
            Add Words
          </button>
          <button 
            onClick={() => {
              setActiveTab('bank');
              api.getWords().then(setAllWords);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium uppercase tracking-widest transition-colors ${activeTab === 'bank' ? 'bg-purple-100 text-purple-600' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}
          >
            <Library className="h-4 w-4" />
            Word Bank
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium uppercase tracking-widest transition-colors ${activeTab === 'settings' ? 'bg-purple-100 text-purple-600' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          
          {user?.role === 'admin' && (
            <>
              <button 
                onClick={() => setActiveTab('student_usage')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium uppercase tracking-widest transition-colors ${activeTab === 'student_usage' ? 'bg-purple-100 text-purple-600' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}
              >
                <BarChart3 className="h-4 w-4" />
                Student Usage
              </button>
              <button 
                onClick={() => setActiveTab('access_codes')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium uppercase tracking-widest transition-colors ${activeTab === 'access_codes' ? 'bg-purple-100 text-purple-600' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}
              >
                <Users className="h-4 w-4" />
                Access Codes
              </button>
            </>
          )}
        </nav>

        <div className="px-4 mt-auto">
          <button 
            onClick={submitLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-white hover:text-slate-900 text-sm font-medium uppercase tracking-widest transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-none h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 z-10 sticky top-0 shadow-sm">
          <h2 className="text-lg font-bold uppercase tracking-widest text-slate-900">XSIB Vocabulary Platform</h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
               <span className="block text-xs font-bold text-slate-900">{user?.email}</span>
               <span className="block text-[10px] text-slate-500 uppercase tracking-widest">Logged In</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold border border-purple-200">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
        <div className="w-full mx-auto space-y-8">
          {activeTab === 'analytics' ? (
            <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-500 pb-6">
              <header className="mb-4 flex-none">
                <h1 className="text-3xl font-bold uppercase tracking-widest text-slate-900 mb-1">Platform Analytics</h1>
                <p className="text-slate-500 font-light text-sm">
                  Vocabulary metrics overview.
                </p>
              </header>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
                
                {/* Panel 2: Grade Level Breakdown */}
                <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg shadow-purple-500/5 flex flex-col h-full overflow-hidden">
                  <CardContent className="p-4 flex flex-col h-full">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex-none">Grade Level Breakdown</h3>
                    <div className="flex-1 min-h-0 relative">
                      {(() => {
                        const counts = allWords.reduce((acc, w) => {
                          acc[w.level] = (acc[w.level] || 0) + 1;
                          return acc;
                        }, {});
                        const totalWords = allWords.length;
                        if (totalWords === 0) return <p className="text-xs text-slate-500 text-center absolute inset-0 flex items-center justify-center">No data</p>;
                        
                        const data = Object.entries(counts).map(([name, value], index) => ({
                          name: name || 'Unassigned',
                          value: value as number,
                          color: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'][index % 5]
                        })).sort((a, b) => b.value - a.value);

                        return (
                          <div className="flex flex-col justify-center h-full space-y-4 px-2">
                            {data.map((entry, index) => {
                              const percentage = Math.round((entry.value / totalWords) * 100);
                              return (
                                <div key={index} className="space-y-1">
                                  <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-slate-900">{entry.name}</span>
                                    <span className="text-xs font-medium text-slate-500">{entry.value} ({percentage}%)</span>
                                  </div>
                                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-full">
                                    <div 
                                      className="h-full rounded-full transition-all duration-1000 ease-out" 
                                      style={{ width: `${percentage}%`, backgroundColor: entry.color }}
                                      title={`${percentage}%`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Panel 6: Subject Leaderboard */}
                <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg shadow-purple-500/5 flex flex-col h-full overflow-hidden">
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4 flex-none">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Subject Leaderboard</h3>
                      
                      <Dialog>
                        <DialogTrigger render={<Button variant="ghost" size="sm" className="h-6 text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-100 uppercase tracking-widest px-2" />}>
                          <Maximize2 className="h-3 w-3 mr-1" />
                          Expand
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-bold uppercase tracking-widest text-slate-900">All Subjects Leaderboard</DialogTitle>
                          </DialogHeader>
                          <div className="max-h-[60vh] overflow-y-auto pr-4 mt-4 space-y-4">
                            {(() => {
                              const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                              const counts = allWords.reduce((acc, w) => {
                                if (!acc[w.subject]) acc[w.subject] = { total: 0, week: 0 };
                                acc[w.subject].total++;
                                if (parseDate(w.createdAt).getTime() > weekAgo) acc[w.subject].week++;
                                return acc;
                              }, {} as Record<string, {total: number, week: number}>);
                              
                              const sorted = Object.entries(counts).sort((a: [string, any], b: [string, any]) => b[1].total - a[1].total);
                              if (sorted.length === 0) return <p className="text-sm text-slate-500 italic text-center py-8">No uploads yet.</p>;
                              
                              return sorted.map(([subj, stats]: [string, any], idx) => (
                                <div key={subj} className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-purple-100 text-purple-600' : 'bg-white text-slate-500 border border-slate-200'}`}>
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-800 text-sm truncate">{subj}</div>
                                  </div>
                                  <div className="flex items-center gap-6 text-sm">
                                    <div className="text-center">
                                      <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">Overall</div>
                                      <div className="font-bold text-slate-900">{stats.total}</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-1 text-slate-400 mb-0.5"><BarChart3 className="w-3 h-3 text-purple-500"/> This Week</div>
                                      <div className="font-bold text-purple-600">{stats.week}</div>
                                    </div>
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="flex-1 overflow-hidden space-y-3">
                      {(() => {
                        const counts = allWords.reduce((acc, w) => {
                          acc[w.subject] = (acc[w.subject] || 0) + 1;
                          return acc;
                        }, {});
                        const sorted = Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number));
                        if (sorted.length === 0) return <p className="text-xs text-slate-500 italic flex items-center justify-center h-full">No uploads yet.</p>;
                        
                        return sorted.slice(0, 4).map(([subj, count], idx) => (
                          <div key={subj} className="flex items-center gap-3">
                            <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between mb-1">
                                <span className="text-[10px] uppercase font-bold text-slate-700 truncate">{subj}</span>
                                <span className="text-[10px] font-bold text-purple-600">{count as number}</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full" style={{ width: `${Math.max(5, ((count as number) / (sorted[0][1] as number)) * 100)}%` }} />
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Panel 5: Vocabulary Growth Over Time */}
                <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg shadow-purple-500/5 flex flex-col h-full overflow-hidden">
                  <CardContent className="p-4 flex flex-col h-full">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex-none">Vocabulary Growth (Last 7 Days)</h3>
                    <div className="flex-1 min-h-[0px] relative w-full pt-4">
                      {(() => {
                        if (allWords.length === 0) return <p className="text-xs text-slate-500 text-center absolute inset-0 flex items-center justify-center">No data</p>;
                        
                        const days = [...Array(7)].map((_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() - (6 - i));
                          return {
                            dateStr: d.toISOString().split('T')[0],
                            display: d.toLocaleDateString('en-US', { weekday: 'short' }),
                            count: 0
                          };
                        });
                        
                        allWords.forEach(w => {
                          if (!w.createdAt) return;
                          const wDateStr = parseDate(w.createdAt).toISOString().split('T')[0];
                          const day = days.find(d => d.dateStr === wDateStr);
                          if (day) day.count++;
                        });

                        let runningTotal = allWords.filter(w => {
                          if (!w.createdAt) return false;
                          return parseDate(w.createdAt) < new Date(days[0].dateStr);
                        }).length;

                        const chartData = days.map(d => {
                          runningTotal += d.count;
                          return { name: d.display, total: runningTotal };
                        });

                        return (
                          <ResponsiveContainer width="100%" height="80%">
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dx={-10} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ color: '#7c3aed', fontWeight: 'bold' }}
                                labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                              />
                              <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#7c3aed' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Panel 4: Recently Added Words */}
                 <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg shadow-purple-500/5 flex flex-col h-full overflow-hidden">
                  <CardContent className="p-4 flex flex-col h-full">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex-none">Recently Added</h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                      {(() => {
                        const recent = [...allWords].sort((a,b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime()).slice(0, 5);
                        if (recent.length === 0) return <p className="text-xs text-slate-500 italic flex items-center justify-center h-full">No words yet.</p>;
                        return recent.map(w => (
                          <div key={w.id} className="flex gap-3 items-center border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                            <div className="w-8 h-8 rounded bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between items-baseline mb-0.5">
                                <span className="text-sm font-bold text-slate-900 truncate pr-2">{w.word}</span>
                                <span className="text-[9px] text-slate-400 shrink-0 uppercase font-semibold">
                                  {w.createdAt ? parseDate(w.createdAt).toLocaleDateString() : 'Just now'}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {w.subject}
                                </span>
                                <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {w.level}
                                </span>
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>) : activeTab === 'student_usage' && user?.role === 'admin' ? (
              <AdminStudentUsage />
            ) : activeTab === 'access_codes' && user?.role === 'admin' ? (
              <AdminAccessCodes />
            ) : activeTab === 'upload' ? (
            <>
              {stagingWords ? (
                <div className="space-y-6">
                  <header>
                    <h2 className="text-2xl font-bold uppercase tracking-widest text-slate-900 mb-2">Confirm Words</h2>
                    <p className="text-slate-500 font-light text-sm">
                      Please review the definitions and examples below. You can make final edits or remove words before saving to the Word Bank.
                    </p>
                  </header>
                  <div className="space-y-4">
                    {stagingWords.map(wordObj => (
                      <Card key={wordObj.id} className={`bg-white  border ${wordObj.error ? 'border-red-500/50 shadow-red-500/10' : 'border-slate-200 shadow-purple-500/5'} rounded-2xl shadow-lg overflow-hidden transition-all delay-100`}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-2 items-center">
                              {wordObj.isLoading && <Loader2 className="h-4 w-4 animate-spin text-purple-600" />}
                              <input 
                                className="bg-white/80 border border-slate-200 text-slate-900 rounded p-2 focus:outline-none focus:border-purple-600 font-bold"
                                value={wordObj.word}
                                onChange={e => handleStagingUpdate(wordObj.id, { word: e.target.value })}
                                disabled={wordObj.isLoading}
                              />
                            </div>
                            <button onClick={() => handleStagingDelete(wordObj.id)} className="p-1.5 text-slate-500 hover:text-red-600 transition-colors" disabled={wordObj.isLoading}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          
                          {wordObj.error && wordObj.suggestion && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3 mb-4 text-xs font-medium text-amber-200">
                              <AlertCircle className="w-4 h-4 inline mr-2 text-amber-400" />
                              {wordObj.definition} Did you mean <button type="button" onClick={() => applySuggestion(wordObj.id, wordObj.suggestion)} className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded ml-1 hover:bg-amber-500/30 transition-colors">{wordObj.suggestion}</button>?
                            </div>
                          )}
                          
                          <div className="space-y-2 flex flex-col">
                            <textarea
                              className={`bg-white/80 border border-slate-200 text-slate-900 rounded p-2 focus:outline-none focus:border-purple-600 text-sm w-full ${wordObj.isLoading ? 'animate-pulse text-slate-400' : ''}`}
                              value={wordObj.definition}
                              onChange={e => handleStagingUpdate(wordObj.id, { definition: e.target.value })}
                              placeholder="Definition"
                              disabled={wordObj.isLoading}
                            />
                            <textarea
                              className={`bg-white/80 border border-slate-200 text-slate-900 rounded p-2 focus:outline-none focus:border-purple-600 text-sm w-full ${wordObj.isLoading ? 'animate-pulse text-slate-400' : ''}`}
                              value={wordObj.translation || ''}
                              onChange={e => handleStagingUpdate(wordObj.id, { translation: e.target.value })}
                              placeholder="Simplified Chinese Translation"
                              disabled={wordObj.isLoading}
                            />
                            <textarea
                              className={`bg-white/80 border border-slate-200 text-slate-900 rounded p-2 focus:outline-none focus:border-purple-600 text-sm w-full italic ${wordObj.isLoading ? 'animate-pulse text-slate-400' : ''}`}
                              value={wordObj.example}
                              onChange={e => handleStagingUpdate(wordObj.id, { example: e.target.value })}
                              placeholder="Example"
                              disabled={wordObj.isLoading}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {errorMessage && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 text-red-600 text-sm font-medium"
                    >
                      <AlertCircle className="h-4 w-4" />
                      {errorMessage}
                    </motion.div>
                  )}
                  {successMessage && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 text-purple-600 text-sm font-medium"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {successMessage}
                    </motion.div>
                  )}

                  <div className="flex justify-end gap-4 mt-6 items-center border-t border-slate-200 pt-6">
                    <Button variant="ghost" className="text-slate-500 hover:text-slate-900/80" onClick={() => setStagingWords(null)} disabled={stagingWords.some(w => w.isLoading)}>Back to Edit</Button>
                    <Button 
                      onClick={handleStagingSubmit}
                      disabled={isSubmitting || stagingWords.every(w => w.error) || stagingWords.some(w => w.isLoading)}
                      className="px-8 py-6 bg-gradient-to-br from-purple-600 to-purple-500 text-white font-bold uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-50 shadow-md shadow-purple-500/20 transition-all"
                    >
                      {stagingWords.some(w => w.isLoading) ? 'Loading...' : isSubmitting ? 'Saving...' : 'Confirm & Save to Bank'}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <header>
                    <h1 className="text-3xl font-bold uppercase tracking-widest text-slate-900 mb-2">Weekly Upload</h1>
                    <p className="text-slate-500 font-light text-sm">
                      Enter target vocabulary for your classes. The system will automatically fetch definitions and example sentences from a free online dictionary.
                    </p>
                  </header>

                  <Card className="bg-white  border border-slate-200 rounded-2xl shadow-lg shadow-purple-500/5">
                    <CardContent className="p-8">
                      <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Subject Selection */}
                          <div className="space-y-3">
                            <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
                              Subject
                            </label>
                            <div className="relative">
                              <select 
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full bg-white/80 border border-slate-200 text-slate-900 rounded-lg p-4 appearance-none focus:outline-none focus:border-purple-600 transition-colors"
                                required
                              >
                                <option value="" disabled>Select a subject...</option>
                                {SUBJECTS.map((sub: string) => (
                                  <option key={sub} value={sub}>{sub}</option>
                                ))}
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                ▼
                              </div>
                            </div>
                          </div>

                          {/* Level Selection */}
                          <div className="space-y-3">
                            <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
                              Year Level
                            </label>
                            <div className="relative">
                              <select 
                                value={selectedLevel}
                                onChange={(e) => setSelectedLevel(e.target.value)}
                                className="w-full bg-white/80 border border-slate-200 text-slate-900 rounded-lg p-4 appearance-none focus:outline-none focus:border-purple-600 transition-colors"
                                required
                              >
                                <option value="" disabled>Select a level...</option>
                                {LEVELS.map((level: string) => (
                                  <option key={level} value={level}>{level}</option>
                                ))}
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                ▼
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Words Input */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <label className="text-xs uppercase tracking-widest font-bold text-slate-500">
                              Target Vocabulary
                            </label>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-purple-600 flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              Auto-defined by AI
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            {wordInputs.map((val, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) => updateWord(index, e.target.value)}
                                  placeholder={`Word ${index + 1} (e.g. photosynthesis)`}
                                  className="w-full bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg p-4 focus:outline-none focus:border-purple-600 transition-colors font-mono text-sm"
                                />
                                {wordInputs.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeWord(index)}
                                    className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-400/10 rounded-lg transition-colors"
                                  >
                                    X
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          <Button
                            type="button"
                            onClick={addWordPlaceholder}
                            variant="ghost"
                            className="text-purple-600 hover:text-cyan-400 hover:bg-purple-100 text-xs font-bold uppercase tracking-widest"
                          >
                            + Add Another Word
                          </Button>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                          <div className="flex items-start gap-2 text-slate-500 flex-1 pr-8">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <p className="text-xs font-light leading-relaxed">
                              Words are processed in batches. You will be able to review and confirm the definitions before they are saved to the bank.
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {errorMessage && (
                              <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 text-red-600 text-sm font-medium"
                              >
                                <AlertCircle className="h-4 w-4" />
                                {errorMessage}
                              </motion.div>
                            )}
                            {successMessage && (
                              <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 text-purple-600 text-sm font-medium"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                {successMessage}
                              </motion.div>
                            )}
                            
                            <Button 
                              type="submit" 
                              disabled={isSubmitting || !selectedSubject || !selectedLevel || !wordInputs.some(w => w.trim())}
                              className="px-8 py-6 bg-gradient-to-br from-purple-600 to-purple-500 text-white font-bold uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-50 shadow-md shadow-purple-500/20 transition-all"
                            >
                              {isSubmitting ? 'Processing AI...' : 'Review Words'}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          ) : activeTab === 'bank' ? (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
                <div>
                  <h1 className="text-3xl font-bold uppercase tracking-widest text-slate-900 mb-2">Word Bank</h1>
                  <p className="text-slate-500 font-light text-sm mb-2">
                    Review all uploaded words. Use search and sort to find what you need.
                  </p>
                  <p className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] uppercase tracking-widest">
                    <span>{displayWords.length}</span>
                    <span className="text-purple-400">/</span>
                    <span>{allWords.length} Words</span>
                  </p>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search words..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-purple-600 transition-colors text-sm"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2 appearance-none focus:outline-none focus:border-purple-600 transition-colors text-sm pr-10 font-medium"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="az">A-Z</option>
                      <option value="za">Z-A</option>
                      <option value="subject">Subject</option>
                      <option value="level">Grade Level</option>
                    </select>
                    <SortAsc className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 mt-6">
                  <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 shrink-0 sm:w-16">Subject</div>
                    <div className="flex gap-2 flex-wrap flex-1 bg-white border border-slate-200 rounded-xl p-3 shadow-sm w-full">
                      {SUBJECTS.map((sub: string) => (
                        <div key={sub} className="flex items-center space-x-2 mr-2">
                          <Checkbox
                            id={`teacher-sub-${sub}`}
                            checked={subjectFilters.includes(sub)}
                            onCheckedChange={() => toggleSubject(sub)}
                            className="border-purple-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                          />
                          <label htmlFor={`teacher-sub-${sub}`} className="text-xs font-semibold text-slate-700 cursor-pointer">{sub}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 shrink-0 sm:w-16">Level</div>
                    <div className="flex gap-2 flex-wrap flex-1 bg-white border border-slate-200 rounded-xl p-3 shadow-sm w-full">
                      {LEVELS.map((lvl: string) => (
                        <div key={lvl} className="flex items-center space-x-2 mr-2">
                          <Checkbox
                            id={`teacher-lvl-${lvl}`}
                            checked={levelFilters.includes(lvl)}
                            onCheckedChange={() => toggleLevel(lvl)}
                            className="border-purple-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                          />
                          <label htmlFor={`teacher-lvl-${lvl}`} className="text-xs font-semibold text-slate-700 cursor-pointer">{lvl}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 shrink-0 sm:w-16">Time</div>
                    <select
                      value={filterDate}
                      onChange={e => setFilterDate(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2 appearance-none focus:outline-none focus:border-purple-600 transition-colors text-sm font-medium shadow-sm w-full sm:w-auto"
                    >
                      <option value="all">Any Time</option>
                      <option value="today">Today</option>
                      <option value="week">Past Week</option>
                      <option value="month">Past Month</option>
                      <option value="year">Past Year</option>
                    </select>
                  </div>
              </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mt-6">
                {(() => {
                  if (displayWords.length === 0) {
                    return (
                      <div className="col-span-full text-center p-12 bg-white rounded-2xl border border-slate-200 shadow-lg shadow-purple-500/5 text-slate-500">
                        {allWords.length === 0 ? "No words have been uploaded yet." : "No words match your search."}
                      </div>
                    );
                  }

                  return displayWords.map((wordObj) => {
                    const isAdminUser = user?.role === 'admin';
                    const isOwner = (user?.uid && wordObj.teacher_id === user.uid) || isAdminUser;
                    const isFlipped = flippedWords[wordObj.id];

                    if (editingWordId === wordObj.id) {
                      return (
                        <div key={wordObj.id} className="relative w-full h-56 col-span-2 sm:col-span-2">
                          <Card className="absolute w-full h-full bg-white border border-slate-200 rounded-2xl shadow-lg shadow-purple-500/5 z-10 overflow-hidden">
                            <CardContent className="p-4 h-full flex flex-col justify-between space-y-2 overflow-y-auto">
                              <input 
                                className="bg-white border border-slate-200 text-slate-900 rounded p-1.5 focus:outline-none focus:border-purple-600 font-bold text-sm w-full"
                                value={editingData.word}
                                onChange={e => setEditingData({...editingData, word: e.target.value})}
                              />
                              <textarea
                                className="bg-white border border-slate-200 text-slate-900 rounded p-1.5 focus:outline-none focus:border-purple-600 text-xs w-full flex-1 min-h-[40px] resize-none"
                                value={editingData.definition}
                                onChange={e => setEditingData({...editingData, definition: e.target.value})}
                                placeholder="Definition"
                              />
                              <textarea
                                className="bg-white border border-slate-200 text-slate-900 rounded p-1.5 focus:outline-none focus:border-purple-600 text-xs w-full flex-1 min-h-[40px] resize-none"
                                value={editingData.translation}
                                onChange={e => setEditingData({...editingData, translation: e.target.value})}
                                placeholder="Simplified Chinese Translation"
                              />
                              <textarea
                                className="bg-white border border-slate-200 text-slate-900 rounded p-1.5 focus:outline-none focus:border-purple-600 text-xs w-full italic flex-1 min-h-[40px] resize-none"
                                value={editingData.example}
                                onChange={e => setEditingData({...editingData, example: e.target.value})}
                                placeholder="Example"
                              />
                              <div className="flex gap-2 justify-end shrink-0">
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-slate-500" onClick={() => setEditingWordId(null)}>Cancel</Button>
                                <Button size="sm" className="h-6 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSaveEdit}>Save</Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    }

                    return (
                      <div key={wordObj.id} className="relative w-full aspect-square group">
                        <Dialog>
                        <DialogTrigger 
                          nativeButton={false} 
                          render={<div role="button" tabIndex={0} className="group relative cursor-pointer text-left rounded-[2rem] border-2 border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col aspect-square w-full" />}
                        >
                            <div className="bg-[#ebd9ff] py-2 px-2 border-b-2 border-slate-200 flex-none w-full flex flex-col items-center justify-center min-h-[48px] gap-0.5">
                              <p className="text-center text-[#5c3e84] font-bold text-[9px] sm:text-[10px] tracking-wider uppercase w-full line-clamp-2 leading-tight">
                                {wordObj.subject}
                              </p>
                              <p className="text-center text-[#5c3e84]/70 font-semibold text-[8px] sm:text-[9px] tracking-widest uppercase truncate w-full mt-0.5">
                                {wordObj.level}
                              </p>
                            </div>
                            <div className="flex-1 flex items-center justify-center p-3 w-full">
                              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-black text-center w-full break-words line-clamp-2">
                                {wordObj.word}
                              </h3>
                            </div>
                            
                            {/* Hover Edit/Delete Controls for Teacher */}
                            {isOwner && (
                                <div className="absolute top-12 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {confirmDeleteId === wordObj.id ? (
                                    <div 
                                      className="flex gap-1 items-center bg-red-100 border border-red-200 px-1.5 py-0.5 rounded-full z-20 shadow-sm"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button onClick={() => handleDeleteWord(wordObj.id)} className="text-[10px] text-red-600 font-bold hover:text-red-800 uppercase tracking-widest p-1">Yes</button>
                                      <div className="w-px h-3 bg-red-200"></div>
                                      <button onClick={() => setConfirmDeleteId(null)} className="text-[10px] text-slate-500 hover:text-slate-800 font-bold uppercase tracking-widest p-1">No</button>
                                    </div>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditWord(wordObj); }} 
                                        className="p-2 text-slate-400 hover:text-purple-600 transition-colors z-20 bg-white/90 shadow-sm rounded-full border border-slate-100 hover:bg-purple-50"
                                        title="Edit"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(wordObj.id); }} 
                                        className="p-2 text-slate-400 hover:text-red-600 transition-colors z-20 bg-white/90 shadow-sm rounded-full border border-slate-100 hover:bg-red-50"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                            )}
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md rounded-3xl">
                          <DialogHeader>
                            <DialogTitle className="text-3xl font-bold pt-4">{wordObj.word}</DialogTitle>
                            <div className="flex gap-2 pb-2">
                              <span className="text-[10px] uppercase font-bold tracking-widest bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{wordObj.subject}</span>
                              <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{wordObj.level}</span>
                            </div>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <div>
                              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-1">Definition</span>
                              <p className="text-slate-900 leading-relaxed font-medium">{wordObj.definition}</p>
                            </div>
                            {wordObj.translation && (
                              <div>
                                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-1">Translation (Simplified Chinese)</span>
                                <p className="text-slate-900 leading-relaxed font-medium">{wordObj.translation}</p>
                              </div>
                            )}
                            {wordObj.example && wordObj.example !== 'No example available.' && (
                              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                <span className="text-[10px] uppercase tracking-widest font-bold text-purple-400 block mb-1">Example</span>
                                <p className="text-purple-900 italic">"{wordObj.example}"</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : activeTab === 'settings' ? (
            <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
              <header className="mb-8">
                <h1 className="text-3xl font-bold uppercase tracking-widest text-slate-900 mb-2">Platform Settings</h1>
                <p className="text-slate-500 font-light text-sm">
                  Manage your data and account preferences.
                </p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6 flex flex-col">
                  {/* Account Details */}
                  <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg shadow-purple-500/5">
                    <CardContent className="p-6">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-600" />
                        Account Info
                      </h3>
                      <div>
                        <span className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Email Display</span>
                        <span className="text-slate-900 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-block font-medium">{user?.email}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Data Management */}
                  <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg shadow-purple-500/5">
                    <CardContent className="p-6">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Settings className="h-4 w-4 text-purple-600" />
                        Data Management
                      </h3>
                      <div className="flex flex-col gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 mb-1">Export Data</h4>
                          <p className="text-xs text-slate-500">Download a CSV of all current Word Bank vocabulary.</p>
                        </div>
                        <Button 
                          onClick={() => {
                            if (allWords.length === 0) return;
                            const headers = ['Word', 'Subject', 'Level', 'Definition', 'Example', 'Created At'];
                            const rows = allWords.map(w => [
                              `"${w.word?.replace(/"/g, '""') || ''}"`,
                              `"${w.subject?.replace(/"/g, '""') || ''}"`,
                              `"${w.level?.replace(/"/g, '""') || ''}"`,
                              `"${w.definition?.replace(/"/g, '""') || ''}"`,
                              `"${w.example?.replace(/"/g, '""') || ''}"`,
                              `"${w.createdAt || ''}"`
                            ]);
                            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", "vocabulary_export.csv");
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          disabled={allWords.length === 0}
                          variant="outline" 
                          className="w-full uppercase tracking-widest text-xs font-bold"
                        >
                          Download CSV
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="pt-2">
                    <Button 
                      onClick={submitLogout}
                      variant="ghost" 
                      className="w-full text-red-600 bg-white border border-red-100 hover:bg-red-50 hover:text-red-700 uppercase tracking-widest text-sm font-bold"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out Account
                    </Button>
                  </div>
                </div>

                <div className="h-full flex flex-col">
                  {/* Security */}
                  <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg shadow-purple-500/5 flex-1">
                    <CardContent className="p-6">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Settings className="h-4 w-4 text-purple-600" />
                        Security
                      </h3>
                      <form className="space-y-4" onSubmit={async (e) => {
                        e.preventDefault();
                        if (passwords.new !== passwords.confirm) {
                          alert('New passwords do not match');
                          return;
                        }
                        try {
                          await api.updatePassword(passwords.new);
                          setPasswords({ current: '', new: '', confirm: '' });
                          alert('Password changed successfully');
                        } catch(err: any) { alert(err.message); }
                      }}>
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Current Password</label>
                          <input type="password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-600 transition-colors text-sm" required />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">New Password</label>
                          <input type="password" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-600 transition-colors text-sm" required />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Confirm New Password</label>
                          <input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-600 transition-colors text-sm" required />
                        </div>
                        <Button type="submit" variant="outline" className="w-full uppercase tracking-widest text-xs font-bold border-purple-200 text-purple-700 hover:bg-purple-50">
                          Update Password
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </div>
  );
}
