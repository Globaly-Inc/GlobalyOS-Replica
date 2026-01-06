import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay } from "date-fns";
import { 
  Building2, 
  CreditCard, 
  Users, 
  Settings, 
  Activity,
  ChevronDown,
  ChevronRight,
  User
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ActivityLog {
  id: string;
  admin_user_id: string;
  organization_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  changes: unknown;
  metadata: unknown;
  created_at: string;
  admin_profile?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface OrgActivityTabProps {
  organizationId: string;
}

const ACTION_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  org_created: { label: 'Organization Created', color: 'bg-green-500', icon: Building2 },
  org_updated: { label: 'Organization Updated', color: 'bg-blue-500', icon: Building2 },
  org_activated: { label: 'Organization Activated', color: 'bg-green-500', icon: Building2 },
  org_deactivated: { label: 'Organization Deactivated', color: 'bg-orange-500', icon: Building2 },
  org_deleted: { label: 'Organization Deleted', color: 'bg-red-500', icon: Building2 },
  subscription_created: { label: 'Subscription Created', color: 'bg-green-500', icon: CreditCard },
  subscription_updated: { label: 'Subscription Updated', color: 'bg-blue-500', icon: CreditCard },
  subscription_canceled: { label: 'Subscription Canceled', color: 'bg-red-500', icon: CreditCard },
  payment_recorded: { label: 'Payment Recorded', color: 'bg-green-500', icon: CreditCard },
  coupon_applied: { label: 'Coupon Applied', color: 'bg-purple-500', icon: CreditCard },
  coupon_removed: { label: 'Coupon Removed', color: 'bg-orange-500', icon: CreditCard },
  feature_enabled: { label: 'Feature Enabled', color: 'bg-green-500', icon: Settings },
  feature_disabled: { label: 'Feature Disabled', color: 'bg-orange-500', icon: Settings },
  member_removed: { label: 'Member Removed', color: 'bg-red-500', icon: Users },
  member_role_changed: { label: 'Member Role Changed', color: 'bg-blue-500', icon: Users },
  trial_extended: { label: 'Trial Extended', color: 'bg-purple-500', icon: CreditCard },
};

const ENTITY_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Activities' },
  { value: 'organization', label: 'Organization' },
  { value: 'subscription', label: 'Subscription & Billing' },
  { value: 'member', label: 'Members' },
  { value: 'feature', label: 'Features' },
];

export const OrgActivityTab = ({ organizationId }: OrgActivityTabProps) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchActivities();
  }, [organizationId, filter]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('super_admin_activity_logs')
        .select(`
          *,
          admin_profile:profiles!super_admin_activity_logs_admin_user_id_fkey(
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('entity_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const groupActivitiesByDate = (activities: ActivityLog[]) => {
    const groups: Record<string, ActivityLog[]> = {};
    
    activities.forEach(activity => {
      const date = startOfDay(new Date(activity.created_at));
      const key = date.toISOString();
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(activity);
    });

    return Object.entries(groups).map(([dateKey, items]) => ({
      date: new Date(dateKey),
      items
    }));
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const renderChanges = (changes: unknown) => {
    if (!changes || typeof changes !== 'object') return null;
    const changesObj = changes as Record<string, { from: unknown; to: unknown }>;
    if (Object.keys(changesObj).length === 0) return null;

    return (
      <div className="mt-2 space-y-1 text-sm">
        {Object.entries(changesObj).map(([field, change]) => (
          <div key={field} className="flex items-start gap-2 text-muted-foreground">
            <span className="font-medium capitalize">{field.replace(/_/g, ' ')}:</span>
            <span className="line-through text-destructive/70">{String(change?.from || 'empty')}</span>
            <span>→</span>
            <span className="text-green-600 dark:text-green-400">{String(change?.to || 'empty')}</span>
          </div>
        ))}
      </div>
    );
  };

  const groupedActivities = groupActivitiesByDate(activities);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Log
          </CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter activities" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPE_FILTER_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No activity logs found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Actions performed on this organization will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedActivities.map(group => (
              <div key={group.date.toISOString()}>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-card py-1">
                  {getDateLabel(group.date)}
                </h4>
                <div className="space-y-3 border-l-2 border-muted ml-2 pl-4">
                  {group.items.map(activity => {
                    const config = ACTION_TYPE_CONFIG[activity.action_type] || {
                      label: activity.action_type,
                      color: 'bg-gray-500',
                      icon: Activity
                    };
                    const Icon = config.icon;
                    const changesObj = activity.changes as Record<string, unknown> | null;
                    const hasChanges = changesObj && typeof changesObj === 'object' && Object.keys(changesObj).length > 0;
                    const isExpanded = expandedItems.has(activity.id);
                    const metadataObj = activity.metadata as Record<string, unknown> | null;

                    return (
                      <Collapsible 
                        key={activity.id} 
                        open={isExpanded}
                        onOpenChange={() => hasChanges && toggleExpand(activity.id)}
                      >
                        <div className="relative">
                          <div className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${config.color}`} />
                          <div className="bg-muted/30 rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-3 flex-1">
                                <div className={`p-1.5 rounded-md ${config.color}/10`}>
                                  <Icon className={`h-4 w-4 ${config.color.replace('bg-', 'text-')}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">{config.label}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {activity.entity_type}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    <span>
                                      {activity.admin_profile?.full_name || activity.admin_profile?.email || 'Unknown admin'}
                                    </span>
                                    <span>•</span>
                                    <span title={format(new Date(activity.created_at), 'PPpp')}>
                                      {format(new Date(activity.created_at), 'h:mm a')}
                                    </span>
                                    <span className="text-muted-foreground/60">
                                      ({formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })})
                                    </span>
                                  </div>
                                  {hasChanges && (
                                    <CollapsibleContent>
                                      {renderChanges(activity.changes)}
                                    </CollapsibleContent>
                                  )}
                                  {metadataObj && Object.keys(metadataObj).length > 0 && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      {Object.entries(metadataObj).map(([key, value]) => (
                                        <span key={key} className="mr-3">
                                          <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                                          {String(value)}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {hasChanges && (
                                <CollapsibleTrigger asChild>
                                  <button className="p-1 hover:bg-muted rounded">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </button>
                                </CollapsibleTrigger>
                              )}
                            </div>
                          </div>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
