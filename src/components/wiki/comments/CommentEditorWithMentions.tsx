import { assertEmpty } from '@blocknote/core';
import {
  ComponentProps,
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  getFormattingToolbarItems,
  useBlockNoteContext,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { forwardRef, useContext } from 'react';
// MentionUsersContext was removed — this file is currently unused but kept for future reference

/**
 * Custom comment Editor component that adds @mention support
 * via a SuggestionMenuController with triggerCharacter="@".
 */
export const CommentEditorWithMentions = forwardRef<
  HTMLDivElement,
  ComponentProps['Comments']['Editor']
>((props, ref) => {
  const { className, autoFocus, onFocus, onBlur, editor, editable, ...rest } =
    props;

  assertEmpty(rest, false);

  const blockNoteContext = useBlockNoteContext();
  const mentionUsers = undefined; // Disabled — MentionUsersContext removed

  return (
    <BlockNoteView
      autoFocus={autoFocus}
      className={className}
      editor={editor}
      sideMenu={false}
      slashMenu={false}
      tableHandles={false}
      filePanel={false}
      formattingToolbar={false}
      editable={editable}
      theme={blockNoteContext?.colorSchemePreference}
      ref={ref}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <FormattingToolbarController
        formattingToolbar={CustomFormattingToolbar}
      />
    </BlockNoteView>
  );
});

CommentEditorWithMentions.displayName = 'CommentEditorWithMentions';

const CustomFormattingToolbar = () => {
  const items = getFormattingToolbarItems([]).filter(
    (el) => el.key !== 'nestBlockButton' && el.key !== 'unnestBlockButton',
  );
  return (
    <FormattingToolbar blockTypeSelectItems={[]}>{items}</FormattingToolbar>
  );
};
