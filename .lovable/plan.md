

# Inline Search Bar in Chat Header

## Overview

Redesign the search experience by integrating the search functionality directly into the header. The search icon moves to the left and expands into an inline search bar when activated, with results appearing as a dropdown below.

---

## Current State

```text
+---------------------------------------------------------------+
| [Avatar] Name & Status            [Mute] [Favorite] [Search]  |
+---------------------------------------------------------------+
| (MessageSearch appears as separate panel below when open)     |
+---------------------------------------------------------------+
```

---

## New Design

### Collapsed State (Default)
```text
+---------------------------------------------------------------+
| [Search Icon] | [Avatar] Name & Status    [Mute] [Favorite]   |
+---------------------------------------------------------------+
```

### Expanded State (Search Active)
```text
+---------------------------------------------------------------+
| [🔍 Search messages...________] [X]    [Mute] [Favorite]      |
+---------------------------------------------------------------+
| ┌─────────────────────────────────────────────────────────┐   |
| │  Results appear in dropdown below search bar            │   |
| │  ┌─ John: "Hey, about the project..." (Jan 28, 2pm) ─┐  │   |
| │  └─ Sarah: "The meeting is scheduled..." (Jan 27) ──┘   │   |
| └─────────────────────────────────────────────────────────┘   |
+---------------------------------------------------------------+
```

---

## Implementation Details

### 1. Modify ChatHeader Layout

**File: `src/components/chat/ChatHeader.tsx`**

Restructure the header to include an inline search section:

```tsx
// State change
const [showSearch, setShowSearch] = useState(false);
const [searchQuery, setSearchQuery] = useState("");
const searchInputRef = useRef<HTMLInputElement>(null);

// Focus input when search opens
useEffect(() => {
  if (showSearch && searchInputRef.current) {
    searchInputRef.current.focus();
  }
}, [showSearch]);

// Handle escape key
const handleSearchKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    setShowSearch(false);
    setSearchQuery("");
  }
};
```

Update the header JSX structure:

```tsx
<div className="flex items-center justify-between px-4 py-3 border-b ...">
  {/* LEFT SECTION - Search (toggles between icon and input) */}
  <div className="flex items-center gap-2">
    {showSearch ? (
      // Expanded search bar
      <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-[400px]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9 pr-8 h-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 ..."
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    ) : (
      // Collapsed search icon
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowSearch(true)}>
            <Search className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Search messages</TooltipContent>
      </Tooltip>
    )}
  </div>

  {/* MIDDLE SECTION - Avatar + Chat Info (conditionally hidden when searching) */}
  {!showSearch && (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {/* Avatar and name content */}
    </div>
  )}

  {/* RIGHT SECTION - Mute + Favorite buttons */}
  <div className="flex items-center gap-0.5 flex-shrink-0">
    {/* Mute and Favorite buttons only - Search removed from here */}
  </div>
</div>
```

---

### 2. Create New Inline Search Results Component

**File: `src/components/chat/InlineSearchResults.tsx` (NEW)**

Create a dropdown results component that appears below the search input:

```tsx
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
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Debounced search effect (same logic as current MessageSearch)
  useEffect(() => {
    // ... search logic
  }, [query, conversationId, spaceId]);

  if (!query.trim()) return null;

  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-30 
                    bg-card border border-border rounded-lg shadow-lg 
                    max-h-[350px] overflow-hidden">
      {/* Header with result count and navigation */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-xs text-muted-foreground">
          {isSearching ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
        </span>
        {results.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{currentIndex + 1} of {results.length}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigateResult('up')}>
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigateResult('down')}>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Results list */}
      <ScrollArea className="max-h-[300px]">
        {results.map((result, index) => (
          <div
            key={result.id}
            className={cn(
              "flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors border-b border-border/50 last:border-0",
              index === currentIndex ? "bg-accent" : "hover:bg-muted/50"
            )}
            onClick={() => { setCurrentIndex(index); onResultClick(result.id); onClose(); }}
          >
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarImage src={result.sender.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">{getInitials(result.sender.name)}</AvatarFallback>
            </Avatar>
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
          <p className="text-sm text-muted-foreground">No messages found for "{query}"</p>
        </div>
      )}
    </div>
  );
};
```

---

### 3. Integrate Search Results in ChatHeader

**File: `src/components/chat/ChatHeader.tsx`**

Add the inline results component with proper positioning:

```tsx
return (
  <>
    <div className="relative flex items-center justify-between px-4 py-3 ...">
      {/* ... header content ... */}
      
      {/* Inline search results dropdown (appears when searching) */}
      {showSearch && searchQuery.trim() && (
        <InlineSearchResults
          query={searchQuery}
          conversationId={conversationId}
          spaceId={spaceId}
          onResultClick={handleSearchResultClick}
          onClose={() => { setShowSearch(false); setSearchQuery(""); }}
        />
      )}
    </div>
  </>
);
```

---

### 4. Remove Old MessageSearch Usage

- Remove the `<MessageSearch>` component usage from ChatHeader
- Keep the file for potential future use or delete it

---

## UX Enhancements

| Feature | Implementation |
|---------|----------------|
| Keyboard navigation | Arrow keys to navigate results, Enter to select, Escape to close |
| Auto-focus | Input automatically focuses when search opens |
| Clear button | X button inside input clears query without closing search |
| Close button | Separate X button closes the entire search mode |
| Smooth transitions | Animate width expansion when switching to search mode |
| Result highlighting | Matched text highlighted in yellow |
| Click outside to close | Clicking outside the search area closes the dropdown |
| Result selection | Clicking a result scrolls to message and highlights it |

---

## Animation & Transitions

Add smooth width transition when toggling search:

```tsx
// Transition classes for search container
className={cn(
  "transition-all duration-200 ease-in-out",
  showSearch ? "flex-1" : "w-9"
)}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/chat/ChatHeader.tsx` | Major restructure - move search left, add inline input |
| `src/components/chat/InlineSearchResults.tsx` | **NEW** - Dropdown results component |
| `src/components/chat/MessageSearch.tsx` | Can be removed or kept for reference |

---

## Visual Flow

### User Flow

1. **Initial state**: Search icon visible on the far left of header
2. **Click search icon**: Icon expands into full search input with focus
3. **Start typing**: Results dropdown appears below with live search
4. **Navigate results**: Use arrow keys or click to select
5. **Select result**: Message scrolls into view with highlight, search closes
6. **Cancel search**: Click X or press Escape to close and reset

### Responsive Behavior

- On desktop: Full search bar with adequate width
- On mobile: Search bar takes full available width when active
- Avatar and name hide when search is active to maximize input space

