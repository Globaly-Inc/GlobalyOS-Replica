import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePortalApi } from '@/hooks/usePortalApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle, Circle, Clock, FileText, MessageSquare, Send, Upload, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  submitted: 'bg-blue-100 text-blue-800',
};

const PortalCasePage = () => {
  const { orgCode, caseId } = useParams<{ orgCode: string; caseId: string }>();
  const { portalFetch } = usePortalApi();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchCase = async () => {
    try {
      const result = await portalFetch('case-detail', { caseId: caseId! });
      setData(result);
      if (result.thread?.id) {
        const msgResult = await portalFetch('messages', { threadId: result.thread.id });
        setMessages(msgResult.messages || []);
      }
    } catch (err) {
      console.error('Case fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCase(); }, [caseId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !data?.thread?.id) return;
    setSending(true);
    try {
      await portalFetch('send-message', undefined, {
        threadId: data.thread.id,
        message: messageText.trim(),
      });
      setMessageText('');
      // Refresh messages
      const msgResult = await portalFetch('messages', { threadId: data.thread.id });
      setMessages(msgResult.messages || []);
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await portalFetch('complete-task', undefined, { taskId });
      toast.success('Task completed');
      fetchCase();
    } catch {
      toast.error('Failed to complete task');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !caseId) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large (max 10MB)');
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        await portalFetch('upload-document', undefined, {
          caseId,
          fileName: file.name,
          fileType: file.type,
          fileBase64: base64,
        });
        toast.success('Document uploaded');
        fetchCase();
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.case) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Case not found</p>
        <Link to={`/org/${orgCode}/portal/dashboard`} className="text-primary hover:underline text-sm mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const c = data.case;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to={`/org/${orgCode}/portal/dashboard`} className="mt-1">
          <ArrowLeft className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{c.title}</h1>
            <Badge className={statusColors[c.status] || ''} variant="secondary">{c.status}</Badge>
          </div>
          {c.description && <p className="text-muted-foreground text-sm mt-1">{c.description}</p>}
        </div>
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({data.tasks?.length || 0})</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="documents">Documents ({data.documents?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle className="text-lg">Status Timeline</CardTitle></CardHeader>
            <CardContent>
              {!data.statusHistory?.length ? (
                <p className="text-muted-foreground text-sm text-center py-4">No timeline events yet.</p>
              ) : (
                <div className="relative space-y-0">
                  {data.statusHistory.map((event: any, idx: number) => (
                    <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary mt-1.5" />
                        {idx < data.statusHistory.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{event.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleString()}
                          </span>
                        </div>
                        {event.note && <p className="text-sm text-foreground mt-1">{event.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Milestones */}
              {data.milestones?.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="font-medium text-foreground mb-3">Milestones</h3>
                  <div className="space-y-2">
                    {data.milestones.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-3">
                        {m.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : m.status === 'in_progress' ? (
                          <Clock className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={`text-sm ${m.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {m.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader><CardTitle className="text-lg">Your Tasks</CardTitle></CardHeader>
            <CardContent>
              {!data.tasks?.length ? (
                <p className="text-muted-foreground text-sm text-center py-4">No tasks assigned.</p>
              ) : (
                <div className="space-y-3">
                  {data.tasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        {task.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {task.title}
                          </p>
                          {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                          {task.due_at && (
                            <p className="text-xs text-muted-foreground mt-0.5">Due: {new Date(task.due_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                      {task.status !== 'completed' && (
                        <Button size="sm" variant="outline" onClick={() => handleCompleteTask(task.id)}>
                          Complete
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages */}
        <TabsContent value="messages">
          <Card className="flex flex-col" style={{ height: '500px' }}>
            <CardHeader className="pb-3"><CardTitle className="text-lg">Messages</CardTitle></CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 pb-0">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No messages yet. Start the conversation below.</p>
              ) : (
                messages.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.sender_type === 'client'
                        ? 'bg-primary text-primary-foreground'
                        : msg.sender_type === 'ai'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-foreground'
                        : 'bg-muted text-foreground'
                    }`}>
                      {msg.sender_type === 'ai' && (
                        <p className="text-[10px] font-medium opacity-70 mb-1">AI Assistant</p>
                      )}
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${msg.sender_type === 'client' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </CardContent>
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={sending || !data?.thread}
                />
                <Button size="icon" onClick={handleSendMessage} disabled={sending || !messageText.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Documents</CardTitle>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xlsx,.xls,.csv,.txt"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                  Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!data.documents?.length ? (
                <p className="text-muted-foreground text-sm text-center py-4">No documents.</p>
              ) : (
                <div className="space-y-3">
                  {data.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{doc.file_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className={`text-xs ${statusColors[doc.status] || ''}`} variant="secondary">
                              {doc.status}
                            </Badge>
                            {doc.document_type === 'requested' && <span className="text-xs text-muted-foreground">Requested</span>}
                          </div>
                          {doc.review_note && <p className="text-xs text-muted-foreground mt-1">{doc.review_note}</p>}
                        </div>
                      </div>
                      {doc.file_url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PortalCasePage;
