import { useEffect, useMemo, useCallback, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  FormattingToolbarController,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  FloatingComposerController,
  FloatingThreadController,
  ThreadsSidebar,
} from "@blocknote/react";
import { AddCommentButton } from "@blocknote/react";
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
import * as Y from "yjs";
import {
  CommentsExtension,
  DefaultThreadStoreAuth,
  YjsThreadStore,
} from "@blocknote/core/comments";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import "./blocknote-styles.css";
import { isBlockNoteJson } from "./wikiContentUtils";
import { SupabaseYjsProvider } from "./collaboration/SupabaseYjsProvider";
import { useResolveUsers } from "./collaboration/useResolveUsers";

// Re-export for backward compatibility
export { isBlockNoteJson };

interface BlockNoteWikiEditorProps {
  initialContent: string | null;
  onChange: (jsonString: string) => void;
  organizationId?: string;
  placeholder?: string;
  minHeight?: string;
  // Collaboration props
  pageId?: string;
  userName?: string;
  userColor?: string;
  // Comments props
  userId?: string; // employee ID for comment authoring
  canComment?: boolean;
  showCommentsSidebar?: boolean;
}

export const BlockNoteWikiEditor = ({
  initialContent,
  onChange,
  organizationId,
  placeholder = "Start writing or press '/' for commands...",
  minHeight = "calc(100vh - 200px)",
  pageId,
  userName,
  userColor,
  userId,
  canComment = false,
  showCommentsSidebar = false,
}: BlockNoteWikiEditorProps) => {
  const hasLoadedHtml = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const providerRef = useRef<SupabaseYjsProvider | null>(null);

  // Collaboration mode is active when pageId and userName are provided
  const isCollaborative = !!(pageId && userName);
  // Comments require collaboration (Yjs doc) and a userId
  const commentsEnabled = isCollaborative && canComment && !!userId;

  const resolveUsers = useResolveUsers(organizationId);

  // Create Yjs doc and provider for collaborative editing
  const { doc, provider } = useMemo(() => {
    if (!isCollaborative) return { doc: null, provider: null };

    const ydoc = new Y.Doc();
    const channelName = `wiki-collab-${pageId}`;
    const yProvider = new SupabaseYjsProvider(supabase, channelName, ydoc);
    return { doc: ydoc, provider: yProvider };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, isCollaborative]);

  // Store provider ref for external access (e.g. WikiActiveEditors)
  providerRef.current = provider;

  // Cleanup provider on unmount
  useEffect(() => {
    return () => {
      provider?.destroy();
    };
  }, [provider]);

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

  // Parse initial content (only used in non-collaborative mode)
  const parsedInitialContent = useMemo((): PartialBlock[] | undefined => {
    if (isCollaborative) return undefined; // Yjs is source of truth
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
  }, [initialContent, isCollaborative]);

  // Build the AI proxy URL using the Supabase functions endpoint
  const aiProxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blocknote-ai-proxy`;

  // Build collaboration config for useCreateBlockNote
  const collaborationConfig = useMemo(() => {
    if (!isCollaborative || !doc || !provider) return undefined;
    return {
      provider,
      fragment: doc.getXmlFragment("document-store"),
      user: {
        name: userName!,
        color: userColor || "#4ECDC4",
      },
      showCursorLabels: "activity" as const,
    };
  }, [isCollaborative, doc, provider, userName, userColor]);

  // Create thread store for comments (backed by Yjs)
  const threadStore = useMemo(() => {
    if (!commentsEnabled || !doc || !userId) return undefined;
    const auth = new DefaultThreadStoreAuth(userId, "editor");
    return new YjsThreadStore(userId, doc.getMap("threads"), auth);
  }, [commentsEnabled, doc, userId]);

  // Build extensions array
  const extensions = useMemo(() => {
    const exts: any[] = [
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
    ];

    if (commentsEnabled && threadStore) {
      exts.push(
        CommentsExtension({
          threadStore,
          resolveUsers,
        }),
      );
    }

    return exts;
  }, [aiProxyUrl, commentsEnabled, threadStore, resolveUsers]);

  const editor = useCreateBlockNote({
    ...(isCollaborative
      ? { collaboration: collaborationConfig! }
      : { initialContent: parsedInitialContent }),
    uploadFile,
    dictionary: {
      ...en,
      ai: aiEn,
    },
    extensions,
  });

  // If collaborative, load initial content into Yjs doc when first user joins
  useEffect(() => {
    if (!isCollaborative || !doc || !initialContent || hasLoadedHtml.current) return;

    // Wait a moment for peers to potentially send their state
    const timeout = setTimeout(async () => {
      const fragment = doc.getXmlFragment("document-store");
      // Only load initial content if the Yjs doc is empty (no peers sent data)
      if (fragment.length === 0) {
        hasLoadedHtml.current = true;
        try {
          if (isBlockNoteJson(initialContent)) {
            const blocks = JSON.parse(initialContent) as PartialBlock[];
            editor.replaceBlocks(editor.document, blocks);
          } else {
            const blocks = await editor.tryParseHTMLToBlocks(initialContent);
            editor.replaceBlocks(editor.document, blocks);
          }
        } catch (err) {
          console.error("Failed to load initial content into Yjs doc:", err);
        }
      } else {
        hasLoadedHtml.current = true;
      }
    }, 800); // Give peers time to sync

    return () => clearTimeout(timeout);
  }, [isCollaborative, doc, initialContent, editor]);

  // If initial content is legacy HTML (non-collaborative mode), convert it after mount
  useEffect(() => {
    if (isCollaborative) return;
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
  }, [editor, initialContent, isCollaborative]);

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
        <div className={showCommentsSidebar && commentsEnabled ? 'flex gap-4' : ''}>
          <div className={showCommentsSidebar && commentsEnabled ? 'flex-1 min-w-0' : ''}>
            {/* Custom formatting toolbar with AI + Comment buttons */}
            <FormattingToolbarController
              formattingToolbar={() => (
                <div className="bn-toolbar bn-formatting-toolbar" role="toolbar">
                  {getFormattingToolbarItems()}
                  <AIToolbarButton />
                  {commentsEnabled && <AddCommentButton />}
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

            {/* Comment floating controllers */}
            {commentsEnabled && (
              <>
                <FloatingComposerController />
                <FloatingThreadController />
              </>
            )}
          </div>

          {/* Comments sidebar panel - inside BlockNoteView for context access */}
          {showCommentsSidebar && commentsEnabled && (
            <div className="w-80 flex-shrink-0 border-l bg-card overflow-y-auto">
              <ThreadsSidebar />
            </div>
          )}
        </div>
      </BlockNoteView>
    </div>
  );
};

// Export provider ref getter for WikiActiveEditors
export type { SupabaseYjsProvider };
