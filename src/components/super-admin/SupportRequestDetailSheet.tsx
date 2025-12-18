import { useState, useEffect, useRef } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Bug, Lightbulb, ExternalLink, Globe, Monitor, Calendar, Sparkles, Trash2, 
  Send, X, UserPlus, History, MessageSquare, Users, ChevronDown, ChevronUp,
  Lock, Paperclip, Image as ImageIcon
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
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

interface SupportRequestDetailSheetProps {
  request: SupportRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupportRequestDetailSheet = ({ request, open, onOpenChange }: SupportRequestDetailSheetProps) => {
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
        onOpenChange(false);
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

  const filteredSearchResults = searchResults.filter(
    u => !subscribers.some(s => s.user_id === u.id)
  );

  // Separate comments and notes for display
  const publicComments = comments.filter(c => !c.is_internal);
  const internalNotes = comments.filter(c => c.is_internal);
  const totalConversations = comments.length;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col h-full">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 space-y-2">
            {/* Row 1: Type + Status/Priority controls */}
            <div className="flex items-center gap-2">
              {request.type === 'bug' ? (
                <Badge variant="destructive" className="gap-1 text-xs h-5">
                  <Bug className="h-3 w-3" />
                  Bug
                </Badge>
              ) : (
                <Badge className="gap-1 bg-primary text-xs h-5">
                  <Lightbulb className="h-3 w-3" />
                  Feature
                </Badge>
              )}
              <div className="flex items-center gap-1.5 ml-auto">
                <Select value={request.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-7 text-xs w-[110px]">
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
                  <SelectTrigger className="h-7 text-xs w-[85px]">
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
              </div>
            </div>
            
            {/* Row 2: Title */}
            <h2 className="font-semibold text-sm leading-tight line-clamp-2">{request.title}</h2>
            
            {/* Row 3: Reporter + Time + Delete */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarImage src={request.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">{request.profiles?.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{request.profiles?.full_name || 'Unknown'}</span>
              {request.organizations?.name && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[100px]">{request.organizations.name}</span>
                </>
              )}
              <span className="ml-auto">{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Description - Collapsible */}
              <Collapsible open={descriptionOpen} onOpenChange={setDescriptionOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium">
                  <span>Description</span>
                  {descriptionOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  <p className="text-xs whitespace-pre-wrap bg-muted/30 p-2.5 rounded-lg leading-relaxed">
                    {request.description}
                  </p>
                  {request.ai_improved_description && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-primary font-medium">
                        <Sparkles className="h-3 w-3" />
                        AI-Improved
                      </div>
                      <p className="text-xs whitespace-pre-wrap bg-primary/5 border border-primary/20 p-2.5 rounded-lg leading-relaxed">
                        {request.ai_improved_description}
                      </p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Screenshot */}
              {request.screenshot_url && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Screenshot</Label>
                  <a href={request.screenshot_url} target="_blank" rel="noopener noreferrer">
                    <img 
                      src={request.screenshot_url} 
                      alt="Screenshot" 
                      className="max-h-32 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  </a>
                </div>
              )}

              {/* Technical Details - Compact */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground bg-muted/30 rounded-lg p-2">
                <a 
                  href={request.page_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground transition-colors truncate max-w-[120px]"
                  title={request.page_url}
                >
                  <Globe className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{request.page_url.replace(/^https?:\/\/[^/]+/, '')}</span>
                </a>
                <span className="flex items-center gap-1" title={`${request.browser_info} • ${request.device_type}`}>
                  <Monitor className="h-3 w-3" />
                  {request.device_type.split('/')[0]?.trim()}
                </span>
                <span className="flex items-center gap-1 ml-auto">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(request.created_at), 'MMM d, HH:mm')}
                </span>
              </div>

              <Separator />

              {/* Subscribers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Subscribers ({subscribers.length})
                  </Label>
                  <Popover open={subscriberPopoverOpen} onOpenChange={setSubscriberPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                        <UserPlus className="h-3 w-3" />
                        Add
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="end">
                      <Input
                        placeholder="Search users..."
                        value={subscriberSearch}
                        onChange={(e) => setSubscriberSearch(e.target.value)}
                        className="h-8 text-xs mb-2"
                      />
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {filteredSearchResults.map(user => (
                          <div 
                            key={user.id}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                            onClick={() => handleAddSubscriber(user.id)}
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="text-[8px]">{user.full_name?.charAt(0)}</AvatarFallback>
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
                <div className="flex flex-wrap gap-1.5">
                  {subscribers.map(sub => (
                    <div 
                      key={sub.id}
                      className="flex items-center gap-1 bg-muted rounded-full pl-0.5 pr-1.5 py-0.5"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={sub.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">{sub.profiles?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] font-medium">{sub.profiles?.full_name?.split(' ')[0]}</span>
                      <button 
                        onClick={() => handleRemoveSubscriber(sub.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Conversation (Comments + Notes Combined) */}
              <div className="space-y-3">
                <Label className="text-xs flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Conversation ({totalConversations})
                </Label>
                
                {/* Message Input */}
                <div className="space-y-2">
                  {/* Type Toggle */}
                  <div className="flex gap-1">
                    <Button
                      variant={!isInternalNote ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs gap-1.5 flex-1"
                      onClick={() => setIsInternalNote(false)}
                    >
                      <MessageSquare className="h-3 w-3" />
                      Comment
                    </Button>
                    <Button
                      variant={isInternalNote ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "h-7 text-xs gap-1.5 flex-1",
                        isInternalNote && "bg-amber-500 hover:bg-amber-600"
                      )}
                      onClick={() => setIsInternalNote(true)}
                    >
                      <Lock className="h-3 w-3" />
                      Internal Note
                    </Button>
                  </div>

                  {/* Input Area */}
                  <div className={cn(
                    "rounded-lg border p-2 space-y-2",
                    isInternalNote && "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900"
                  )}>
                    <Textarea
                      placeholder={isInternalNote ? "Add internal note (not visible to subscribers)..." : "Add a comment..."}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={2}
                      className={cn(
                        "text-xs resize-none border-0 p-0 focus-visible:ring-0 bg-transparent",
                        isInternalNote && "placeholder:text-amber-600/50"
                      )}
                    />
                    
                    {/* Attachment Preview */}
                    {attachmentFile && (
                      <div className="flex items-center gap-2 bg-muted/50 rounded p-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] truncate flex-1">{attachmentFile.name}</span>
                        <button 
                          onClick={() => setAttachmentFile(null)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
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
                        className="h-7 w-7 p-0"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={handleSendMessage}
                        disabled={(!newMessage.trim() && !attachmentFile) || isUploading || addComment.isPending}
                      >
                        <Send className="h-3 w-3" />
                        {isUploading ? 'Uploading...' : 'Send'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Conversation List */}
                <div className="space-y-2">
                  {comments.map(comment => (
                    <div 
                      key={comment.id} 
                      className={cn(
                        "rounded-lg p-2.5",
                        comment.is_internal 
                          ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900"
                          : "bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px]">{comment.profiles?.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{comment.profiles?.full_name}</span>
                        {comment.is_internal && (
                          <Badge variant="outline" className="h-4 text-[9px] gap-0.5 px-1 bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                            <Lock className="h-2.5 w-2.5" />
                            Internal
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed">{comment.content}</p>
                      {comment.attachment_url && (
                        <a 
                          href={comment.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block mt-2"
                        >
                          {comment.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img 
                              src={comment.attachment_url} 
                              alt="Attachment" 
                              className="max-h-24 rounded border hover:opacity-80 transition-opacity"
                            />
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                              <Paperclip className="h-3 w-3" />
                              View attachment
                            </div>
                          )}
                        </a>
                      )}
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">No conversation yet</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Activity Log */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Activity Log
                </Label>
                <div className="space-y-2">
                  {activityLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-2 text-[10px]">
                      <Avatar className="h-4 w-4 mt-0.5">
                        <AvatarImage src={log.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-[6px]">{log.profiles?.full_name?.charAt(0)}</AvatarFallback>
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
                    <p className="text-xs text-muted-foreground text-center py-3">No activity yet</p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

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
