import { useCallback, useRef, useState, type ReactNode } from 'react';

interface IvrCanvasProps {
  children: ReactNode;
  width?: number;
  height?: number;
}

export function IvrCanvas({ children, width = 1200, height = 800 }: IvrCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale((s) => Math.min(2, Math.max(0.3, s + delta)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      }
    },
    [offset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setOffset({ x: panStart.current.ox + dx, y: panStart.current.oy + dy });
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-muted/30 rounded-lg border"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
    >
      {/* Dot grid background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
        <defs>
          <pattern id="ivr-grid" width="20" height="20" patternUnits="userSpaceOnUse"
            patternTransform={`translate(${offset.x % 20},${offset.y % 20}) scale(${scale})`}>
            <circle cx="1" cy="1" r="1" className="fill-muted-foreground/40" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ivr-grid)" />
      </svg>

      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        {children}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-background/90 backdrop-blur border rounded-md px-2 py-1 text-xs text-muted-foreground">
        <button onClick={() => setScale((s) => Math.max(0.3, s - 0.1))} className="px-1 hover:text-foreground">−</button>
        <span className="w-10 text-center">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(2, s + 0.1))} className="px-1 hover:text-foreground">+</button>
        <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="px-1 ml-1 hover:text-foreground">⌂</button>
      </div>
    </div>
  );
}
