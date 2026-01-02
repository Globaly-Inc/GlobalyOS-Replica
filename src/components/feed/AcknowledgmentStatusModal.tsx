/**
 * Acknowledgment Status Modal
 * Shows the acknowledgment progress and list of team members for a post
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Check, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { usePostAcknowledgments, useTargetEmployeesCount } from '@/services/useSocialFeed';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface AcknowledgmentStatusModalProps {
  postId: string;
  postAuthorId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Employee {
  id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

export const AcknowledgmentStatusModal = ({
  postId,
  postAuthorId,
  open,
  onOpenChange,
}: AcknowledgmentStatusModalProps) => {
  const [filter, setFilter] = useState<'all' | 'acknowledged' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { currentOrg } = useOrganization();
  const { data: acknowledgments = [], isLoading: loadingAcks } = usePostAcknowledgments(postId);
  const { data: targetCount = 0 } = useTargetEmployeesCount(postId);
  
  // Fetch all employees for comparison
  const { data: allEmployees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['org-employees-for-ack', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      const { data, error } = await supabase
        .from('employees')
        .select('id, profiles!inner(full_name, avatar_url)')
        .eq('organization_id', currentOrg.id)
        .eq('status', 'active');
      
      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!currentOrg?.id && open,
  });

  const acknowledgedIds = useMemo(
    () => new Set(acknowledgments.map(a => a.employee_id)),
    [acknowledgments]
  );

  const acknowledgedEmployees = useMemo(
    () => acknowledgments.map(ack => ({
      ...ack.employee!,
      acknowledgedAt: ack.acknowledged_at,
    })),
    [acknowledgments]
  );

  // Exclude the post author from pending list (they don't need to acknowledge)
  const pendingEmployees = useMemo(
    () => allEmployees.filter(emp => !acknowledgedIds.has(emp.id) && emp.id !== postAuthorId),
    [allEmployees, acknowledgedIds, postAuthorId]
  );

  // Also exclude author from total count
  const totalEmployeesExcludingAuthor = useMemo(
    () => allEmployees.filter(emp => emp.id !== postAuthorId).length,
    [allEmployees, postAuthorId]
  );

  const displayedEmployees = useMemo(() => {
    let employees: (Employee & { acknowledgedAt?: string })[] = [];
    
    if (filter === 'all') {
      employees = [
        ...acknowledgedEmployees,
        ...pendingEmployees.map(e => ({ ...e, acknowledgedAt: undefined })),
      ];
    } else if (filter === 'acknowledged') {
      employees = acknowledgedEmployees;
    } else {
      employees = pendingEmployees.map(e => ({ ...e, acknowledgedAt: undefined }));
    }

    if (searchQuery) {
      employees = employees.filter(emp =>
        emp.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return employees;
  }, [filter, acknowledgedEmployees, pendingEmployees, searchQuery]);

  const acknowledgedCount = acknowledgments.length;
  const totalCount = totalEmployeesExcludingAuthor;
  const progressPercent = totalCount > 0 ? Math.round((acknowledgedCount / totalCount) * 100) : 0;

  const isLoading = loadingAcks || loadingEmployees;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Acknowledgment Status
          </DialogTitle>
        </DialogHeader>

        {/* Progress Section */}
        <div className="space-y-3 pb-4 border-b">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {acknowledgedCount} of {totalCount} team members acknowledged
            </span>
            <span className="font-semibold text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-xs">
              All ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="acknowledged" className="text-xs">
              <Check className="h-3 w-3 mr-1" />
              Done ({acknowledgedCount})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Pending ({totalCount - acknowledgedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Employee List */}
        <ScrollArea className="flex-1 -mx-2 px-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : displayedEmployees.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No team members found
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {displayedEmployees.map((employee) => {
                const isAcknowledged = !!employee.acknowledgedAt;
                
                return (
                  <div
                    key={employee.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      isAcknowledged ? "bg-green-500/5" : "bg-muted/30"
                    )}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={employee.profiles.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {employee.profiles.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {employee.profiles.full_name}
                      </p>
                      {isAcknowledged ? (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {format(new Date(employee.acknowledgedAt!), 'MMM d, yyyy • h:mm a')}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Not yet acknowledged
                        </p>
                      )}
                    </div>

                    <Badge
                      variant={isAcknowledged ? 'default' : 'secondary'}
                      className={cn(
                        "text-xs",
                        isAcknowledged && "bg-green-500 hover:bg-green-600"
                      )}
                    >
                      {isAcknowledged ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Done
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </>
                      )}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
