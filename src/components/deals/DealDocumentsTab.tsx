import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Download, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useDealDocuments, useUploadDealDocument, useUpdateDealDocStatus } from '@/services/useCRMDeals';
import { format } from 'date-fns';

interface Props {
  dealId: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { icon: <Clock className="h-3 w-3" />, label: 'Pending', variant: 'secondary' },
  approved: { icon: <CheckCircle2 className="h-3 w-3" />, label: 'Approved', variant: 'default' },
  rejected: { icon: <XCircle className="h-3 w-3" />, label: 'Rejected', variant: 'destructive' },
};

export function DealDocumentsTab({ dealId }: Props) {
  const { data: docs, isLoading } = useDealDocuments(dealId);
  const uploadDoc = useUploadDealDocument();
  const updateStatus = useUpdateDealDocStatus();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadDoc.mutateAsync({ deal_id: dealId, file });
    if (fileRef.current) fileRef.current.value = '';
  };

  if (isLoading) return <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{docs?.length || 0} document(s)</p>
        <div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          <Button size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={uploadDoc.isPending}>
            <Upload className="h-3.5 w-3.5" /> Upload
          </Button>
        </div>
      </div>

      {!docs?.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">No documents uploaded yet</p>
      ) : (
        <Card className="divide-y">
          {docs.map((doc: any) => {
            const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
            return (
              <div key={doc.id} className="flex items-center gap-3 p-3">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(doc.created_at), 'dd MMM yyyy HH:mm')}
                    {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(0)} KB`}
                  </p>
                </div>
                <Badge variant={cfg.variant} className="gap-1 text-[10px] shrink-0">
                  {cfg.icon} {cfg.label}
                </Badge>
                {doc.status === 'pending' && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: doc.id, deal_id: dealId, status: 'approved' })}>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: doc.id, deal_id: dealId, status: 'rejected' })}>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
