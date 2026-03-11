

## Plan: Stop Google Meet from opening in new tab

**Problem**: When clicking the Google Meet button in the chat composer, the Meet link is created and inserted into the message text, but it also opens in a new browser tab via `window.open()`. The user wants it to only insert the link into the message without auto-opening.

**Change**: Remove line 709 in `src/components/chat/MessageComposer.tsx`:
```
window.open(link, '_blank', 'noopener,noreferrer');
```

This is the only location that auto-opens the Meet link. The InboxComposer does not have this behavior.

