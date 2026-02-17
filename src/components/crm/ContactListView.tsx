import { useState } from 'react';
import { Search, Plus, MoreHorizontal, Flame, Handshake, Snowflake, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useCRMContacts, useDeleteCRMContact, useUpdateCRMContact } from '@/services/useCRM';
import { AddContactDialog } from './AddContactDialog';
import { ContactDetailDialog } from './ContactDetailDialog';
import type { CRMContact, CRMSidebarCategory } from '@/types/crm';
import { toast } from 'sonner';

const RatingIcon = ({ rating }: { rating: string | null }) => {
  if (rating === 'hot') return <Flame className="h-4 w-4 text-red-500" />;
  if (rating === 'warm') return <Handshake className="h-4 w-4 text-orange-500" />;
  if (rating === 'cold') return <Snowflake className="h-4 w-4 text-blue-500" />;
  return <span className="text-xs text-muted-foreground">—</span>;
};

interface Props {
  category: CRMSidebarCategory;
}

export const ContactListView = ({ category }: Props) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filters = {
    search: search || undefined,
    is_archived: category === 'archived' ? true : false,
    rating: category === 'enquiries' ? undefined : category === 'prospects' ? 'warm' : category === 'clients' ? 'hot' : undefined,
    source: category === 'enquiries' ? 'enquiry' : undefined,
    page,
    per_page: perPage,
  };

  const { data, isLoading } = useCRMContacts(filters);
  const deleteMutation = useDeleteCRMContact();
  const updateMutation = useUpdateCRMContact();
  const contacts = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / perPage);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleArchive = (contact: CRMContact) => {
    updateMutation.mutate(
      { id: contact.id, is_archived: !contact.is_archived },
      { onSuccess: () => toast.success(contact.is_archived ? 'Contact restored' : 'Contact archived') }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, { onSuccess: () => toast.success('Contact deleted') });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Create New
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={contacts.length > 0 && selected.size === contacts.length}
                  onCheckedChange={(checked) => {
                    setSelected(checked ? new Set(contacts.map(c => c.id)) : new Set());
                  }}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No contacts found. Create your first contact to get started.
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedContact(contact.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(contact.id)}
                      onCheckedChange={() => toggleSelect(contact.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={contact.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {contact.first_name?.[0]}{contact.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{contact.first_name} {contact.last_name}</p>
                        {contact.job_title && <p className="text-xs text-muted-foreground">{contact.job_title}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{contact.email || '—'}</TableCell>
                  <TableCell className="text-sm">{contact.phone || '—'}</TableCell>
                  <TableCell className="text-sm">{contact.company?.name || '—'}</TableCell>
                  <TableCell>
                    {contact.source ? (
                      <Badge variant="secondary" className="text-xs">{contact.source}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell><RatingIcon rating={contact.rating} /></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedContact(contact.id)}>View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchive(contact)}>
                          {contact.is_archived ? 'Restore' : 'Archive'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(contact.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border">
          <span className="text-sm text-muted-foreground">{totalCount} contact{totalCount !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages || 1}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AddContactDialog open={addOpen} onOpenChange={setAddOpen} />
      <ContactDetailDialog contactId={selectedContact} onClose={() => setSelectedContact(null)} />
    </div>
  );
};
