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
import { MentionUsersContext } from './CommentAlwaysShowActions';

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
  const mentionUsers = useContext(MentionUsersContext);

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
      {editable && mentionUsers && (
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={async (query) => {
            const users = await mentionUsers(query);
            return users.map((user) => ({
              title: user.username,
              onItemClick: () => {
                editor.insertInlineContent([
                  {
                    type: 'mention',
                    props: {
                      userId: user.id,
                      userName: user.username,
                    },
                  },
                  ' ',
                ]);
              },
            }));
          }}
        />
      )}
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
