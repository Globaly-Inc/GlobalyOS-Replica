
# Add AI Suggest & AI Improve to Message Composer

## Overview

Add two AI-powered features to the right side of the message composer toolbar:
1. **AI Suggest** - Generate a context-aware message suggestion (when text is empty or minimal)
2. **AI Improve** - Polish and enhance existing text (when text has content)

Both features will use the **last 20 messages** and **current space/group context** to provide relevant, contextual suggestions.

## Technical Approach

### 1. Create New Edge Function: `ai-chat-assist`

**File: `supabase/functions/ai-chat-assist/index.ts`**

This function will handle both "suggest" and "improve" modes with full context awareness:

| Input Parameter | Type | Description |
|----------------|------|-------------|
| `mode` | `"suggest" \| "improve"` | Operation type |
| `currentText` | `string` | Current message draft |
| `recentMessages` | `array` | Last 20 messages with sender names |
| `contextInfo` | `object` | Space/group name, description, type |
| `organizationId` | `string` | For tenant isolation |

**AI Prompt Strategy:**
- **Suggest mode**: "Based on the conversation context, suggest an appropriate response that continues the discussion naturally."
- **Improve mode**: "Polish this message while preserving the original intent. Make it clearer, more professional, and appropriate for the conversation context."

The system prompt will include:
- Recent conversation history (last 20 messages)
- Space/group purpose and description
- Whether it's a group, DM, or space
- Member context (team/project context)

### 2. Create Client-Side Component: `ChatAIAssist`

**File: `src/components/chat/ChatAIAssist.tsx`**

A compact button component that:
- Shows "AI Suggest" (sparkle icon) when text is empty/minimal
- Shows "AI Improve" (wand icon) when text has content (>10 chars)
- Displays loading spinner during generation
- Calls the edge function with full context

```text
Props:
├── currentText: string
├── onTextGenerated: (text: string) => void
├── conversationId: string | null
├── spaceId: string | null
├── messages: ChatMessage[]  // From useMessages hook
├── spaceName?: string
├── spaceDescription?: string | null
├── conversationName?: string | null
├── isGroup?: boolean
└── disabled?: boolean
```

### 3. Update MessageComposer

**File: `src/components/chat/MessageComposer.tsx`**

Changes required:
1. Import `ChatAIAssist` component
2. Add `Wand2` icon from lucide-react
3. Pass messages to composer (new prop: `messages: ChatMessage[]`)
4. Pass space/conversation context (new props: `spaceName`, `spaceDescription`, `conversationName`, `isGroup`)
5. Place AI button on the **right side** of the bottom action bar, before the Send button

**UI Layout (Desktop):**
```text
┌─────────────────────────────────────────────────────────────┐
│ [B] [I] [S] │ [•] [1.] │ [Link] [Code]                      │  ← Formatting toolbar
├─────────────────────────────────────────────────────────────┤
│ Type a message... Use @ to mention someone                  │  ← Textarea
├─────────────────────────────────────────────────────────────┤
│ [+] [😊] [@]                     [✨ AI Suggest] [Send →]  │  ← Action bar
└─────────────────────────────────────────────────────────────┘
```

**UI Layout (Mobile):**
```text
┌─────────────────────────────────────────┐
│ Message...                              │
├─────────────────────────────────────────┤
│ [+] [😊] [@]       [✨] [Send →]       │
└─────────────────────────────────────────┘
```

### 4. Update ConversationView to Pass Context

**File: `src/components/chat/ConversationView.tsx`**

Pass additional context to MessageComposer:
- `messages` from `useMessages` hook
- Space/conversation metadata

## Implementation Details

### Edge Function Logic

```typescript
// Pseudocode for ai-chat-assist
const systemPrompt = `You are a helpful AI assistant for workplace team chat.
Your task is to ${mode === 'suggest' ? 'suggest an appropriate message' : 'improve the given message'}.

CONTEXT:
- Chat type: ${contextInfo.type} (${contextInfo.name})
- Description: ${contextInfo.description || 'General chat'}

RECENT CONVERSATION (last 20 messages):
${recentMessages.map(m => `${m.senderName}: ${m.content}`).join('\n')}

RULES:
- Keep messages concise (2-4 sentences max)
- Match the conversation's tone and style
- Be professional but friendly
- Do not use emojis
- Do not include greetings like "Hi" unless contextually appropriate
`;

const userPrompt = mode === 'suggest'
  ? `Based on this conversation, suggest an appropriate response.`
  : `Improve this message while keeping its intent:\n\n"${currentText}"`;
```

### Component Behavior

| State | Button Label | Icon | Action |
|-------|-------------|------|--------|
| Empty/minimal text | "AI Suggest" | Sparkles | Generate contextual suggestion |
| Has text (>10 chars) | "AI Improve" | Wand2 | Polish existing text |
| Generating | "Generating..." | Loader2 (spinning) | Disabled |

### Security Considerations

- Tenant isolation: `organizationId` validated on backend
- Rate limiting: 429 and 402 error handling
- Message content is sent to AI gateway (LOVABLE_API_KEY)
- Only messages the user can already see are sent as context

## Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/functions/ai-chat-assist/index.ts` | **New** - Edge function for AI assistance |
| `src/components/chat/ChatAIAssist.tsx` | **New** - AI assist button component |
| `src/components/chat/MessageComposer.tsx` | Add ChatAIAssist to action bar, accept new props |
| `src/components/chat/ConversationView.tsx` | Pass messages and context to MessageComposer |
| `supabase/config.toml` | Add ai-chat-assist function config |

## Performance Optimizations

1. **Limit context**: Only last 20 messages (not entire history)
2. **Debounce**: Prevent rapid clicks during generation
3. **Cache messages**: Messages already cached by `useMessages` hook
4. **max_tokens**: Limit response to 300 tokens for concise output

## User Experience

1. **Instant feedback**: Loading spinner shows immediately
2. **Non-destructive**: Generated text replaces draft, user can undo (Ctrl+Z)
3. **Contextual labels**: Button label changes based on current text
4. **Tooltip hints**: Explain what AI will do on hover
5. **Toast notifications**: Success/error feedback
