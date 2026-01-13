import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Link2, 
  Plus, 
  Loader2,
  Ticket,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAllSupportRequests } from '@/services/useSupportRequests';
import { 
  useLinkErrorToTicket, 
  useCreateTicketFromError,
  useErrorLinkedTickets 
} from '@/services/useErrorSupportLinks';
import type { ErrorLog } from '@/types/errorLogs';

interface LinkErrorToTicketDialogProps {
  log: ErrorLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const statusColors = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  pending: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const LinkErrorToTicketDialog = ({ log, open, onOpenChange }: LinkErrorToTicketDialogProps) => {
  const [activeTab, setActiveTab] = useState<string>('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [newTicketTitle, setNewTicketTitle] = useState(`Error: ${log.error_message.slice(0, 50)}...`);
  const [newTicketDescription, setNewTicketDescription] = useState(`
Error Type: ${log.error_type}
Severity: ${log.severity}
Component: ${log.component_name || 'Unknown'}
Action: ${log.action_attempted || 'Unknown'}
Page: ${log.page_url}

Error Message:
${log.error_message}

${log.error_stack ? `Stack Trace:\n${log.error_stack.slice(0, 500)}...` : ''}
  `.trim());
  const [newTicketPriority, setNewTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(
    log.severity === 'critical' ? 'urgent' : log.severity === 'error' ? 'high' : 'medium'
  );

  const { data: tickets, isLoading: loadingTickets } = useAllSupportRequests();
  const { data: linkedTickets } = useErrorLinkedTickets(log.id);
  const linkMutation = useLinkErrorToTicket();
  const createMutation = useCreateTicketFromError();

  const linkedTicketIds = new Set(linkedTickets?.map(l => l.support_request_id) || []);

  const filteredTickets = tickets?.filter(ticket => {
    if (linkedTicketIds.has(ticket.id)) return false;
    if (!searchQuery) return true;
    return (
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleLinkToExisting = async (ticketId: string) => {
    try {
      await linkMutation.mutateAsync({
        errorLogId: log.id,
        supportRequestId: ticketId,
      });
      toast.success('Error linked to ticket');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to link error to ticket');
    }
  };

  const handleCreateNew = async () => {
    if (!newTicketTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }
    
    try {
      await createMutation.mutateAsync({
        errorLogId: log.id,
        title: newTicketTitle,
        description: newTicketDescription,
        priority: newTicketPriority,
      });
      toast.success('Ticket created and linked');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create ticket');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Link to Support Ticket
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link to Existing
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Ticket
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <ScrollArea className="flex-1 min-h-0">
              {loadingTickets ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTickets?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tickets found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTickets?.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                              {ticket.priority}
                            </Badge>
                            <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline">{ticket.type}</Badge>
                          </div>
                          <h4 className="font-medium text-sm truncate">{ticket.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleLinkToExisting(ticket.id)}
                          disabled={linkMutation.isPending}
                        >
                          {linkMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Link2 className="h-4 w-4 mr-1" />
                              Link
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="new" className="flex-1 flex flex-col min-h-0 mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newTicketTitle}
                onChange={(e) => setNewTicketTitle(e.target.value)}
                placeholder="Ticket title..."
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                  <Button
                    key={priority}
                    variant={newTicketPriority === priority ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewTicketPriority(priority)}
                  >
                    {priority}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2 flex-1">
              <Label>Description</Label>
              <Textarea
                value={newTicketDescription}
                onChange={(e) => setNewTicketDescription(e.target.value)}
                placeholder="Describe the issue..."
                className="h-[200px] resize-none"
              />
            </div>

            <Button 
              onClick={handleCreateNew}
              disabled={createMutation.isPending || !newTicketTitle.trim()}
              className="w-full"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create & Link Ticket
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default LinkErrorToTicketDialog;
