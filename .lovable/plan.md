

# Inline Search Bar in Chat Header

## Overview

Redesign the search experience by integrating search directly into the header's right action bar. The search icon stays next to the Mute icon (rightmost position), and when clicked, expands into an inline search bar with dropdown results - no separate dialogue box.

---

## Current State

```text
+---------------------------------------------------------------+
| [Avatar] Name & Status              [Mute] [Favorite] [Search] |
+---------------------------------------------------------------+
| (MessageSearch appears as separate panel below when open)      |
+---------------------------------------------------------------+
```

---

## New Design

### Collapsed State (Default)
```text
+---------------------------------------------------------------+
| [Avatar] Name & Status              [Search] [Mute] [Favorite] |
+---------------------------------------------------------------+
```

### Expanded State (Search Active)
```text
+---------------------------------------------------------------+
| [🔍 Search messages..._____] [X]           [Mute] [Favorite]   |
+---------------------------------------------------------------+
| ┌─────────────────────────────────────────────────────────┐    |
| │  3 results                                    1/3 [↑][↓] │    |
| ├─────────────────────────────────────────────────────────┤    |
| │  [👤] John: "Hey, about the project..." (Jan 28, 2pm)   │    |
| │  [👤] Sarah: "The meeting is scheduled..." (Jan 27)     │    |
| │  [👤] Mike: "Let me check the files..." (Jan 26)        │    |
| └─────────────────────────────────────────────────────────┘    |
+---------------------------------------------------------------+
```

---

## Implementation Details

### 1. Modify ChatHeader Layout Structure

**File: `src/components/chat/ChatHeader.tsx`**

Reorganize the right action bar to support inline search expansion:

#### State Changes
```typescript
const [showSearch, setShowSearch] = useState(false);
const [searchQuery, setSearchQuery] = useState("");
const searchInputRef = useRef<HTMLInputElement>(null);

// Focus input when search opens
useEffect(() => {
  if (showSearch && searchInputRef.current) {
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }
}, [showSearch]);

// Clear query when closing
const handleCloseSearch = () => {
  setShowSearch(false);
  setSearchQuery("");
};
```

#### New Right Section Layout
```tsx
{/* RIGHT SECTION - Action buttons with inline search */}
<div className="flex items-center gap-0.5 flex-shrink-0">
  {/* Inline Search Bar - expands when active */}
  {showSearch ? (
    <div className="flex items-center gap-1.5 mr-1">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="h-8 w-[200px] md:w-[260px] pl-8 pr-7 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleCloseSearch}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setShowSearch(true)}
        >
          <Search className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Search messages</TooltipContent>
    </Tooltip>
  )}

  {/* Mute Button - stays in place */}
  <Tooltip>...</Tooltip>

  {/* Favorite Button - stays in place */}
  <Tooltip>...</Tooltip>
</div>
```

---

### 2. Create Inline Search Results Component

**File: `src/components/chat/InlineSearchResults.tsx` (NEW)**

A dropdown component that appears below the search input with results:

```typescript
interface InlineSearchResultsProps {
  query: string;
  conversationId: string | null;
  spaceId: string | null;
  onResultClick: (messageId: string) => void;
  onClose: () => void;
}

const InlineSearchResults = ({
  query,
  conversationId,
  spaceId,
  onResultClick,
  onClose,
}: InlineSearchResultsProps) => {
  // State: results, isSearching, currentIndex
  // Debounced search effect (reuse logic from MessageSearch)
  // Keyboard navigation (arrow keys, enter, escape)
  // Result highlighting
  
  return (
    <div className="absolute right-0 top-full mt-1 z-30 
                    w-[320px] md:w-[400px]
                    bg-card border border-border rounded-lg shadow-lg 
                    max-h-[400px] overflow-hidden">
      {/* Header with result count and navigation */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <span className="text-xs text-muted-foreground">
          {isSearching ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
        </span>
        {results.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs">{currentIndex + 1}/{results.length}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6">
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6">
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Results list */}
      <ScrollArea className="max-h-[340px]">
        {results.map((result, index) => (
          <div
            key={result.id}
            className={cn(
              "flex items-start gap-2 px-3 py-2.5 cursor-pointer border-b border-border/50 last:border-0",
              index === currentIndex ? "bg-accent" : "hover:bg-muted/50"
            )}
            onClick={() => { onResultClick(result.id); onClose(); }}
          >
            <Avatar className="h-7 w-7">...</Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{result.sender.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(result.created_at), "MMM d, h:mm a")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {highlightMatch(result.content, query)}
              </p>
            </div>
          </div>
        ))}
      </ScrollArea>

      {/* Empty state */}
      {!isSearching && query.trim() && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No messages found</p>
        </div>
      )}
    </div>
  );
};
```

---

### 3. Integrate Search Results in ChatHeader

**File: `src/components/chat/ChatHeader.tsx`**

Add the dropdown results component positioned relative to the right action bar:

```tsx
return (
  <>
    <div className="relative flex items-center justify-between px-4 py-3 border-b ...">
      {/* Left section - Avatar + Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* ... existing avatar and name content ... */}
      </div>

      {/* Right section - Actions with inline search */}
      <div className="relative flex items-center gap-0.5 flex-shrink-0">
        {/* Search icon or expanded search bar */}
        {/* Mute button */}
        {/* Favorite button */}
        
        {/* Inline search results dropdown */}
        {showSearch && searchQuery.trim() && (
          <InlineSearchResults
            query={searchQuery}
            conversationId={conversationId}
            spaceId={spaceId}
            onResultClick={handleSearchResultClick}
            onClose={handleCloseSearch}
          />
        )}
      </div>
    </div>

    {/* Remove old MessageSearch component */}
  </>
);
```

---

### 4. Remove Old MessageSearch Usage

- Remove the `<MessageSearch>` component from ChatHeader (lines 571-578)
- Keep the file for potential future use or as reference

---

## UX Enhancements

| Feature | Implementation |
|---------|----------------|
| **Keyboard navigation** | Arrow keys navigate results, Enter selects, Escape closes |
| **Auto-focus** | Input automatically focuses when search opens |
| **Clear button** | X button inside input clears query only |
| **Close button** | Separate X button closes the entire search mode |
| **Live search** | Results appear as you type (300ms debounce) |
| **Result highlighting** | Matched text highlighted in yellow |
| **Click outside** | Optional: clicking outside closes the dropdown |
| **Result count** | Shows "X results" with navigation arrows |
| **Smooth scroll** | Clicking result scrolls to message with highlight animation |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↓` / `↑` | Navigate through results |
| `Enter` | Jump to selected result |
| `Escape` | Close search |
| `Backspace` (empty) | Close search |

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/chat/ChatHeader.tsx` | Restructure right section, add inline search bar |
| `src/components/chat/InlineSearchResults.tsx` | **NEW** - Dropdown results component |
| `src/components/chat/MessageSearch.tsx` | No longer used in header (can keep or remove) |

---

## Visual Flow

### User Flow

1. **Initial state**: Search icon visible on the right, next to Mute icon
2. **Click search icon**: Icon transforms into search input with focus
3. **Start typing**: Dropdown appears below with live search results
4. **Navigate results**: Use arrow keys or click to select
5. **Select result**: Message scrolls into view with highlight, search closes
6. **Cancel search**: Click X or press Escape to close and reset

### Position Details

- Search bar appears inline within the right action group
- Dropdown results align to the right edge of the header
- Avatar and name remain visible when search is active
- Mute and Favorite buttons stay accessible

---

## Technical Notes

- Use `relative` positioning on the right action container for dropdown placement
- Dropdown uses `absolute right-0 top-full` to appear below and aligned right
- Search input width is responsive: `w-[200px] md:w-[260px]`
- Results dropdown width: `w-[320px] md:w-[400px]`
- Z-index of 30 ensures dropdown appears above other content

