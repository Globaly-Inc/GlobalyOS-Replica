/**
 * PDF Thumbnail Generator
 * Generates thumbnail images from PDF files using PDF.js
 */

// PDF.js types
interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
  destroy(): Promise<void>;
}

interface PDFPageProxy {
  getViewport(params: { scale: number }): { width: number; height: number };
  render(params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<void> };
}

interface PDFJSLib {
  getDocument(src: { data: ArrayBuffer } | { url: string }): { promise: Promise<PDFDocumentProxy> };
  GlobalWorkerOptions: { workerSrc: string };
}

// PDF.js CDN URLs (legacy build for compatibility)
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjsLib: PDFJSLib | null = null;
let loadingPromise: Promise<PDFJSLib> | null = null;

/**
 * Load PDF.js library from CDN
 */
export async function loadPdfJs(): Promise<PDFJSLib> {
  // Return cached instance if available
  if (pdfjsLib) return pdfjsLib;
  
  // Return existing loading promise if in progress
  if (loadingPromise) return loadingPromise;
  
  loadingPromise = new Promise<PDFJSLib>((resolve, reject) => {
    // Check if already loaded
    if ((window as unknown as { pdfjsLib?: PDFJSLib }).pdfjsLib) {
      pdfjsLib = (window as unknown as { pdfjsLib: PDFJSLib }).pdfjsLib;
      resolve(pdfjsLib);
      return;
    }
    
    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.async = true;
    
    script.onload = () => {
      const lib = (window as unknown as { pdfjsLib: PDFJSLib }).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
        pdfjsLib = lib;
        resolve(lib);
      } else {
        reject(new Error('PDF.js library not found after loading'));
      }
    };
    
    script.onerror = () => reject(new Error('Failed to load PDF.js library'));
    
    document.head.appendChild(script);
  });
  
  return loadingPromise;
}

export interface ThumbnailResult {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Generate a thumbnail from the first page of a PDF file
 */
export async function generatePdfThumbnail(
  file: File,
  maxWidth: number = 200
): Promise<ThumbnailResult> {
  const pdfjs = await loadPdfJs();
  
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Load the PDF document
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  try {
    // Get the first page
    const page = await pdf.getPage(1);
    
    // Calculate scale to fit maxWidth
    const viewport = page.getViewport({ scale: 1 });
    const scale = maxWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    
    // Set canvas dimensions
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    
    // Render the page
    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
    }).promise;
    
    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png');
    
    return {
      dataUrl,
      width: scaledViewport.width,
      height: scaledViewport.height,
    };
  } finally {
    // Cleanup
    await pdf.destroy();
  }
}

/**
 * Generate a thumbnail from a PDF URL
 */
export async function generatePdfThumbnailFromUrl(
  url: string,
  maxWidth: number = 200
): Promise<ThumbnailResult> {
  const pdfjs = await loadPdfJs();
  
  // Load the PDF document from URL
  const pdf = await pdfjs.getDocument({ url }).promise;
  
  try {
    // Get the first page
    const page = await pdf.getPage(1);
    
    // Calculate scale to fit maxWidth
    const viewport = page.getViewport({ scale: 1 });
    const scale = maxWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    
    // Set canvas dimensions
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    
    // Render the page
    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
    }).promise;
    
    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png');
    
    return {
      dataUrl,
      width: scaledViewport.width,
      height: scaledViewport.height,
    };
  } finally {
    // Cleanup
    await pdf.destroy();
  }
}
