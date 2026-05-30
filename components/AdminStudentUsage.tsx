import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, User, Clock, Activity, Calendar, Trophy, Search, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AdminStudentUsage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<any>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await api.getAllStudents(); // We will need to implement this
      setStudents(data);
    } catch (err) {
      console.error("Failed to fetch students", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setLoadingSessions(true);
    setSessions([]);
    try {
      const studentSessions = await api.getStudentSessions(student.uid || student.id); // Implement this
      setSessions(studentSessions);
    } catch (err) {
      console.error("Failed to fetch student sessions", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteStudent(studentToDelete.uid || studentToDelete.id);
      if (res.success) {
        if (selectedStudent?.id === studentToDelete.id) {
          setSelectedStudent(null);
          setSessions([]);
        }
        await fetchStudents();
        setStudentToDelete(null);
      } else {
        alert('Failed to delete student: ' + res.error);
      }
    } catch (err) {
      console.error("Failed to delete student", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const lowerQuery = searchQuery.toLowerCase();
      const code = student.accessCode ? student.accessCode.toLowerCase() : '';
      const name = student.name ? student.name.toLowerCase() : '';
      return code.includes(lowerQuery) || name.includes(lowerQuery);
    });
  }, [students, searchQuery]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading student usage data...</div>;
  }

  return (
    <div className="space-y-6">
      <Dialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">Are you sure you want to delete <strong>{studentToDelete?.name || 'this student'}</strong>? This action cannot be undone and will permanently remove their profile data.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteStudent} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <header>
        <h1 className="text-3xl font-bold uppercase tracking-widest text-slate-900 mb-2">Student Usage</h1>
        <p className="text-slate-500 font-light text-sm">
          Analytics and activity logs for enrolled students.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border-r border-slate-200 pr-6 overflow-y-auto max-h-[70vh]">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">All Students</h2>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search name or access code..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-2">
            {filteredStudents.length === 0 ? (
              <p className="text-sm text-slate-500 italic">{searchQuery ? 'No matching students.' : 'No students found.'}</p>
            ) : (
              filteredStudents.map(student => (
                <div 
                  key={student.id} 
                  className={`relative p-3 rounded-xl border transition-colors group ${selectedStudent?.id === student.id ? 'bg-purple-100 border-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white border-slate-200 hover:border-purple-300'}`}
                >
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleSelectStudent(student)}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedStudent?.id === student.id ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm truncate ${selectedStudent?.id === student.id ? 'text-purple-900' : 'text-slate-800'}`}>{student.name || 'Unknown'}</div>
                      <div className="flex gap-2 text-xs font-medium mt-1 truncate">
                        <span className={selectedStudent?.id === student.id ? 'text-purple-700' : 'text-slate-500'}>{student.accessCode || 'No Code'}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-emerald-500 font-bold">{student.highScore || 0} pts</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setStudentToDelete(student); }}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-100 ${selectedStudent?.id === student.id ? 'opacity-100 bg-rose-100/50 hover:bg-rose-200' : ''}`}
                    title="Delete Student"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedStudent ? (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-slate-900">{selectedStudent.name || 'Unknown'}</h2>
                    <span className="text-sm font-semibold uppercase tracking-widest text-purple-600">{selectedStudent.accessCode}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Score</div>
                    <div className="text-3xl font-black text-emerald-500">{selectedStudent.highScore || 0}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                    <Activity className="w-5 h-5 text-purple-500 mb-2" />
                    <div className="text-2xl font-black text-slate-800">{sessions.length}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Games Played</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                    <Trophy className="w-5 h-5 text-amber-500 mb-2" />
                    <div className="text-2xl font-black text-slate-800">{sessions.length}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Recorded Sessions</div>
                  </div>
                </div>

                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-4">Recent Activity Logs</h3>
                
                {loadingSessions ? (
                 <div className="text-center p-4 text-sm text-slate-500">Loading sessions...</div>
                ) : sessions.length === 0 ? (
                 <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 italic text-sm">No activity recorded yet for this student.</div>
                ) : (
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {sessions.map((session, i) => (
                      <div key={i} className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-xl hover:border-purple-200 transition-colors">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-800 text-sm">{session.game}</span>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {session.createdAt && typeof session.createdAt.toDate === 'function' ? session.createdAt.toDate().toLocaleString() : new Date(session.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-black text-emerald-500 text-lg">+{session.score}</span>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">/ {session.maxScore} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
              <User className="w-16 h-16 text-slate-300 mb-4" />
              <p className="font-medium">Select a student to view their metrics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
