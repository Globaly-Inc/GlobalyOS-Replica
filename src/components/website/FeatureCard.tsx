import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  comingSoon?: boolean;
  highlighted?: boolean;
  className?: string;
}

export const FeatureCard = ({
  icon: Icon,
  title,
  description,
  comingSoon = false,
  highlighted = false,
  className,
}: FeatureCardProps) => {
  return (
    <div
      className={cn(
        "relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        highlighted
          ? "bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20"
          : "bg-card border-border hover:border-primary/30",
        className
      )}
    >
      {comingSoon && (
        <span className="absolute top-4 right-4 px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
          Coming Soon
        </span>
      )}
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
          highlighted
            ? "bg-gradient-to-br from-primary to-accent"
            : "bg-primary/10"
        )}
      >
        <Icon
          className={cn("w-6 h-6", highlighted ? "text-white" : "text-primary")}
        />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
};
