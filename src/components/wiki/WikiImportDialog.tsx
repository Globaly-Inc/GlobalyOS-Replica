import { useState, useRef } from "react";
import { Upload, FileJson, AlertCircle, CheckCircle2, FileArchive, FileText, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JSZip from "jszip";

interface ImportedPage {
  title: string;
  content?: string;
  folder?: string;
}

interface WikiImportDialogProps {
  organizationId: string | undefined;
  employeeId: string | undefined;
  existingFolders: { id: string; name: string; parent_id: string | null }[];
  onImportComplete: () => void;
}

export const WikiImportDialog = ({
  organizationId,
  employeeId,
  existingFolders,
  onImportComplete,
}: WikiImportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportedPage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"json" | "zip" | "html" | "md" | null>(null);
  const [attachments, setAttachments] = useState<Map<string, Blob>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPreviewData(null);
    setAttachments(new Map());

    const fileName = file.name.toLowerCase();
    const isJson = fileName.endsWith(".json");
    const isZip = fileName.endsWith(".zip");
    const isHtml = fileName.endsWith(".html") || fileName.endsWith(".htm");
    const isMd = fileName.endsWith(".md") || fileName.endsWith(".markdown");

    if (!isJson && !isZip && !isHtml && !isMd) {
      setError("Please select a JSON, ZIP, HTML, or Markdown file");
      return;
    }

    try {
      if (isJson) {
        setFileType("json");
        await parseJsonFile(file);
      } else if (isZip) {
        setFileType("zip");
        await parseZipFile(file);
      } else if (isHtml) {
        setFileType("html");
        await parseHtmlFile(file);
      } else if (isMd) {
        setFileType("md");
        await parseMarkdownFile(file);
      }
    } catch (err) {
      console.error("Parse error:", err);
      setError(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  const parseJsonFile = async (file: File) => {
    const text = await file.text();
    const json = JSON.parse(text);
    validateAndSetPages(json);
  };

  const parseHtmlFile = async (file: File) => {
    const content = await file.text();
    const title = extractTitleFromFilename(file.name);
    setPreviewData([{ title, content }]);
  };

  const parseMarkdownFile = async (file: File) => {
    const text = await file.text();
    const title = extractTitleFromFilename(file.name);
    const content = convertMarkdownToHtml(text);
    setPreviewData([{ title, content }]);
  };

  const extractTitleFromFilename = (filename: string): string => {
    // Remove extension and convert to readable title
    return filename
      .replace(/\.(html?|md|markdown)$/i, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const convertMarkdownToHtml = (markdown: string): string => {
    // Basic markdown to HTML conversion
    let html = markdown
      // Headers
      .replace(/^######\s+(.*)$/gm, "<h6>$1</h6>")
      .replace(/^#####\s+(.*)$/gm, "<h5>$1</h5>")
      .replace(/^####\s+(.*)$/gm, "<h4>$1</h4>")
      .replace(/^###\s+(.*)$/gm, "<h3>$1</h3>")
      .replace(/^##\s+(.*)$/gm, "<h2>$1</h2>")
      .replace(/^#\s+(.*)$/gm, "<h1>$1</h1>")
      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/___(.+?)___/g, "<strong><em>$1</em></strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      // Code blocks
      .replace(/```[\w]*\n([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      // Links and images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Lists
      .replace(/^\s*[-*+]\s+(.*)$/gm, "<li>$1</li>")
      .replace(/^\s*\d+\.\s+(.*)$/gm, "<li>$1</li>")
      // Blockquotes
      .replace(/^>\s+(.*)$/gm, "<blockquote>$1</blockquote>")
      // Horizontal rules
      .replace(/^[-*_]{3,}$/gm, "<hr />")
      // Line breaks and paragraphs
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br />");

    // Wrap in paragraph tags
    html = `<p>${html}</p>`;
    
    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, "");
    
    // Wrap consecutive list items in ul
    html = html.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul>${match}</ul>`);
    
    return html;
  };

  const parseZipFile = async (file: File) => {
    const zip = await JSZip.loadAsync(file);
    
    // Look for JSON file in the ZIP (any location)
    let pagesJson: any = null;
    const attachmentMap = new Map<string, Blob>();
    const jsonFiles: string[] = [];

    // First pass: identify all files
    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;

      const lowerName = filename.toLowerCase();
      const baseName = filename.split("/").pop()?.toLowerCase() || "";
      
      // Check for JSON data file
      if (lowerName.endsWith(".json")) {
        jsonFiles.push(filename);
      } else if (
        baseName.match(/\.(png|jpg|jpeg|gif|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)
      ) {
        // Extract attachments
        const blob = await zipEntry.async("blob");
        attachmentMap.set(filename, blob);
      }
    }

    // Try to find the best JSON file (prefer common names, then any JSON)
    const preferredNames = ["pages.json", "data.json", "wiki.json", "index.json"];
    let selectedJson = jsonFiles.find(f => {
      const baseName = f.split("/").pop()?.toLowerCase();
      return preferredNames.includes(baseName || "");
    }) || jsonFiles[0];

    if (selectedJson) {
      const content = await zip.files[selectedJson].async("string");
      try {
        pagesJson = JSON.parse(content);
      } catch (e) {
        console.error("Failed to parse JSON:", e);
      }
    }

    if (!pagesJson) {
      throw new Error("No valid JSON file found in ZIP. Include a .json file with page data (e.g., pages.json).");
    }

    setAttachments(attachmentMap);
    validateAndSetPages(pagesJson);
  };


  const validateAndSetPages = (json: any) => {
    let rawPages: any[] = [];
    
    // Support multiple JSON formats
    if (Array.isArray(json)) {
      // Direct array of pages
      rawPages = json;
    } else if (json.pages && Array.isArray(json.pages)) {
      // Object with pages array
      rawPages = json.pages;
    } else if (json.data && Array.isArray(json.data)) {
      // Object with data array
      rawPages = json.data;
    } else if (json.items && Array.isArray(json.items)) {
      // Object with items array
      rawPages = json.items;
    } else if (typeof json === "object" && json !== null) {
      // Single page object - wrap in array
      if (json.title || json.name) {
        rawPages = [json];
      } else {
        // Try to extract from nested structure
        const keys = Object.keys(json);
        if (keys.length > 0 && typeof json[keys[0]] === "object") {
          // Try to flatten nested objects into pages
          rawPages = keys.map((key) => ({
            title: json[key].title || json[key].name || key,
            content: json[key].content || json[key].body || json[key].html || "",
            folder: json[key].folder || json[key].category || undefined,
          }));
        }
      }
    }

    if (rawPages.length === 0) {
      throw new Error(
        "Invalid format. Expected JSON with an array of pages. Each page needs a 'title' field. Example: [{ \"title\": \"My Page\", \"content\": \"<p>Content</p>\" }]"
      );
    }

    // Map various field names to our structure
    const normalizedPages: ImportedPage[] = rawPages.map((p: any) => ({
      title: p.title || p.name || p.Name || "Untitled",
      content: p.content || p.body || p.Body || p.html || p.HTML || "",
      folder: p.folder || p.Folder || p.category || p.Category || undefined,
    }));

    const validPages = normalizedPages.filter((p) => p.title && p.title.trim());
    if (validPages.length === 0) {
      throw new Error("No valid pages found. Each page must have a 'title' or 'name' field.");
    }

    setPreviewData(validPages);
  };

  const uploadAttachments = async (): Promise<Map<string, string>> => {
    const urlMap = new Map<string, string>();
    
    if (!organizationId || attachments.size === 0) return urlMap;

    for (const [filename, blob] of attachments.entries()) {
      const safeName = filename.replace(/[^a-zA-Z0-9._/-]/g, "_");
      const path = `${organizationId}/${Date.now()}-${safeName}`;
      
      const { error } = await supabase.storage
        .from("wiki-attachments")
        .upload(path, blob);

      if (error) {
        console.error(`Failed to upload ${filename}:`, error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("wiki-attachments")
        .getPublicUrl(path);

      urlMap.set(filename, urlData.publicUrl);
    }

    return urlMap;
  };

  const replaceAttachmentRefs = (content: string, urlMap: Map<string, string>): string => {
    let updatedContent = content;
    
    for (const [originalPath, publicUrl] of urlMap.entries()) {
      // Replace various reference patterns
      const patterns = [
        new RegExp(`src=["']${escapeRegex(originalPath)}["']`, "gi"),
        new RegExp(`src=["']\./${escapeRegex(originalPath)}["']`, "gi"),
        new RegExp(`src=["']attachments/${escapeRegex(originalPath.split("/").pop() || "")}["']`, "gi"),
        new RegExp(`href=["']${escapeRegex(originalPath)}["']`, "gi"),
      ];

      for (const pattern of patterns) {
        updatedContent = updatedContent.replace(pattern, (match) => {
          const attr = match.startsWith("src") ? "src" : "href";
          return `${attr}="${publicUrl}"`;
        });
      }
    }

    return updatedContent;
  };

  const escapeRegex = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  const handleImport = async () => {
    if (!previewData || !organizationId || !employeeId) return;

    setIsImporting(true);
    try {
      // Upload attachments first
      const urlMap = await uploadAttachments();

      // Group pages by folder
      const folderMap = new Map<string, ImportedPage[]>();

      previewData.forEach((page) => {
        if (page.folder && page.folder.trim()) {
          const folderName = page.folder.trim();
          if (!folderMap.has(folderName)) {
            folderMap.set(folderName, []);
          }
          folderMap.get(folderName)!.push(page);
        }
      });

      // Create folders that don't exist
      const folderIdMap = new Map<string, string>();
      existingFolders.forEach((f) => folderIdMap.set(f.name.toLowerCase(), f.id));

      for (const folderName of folderMap.keys()) {
        if (!folderIdMap.has(folderName.toLowerCase())) {
          const { data, error } = await supabase
            .from("wiki_folders")
            .insert({
              name: folderName,
              organization_id: organizationId,
              created_by: employeeId,
              sort_order: existingFolders.length + folderIdMap.size,
            })
            .select("id")
            .single();

          if (error) throw error;
          folderIdMap.set(folderName.toLowerCase(), data.id);
        }
      }

      // Create pages with updated content
      const pagesToInsert = previewData.map((page, index) => {
        let content = page.content || "";
        
        // Replace attachment references with uploaded URLs
        if (urlMap.size > 0) {
          content = replaceAttachmentRefs(content, urlMap);
        }

        return {
          title: page.title.trim(),
          content,
          folder_id: page.folder ? folderIdMap.get(page.folder.trim().toLowerCase()) || null : null,
          organization_id: organizationId,
          created_by: employeeId,
          sort_order: index,
        };
      });

      const { error: insertError } = await supabase.from("wiki_pages").insert(pagesToInsert);

      if (insertError) throw insertError;

      const attachmentCount = urlMap.size;
      toast.success(
        `Imported ${pagesToInsert.length} pages${attachmentCount > 0 ? ` and ${attachmentCount} attachments` : ""} successfully`
      );
      setIsOpen(false);
      setPreviewData(null);
      setAttachments(new Map());
      setFileType(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onImportComplete();
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Failed to import pages");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setPreviewData(null);
    setError(null);
    setAttachments(new Map());
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import Wiki Pages
          </DialogTitle>
          <DialogDescription>
            Import pages from JSON, ZIP, HTML, or Markdown files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* File input */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex justify-center gap-2 mb-2">
              <FileJson className="h-8 w-8 text-muted-foreground" />
              <FileArchive className="h-8 w-8 text-muted-foreground" />
              <FileCode className="h-8 w-8 text-muted-foreground" />
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Click to select a file
            </p>
            <p className="text-xs text-muted-foreground">
              JSON, ZIP, HTML, or Markdown
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.zip,.html,.htm,.md,.markdown"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {previewData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {previewData.length} pages
                  {attachments.size > 0 && ` + ${attachments.size} attachments`}
                  {" "}ready to import
                </span>
              </div>
              <ScrollArea className="h-32 border border-border rounded-lg">
                <div className="p-2 space-y-0.5">
                  {previewData.map((page, index) => (
                    <div key={index} className="text-sm py-1.5 px-2 rounded-md hover:bg-accent/50 transition-colors">
                      <span className="font-medium text-foreground">{page.title}</span>
                      {page.folder && (
                        <span className="text-muted-foreground ml-2 text-xs">→ {page.folder}</span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Format hints */}
          <div className="text-xs bg-muted/50 border border-border rounded-lg p-3 overflow-hidden">
            <p className="font-medium text-foreground mb-2">Supported formats:</p>
            <div className="space-y-1.5 text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">JSON:</span>
                <span className="ml-1">Array of pages with title/content</span>
              </div>
              <div>
                <span className="font-medium text-foreground">ZIP:</span>
                <span className="ml-1">pages.json + attachments</span>
              </div>
              <div>
                <span className="font-medium text-foreground">HTML:</span>
                <span className="ml-1">Single page (title from filename)</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Markdown:</span>
                <span className="ml-1">.md file converted to HTML</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!previewData || isImporting || !organizationId || !employeeId}
            >
              {isImporting ? "Importing..." : `Import ${previewData?.length || 0} Pages`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
