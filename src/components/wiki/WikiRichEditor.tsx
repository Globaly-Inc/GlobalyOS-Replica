import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Bold, Italic, Heading1, Heading2, Heading3, 
  List, ListOrdered, Link, Image, FileText, 
  Code, Quote, Minus, Table, Upload, Underline,
  Plus, Trash2, AlignLeft, AlignCenter, AlignRight,
  Pencil, X, ExternalLink, Type
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DOMPurify from "dompurify";
import Prism from "prismjs";

// Import Prism languages - order matters for dependencies
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-php";
import "prismjs/components/prism-swift";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-graphql";

const LANGUAGE_MAP: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  c: "c",
  "c++": "cpp",
  cpp: "cpp",
  "c#": "csharp",
  csharp: "csharp",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  php: "php",
  swift: "swift",
  kotlin: "kotlin",
  html: "markup",
  css: "css",
  sql: "sql",
  bash: "bash",
  shell: "bash",
  json: "json",
  yaml: "yaml",
  xml: "markup",
  markdown: "markdown",
  graphql: "graphql",
  "plain text": "plaintext",
  plaintext: "plaintext",
};

// Default text size in px
const DEFAULT_TEXT_SIZE = 14;

// File type icons mapping
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    pdf: "📄",
    doc: "📝",
    docx: "📝",
    xls: "📊",
    xlsx: "📊",
    ppt: "📽️",
    pptx: "📽️",
    txt: "📃",
    csv: "📊",
    zip: "🗜️",
    rar: "🗜️",
  };
  return iconMap[ext || ""] || "📎";
};

// Format file size
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

interface WikiRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  organizationId: string | undefined;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const sanitizeConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
    'a', 'img', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span', 'iframe', 'colgroup', 'col',
    'select', 'option', 'button', 'figure', 'figcaption'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'target', 'width', 'height', 
    'frameborder', 'allowfullscreen', 'style', 'value', 'selected', 
    'contenteditable', 'data-language', 'data-file-name', 'data-file-size',
    'data-file-url', 'data-size', 'data-align', 'rel'
  ],
  ALLOW_DATA_ATTR: true,
};

export const WikiRichEditor = ({ 
  value, 
  onChange, 
  organizationId,
  placeholder = "Start writing...",
  className,
  minHeight = "400px"
}: WikiRichEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const selectedTableRef = useRef<HTMLTableElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [editingLink, setEditingLink] = useState<HTMLAnchorElement | null>(null);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [embedUrl, setEmbedUrl] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const [activeTextSize, setActiveTextSize] = useState<number>(DEFAULT_TEXT_SIZE);
  const [textSizeInput, setTextSizeInput] = useState<string>(String(DEFAULT_TEXT_SIZE));
  
  // Image editing state
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);
  
  // Link popover state
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<HTMLAnchorElement | null>(null);
  
  // Table hover controls state
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [hoveredColIndex, setHoveredColIndex] = useState<number | null>(null);
  const [rowControlPos, setRowControlPos] = useState({ top: 0, left: 0, height: 0 });
  const [colControlPos, setColControlPos] = useState({ top: 0, left: 0, width: 0 });
  const [showTableControls, setShowTableControls] = useState(false);
  
  // Column resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeColIndex, setResizeColIndex] = useState<number | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const resizeTableRef = useRef<HTMLTableElement | null>(null);
  
  // Image resize state
  const [isResizingImage, setIsResizingImage] = useState(false);
  const [resizeImageStartX, setResizeImageStartX] = useState(0);
  const [resizeImageStartWidth, setResizeImageStartWidth] = useState(0);
  const resizingImageRef = useRef<HTMLImageElement | null>(null);

  // Save current selection
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  // Restore saved selection
  const restoreSelection = useCallback(() => {
    if (savedSelectionRef.current && editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
  }, []);

  // Initialize content
  useEffect(() => {
    if (editorRef.current && !isFocused) {
      const sanitized = DOMPurify.sanitize(value, sanitizeConfig);
      if (editorRef.current.innerHTML !== sanitized) {
        editorRef.current.innerHTML = sanitized || '';
      }
    }
  }, [value, isFocused]);

  const triggerUpdate = useCallback(() => {
    if (editorRef.current) {
      const html = DOMPurify.sanitize(editorRef.current.innerHTML, sanitizeConfig);
      onChange(html);
    }
  }, [onChange]);

  // Get font size from an element (checks inline style first, then computed style)
  const getFontSizeFromElement = useCallback((element: HTMLElement | null): number => {
    if (!element || element === editorRef.current) return DEFAULT_TEXT_SIZE;
    
    // Check for headings first - return their fixed sizes
    const h1 = element.closest('h1');
    if (h1) return 26;
    const h2 = element.closest('h2');
    if (h2) return 22;
    const h3 = element.closest('h3');
    if (h3) return 18;
    
    // Check inline style on element and ancestors
    let el: HTMLElement | null = element;
    while (el && el !== editorRef.current) {
      const fontSize = el.style?.fontSize;
      if (fontSize) {
        const match = fontSize.match(/(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
      el = el.parentElement;
    }
    
    // Default text size
    return DEFAULT_TEXT_SIZE;
  }, []);

  // Get all text nodes within a range
  const getTextNodesInRange = useCallback((range: Range): Node[] => {
    const textNodes: Node[] = [];
    const walker = document.createTreeWalker(
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
        ? range.commonAncestorContainer.parentElement! 
        : range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (range.intersectsNode(node)) {
        // Check if this text node is actually within the selected range
        const nodeRange = document.createRange();
        nodeRange.selectNodeContents(node);
        if (
          range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0 &&
          range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0
        ) {
          textNodes.push(node);
        }
      }
    }
    
    return textNodes;
  }, []);

  // Check current formatting state - Google Docs style
  const updateActiveFormatting = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setActiveHeading(null);
      setActiveTextSize(DEFAULT_TEXT_SIZE);
      setTextSizeInput(String(DEFAULT_TEXT_SIZE));
      return;
    }
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
    
    // Check heading
    const h1 = element?.closest('h1');
    const h2 = element?.closest('h2');
    const h3 = element?.closest('h3');
    
    if (h1) setActiveHeading('h1');
    else if (h2) setActiveHeading('h2');
    else if (h3) setActiveHeading('h3');
    else setActiveHeading(null);
    
    // For collapsed selection (cursor only), get size at cursor position
    if (range.collapsed) {
      const size = getFontSizeFromElement(element);
      setActiveTextSize(size);
      setTextSizeInput(String(size));
      return;
    }
    
    // For actual selection, collect all font sizes in the selection
    const textNodes = getTextNodesInRange(range);
    
    if (textNodes.length === 0) {
      // No text nodes, use element's size
      const size = getFontSizeFromElement(element);
      setActiveTextSize(size);
      setTextSizeInput(String(size));
      return;
    }
    
    // Collect unique font sizes
    const sizes = new Set<number>();
    textNodes.forEach(node => {
      const parentElement = node.parentElement;
      if (parentElement) {
        const size = getFontSizeFromElement(parentElement);
        sizes.add(size);
      }
    });
    
    const sizesArray = Array.from(sizes);
    
    if (sizesArray.length === 1) {
      // Single size - show it
      setActiveTextSize(sizesArray[0]);
      setTextSizeInput(String(sizesArray[0]));
    } else if (sizesArray.length > 1) {
      // Multiple sizes - show "-" (use -1 as indicator)
      setActiveTextSize(-1);
      setTextSizeInput("-");
    } else {
      // Fallback
      setActiveTextSize(DEFAULT_TEXT_SIZE);
      setTextSizeInput(String(DEFAULT_TEXT_SIZE));
    }
  }, [getFontSizeFromElement, getTextNodesInRange]);

  // Handle mouse move over table to show row/column controls
  const handleEditorMouseMove = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const cell = target.closest('td, th') as HTMLTableCellElement;
    const table = target.closest('table') as HTMLTableElement;
    
    if (cell && table && editorRef.current) {
      const editorRect = editorRef.current.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      const row = cell.parentElement as HTMLTableRowElement;
      
      selectedTableRef.current = table;
      setShowTableControls(true);
      
      const rowIndex = row.rowIndex;
      const colIndex = cell.cellIndex;
      
      setHoveredRowIndex(rowIndex);
      setHoveredColIndex(colIndex);
      
      setRowControlPos({
        top: cellRect.top - editorRect.top,
        left: tableRect.left - editorRect.left - 28,
        height: cellRect.height
      });
      
      setColControlPos({
        top: tableRect.top - editorRect.top - 28,
        left: cellRect.left - editorRect.left,
        width: cellRect.width
      });
    }
  }, []);

  const handleEditorMouseLeave = useCallback(() => {
    if (isResizing) return;
    setTimeout(() => {
      setShowTableControls(false);
      setHoveredRowIndex(null);
      setHoveredColIndex(null);
    }, 200);
  }, [isResizing]);

  // Column resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, colIndex: number, table: HTMLTableElement) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeColIndex(colIndex);
    setResizeStartX(e.clientX);
    resizeTableRef.current = table;
    
    const firstRow = table.querySelector('tr');
    if (firstRow) {
      const cell = firstRow.cells[colIndex];
      if (cell) {
        setResizeStartWidth(cell.offsetWidth);
      }
    }
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeTableRef.current || resizeColIndex === null) return;
      
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(60, resizeStartWidth + diff);
      
      const rows = resizeTableRef.current.querySelectorAll('tr');
      rows.forEach(row => {
        const cell = row.cells[resizeColIndex];
        if (cell) {
          cell.style.width = `${newWidth}px`;
          cell.style.minWidth = `${newWidth}px`;
        }
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeColIndex(null);
      resizeTableRef.current = null;
      triggerUpdate();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeColIndex, resizeStartX, resizeStartWidth, triggerUpdate]);

  // Image resize handlers
  useEffect(() => {
    if (!isResizingImage) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingImageRef.current) return;
      
      const diff = e.clientX - resizeImageStartX;
      const newWidth = Math.max(100, resizeImageStartWidth + diff);
      
      resizingImageRef.current.style.width = `${newWidth}px`;
      resizingImageRef.current.style.height = 'auto';
    };

    const handleMouseUp = () => {
      setIsResizingImage(false);
      resizingImageRef.current = null;
      triggerUpdate();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingImage, resizeImageStartX, resizeImageStartWidth, triggerUpdate]);

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const table = target.closest('table') as HTMLTableElement;
    const img = target.closest('img') as HTMLImageElement;
    const link = target.closest('a') as HTMLAnchorElement;
    
    if (table) {
      selectedTableRef.current = table;
    }
    
    // Handle image selection
    if (img && !img.closest('.wiki-code-block')) {
      setSelectedImage(img);
      setImagePopoverOpen(true);
    } else {
      setSelectedImage(null);
      setImagePopoverOpen(false);
    }
    
    // Handle link selection
    if (link && !link.closest('.wiki-code-block') && !link.closest('.wiki-file-attachment')) {
      setHoveredLink(link);
      setLinkPopoverOpen(true);
      e.preventDefault();
    } else {
      setHoveredLink(null);
      setLinkPopoverOpen(false);
    }
    
    updateActiveFormatting();
  }, [updateActiveFormatting]);

  // Table manipulation functions
  const addRowAt = useCallback((e: React.MouseEvent, afterIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const table = selectedTableRef.current;
    if (!table) return;
    
    const allRows = table.querySelectorAll('tr');
    const targetRow = allRows[afterIndex];
    if (!targetRow) return;
    
    const newRow = document.createElement('tr');
    const cellCount = targetRow.cells.length;
    for (let i = 0; i < cellCount; i++) {
      const cell = document.createElement('td');
      cell.className = 'border border-border p-2';
      cell.innerHTML = '&nbsp;';
      newRow.appendChild(cell);
    }
    
    if (targetRow.nextSibling) {
      targetRow.parentNode?.insertBefore(newRow, targetRow.nextSibling);
    } else {
      targetRow.parentNode?.appendChild(newRow);
    }
    triggerUpdate();
  }, [triggerUpdate]);

  const deleteRowAt = useCallback((e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const table = selectedTableRef.current;
    if (!table) return;
    
    const allRows = table.querySelectorAll('tr');
    if (allRows.length <= 1) return;
    
    const targetRow = allRows[rowIndex];
    if (targetRow) {
      targetRow.remove();
      triggerUpdate();
      setHoveredRowIndex(null);
    }
  }, [triggerUpdate]);

  const addColumnAt = useCallback((e: React.MouseEvent, afterIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const table = selectedTableRef.current;
    if (!table) return;
    
    const allRows = table.querySelectorAll('tr');
    allRows.forEach((row) => {
      const cells = row.querySelectorAll('th, td');
      const isHeaderRow = cells[0]?.tagName === 'TH';
      
      const cell = document.createElement(isHeaderRow ? 'th' : 'td');
      cell.className = isHeaderRow 
        ? 'border border-border p-2 bg-muted text-left'
        : 'border border-border p-2';
      cell.innerHTML = '&nbsp;';
      
      const targetCell = cells[afterIndex];
      if (targetCell && targetCell.nextSibling) {
        row.insertBefore(cell, targetCell.nextSibling);
      } else {
        row.appendChild(cell);
      }
    });
    triggerUpdate();
  }, [triggerUpdate]);

  const deleteColumnAt = useCallback((e: React.MouseEvent, colIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const table = selectedTableRef.current;
    if (!table) return;
    
    const allRows = table.querySelectorAll('tr');
    const firstRow = allRows[0];
    if (firstRow && firstRow.cells.length <= 1) return;
    
    allRows.forEach((row) => {
      if (row.cells[colIndex]) {
        row.deleteCell(colIndex);
      }
    });
    triggerUpdate();
    setHoveredColIndex(null);
  }, [triggerUpdate]);

  const handleInput = useCallback(() => {
    triggerUpdate();
    updateActiveFormatting();
  }, [triggerUpdate, updateActiveFormatting]);

  const execCommand = useCallback((command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    triggerUpdate();
    updateActiveFormatting();
  }, [triggerUpdate, restoreSelection, updateActiveFormatting]);

  // Toggle heading - if already that heading, convert back to paragraph
  const toggleHeading = useCallback((tag: 'h1' | 'h2' | 'h3') => {
    restoreSelection();
    const selection = window.getSelection();
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
      const existingHeading = element?.closest(tag);
      
      if (existingHeading) {
        // Already in this heading, convert to paragraph
        const p = document.createElement('p');
        p.innerHTML = existingHeading.innerHTML;
        existingHeading.parentNode?.replaceChild(p, existingHeading);
        setActiveHeading(null);
      } else {
        // Check if in another heading
        const anyHeading = element?.closest('h1, h2, h3');
        if (anyHeading) {
          // Replace with new heading
          const newHeading = document.createElement(tag);
          newHeading.innerHTML = anyHeading.innerHTML;
          anyHeading.parentNode?.replaceChild(newHeading, anyHeading);
        } else {
          // Apply heading format
          document.execCommand('formatBlock', false, tag);
        }
        setActiveHeading(tag);
      }
    } else {
      document.execCommand('formatBlock', false, tag);
      setActiveHeading(tag);
    }
    
    triggerUpdate();
    editorRef.current?.focus();
  }, [triggerUpdate, restoreSelection]);

  // Apply text size in pixels
  const applyTextSize = useCallback((size: number) => {
    restoreSelection();
    const selection = window.getSelection();
    
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const contents = range.extractContents();
      
      // Remove existing font-size styles from selection
      const walker = document.createTreeWalker(contents, NodeFilter.SHOW_ELEMENT);
      while (walker.nextNode()) {
        const el = walker.currentNode as HTMLElement;
        el.style.fontSize = '';
      }
      
      // Wrap in span with font-size style
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      span.appendChild(contents);
      range.insertNode(span);
      
      // Select the inserted content
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    setActiveTextSize(size);
    setTextSizeInput(String(size));
    triggerUpdate();
    editorRef.current?.focus();
  }, [triggerUpdate, restoreSelection]);

  // Handle text size input change
  const handleTextSizeChange = useCallback((value: string) => {
    setTextSizeInput(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 8 && numValue <= 72) {
      applyTextSize(numValue);
    }
  }, [applyTextSize]);

  const formatBlock = useCallback((tag: string) => {
    restoreSelection();
    const selection = window.getSelection();
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const parentElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
      
      if (parentElement?.closest(tag)) {
        return;
      }
    }
    
    const applyBlockStyles = (element: HTMLElement, blockTag: string) => {
      if (blockTag === 'blockquote') {
        element.style.backgroundColor = 'hsl(var(--muted))';
        element.style.padding = '1rem';
        element.style.borderRadius = '0.375rem';
        element.style.borderLeft = '4px solid hsl(var(--primary))';
        element.style.margin = '0.5rem 0';
        element.style.width = '100%';
        element.style.display = 'block';
        element.style.boxSizing = 'border-box';
      } else if (blockTag === 'pre') {
        element.style.backgroundColor = '#1e1e1e';
        element.style.color = '#d4d4d4';
        element.style.padding = '1rem';
        element.style.borderRadius = '0.5rem';
        element.style.fontFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
        element.style.fontSize = '0.875rem';
        element.style.lineHeight = '1.5';
        element.style.overflow = 'auto';
        element.style.margin = '0.5rem 0';
        element.style.width = '100%';
        element.style.display = 'block';
        element.style.boxSizing = 'border-box';
        element.style.whiteSpace = 'pre-wrap';
        element.style.wordBreak = 'break-word';
      }
    };
    
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const selectedContent = range.extractContents();
      
      const element = document.createElement(tag);
      element.appendChild(selectedContent);
      applyBlockStyles(element, tag);
      
      range.insertNode(element);
      
      const newRange = document.createRange();
      newRange.selectNodeContents(element);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      const range = selection?.getRangeAt(0);
      const isInsideEditor = range && editorRef.current?.contains(range.commonAncestorContainer);
      
      if (!isInsideEditor && editorRef.current) {
        editorRef.current.focus();
        const newRange = document.createRange();
        newRange.selectNodeContents(editorRef.current);
        newRange.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(newRange);
      }
      
      const element = document.createElement(tag);
      element.innerHTML = '<br>';
      applyBlockStyles(element, tag);
      
      const currentRange = selection?.getRangeAt(0);
      if (currentRange) {
        currentRange.insertNode(element);
        const newRange = document.createRange();
        newRange.setStart(element, 0);
        newRange.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(newRange);
      }
    }
    
    editorRef.current?.focus();
    triggerUpdate();
  }, [triggerUpdate, restoreSelection]);

  // Handle keyboard shortcuts and list behavior
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
        case 'k':
          e.preventDefault();
          saveSelection();
          setLinkDialogOpen(true);
          break;
        case 'z':
          // Allow undo
          break;
        case 'y':
          // Allow redo
          break;
      }
    }
    
    // Handle Enter in lists
    if (e.key === 'Enter' && !e.shiftKey) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
        const li = element?.closest('li');
        
        if (li) {
          const listItemText = li.textContent?.trim() || '';
          
          if (listItemText === '') {
            // Empty list item - exit list
            e.preventDefault();
            const list = li.closest('ul, ol');
            if (list) {
              // Check if this is a nested list
              const parentLi = list.parentElement?.closest('li');
              
              if (parentLi) {
                // Nested list - move to parent level
                const parentList = parentLi.closest('ul, ol');
                if (parentList) {
                  const newLi = document.createElement('li');
                  newLi.innerHTML = '<br>';
                  
                  // Insert after parent li
                  if (parentLi.nextSibling) {
                    parentList.insertBefore(newLi, parentLi.nextSibling);
                  } else {
                    parentList.appendChild(newLi);
                  }
                  
                  li.remove();
                  if (list.children.length === 0) {
                    list.remove();
                  }
                  
                  const newRange = document.createRange();
                  newRange.setStart(newLi, 0);
                  newRange.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(newRange);
                }
              } else {
                // Top-level list - exit to paragraph
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                list.parentNode?.insertBefore(p, list.nextSibling);
                li.remove();
                
                if (list.children.length === 0) {
                  list.remove();
                }
                
                const newRange = document.createRange();
                newRange.setStart(p, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
              triggerUpdate();
            }
          }
        }
      }
    }
    
    // Handle Tab for list indentation
    if (e.key === 'Tab') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
        const li = element?.closest('li');
        
        if (li) {
          e.preventDefault();
          const list = li.closest('ul, ol');
          
          if (e.shiftKey) {
            // Outdent - move to parent list level
            const parentLi = list?.parentElement?.closest('li');
            if (parentLi && list) {
              const parentList = parentLi.closest('ul, ol');
              if (parentList) {
                // Move current li to parent list after parent li
                if (parentLi.nextSibling) {
                  parentList.insertBefore(li, parentLi.nextSibling);
                } else {
                  parentList.appendChild(li);
                }
                
                // Clean up empty lists
                if (list.children.length === 0) {
                  list.remove();
                }
                
                // Restore cursor position
                const newRange = document.createRange();
                newRange.selectNodeContents(li);
                newRange.collapse(false);
                selection.removeAllRanges();
                selection.addRange(newRange);
                
                triggerUpdate();
              }
            }
          } else {
            // Indent - nest under previous sibling
            const prevLi = li.previousElementSibling as HTMLLIElement;
            if (prevLi && list) {
              const listType = list.tagName.toLowerCase();
              let nestedList = prevLi.querySelector(`:scope > ${listType}`) as HTMLElement;
              
              if (!nestedList) {
                nestedList = document.createElement(listType);
                nestedList.className = list.className;
                prevLi.appendChild(nestedList);
              }
              
              nestedList.appendChild(li);
              
              // Restore cursor position
              const newRange = document.createRange();
              newRange.selectNodeContents(li);
              newRange.collapse(false);
              selection.removeAllRanges();
              selection.addRange(newRange);
              
              triggerUpdate();
            }
          }
        }
      }
    }
  }, [execCommand, triggerUpdate, saveSelection]);

  const isCommandActive = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  // Insert a styled code block with header and language dropdown
  const handleInsertCodeBlock = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    
    restoreSelection();
    
    let selection = window.getSelection();
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const parentElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
      
      if (parentElement?.closest('.wiki-code-block')) {
        return;
      }
    }
    
    let selectedText = "";
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      selectedText = selection.toString();
      selection.getRangeAt(0).deleteContents();
    }
    
    const languages = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C', 'C++', 'C#',
      'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'HTML', 'CSS', 'SQL',
      'Bash', 'Shell', 'JSON', 'YAML', 'XML', 'Markdown', 'GraphQL', 'Plain text'
    ];
    
    const defaultCode = `function myFunction() {
  let x = 10;
  console.log(x);
}

myFunction();`;
    
    const codeBlockWrapper = document.createElement('div');
    codeBlockWrapper.className = 'wiki-code-block';
    codeBlockWrapper.setAttribute('data-language', 'JavaScript');
    codeBlockWrapper.style.borderRadius = '0.5rem';
    codeBlockWrapper.style.overflow = 'hidden';
    codeBlockWrapper.style.margin = '0.5rem 0';
    codeBlockWrapper.style.width = '100%';
    codeBlockWrapper.style.position = 'relative';
    
    const header = document.createElement('div');
    header.className = 'wiki-code-header';
    header.contentEditable = 'false';
    header.style.backgroundColor = '#1e1e1e';
    header.style.padding = '0.5rem 1rem';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.borderBottom = '1px solid #333';
    
    const langSelect = document.createElement('select');
    langSelect.className = 'wiki-code-lang-select';
    langSelect.style.backgroundColor = 'transparent';
    langSelect.style.color = '#9cdcfe';
    langSelect.style.fontSize = '0.875rem';
    langSelect.style.fontWeight = '500';
    langSelect.style.border = 'none';
    langSelect.style.outline = 'none';
    langSelect.style.cursor = 'pointer';
    langSelect.style.padding = '0.25rem 0';
    
    languages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = lang.toLowerCase();
      option.style.backgroundColor = '#252526';
      option.style.color = '#cccccc';
      langSelect.appendChild(option);
    });
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'wiki-code-copy';
    copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
    copyBtn.style.backgroundColor = 'transparent';
    copyBtn.style.border = 'none';
    copyBtn.style.color = '#808080';
    copyBtn.style.cursor = 'pointer';
    copyBtn.style.padding = '0.25rem';
    copyBtn.style.borderRadius = '0.25rem';
    copyBtn.style.display = 'flex';
    copyBtn.style.alignItems = 'center';
    copyBtn.style.justifyContent = 'center';
    copyBtn.title = 'Copy code';
    copyBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const rawCode = codeBlockWrapper.querySelector('.wiki-code-content')?.getAttribute('data-raw-code') || 
                      codeBlockWrapper.querySelector('.wiki-code-content')?.textContent || '';
      navigator.clipboard.writeText(rawCode).then(() => {
        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        toast.success("Code copied to clipboard");
        setTimeout(() => {
          copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
        }, 2000);
      });
    };
    
    header.appendChild(langSelect);
    header.appendChild(copyBtn);
    
    const editorContainer = document.createElement('div');
    editorContainer.className = 'wiki-code-editor-container';
    editorContainer.style.position = 'relative';
    editorContainer.style.backgroundColor = '#1e1e1e';
    editorContainer.style.minHeight = '120px';
    
    const codeDisplay = document.createElement('pre');
    codeDisplay.className = 'wiki-code-display';
    codeDisplay.style.position = 'absolute';
    codeDisplay.style.top = '0';
    codeDisplay.style.left = '0';
    codeDisplay.style.right = '0';
    codeDisplay.style.bottom = '0';
    codeDisplay.style.padding = '1rem';
    codeDisplay.style.margin = '0';
    codeDisplay.style.fontFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
    codeDisplay.style.fontSize = '0.875rem';
    codeDisplay.style.lineHeight = '1.5';
    codeDisplay.style.overflow = 'auto';
    codeDisplay.style.whiteSpace = 'pre';
    codeDisplay.style.pointerEvents = 'none';
    codeDisplay.style.color = '#d4d4d4';
    
    const codeInput = document.createElement('textarea');
    codeInput.className = 'wiki-code-content';
    codeInput.style.position = 'relative';
    codeInput.style.width = '100%';
    codeInput.style.minHeight = '120px';
    codeInput.style.height = 'auto';
    codeInput.style.padding = '1rem';
    codeInput.style.margin = '0';
    codeInput.style.fontFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
    codeInput.style.fontSize = '0.875rem';
    codeInput.style.lineHeight = '1.5';
    codeInput.style.backgroundColor = 'transparent';
    codeInput.style.color = 'transparent';
    codeInput.style.caretColor = 'white';
    codeInput.style.border = 'none';
    codeInput.style.outline = 'none';
    codeInput.style.resize = 'vertical';
    codeInput.style.whiteSpace = 'pre';
    codeInput.style.overflow = 'auto';
    codeInput.style.boxSizing = 'border-box';
    codeInput.spellcheck = false;
    codeInput.value = selectedText || defaultCode;
    codeInput.setAttribute('data-raw-code', selectedText || defaultCode);
    
    let userResized = false;
    let lastHeight = 0;
    
    const autoResize = () => {
      if (userResized) {
        editorContainer.style.height = codeInput.style.height;
        return;
      }
      codeInput.style.height = 'auto';
      const scrollHeight = codeInput.scrollHeight;
      const newHeight = Math.max(120, scrollHeight);
      codeInput.style.height = newHeight + 'px';
      editorContainer.style.height = newHeight + 'px';
    };
    
    codeInput.addEventListener('mousedown', () => {
      lastHeight = codeInput.offsetHeight;
    });
    
    codeInput.addEventListener('mouseup', () => {
      if (codeInput.offsetHeight !== lastHeight && lastHeight !== 0) {
        userResized = true;
        editorContainer.style.height = codeInput.offsetHeight + 'px';
      }
    });
    
    codeInput.onscroll = () => {
      codeDisplay.scrollTop = codeInput.scrollTop;
      codeDisplay.scrollLeft = codeInput.scrollLeft;
    };
    
    codeInput.oninput = () => {
      const code = codeInput.value;
      codeInput.setAttribute('data-raw-code', code);
      const lang = codeBlockWrapper.getAttribute('data-language') || 'JavaScript';
      const prismLang = LANGUAGE_MAP[lang.toLowerCase()] || 'plaintext';
      const grammar = Prism.languages[prismLang];
      if (grammar) {
        codeDisplay.innerHTML = Prism.highlight(code, grammar, prismLang);
      } else {
        codeDisplay.textContent = code;
      }
      autoResize();
      triggerUpdate();
    };
    
    codeInput.onkeydown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = codeInput.selectionStart;
        const end = codeInput.selectionEnd;
        codeInput.value = codeInput.value.substring(0, start) + '  ' + codeInput.value.substring(end);
        codeInput.selectionStart = codeInput.selectionEnd = start + 2;
        codeInput.dispatchEvent(new Event('input'));
      }
    };
    
    langSelect.onchange = () => {
      codeBlockWrapper.setAttribute('data-language', langSelect.value);
      const code = codeInput.value;
      const prismLang = LANGUAGE_MAP[langSelect.value.toLowerCase()] || 'plaintext';
      const grammar = Prism.languages[prismLang];
      if (grammar) {
        codeDisplay.innerHTML = Prism.highlight(code, grammar, prismLang);
      } else {
        codeDisplay.textContent = code;
      }
      triggerUpdate();
    };
    
    editorContainer.appendChild(codeDisplay);
    editorContainer.appendChild(codeInput);
    
    codeBlockWrapper.appendChild(header);
    codeBlockWrapper.appendChild(editorContainer);
    
    const initialLang = LANGUAGE_MAP['javascript'] || 'javascript';
    const initialGrammar = Prism.languages[initialLang];
    if (initialGrammar) {
      codeDisplay.innerHTML = Prism.highlight(codeInput.value, initialGrammar, initialLang);
    }
    
    selection = window.getSelection();
    let insertRange: Range | null = null;
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        insertRange = range;
      }
    }
    
    if (!insertRange && editorRef.current) {
      insertRange = document.createRange();
      insertRange.selectNodeContents(editorRef.current);
      insertRange.collapse(false);
    }
    
    if (insertRange && editorRef.current) {
      insertRange.insertNode(codeBlockWrapper);
      
      const spacer = document.createElement('p');
      spacer.innerHTML = '<br>';
      codeBlockWrapper.parentNode?.insertBefore(spacer, codeBlockWrapper.nextSibling);
      
      setTimeout(() => {
        codeInput.focus();
        codeInput.style.height = 'auto';
        const scrollHeight = codeInput.scrollHeight;
        const newHeight = Math.max(120, scrollHeight);
        codeInput.style.height = newHeight + 'px';
        editorContainer.style.height = newHeight + 'px';
      }, 0);
    } else if (editorRef.current) {
      editorRef.current.appendChild(codeBlockWrapper);
      const spacer = document.createElement('p');
      spacer.innerHTML = '<br>';
      editorRef.current.appendChild(spacer);
      setTimeout(() => {
        codeInput.focus();
        codeInput.style.height = 'auto';
        const scrollHeight = codeInput.scrollHeight;
        const newHeight = Math.max(120, scrollHeight);
        codeInput.style.height = newHeight + 'px';
        editorContainer.style.height = newHeight + 'px';
      }, 0);
    }
    
    triggerUpdate();
  }, [triggerUpdate, restoreSelection]);

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !organizationId) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${organizationId}/${Date.now()}-${safeName}`;
        
        const { error } = await supabase.storage
          .from("wiki-attachments")
          .upload(path, file);

        if (error) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("wiki-attachments")
          .getPublicUrl(path);

        // Insert resizable image with wrapper
        const imageHtml = `
          <figure class="wiki-image-wrapper my-4" data-align="left" contenteditable="false">
            <img src="${urlData.publicUrl}" alt="${file.name}" class="rounded-lg max-w-full" style="width: 400px; height: auto;" />
          </figure>
        `;
        execCommand('insertHTML', imageHtml);
      }
      toast.success("Image uploaded successfully");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  // Handle file attachment upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !organizationId) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${organizationId}/${Date.now()}-${safeName}`;
        
        const { error } = await supabase.storage
          .from("wiki-attachments")
          .upload(path, file);

        if (error) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("wiki-attachments")
          .getPublicUrl(path);

        // Insert file attachment block
        const fileIcon = getFileIcon(file.name);
        const fileSize = formatFileSize(file.size);
        const attachmentHtml = `
          <div class="wiki-file-attachment my-3 p-3 border border-border rounded-lg bg-muted/30 flex items-center gap-3 max-w-md cursor-pointer hover:bg-muted/50 transition-colors" 
               contenteditable="false"
               data-file-name="${file.name}"
               data-file-size="${file.size}"
               data-file-url="${urlData.publicUrl}"
               onclick="window.open('${urlData.publicUrl}', '_blank')">
            <span class="text-2xl">${fileIcon}</span>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">${file.name}</div>
              <div class="text-xs text-muted-foreground">${fileSize}</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
          </div>
        `;
        execCommand('insertHTML', attachmentHtml);
      }
      toast.success("File attached successfully");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to attach file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle link insertion/editing
  const handleInsertLink = () => {
    if (linkUrl) {
      const text = linkText || linkUrl;
      if (editingLink) {
        // Update existing link
        editingLink.href = linkUrl;
        editingLink.textContent = text;
        setEditingLink(null);
      } else {
        execCommand('insertHTML', `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${text}</a>`);
      }
    }
    setLinkDialogOpen(false);
    setLinkText("");
    setLinkUrl("");
    setEditingLink(null);
  };

  // Edit existing link
  const handleEditLink = () => {
    if (hoveredLink) {
      setEditingLink(hoveredLink);
      setLinkText(hoveredLink.textContent || "");
      setLinkUrl(hoveredLink.href || "");
      setLinkPopoverOpen(false);
      setLinkDialogOpen(true);
    }
  };

  // Remove link
  const handleRemoveLink = () => {
    if (hoveredLink) {
      const text = document.createTextNode(hoveredLink.textContent || "");
      hoveredLink.parentNode?.replaceChild(text, hoveredLink);
      setLinkPopoverOpen(false);
      setHoveredLink(null);
      triggerUpdate();
    }
  };

  // Handle image alignment
  const handleImageAlign = (align: 'left' | 'center' | 'right') => {
    if (selectedImage) {
      const wrapper = selectedImage.closest('.wiki-image-wrapper') as HTMLElement;
      if (wrapper) {
        wrapper.setAttribute('data-align', align);
        wrapper.style.textAlign = align;
        if (align === 'center') {
          wrapper.style.display = 'flex';
          wrapper.style.justifyContent = 'center';
        } else if (align === 'right') {
          wrapper.style.display = 'flex';
          wrapper.style.justifyContent = 'flex-end';
        } else {
          wrapper.style.display = 'block';
          wrapper.style.justifyContent = '';
        }
      }
      triggerUpdate();
    }
  };

  // Start image resize
  const handleImageResizeStart = (e: React.MouseEvent) => {
    if (selectedImage) {
      e.preventDefault();
      setIsResizingImage(true);
      setResizeImageStartX(e.clientX);
      setResizeImageStartWidth(selectedImage.offsetWidth);
      resizingImageRef.current = selectedImage;
    }
  };

  const handleInsertEmbed = () => {
    if (embedUrl) {
      let embedCode = "";
      
      if (embedUrl.includes("youtube.com") || embedUrl.includes("youtu.be")) {
        const videoId = embedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
        if (videoId) {
          embedCode = `
            <div class="wiki-embed my-4" contenteditable="false">
              <div class="relative w-full" style="padding-bottom: 56.25%;">
                <iframe 
                  src="https://www.youtube.com/embed/${videoId}" 
                  frameborder="0" 
                  allowfullscreen 
                  class="absolute top-0 left-0 w-full h-full rounded-lg"
                ></iframe>
              </div>
            </div>
          `;
        }
      } else if (embedUrl.includes("vimeo.com")) {
        const videoId = embedUrl.match(/vimeo\.com\/(\d+)/)?.[1];
        if (videoId) {
          embedCode = `
            <div class="wiki-embed my-4" contenteditable="false">
              <div class="relative w-full" style="padding-bottom: 56.25%;">
                <iframe 
                  src="https://player.vimeo.com/video/${videoId}" 
                  frameborder="0" 
                  allowfullscreen 
                  class="absolute top-0 left-0 w-full h-full rounded-lg"
                ></iframe>
              </div>
            </div>
          `;
        }
      } else if (embedUrl.includes("loom.com")) {
        const videoId = embedUrl.match(/loom\.com\/share\/([^?]+)/)?.[1];
        if (videoId) {
          embedCode = `
            <div class="wiki-embed my-4" contenteditable="false">
              <div class="relative w-full" style="padding-bottom: 56.25%;">
                <iframe 
                  src="https://www.loom.com/embed/${videoId}" 
                  frameborder="0" 
                  allowfullscreen 
                  class="absolute top-0 left-0 w-full h-full rounded-lg"
                ></iframe>
              </div>
            </div>
          `;
        }
      } else {
        // Generic link preview card
        embedCode = `
          <div class="wiki-link-preview my-4 p-4 border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors" contenteditable="false">
            <a href="${embedUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 text-foreground no-underline">
              <div class="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">${embedUrl}</div>
                <div class="text-xs text-muted-foreground">Click to open link</div>
              </div>
            </a>
          </div>
        `;
      }

      if (embedCode) {
        execCommand('insertHTML', embedCode);
      }
    }
    setEmbedDialogOpen(false);
    setEmbedUrl("");
  };

  const handleInsertTable = () => {
    const tableHtml = `
      <table class="w-full border-collapse my-4">
        <thead>
          <tr>
            <th class="border border-border p-2 bg-muted text-left">Column 1</th>
            <th class="border border-border p-2 bg-muted text-left">Column 2</th>
            <th class="border border-border p-2 bg-muted text-left">Column 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-border p-2">Cell 1</td>
            <td class="border border-border p-2">Cell 2</td>
            <td class="border border-border p-2">Cell 3</td>
          </tr>
          <tr>
            <td class="border border-border p-2">Cell 4</td>
            <td class="border border-border p-2">Cell 5</td>
            <td class="border border-border p-2">Cell 6</td>
          </tr>
        </tbody>
      </table>
    `;
    execCommand('insertHTML', tableHtml);
  };

  const handleInsertHr = () => {
    execCommand('insertHTML', '<hr class="my-6 border-border" />');
  };

  return (
    <div className={cn("border rounded-lg bg-background", className)}>
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 p-2 border-b bg-background/95 backdrop-blur-sm shadow-sm rounded-t-lg">
        {/* Text formatting */}
        <Button
          type="button"
          variant={isCommandActive('bold') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={isCommandActive('italic') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={isCommandActive('underline') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand('underline')}
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        {/* Headings */}
        <Button
          type="button"
          variant={activeHeading === 'h1' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => toggleHeading('h1')}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={activeHeading === 'h2' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => toggleHeading('h2')}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={activeHeading === 'h3' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => toggleHeading('h3')}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        
        {/* Text Size Input */}
        <div className="flex items-center gap-1">
          <Type className="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={textSizeInput}
            onChange={(e) => {
              const val = e.target.value;
              // Allow only numbers or empty string while typing
              if (val === '' || val === '-' || /^\d+$/.test(val)) {
                handleTextSizeChange(val);
              }
            }}
            onBlur={() => {
              // Reset to default if invalid on blur
              if (textSizeInput === '' || textSizeInput === '-') {
                setTextSizeInput(String(activeTextSize === -1 ? DEFAULT_TEXT_SIZE : activeTextSize));
              }
            }}
            onMouseDown={(e) => { e.stopPropagation(); saveSelection(); }}
            className="h-7 w-12 text-xs text-center px-1"
            title="Font size (8-72px)"
          />
        </div>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        {/* Lists */}
        <Button
          type="button"
          variant={isCommandActive('insertUnorderedList') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand('insertUnorderedList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={isCommandActive('insertOrderedList') ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand('insertOrderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        {/* Block elements */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => formatBlock('blockquote')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={handleInsertCodeBlock}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleInsertHr}
          title="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleInsertTable}
          title="Insert Table"
        >
          <Table className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        {/* Links and media */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => setLinkDialogOpen(true)}
          title="Insert Link (Ctrl+K)"
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => imageInputRef.current?.click()}
          disabled={isUploading || !organizationId}
          title="Upload Image"
        >
          <Image className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || !organizationId}
          title="Attach File"
        >
          <FileText className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => setEmbedDialogOpen(true)}
          title="Embed Video/Content"
        >
          <Upload className="h-4 w-4 mr-1" />
          Embed
        </Button>
        
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Editor Container with Table Controls */}
      <div 
        className="relative"
        onMouseMove={handleEditorMouseMove}
        onMouseLeave={handleEditorMouseLeave}
      >
        {/* Row Controls */}
        {showTableControls && hoveredRowIndex !== null && (
          <div 
            className="absolute z-20 flex items-center gap-0.5"
            style={{ 
              top: rowControlPos.top,
              left: Math.max(4, rowControlPos.left),
              height: rowControlPos.height
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => addRowAt(e, hoveredRowIndex)}
              title="Add row below"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => deleteRowAt(e, hoveredRowIndex)}
              title="Delete this row"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Column Controls */}
        {showTableControls && hoveredColIndex !== null && selectedTableRef.current && (
          <div 
            className="absolute z-20 flex items-center justify-center gap-0.5"
            style={{ 
              top: Math.max(4, colControlPos.top),
              left: colControlPos.left,
              width: colControlPos.width
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => addColumnAt(e, hoveredColIndex)}
              title="Add column right"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => deleteColumnAt(e, hoveredColIndex)}
              title="Delete this column"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Column Resize Handle */}
        {showTableControls && hoveredColIndex !== null && selectedTableRef.current && !isResizing && (
          <div
            className="absolute z-30 w-1 bg-primary/50 hover:bg-primary cursor-col-resize transition-colors"
            style={{
              top: colControlPos.top + 28,
              left: colControlPos.left + colControlPos.width - 2,
              height: selectedTableRef.current.offsetHeight,
            }}
            onMouseDown={(e) => {
              if (selectedTableRef.current && hoveredColIndex !== null) {
                handleResizeStart(e, hoveredColIndex, selectedTableRef.current);
              }
            }}
            title="Drag to resize column"
          />
        )}

        {/* WYSIWYG Editor */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onClick={handleEditorClick}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSelect={updateActiveFormatting}
          data-placeholder={placeholder}
          className={cn(
            "wiki-editor outline-none p-6 pl-16 text-[14px]",
            "prose prose-sm sm:prose max-w-none",
            "prose-headings:font-bold prose-headings:text-foreground",
            "[&_h1]:text-[26px] [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:font-bold [&_h1]:leading-tight",
            "[&_h2]:text-[22px] [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:font-bold [&_h2]:leading-tight",
            "[&_h3]:text-[18px] [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:font-bold [&_h3]:leading-tight",
            "prose-p:text-foreground prose-p:leading-relaxed prose-p:my-2 [&_p]:text-[14px]",
            "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
            "prose-strong:text-foreground prose-strong:font-semibold",
            "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 [&_li]:text-[14px]",
            "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
            "[&_ul_ul]:list-circle [&_ul_ul_ul]:list-square",
            "prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground",
            "prose-pre:bg-muted prose-pre:rounded-lg prose-pre:p-4",
            "prose-code:text-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
            "prose-img:rounded-lg prose-img:max-w-full",
            "prose-hr:border-border",
            "prose-table:border-collapse prose-table:mt-8 prose-th:border prose-th:border-border prose-th:p-2 prose-th:bg-muted",
            "prose-td:border prose-td:border-border prose-td:p-2",
            "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground [&:empty]:before:pointer-events-none",
            "[&_table]:relative [&_table]:ml-4 [&_th]:min-w-[80px] [&_td]:min-w-[80px]",
            "[&_.wiki-image-wrapper]:relative [&_.wiki-image-wrapper_img]:cursor-pointer",
            "[&_.wiki-file-attachment]:cursor-pointer"
          )}
          style={{ minHeight }}
        />
      </div>

      {/* Image Toolbar Popover */}
      {selectedImage && imagePopoverOpen && (
        <Popover open={imagePopoverOpen} onOpenChange={setImagePopoverOpen}>
          <PopoverTrigger asChild>
            <div 
              className="absolute pointer-events-none" 
              style={{ 
                top: selectedImage.getBoundingClientRect().top - (editorRef.current?.getBoundingClientRect().top || 0) - 40,
                left: selectedImage.getBoundingClientRect().left - (editorRef.current?.getBoundingClientRect().left || 0) 
              }}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 bg-background border shadow-lg z-50" align="start">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleImageAlign('left')}
                title="Align Left"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleImageAlign('center')}
                title="Align Center"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleImageAlign('right')}
                title="Align Right"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs cursor-ew-resize"
                onMouseDown={handleImageResizeStart}
                title="Drag to resize"
              >
                Resize
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => {
                  const wrapper = selectedImage.closest('.wiki-image-wrapper');
                  if (wrapper) wrapper.remove();
                  else selectedImage.remove();
                  setSelectedImage(null);
                  setImagePopoverOpen(false);
                  triggerUpdate();
                }}
                title="Delete Image"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Link Edit Popover */}
      {hoveredLink && linkPopoverOpen && (
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <div className="absolute pointer-events-none" />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 bg-background border shadow-lg z-50" align="start">
            <div className="flex items-center gap-2">
              <a 
                href={hoveredLink.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate max-w-[200px]"
              >
                {hoveredLink.href}
              </a>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => window.open(hoveredLink.href, '_blank')}
                  title="Open Link"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleEditLink}
                  title="Edit Link"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={handleRemoveLink}
                  title="Remove Link"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Upload indicator */}
      {isUploading && (
        <div className="p-2 border-t bg-muted/30 text-sm text-muted-foreground flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          Uploading...
        </div>
      )}

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={(open) => {
        setLinkDialogOpen(open);
        if (!open) {
          setEditingLink(null);
          setLinkText("");
          setLinkUrl("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLink ? 'Edit Link' : 'Insert Link'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-text">Link Text</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Display text (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInsertLink} disabled={!linkUrl}>
                {editingLink ? 'Update' : 'Insert'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Dialog */}
      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Embed Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Paste a URL from YouTube, Vimeo, Loom, or any link to embed.
            </p>
            <div className="space-y-2">
              <Label htmlFor="embed-url">URL</Label>
              <Input
                id="embed-url"
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmbedDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInsertEmbed} disabled={!embedUrl}>
                Embed
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VS Code-like syntax highlighting styles */}
      <style>{`
        .wiki-code-display {
          color: #d4d4d4;
        }
        .wiki-code-display .token.comment,
        .wiki-code-display .token.prolog,
        .wiki-code-display .token.doctype,
        .wiki-code-display .token.cdata {
          color: #6a9955;
        }
        .wiki-code-display .token.punctuation {
          color: #d4d4d4;
        }
        .wiki-code-display .token.property,
        .wiki-code-display .token.tag,
        .wiki-code-display .token.boolean,
        .wiki-code-display .token.number,
        .wiki-code-display .token.constant,
        .wiki-code-display .token.symbol,
        .wiki-code-display .token.deleted {
          color: #b5cea8;
        }
        .wiki-code-display .token.selector,
        .wiki-code-display .token.attr-name,
        .wiki-code-display .token.string,
        .wiki-code-display .token.char,
        .wiki-code-display .token.builtin,
        .wiki-code-display .token.inserted {
          color: #ce9178;
        }
        .wiki-code-display .token.operator,
        .wiki-code-display .token.entity,
        .wiki-code-display .token.url,
        .language-css .wiki-code-display .token.string,
        .style .wiki-code-display .token.string {
          color: #d4d4d4;
        }
        .wiki-code-display .token.atrule,
        .wiki-code-display .token.attr-value,
        .wiki-code-display .token.keyword {
          color: #569cd6;
        }
        .wiki-code-display .token.function,
        .wiki-code-display .token.class-name {
          color: #dcdcaa;
        }
        .wiki-code-display .token.regex,
        .wiki-code-display .token.important,
        .wiki-code-display .token.variable {
          color: #d16969;
        }
        .wiki-code-content {
          scrollbar-width: thin;
          scrollbar-color: #444 #1e1e1e;
        }
        .wiki-code-content::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .wiki-code-content::-webkit-scrollbar-track {
          background: #1e1e1e;
        }
        .wiki-code-content::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 4px;
        }
        .wiki-image-wrapper {
          position: relative;
        }
        .wiki-image-wrapper img {
          transition: box-shadow 0.2s;
        }
        .wiki-image-wrapper img:hover {
          box-shadow: 0 0 0 2px hsl(var(--primary));
        }
      `}</style>
    </div>
  );
};
