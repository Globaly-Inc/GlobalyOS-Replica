/**
 * EmojiPicker Component
 * Comprehensive emoji picker with search, categories, and recently used
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Smile,
  Hand,
  Heart,
  PartyPopper,
  Lightbulb,
  Cat,
  Coffee,
  Clock,
  Search,
  X,
  SmilePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  EMOJI_CATEGORIES,
  QUICK_REACTION_EMOJIS,
  searchEmojis,
} from '@/lib/emojis';
import { useRecentEmojis } from '@/hooks/useRecentEmojis';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  /** Only show quick reaction row, no full picker */
  quickOnly?: boolean;
  /** Show search bar */
  showSearch?: boolean;
  /** Show recently used section */
  showRecent?: boolean;
  /** Show category tabs */
  showCategories?: boolean;
  /** Popover alignment */
  align?: 'start' | 'center' | 'end';
  /** Popover side */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Already reacted emojis (to show highlight) */
  reactedEmojis?: string[];
  /** Custom trigger element */
  trigger?: React.ReactNode;
  /** Control open state externally */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  smileys: <Smile className="h-4 w-4" />,
  gestures: <Hand className="h-4 w-4" />,
  hearts: <Heart className="h-4 w-4" />,
  celebrations: <PartyPopper className="h-4 w-4" />,
  objects: <Lightbulb className="h-4 w-4" />,
  animals: <Cat className="h-4 w-4" />,
  food: <Coffee className="h-4 w-4" />,
};

export const EmojiPicker = ({
  onSelect,
  onClose,
  quickOnly = false,
  showSearch = true,
  showRecent = true,
  showCategories = true,
  align = 'start',
  side = 'top',
  reactedEmojis = [],
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: EmojiPickerProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { recentEmojis, addRecentEmoji } = useRecentEmojis();
  
  // Use controlled or internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, showSearch]);

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = useCallback((emoji: string) => {
    addRecentEmoji(emoji);
    onSelect(emoji);
    setIsOpen(false);
    onClose?.();
  }, [onSelect, onClose, addRecentEmoji, setIsOpen]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchEmojis(searchQuery);
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  // Quick reactions picker (minimal version)
  if (quickOnly) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {trigger || (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-full hover:bg-muted"
            >
              <SmilePlus className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align={align} side={side}>
          <div className="flex gap-1 flex-wrap max-w-[240px]">
            {QUICK_REACTION_EMOJIS.map(emoji => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 text-lg hover:bg-muted rounded-full transition-all",
                  reactedEmojis.includes(emoji) && "bg-primary/10 ring-1 ring-primary/30"
                )}
                onClick={() => handleSelect(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Full emoji picker
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full hover:bg-muted"
          >
            <SmilePlus className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[320px] p-0" 
        align={align} 
        side={side}
        sideOffset={8}
      >
        <div className="flex flex-col max-h-[400px]">
          {/* Search bar */}
          {showSearch && (
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search emojis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Search results */}
          {isSearching ? (
            <ScrollArea className="flex-1 h-[280px]">
              <div className="p-2">
                {searchResults.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-2 px-1">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </p>
                    <div className="grid grid-cols-8 gap-0.5">
                      {searchResults.map(emoji => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-9 w-9 p-0 text-xl hover:bg-muted rounded-md transition-all",
                            reactedEmojis.includes(emoji) && "bg-primary/10 ring-1 ring-primary/30"
                          )}
                          onClick={() => handleSelect(emoji)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Smile className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No emojis found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <>
              {/* Quick reactions row */}
              <div className="p-2 border-b border-border">
                <div className="flex gap-0.5 overflow-x-auto">
                  {QUICK_REACTION_EMOJIS.slice(0, 10).map(emoji => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 w-8 p-0 text-lg hover:bg-muted rounded-md flex-shrink-0 transition-all",
                        reactedEmojis.includes(emoji) && "bg-primary/10 ring-1 ring-primary/30"
                      )}
                      onClick={() => handleSelect(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Recently used section */}
              {showRecent && recentEmojis.length > 0 && (
                <div className="p-2 border-b border-border">
                  <div className="flex items-center gap-1.5 mb-1.5 px-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Recently used</span>
                  </div>
                  <div className="flex gap-0.5 flex-wrap">
                    {recentEmojis.slice(0, 16).map(emoji => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 w-8 p-0 text-lg hover:bg-muted rounded-md transition-all",
                          reactedEmojis.includes(emoji) && "bg-primary/10 ring-1 ring-primary/30"
                        )}
                        onClick={() => handleSelect(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category tabs and emojis */}
              {showCategories && (
                <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 flex flex-col min-h-0">
                  <TabsList className="w-full justify-start gap-0.5 p-1 h-auto rounded-none border-b border-border bg-transparent">
                    {Object.entries(EMOJI_CATEGORIES).map(([key]) => (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="h-8 w-8 p-0 data-[state=active]:bg-muted rounded-md"
                        title={EMOJI_CATEGORIES[key].label}
                      >
                        {CATEGORY_ICONS[key]}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  <ScrollArea className="flex-1 h-[180px]">
                    {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
                      <TabsContent key={key} value={key} className="mt-0 p-2">
                        <p className="text-xs text-muted-foreground mb-2 px-1">{category.label}</p>
                        <div className="grid grid-cols-8 gap-0.5">
                          {category.emojis.map(emoji => (
                            <Button
                              key={emoji}
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-9 w-9 p-0 text-xl hover:bg-muted rounded-md transition-all",
                                reactedEmojis.includes(emoji) && "bg-primary/10 ring-1 ring-primary/30"
                              )}
                              onClick={() => handleSelect(emoji)}
                            >
                              {emoji}
                            </Button>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </ScrollArea>
                </Tabs>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
