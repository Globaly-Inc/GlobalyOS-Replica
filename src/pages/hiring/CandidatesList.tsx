import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { OrgLink } from '@/components/OrgLink';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCandidates } from '@/services/useHiring';
import { getCandidateSourceLabel } from '@/types/hiring';
import {
  Search,
  Users,
  FileText,
  ExternalLink,
  Eye,
  Mail,
  Phone,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CandidatesListProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  sourceFilter?: string;
  onSourceFilterChange?: (value: string) => void;
}

const APPLICATION_STAGE_LABELS: Record<string, string> = {
  applied: 'Applied',
  screening: 'Screening',
  assignment: 'Assignment',
  interview_1: 'Interview 1',
  interview_2: 'Interview 2',
  interview_3: 'Interview 3',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
};

const APPLICATION_STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  on_hold: 'bg-amber-100 text-amber-700 border-amber-200',
  withdrawn: 'bg-gray-100 text-gray-600 border-gray-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  hired: 'bg-blue-100 text-blue-700 border-blue-200',
};

async function downloadResume(cvFilePath: string, candidateName: string) {
  try {
    const { data, error } = await supabase.storage
      .from('hiring-cvs')
      .createSignedUrl(cvFilePath, 60);
    if (error) throw error;
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = `${candidateName.replace(/\s+/g, '_')}_CV`;
    a.target = '_blank';
    a.click();
  } catch {
    toast.error('Failed to download resume');
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function CandidatesList({
  searchQuery = '',
  onSearchChange,
  sourceFilter = 'all',
  onSourceFilterChange,
}: CandidatesListProps) {
  const { data: candidates, isLoading } = useCandidates();

  const filteredCandidates = candidates?.filter((candidate) => {
    const matchesSearch =
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource =
      sourceFilter === 'all' || candidate.source === sourceFilter;
    return matchesSearch && matchesSource;
  }) || [];

  return (
    <div className="space-y-4">
      {/* Mobile Filters */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sourceFilter} onValueChange={(v) => onSourceFilterChange?.(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="careers_site">Careers Site</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="job_board">Job Board</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      {!isLoading && filteredCandidates.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b last:border-0">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredCandidates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {searchQuery || sourceFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Candidates will appear here when they apply to your jobs'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[220px] pl-6">Candidate</TableHead>
                  <TableHead className="w-[180px]">Contact</TableHead>
                  <TableHead className="w-[80px] text-center">Resume</TableHead>
                  <TableHead className="w-[160px]">Applied</TableHead>
                  <TableHead>Applied Positions</TableHead>
                  <TableHead className="w-[100px] text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.map((candidate) => {
                  const apps = (candidate as any).candidate_applications || [];
                  // earliest application = first applied date
                  const firstApp = apps.length
                    ? [...apps].sort(
                        (a: any, b: any) =>
                          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                      )[0]
                    : null;
                  const firstAppliedDate = firstApp?.created_at
                    ? new Date(firstApp.created_at)
                    : candidate.created_at
                    ? new Date(candidate.created_at)
                    : null;

                  // find most recent cv_file_path across all applications
                  const cvApp = apps.find((a: any) => a.cv_file_path);

                  return (
                    <TableRow key={candidate.id} className="group">
                      {/* Candidate Name + Avatar */}
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={candidate.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(candidate.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <OrgLink
                              to={`/hiring/candidates/${candidate.id}`}
                              className="font-medium text-sm hover:text-primary transition-colors truncate block"
                            >
                              {candidate.name}
                            </OrgLink>
                            <span className="text-xs text-muted-foreground truncate block">
                              {getCandidateSourceLabel(candidate.source)}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        <div className="space-y-1">
                          <a
                            href={`mailto:${candidate.email}`}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-[160px]"
                          >
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{candidate.email}</span>
                          </a>
                          {candidate.phone && (
                            <a
                              href={`tel:${candidate.phone}`}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{candidate.phone}</span>
                            </a>
                          )}
                        </div>
                      </TableCell>

                      {/* Resume */}
                      <TableCell className="text-center">
                        {cvApp ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Download resume"
                            onClick={() => downloadResume(cvApp.cv_file_path, candidate.name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>

                      {/* Applied Date */}
                      <TableCell>
                        {firstAppliedDate ? (
                          <div>
                            <p className="text-sm tabular-nums">
                              {format(firstAppliedDate, 'dd MMM yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {format(firstAppliedDate, 'HH:mm')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>

                      {/* Applied Positions */}
                      <TableCell>
                        {apps.length === 0 ? (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-[320px]">
                            {apps.map((app: any) => (
                              <OrgLink
                                key={app.id}
                                to={`/hiring/applications/${app.id}`}
                                className="inline-flex items-center gap-1"
                              >
                                <Badge
                                  variant="outline"
                                  className={`text-xs cursor-pointer hover:bg-muted transition-colors ${
                                    app.status ? (APPLICATION_STATUS_COLORS[app.status] || '') : ''
                                  }`}
                                >
                                  {app.job?.title || 'Unknown Position'}
                                  {app.stage && (
                                    <span className="ml-1 opacity-60">
                                      · {APPLICATION_STAGE_LABELS[app.stage] || app.stage}
                                    </span>
                                  )}
                                </Badge>
                              </OrgLink>
                            ))}
                          </div>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="pr-6">
                        <div className="flex items-center justify-end gap-1">
                          {candidate.portfolio_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              asChild
                            >
                              <a
                                href={candidate.portfolio_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Portfolio"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            asChild
                          >
                            <OrgLink to={`/hiring/candidates/${candidate.id}`} title="View profile">
                              <Eye className="h-4 w-4" />
                            </OrgLink>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
