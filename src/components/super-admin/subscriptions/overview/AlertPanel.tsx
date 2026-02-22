import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SubscriptionAlert } from '@/types/subscriptions';

interface AlertPanelProps {
  alerts: SubscriptionAlert[];
}

const severityConfig = {
  critical: { icon: AlertCircle, border: 'border-l-destructive', iconColor: 'text-destructive', bg: 'bg-destructive/5' },
  warning: { icon: AlertTriangle, border: 'border-l-amber-500', iconColor: 'text-amber-500', bg: 'bg-amber-500/5' },
  info: { icon: Info, border: 'border-l-emerald-500', iconColor: 'text-emerald-500', bg: 'bg-emerald-500/5' },
};

const AlertPanel = ({ alerts }: AlertPanelProps) => (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold text-foreground">Action Items</h3>
    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
      {alerts.map((alert) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;
        return (
          <div key={alert.id} className={cn('rounded-md border border-l-4 p-3', config.border, config.bg)}>
            <div className="flex items-start gap-2">
              <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', config.iconColor)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{alert.message}</p>
                <Link to={alert.action_path}>
                  <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs gap-1">
                    {alert.action_label} <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default AlertPanel;
