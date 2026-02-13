import { useEffect, useMemo, useCallback, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Block, PartialBlock } from "@blocknote/core";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import "./blocknote-styles.css";

/** Detect whether content string is BlockNote JSON or legacy HTML */
export function isBlockNoteJson(content: string | null): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  return trimmed.startsWith("[") && trimmed.endsWith("]");
}

interface BlockNoteWikiEditorProps {
  initialContent: string | null;
  onChange: (jsonString: string) => void;
  organizationId?: string;
  placeholder?: string;
  minHeight?: string;
}

export const BlockNoteWikiEditor = ({
  initialContent,
  onChange,
  organizationId,
  placeholder = "Start writing or press '/' for commands...",
  minHeight = "calc(100vh - 200px)",
}: BlockNoteWikiEditorProps) => {
  const hasLoadedHtml = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Upload file to wiki-attachments bucket
  const uploadFile = useCallback(
    async (file: File): Promise<string> => {
      if (!organizationId) {
        toast.error("Organization not found");
        throw new Error("No organization ID");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${organizationId}/${crypto.randomUUID()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("wiki-attachments")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        toast.error("Failed to upload file");
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("wiki-attachments").getPublicUrl(fileName);

      return publicUrl;
    },
    [organizationId]
  );

  // Parse initial content
  const parsedInitialContent = useMemo((): PartialBlock[] | undefined => {
    if (!initialContent) return undefined;
    if (isBlockNoteJson(initialContent)) {
      try {
        return JSON.parse(initialContent) as PartialBlock[];
      } catch {
        return undefined;
      }
    }
    // Legacy HTML – will be loaded async after editor mounts
    return undefined;
  }, [initialContent]);

  const editor = useCreateBlockNote({
    initialContent: parsedInitialContent,
    uploadFile,
  });

  // If initial content is legacy HTML, convert it after mount
  useEffect(() => {
    if (
      initialContent &&
      !isBlockNoteJson(initialContent) &&
      !hasLoadedHtml.current
    ) {
      hasLoadedHtml.current = true;
      (async () => {
        try {
          const blocks = await editor.tryParseHTMLToBlocks(initialContent);
          editor.replaceBlocks(editor.document, blocks);
        } catch (err) {
          console.error("Failed to parse legacy HTML:", err);
        }
      })();
    }
  }, [editor, initialContent]);

  // Handle changes
  const handleChange = useCallback(() => {
    const json = JSON.stringify(editor.document);
    onChangeRef.current(json);
  }, [editor]);

  return (
    <div style={{ minHeight }}>
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="light"
        data-theming-css-variables-demo
      />
    </div>
  );
};
