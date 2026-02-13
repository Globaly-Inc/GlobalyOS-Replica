import { Download, FileText, FileCode, Printer } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isBlockNoteJson } from "./BlockNoteWikiEditor";

interface WikiExportMenuProps {
  pageTitle: string;
  pageContent: string | null;
  isMobile?: boolean;
}

export const WikiExportMenu = ({
  pageTitle,
  pageContent,
  isMobile = false,
}: WikiExportMenuProps) => {
  // Convert BlockNote JSON to plain text (fallback export)
  const blocksToPlainText = (jsonContent: string): string => {
    try {
      const blocks = JSON.parse(jsonContent);
      const extractText = (block: any): string => {
        let text = '';
        if (block.content) {
          if (Array.isArray(block.content)) {
            text += block.content
              .map((inline: any) => (typeof inline === 'string' ? inline : inline.text || ''))
              .join('');
          } else if (typeof block.content === 'string') {
            text += block.content;
          }
        }
        if (block.children && Array.isArray(block.children)) {
          text += '\n' + block.children.map(extractText).join('\n');
        }
        return text;
      };
      return blocks.map(extractText).join('\n');
    } catch {
      return jsonContent;
    }
  };

  // Convert BlockNote JSON to basic markdown
  const blocksToMarkdown = (jsonContent: string): string => {
    try {
      const blocks = JSON.parse(jsonContent);
      const convertBlock = (block: any): string => {
        const inlineToText = (content: any[]): string => {
          if (!Array.isArray(content)) return '';
          return content.map((inline: any) => {
            const t = typeof inline === 'string' ? inline : inline.text || '';
            if (inline.styles?.bold) return `**${t}**`;
            if (inline.styles?.italic) return `*${t}*`;
            if (inline.styles?.code) return `\`${t}\``;
            return t;
          }).join('');
        };
        const text = block.content ? inlineToText(Array.isArray(block.content) ? block.content : []) : '';
        switch (block.type) {
          case 'heading':
            return `${'#'.repeat(block.props?.level || 1)} ${text}`;
          case 'bulletListItem':
            return `- ${text}`;
          case 'numberedListItem':
            return `1. ${text}`;
          case 'checkListItem':
            return `- [${block.props?.checked ? 'x' : ' '}] ${text}`;
          case 'codeBlock':
            return `\`\`\`${block.props?.language || ''}\n${text}\n\`\`\``;
          case 'image':
            return `![${block.props?.caption || ''}](${block.props?.url || ''})`;
          case 'table':
            return '[Table]';
          default:
            return text;
        }
      };
      return `# ${pageTitle}\n\n` + blocks.map(convertBlock).filter(Boolean).join('\n\n');
    } catch {
      return jsonContent;
    }
  };

  // Convert HTML to plain text
  const htmlToText = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  // Convert HTML to Markdown (basic conversion)
  const htmlToMarkdown = (html: string): string => {
    let markdown = html;
    
    // Headers
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n");
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n");
    
    // Bold and italic
    markdown = markdown.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, "**$2**");
    markdown = markdown.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, "*$2*");
    markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/gi, "_$1_");
    
    // Links
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
    
    // Images
    markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");
    markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, "![]($1)");
    
    // Lists
    markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n") + "\n";
    });
    markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_, content) => {
      let index = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${index++}. $1\n`) + "\n";
    });
    
    // Blockquotes
    markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, "> $1\n\n");
    
    // Code blocks
    markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, "```\n$1\n```\n\n");
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
    
    // Horizontal rules
    markdown = markdown.replace(/<hr[^>]*\/?>/gi, "\n---\n\n");
    
    // Paragraphs and line breaks
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
    markdown = markdown.replace(/<br[^>]*\/?>/gi, "\n");
    markdown = markdown.replace(/<div[^>]*>(.*?)<\/div>/gi, "$1\n");
    
    // Clean up remaining tags
    markdown = markdown.replace(/<[^>]+>/g, "");
    
    // Clean up extra whitespace
    markdown = markdown.replace(/\n{3,}/g, "\n\n");
    markdown = markdown.trim();
    
    return `# ${pageTitle}\n\n${markdown}`;
  };

  // Export as Markdown
  const handleExportMarkdown = () => {
    if (!pageContent) {
      toast.error("No content to export");
      return;
    }
    const markdown = isBlockNoteJson(pageContent)
      ? blocksToMarkdown(pageContent)
      : htmlToMarkdown(pageContent);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    downloadFile(blob, `${pageTitle}.md`);
    toast.success("Exported as Markdown");
  };

  // Convert BlockNote JSON to HTML for export
  const blocksToHtml = (jsonContent: string): string => {
    try {
      const blocks = JSON.parse(jsonContent);
      const convertBlock = (block: any): string => {
        const inlineToHtml = (content: any[]): string => {
          if (!Array.isArray(content)) return '';
          return content.map((inline: any) => {
            let t = typeof inline === 'string' ? inline : inline.text || '';
            // Escape HTML
            t = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            if (inline.styles?.bold) t = `<strong>${t}</strong>`;
            if (inline.styles?.italic) t = `<em>${t}</em>`;
            if (inline.styles?.underline) t = `<u>${t}</u>`;
            if (inline.styles?.strikethrough) t = `<s>${t}</s>`;
            if (inline.styles?.code) t = `<code>${t}</code>`;
            if (inline.type === 'link' && inline.href) {
              t = `<a href="${inline.href}">${t}</a>`;
            }
            return t;
          }).join('');
        };
        const text = block.content ? inlineToHtml(Array.isArray(block.content) ? block.content : []) : '';
        const childrenHtml = block.children?.length
          ? block.children.map(convertBlock).join('\n')
          : '';
        switch (block.type) {
          case 'heading': {
            const lvl = block.props?.level || 1;
            return `<h${lvl}>${text}</h${lvl}>`;
          }
          case 'bulletListItem':
            return `<ul><li>${text}${childrenHtml ? '\n' + childrenHtml : ''}</li></ul>`;
          case 'numberedListItem':
            return `<ol><li>${text}${childrenHtml ? '\n' + childrenHtml : ''}</li></ol>`;
          case 'checkListItem':
            return `<ul><li>${block.props?.checked ? '☑' : '☐'} ${text}</li></ul>`;
          case 'codeBlock':
            return `<pre><code>${text}</code></pre>`;
          case 'image':
            return `<figure><img src="${block.props?.url || ''}" alt="${block.props?.caption || ''}" style="max-width:100%"/>${block.props?.caption ? `<figcaption>${block.props.caption}</figcaption>` : ''}</figure>`;
          case 'table': {
            if (!block.content?.rows) return '';
            const rows = block.content.rows.map((row: any, i: number) => {
              const tag = i === 0 ? 'th' : 'td';
              const cells = row.cells.map((cell: any) => `<${tag}>${Array.isArray(cell) ? cell.map((c: any) => c.text || '').join('') : ''}</${tag}>`).join('');
              return `<tr>${cells}</tr>`;
            }).join('');
            return `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">${rows}</table>`;
          }
          default:
            return text ? `<p>${text}</p>` : (childrenHtml || '');
        }
      };
      return blocks.map(convertBlock).filter(Boolean).join('\n');
    } catch {
      return `<pre>${jsonContent}</pre>`;
    }
  };

  // Export as HTML
  const handleExportHTML = () => {
    if (!pageContent) {
      toast.error("No content to export");
      return;
    }
    const bodyContent = isBlockNoteJson(pageContent)
      ? blocksToHtml(pageContent)
      : pageContent;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; }
    blockquote { border-left: 4px solid #ddd; margin: 1em 0; padding-left: 1em; color: #666; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f4f4f4; }
  </style>
</head>
<body>
  <h1>${pageTitle}</h1>
  ${bodyContent}
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    downloadFile(blob, `${pageTitle}.html`);
    toast.success("Exported as HTML");
  };

  // Print / Export as PDF
  const handlePrint = () => {
    if (!pageContent) {
      toast.error("No content to print");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${pageTitle}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
            h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
            pre { background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow-x: auto; }
            code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; }
            blockquote { border-left: 4px solid #ddd; margin: 1em 0; padding-left: 1em; color: #666; }
            img { max-width: 100%; height: auto; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f4f4f4; }
            @media print { body { margin: 0; padding: 1cm; } }
          </style>
        </head>
        <body>
          <h1>${pageTitle}</h1>
          ${isBlockNoteJson(pageContent) ? blocksToHtml(pageContent) : pageContent}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  // Download helper
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4" />
          {!isMobile && <span className="ml-1">Export</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportMarkdown}>
          <FileText className="h-4 w-4 mr-2" />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportHTML}>
          <FileCode className="h-4 w-4 mr-2" />
          Export as HTML
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print / Save as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
