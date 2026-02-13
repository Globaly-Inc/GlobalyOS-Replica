import { useEffect, useMemo, useCallback, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  FormattingToolbarController,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
} from "@blocknote/react";
import { PartialBlock } from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import {
  AIExtension,
  AIMenuController,
  AIToolbarButton,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";
import { DefaultChatTransport } from "ai";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import "./blocknote-styles.css";
import { isBlockNoteJson } from "./wikiContentUtils";

// Re-export for backward compatibility
export { isBlockNoteJson };

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
    [organizationId],
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

  // Build the AI proxy URL using the Supabase functions endpoint
  const aiProxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blocknote-ai-proxy`;

  const editor = useCreateBlockNote({
    initialContent: parsedInitialContent,
    uploadFile,
    dictionary: {
      ...en,
      ai: aiEn,
    },
    extensions: [
      AIExtension({
        transport: new DefaultChatTransport({
          api: aiProxyUrl,
          headers: async () => {
            const { data } = await supabase.auth.getSession();
            const token = data?.session?.access_token;
            return {
              Authorization: token ? `Bearer ${token}` : "",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            };
          },
        }),
        agentCursor: {
          name: "AI Assistant",
          color: "#8bc6ff",
        },
      }),
    ],
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
        formattingToolbar={false}
        slashMenu={false}
        data-theming-css-variables-demo
      >
        {/* Custom formatting toolbar with AI button */}
        <FormattingToolbarController
          formattingToolbar={() => (
            <div className="bn-toolbar bn-formatting-toolbar" role="toolbar">
              {getFormattingToolbarItems()}
              <AIToolbarButton />
            </div>
          )}
        />

        {/* Slash menu with AI items merged */}
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) => {
            const defaultItems = getDefaultReactSlashMenuItems(editor);
            const aiItems = getAISlashMenuItems(editor);
            return [...aiItems, ...defaultItems].filter((item) =>
              item.title.toLowerCase().includes(query.toLowerCase()),
            );
          }}
        />

        {/* AI menu controller for the AI interaction panel */}
        <AIMenuController />
      </BlockNoteView>
    </div>
  );
};
