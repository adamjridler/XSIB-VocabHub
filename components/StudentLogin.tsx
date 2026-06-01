import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Key, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export function StudentLogin({ onLoginSuccess }: { onLoginSuccess: (user: any) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [verifiedAccessCode, setVerifiedAccessCode] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'code' | 'login' | 'signup'>('code');

  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Name or Access Code is required');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const data = await api.checkIdentifier(identifier);
      setVerifiedAccessCode(data.accessCode);
      setVerifiedName(data.name);
      if (data.type === 'signup') {
        setStep('signup');
      } else {
        setStep('login');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid Name or Access Code.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Password is required');
      return;
    }
    
    if (step === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      let user;
      if (step === 'signup') {
        user = await api.studentSignup(verifiedAccessCode, password);
      } else {
        user = await api.studentLogin(verifiedAccessCode, password);
      }
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white/80 backdrop-blur-xl border border-purple-200/50 shadow-2xl shadow-purple-500/10 rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-8 text-center text-white relative">
          <div className="absolute inset-0 bg-white/10 pattern-dots" />
          <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur flex items-center justify-center mx-auto mb-4 shadow-inner relative z-10">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2 relative z-10">Student Access</h2>
          <p className="text-cyan-100 text-sm font-medium relative z-10">
            {step === 'code' ? 'Enter your Name or Access Code to unlock the hub.' : 
             step === 'login' ? `Welcome back, ${verifiedName}! Enter your password.` : 
             `Hi ${verifiedName}, create a password to secure your account.`}
          </p>
        </div>

        {step === 'code' ? (
          <form onSubmit={handleCheckCode} className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-bold text-slate-500 ml-1">Name / Access Code</label>
              <input
                type="text"
                placeholder="e.g. Jimmy Li or XSIB-1234"
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-base focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium flex items-center gap-3 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-cyan-500/25 font-bold uppercase tracking-widest transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span className="mr-2">Continue</span> <ArrowRight className="w-5 h-5" /></>}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="p-6 space-y-6">
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest font-bold text-slate-500 ml-1">Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {step === 'signup' && (
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest font-bold text-slate-500 ml-1">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Enter password again"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all text-base"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium flex items-center gap-3 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-cyan-500/25 font-bold uppercase tracking-widest transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (step === 'signup' ? 'Create Account' : 'Enter Hub')}
            </Button>
            
            <div className="text-center">
              <button 
                type="button" 
                onClick={() => { setStep('code'); setError(''); }}
                className="text-sm font-medium text-slate-500 hover:text-slate-900"
              >
                Start Over
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
