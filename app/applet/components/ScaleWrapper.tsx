import React, { useEffect, useRef, useState } from 'react';

export function ScaleWrapper({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (!containerRef.current) return;
      const { width, height } = entries[0].contentRect;
      
      // 1200x800 provides a good widescreen canvas for the games
      const targetWidth = 1200;
      const targetHeight = 800;
      
      const scaleX = width / targetWidth;
      const scaleY = height / targetHeight;
      
      // Maintain aspect ratio globally
      let newScale = Math.min(scaleX, scaleY);
      
      // Prevent over-scaling on ultra-wide / huge displays
      if (newScale > 1.2) {
        newScale = 1.2;
      }
      
      setScale(newScale);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full flex items-center justify-center overflow-hidden"
    >
      <div 
        style={{ 
          transform: `scale(${scale})`, 
          transformOrigin: 'center center',
          width: '1200px',
          height: '800px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        className="flex-shrink-0"
      >
        {children}
      </div>
    </div>
  );
}
