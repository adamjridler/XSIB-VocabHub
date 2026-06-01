import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from './button';
import { getSoundsEnabled, toggleSounds } from '@/lib/audio';

export function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(getSoundsEnabled());
  }, []);

  const handleToggle = () => {
    setEnabled(toggleSounds());
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className={`rounded-full transition-colors ${enabled ? 'text-slate-100 hover:text-white bg-slate-800/50 hover:bg-slate-700/50' : 'text-slate-400 hover:text-slate-300 bg-slate-800/30 hover:bg-slate-700/30'} backdrop-blur-md border border-white/5`}
    >
      {enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
    </Button>
  );
}
