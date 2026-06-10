import React, { useEffect, useRef, useState } from 'react';

interface ScaleWrapperProps {
  children: React.ReactNode;
  targetWidth?: number;
  targetHeight?: number;
}

export function ScaleWrapper({ children, targetWidth = 1024, targetHeight = 768 }: ScaleWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calculateScale = () => {
      if (containerRef.current && containerRef.current.parentElement) {
        const parent = containerRef.current.parentElement;
        const availableWidth = parent.clientWidth;
        const availableHeight = parent.clientHeight;
        
        // Calculate scale to fit within parent without exceeding bounds
        const scaleX = availableWidth / targetWidth;
        const scaleY = availableHeight / targetHeight;
        
        // Use the smaller scale to ensure both width and height fit
        // And don't scale up past 1 unless desired; for now we can scale up/down to strictly fit
        const newScale = Math.min(scaleX, scaleY);
        setScale(newScale);
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [targetWidth, targetHeight]);

  return (
    <div 
      className="flex-1 w-full h-full flex items-center justify-center overflow-hidden relative bg-slate-950"
    >
      <div 
        ref={containerRef}
        style={{
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0
        }}
        className="relative overflow-hidden shadow-2xl rounded-2xl border border-slate-800 bg-slate-900"
      >
        {children}
      </div>
    </div>
  );
}
