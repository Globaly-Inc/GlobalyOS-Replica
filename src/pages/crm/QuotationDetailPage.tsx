import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Plus, Trash2, Save, Copy, FileText, MessageSquare } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useCRMQuotationDetail,
  useUpdateQuotation,
  useDeleteQuotation,
  useAddQuotationOption,
  useDeleteQuotationOption,
  useAddOptionService,
  useAddServiceFee,
  useSendQuotation,
  useCRMQuotationComments,
  useAddQuotationComment,
} from '@/services/useCRMQuotations';
import { useCRMServices } from '@/services/useCRMServices';

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

const QuotationDetailPage = () => {
  const { id, orgCode } = useParams<{ id: string; orgCode: string }>();
  const navigate = useNavigate();
  const { data: quotation, isLoading } = useCRMQuotationDetail(id);
  const updateMutation = useUpdateQuotation();
  const deleteMutation = useDeleteQuotation();
  const addOptionMutation = useAddQuotationOption();
  const deleteOptionMutation = useDeleteQuotationOption();
  const addServiceMutation = useAddOptionService();
  const addFeeMutation = useAddServiceFee();
  const sendMutation = useSendQuotation();
  const { data: comments } = useCRMQuotationComments(id);
  const addCommentMutation = useAddQuotationComment();
  const { data: servicesData } = useCRMServices();

  const [notes, setNotes] = useState('');
  const [commentText, setCommentText] = useState('');
  const [newOptionName, setNewOptionName] = useState('');
  const [activeTab, setActiveTab] = useState('options');

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

  const handleAddService = async (optionId: string, serviceId: string, serviceName: string) => {
    await addServiceMutation.mutateAsync({
      option_id: optionId,
      quotation_id: quotation.id,
      service_id: serviceId || null,
      service_name: serviceName,
    });
  };

  const handleAddFee = async (optionServiceId: string, feeName: string, amount: number) => {
    await addFeeMutation.mutateAsync({
      option_service_id: optionServiceId,
      quotation_id: quotation.id,
      fee_name: feeName,
      amount,
      tax_mode: 'exclusive',
      tax_rate: 10,
    });
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

  const publicUrl = quotation.public_token
    ? `${window.location.origin}/quote/${quotation.public_token}`
    : null;

  return (
    <PageBody>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader title={quotation.quotation_number} subtitle={
            quotation.contact
              ? `${quotation.contact.first_name} ${quotation.contact.last_name || ''}`
              : 'No contact assigned'
          }>
            <div className="flex gap-2">
              {isDraft && (
                <Button onClick={handleSend} disabled={sendMutation.isPending} className="gap-2">
                  <Send className="h-4 w-4" /> Send
                </Button>
              )}
              {publicUrl && (
                <Button variant="outline" size="sm" onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  toast.success('Link copied');
                }}>
                  <Copy className="h-4 w-4 mr-1" /> Copy Link
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
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
          </PageHeader>
        </div>
      </div>

      {/* Status + Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge className="mt-1 capitalize">{quotation.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Grand Total</p>
            <p className="text-lg font-semibold">{quotation.currency} {quotation.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Options</p>
            <p className="text-lg font-semibold">{quotation.options?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm">{format(new Date(quotation.created_at), 'dd MMM yyyy')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="options">
            <FileText className="h-4 w-4 mr-1" /> Options & Services
          </TabsTrigger>
          <TabsTrigger value="comments">
            <MessageSquare className="h-4 w-4 mr-1" /> Comments ({comments?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="options" className="space-y-4 mt-4">
          {/* Options */}
          {quotation.options?.map(option => (
            <Card key={option.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{option.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {option.is_approved && <Badge variant="default" className="bg-green-600">Approved</Badge>}
                    <span className="text-sm font-medium">
                      {quotation.currency} {option.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    {isDraft && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteOptionMutation.mutateAsync({ id: option.id, quotation_id: quotation.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Services in this option */}
                {option.services?.map(svc => (
                  <div key={svc.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{svc.service_name}</span>
                      {svc.partner && <Badge variant="outline" className="text-xs">{svc.partner.name}</Badge>}
                    </div>
                    {/* Fees */}
                    {svc.fees && svc.fees.length > 0 ? (
                      <div className="space-y-1">
                        {svc.fees.map(fee => (
                          <div key={fee.id} className="flex justify-between text-sm text-muted-foreground">
                            <span>{fee.fee_name}</span>
                            <span>{quotation.currency} {fee.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      isDraft && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleAddFee(svc.id, 'Service Fee', 1000)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Fee
                        </Button>
                      )
                    )}
                  </div>
                ))}

                {/* Add service button */}
                {isDraft && (
                  <div className="flex gap-2 mt-2">
                    <Select onValueChange={(val) => {
                      const svc = services.find(s => s.id === val);
                      if (svc) handleAddService(option.id, svc.id, svc.name);
                    }}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Add a service..." />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Add option */}
          {isDraft && (
            <Card className="border-dashed">
              <CardContent className="flex items-center gap-3 py-4">
                <Input
                  placeholder="Option name (e.g. Package A)"
                  value={newOptionName}
                  onChange={e => setNewOptionName(e.target.value)}
                  className="flex-1"
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
      </Tabs>
    </PageBody>
  );
};

export default QuotationDetailPage;
