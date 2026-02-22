import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Download, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PublicQuotation {
  id: string;
  quotation_number: string;
  status: string;
  currency: string;
  valid_until: string | null;
  notes: string | null;
  cover_letter: string | null;
  grand_total: number;
  subtotal: number;
  tax_total: number;
  discount_amount: number;
  approved_option_id: string | null;
  approved_by_name: string | null;
  options: Array<{
    id: string;
    name: string;
    description: string | null;
    total: number;
    subtotal: number;
    tax_total: number;
    services: Array<{
      id: string;
      service_name: string;
      fees: Array<{
        id: string;
        fee_name: string;
        amount: number;
        tax_amount: number;
        total_amount: number;
      }>;
    }>;
  }>;
  organization?: { name: string; logo_url?: string } | null;
}

const QuotationPublicPage = () => {
  const { token } = useParams<{ token: string }>();
  const [quotation, setQuotation] = useState<PublicQuotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [approverName, setApproverName] = useState('');
  const [approverEmail, setApproverEmail] = useState('');
  const [comment, setComment] = useState('');
  const [showApproveForm, setShowApproveForm] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchQuotation();
  }, [token]);

  const fetchQuotation = async () => {
    try {
      // Fetch quotation by public token
      const { data: q, error: qErr } = await supabase
        .from('crm_quotations')
        .select(`
          id, quotation_number, status, currency, valid_until, notes, cover_letter,
          grand_total, subtotal, tax_total, discount_amount, approved_option_id,
          approved_by_name, token_expires_at
        `)
        .eq('public_token', token!)
        .single();

      if (qErr || !q) {
        setError('Quotation not found or link has expired');
        setLoading(false);
        return;
      }

      // Check expiry
      if (q.token_expires_at && new Date(q.token_expires_at) < new Date()) {
        setError('This quotation link has expired');
        setLoading(false);
        return;
      }

      // Mark as viewed if sent
      if (q.status === 'sent') {
        await supabase
          .from('crm_quotations')
          .update({ status: 'viewed' as any, viewed_at: new Date().toISOString() })
          .eq('id', q.id);
      }

      // Fetch options
      const { data: options } = await supabase
        .from('crm_quotation_options')
        .select('*')
        .eq('quotation_id', q.id)
        .order('sort_order');

      const optionIds = (options || []).map(o => o.id);
      let services: any[] = [];
      if (optionIds.length > 0) {
        const { data: svcData } = await supabase
          .from('crm_quotation_option_services')
          .select('*')
          .in('option_id', optionIds)
          .order('sort_order');
        services = svcData || [];
      }

      const serviceIds = services.map(s => s.id);
      let fees: any[] = [];
      if (serviceIds.length > 0) {
        const { data: feeData } = await supabase
          .from('crm_quotation_service_fees')
          .select('*')
          .in('option_service_id', serviceIds);
        fees = feeData || [];
      }

      const assembledOptions = (options || []).map(o => ({
        ...o,
        services: services.filter(s => s.option_id === o.id).map(s => ({
          ...s,
          fees: fees.filter(f => f.option_service_id === s.id),
        })),
      }));

      setQuotation({ ...q, options: assembledOptions } as unknown as PublicQuotation);
    } catch {
      setError('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedOptionId || !approverName.trim()) {
      toast.error('Please select an option and enter your name');
      return;
    }

    setApproving(true);
    try {
      // Use the edge function for secure approval
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-quotation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            token,
            option_id: selectedOptionId,
            approver_name: approverName,
            approver_email: approverEmail || null,
            comment: comment.trim() || null,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to approve');

      toast.success('Quotation approved successfully!');
      await fetchQuotation();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve quotation');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-3xl p-6 space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Unable to Load Quotation</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quotation) return null;

  const isApproved = quotation.status === 'approved' || quotation.status === 'processed';
  const canApprove = quotation.status === 'sent' || quotation.status === 'viewed';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Quotation {quotation.quotation_number}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge className="capitalize">{quotation.status}</Badge>
            {quotation.valid_until && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Valid until {format(new Date(quotation.valid_until), 'dd MMM yyyy')}
              </span>
            )}
          </div>
          {quotation.cover_letter && (
            <p className="mt-4 text-muted-foreground whitespace-pre-line">{quotation.cover_letter}</p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-4 mb-8">
          {quotation.options.map(option => {
            const isSelected = selectedOptionId === option.id;
            const isApprovedOption = quotation.approved_option_id === option.id;

            return (
              <Card
                key={option.id}
                className={`transition-all cursor-pointer ${
                  isSelected ? 'ring-2 ring-primary' : ''
                } ${isApprovedOption ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950/20' : ''}`}
                onClick={() => canApprove && setSelectedOptionId(option.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{option.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {isApprovedOption && (
                        <Badge className="bg-green-600"><Check className="h-3 w-3 mr-1" /> Approved</Badge>
                      )}
                      <span className="font-semibold">
                        {quotation.currency} {option.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  {option.description && (
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {option.services.map(svc => (
                    <div key={svc.id} className="mb-3 last:mb-0">
                      <p className="font-medium text-sm mb-1">{svc.service_name}</p>
                      {svc.fees.map(fee => (
                        <div key={fee.id} className="flex justify-between text-sm text-muted-foreground ml-4">
                          <span>{fee.fee_name}</span>
                          <span>{quotation.currency} {fee.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Totals */}
        <Card className="mb-8">
          <CardContent className="py-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Subtotal</span>
              <span>{quotation.currency} {quotation.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {quotation.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-green-600 mb-1">
                <span>Discount</span>
                <span>-{quotation.currency} {quotation.discount_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-sm mb-2">
              <span>Tax</span>
              <span>{quotation.currency} {quotation.tax_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{quotation.currency} {quotation.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>

        {/* Approve Section */}
        {canApprove && (
          <Card>
            <CardContent className="py-6">
              {!showApproveForm ? (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Select an option above and click approve to accept this quotation
                  </p>
                  <Button
                    onClick={() => setShowApproveForm(true)}
                    disabled={!selectedOptionId}
                    size="lg"
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" /> Approve Quotation
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold">Confirm Approval</h3>
                  <Input
                    placeholder="Your name *"
                    value={approverName}
                    onChange={e => setApproverName(e.target.value)}
                  />
                  <Input
                    placeholder="Your email"
                    type="email"
                    value={approverEmail}
                    onChange={e => setApproverEmail(e.target.value)}
                  />
                  <Textarea
                    placeholder="Add a comment (optional)"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleApprove} disabled={approving || !approverName.trim()} className="gap-2">
                      <Check className="h-4 w-4" /> Confirm Approval
                    </Button>
                    <Button variant="outline" onClick={() => setShowApproveForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isApproved && (
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <CardContent className="py-6 text-center">
              <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-green-700">Quotation Approved</h3>
              {quotation.approved_by_name && (
                <p className="text-sm text-muted-foreground mt-1">By {quotation.approved_by_name}</p>
              )}
            </CardContent>
          </Card>
        )}

        {quotation.notes && (
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{quotation.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QuotationPublicPage;
