import { createReactInlineContentSpec } from '@blocknote/react';

/**
 * Custom inline content spec for @mentions in comment editors.
 * Renders as a blue-styled span showing "@username".
 */
export const Mention = createReactInlineContentSpec(
  {
    type: 'mention' as const,
    propSchema: {
      userId: { default: '' },
      userName: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ inlineContent }) => {
      return (
        <span
          className="bn-mention"
          data-user-id={inlineContent.props.userId}
          style={{
            color: 'hsl(221.2 83.2% 53.3%)',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          @{inlineContent.props.userName}
        </span>
      );
    },
  },
);
