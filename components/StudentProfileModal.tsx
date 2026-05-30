import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { User, Lock, KeyRound } from 'lucide-react';

export function StudentProfileModal({ user, onPasswordChanged, onLogout }: { user: any, onPasswordChanged?: () => void, onLogout?: () => void }) {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.updatePassword(newPassword);
      setSuccess('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
      if (onPasswordChanged) onPasswordChanged();
      setTimeout(() => setOpen(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" className="text-purple-700 font-bold tracking-wide hover:bg-purple-100/50" />}>
        Welcome, {user?.name}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white border border-purple-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <User className="h-6 w-6 text-purple-600" />
            Student Profile
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">Full Name</Label>
              <div className="font-semibold text-slate-900 text-lg">{user?.name}</div>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">Access Code</Label>
              <div className="flex items-center gap-2 font-mono bg-white px-3 py-2 rounded-lg border border-slate-200">
                <KeyRound className="h-4 w-4 text-purple-500" />
                <span className="text-slate-900 font-bold">{user?.access_code}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="font-bold tracking-tight text-slate-900 flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-slate-400" />
              Change Password
            </h3>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              {error && <div className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>}
              {success && <div className="text-sm font-medium text-emerald-600 bg-emerald-50 p-3 rounded-lg">{success}</div>}

              <Button 
                type="submit" 
                className="w-full font-bold bg-purple-600 hover:bg-purple-700 text-white" 
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </div>
          
          {onLogout && (
            <div className="border-t border-slate-100 pt-4 mt-2">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 font-bold uppercase tracking-widest text-sm"
              >
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
