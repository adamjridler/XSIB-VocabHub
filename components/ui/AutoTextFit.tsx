import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';

interface AutoTextFitProps {
  text: string;
  minFontSize?: number;
  maxFontSize?: number;
  className?: string;
  defaultFontSize?: number;
  wrap?: boolean;
}

export function AutoTextFit({ text, minFontSize = 10, maxFontSize = 120, defaultFontSize, wrap = false, className = '' }: AutoTextFitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  
  // Use a heuristic or passed default. If 7xl is ~72px, let's start there if not provided.
  const [fontSize, setFontSize] = useState(defaultFontSize || maxFontSize);

  useLayoutEffect(() => {
    const resizeText = () => {
      const container = containerRef.current;
      const textNode = textRef.current;
      if (!container || !textNode) return;

      // Reset to max to measure natural width without constraints first
      let currentSize = defaultFontSize || maxFontSize;
      textNode.style.fontSize = `${currentSize}px`;
      
      if (wrap) {
        // For wrapped text, we check if the scrollHeight exceeds the clientHeight
        while (textNode.scrollHeight > container.clientHeight && currentSize > minFontSize) {
          currentSize -= 1;
          textNode.style.fontSize = `${currentSize}px`;
        }
      } else {
        // We reduce font size until the text width is smaller than the container width
        while (textNode.scrollWidth > container.clientWidth && currentSize > minFontSize) {
          currentSize -= 1;
          textNode.style.fontSize = `${currentSize}px`;
        }
      }
      
      setFontSize(currentSize);
    };

    resizeText();
    
    const observer = new ResizeObserver(() => {
      // Need to debounce slightly to avoid loops, but native JS is usually fast enough
      window.requestAnimationFrame(resizeText);
    });
    
    if (containerRef.current) observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, [text, minFontSize, maxFontSize, defaultFontSize, wrap]);

  return (
    <div ref={containerRef} className={`w-full h-full overflow-hidden flex items-center justify-center ${className}`}>
      <span ref={textRef} style={{ fontSize: `${fontSize}px`, whiteSpace: wrap ? 'normal' : 'nowrap', wordBreak: wrap ? 'break-word' : 'normal', lineHeight: '1.2' }}>
        {text}
      </span>
    </div>
  );
}
