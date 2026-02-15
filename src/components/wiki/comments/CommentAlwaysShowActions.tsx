import { useContext, useMemo, createContext } from 'react';
import { ComponentsContext } from '@blocknote/react';
import type { ComponentProps } from '@blocknote/react';
import type { User } from '@blocknote/core/comments';
import { CommentEditorWithMentions } from './CommentEditorWithMentions';

/** Context to pass mentionUsers to nested comment editors */
export const MentionUsersContext = createContext<
  ((query: string) => Promise<User[]>) | undefined
>(undefined);

/**
 * Wrapper that provides overridden Comments components:
 * 1. Comment: always shows actions (resolve, reaction, more)
 * 2. Editor: adds @mention suggestion menu
 */
export const CommentsAlwaysShowActions = ({
  children,
  mentionUsers,
}: {
  children: React.ReactNode;
  mentionUsers?: (query: string) => Promise<User[]>;
}) => {
  const parentComponents = useContext(ComponentsContext);

  const patchedComponents = useMemo(() => {
    if (!parentComponents) return undefined;

    const OriginalComment = parentComponents.Comments.Comment;

    const PatchedComment = (props: ComponentProps['Comments']['Comment']) => {
      return <OriginalComment {...props} showActions={true} />;
    };

    return {
      ...parentComponents,
      Comments: {
        ...parentComponents.Comments,
        Comment: PatchedComment,
        Editor: CommentEditorWithMentions,
      },
    };
  }, [parentComponents]);

  if (!patchedComponents) {
    return <>{children}</>;
  }

  return (
    <MentionUsersContext.Provider value={mentionUsers}>
      <ComponentsContext.Provider value={patchedComponents}>
        {children}
      </ComponentsContext.Provider>
    </MentionUsersContext.Provider>
  );
};
