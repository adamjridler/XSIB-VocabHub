import React, { useEffect, useRef, useState } from 'react';

export function ScaleWrapper({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (!containerRef.current) return;
      const { width, height } = entries[0].contentRect;
      
      // Target resolution for scaling the games to ensure they aren't cut off
      const targetWidth = 1024;
      const targetHeight = 800;
      
      const scaleX = width / targetWidth;
      const scaleY = height / targetHeight;
      
      // Preserve aspect ratio by taking the minimum scale needed
      let newScale = Math.min(scaleX, scaleY);
      
      // Avoid overscaling the UI on very large displays
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
      className="w-full h-full relative overflow-hidden"
    >
      <div 
        style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${scale})`, 
          transformOrigin: '50% 50%',
          width: '1024px',
          height: '800px',
          display: 'flex',
          flexDirection: 'column'
        }}
        className="flex-shrink-0"
      >
        {children}
      </div>
    </div>
  );
}
