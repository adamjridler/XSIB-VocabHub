import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus, MailCheck } from 'lucide-react';
import { api } from '@/lib/api';

interface TeacherAuthModalProps {
  onLoginSuccess?: () => void;
}

export function TeacherAuthModal({ onLoginSuccess }: TeacherAuthModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Signup State
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      if (isOpen) {
        try {
          const user = await api.me();
          if (user) {
            setIsOpen(false);
            if (onLoginSuccess) onLoginSuccess();
          }
        } catch(e) {}
      }
    };
    checkUser();
  }, [isOpen, onLoginSuccess]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError('');
    setSignupError('');
    setIsLoading(true);
    
    try {
      const emailToUse = isVerifying ? (signupEmail || loginEmail) : loginEmail;
      const passToUse = isVerifying ? (signupPassword || loginPassword) : loginPassword;
      await api.login(emailToUse, passToUse);
      setIsOpen(false);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      if (err.message === 'unverified_email') {
        setIsVerifying(true);
        setSignupError('Please verify your email before logging in.');
      } else {
        setLoginError(err.message || 'Failed to log in');
        if (isVerifying) setSignupError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    
    if (!signupEmail.endsWith('@nbxiaoshi.cn') && signupEmail !== 'admin@nbxiaoshi.cn') {
      setSignupError('Only @nbxiaoshi.cn emails are allowed to register.');
      return;
    }

    if (signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await api.signup(signupEmail, signupPassword);
      // SQLite backend logs in immediately
      await api.login(signupEmail, signupPassword);
      setIsOpen(false);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      setSignupError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    try {
      setIsLoading(true);
      const e = signupEmail || loginEmail;
      const p = signupPassword || loginPassword;
      await api.resendVerification(e, p);
      setSignupError('Verification email resent.');
    } catch (err: any) {
      setSignupError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(() => {
        setIsVerifying(false);
        setSignupError('');
        setLoginError('');
        setActiveTab('login');
      }, 300);
    }
  };

  const renderVerifyUI = () => (
    <div className="space-y-6 mt-6">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-2">
          <MailCheck className="h-8 w-8" />
        </div>
        <p className="text-slate-600 font-medium text-sm">
          A verification link has been sent to <strong>{signupEmail || loginEmail}</strong>. 
          Please click the link in the email to activate your account.
        </p>
      </div>
      
      {signupError && (
        <div className="p-3 bg-red-100 border border-red-200 text-red-600 text-sm rounded-lg flex items-center justify-center">
          <p>{signupError}</p>
        </div>
      )}

      <Button onClick={() => handleLogin()} disabled={isLoading} className="w-full py-6 mt-4 bg-gradient-to-br from-purple-600 to-purple-500 text-white font-bold rounded-xl text-sm uppercase tracking-wider shadow-md shadow-purple-500/20 hover:opacity-90 border-none">
        {isLoading ? 'Checking...' : "I've verified my email"}
      </Button>
      
      <Button 
        type="button" 
        variant="outline"
        onClick={resendVerification}
        disabled={isLoading}
        className="w-full border-purple-300 text-purple-600 bg-transparent uppercase tracking-widest text-xs font-bold hover:bg-purple-100 hover:text-purple-600 hover:border-purple-600 rounded-xl mt-4 py-6"
      >
        Resend Verification Email
      </Button>
    </div>
  );

  return (
    <>
      <div className="flex flex-col items-end cursor-pointer" onClick={() => setIsOpen(true)}>
        <span className="text-[10px] uppercase tracking-widest font-bold text-purple-600 mb-1">Staff Only</span>
        <span className="text-sm font-medium hover:opacity-70 uppercase tracking-widest text-slate-900">Login</span>
      </div>
      
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] bg-white backdrop-blur-3xl border-slate-200 shadow-2xl text-slate-900 rounded-[24px] p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold uppercase tracking-widest text-slate-900">
            {isVerifying ? 'Check your inbox' : 'Teacher Access'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-medium mt-2">
            {isVerifying 
              ? 'Complete registration to continue.' 
              : 'Register your department profile to upload weekly words.'}
          </DialogDescription>
        </DialogHeader>
        
        {isVerifying ? renderVerifyUI() : (
          <div className="w-full mt-6">
            <div className="flex w-full bg-slate-100 border border-slate-200 p-1 rounded-xl">
              <button 
                type="button"
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-3 rounded-lg uppercase tracking-widest text-[11px] font-bold transition-all ${activeTab === 'login' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                Log In
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-3 rounded-lg uppercase tracking-widest text-[11px] font-bold transition-all ${activeTab === 'signup' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                Sign Up
              </button>
            </div>
            
            {activeTab === 'login' && (
              <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg p-4 h-auto focus:border-purple-600 outline-none focus:ring-1 focus:ring-purple-600"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg p-4 h-auto focus:border-purple-600 outline-none focus:ring-1 focus:ring-purple-600"
                      required
                    />
                  </div>
                  
                  {loginError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg flex items-start gap-2">
                      <p>{loginError}</p>
                    </div>
                  )}
                  
                  <Button type="submit" disabled={isLoading} className="w-full py-6 mt-4 bg-gradient-to-br from-purple-600 to-purple-500 text-white font-bold rounded-xl text-sm uppercase tracking-wider shadow-md shadow-purple-500/20 hover:opacity-90 border-none">
                    {isLoading ? 'Logging In...' : 'Log In'}
                  </Button>
                </form>
              </div>
            )}
            
            {activeTab === 'signup' && (
              <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-1">
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg p-4 h-auto focus:border-purple-600 outline-none focus:ring-1 focus:ring-purple-600"
                      required
                    />
                    <p className="text-xs text-purple-600 font-medium px-2 py-1">
                      * Registration is restricted to @nbxiaoshi.cn email addresses
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create Password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg p-4 h-auto focus:border-purple-600 outline-none focus:ring-1 focus:ring-purple-600"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Confirm Password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg p-4 h-auto focus:border-purple-600 outline-none focus:ring-1 focus:ring-purple-600"
                      required
                    />
                  </div>
                  
                  {signupError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg flex items-start gap-2">
                      <UserPlus className="h-4 w-4 mt-0.5 shrink-0" />
                      <p>{signupError}</p>
                    </div>
                  )}
                  
                  <Button type="submit" disabled={isLoading} className="w-full py-6 mt-4 bg-gradient-to-br from-purple-600 to-purple-500 text-white font-bold rounded-xl text-sm uppercase tracking-wider shadow-md shadow-purple-500/20 hover:opacity-90 border-none">
                    {isLoading ? 'Creating...' : 'Create Staff Account'}
                  </Button>
                </form>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
