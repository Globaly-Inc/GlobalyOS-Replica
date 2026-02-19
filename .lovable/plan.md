

# Sendbird Calls Integration Plan

## Overview

Integrate Sendbird Calls SDK into GlobalyOS to add real-time voice and video calling (1:1 and group) to the existing chat module. The current custom-built chat stays untouched -- we only layer calling on top.

## What You Get

- **1:1 voice and video calls** directly from any DM conversation
- **Group video calls** (up to 6 participants) from group chats and spaces
- **Group audio calls** (up to 100 participants) for larger spaces
- **In-call controls**: mute, camera toggle, screen share, speaker selection
- **Call history**: automatic call log messages posted into the chat thread
- **Incoming call UI**: full-screen ring overlay with accept/decline
- **Feature-flagged**: controlled via the existing Super Admin feature flags system

---

## Prerequisites

1. **Sendbird Account** -- Create a free trial at sendbird.com, enable the Calls product, and obtain:
   - **Application ID** (public, stored in code)
   - **API Token** (secret, stored as backend secret for user token generation)
2. **User Mapping** -- Each GlobalyOS employee will be registered as a Sendbird user (using their `employee_id` as the Sendbird user ID)

---

## Architecture

```text
+------------------+       +-------------------+       +------------------+
|  ChatHeader.tsx  |       | CallOverlay.tsx   |       | Sendbird Calls   |
|  (call buttons)  | ----> | (full-screen UI)  | <---> | WebRTC SDK       |
+------------------+       +-------------------+       +------------------+
                                    |
                                    v
                            +-------------------+
                            | sb-auth Edge Fn   |
                            | (issues session   |
                            |  tokens per user) |
                            +-------------------+
                                    |
                                    v
                            +-------------------+
                            | Sendbird Platform  |
                            | API (user mgmt)    |
                            +-------------------+
```

---

## Implementation Steps

### Step 1: Backend -- Edge Function for Sendbird Auth

Create `supabase/functions/sb-auth/index.ts`:
- Accepts authenticated requests from the frontend
- Calls Sendbird Platform API to create/update the user if not exists (using employee_id, full_name, avatar_url)
- Issues a Sendbird **session token** for the user
- Returns the token + app_id to the frontend
- Requires `SENDBIRD_APP_ID` and `SENDBIRD_API_TOKEN` secrets

### Step 2: Frontend -- Sendbird Calls Provider

Create `src/providers/SendbirdCallsProvider.tsx`:
- Wraps the app (inside the auth boundary)
- On mount, calls the `sb-auth` edge function to get a session token
- Initializes `SendBirdCall.init(APP_ID)` and authenticates
- Registers event handlers for incoming calls
- Provides context: `{ isReady, startDirectCall, createRoom, joinRoom }`

### Step 3: Call UI Components

**a) `src/components/chat/CallButtons.tsx`**
- Renders phone + video icons in the ChatHeader
- For DMs: triggers `startDirectCall(otherEmployeeId, isVideoCall)`
- For groups/spaces: creates a Sendbird Room, posts an invite message, and joins

**b) `src/components/chat/CallOverlay.tsx`**
- Full-screen overlay shown during active calls
- Displays local + remote video streams
- Controls: mute mic, toggle camera, screen share, end call
- Duration timer
- For group calls: grid layout of participant video tiles

**c) `src/components/chat/IncomingCallDialog.tsx`**
- Modal shown when receiving an incoming direct call
- Shows caller name/avatar, call type (audio/video)
- Accept / Decline buttons with ringtone

### Step 4: Call Log Messages

When a call ends:
- Post a `call_log` type message into the conversation/space
- Uses the existing `CallLogData` type already defined in `src/types/chat.ts`
- Create `src/components/chat/CallLogMessage.tsx` to render these in the message list (duration, type, missed/ended status)

### Step 5: ChatHeader Integration

Update `src/components/chat/ChatHeader.tsx`:
- Add Phone and Video icons to the action bar (next to Search)
- DM conversations: show both audio and video call buttons
- Group chats / spaces: show a "Start call" button that opens a group room
- Only visible when the `calls` feature flag is enabled

### Step 6: Feature Flag + Super Admin

- Add `calls` to the `AVAILABLE_FEATURES` array in `OrganizationFeaturesManager.tsx`
- Gate all call UI behind `useFeatureFlag('calls')` checks

### Step 7: User Registration Sync

Create `supabase/functions/sb-sync-user/index.ts`:
- Called when an employee profile updates (name, avatar change)
- Updates the corresponding Sendbird user to keep metadata in sync
- Can be triggered by a database webhook on the `employees` / `profiles` tables

---

## Technical Details

### NPM Package
- Install `sendbird-calls` (Sendbird Calls JavaScript SDK, ~150KB gzipped)

### Key SDK Methods Used
- `SendBirdCall.init(appId)` -- initialize
- `SendBirdCall.authenticate({ userId, accessToken })` -- auth with session token
- `SendBirdCall.dial({ userId, isVideoCall, callOption })` -- 1:1 call
- `SendBirdCall.createRoom({ roomType })` -- group call room
- `room.enter({ audioEnabled, videoEnabled })` -- join group call
- Event handlers: `onRinging`, `onEstablished`, `onEnded`, `onRemoteAudioSettingsChanged`

### Files Created (7 new)
1. `supabase/functions/sb-auth/index.ts`
2. `supabase/functions/sb-sync-user/index.ts`
3. `src/providers/SendbirdCallsProvider.tsx`
4. `src/components/chat/CallButtons.tsx`
5. `src/components/chat/CallOverlay.tsx`
6. `src/components/chat/IncomingCallDialog.tsx`
7. `src/components/chat/CallLogMessage.tsx`

### Files Modified (4)
1. `src/components/chat/ChatHeader.tsx` -- add call buttons
2. `src/components/chat/MessageBubble.tsx` -- render call log messages
3. `src/components/super-admin/OrganizationFeaturesManager.tsx` -- add `calls` flag
4. `src/App.tsx` -- wrap with SendbirdCallsProvider

### Secrets Required
- `SENDBIRD_APP_ID` -- your Sendbird application ID
- `SENDBIRD_API_TOKEN` -- your Sendbird API token (from Sendbird Dashboard > Settings > General > API Token)

