import { cn } from "@/lib/utils";

interface ComingSoonBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export const ComingSoonBadge = ({
  className,
  size = "md",
}: ComingSoonBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full bg-primary/10 text-primary",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className
      )}
    >
      Coming Soon
    </span>
  );
};
