/**
 * InvoiceComments - Comment thread for invoice (used in detail and public views)
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceComments, useCreateInvoiceComment } from '@/services/useAccountingInvoices';
import type { InvoiceCommentAuthorType } from '@/types/accounting';

interface Props {
  invoiceId: string;
  authorType?: InvoiceCommentAuthorType;
  authorName?: string;
  isPublic?: boolean;
}

export const InvoiceComments = ({ invoiceId, authorType = 'staff', authorName, isPublic = false }: Props) => {
  const { data: comments = [], isLoading } = useInvoiceComments(invoiceId);
  const createComment = useCreateInvoiceComment();
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;
    try {
      await createComment.mutateAsync({
        invoice_id: invoiceId,
        author_type: authorType,
        author_name: authorName,
        content: content.trim(),
      });
      setContent('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAuthorColor = (type: string) => {
    switch (type) {
      case 'staff': return 'bg-primary text-primary-foreground';
      case 'client': return 'bg-accent text-accent-foreground';
      case 'partner': return 'bg-secondary text-secondary-foreground';
      case 'system': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" />
        Comments ({comments.length})
      </div>

      {/* Comment list */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className={`text-[10px] ${getAuthorColor(c.author_type)}`}>
                {getInitials(c.author_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{c.author_name || c.author_type}</span>
                <span className="text-[10px] text-muted-foreground">{formatDate(c.created_at)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{c.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && !isLoading && (
          <p className="text-xs text-muted-foreground text-center py-4">No comments yet</p>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment…"
          className="text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <Button size="icon" onClick={handleSubmit} disabled={!content.trim() || createComment.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
