import { useState, useRef } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Bug, Lightbulb, ExternalLink, Globe, Monitor, Calendar, Sparkles, 
  Send, History, MessageSquare, Paperclip, Image as ImageIcon, X
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  SupportRequest, 
  STATUS_CONFIG, 
  PRIORITY_CONFIG,
  ACTION_TYPE_LABELS 
} from '@/types/support';
import { 
  useSupportRequestComments,
  useSupportRequestActivityLogs,
  useAddSupportRequestComment,
  uploadScreenshot
} from '@/services/useSupportRequests';
import { useSupportRequestRealtime } from '@/hooks/useSupportRequestRealtime';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface UserSupportRequestDetailSheetProps {
  request: SupportRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserSupportRequestDetailSheet = ({ request, open, onOpenChange }: UserSupportRequestDetailSheetProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const addComment = useAddSupportRequestComment();
  
  const { data: comments = [] } = useSupportRequestComments(request?.id || null);
  const { data: activityLogs = [] } = useSupportRequestActivityLogs(request?.id || null);

  // Enable realtime updates
  useSupportRequestRealtime(request?.id || null);

  if (!request) return null;

  // Filter out internal notes and note-related activity logs
  const publicComments = comments.filter(c => !c.is_internal);
  const filteredActivityLogs = activityLogs.filter(
    log => log.action_type !== 'note_added' && log.action_type !== 'notes_updated'
  );

  const statusConfig = STATUS_CONFIG[request.status];
  const priorityConfig = PRIORITY_CONFIG[request.priority];

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
        isInternal: false, // Always public for user
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col h-full">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 space-y-2">
          {/* Row 1: Type + Status/Priority display */}
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
            <div className="flex items-center gap-2 ml-auto">
              <Badge variant="outline" className="gap-1 text-xs h-5">
                <div className={cn('h-2 w-2 rounded-full', statusConfig.color)} />
                {statusConfig.label}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn("text-xs h-5", priorityConfig.color)}
              >
                {priorityConfig.label}
              </Badge>
            </div>
          </div>
          
          {/* Row 2: Title */}
          <h2 className="font-semibold text-sm leading-tight line-clamp-2">{request.title}</h2>
          
          {/* Row 3: Time */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
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

            {/* Comments Section */}
            <div className="space-y-3">
              <Label className="text-xs flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Comments ({publicComments.length})
              </Label>
              
              {/* Message Input */}
              <div className="space-y-2">
                <div className="rounded-lg border p-2 space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={2}
                    className="text-xs resize-none border-0 p-0 focus-visible:ring-0 bg-transparent"
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
              
              {/* Comments List */}
              <div className="space-y-2">
                {publicComments.map(comment => (
                  <div 
                    key={comment.id} 
                    className="rounded-lg p-2.5 bg-muted/30"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">{comment.profiles?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{comment.profiles?.full_name}</span>
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
                {publicComments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No comments yet</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Activity Log - Filtered */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Activity Log
              </Label>
              <div className="space-y-2">
                {filteredActivityLogs.map(log => (
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
                {filteredActivityLogs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No activity yet</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
