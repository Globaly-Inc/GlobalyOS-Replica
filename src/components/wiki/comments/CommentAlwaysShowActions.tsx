import { useContext, useMemo } from 'react';
import { ComponentsContext } from '@blocknote/react';
import type { ComponentProps } from '@blocknote/react';

/**
 * Wrapper that overrides the Comment component to always show actions
 * (resolve, reaction, more) instead of only on hover.
 */
export const CommentsAlwaysShowActions = ({
  children,
}: {
  children: React.ReactNode;
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
      },
    };
  }, [parentComponents]);

  if (!patchedComponents) {
    return <>{children}</>;
  }

  return (
    <ComponentsContext.Provider value={patchedComponents}>
      {children}
    </ComponentsContext.Provider>
  );
};
