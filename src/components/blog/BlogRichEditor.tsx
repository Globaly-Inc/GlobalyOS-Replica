import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Heading2, 
  Heading3,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Minus,
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Strikethrough,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { uploadBlogImage } from "@/services/useBlog";
import { toast } from "sonner";

// Configure DOMPurify with allowed tags
const sanitizeHtml = (html: string) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'p', 'br', 'div',
      'h2', 'h3', 'h4', 'blockquote', 'a', 'img', 'pre', 'code', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 's', 'strike',
      'figure', 'figcaption', 'iframe'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel',
      'width', 'height', 'frameborder', 'allowfullscreen', 'loading'
    ],
    KEEP_CONTENT: true,
  });
};

interface BlogRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const BlogRichEditor = ({
  value,
  onChange,
  placeholder = "Start writing your blog post...",
  className,
}: BlogRichEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showImagePopover, setShowImagePopover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync editor content when value prop changes externally
  useEffect(() => {
    if (editorRef.current) {
      const sanitizedValue = sanitizeHtml(value);
      if (editorRef.current.innerHTML !== sanitizedValue) {
        editorRef.current.innerHTML = sanitizedValue;
      }
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(sanitizeHtml(editorRef.current.innerHTML));
    }
  }, [onChange]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand("bold");
          break;
        case 'i':
          e.preventDefault();
          execCommand("italic");
          break;
        case 'u':
          e.preventDefault();
          execCommand("underline");
          break;
        case 's':
          e.preventDefault();
          // Save will be handled by parent
          break;
      }
    }

    // "/" command menu
    if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      // Could show command menu here
    }
  };

  const isCommandActive = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  const insertHeading = (level: 2 | 3 | 4) => {
    execCommand('formatBlock', `h${level}`);
  };

  const insertBlockquote = () => {
    execCommand('formatBlock', 'blockquote');
  };

  const insertLink = () => {
    if (!linkUrl) return;
    const text = linkText || linkUrl;
    const html = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    execCommand('insertHTML', html);
    setLinkUrl("");
    setLinkText("");
    setShowLinkPopover(false);
  };

  const insertImage = (url: string) => {
    const html = `<figure><img src="${url}" alt="" loading="lazy" style="max-width:100%;height:auto;border-radius:8px;" /><figcaption></figcaption></figure>`;
    execCommand('insertHTML', html);
    setImageUrl("");
    setShowImagePopover(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      const url = await uploadBlogImage(file);
      insertImage(url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const insertTable = () => {
    const html = `
      <table style="width:100%;border-collapse:collapse;margin:1rem 0;">
        <thead>
          <tr>
            <th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;">Header 1</th>
            <th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;">Header 2</th>
            <th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;">Header 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #ddd;padding:8px;">Cell 1</td>
            <td style="border:1px solid #ddd;padding:8px;">Cell 2</td>
            <td style="border:1px solid #ddd;padding:8px;">Cell 3</td>
          </tr>
          <tr>
            <td style="border:1px solid #ddd;padding:8px;">Cell 4</td>
            <td style="border:1px solid #ddd;padding:8px;">Cell 5</td>
            <td style="border:1px solid #ddd;padding:8px;">Cell 6</td>
          </tr>
        </tbody>
      </table>
    `;
    execCommand('insertHTML', html);
  };

  const insertCodeBlock = () => {
    const html = `<pre style="background:#1e1e1e;color:#d4d4d4;padding:1rem;border-radius:8px;overflow-x:auto;"><code>// Your code here</code></pre>`;
    execCommand('insertHTML', html);
  };

  const insertDivider = () => {
    execCommand('insertHTML', '<hr style="border:none;border-top:1px solid #ddd;margin:2rem 0;" />');
  };

  const insertEmbed = () => {
    const url = prompt('Enter embed URL (YouTube, Vimeo, etc.):');
    if (!url) return;

    let embedHtml = '';
    
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (youtubeMatch) {
      embedHtml = `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen style="border-radius:8px;"></iframe>`;
    }
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      embedHtml = `<iframe width="100%" height="400" src="https://player.vimeo.com/video/${vimeoMatch[1]}" frameborder="0" allowfullscreen style="border-radius:8px;"></iframe>`;
    }

    if (embedHtml) {
      execCommand('insertHTML', `<div style="margin:1rem 0;">${embedHtml}</div>`);
    } else {
      toast.error('Unsupported embed URL');
    }
  };

  const ToolbarButton = ({ 
    icon: Icon, 
    command, 
    title,
    active,
    onClick,
  }: { 
    icon: React.ElementType; 
    command?: string; 
    title: string;
    active?: boolean;
    onClick?: () => void;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 w-8 p-0",
        (active ?? (command && isCommandActive(command))) && "bg-muted"
      )}
      onClick={onClick ?? (() => command && execCommand(command))}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className={cn("border rounded-lg bg-background", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
        {/* Undo/Redo */}
        <ToolbarButton icon={Undo} command="undo" title="Undo (Ctrl+Z)" />
        <ToolbarButton icon={Redo} command="redo" title="Redo (Ctrl+Y)" />
        
        <div className="w-px h-5 bg-border mx-1" />

        {/* Text Formatting */}
        <ToolbarButton icon={Bold} command="bold" title="Bold (Ctrl+B)" />
        <ToolbarButton icon={Italic} command="italic" title="Italic (Ctrl+I)" />
        <ToolbarButton icon={Underline} command="underline" title="Underline (Ctrl+U)" />
        <ToolbarButton icon={Strikethrough} command="strikeThrough" title="Strikethrough" />

        <div className="w-px h-5 bg-border mx-1" />

        {/* Headings */}
        <ToolbarButton icon={Heading2} onClick={() => insertHeading(2)} title="Heading 2" />
        <ToolbarButton icon={Heading3} onClick={() => insertHeading(3)} title="Heading 3" />
        <ToolbarButton icon={Quote} onClick={insertBlockquote} title="Block Quote" />

        <div className="w-px h-5 bg-border mx-1" />

        {/* Lists */}
        <ToolbarButton icon={List} command="insertUnorderedList" title="Bullet List" />
        <ToolbarButton icon={ListOrdered} command="insertOrderedList" title="Numbered List" />

        <div className="w-px h-5 bg-border mx-1" />

        {/* Alignment */}
        <ToolbarButton icon={AlignLeft} command="justifyLeft" title="Align Left" />
        <ToolbarButton icon={AlignCenter} command="justifyCenter" title="Align Center" />
        <ToolbarButton icon={AlignRight} command="justifyRight" title="Align Right" />

        <div className="w-px h-5 bg-border mx-1" />

        {/* Insert Elements */}
        <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Insert Link">
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <Input
                placeholder="Link text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
              />
              <Input
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <Button size="sm" onClick={insertLink} className="w-full">
                Insert Link
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Insert Image">
              <ImageIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              Upload from Computer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowImagePopover(true)}>
              Insert from URL
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        <Popover open={showImagePopover} onOpenChange={setShowImagePopover}>
          <PopoverTrigger className="hidden" />
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <Input
                placeholder="Image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <Button size="sm" onClick={() => insertImage(imageUrl)} className="w-full">
                Insert Image
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <ToolbarButton icon={Table} onClick={insertTable} title="Insert Table" />
        <ToolbarButton icon={Code} onClick={insertCodeBlock} title="Insert Code Block" />
        <ToolbarButton icon={Minus} onClick={insertDivider} title="Insert Divider" />

        {/* More Inserts */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Insert More">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={insertEmbed}>
              Embed (YouTube, Vimeo)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              Upload Image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Editor */}
      <div className="relative min-h-[400px]">
        <div
          ref={editorRef}
          contentEditable
          className={cn(
            "p-4 outline-none prose prose-sm max-w-none min-h-[400px]",
            "prose-headings:font-semibold prose-h2:text-2xl prose-h3:text-xl",
            "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0",
            "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic",
            "prose-a:text-primary prose-a:underline",
            "prose-img:rounded-lg prose-img:max-w-full",
            "prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg",
            "prose-table:border-collapse prose-th:border prose-th:p-2 prose-td:border prose-td:p-2",
            "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
            "text-foreground dark:prose-invert"
          )}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder}
        />
        {!value && !isFocused && (
          <div
            className="absolute top-4 left-4 text-muted-foreground pointer-events-none"
            onClick={() => editorRef.current?.focus()}
          >
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
};
