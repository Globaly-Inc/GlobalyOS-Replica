/**
 * PDF Viewer Component
 * Renders PDF pages with page slider navigation
 * Supports inline (in feed) and lightbox (expanded) modes
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ChevronLeft, ChevronRight, Maximize2, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for pdfjs-dist (loaded dynamically)
interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNum: number) => Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => RenderTask;
}

interface RenderTask {
  promise: Promise<void>;
  cancel: () => void;
}

interface PDFViewerProps {
  fileUrl: string;
  mode: 'inline' | 'lightbox';
  onExpand?: () => void;
  className?: string;
}

// Load PDF.js from CDN to avoid bundling top-level `await` modules into the build.
// Using version 3.11.174 to match pdfThumbnail.ts and avoid worker version conflicts
const PDFJS_VERSION = '3.11.174';
const PDFJS_CDN_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: string | { url: string }) => { promise: Promise<unknown> };
};

let pdfjsLib: PdfJsLib | null = null;
let pdfjsLoadPromise: Promise<PdfJsLib> | null = null;

const loadPdfJs = async (): Promise<PdfJsLib> => {
  if (pdfjsLib) return pdfjsLib;
  if (pdfjsLoadPromise) return pdfjsLoadPromise;

  pdfjsLoadPromise = new Promise<PdfJsLib>((resolve, reject) => {
    const existing = (window as any).pdfjsLib as PdfJsLib | undefined;
    if (existing) {
      existing.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
      pdfjsLib = existing;
      resolve(existing);
      return;
    }

    const script = document.createElement('script');
    script.src = PDFJS_CDN_SRC;
    script.async = true;
    script.onload = () => {
      const loaded = (window as any).pdfjsLib as PdfJsLib | undefined;
      if (!loaded) {
        reject(new Error('PDF.js failed to load'));
        return;
      }
      loaded.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
      pdfjsLib = loaded;
      resolve(loaded);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));

    document.head.appendChild(script);
  });

  return pdfjsLoadPromise;
};

export const PDFViewer = ({ fileUrl, mode, onExpand, className }: PDFViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const renderTaskRef = useRef<RenderTask | null>(null);

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const pdfjs = await loadPdfJs();
        const loadingTask = pdfjs.getDocument(fileUrl);
        const pdf = (await loadingTask.promise) as unknown as PDFDocumentProxy;
        
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [fileUrl]);

  // Render current page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    // Cancel any ongoing render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    setRendering(true);

    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      // Calculate scale based on container size
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = mode === 'lightbox' 
        ? Math.min(window.innerHeight * 0.7, 800)
        : containerRef.current.clientHeight || 300;

      const viewport = page.getViewport({ scale: 1 });
      const scaleX = containerWidth / viewport.width;
      const scaleY = containerHeight / viewport.height;
      const scale = Math.min(scaleX, scaleY) * (window.devicePixelRatio || 1);

      const scaledViewport = page.getViewport({ scale });

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = `${scaledViewport.width / (window.devicePixelRatio || 1)}px`;
      canvas.style.height = `${scaledViewport.height / (window.devicePixelRatio || 1)}px`;

      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
      }
    } finally {
      setRendering(false);
    }
  }, [pdfDoc, mode]);

  // Re-render when page changes or PDF loads
  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, renderPage]);

  // Re-render on window resize (for lightbox mode)
  useEffect(() => {
    if (mode !== 'lightbox') return;

    const handleResize = () => {
      if (pdfDoc && currentPage > 0) {
        renderPage(currentPage);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, currentPage, mode, renderPage]);

  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleSliderChange = (value: number[]) => {
    setCurrentPage(value[0]);
  };

  if (loading) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted rounded-lg",
        mode === 'inline' ? "aspect-[4/3]" : "min-h-[400px]",
        className
      )}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Loading PDF...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted rounded-lg",
        mode === 'inline' ? "aspect-[4/3]" : "min-h-[400px]",
        className
      )}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <FileText className="h-8 w-8" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col bg-muted rounded-lg overflow-hidden",
        mode === 'inline' ? "aspect-[4/3]" : "w-full",
        className
      )}
    >
      {/* PDF Canvas */}
      <div className={cn(
        "relative flex-1 flex items-center justify-center overflow-hidden",
        mode === 'inline' && "cursor-pointer"
      )}
        onClick={mode === 'inline' ? onExpand : undefined}
      >
        <canvas 
          ref={canvasRef} 
          className="max-w-full max-h-full object-contain"
        />
        
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Expand button for inline mode */}
        {mode === 'inline' && onExpand && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background"
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Controls */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 bg-background/80 border-t border-border/50",
        mode === 'lightbox' && "px-4 py-3"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={goToPrevious}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 px-2">
          <Slider
            value={[currentPage]}
            min={1}
            max={totalPages}
            step={1}
            onValueChange={handleSliderChange}
            className="cursor-pointer"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={goToNext}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <span className={cn(
          "text-xs text-muted-foreground whitespace-nowrap tabular-nums",
          mode === 'lightbox' && "text-sm"
        )}>
          {currentPage} / {totalPages}
        </span>
      </div>
    </div>
  );
};
