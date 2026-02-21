import { useState, useEffect, useRef } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Loader2, FolderOpen, MessageSquare, FileText, CheckCircle, Circle, Clock,
  Send, Upload, Download, Plus, Search, ArrowLeft, Sparkles, ListTodo, Eye,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export const PortalCaseManagement = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<any>(null);

  useEffect(() => {
    if (orgId) fetchCases();
  }, [orgId]);

  const fetchCases = async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from('client_cases')
      .select('*, client_portal_users!client_cases_client_user_id_fkey(email, full_name)')
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: false });
    setCases(data || []);
    setLoading(false);
  };

  const filteredCases = cases.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const clientName = c.client_portal_users?.full_name || '';
      const clientEmail = c.client_portal_users?.email || '';
      return c.title.toLowerCase().includes(q) || clientName.toLowerCase().includes(q) || clientEmail.toLowerCase().includes(q);
    }
    return true;
  });

  if (selectedCase) {
    return (
      <CaseDetailView
        caseData={selectedCase}
        orgId={orgId!}
        onBack={() => { setSelectedCase(null); fetchCases(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold">All Cases</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cases..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 w-60"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' ? 'No cases match your filters.' : 'No cases yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCases.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors w-full text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FolderOpen className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.client_portal_users?.full_name || c.client_portal_users?.email || 'Unknown client'}
                        {' · '}Updated {new Date(c.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={priorityColors[c.priority] || ''} variant="secondary">{c.priority}</Badge>
                    <Badge className={statusColors[c.status] || ''} variant="secondary">{c.status}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Case Detail View ───
interface CaseDetailViewProps {
  caseData: any;
  orgId: string;
  onBack: () => void;
}

const CaseDetailView = ({ caseData, orgId, onBack }: CaseDetailViewProps) => {
  const [thread, setThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Status update
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // Task creation
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDue, setTaskDue] = useState('');

  // Document review
  const [reviewDocId, setReviewDocId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [reviewNote, setReviewNote] = useState('');

  // AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCaseDetails();
  }, [caseData.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  const adminFetch = async (action: string, extra: Record<string, any> = {}) => {
    const session = await getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ action, organizationId: orgId, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const fetchCaseDetails = async () => {
    setLoading(true);
    const caseId = caseData.id;

    const [threadsRes, tasksRes, docsRes, historyRes] = await Promise.all([
      supabase.from('client_threads').select('*').eq('case_id', caseId).eq('organization_id', orgId).limit(1).maybeSingle(),
      supabase.from('client_tasks').select('*').eq('case_id', caseId).order('created_at', { ascending: true }),
      supabase.from('client_documents').select('*').eq('case_id', caseId).eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('client_case_status_history').select('*').eq('case_id', caseId).order('created_at', { ascending: true }),
    ]);

    setThread(threadsRes.data);
    setTasks(tasksRes.data || []);
    setDocuments(docsRes.data || []);
    setStatusHistory(historyRes.data || []);

    if (threadsRes.data?.id) {
      const { data: msgs } = await supabase
        .from('client_messages').select('*')
        .eq('thread_id', threadsRes.data.id)
        .order('created_at', { ascending: true });
      setMessages(msgs || []);
    }

    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !thread?.id) return;
    setSending(true);
    try {
      await adminFetch('send-message', {
        threadId: thread.id,
        message: messageText.trim(),
        isInternalNote,
      });
      setMessageText('');
      // Refresh messages
      const { data: msgs } = await supabase
        .from('client_messages').select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });
      setMessages(msgs || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) return;
    try {
      await adminFetch('update-case-status', {
        caseId: caseData.id,
        status: newStatus,
        note: statusNote || undefined,
      });
      toast.success('Status updated');
      setStatusDialogOpen(false);
      setNewStatus('');
      setStatusNote('');
      fetchCaseDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return;
    try {
      await adminFetch('create-task', {
        caseId: caseData.id,
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        dueAt: taskDue || undefined,
      });
      toast.success('Task created');
      setTaskDialogOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskDue('');
      fetchCaseDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    }
  };

  const handleReviewDocument = async () => {
    if (!reviewDocId) return;
    try {
      await adminFetch('review-document', {
        documentId: reviewDocId,
        status: reviewStatus,
        reviewNote: reviewNote || undefined,
      });
      toast.success('Document reviewed');
      setReviewDocId(null);
      setReviewNote('');
      fetchCaseDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to review document');
    }
  };

  const handleAiSuggest = async () => {
    if (!thread?.id) return;
    setAiLoading(true);
    setAiSuggestion('');
    try {
      const session = await getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-ai-assist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'suggest-reply',
          organizationId: orgId,
          threadId: thread.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiSuggestion(data.suggestion || data.reply || '');
    } catch (err: any) {
      toast.error(err.message || 'AI suggestion failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiSummarize = async () => {
    if (!thread?.id) return;
    setAiLoading(true);
    setAiSuggestion('');
    try {
      const session = await getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-ai-assist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'summarize-thread',
          organizationId: orgId,
          threadId: thread.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiSuggestion(data.summary || '');
    } catch (err: any) {
      toast.error(err.message || 'AI summary failed');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const clientName = caseData.client_portal_users?.full_name || caseData.client_portal_users?.email || 'Unknown';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-foreground">{caseData.title}</h2>
            <Badge className={statusColors[caseData.status] || ''} variant="secondary">{caseData.status}</Badge>
            <Badge className={priorityColors[caseData.priority] || ''} variant="secondary">{caseData.priority}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Client: {clientName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setStatusDialogOpen(true)}>
          Update Status
        </Button>
      </div>

      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Messages ({messages.length})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5">
            <ListTodo className="h-3.5 w-3.5" />
            Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* Messages */}
        <TabsContent value="messages">
          <Card className="flex flex-col" style={{ height: '520px' }}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Thread</CardTitle>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={handleAiSuggest} disabled={aiLoading}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Suggest Reply
                </Button>
                <Button variant="outline" size="sm" onClick={handleAiSummarize} disabled={aiLoading}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Summarize
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-2 pb-0">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No messages yet.</p>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'staff' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.sender_type === 'staff'
                        ? msg.is_internal_note
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-foreground border border-yellow-300 dark:border-yellow-700'
                          : 'bg-primary text-primary-foreground'
                        : msg.sender_type === 'ai'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-foreground'
                        : 'bg-muted text-foreground'
                    }`}>
                      {msg.is_internal_note && <p className="text-[10px] font-medium opacity-70 mb-0.5">📌 Internal Note</p>}
                      {msg.sender_type === 'ai' && <p className="text-[10px] font-medium opacity-70 mb-0.5">AI Assistant</p>}
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${msg.sender_type === 'staff' && !msg.is_internal_note ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(msg.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* AI suggestion */}
            {(aiSuggestion || aiLoading) && (
              <div className="mx-4 mt-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                {aiLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI is thinking...
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm whitespace-pre-wrap">{aiSuggestion}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setMessageText(aiSuggestion); setAiSuggestion(''); }}>
                        Use as Reply
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAiSuggestion('')}>
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-3 border-t border-border space-y-2">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={e => setIsInternalNote(e.target.checked)}
                    className="rounded"
                  />
                  Internal note (not visible to client)
                </label>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={isInternalNote ? 'Write an internal note...' : 'Reply to client...'}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={sending || !thread}
                />
                <Button size="icon" onClick={handleSendMessage} disabled={sending || !messageText.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Client Tasks</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setTaskDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No tasks assigned.</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      {t.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${t.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {t.title}
                        </p>
                        {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                      </div>
                      {t.due_at && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          Due {new Date(t.due_at).toLocaleDateString()}
                        </span>
                      )}
                      <Badge className={statusColors[t.status] || ''} variant="secondary">{t.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No documents.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className={statusColors[doc.status] || ''} variant="secondary">{doc.status}</Badge>
                            <span className="text-xs text-muted-foreground">{doc.document_type}</span>
                          </div>
                          {doc.review_note && <p className="text-xs text-muted-foreground mt-1">{doc.review_note}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {doc.file_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {(doc.status === 'submitted' || doc.status === 'pending') && (
                          <Button size="sm" variant="outline" onClick={() => { setReviewDocId(doc.id); setReviewStatus('approved'); setReviewNote(''); }}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle className="text-base">Status Timeline</CardTitle></CardHeader>
            <CardContent>
              {statusHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No timeline events.</p>
              ) : (
                <div className="relative space-y-0">
                  {statusHistory.map((event, idx) => (
                    <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary mt-1.5" />
                        {idx < statusHistory.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className={`text-xs ${statusColors[event.status] || ''}`}>{event.status}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
                          {!event.client_visible && <Badge variant="outline" className="text-[10px]">Staff only</Badge>}
                        </div>
                        {event.note && <p className="text-sm text-foreground mt-1">{event.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Case Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Add a note about this status change..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateStatus} disabled={!newStatus}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Creation Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Task for Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Upload passport copy" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Optional details" />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateTask} disabled={!taskTitle.trim()}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Review Dialog */}
      <Dialog open={!!reviewDocId} onOpenChange={open => { if (!open) setReviewDocId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Decision</Label>
              <Select value={reviewStatus} onValueChange={setReviewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Feedback for the client..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleReviewDocument}>Submit Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
