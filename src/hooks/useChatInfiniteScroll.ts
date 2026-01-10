import { useRef, useEffect, useCallback, useState } from 'react';

interface UseChatInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number; // pixels from top to trigger load
}

export const useChatInfiniteScroll = ({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 200,
}: UseChatInfiniteScrollOptions) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const isLoadingMoreRef = useRef(false);

  // Scroll to bottom function
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

  // Preserve scroll position after loading more messages
  const preserveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current && isLoadingMoreRef.current) {
      const newScrollHeight = scrollContainerRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - previousScrollHeightRef.current;
      scrollContainerRef.current.scrollTop += scrollDiff;
      isLoadingMoreRef.current = false;
    }
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    // Check if at bottom
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom < 100;
    setIsAtBottom(atBottom);
    setShowScrollToBottom(!atBottom);

    // Check if near top and should load more
    if (scrollTop < threshold && hasMore && !isLoading && !isLoadingMoreRef.current) {
      isLoadingMoreRef.current = true;
      previousScrollHeightRef.current = scrollHeight;
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore, threshold]);

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return {
    scrollContainerRef,
    scrollToBottom,
    preserveScrollPosition,
    isAtBottom,
    showScrollToBottom,
    handleScroll,
  };
};
