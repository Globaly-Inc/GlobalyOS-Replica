import { useState, useRef } from "react";
import { Upload, FileJson, AlertCircle, CheckCircle2 } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPreviewData(null);

    if (!file.name.endsWith(".json")) {
      setError("Please select a JSON file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Support both array format and object with pages array
        let pages: ImportedPage[] = [];
        if (Array.isArray(json)) {
          pages = json;
        } else if (json.pages && Array.isArray(json.pages)) {
          pages = json.pages;
        } else {
          throw new Error("Invalid format");
        }

        // Validate structure
        const validPages = pages.filter((p) => p && typeof p.title === "string" && p.title.trim());
        if (validPages.length === 0) {
          throw new Error("No valid pages found. Each page must have a 'title' field.");
        }

        setPreviewData(validPages);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Invalid JSON format. Expected an array of pages with 'title' and optional 'content' and 'folder' fields."
        );
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!previewData || !organizationId || !employeeId) return;

    setIsImporting(true);
    try {
      // Group pages by folder
      const folderMap = new Map<string, ImportedPage[]>();
      const noFolderPages: ImportedPage[] = [];

      previewData.forEach((page) => {
        if (page.folder && page.folder.trim()) {
          const folderName = page.folder.trim();
          if (!folderMap.has(folderName)) {
            folderMap.set(folderName, []);
          }
          folderMap.get(folderName)!.push(page);
        } else {
          noFolderPages.push(page);
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

      // Create pages
      const pagesToInsert = previewData.map((page, index) => ({
        title: page.title.trim(),
        content: page.content || "",
        folder_id: page.folder ? folderIdMap.get(page.folder.trim().toLowerCase()) || null : null,
        organization_id: organizationId,
        created_by: employeeId,
        sort_order: index,
      }));

      const { error: insertError } = await supabase.from("wiki_pages").insert(pagesToInsert);

      if (insertError) throw insertError;

      toast.success(`Imported ${pagesToInsert.length} pages successfully`);
      setIsOpen(false);
      setPreviewData(null);
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
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import Wiki Pages
          </DialogTitle>
          <DialogDescription>
            Import pages from a JSON file. Each page should have a title and optionally content and folder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* File input */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileJson className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground mb-1">
              Click to select a JSON file
            </p>
            <p className="text-xs text-muted-foreground">
              or drag and drop
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
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
                <span>{previewData.length} pages ready to import</span>
              </div>
              <ScrollArea className="h-40 border border-border rounded-lg">
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

          {/* JSON format hint */}
          <div className="text-xs bg-muted/50 border border-border rounded-lg p-3">
            <p className="font-medium text-foreground mb-2">Expected JSON format:</p>
            <pre className="overflow-x-auto text-muted-foreground font-mono text-[11px] leading-relaxed">
{`[
  { "title": "Page Title", "content": "<p>HTML</p>", "folder": "Folder" },
  { "title": "Another Page" }
]`}
            </pre>
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
