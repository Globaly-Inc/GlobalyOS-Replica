import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Building2, 
  Clock,
  RefreshCw,
  Eye,
  CheckCircle,
  VolumeX,
  Loader2,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { 
  useErrorPatterns, 
  useTrendingPatterns, 
  useUpdatePatternStatus,
  useCalculateTrendingScores,
  type ErrorPattern 
} from '@/services/useErrorPatterns';

const statusConfig = {
  active: { label: 'Active', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  acknowledged: { label: 'Acknowledged', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  muted: { label: 'Muted', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300' },
};

const ErrorPatternsDashboard = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [selectedPattern, setSelectedPattern] = useState<ErrorPattern | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [pendingAction, setPendingAction] = useState<ErrorPattern['status'] | null>(null);

  const { data: patterns, isLoading } = useErrorPatterns({ 
    status: statusFilter === 'all' ? undefined : statusFilter 
  });
  const { data: trendingPatterns } = useTrendingPatterns(5);
  const updateStatus = useUpdatePatternStatus();
  const calculateScores = useCalculateTrendingScores();

  const handleStatusChange = async () => {
    if (!selectedPattern || !pendingAction) return;
    
    try {
      await updateStatus.mutateAsync({
        id: selectedPattern.id,
        status: pendingAction,
        notes: actionNotes || undefined,
      });
      toast.success(`Pattern marked as ${pendingAction}`);
      setActionDialogOpen(false);
      setSelectedPattern(null);
      setActionNotes('');
      setPendingAction(null);
    } catch (error) {
      toast.error('Failed to update pattern status');
    }
  };

  const openActionDialog = (pattern: ErrorPattern, action: ErrorPattern['status']) => {
    setSelectedPattern(pattern);
    setPendingAction(action);
    setActionNotes(pattern.notes || '');
    setActionDialogOpen(true);
  };

  const handleRefreshScores = async () => {
    try {
      await calculateScores.mutateAsync();
      toast.success('Trending scores recalculated');
    } catch (error) {
      toast.error('Failed to recalculate scores');
    }
  };

  return (
    <div className="space-y-6">
      {/* Trending Patterns Header */}
      {trendingPatterns && trendingPatterns.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <TrendingUp className="h-5 w-5" />
              Trending Issues ({trendingPatterns.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {trendingPatterns.slice(0, 6).map((pattern) => (
                <div 
                  key={pattern.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-900 border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/super-admin/error-logs/${pattern.sample_error_id}`)}
                >
                  <div className="flex-shrink-0 p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                    <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pattern.component_name || pattern.error_type}</p>
                    <p className="text-xs text-muted-foreground truncate">{pattern.action_attempted || 'Unknown action'}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {pattern.occurrence_count}x
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {pattern.affected_users_count}
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="muted">Muted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefreshScores}
          disabled={calculateScores.isPending}
        >
          {calculateScores.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Scores
        </Button>
      </div>

      {/* Patterns Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : patterns?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No error patterns found
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="divide-y">
                {patterns?.map((pattern) => (
                  <div 
                    key={pattern.id}
                    className="p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{pattern.error_type}</Badge>
                          <Badge className={statusConfig[pattern.status].className}>
                            {statusConfig[pattern.status].label}
                          </Badge>
                          {pattern.is_trending && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Trending
                            </Badge>
                          )}
                        </div>
                        
                        <h3 className="font-medium text-sm">
                          {pattern.component_name || 'Unknown Component'}
                          {pattern.action_attempted && (
                            <span className="text-muted-foreground font-normal"> → {pattern.action_attempted}</span>
                          )}
                        </h3>
                        
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {pattern.sample_error_message || 'No sample message'}
                        </p>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {pattern.occurrence_count} occurrences
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {pattern.affected_users_count} users
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {pattern.affected_orgs_count} orgs
                          </span>
                          <span>
                            Last: {formatDistanceToNow(new Date(pattern.last_occurrence_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {pattern.sample_error_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/super-admin/error-logs/${pattern.sample_error_id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        
                        {pattern.status === 'active' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openActionDialog(pattern, 'acknowledged')}
                            >
                              Acknowledge
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openActionDialog(pattern, 'muted')}
                            >
                              <VolumeX className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        {pattern.status !== 'resolved' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openActionDialog(pattern, 'resolved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction === 'resolved' && 'Mark Pattern as Resolved'}
              {pendingAction === 'acknowledged' && 'Acknowledge Pattern'}
              {pendingAction === 'muted' && 'Mute Pattern'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedPattern && (
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p className="font-medium">{selectedPattern.component_name || 'Unknown Component'}</p>
                <p className="text-muted-foreground">{selectedPattern.action_attempted}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Add notes about this action..."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStatusChange}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ErrorPatternsDashboard;
