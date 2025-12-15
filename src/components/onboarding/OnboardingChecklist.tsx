import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Circle,
  User,
  Users,
  Building2,
  Calendar,
  BookOpen,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: string;
  completed: boolean;
  href?: string;
}

interface OnboardingChecklistProps {
  userRole: string | null;
  variant?: 'floating' | 'inline';
}

export const OnboardingChecklist = ({ userRole, variant = 'floating' }: OnboardingChecklistProps) => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { navigateOrg } = useOrgNavigation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Define checklist items based on role
  const getChecklistItems = (role: string | null): Omit<ChecklistItem, 'completed'>[] => {
    const baseItems: Omit<ChecklistItem, 'completed'>[] = [
      {
        id: 'profile_photo',
        label: 'Add your profile photo',
        description: 'Help your team recognize you',
        icon: User,
        action: 'Add Photo',
        href: '/team',
      },
      {
        id: 'complete_profile',
        label: 'Complete your profile',
        description: 'Add your skills and contact info',
        icon: User,
        action: 'Edit Profile',
        href: '/team',
      },
    ];

    if (role === 'admin' || role === 'owner' || role === 'hr') {
      return [
        ...baseItems,
        {
          id: 'invite_team',
          label: 'Invite your first team member',
          description: 'Grow your team',
          icon: Users,
          action: 'Invite',
          href: '/team',
        },
        {
          id: 'setup_office',
          label: 'Set up your first office',
          description: 'Configure office locations',
          icon: Building2,
          action: 'Add Office',
          href: '/settings',
        },
        {
          id: 'configure_leave',
          label: 'Configure leave policies',
          description: 'Set up leave types and balances',
          icon: Calendar,
          action: 'Configure',
          href: '/settings',
        },
        {
          id: 'explore_wiki',
          label: 'Create your first wiki page',
          description: 'Start documenting',
          icon: BookOpen,
          action: 'Create',
          href: '/wiki',
        },
      ];
    }

    return [
      ...baseItems,
      {
        id: 'explore_wiki',
        label: 'Explore the wiki',
        description: 'Learn about your company',
        icon: BookOpen,
        action: 'Explore',
        href: '/wiki',
      },
    ];
  };

  // Fetch completion status
  useEffect(() => {
    const fetchProgress = async () => {
      if (!user?.id || !currentOrg?.id) return;
      
      setLoading(true);
      try {
        // Check various completion criteria
        const [profileResult, employeesResult, officesResult, wikiResult] = await Promise.all([
          supabase.from('profiles').select('avatar_url, full_name').eq('id', user.id).single(),
          supabase.from('employees').select('id').eq('organization_id', currentOrg.id).limit(2),
          supabase.from('offices').select('id').eq('organization_id', currentOrg.id).limit(1),
          supabase.from('wiki_pages').select('id').eq('organization_id', currentOrg.id).limit(1),
        ]);

        // Get saved progress
        const { data: progress } = await supabase
          .from('onboarding_progress')
          .select('checklist_items, is_completed')
          .eq('user_id', user.id)
          .eq('organization_id', currentOrg.id)
          .single();

        if (progress?.is_completed) {
          setIsDismissed(true);
          setLoading(false);
          return;
        }

        const savedItems = (progress?.checklist_items as Record<string, boolean>) || {};
        
        // Build items with completion status
        const checklistItems = getChecklistItems(userRole);
        const itemsWithStatus: ChecklistItem[] = checklistItems.map(item => {
          let completed = savedItems[item.id] || false;
          
          // Auto-detect some completions
          if (item.id === 'profile_photo' && profileResult.data?.avatar_url) {
            completed = true;
          }
          if (item.id === 'invite_team' && (employeesResult.data?.length || 0) > 1) {
            completed = true;
          }
          if (item.id === 'setup_office' && (officesResult.data?.length || 0) > 0) {
            completed = true;
          }
          if (item.id === 'explore_wiki' && (wikiResult.data?.length || 0) > 0) {
            completed = true;
          }

          return { ...item, completed };
        });

        setItems(itemsWithStatus);
      } catch (error) {
        console.error('Error fetching onboarding progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user?.id, currentOrg?.id, userRole]);

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  const handleDismiss = async () => {
    if (!user?.id || !currentOrg?.id) return;
    
    setIsDismissed(true);
    
    // Save dismissal
    const { error } = await supabase.from('onboarding_progress').upsert({
      user_id: user.id,
      organization_id: currentOrg.id,
      role: userRole || 'owner',
      is_completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,organization_id' });

    if (error) {
      console.error('Error dismissing onboarding checklist:', error);
    }
  };

  const handleItemClick = async (item: ChecklistItem) => {
    if (item.href) {
      navigateOrg(item.href);
    }

    // Mark as completed
    if (!item.completed && user?.id && currentOrg?.id) {
      const updatedItems = { ...items.reduce((acc, i) => ({ ...acc, [i.id]: i.completed }), {}), [item.id]: true };
      
      await supabase.from('onboarding_progress').upsert({
        user_id: user.id,
        organization_id: currentOrg.id,
        role: userRole || 'member',
        checklist_items: updatedItems,
      }, { onConflict: 'user_id,organization_id' });

      setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: true } : i));
    }
  };

  // Only show checklist for owners (first user who signed up the organization)
  if (loading || isDismissed || items.length === 0 || userRole !== 'owner') return null;

  const isInline = variant === 'inline';

  return (
    <Card className={cn(
      "shadow-lg border overflow-hidden",
      isInline 
        ? "w-full mb-4" 
        : "fixed bottom-4 right-4 w-80 z-40"
    )}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-accent/10 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Getting Started</p>
            <p className="text-xs text-muted-foreground">{completedCount} of {totalCount} complete</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {allCompleted && (
            <Badge variant="secondary" className="bg-success/10 text-success text-xs">
              Done!
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Progress value={progress} className="h-1 rounded-none" />

      {/* Items */}
      {isExpanded && (
        <div className={cn("p-2 overflow-y-auto", isInline ? "max-h-none" : "max-h-64")}>
          <div className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all",
                    item.completed 
                      ? "bg-success/5 text-muted-foreground" 
                      : "hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    item.completed ? "bg-success/20" : "bg-muted"
                  )}>
                    {item.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      item.completed && "line-through"
                    )}>
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  {!item.completed && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
