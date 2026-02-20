import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Share2, Download } from 'lucide-react';
import { ShareFormDialog } from '@/components/forms/ShareFormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageBody } from '@/components/ui/page-body';
import { useForm, useFormSubmissions, useUpdateSubmissionStatus } from '@/services/useForms';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FormSubmission } from '@/types/forms';

export default function FormDetailPage() {
  const { orgCode, formId } = useParams<{ orgCode: string; formId: string }>();
  const navigate = useNavigate();
  const { data: form } = useForm(formId);
  const { data: submissions, isLoading } = useFormSubmissions(formId);
  const updateStatus = useUpdateSubmissionStatus();
  const [viewingSub, setViewingSub] = useState<FormSubmission | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  function exportCSV() {
    if (!submissions?.length) return;
    const allKeys = new Set<string>();
    submissions.forEach((s) => Object.keys(s.answers).forEach((k) => allKeys.add(k)));
    const keys = Array.from(allKeys);
    const header = ['Submitted At', 'Status', ...keys].join(',');
    const rows = submissions.map((s) =>
      [format(new Date(s.submitted_at), 'yyyy-MM-dd HH:mm'), s.status, ...keys.map((k) => JSON.stringify(s.answers[k] ?? ''))].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form?.slug || 'form'}-submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statusColors: Record<string, string> = {
    new: 'bg-primary/10 text-primary',
    in_review: 'bg-amber-100 text-amber-800',
    resolved: 'bg-green-100 text-green-800',
    spam: 'bg-destructive/10 text-destructive',
  };

  return (
    <PageBody>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/org/${orgCode}/crm/forms`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{form?.name || 'Form'}</h1>
          <div className="flex items-center gap-2 mt-1">
            {form?.status && <Badge variant="secondary" className={form.status === 'published' ? 'bg-primary/10 text-primary' : ''}>{form.status}</Badge>}
            <span className="text-xs text-muted-foreground">/{form?.slug}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/org/${orgCode}/crm/forms/${formId}/builder`)}>
          <Pencil className="h-4 w-4 mr-1" /> Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 className="h-4 w-4 mr-1" /> Share
        </Button>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!submissions?.length}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{submissions?.length ?? 0}</div><div className="text-xs text-muted-foreground">Total Submissions</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{submissions?.filter((s) => s.status === 'new').length ?? 0}</div><div className="text-xs text-muted-foreground">New</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{submissions?.filter((s) => s.status === 'in_review').length ?? 0}</div><div className="text-xs text-muted-foreground">In Review</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{submissions?.filter((s) => s.status === 'resolved').length ?? 0}</div><div className="text-xs text-muted-foreground">Resolved</div></CardContent></Card>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : !submissions?.length ? (
            <p className="text-center text-muted-foreground py-8">No submissions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub) => {
                  const preview = Object.values(sub.answers).slice(0, 2).map(String).join(', ');
                  return (
                    <TableRow key={sub.id} className="cursor-pointer" onClick={() => setViewingSub(sub)}>
                      <TableCell className="text-sm">{format(new Date(sub.submitted_at), 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[sub.status]}>{sub.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{preview || '—'}</TableCell>
                      <TableCell>
                        <Select
                          value={sub.status}
                          onValueChange={(v) => { updateStatus.mutate({ id: sub.id, status: v, formId: formId! }); }}
                        >
                          <SelectTrigger className="h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="in_review">In Review</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="spam">Spam</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Submission Viewer */}
      <ShareFormDialog open={shareOpen} onOpenChange={setShareOpen} form={form ?? null} orgCode={orgCode || ''} />

      <Dialog open={!!viewingSub} onOpenChange={() => setViewingSub(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submission Detail</DialogTitle>
            <DialogDescription>View the details of this form submission.</DialogDescription>
          </DialogHeader>
          {viewingSub && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">Submitted: {format(new Date(viewingSub.submitted_at), 'PPpp')}</div>
              <div className="space-y-2">
                {Object.entries(viewingSub.answers).map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b border-border pb-1">
                    <span className="text-sm font-medium">{key}</span>
                    <span className="text-sm text-muted-foreground">{String(val)}</span>
                  </div>
                ))}
              </div>
              {viewingSub.computed && Object.keys(viewingSub.computed).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Computed</h4>
                  {Object.entries(viewingSub.computed).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span>{key}</span><span>{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
              {viewingSub.payment && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Payment</h4>
                  <div className="text-sm">Status: <Badge variant="secondary">{viewingSub.payment.status}</Badge></div>
                  {viewingSub.payment.amount && <div className="text-sm">Amount: {viewingSub.payment.currency?.toUpperCase()} {viewingSub.payment.amount}</div>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}
