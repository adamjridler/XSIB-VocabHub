import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export function FloatingWords({ backgroundWords }: { backgroundWords: string[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || backgroundWords.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1] select-none">
      {backgroundWords.map((word, i) => {
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        const moveX = (Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 40);
        const moveY = (Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 40);
        
        return (
          <motion.div
            key={i}
            className="absolute text-5xl md:text-8xl font-[800] tracking-tight whitespace-nowrap text-purple-900/[0.04]"
            style={{ left: `${startX}%`, top: `${startY}%` }}
            animate={{
              opacity: [0, 1, 0],
              x: [0, moveX],
              y: [0, moveY],
              scale: [0.7, 1.2, 0.7]
            }}
            transition={{
              duration: 20 + Math.random() * 15,
              repeat: Infinity,
              delay: Math.random() * 8,
              ease: "easeInOut"
            }}
          >
            {word}
          </motion.div>
        );
      })}
    </div>
  );
}

export function AmbientOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div 
        animate={{ 
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-300/30 blur-[100px]"
      />
      <motion.div 
        animate={{ 
          x: [0, -100, 0],
          y: [0, 100, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-300/30 blur-[120px]"
      />
      <motion.div 
        animate={{ 
          x: [0, 50, -50, 0],
          y: [0, 50, 0],
          scale: [1, 0.9, 1]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[20%] left-[60%] w-[30vw] h-[30vw] rounded-full bg-indigo-300/30 blur-[90px]"
      />
      <motion.div 
        animate={{ 
          x: [0, -40, 40, 0],
          y: [0, -60, 0],
          scale: [1, 1.3, 1]
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[20%] left-[30%] w-[25vw] h-[25vw] rounded-full bg-cyan-200/30 blur-[100px]"
      />
    </div>
  );
}
