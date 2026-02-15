import { BlockNoteSchema, defaultStyleSpecs } from '@blocknote/core';
import { createParagraphBlockSpec } from '@blocknote/core';
import { Mention } from './MentionInlineContent';

// Remove textColor, backgroundColor from styleSpecs (same as default comment schema)
const { textColor, backgroundColor, ...styleSpecs } = defaultStyleSpecs;

/**
 * Custom comment editor schema that includes mention support.
 * Based on BlockNote's defaultCommentEditorSchema but with the
 * mention inline content spec added.
 */
export const commentEditorSchemaWithMentions = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: createParagraphBlockSpec(),
  },
  inlineContentSpecs: {
    text: { config: 'text' as const, implementation: {} as any },
    link: { config: 'link' as const, implementation: {} as any },
    mention: Mention,
  },
  styleSpecs,
});
