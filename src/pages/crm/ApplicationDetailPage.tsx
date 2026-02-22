import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, FileStack, Clock, FileText, MessageSquare, CheckSquare, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageBody } from '@/components/ui/page-body';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusColors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  submitted: 'secondary',
  in_review: 'default',
  approved: 'default',
  rejected: 'destructive',
  completed: 'secondary',
};

const ApplicationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { navigateOrg } = useOrgNavigation();
  const queryClient = useQueryClient();

  const { data: application, isLoading } = useQuery({
    queryKey: ['service-application', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_applications')
        .select('*, service:crm_services(id, name, category, short_description), office:offices(id, name), agent_partner:crm_partners(id, name, type), crm_contact:crm_contacts(id, first_name, last_name, email)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: statusHistory } = useQuery({
    queryKey: ['app-status-history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_application_status_history')
        .select('*')
        .eq('application_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: ['app-documents', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_application_documents')
        .select('*')
        .eq('application_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleGenerateSummary = async () => {
    if (!application) return;
    setAiLoading(true);
    try {
      const res = await supabase.functions.invoke('ai-application-summary', {
        body: { application_id: id, organization_id: application.organization_id },
      });
      if (res.error) throw res.error;
      setAiSummary(res.data);
      toast.success('AI summary generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate summary');
    } finally {
      setAiLoading(false);
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error: updateErr } = await supabase
        .from('service_applications')
        .update({ status: newStatus as any })
        .eq('id', id!);
      if (updateErr) throw updateErr;

      const { error: histErr } = await supabase
        .from('service_application_status_history')
        .insert({
          application_id: id!,
          organization_id: application!.organization_id,
          old_status: application!.status,
          new_status: newStatus,
          is_internal_note: false,
        });
      if (histErr) throw histErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-application', id] });
      queryClient.invalidateQueries({ queryKey: ['app-status-history', id] });
      toast.success('Status updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update status'),
  });

  if (isLoading) return <PageBody><div className="pt-8 text-center text-muted-foreground">Loading...</div></PageBody>;
  if (!application) return <PageBody><div className="pt-8 text-center text-muted-foreground">Application not found</div></PageBody>;

  const contact = application.crm_contact as any;
  const service = application.service as any;
  const office = application.office as any;
  const agent = application.agent_partner as any;

  return (
    <PageBody>
      <div className="space-y-6 pt-4 md:pt-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigateOrg('/crm/applications')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <FileStack className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold">{service?.name || 'Application'}</h1>
              <Badge variant={statusColors[application.status] || 'outline'} className="capitalize">{application.status.replace('_', ' ')}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {contact ? `${contact.first_name} ${contact.last_name || ''}`.trim() : 'Unknown applicant'}
              {agent ? ` • via ${agent.name}` : ''}
              {office ? ` • ${office.name}` : ''}
            </p>
          </div>
          <Select value={application.status} onValueChange={v => updateStatusMutation.mutate(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleGenerateSummary} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            AI Summary
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Source</p>
            <p className="font-medium capitalize">{application.created_by_type}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Priority</p>
            <p className="font-medium capitalize">{application.priority}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="font-medium">{application.submitted_at ? format(new Date(application.submitted_at), 'dd MMM yyyy') : '—'}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Documents</p>
            <p className="font-medium">{documents?.length || 0}</p>
          </CardContent></Card>
        </div>

        {/* AI Summary */}
        {aiSummary && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{aiSummary.summary}</p>
              {aiSummary.applicant_background && (
                <div><span className="font-medium">Applicant:</span> {aiSummary.applicant_background}</div>
              )}
              {aiSummary.document_status && (
                <div><span className="font-medium">Documents:</span> {aiSummary.document_status}</div>
              )}
              {aiSummary.risks?.length > 0 && (
                <div><span className="font-medium">Risks:</span> {aiSummary.risks.join(', ')}</div>
              )}
              {aiSummary.recommended_actions?.length > 0 && (
                <div><span className="font-medium">Next Steps:</span> {aiSummary.recommended_actions.join(', ')}</div>
              )}
              <Badge variant="outline" className="text-xs">{aiSummary.sla_status}</Badge>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline" className="gap-1"><Clock className="h-4 w-4" />Timeline</TabsTrigger>
            <TabsTrigger value="documents" className="gap-1"><FileText className="h-4 w-4" />Documents</TabsTrigger>
            <TabsTrigger value="messages" className="gap-1"><MessageSquare className="h-4 w-4" />Messages</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1"><CheckSquare className="h-4 w-4" />Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <Card>
              <CardHeader><CardTitle>Status Timeline</CardTitle></CardHeader>
              <CardContent>
                {statusHistory && statusHistory.length > 0 ? (
                  <div className="space-y-4">
                    {statusHistory.map((entry: any) => (
                      <div key={entry.id} className="flex items-start gap-3 border-l-2 border-border pl-4 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize text-xs">{entry.old_status?.replace('_', ' ') || '—'}</Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="default" className="capitalize text-xs">{entry.new_status?.replace('_', ' ')}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm')}</p>
                          {entry.notes && <p className="text-sm mt-1">{entry.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No status changes recorded yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
              <CardContent>
                {documents && documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">{doc.document_type} • {doc.uploaded_by_type}</p>
                        </div>
                        <Badge variant={doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'outline'} className="capitalize">{doc.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No documents uploaded yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Messaging will be available in the next phase.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Task management will be available in the next phase.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageBody>
  );
};

export default ApplicationDetailPage;
