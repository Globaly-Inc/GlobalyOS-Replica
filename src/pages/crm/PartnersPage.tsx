import { useState } from 'react';
import { Search, Plus, MoreHorizontal, Handshake, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageBody } from '@/components/ui/page-body';
import { useCRMPartners, useDeleteCRMPartner } from '@/services/useCRMServices';
import { AddPartnerDialog } from '@/components/crm/partners/AddPartnerDialog';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import type { CRMPartner } from '@/types/crm-services';

const TypeBadge = ({ type }: { type: string }) => {
  const config: Record<string, { variant: 'default' | 'secondary' | 'outline' }> = {
    agent: { variant: 'default' },
    provider: { variant: 'secondary' },
    both: { variant: 'outline' },
  };
  return <Badge variant={config[type]?.variant || 'outline'} className="capitalize">{type}</Badge>;
};

const PartnersPage = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const { navigateOrg } = useOrgNavigation();
  const { isAdmin } = useUserRole();
  const deleteMutation = useDeleteCRMPartner();

  const { data, isLoading } = useCRMPartners({
    search: search || undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    contract_status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    per_page: 20,
  });

  const partners = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  return (
    <PageBody>
      <div className="space-y-6 pt-4 md:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Handshake className="h-6 w-6" />
              Partners
            </h1>
            <p className="text-muted-foreground hidden md:block">Manage your agent and provider partners</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Partner
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search partners..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="provider">Provider</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : partners.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No partners found</TableCell></TableRow>
              ) : (
                partners.map((p: CRMPartner) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => navigateOrg(`/crm/partners/${p.id}`)}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        {p.trading_name && <p className="text-xs text-muted-foreground">{p.trading_name}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><TypeBadge type={p.type} /></TableCell>
                    <TableCell className="hidden md:table-cell">{p.email || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={p.contract_status === 'active' ? 'default' : 'secondary'} className="capitalize">{p.contract_status}</Badge>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigateOrg(`/crm/partners/${p.id}`)}><Edit className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(p.id, { onSuccess: () => toast.success('Partner deleted') })}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{totalCount} partners total</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      <AddPartnerDialog open={addOpen} onOpenChange={setAddOpen} />
    </PageBody>
  );
};

export default PartnersPage;
