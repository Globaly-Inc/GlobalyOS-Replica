import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertTriangle, AlertCircle, CheckCircle, Sparkles, TrendingDown } from "lucide-react";
import { RiskLevel } from "@/hooks/useChurnRisk";

interface ChurnRiskBadgeProps {
  level: RiskLevel;
  reason?: string;
  showTooltip?: boolean;
  size?: 'sm' | 'default';
}

const riskConfig: Record<RiskLevel, {
  label: string;
  variant: 'destructive' | 'secondary' | 'outline' | 'default';
  className: string;
  icon: typeof AlertTriangle | null;
  description: string;
  recommendation: string;
}> = {
  high: {
    label: 'High Risk',
    variant: 'destructive',
    className: '',
    icon: AlertTriangle,
    description: 'This organisation shows critical signs of disengagement and may churn soon.',
    recommendation: 'Consider reaching out immediately with a personal check-in or special offer.',
  },
  medium: {
    label: 'Medium Risk',
    variant: 'secondary',
    className: 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300',
    icon: AlertCircle,
    description: 'Activity levels are declining. Engagement is trending downward.',
    recommendation: 'Monitor closely and consider proactive engagement strategies.',
  },
  low: {
    label: 'Low Risk',
    variant: 'secondary',
    className: 'bg-orange-100 text-orange-700 dark:text-orange-400 border-orange-200',
    icon: TrendingDown,
    description: 'Some early warning signs detected but not yet critical.',
    recommendation: 'Keep an eye on activity trends over the next few weeks.',
  },
  healthy: {
    label: 'Healthy',
    variant: 'secondary',
    className: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300',
    icon: CheckCircle,
    description: 'This organisation shows strong, consistent engagement.',
    recommendation: 'No action needed. Continue providing value.',
  },
  new: {
    label: 'New',
    variant: 'secondary',
    className: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300',
    icon: Sparkles,
    description: 'Recently onboarded organisation still in evaluation period.',
    recommendation: 'Focus on activation and onboarding support.',
  },
};

const ChurnRiskBadge = ({ 
  level, 
  reason, 
  showTooltip = true,
  size = 'default',
}: ChurnRiskBadgeProps) => {
  const config = riskConfig[level];
  const Icon = config.icon;
  
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : '';

  const badge = (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${sizeClasses} gap-1 cursor-pointer`}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {config.label}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {badge}
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        className="w-72 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`h-4 w-4 ${level === 'high' ? 'text-destructive' : level === 'medium' ? 'text-amber-600' : level === 'low' ? 'text-orange-600' : level === 'healthy' ? 'text-emerald-600' : 'text-blue-600'}`} />}
            <span className="font-semibold text-sm">{config.label}</span>
          </div>
          
          {reason && (
            <div className="text-xs bg-muted/50 rounded px-2 py-1.5 border border-border/50">
              <span className="font-medium">Trigger:</span> {reason}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground leading-relaxed">
            {config.description}
          </p>
          
          <div className="pt-1 border-t border-border/50">
            <p className="text-xs">
              <span className="font-medium text-foreground">Recommendation:</span>{' '}
              <span className="text-muted-foreground">{config.recommendation}</span>
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ChurnRiskBadge;
