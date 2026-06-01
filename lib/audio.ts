export const playSound = (sound: 'correct' | 'level-complete' | 'game-over') => {
  if (typeof window === 'undefined') return;
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
