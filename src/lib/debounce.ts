/**
 * Type-safe debounce utility with cancel and flush support.
 * Used for performance optimization in high-frequency event handlers.
 */

export type DebouncedFunction<T extends (...args: unknown[]) => void> = T & {
  /** Cancel any pending debounced call */
  cancel: () => void;
  /** Immediately execute any pending debounced call */
  flush: () => void;
  /** Check if there's a pending debounced call */
  pending: () => boolean;
};

/**
 * Creates a debounced version of a function that delays invocation until
 * after `delay` milliseconds have elapsed since the last call.
 * 
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function with cancel, flush, and pending methods
 * 
 * @example
 * ```ts
 * const debouncedSave = debounce((content: string) => {
 *   saveToServer(content);
 * }, 150);
 * 
 * // Call multiple times - only last call executes after 150ms
 * debouncedSave("draft 1");
 * debouncedSave("draft 2");
 * debouncedSave("draft 3"); // Only this one runs
 * 
 * // Cancel pending execution
 * debouncedSave.cancel();
 * 
 * // Execute immediately if pending
 * debouncedSave.flush();
 * ```
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown = null;

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      if (lastArgs) {
        fn.apply(lastThis, lastArgs);
      }
      timeoutId = null;
      lastArgs = null;
      lastThis = null;
    }, delay);
  } as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = null;
    lastArgs = null;
    lastThis = null;
  };

  debounced.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      fn.apply(lastThis, lastArgs);
      timeoutId = null;
      lastArgs = null;
      lastThis = null;
    }
  };

  debounced.pending = () => {
    return timeoutId !== null;
  };

  return debounced;
}

/**
 * Creates a throttled version of a function that only invokes at most once
 * per every `limit` milliseconds.
 * 
 * @param fn - The function to throttle
 * @param limit - Minimum time between invocations in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = limit - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn.apply(this, args);
      }, remaining);
    }
  } as T;
}
