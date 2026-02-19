import { useState } from 'react';
import { Search, Plus, MoreHorizontal, Flame, Handshake, Snowflake, ChevronLeft, ChevronRight, Tag, X, Users, Archive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useCRMContacts, useDeleteCRMContact, useUpdateCRMContact } from '@/services/useCRM';
import { useCRMTags } from '@/services/useCRMTags';
import { AddContactDialog } from './AddContactDialog';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import type { CRMContact, CRMSidebarCategory } from '@/types/crm';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const RatingIcon = ({ rating }: { rating: string | null }) => {
  if (rating === 'hot') return <Flame className="h-4 w-4 text-red-500" />;
  if (rating === 'warm') return <Handshake className="h-4 w-4 text-orange-500" />;
  if (rating === 'cold') return <Snowflake className="h-4 w-4 text-blue-500" />;
  return <span className="text-xs text-muted-foreground">—</span>;
};

const categoryTabs: { key: CRMSidebarCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'all', label: 'All Contacts', icon: Users },
  { key: 'archived', label: 'Archived', icon: Archive },
];

export const ContactListView = () => {
  const [category, setCategory] = useState<CRMSidebarCategory>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const { navigateOrg } = useOrgNavigation();
  const { data: orgTags = [] } = useCRMTags();

  const filters = {
    search: search || undefined,
    is_archived: category === 'archived' ? true : false,
    tags: tagFilter ? [tagFilter] : undefined,
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

  const toggleSelectAll = (checked: boolean) => {
    setSelected(checked ? new Set(contacts.map(c => c.id)) : new Set());
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

  const handleBulkAddTag = (tagName: string) => {
    const selectedContacts = contacts.filter(c => selected.has(c.id));
    let done = 0;
    selectedContacts.forEach(c => {
      const existingTags = c.tags || [];
      if (existingTags.includes(tagName)) { done++; if (done === selectedContacts.length) toast.success('Tags updated'); return; }
      updateMutation.mutate(
        { id: c.id, tags: [...existingTags, tagName] },
        { onSuccess: () => { done++; if (done === selectedContacts.length) toast.success('Tags updated'); } }
      );
    });
    setBulkTagOpen(false);
  };

  const handleBulkRemoveTag = (tagName: string) => {
    const selectedContacts = contacts.filter(c => selected.has(c.id));
    let done = 0;
    selectedContacts.forEach(c => {
      const existingTags = c.tags || [];
      updateMutation.mutate(
        { id: c.id, tags: existingTags.filter(t => t !== tagName) },
        { onSuccess: () => { done++; if (done === selectedContacts.length) toast.success('Tags removed'); } }
      );
    });
    setBulkTagOpen(false);
  };

  const getTagColor = (name: string) => orgTags.find(t => t.name === name)?.color || undefined;

  return (
    <div className="space-y-6 pt-4 md:pt-6">
      {/* Header — matches Leave History pattern */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" />
            Contacts
          </h1>
          <p className="text-muted-foreground hidden md:block">Manage your contacts and leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create New
          </Button>
        </div>
      </div>

      {/* Filter bar — same sticky pill bar as Leave History */}
      <div className="sticky top-0 z-10 pb-2 pt-2 rounded-lg">
        <div className="flex items-center gap-2 flex-wrap bg-muted px-[5px] py-[5px] rounded-lg">
          {/* Category tab pills */}
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-background">
            {categoryTabs.map((tab) => (
              <Button
                key={tab.key}
                variant={category === tab.key ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => { setCategory(tab.key); setPage(1); }}
                className="gap-1.5 h-7"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9 bg-background"
            />
          </div>

          {/* Tag Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9 bg-background hover:bg-background/80">
                <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm">
                  {tagFilter ? (
                    <span className="flex items-center gap-1">
                      {tagFilter}
                      <X
                        className="h-3 w-3 text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); setTagFilter(null); setPage(1); }}
                      />
                    </span>
                  ) : 'Filter by Tag'}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              {orgTags.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-1">No tags defined yet.</p>
              ) : (
                <div className="space-y-1">
                  {tagFilter && (
                    <button
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-muted text-muted-foreground"
                      onClick={() => { setTagFilter(null); setPage(1); }}
                    >
                      Clear filter
                    </button>
                  )}
                  {orgTags.map((tag) => (
                    <button
                      key={tag.id}
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-muted flex items-center gap-2"
                      onClick={() => { setTagFilter(tag.name); setPage(1); }}
                    >
                      {tag.color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />}
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border border-border rounded-lg">
          <span className="text-sm font-medium text-primary">{selected.size} selected</span>
          <Popover open={bulkTagOpen} onOpenChange={setBulkTagOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-7">
                <Tag className="h-3.5 w-3.5" />
                Add Tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              {orgTags.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-1">No tags defined yet.</p>
              ) : (
                <div className="space-y-1">
                  {orgTags.map((tag) => (
                    <button
                      key={tag.id}
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-muted flex items-center gap-2"
                      onClick={() => handleBulkAddTag(tag.name)}
                    >
                      {tag.color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />}
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-7">
                <X className="h-3.5 w-3.5" />
                Remove Tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              {orgTags.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-1">No tags defined yet.</p>
              ) : (
                <div className="space-y-1">
                  {orgTags.map((tag) => (
                    <button
                      key={tag.id}
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-muted flex items-center gap-2"
                      onClick={() => handleBulkRemoveTag(tag.name)}
                    >
                      {tag.color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />}
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">
                <Checkbox
                  checked={contacts.length > 0 && selected.size === contacts.length}
                  onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Tags</TableHead>
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
                  onClick={() => navigateOrg(`/crm/contacts/${contact.id}`)}
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
                    <div className="flex items-center gap-1 flex-wrap">
                      {(contact.tags || []).slice(0, 2).map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                          style={getTagColor(tag) ? { backgroundColor: getTagColor(tag) + '20', borderColor: getTagColor(tag), color: getTagColor(tag) } : undefined}
                        >
                          {tag}
                        </Badge>
                      ))}
                      {(contact.tags || []).length > 2 && (
                        <span className="text-xs text-muted-foreground">+{(contact.tags || []).length - 2}</span>
                      )}
                    </div>
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
                        <DropdownMenuItem onClick={() => navigateOrg(`/crm/contacts/${contact.id}`)}>View</DropdownMenuItem>
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
        <div className="flex items-center justify-between">
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
    </div>
  );
};
