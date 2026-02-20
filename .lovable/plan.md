

## Visual Drag-and-Drop IVR Builder + Missing Telephony Features

### Current State

GlobalyOS currently has a basic IVR builder (`IvrBuilderDialog.tsx`) -- a simple form-based dialog with:
- Text greeting with TTS preview
- Flat list of menu options (digit, label, action)
- Business hours toggle
- Voicemail toggle
- Actions: Play Message, Go to Voicemail, Forward to Agent

This is functional but far from the visual, multi-level tree builder shown in the Ringover reference (and the uploaded screenshot).

### What's Missing (compared to Ringover)

After reviewing all Ringover feature pages, here is the gap analysis organized by priority:

| Category | Feature | Status in GlobalyOS |
|----------|---------|-------------------|
| **IVR** | Visual drag-and-drop tree builder | Missing -- currently a flat form |
| **IVR** | Multi-level / nested IVR menus | Missing -- single level only |
| **IVR** | Per-node greeting messages | Partial -- only root greeting |
| **IVR** | "Forward to group/department" action | Missing -- only forwards to a single number |
| **IVR** | "Transfer to another IVR" (nested) | Missing |
| **Calls** | Call recording toggle (on/off per call) | Partial -- recording via Twilio webhook exists, no agent-side toggle |
| **Calls** | Call transcription (AI) | Partial -- Twilio transcribe exists, no dedicated AI transcription |
| **Calls** | Call summaries (AI-generated) | Missing |
| **Calls** | Call monitoring (listen/whisper/barge) | Missing |
| **Calls** | Power dialer / call campaigns | Missing |
| **Routing** | Call queues with distribution strategies | Missing |
| **Routing** | Preferred agent routing | Missing |

---

### Implementation Plan

This is a large feature set. The plan is scoped to **Phase 1: Visual IVR Builder** (the primary ask) with a roadmap for subsequent phases.

---

### Phase 1: Visual Drag-and-Drop Multi-Level IVR Builder

Replace the current `IvrBuilderDialog` form with a full-page visual IVR builder that renders the call flow as an interactive tree (like the Ringover screenshot).

#### 1.1 Data Model Update

Update the `ivr_config` JSON structure in `org_phone_numbers` to support a tree/graph:

```text
ivr_config: {
  nodes: [
    {
      id: "root",
      type: "greeting",        // greeting | menu | voicemail | forward | message | nested_ivr | hangup
      label: "Welcome",
      greeting_text: "Thank you for calling...",
      position: { x: 400, y: 50 },   // for visual placement
      children: ["menu_1"]
    },
    {
      id: "menu_1",
      type: "menu",
      label: "Main Menu",
      position: { x: 400, y: 200 },
      options: [
        { digit: "1", target_node_id: "greeting_sales" },
        { digit: "2", target_node_id: "greeting_support" }
      ]
    },
    {
      id: "greeting_sales",
      type: "greeting",
      label: "Sales",
      greeting_text: "Connecting you to sales...",
      position: { x: 200, y: 400 },
      children: ["forward_sales"]
    },
    ...
  ],
  business_hours: { ... },   // kept as-is
  voicemail_enabled: true
}
```

No database migration needed -- `ivr_config` is already a JSON column. A migration function will convert old flat configs to the new tree format on first load.

#### 1.2 New Components

| Component | Purpose |
|-----------|---------|
| `src/pages/crm/inbox/IvrBuilderPage.tsx` | Full-page IVR builder (replaces dialog for editing) |
| `src/components/ivr/IvrCanvas.tsx` | Main canvas with pan/zoom, renders the tree |
| `src/components/ivr/IvrNode.tsx` | Individual node card (greeting, menu, voicemail, forward, hangup) |
| `src/components/ivr/IvrEdge.tsx` | SVG connector lines between nodes |
| `src/components/ivr/IvrNodeConfig.tsx` | Side panel / popover for editing a node's properties |
| `src/components/ivr/IvrToolbar.tsx` | Top toolbar: add node types, save, preview, undo |
| `src/components/ivr/useIvrBuilder.ts` | Hook managing IVR tree state, add/remove/move nodes |

#### 1.3 Visual Canvas Implementation

- Use a custom SVG + HTML overlay approach (no heavy external lib needed):
  - Nodes are absolutely positioned `div` cards on a scrollable/pannable container
  - Edges are SVG `<path>` elements drawn between node positions
  - Drag-and-drop uses `@dnd-kit` (already installed) for repositioning nodes
- Each node type has a distinct color/icon:
  - Greeting: blue with speaker icon
  - Menu: teal with grid icon
  - Forward: green with phone-forward icon
  - Voicemail: orange with voicemail icon
  - Message: purple with message icon
  - Hangup: red with phone-off icon
- "Add keypad option" button on Menu nodes (matches Ringover screenshot)
- "+" connector buttons between nodes to insert new steps
- Click a node to open its config panel on the right side

#### 1.4 Node Types and Actions

| Node Type | Config Fields | Behavior |
|-----------|--------------|----------|
| **Greeting** | Greeting text, TTS voice, audio upload | Plays message, then passes to child node |
| **Menu (Gather)** | Digit options (1-9, 0, *, #), timeout, invalid input behavior | DTMF gather, routes to child per digit |
| **Forward** | Target: phone number, agent, department/group | Dials target |
| **Voicemail** | Max length, custom prompt | Records voicemail |
| **Message** | Text to speak | Plays message then continues to child or hangup |
| **Nested IVR** | Reference another phone number's IVR | Transfers to sub-IVR |
| **Hangup** | (none) | Ends the call |

#### 1.5 Backend: Update Edge Functions

Update `twilio-webhook` and `twilio-ivr-action` to process the new tree structure:
- Walk the node tree starting from root
- For menu nodes, generate `<Gather>` TwiML with action URL including node context
- For greeting nodes, generate `<Say>` then follow child
- For forward nodes, generate `<Dial>`
- Pass `current_node_id` via URL params so `twilio-ivr-action` knows where in the tree the caller is

#### 1.6 Migration of Existing Configs

A utility function `migrateFlat IvrToTree()` will convert old flat configs:
- Old `greeting` becomes a root Greeting node
- Each old `menu_option` becomes a child of a Menu node
- Actions map to corresponding node types

#### 1.7 Routing

- Add route: `/crm/inbox/numbers/:phoneId/ivr` for the full-page builder
- "Configure IVR" button on the phone numbers list navigates here instead of opening the dialog
- Keep the dialog as a simplified "quick edit" option

---

### Phase 2 Roadmap (Future -- not implemented now)

These features were identified from the Ringover comparison and are outlined for future implementation:

#### 2A: Call Recording Management
- Toggle recording on/off per call (agent UI button)
- Recording rules: auto-record all, only inbound, only specific agents
- Recording storage and playback dashboard
- Pause/resume recording during sensitive info

#### 2B: AI Call Transcription and Summaries
- Post-call AI transcription using Lovable AI (Gemini)
- AI-generated call summaries with key topics
- Searchable transcript archive
- Automatic topic/moment detection

#### 2C: Call Monitoring and Coaching
- Live call dashboard for supervisors
- Listen mode (silent monitoring)
- Whisper mode (speak to agent only)
- Barge mode (join the call)

#### 2D: Power Dialer and Call Campaigns
- Create call campaigns from contact lists
- Auto-dial next number on completion
- Campaign analytics (calls made, connected, duration)
- Voicemail drop (pre-recorded message)

#### 2E: Advanced Call Routing
- Call queues with round-robin, longest-idle, skills-based distribution
- Preferred agent routing
- Call priority / VIP queue skip
- Time-based routing with multiple schedules

---

### Technical Details

**Files to create:**
| File | Purpose |
|------|---------|
| `src/pages/crm/inbox/IvrBuilderPage.tsx` | Full-page IVR visual builder |
| `src/components/ivr/IvrCanvas.tsx` | Pan/zoom canvas with nodes and edges |
| `src/components/ivr/IvrNode.tsx` | Draggable node card component |
| `src/components/ivr/IvrEdge.tsx` | SVG edge/connector component |
| `src/components/ivr/IvrNodeConfig.tsx` | Node property editor panel |
| `src/components/ivr/IvrToolbar.tsx` | Toolbar for adding nodes, saving |
| `src/components/ivr/useIvrBuilder.ts` | State management hook for the tree |
| `src/components/ivr/ivrMigration.ts` | Flat-to-tree config migration utility |
| `src/components/ivr/ivrTypes.ts` | TypeScript types for IVR tree nodes |

**Files to modify:**
| File | Change |
|------|--------|
| `src/App.tsx` | Add route for `/crm/inbox/numbers/:phoneId/ivr` |
| `supabase/functions/twilio-webhook/index.ts` | Process tree-based IVR config |
| `supabase/functions/twilio-ivr-action/index.ts` | Navigate tree nodes based on `current_node_id` param |
| Phone numbers list component | Change "Configure IVR" button to navigate to new builder page |

**No database migration needed** -- `ivr_config` is already a flexible JSON column.

**Dependencies used:** `@dnd-kit/core`, `@dnd-kit/utilities` (already installed).

