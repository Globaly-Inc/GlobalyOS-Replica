import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAgentApi } from '@/hooks/useAgentApi';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Send, FileText, Clock } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-800',
  in_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-emerald-100 text-emerald-800',
};

const AgentApplicationDetailPage = () => {
  const { orgCode, applicationId } = useParams<{ orgCode: string; applicationId: string }>();
  const navigate = useNavigate();
  const { agentFetch } = useAgentApi();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['agent-application', applicationId],
    queryFn: () => agentFetch('get-application', { params: { applicationId: applicationId! } }),
    enabled: !!applicationId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => agentFetch('send-message', {
      method: 'POST',
      body: { application_id: applicationId, content },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-application', applicationId] });
      setMessage('');
      toast.success('Message sent');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const app = data?.application;
  if (!app) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Application not found.</p>
        <Button variant="link" onClick={() => navigate(`/agent/${orgCode}/applications`)}>
          Back to Applications
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/agent/${orgCode}/applications`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{app.crm_services?.name}</h1>
          <p className="text-muted-foreground">
            Customer: {app.partner_customers?.first_name} {app.partner_customers?.last_name}
          </p>
        </div>
        <Badge className={statusColors[app.status] || ''}>
          {app.status?.replace('_', ' ')}
        </Badge>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" /> Status Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.status_history || []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No status changes yet.</p>
          ) : (
            <div className="space-y-3">
              {(data.status_history).map((h: any, i: number) => (
                <div key={h.id || i} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      {h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status}
                    </p>
                    {h.notes && <p className="text-sm text-muted-foreground">{h.notes}</p>}
                    <p className="text-xs text-muted-foreground">
                      {h.created_at ? format(new Date(h.created_at), 'MMM d, yyyy h:mm a') : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" /> Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.documents || []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No documents uploaded.</p>
          ) : (
            <div className="space-y-2">
              {(data.documents).map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">{doc.document_type}</p>
                  </div>
                  <Badge variant={doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'secondary'}>
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5" /> Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data?.messages || []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No messages yet.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {(data.messages).map((msg: any) => (
                <div key={msg.id} className={`p-3 rounded-lg ${msg.sender_type === 'agent' ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'}`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {msg.sender_type} • {msg.created_at ? format(new Date(msg.created_at), 'MMM d, h:mm a') : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[60px]"
            />
            <Button
              size="icon"
              onClick={() => message.trim() && sendMessageMutation.mutate(message)}
              disabled={!message.trim() || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentApplicationDetailPage;
