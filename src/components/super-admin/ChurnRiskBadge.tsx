import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
}> = {
  high: {
    label: 'High Risk',
    variant: 'destructive',
    className: '',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Medium Risk',
    variant: 'secondary',
    className: 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300',
    icon: AlertCircle,
  },
  low: {
    label: 'Low Risk',
    variant: 'secondary',
    className: 'bg-orange-100 text-orange-700 dark:text-orange-400 border-orange-200',
    icon: TrendingDown,
  },
  healthy: {
    label: 'Healthy',
    variant: 'secondary',
    className: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300',
    icon: CheckCircle,
  },
  new: {
    label: 'New',
    variant: 'secondary',
    className: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300',
    icon: Sparkles,
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
      className={`${config.className} ${sizeClasses} gap-1`}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {config.label}
    </Badge>
  );

  if (!showTooltip || !reason || level === 'healthy' || level === 'new') {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-sm">{reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ChurnRiskBadge;
