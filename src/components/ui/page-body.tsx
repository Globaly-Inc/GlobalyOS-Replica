import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageBodyProps {
  children: ReactNode;
  className?: string;
  /** Adds extra bottom padding for mobile fixed elements (e.g., bottom nav, fixed input) */
  mobileBottomPadding?: boolean;
}

/**
 * PageBody - Standard wrapper for org-scoped page content
 * 
 * GUIDELINES:
 * - Use this as the root wrapper for all org-scoped page content
 * - DO NOT add `container`, `px-*`, or `max-w-*` classes to your page
 * - Layout.tsx already provides: container, px-4, md:px-8
 * - Only add vertical spacing (space-y-*) and vertical padding (py-*)
 * 
 * @example
 * return (
 *   <PageBody>
 *     <PageHeader title="My Page" />
 *     <Card>...</Card>
 *   </PageBody>
 * );
 */
export function PageBody({ 
  children, 
  className,
  mobileBottomPadding = false 
}: PageBodyProps) {
  return (
    <div className={cn(
      "space-y-4 md:space-y-6",
      mobileBottomPadding && "pb-24 md:pb-6",
      className
    )}>
      {children}
    </div>
  );
}
