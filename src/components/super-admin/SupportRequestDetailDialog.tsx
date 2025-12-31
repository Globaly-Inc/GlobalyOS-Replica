import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Bug, Lightbulb, Globe, Monitor, Calendar, Sparkles, Trash2, 
  Send, X, UserPlus, History, MessageSquare, Users, ChevronDown, ChevronUp,
  Lock, Paperclip, Image as ImageIcon, Link2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  SupportRequest, 
  SupportRequestStatus, 
  SupportRequestPriority, 
  STATUS_CONFIG, 
  PRIORITY_CONFIG,
  ACTION_TYPE_LABELS 
} from '@/types/support';
import { 
  useUpdateSupportRequest, 
  useDeleteSupportRequest,
  useSupportRequestComments,
  useSupportRequestSubscribers,
  useSupportRequestActivityLogs,
  useAddSupportRequestComment,
  useAddSupportRequestSubscriber,
  useRemoveSupportRequestSubscriber,
  useSearchUsers,
  uploadScreenshot
} from '@/services/useSupportRequests';
import { useSupportRequestRealtime } from '@/hooks/useSupportRequestRealtime';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SupportRequestDetailDialogProps {
  request: SupportRequest | null;
  open: boolean;
  onClose: () => void;
}

export const SupportRequestDetailDialog = ({ request, open, onClose }: SupportRequestDetailDialogProps) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [subscriberPopoverOpen, setSubscriberPopoverOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const updateRequest = useUpdateSupportRequest();
  const deleteRequest = useDeleteSupportRequest();
  const addComment = useAddSupportRequestComment();
  const addSubscriber = useAddSupportRequestSubscriber();
  const removeSubscriber = useRemoveSupportRequestSubscriber();
  
  const { data: comments = [] } = useSupportRequestComments(request?.id || null);
  const { data: subscribers = [] } = useSupportRequestSubscribers(request?.id || null);
  const { data: activityLogs = [] } = useSupportRequestActivityLogs(request?.id || null);
  const { data: searchResults = [] } = useSearchUsers(subscriberSearch);

  // Enable realtime updates
  useSupportRequestRealtime(request?.id || null);

  if (!request) return null;

  const handleStatusChange = (status: SupportRequestStatus) => {
    updateRequest.mutate({ id: request.id, status });
  };

  const handlePriorityChange = (priority: SupportRequestPriority) => {
    updateRequest.mutate({ id: request.id, priority });
  };

  const handleDelete = () => {
    deleteRequest.mutate(request.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        onClose();
      },
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !attachmentFile) return;
    
    setIsUploading(true);
    let attachmentUrl: string | undefined;

    try {
      if (attachmentFile) {
        attachmentUrl = await uploadScreenshot(attachmentFile);
      }

      await addComment.mutateAsync({ 
        requestId: request.id, 
        content: newMessage.trim() || (attachmentFile ? `Attached: ${attachmentFile.name}` : ''),
        isInternal: isInternalNote,
        attachmentUrl,
      });
      
      setNewMessage('');
      setAttachmentFile(null);
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File must be less than 5MB');
        return;
      }
      setAttachmentFile(file);
    }
  };

  const handleAddSubscriber = (userId: string) => {
    addSubscriber.mutate({ requestId: request.id, userId });
    setSubscriberSearch('');
    setSubscriberPopoverOpen(false);
  };

  const handleRemoveSubscriber = (subscriberId: string) => {
    removeSubscriber.mutate({ requestId: request.id, subscriberId });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const filteredSearchResults = searchResults.filter(
    u => !subscribers.some(s => s.user_id === u.id)
  );

  // Separate comments and notes for display
  const totalConversations = comments.length;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="w-[95vw] max-w-[70vw] h-[85vh] p-0 flex flex-col overflow-hidden gap-0">
          {/* Header */}
          <div className="flex-shrink-0 border-b px-6 py-4 space-y-3">
            {/* Row 1: Type + Status/Priority + Actions */}
            <div className="flex items-center gap-3">
              {request.type === 'bug' ? (
                <Badge variant="destructive" className="gap-1.5 text-xs">
                  <Bug className="h-3.5 w-3.5" />
                  Bug Report
                </Badge>
              ) : (
                <Badge className="gap-1.5 bg-primary text-xs">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Feature Request
                </Badge>
              )}
              
              <div className="flex items-center gap-2 ml-auto">
                <Select value={request.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 text-xs w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value} className="text-xs">
                        <div className="flex items-center gap-2">
                          <div className={cn('h-2 w-2 rounded-full', config.color)} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={request.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="h-8 text-xs w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value} className="text-xs">
                        <span className={config.color}>{config.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Separator orientation="vertical" className="h-6" />
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopyLink}
                  title="Copy link"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  title="Delete request"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Row 2: Title */}
            <DialogTitle className="text-lg font-semibold leading-tight">
              {request.title}
            </DialogTitle>
            
            {/* Row 3: Reporter + Time */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-6 w-6">
                <AvatarImage src={request.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{request.profiles?.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{request.profiles?.full_name || 'Unknown'}</span>
              {request.organizations?.name && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[200px]">{request.organizations.name}</span>
                </>
              )}
              <span className="ml-auto text-xs">
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-6 min-w-0 overflow-hidden">
              {/* Description - Collapsible */}
              <Collapsible open={descriptionOpen} onOpenChange={setDescriptionOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium">
                  <span>Description</span>
                  {descriptionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3 overflow-hidden">
                  <div className="text-sm whitespace-pre-wrap break-words break-all overflow-x-auto bg-muted/30 p-4 rounded-lg leading-relaxed max-w-full">
                    {request.description}
                  </div>
                  {request.ai_improved_description && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI-Improved
                      </div>
                      <div className="text-sm whitespace-pre-wrap break-words break-all overflow-x-auto bg-primary/5 border border-primary/20 p-4 rounded-lg leading-relaxed max-w-full">
                        {request.ai_improved_description}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Screenshot */}
              {request.screenshot_url && (
                <div className="space-y-2">
                  <Label className="text-sm">Screenshot</Label>
                  <a href={request.screenshot_url} target="_blank" rel="noopener noreferrer">
                    <img 
                      src={request.screenshot_url} 
                      alt="Screenshot" 
                      className="max-h-48 max-w-full rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  </a>
                </div>
              )}

              {/* Technical Details - Compact */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <a 
                  href={request.page_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors min-w-0 max-w-[200px]"
                  title={request.page_url}
                >
                  <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{request.page_url.replace(/^https?:\/\/[^/]+/, '')}</span>
                </a>
                <span 
                  className="flex items-center gap-1.5 min-w-0 max-w-[150px]" 
                  title={`${request.browser_info} • ${request.device_type}`}
                >
                  <Monitor className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{request.device_type.split('/')[0]?.trim()}</span>
                </span>
                <span className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(request.created_at), 'MMM d, yyyy HH:mm')}
                </span>
              </div>

              <Separator />

              {/* Subscribers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Subscribers ({subscribers.length})
                  </Label>
                  <Popover open={subscriberPopoverOpen} onOpenChange={setSubscriberPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
                        <UserPlus className="h-3.5 w-3.5" />
                        Add
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-2" align="end">
                      <Input
                        placeholder="Search users..."
                        value={subscriberSearch}
                        onChange={(e) => setSubscriberSearch(e.target.value)}
                        className="h-8 text-xs mb-2"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {filteredSearchResults.map(user => (
                          <div 
                            key={user.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                            onClick={() => handleAddSubscriber(user.id)}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">{user.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{user.full_name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>
                        ))}
                        {subscriberSearch.length >= 2 && filteredSearchResults.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">No users found</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex flex-wrap gap-2">
                  {subscribers.map(sub => (
                    <div 
                      key={sub.id}
                      className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-1"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={sub.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">{sub.profiles?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{sub.profiles?.full_name?.split(' ')[0]}</span>
                      <button 
                        onClick={() => handleRemoveSubscriber(sub.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Conversation (Comments + Notes Combined) */}
              <div className="space-y-4">
                <Label className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Conversation ({totalConversations})
                </Label>
                
                {/* Message Input */}
                <div className="space-y-3">
                  {/* Type Toggle */}
                  <div className="flex gap-2">
                    <Button
                      variant={!isInternalNote ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs gap-1.5 flex-1"
                      onClick={() => setIsInternalNote(false)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Comment
                    </Button>
                    <Button
                      variant={isInternalNote ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "h-8 text-xs gap-1.5 flex-1",
                        isInternalNote && "bg-amber-500 hover:bg-amber-600"
                      )}
                      onClick={() => setIsInternalNote(true)}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Internal Note
                    </Button>
                  </div>

                  {/* Input Area */}
                  <div className={cn(
                    "rounded-lg border p-3 space-y-3",
                    isInternalNote && "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900"
                  )}>
                    <Textarea
                      placeholder={isInternalNote ? "Add internal note (not visible to subscribers)..." : "Add a comment..."}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={3}
                      className={cn(
                        "text-sm resize-none border-0 p-0 focus-visible:ring-0 bg-transparent",
                        isInternalNote && "placeholder:text-amber-600/50"
                      )}
                    />
                    
                    {/* Attachment Preview */}
                    {attachmentFile && (
                      <div className="flex items-center gap-2 bg-muted/50 rounded p-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs truncate flex-1">{attachmentFile.name}</span>
                        <button 
                          onClick={() => setAttachmentFile(null)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,.pdf,.doc,.docx"
                        className="hidden"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={handleSendMessage}
                        disabled={(!newMessage.trim() && !attachmentFile) || isUploading || addComment.isPending}
                      >
                        <Send className="h-3.5 w-3.5" />
                        {isUploading ? 'Uploading...' : 'Send'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Conversation List */}
                <div className="space-y-3">
                  {comments.map(comment => (
                    <div 
                      key={comment.id} 
                      className={cn(
                        "rounded-lg p-4",
                        comment.is_internal 
                          ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900"
                          : "bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">{comment.profiles?.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{comment.profiles?.full_name}</span>
                        {comment.is_internal && (
                          <Badge variant="outline" className="h-5 text-[10px] gap-1 px-1.5 bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                            <Lock className="h-3 w-3" />
                            Internal
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed break-words break-all overflow-x-auto max-w-full">{comment.content}</p>
                      {comment.attachment_url && (
                        <a 
                          href={comment.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block mt-3"
                        >
                          {comment.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img 
                              src={comment.attachment_url} 
                              alt="Attachment" 
                              className="max-h-32 max-w-full rounded border hover:opacity-80 transition-opacity"
                            />
                          ) : (
                            <div className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                              <Paperclip className="h-3.5 w-3.5" />
                              View attachment
                            </div>
                          )}
                        </a>
                      )}
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No conversation yet</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Activity Log */}
              <div className="space-y-3">
                <Label className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Activity Log
                </Label>
                <div className="space-y-2">
                  {activityLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-2 text-xs">
                      <Avatar className="h-5 w-5 mt-0.5">
                        <AvatarImage src={log.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">{log.profiles?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{log.profiles?.full_name?.split(' ')[0]}</span>
                        <span className="text-muted-foreground"> {ACTION_TYPE_LABELS[log.action_type]}</span>
                        {log.old_value && log.new_value && (
                          <span className="text-muted-foreground"> from <span className="font-medium">{log.old_value}</span> to <span className="font-medium">{log.new_value}</span></span>
                        )}
                        {!log.old_value && log.new_value && log.action_type !== 'created' && (
                          <span className="text-muted-foreground">: {log.new_value}</span>
                        )}
                      </div>
                      <span className="text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                  {activityLogs.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this request?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the support request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
