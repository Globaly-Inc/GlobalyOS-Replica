/**
 * Lightweight rich text editor for assignment instructions.
 * Uses BlockNote with a simple toolbar (no collaboration, no AI).
 */

import { useCallback, useMemo, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { PartialBlock } from '@blocknote/core';
import '@blocknote/mantine/style.css';

interface RichTextInstructionsEditorProps {
  value: string;
  onChange: (value: string) => void;
}

function isJsonContent(content: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  return trimmed.startsWith('[') && trimmed.endsWith(']');
}

export function RichTextInstructionsEditor({ value, onChange }: RichTextInstructionsEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const initialContent = useMemo<PartialBlock[] | undefined>(() => {
    if (!value) return undefined;
    if (isJsonContent(value)) {
      try {
        return JSON.parse(value);
      } catch {
        // fall through to plain text
      }
    }
    // Convert plain text to a single paragraph block
    return [
      {
        type: 'paragraph' as const,
        content: value,
      },
    ];
  }, []); // Only compute once on mount

  const editor = useCreateBlockNote({
    initialContent,
  });

  const handleChange = useCallback(() => {
    const json = JSON.stringify(editor.document);
    onChangeRef.current(json);
  }, [editor]);

  return (
    <div className="border rounded-md overflow-hidden min-h-[300px] [&_.bn-editor]:min-h-[280px]">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="light"
      />
    </div>
  );
}
