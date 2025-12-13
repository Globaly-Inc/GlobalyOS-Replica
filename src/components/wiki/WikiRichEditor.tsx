import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Bold, Italic, Heading1, Heading2, Heading3, 
  List, ListOrdered, Link, Image, FileText, 
  Code, Quote, Minus, Table, Upload, Underline
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
import DOMPurify from "dompurify";

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
    'div', 'span', 'iframe'
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'width', 'height', 'frameborder', 'allowfullscreen'],
  ALLOW_DATA_ATTR: false,
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
  const [isUploading, setIsUploading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [embedUrl, setEmbedUrl] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Initialize content
  useEffect(() => {
    if (editorRef.current && !isFocused) {
      const sanitized = DOMPurify.sanitize(value, sanitizeConfig);
      if (editorRef.current.innerHTML !== sanitized) {
        editorRef.current.innerHTML = sanitized || '';
      }
    }
  }, [value, isFocused]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = DOMPurify.sanitize(editorRef.current.innerHTML, sanitizeConfig);
      onChange(html);
    }
  }, [onChange]);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const formatBlock = useCallback((tag: string) => {
    document.execCommand('formatBlock', false, tag);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
      }
    }
  }, [execCommand]);

  const isCommandActive = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !organizationId) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const isImage = file.type.startsWith("image/");
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

        if (isImage) {
          execCommand('insertHTML', `<img src="${urlData.publicUrl}" alt="${file.name}" class="max-w-full rounded-lg my-2" />`);
        } else {
          execCommand('insertHTML', `<a href="${urlData.publicUrl}" target="_blank" class="text-primary hover:underline">📎 ${file.name}</a>`);
        }
      }
      toast.success("Files uploaded successfully");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleInsertLink = () => {
    if (linkUrl) {
      const text = linkText || linkUrl;
      execCommand('insertHTML', `<a href="${linkUrl}" target="_blank" class="text-primary hover:underline">${text}</a>`);
    }
    setLinkDialogOpen(false);
    setLinkText("");
    setLinkUrl("");
  };

  const handleInsertEmbed = () => {
    if (embedUrl) {
      let embedCode = "";
      
      if (embedUrl.includes("youtube.com") || embedUrl.includes("youtu.be")) {
        const videoId = embedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
        if (videoId) {
          embedCode = `<div class="my-4"><iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen class="rounded-lg max-w-full"></iframe></div>`;
        }
      } else if (embedUrl.includes("vimeo.com")) {
        const videoId = embedUrl.match(/vimeo\.com\/(\d+)/)?.[1];
        if (videoId) {
          embedCode = `<div class="my-4"><iframe width="560" height="315" src="https://player.vimeo.com/video/${videoId}" frameborder="0" allowfullscreen class="rounded-lg max-w-full"></iframe></div>`;
        }
      } else if (embedUrl.includes("loom.com")) {
        const videoId = embedUrl.match(/loom\.com\/share\/([^?]+)/)?.[1];
        if (videoId) {
          embedCode = `<div class="my-4"><iframe width="560" height="315" src="https://www.loom.com/embed/${videoId}" frameborder="0" allowfullscreen class="rounded-lg max-w-full"></iframe></div>`;
        }
      } else {
        embedCode = `<div class="my-4"><iframe width="100%" height="400" src="${embedUrl}" frameborder="0" class="rounded-lg"></iframe></div>`;
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
    <div className={cn("border rounded-lg bg-background overflow-hidden", className)}>
      {/* Floating Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/50 backdrop-blur-sm">
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
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => formatBlock('h1')}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => formatBlock('h2')}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => formatBlock('h3')}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand('insertUnorderedList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
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
          onClick={() => formatBlock('pre')}
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
          onClick={() => setLinkDialogOpen(true)}
          title="Insert Link"
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => fileInputRef.current?.click()}
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
          title="Attach Document"
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
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* WYSIWYG Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
        className={cn(
          "wiki-editor outline-none p-6",
          "prose prose-sm sm:prose max-w-none",
          "prose-headings:font-semibold prose-headings:text-foreground",
          "prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6",
          "prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5",
          "prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4",
          "prose-p:text-foreground prose-p:leading-relaxed prose-p:my-2",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
          "prose-strong:text-foreground prose-strong:font-semibold",
          "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
          "prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground",
          "prose-pre:bg-muted prose-pre:rounded-lg prose-pre:p-4",
          "prose-code:text-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
          "prose-img:rounded-lg prose-img:max-w-full",
          "prose-hr:border-border",
          "prose-table:border-collapse prose-th:border prose-th:border-border prose-th:p-2 prose-th:bg-muted",
          "prose-td:border prose-td:border-border prose-td:p-2",
          "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground [&:empty]:before:pointer-events-none"
        )}
        style={{ minHeight }}
      />

      {/* Upload indicator */}
      {isUploading && (
        <div className="p-2 border-t bg-muted/30 text-sm text-muted-foreground flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          Uploading...
        </div>
      )}

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
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
                Insert
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
              Paste a URL from YouTube, Vimeo, Loom, or any embeddable content.
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
    </div>
  );
};
