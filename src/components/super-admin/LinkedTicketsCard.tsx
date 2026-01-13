import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Ticket, 
  Plus, 
  ExternalLink, 
  X,
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useErrorLinkedTickets, useUnlinkErrorFromTicket } from '@/services/useErrorSupportLinks';

interface LinkedTicketsCardProps {
  errorLogId: string;
  onLinkClick: () => void;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusColors = {
  open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  pending: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

const LinkedTicketsCard = ({ errorLogId, onLinkClick }: LinkedTicketsCardProps) => {
  const navigate = useNavigate();
  const { data: linkedTickets, isLoading } = useErrorLinkedTickets(errorLogId);
  const unlinkMutation = useUnlinkErrorFromTicket();

  const handleUnlink = async (supportRequestId: string) => {
    try {
      await unlinkMutation.mutateAsync({
        errorLogId,
        supportRequestId,
      });
      toast.success('Ticket unlinked');
    } catch (error) {
      toast.error('Failed to unlink ticket');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Linked Tickets
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onLinkClick}>
            <Plus className="h-4 w-4 mr-1" />
            Link
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : linkedTickets?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No linked tickets
          </p>
        ) : (
          <div className="space-y-3">
            {linkedTickets?.map((link) => {
              const ticket = link.support_requests;
              if (!ticket) return null;
              
              return (
                <div 
                  key={link.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]} variant="secondary">
                          {ticket.priority}
                        </Badge>
                        <Badge className={statusColors[ticket.status as keyof typeof statusColors]} variant="secondary">
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-medium truncate">{ticket.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                        {ticket.resolved_at && (
                          <> • Resolved {format(new Date(ticket.resolved_at), 'MMM d')}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => navigate(`/super-admin/customer-success/${ticket.id}`)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleUnlink(ticket.id)}
                        disabled={unlinkMutation.isPending}
                      >
                        {unlinkMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LinkedTicketsCard;
