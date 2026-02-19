/**
 * Campaign Settings Page
 * Manage sender identities and email suppressions
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Plus, Trash2, CheckCircle2, Clock, Mail, ShieldOff } from 'lucide-react';
import {
  useSenderIdentities,
  useCreateSenderIdentity,
  useDeleteSenderIdentity,
  useEmailSuppressions,
  useRemoveSuppression,
  useAddSuppression,
} from '@/services/useCampaigns';
import { useUserRole } from '@/hooks/useUserRole';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SenderForm {
  display_name: string;
  from_email: string;
  reply_to: string;
}

interface SuppressionForm {
  email: string;
  reason: string;
}

export default function CampaignSettingsPage() {
  const { isOwner, isAdmin } = useUserRole();
  const canManage = isOwner || isAdmin;

  const [senderDialogOpen, setSenderDialogOpen] = useState(false);
  const [deleteSenderId, setDeleteSenderId] = useState<string | null>(null);
  const [deleteSuppressionId, setDeleteSuppressionId] = useState<string | null>(null);
  const [suppressionDialogOpen, setSuppressionDialogOpen] = useState(false);

  const { data: identities = [], isLoading: loadingIdentities } = useSenderIdentities();
  const suppressionsQuery = useEmailSuppressions();
  const suppressions = Array.isArray(suppressionsQuery.data) ? suppressionsQuery.data : (suppressionsQuery.data?.data ?? []);
  const loadingSuppressions = suppressionsQuery.isLoading;

  const createSender = useCreateSenderIdentity();
  const deleteSender = useDeleteSenderIdentity();
  const createSuppression = useAddSuppression();
  const deleteSuppression = useRemoveSuppression();

  const senderForm = useForm<SenderForm>({
    defaultValues: { display_name: '', from_email: '', reply_to: '' },
  });

  const suppressionForm = useForm<SuppressionForm>({
    defaultValues: { email: '', reason: '' },
  });

  const handleCreateSender = async (data: SenderForm) => {
    try {
      await createSender.mutateAsync(data);
      toast.success('Sender identity added');
      setSenderDialogOpen(false);
      senderForm.reset();
    } catch {
      toast.error('Failed to add sender identity');
    }
  };

  const handleDeleteSender = async () => {
    if (!deleteSenderId) return;
    try {
      await deleteSender.mutateAsync(deleteSenderId);
      toast.success('Sender identity removed');
    } catch {
      toast.error('Failed to remove sender identity');
    } finally {
      setDeleteSenderId(null);
    }
  };

  const handleAddSuppression = async (data: SuppressionForm) => {
    try {
      await createSuppression.mutateAsync({ email: data.email, type: 'manual', reason: data.reason || undefined });
      toast.success('Email added to suppression list');
      setSuppressionDialogOpen(false);
      suppressionForm.reset();
    } catch {
      toast.error('Failed to add suppression');
    }
  };

  const handleDeleteSuppression = async () => {
    if (!deleteSuppressionId) return;
    try {
      await deleteSuppression.mutateAsync(deleteSuppressionId);
      toast.success('Email removed from suppression list');
    } catch {
      toast.error('Failed to remove suppression');
    } finally {
      setDeleteSuppressionId(null);
    }
  };

  return (
    <div className="container px-4 md:px-8 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Campaign Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage sender identities and email suppression lists
        </p>
      </div>

      <Tabs defaultValue="senders">
        <TabsList className="mb-6">
          <TabsTrigger value="senders">Sender Identities</TabsTrigger>
          <TabsTrigger value="suppressions">Suppression List</TabsTrigger>
        </TabsList>

        {/* Sender Identities */}
        <TabsContent value="senders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Sender Identities</CardTitle>
                <CardDescription>
                  Configure who your emails appear to come from. All emails are delivered via the GlobalyOS sending infrastructure.
                </CardDescription>
              </div>
              {canManage && (
                <Button size="sm" onClick={() => setSenderDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Sender
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingIdentities ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : identities.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No sender identities configured yet</p>
                  {canManage && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setSenderDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add your first sender
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {identities.map(identity => (
                    <div key={identity.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{identity.display_name}</p>
                          <p className="text-xs text-muted-foreground">{identity.from_email}</p>
                          {identity.reply_to && (
                            <p className="text-xs text-muted-foreground">Reply-to: {identity.reply_to}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {identity.is_default && (
                          <Badge variant="secondary" className="text-[10px]">Default</Badge>
                        )}
                        <Badge
                          variant={identity.is_verified ? 'default' : 'outline'}
                          className={`text-[10px] gap-1 ${identity.is_verified ? 'bg-green-100 text-green-700 border-green-200' : ''}`}
                        >
                          {identity.is_verified ? (
                            <CheckCircle2 className="h-2.5 w-2.5" />
                          ) : (
                            <Clock className="h-2.5 w-2.5" />
                          )}
                          {identity.is_verified ? 'Verified' : 'Pending'}
                        </Badge>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteSenderId(identity.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">About email delivery</p>
                <p>
                  Emails are sent via the GlobalyOS infrastructure. Sender identities control the "From" name and email address recipients see.
                  For best deliverability, use an email address from your verified domain.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppression List */}
        <TabsContent value="suppressions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Suppression List</CardTitle>
                <CardDescription>
                  Emails on this list will never receive campaigns from your organisation, regardless of audience filters.
                </CardDescription>
              </div>
              {canManage && (
                <Button size="sm" onClick={() => setSuppressionDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Email
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingSuppressions ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : suppressions.length === 0 ? (
                <div className="text-center py-8">
                  <ShieldOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No suppressed emails</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Emails are automatically added here when contacts unsubscribe or emails bounce
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-4 px-3 text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                    <span>Email</span>
                    <span>Reason</span>
                    <span>Added</span>
                  </div>
                  {suppressions.map(suppression => (
                    <div key={suppression.id} className="grid grid-cols-3 gap-4 items-center p-3 rounded-lg border bg-card text-sm">
                      <span className="text-foreground font-medium truncate">{suppression.email}</span>
                      <Badge variant="outline" className="text-[10px] w-fit capitalize">
                        {suppression.type}
                      </Badge>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(suppression.created_at), 'dd MMM yyyy')}
                        </span>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteSuppressionId(suppression.id)}
                          >
                            <Trash2 className="h-3 w-3" />
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
      </Tabs>

      {/* Add Sender Dialog */}
      <Dialog open={senderDialogOpen} onOpenChange={setSenderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sender Identity</DialogTitle>
            <DialogDescription>
              Configure a sender name and email address for your campaigns.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={senderForm.handleSubmit(handleCreateSender)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                placeholder="e.g. Acme Corp Marketing"
                {...senderForm.register('display_name', { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_email">From Email</Label>
              <Input
                id="from_email"
                type="email"
                placeholder="e.g. hello@acme.com"
                {...senderForm.register('from_email', { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply_to">Reply-To (optional)</Label>
              <Input
                id="reply_to"
                type="email"
                placeholder="e.g. support@acme.com"
                {...senderForm.register('reply_to')}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSenderDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSender.isPending}>
                {createSender.isPending ? 'Adding...' : 'Add Sender'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Suppression Dialog */}
      <Dialog open={suppressionDialogOpen} onOpenChange={setSuppressionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Suppression List</DialogTitle>
            <DialogDescription>
              This email will be excluded from all future campaigns.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={suppressionForm.handleSubmit(handleAddSuppression)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                {...suppressionForm.register('email', { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                placeholder="e.g. Opted out manually"
                {...suppressionForm.register('reason')}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSuppressionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSuppression.isPending}>
                {createSuppression.isPending ? 'Adding...' : 'Add to List'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Sender Confirmation */}
      <AlertDialog open={!!deleteSenderId} onOpenChange={() => setDeleteSenderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove sender identity?</AlertDialogTitle>
            <AlertDialogDescription>
              Campaigns using this sender will retain the email address but you won't be able to select it for new campaigns.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSender}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Suppression Confirmation */}
      <AlertDialog open={!!deleteSuppressionId} onOpenChange={() => setDeleteSuppressionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from suppression list?</AlertDialogTitle>
            <AlertDialogDescription>
              This email will be eligible to receive future campaigns again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSuppression}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
