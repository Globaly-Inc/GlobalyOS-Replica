

## Integrate BlockNote's Native AI Features into GlobalyOS Wiki

### Summary
Replace the current "copy to clipboard" AI approach with BlockNote's official `@blocknote/xl-ai` package. This gives users a native, inline AI experience: select text and click an AI button in the formatting toolbar, or type `/ai` in the slash menu to get AI-powered writing, rephrasing, summarizing, translation, and more -- all applied directly into the editor without clipboard workarounds.

### What Changes

**Current state (broken)**:
- A standalone "Write with AI" button in the header extracts plain text, sends it to an edge function, and copies the AI response to the clipboard
- Users must manually paste AI output -- not a real integration

**New state (native BlockNote AI)**:
- AI button appears in the formatting toolbar when text is selected
- `/ai` option appears in the slash menu
- AI menu opens with pre-built commands (Rephrase, Summarize, Fix typos, Translate, Make shorter/longer)
- Custom GlobalyOS commands (e.g., "Make Professional", "Simplify Language")
- AI edits are applied directly into the document with accept/reject controls
- Streaming responses show the AI writing in real-time with an agent cursor

### Architecture

The `@blocknote/xl-ai` package supports a `ClientSideTransport` with a proxy pattern. This is ideal for GlobalyOS because:
1. We already have a Lovable AI gateway (OpenAI-compatible API)
2. We create a lightweight proxy edge function that adds the API key and forwards requests
3. The BlockNote AI SDK handles all the tool calling, document state, and streaming on the client

```text
User selects text -> BlockNote AI Extension
    -> ClientSideTransport with fetchViaProxy
    -> Edge Function (blocknote-ai-proxy)
    -> Lovable AI Gateway (gemini-3-flash-preview)
    -> Streaming response back to editor
    -> AI writes directly into the document
    -> User accepts or rejects changes
```

### Implementation Steps

#### 1. Install `@blocknote/xl-ai` package
- Add `@blocknote/xl-ai` to dependencies
- Add `ai` and `@ai-sdk/openai-compatible` packages (required by BlockNote AI for transport)

#### 2. Create Edge Function: `blocknote-ai-proxy`
A new edge function that acts as a proxy between BlockNote AI and the Lovable AI Gateway:
- Receives requests from the BlockNote `fetchViaProxy` transport
- Authenticates the user (JWT verification)
- Verifies organization membership
- Checks AI feature limits (`check_feature_limit` RPC)
- Forwards the request to the Lovable AI Gateway with `LOVABLE_API_KEY`
- Streams the response back to the client
- Logs usage to `ai_usage_logs` table
- Handles 429/402 errors gracefully

#### 3. Update `BlockNoteWikiEditor.tsx`
Major changes to integrate the AI extension:
- Import `AIExtension`, `AIMenuController`, `AIToolbarButton`, `getAISlashMenuItems`, `ClientSideTransport`, `fetchViaProxy` from `@blocknote/xl-ai`
- Import locales (`en` from `@blocknote/xl-ai/locales`)
- Import AI stylesheet (`@blocknote/xl-ai/style.css`)
- Register the `AIExtension` in `useCreateBlockNote` with:
  - `ClientSideTransport` using `createOpenAICompatible` provider pointing to the proxy edge function
  - Agent cursor config (`name: "AI Assistant"`, `color: "#8bc6ff"`)
- Replace default `BlockNoteView` to disable built-in toolbar/slash menu and add custom ones with AI buttons:
  - `FormattingToolbarController` with `AIToolbarButton` appended
  - `SuggestionMenuController` with `getAISlashMenuItems` merged into default items
  - `AIMenuController` for the AI interaction panel

#### 4. Add Custom AI Commands
Create GlobalyOS-specific AI menu items:
- "Make Professional" -- formal tone for documentation
- "Simplify Language" -- plain language for wider audience
- "Add Structure" -- convert paragraphs into headings/lists
- "Translate to..." -- with language options

These use `editor.getExtension(AIExtension).invokeAI()` with custom prompts.

#### 5. Clean Up Old AI Assist
- Remove the `WikiAIWritingAssist` component from the `WikiEditPage.tsx` header (no longer needed)
- Remove the `getPlainTextForAI` and `handleAITextGenerated` functions
- The `WikiAIWritingAssist` component file itself stays (still used elsewhere)

#### 6. Update Styles
- Import `@blocknote/xl-ai/style.css` in the editor component
- Add any custom CSS overrides to `blocknote-styles.css` for the AI menu to match GlobalyOS theme

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/blocknote-ai-proxy/index.ts` | Proxy edge function for BlockNote AI requests |

### Files to Modify

| File | Change |
|------|---------|
| `src/components/wiki/BlockNoteWikiEditor.tsx` | Add AIExtension, custom toolbar with AI button, slash menu with AI items, AIMenuController |
| `src/components/wiki/blocknote-styles.css` | AI menu styling overrides |
| `src/pages/WikiEditPage.tsx` | Remove WikiAIWritingAssist from header, clean up clipboard logic |
| `supabase/config.toml` | Add `blocknote-ai-proxy` function config |

### Technical Details

**Licensing**: `@blocknote/xl-ai` is open source under AGPL (copyleft). For closed-source commercial use, a Business subscription from BlockNote is required. This should be noted for production deployment.

**Model**: Using `google/gemini-3-flash-preview` (the recommended default) for the best balance of speed and capability for inline editing tasks.

**Security**: The proxy edge function validates JWT, checks organization membership, enforces feature limits, and never exposes the `LOVABLE_API_KEY` to the client. All requests are scoped per organization.

**Usage Tracking**: AI usage is logged to `ai_usage_logs` with `query_type: "wiki_blocknote_ai"` for billing and analytics. Feature limits are checked via `check_feature_limit` RPC before proxying.

