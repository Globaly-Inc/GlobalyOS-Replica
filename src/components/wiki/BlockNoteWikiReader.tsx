import { useMemo } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { PartialBlock } from "@blocknote/core";
import "./blocknote-styles.css";

interface BlockNoteWikiReaderProps {
  content: string;
  className?: string;
}

export const BlockNoteWikiReader = ({ content, className }: BlockNoteWikiReaderProps) => {
  const parsedContent = useMemo((): PartialBlock[] | undefined => {
    try {
      return JSON.parse(content) as PartialBlock[];
    } catch {
      return undefined;
    }
  }, [content]);

  const editor = useCreateBlockNote({
    initialContent: parsedContent,
  });

  return (
    <div className={className} data-editable="false">
      <BlockNoteView
        editor={editor}
        editable={false}
        theme="light"
      />
    </div>
  );
};
