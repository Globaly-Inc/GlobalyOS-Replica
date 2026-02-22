import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Plus, Trash2, Save, Copy, FileText, MessageSquare, Settings, Eye, EyeOff } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { PageBody } from '@/components/ui/page-body';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { SortableOptionItem } from '@/components/crm/quotations/SortableOptionItem';
import { QuotationLivePreview } from '@/components/crm/quotations/QuotationLivePreview';
import {
  useCRMQuotationDetail,
  useUpdateQuotation,
  useDeleteQuotation,
  useAddQuotationOption,
  useDeleteQuotationOption,
  useUpdateQuotationOption,
  useAddOptionService,
  useDeleteOptionService,
  useAddServiceFee,
  useDeleteServiceFee,
  useUpdateServiceFee,
  useReorderOptions,
  useReorderServices,
  useSendQuotation,
  useCRMQuotationComments,
  useAddQuotationComment,
} from '@/services/useCRMQuotations';
import { useCRMServices } from '@/services/useCRMServices';
import { QuotationOptionEditor } from '@/components/crm/quotations/QuotationOptionEditor';
import { QuotationSettingsForm } from '@/components/crm/quotations/QuotationSettingsForm';
import { SendQuotationEmailDialog } from '@/components/crm/quotations/SendQuotationEmailDialog';

import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
  processed: 'bg-purple-100 text-purple-700',
  archived: 'bg-gray-100 text-gray-500',
};

const QuotationDetailPage = () => {
  const { id, orgCode } = useParams<{ id: string; orgCode: string }>();
  const navigate = useNavigate();
  const { data: quotation, isLoading } = useCRMQuotationDetail(id);
  const updateMutation = useUpdateQuotation();
  const deleteMutation = useDeleteQuotation();
  const addOptionMutation = useAddQuotationOption();
  const deleteOptionMutation = useDeleteQuotationOption();
  const updateOptionMutation = useUpdateQuotationOption();
  const addServiceMutation = useAddOptionService();
  const deleteServiceMutation = useDeleteOptionService();
  const addFeeMutation = useAddServiceFee();
  const deleteFeeMutation = useDeleteServiceFee();
  const updateFeeMutation = useUpdateServiceFee();
  const reorderOptionsMutation = useReorderOptions();
  const reorderServicesMutation = useReorderServices();
  const sendMutation = useSendQuotation();
  const { data: comments } = useCRMQuotationComments(id);
  const addCommentMutation = useAddQuotationComment();
  const { data: servicesData } = useCRMServices();

  const [notes, setNotes] = useState('');
  const [commentText, setCommentText] = useState('');
  const [newOptionName, setNewOptionName] = useState('');
  const [activeTab, setActiveTab] = useState('options');
  const [showPreview, setShowPreview] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const services = servicesData?.data || [];
  const isDraft = quotation?.status === 'draft';

  if (isLoading) {
    return (
      <PageBody>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </PageBody>
    );
  }

  if (!quotation) {
    return (
      <PageBody>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Quotation not found</p>
        </div>
      </PageBody>
    );
  }

  const handleAddOption = async () => {
    const name = newOptionName.trim() || `Option ${(quotation.options?.length || 0) + 1}`;
    await addOptionMutation.mutateAsync({
      quotation_id: quotation.id,
      name,
      sort_order: (quotation.options?.length || 0),
    });
    setNewOptionName('');
  };

  const handleSend = async () => {
    await sendMutation.mutateAsync(quotation.id);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(quotation.id);
    navigate(`/org/${orgCode}/crm/quotations`);
  };

  const handleSaveNotes = async () => {
    await updateMutation.mutateAsync({ id: quotation.id, notes });
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    await addCommentMutation.mutateAsync({ quotation_id: quotation.id, content: commentText });
    setCommentText('');
  };

  const handleOptionDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const options = quotation.options || [];
    const oldIndex = options.findIndex(o => o.id === active.id);
    const newIndex = options.findIndex(o => o.id === over.id);
    const reordered = arrayMove(options, oldIndex, newIndex);
    reorderOptionsMutation.mutate({
      quotation_id: quotation.id,
      items: reordered.map((o, i) => ({ id: o.id, sort_order: i })),
    });
  };

  const publicUrl = quotation.public_token
    ? `${window.location.origin}/quote/${quotation.public_token}`
    : null;

  const contactName = quotation.contact
    ? `${quotation.contact.first_name} ${quotation.contact.last_name || ''}`.trim()
    : null;

  const optionIds = (quotation.options || []).map(o => o.id);

  const editorPanel = (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Enhanced header card */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge className={`capitalize ${statusColors[quotation.status] || ''}`}>{quotation.status}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Grand Total</p>
              <p className="text-lg font-semibold tabular-nums">{quotation.currency} {quotation.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Contact</p>
              <p className="text-sm font-medium">{contactName || 'None'}</p>
              {quotation.company && <p className="text-xs text-muted-foreground">{quotation.company.name}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Valid Until</p>
              <p className="text-sm">{quotation.valid_until ? format(new Date(quotation.valid_until), 'dd MMM yyyy') : 'Not set'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="options">
            <FileText className="h-4 w-4 mr-1" /> Options & Services
          </TabsTrigger>
          <TabsTrigger value="comments">
            <MessageSquare className="h-4 w-4 mr-1" /> Comments ({comments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-1" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="options" className="space-y-4 mt-4">
          {/* Options with DnD */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleOptionDragEnd}>
            <SortableContext items={optionIds} strategy={verticalListSortingStrategy}>
              {quotation.options?.map(option => (
                <SortableOptionItem key={option.id} id={option.id}>
                  {(dragHandleProps) => (
                    <QuotationOptionEditor
                      option={option}
                      currency={quotation.currency}
                      isDraft={isDraft}
                      services={services}
                      dragHandleProps={dragHandleProps}
                      onDeleteOption={() => deleteOptionMutation.mutateAsync({ id: option.id, quotation_id: quotation.id })}
                      onAddService={(serviceId, serviceName, partnerId, serviceDate) =>
                        addServiceMutation.mutateAsync({
                          option_id: option.id,
                          quotation_id: quotation.id,
                          service_id: serviceId,
                          service_name: serviceName,
                          partner_id: partnerId,
                        })
                      }
                      onDeleteService={(serviceId) =>
                        deleteServiceMutation.mutateAsync({ id: serviceId, quotation_id: quotation.id })
                      }
                      onAddFee={(optionServiceId, feeName, amount, taxMode, taxRate, revenueType, installmentType, numInstallments, installmentDetails) =>
                        addFeeMutation.mutateAsync({
                          option_service_id: optionServiceId,
                          quotation_id: quotation.id,
                          fee_name: feeName,
                          amount,
                          tax_mode: taxMode,
                          tax_rate: taxRate,
                          revenue_type: revenueType,
                        })
                      }
                      onDeleteFee={(feeId) =>
                        deleteFeeMutation.mutateAsync({ id: feeId, quotation_id: quotation.id })
                      }
                      onUpdateOption={(data) =>
                        updateOptionMutation.mutateAsync({ id: option.id, quotation_id: quotation.id, ...data })
                      }
                      onUpdateFee={(feeId, data) =>
                        updateFeeMutation.mutate({ id: feeId, quotation_id: quotation.id, ...data } as any)
                      }
                      onReorderServices={(items) =>
                        reorderServicesMutation.mutate({ quotation_id: quotation.id, items })
                      }
                    />
                  )}
                </SortableOptionItem>
              ))}
            </SortableContext>
          </DndContext>

          {/* Add option */}
          {isDraft && (
            <Card className="border-dashed">
              <CardContent className="flex items-center gap-3 py-4">
                <Input
                  placeholder="Option name (e.g. Package A)"
                  value={newOptionName}
                  onChange={e => setNewOptionName(e.target.value)}
                  className="flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleAddOption()}
                />
                <Button onClick={handleAddOption} disabled={addOptionMutation.isPending} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Option
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes || quotation.notes || ''}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add internal notes..."
                rows={3}
              />
              <Button size="sm" className="mt-2" onClick={handleSaveNotes} disabled={updateMutation.isPending}>
                <Save className="h-3 w-3 mr-1" /> Save Notes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <Card>
            <CardContent className="py-4 space-y-4">
              {comments?.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{c.author_name || c.author_type}</span>
                      <Badge variant="outline" className="text-xs capitalize">{c.author_type}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), 'dd MMM yyyy HH:mm')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.content}</p>
                  </div>
                </div>
              ))}
              {(!comments || comments.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
              )}
              <Separator />
              <div className="flex gap-2">
                <Input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                />
                <Button onClick={handleAddComment} disabled={addCommentMutation.isPending} size="sm">
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <QuotationSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <PageBody className="!p-0 h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-base truncate">{quotation.quotation_number}</h1>
            <Badge className={`capitalize text-xs ${statusColors[quotation.status] || ''}`}>{quotation.status}</Badge>
          </div>
          {contactName && <p className="text-xs text-muted-foreground truncate">{contactName}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? 'Hide preview' : 'Show preview'}
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          {(isDraft || quotation.status === 'sent' || quotation.status === 'viewed') && (
            <SendQuotationEmailDialog quotation={quotation as any}>
              <Button size="sm" className="gap-1.5" disabled={!quotation.contact?.email && isDraft}>
                <Send className="h-3.5 w-3.5" /> {isDraft ? 'Send' : 'Resend'}
              </Button>
            </SendQuotationEmailDialog>
          )}
          {publicUrl && (
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(publicUrl);
              toast.success('Link copied');
            }}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" className="h-8 w-8">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete quotation?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Two-panel layout */}
      {showPreview ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={60} minSize={40}>
            {editorPanel}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={40} minSize={25}>
            <QuotationLivePreview quotation={quotation} />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        editorPanel
      )}
    </PageBody>
  );
};

export default QuotationDetailPage;
