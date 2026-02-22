import { useState } from 'react';
import { Search, Plus, MoreHorizontal, Package, Eye, Globe, Users as UsersIcon, Lock, Archive, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageBody } from '@/components/ui/page-body';
import { useCRMServices, useDeleteCRMService } from '@/services/useCRMServices';
import { AddServiceDialog } from '@/components/crm/services/AddServiceDialog';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import type { CRMService } from '@/types/crm-services';

const VisibilityBadge = ({ visibility }: { visibility: string }) => {
  const config: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline' }> = {
    internal: { label: 'Internal', icon: <Lock className="h-3 w-3" />, variant: 'outline' },
    client_portal: { label: 'Client Portal', icon: <Globe className="h-3 w-3" />, variant: 'default' },
    agent_portal: { label: 'Agent Portal', icon: <UsersIcon className="h-3 w-3" />, variant: 'secondary' },
    both_portals: { label: 'Both Portals', icon: <Eye className="h-3 w-3" />, variant: 'default' },
  };
  const c = config[visibility] || config.internal;
  return <Badge variant={c.variant} className="gap-1 text-xs">{c.icon}{c.label}</Badge>;
};

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    draft: { variant: 'outline' },
    published: { variant: 'default' },
    archived: { variant: 'secondary' },
  };
  return <Badge variant={config[status]?.variant || 'outline'} className="capitalize">{status}</Badge>;
};

const TypeBadge = ({ type }: { type: string }) => {
  const labels: Record<string, string> = {
    direct: 'Direct',
    represented_provider: 'Represented',
    internal_only: 'Internal',
  };
  return <Badge variant="outline" className="text-xs">{labels[type] || type}</Badge>;
};

const ProductsPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const { navigateOrg } = useOrgNavigation();
  const { isAdmin } = useUserRole();
  const deleteMutation = useDeleteCRMService();

  const { data, isLoading } = useCRMServices({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    visibility: visibilityFilter !== 'all' ? visibilityFilter : undefined,
    page,
    per_page: 20,
  });

  const services = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Service deleted'),
      onError: (err: any) => toast.error(err.message || 'Failed to delete'),
    });
  };

  return (
    <PageBody>
      <div className="space-y-6 pt-4 md:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-6 w-6" />
              Products & Services
            </h1>
            <p className="text-muted-foreground hidden md:block">Manage your service catalog</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Visibility" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Visibility</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="client_portal">Client Portal</SelectItem>
              <SelectItem value="agent_portal">Agent Portal</SelectItem>
              <SelectItem value="both_portals">Both Portals</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Visibility</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : services.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No services found</TableCell></TableRow>
              ) : (
                services.map((svc: CRMService) => (
                  <TableRow key={svc.id} className="cursor-pointer" onClick={() => navigateOrg(`/crm/products/${svc.id}`)}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{svc.name}</p>
                        {svc.short_description && <p className="text-xs text-muted-foreground line-clamp-1">{svc.short_description}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {svc.category ? <Badge variant="outline" className="text-xs">{svc.category}</Badge> : '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><TypeBadge type={svc.service_type} /></TableCell>
                    <TableCell><StatusBadge status={svc.status} /></TableCell>
                    <TableCell className="hidden md:table-cell"><VisibilityBadge visibility={svc.visibility} /></TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigateOrg(`/crm/products/${svc.id}`)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(svc.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
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
            <p className="text-sm text-muted-foreground">{totalCount} services total</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      <AddServiceDialog open={addOpen} onOpenChange={setAddOpen} />
    </PageBody>
  );
};

export default ProductsPage;
