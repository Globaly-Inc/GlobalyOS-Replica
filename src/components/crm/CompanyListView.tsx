import { useState } from 'react';
import { Search, Plus, MoreHorizontal, Flame, Handshake, Snowflake, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCRMCompanies, useDeleteCRMCompany } from '@/services/useCRM';
import { AddCompanyDialog } from './AddCompanyDialog';
import { CompanyDetailDialog } from './CompanyDetailDialog';
import { toast } from 'sonner';

const RatingIcon = ({ rating }: { rating: string | null }) => {
  if (rating === 'hot') return <Flame className="h-4 w-4 text-red-500" />;
  if (rating === 'warm') return <Handshake className="h-4 w-4 text-orange-500" />;
  if (rating === 'cold') return <Snowflake className="h-4 w-4 text-blue-500" />;
  return <span className="text-xs text-muted-foreground">—</span>;
};

export const CompanyListView = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading } = useCRMCompanies({ search: search || undefined, page, per_page: perPage });
  const deleteMutation = useDeleteCRMCompany();
  const companies = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">Companies</h1>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Company
        </Button>
      </div>

      <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search companies..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No companies found. Add your first company to get started.
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id} className="cursor-pointer" onClick={() => setSelectedCompany(company.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={company.logo_url || ''} />
                        <AvatarFallback className="text-xs">{company.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <p className="font-medium text-sm">{company.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{company.industry || '—'}</TableCell>
                  <TableCell className="text-sm">{company.phone || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {company.website ? (
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        {company.website.replace(/^https?:\/\//, '')}
                      </a>
                    ) : '—'}
                  </TableCell>
                  <TableCell><RatingIcon rating={company.rating} /></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedCompany(company.id)}>View</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(company.id, { onSuccess: () => toast.success('Company deleted') })}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalCount > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border">
          <span className="text-sm text-muted-foreground">{totalCount} compan{totalCount !== 1 ? 'ies' : 'y'}</span>
          <div className="flex items-center gap-2">
            <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages || 1}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <AddCompanyDialog open={addOpen} onOpenChange={setAddOpen} />
      <CompanyDetailDialog companyId={selectedCompany} onClose={() => setSelectedCompany(null)} />
    </div>
  );
};
