import { useState } from 'react';
import { format } from 'date-fns';
import { Bug, Lightbulb, ExternalLink, Globe, Monitor, Calendar, Sparkles, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
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
import { SupportRequest, SupportRequestStatus, SupportRequestPriority, STATUS_CONFIG, PRIORITY_CONFIG } from '@/types/support';
import { useUpdateSupportRequest, useDeleteSupportRequest } from '@/services/useSupportRequests';
import { cn } from '@/lib/utils';

interface SupportRequestDetailSheetProps {
  request: SupportRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupportRequestDetailSheet = ({ request, open, onOpenChange }: SupportRequestDetailSheetProps) => {
  const [adminNotes, setAdminNotes] = useState(request?.admin_notes || '');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const updateRequest = useUpdateSupportRequest();
  const deleteRequest = useDeleteSupportRequest();

  if (!request) return null;

  const handleStatusChange = (status: SupportRequestStatus) => {
    updateRequest.mutate({ id: request.id, status });
  };

  const handlePriorityChange = (priority: SupportRequestPriority) => {
    updateRequest.mutate({ id: request.id, priority });
  };

  const handleSaveNotes = () => {
    updateRequest.mutate({ id: request.id, admin_notes: adminNotes });
  };

  const handleDelete = () => {
    deleteRequest.mutate(request.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        onOpenChange(false);
      },
    });
  };

  const statusConfig = STATUS_CONFIG[request.status];
  const priorityConfig = PRIORITY_CONFIG[request.priority];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-2">
              {request.type === 'bug' ? (
                <Badge variant="destructive" className="gap-1">
                  <Bug className="h-3 w-3" />
                  Bug Report
                </Badge>
              ) : (
                <Badge className="gap-1 bg-primary">
                  <Lightbulb className="h-3 w-3" />
                  Feature Request
                </Badge>
              )}
              <Badge className={cn(statusConfig.color, 'text-white')}>
                {statusConfig.label}
              </Badge>
            </div>
            <SheetTitle className="text-left">{request.title}</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Reporter Info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar>
                <AvatarImage src={request.profiles?.avatar_url || undefined} />
                <AvatarFallback>{request.profiles?.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{request.profiles?.full_name || 'Unknown User'}</p>
                <p className="text-sm text-muted-foreground">{request.profiles?.email}</p>
                {request.organizations?.name && (
                  <p className="text-xs text-muted-foreground">{request.organizations.name}</p>
                )}
              </div>
            </div>

            {/* Status & Priority Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={request.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <div className={cn('h-2 w-2 rounded-full', config.color)} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={request.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        <span className={config.color}>{config.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                {request.description}
              </p>
            </div>

            {/* AI Improved Description */}
            {request.ai_improved_description && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-primary">
                  <Sparkles className="h-3 w-3" />
                  AI-Improved Description
                </Label>
                <p className="text-sm whitespace-pre-wrap bg-primary/5 border border-primary/20 p-3 rounded-lg">
                  {request.ai_improved_description}
                </p>
              </div>
            )}

            {/* Screenshot */}
            {request.screenshot_url && (
              <div className="space-y-2">
                <Label>Screenshot</Label>
                <a href={request.screenshot_url} target="_blank" rel="noopener noreferrer">
                  <img 
                    src={request.screenshot_url} 
                    alt="Screenshot" 
                    className="max-h-48 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </a>
              </div>
            )}

            <Separator />

            {/* Technical Details */}
            <div className="space-y-3">
              <Label>Technical Details</Label>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <a 
                    href={request.page_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1 truncate"
                  >
                    {request.page_url}
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Monitor className="h-4 w-4" />
                  <span>{request.browser_info} • {request.device_type}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(request.created_at), 'PPpp')}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Admin Notes */}
            <div className="space-y-2">
              <Label htmlFor="admin-notes">Admin Notes</Label>
              <Textarea
                id="admin-notes"
                placeholder="Add internal notes..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
              <Button 
                size="sm" 
                onClick={handleSaveNotes}
                disabled={adminNotes === request.admin_notes}
              >
                Save Notes
              </Button>
            </div>

            <Separator />

            {/* Delete Action */}
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Request
            </Button>
          </div>
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
