import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Key, CheckCircle2, AlertCircle, Copy, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { motion } from 'motion/react';

export function AdminAccessCodes() {
  const [accessCodes, setAccessCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [resetPasswordForCode, setResetPasswordForCode] = useState<any>(null);
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const codes = await api.getAccessCodes();
      setAccessCodes(codes);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch access codes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const generateCode = async () => {
    if (!name.trim() || !gradeLevel.trim()) {
      setError('Name and Grade Level are required.');
      return;
    }
    setError('');
    setSuccess('');
    setIsGenerating(true);
    try {
      const codeStr = `XSIB-${Math.floor(1000 + Math.random() * 9000)}`;
      await api.createAccessCode(codeStr, name, gradeLevel);
      setSuccess(`Generated code: ${codeStr}`);
      setName('');
      setGradeLevel('');
      fetchCodes();
    } catch (err: any) {
      setError(err.message || 'Failed to generate code.');
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteCode = async (id: string) => {
    try {
      await api.deleteAccessCode(id);
      fetchCodes();
    } catch(err) {
      console.error("error deleting", err);
    }
  };

  const handleResetStudentPassword = async () => {
    if (!resetPasswordForCode || !newStudentPassword) return;
    setIsResetting(true);
    try {
      await api.resetStudentPassword(resetPasswordForCode.userId, newStudentPassword);
      setResetPasswordForCode(null);
      setNewStudentPassword('');
      alert('Password reset successfully.');
    } catch (err: any) {
      console.error("Failed to reset student password", err);
      alert('Failed to reset password: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-500 pb-6">
      <Dialog open={!!resetPasswordForCode} onOpenChange={(open) => {
        if (!open) {
          setResetPasswordForCode(null);
          setNewStudentPassword('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Student Password</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-600">
              Reset password for <strong>{resetPasswordForCode?.name || 'this student'}</strong>
            </p>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 block">New Password</label>
              <Input 
                type="password" 
                value={newStudentPassword} 
                onChange={e => setNewStudentPassword(e.target.value)} 
                placeholder="Enter new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetPasswordForCode(null); setNewStudentPassword(''); }}>Cancel</Button>
            <Button onClick={handleResetStudentPassword} disabled={isResetting || !newStudentPassword}>
              {isResetting ? 'Saving...' : 'Save Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="mb-4 flex-none">
        <h1 className="text-3xl font-bold uppercase tracking-widest text-slate-900 mb-1">Access Codes</h1>
        <p className="text-slate-500 font-light text-sm">
          Generate access codes for students.
        </p>
      </header>

      <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Generate New Code</h3>
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Student Name" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="flex-1 bg-white border border-slate-200 rounded p-3 focus:outline-none focus:border-purple-600"
          />
          <input 
            type="text" 
            placeholder="Grade Level (e.g. IB1)" 
            value={gradeLevel} 
            onChange={e => setGradeLevel(e.target.value)} 
            className="flex-1 bg-white border border-slate-200 rounded p-3 focus:outline-none focus:border-purple-600"
          />
          <Button onClick={generateCode} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700 text-white font-bold p-3">
            {isGenerating ? 'Generating...' : <><PlusCircle className="mr-2 h-4 w-4" /> Generate Code</>}
          </Button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2 flex items-center"><AlertCircle className="w-4 h-4 mr-1" /> {error}</p>}
        {success && <p className="text-green-600 text-sm mt-2 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1" /> {success}</p>}
      </Card>

      <Card className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
              <tr>
                <th className="px-6 py-3">Access Code</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Grade Level</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accessCodes.map(c => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">{c.code}</td>
                  <td className="px-6 py-4">{c.name}</td>
                  <td className="px-6 py-4">{c.grade_level || c.gradeLevel}</td>
                  <td className="px-6 py-4">
                    {c.claimed ? (
                      <span className="text-green-600 text-xs font-bold uppercase tracking-widest bg-green-100 py-1 px-2 rounded">Claimed</span>
                    ) : (
                      <span className="text-amber-600 text-xs font-bold uppercase tracking-widest bg-amber-100 py-1 px-2 rounded">Unclaimed</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {c.claimed && c.userId && (
                        <button onClick={() => setResetPasswordForCode(c)} className="text-purple-600 hover:text-purple-800" title="Reset Student Password">
                          <Lock className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => deleteCode(c.id)} className="text-slate-400 hover:text-red-600" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {accessCodes.length === 0 && !loading && (
                <tr key="empty">
                  <td colSpan={5} className="text-center py-6 text-slate-500">No access codes found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
