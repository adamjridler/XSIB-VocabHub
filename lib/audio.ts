let soundsEnabled = true;

if (typeof window !== 'undefined') {
  soundsEnabled = localStorage.getItem('soundsEnabled') !== 'false';
}

export const toggleSounds = () => {
  soundsEnabled = !soundsEnabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('soundsEnabled', String(soundsEnabled));
  }
  return soundsEnabled;
};

export const getSoundsEnabled = () => soundsEnabled;

export const playSound = (sound: 'correct' | 'level-complete' | 'game-over') => {
  if (typeof window === 'undefined' || !soundsEnabled) return;
  try {
    const audio = new Audio(`/${sound}.wav`);
    audio.volume = 0.5;
    audio.play().catch(e => {
      // Ignore abort errors usually caused by playing too fast or before user interaction
      console.debug("Audio play failed:", e);
    });
  } catch (error) {
    console.debug("Failed to create audio:", error);
  }
};
