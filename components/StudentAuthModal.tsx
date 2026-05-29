import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Key, AlertCircle, Loader2 } from 'lucide-react';

export function StudentAuthModal({ isOpen, onOpenChange, onLoginSuccess }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onLoginSuccess: () => void }) {
  const [accessCode, setAccessCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim() || !password) {
      setError('Both fields are required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const formattedCode = accessCode.trim().toUpperCase();

    try {
      try {
        await api.studentSignup(formattedCode, password);
        onOpenChange(false);
        onLoginSuccess();
      } catch (signupErr: any) {
        if (signupErr.message === 'Access code has already been claimed.') {
          // Log in instead
          try {
            await api.studentLogin(formattedCode, password);
            onOpenChange(false);
            onLoginSuccess();
          } catch (loginErr: any) {
            setError('Invalid access code or password.');
          }
        } else {
          setError(signupErr.message || 'Invalid access code.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden bg-white">
        <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-8 text-center text-white relative">
          <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Student Access</h2>
          <p className="text-cyan-100 text-sm font-medium">
            Enter your class Access Code to unlock the hub.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pb-10 space-y-6 bg-slate-50">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-500 ml-1">Access Code</label>
              <input
                type="text"
                placeholder="e.g. XSIB-1234"
                className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-900 font-mono focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all uppercase"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-500 ml-1">Password</label>
              <input
                type="password"
                placeholder="Create or enter password"
                className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-[10px] text-slate-400 mt-1 ml-1">Set a password your first time. Use it to return later.</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center gap-3 border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-cyan-500/25 font-bold uppercase tracking-widest transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Hub'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
