/**
 * Internal Vacancy Preview Dialog
 * Shows job details in a dialog for internal employees (authenticated, org-scoped).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MapPin, Building2, Clock, Briefcase, DollarSign, Users, UserPlus, Send } from 'lucide-react';
import { WORK_MODEL_LABELS, EMPLOYMENT_TYPE_LABELS } from '@/types/hiring';
import DOMPurify from 'dompurify';
import { countryToFlag } from '@/utils/countryFlag';
import type { InternalVacancy } from '@/hooks/useInternalVacancies';

interface VacancyPreviewDialogProps {
  vacancy: InternalVacancy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply?: () => void;
  onShare?: () => void;
}

function useInternalJobDetail(jobId: string | undefined) {
  return useQuery({
    queryKey: ['internal-job-detail', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id, title, slug, employment_type, work_model, location,
          description, requirements, benefits,
          salary_min, salary_max, salary_currency, salary_visible,
          headcount, application_close_date, is_internal_apply,
          department:departments(id, name),
          office:offices(id, name, city, country)
        `)
        .eq('id', jobId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000,
  });
}

function renderHtml(html: string | null | undefined) {
  if (!html) return null;
  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}

export function VacancyPreviewDialog({
  vacancy,
  open,
  onOpenChange,
  onApply,
  onShare,
}: VacancyPreviewDialogProps) {
  const { data: job, isLoading } = useInternalJobDetail(open ? vacancy.id : undefined);

  const office = (job as any)?.office;
  const department = (job as any)?.department;
  const city = job?.location || office?.city;
  const country = office?.country;
  const locationText = [city, country].filter(Boolean).join(', ');
  const flag = countryToFlag(country);

  const salaryRange = (() => {
    if (!job?.salary_visible || !job?.salary_min) return null;
    try {
      const fmt = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: job.salary_currency || 'USD',
        maximumFractionDigits: 0,
      });
      const min = fmt.format(Number(job.salary_min));
      const max = job.salary_max ? fmt.format(Number(job.salary_max)) : null;
      return max ? `${min} – ${max}` : `From ${min}`;
    } catch {
      return null;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-primary text-primary-foreground px-6 pt-6 pb-5">
          {isLoading ? (
            <>
              <Skeleton className="h-7 w-2/3 bg-primary-foreground/20 mb-2" />
              <Skeleton className="h-4 w-1/2 bg-primary-foreground/20" />
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">{vacancy.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm opacity-90">
                {locationText && (
                  <span className="flex items-center gap-1">
                    {flag ? <span className="text-base">{flag}</span> : <MapPin className="h-4 w-4" />}
                    {locationText}
                  </span>
                )}
                {department?.name && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {department.name}
                  </span>
                )}
                {vacancy.work_model && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {WORK_MODEL_LABELS[vacancy.work_model] || vacancy.work_model}
                  </span>
                )}
                {vacancy.employment_type && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {EMPLOYMENT_TYPE_LABELS[vacancy.employment_type] || vacancy.employment_type}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <>
              {/* Meta row */}
              <div className="flex flex-wrap gap-2">
                {(job?.headcount ?? 0) > 1 && (
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {job!.headcount} positions
                  </Badge>
                )}
                {salaryRange && (
                  <Badge variant="secondary" className="gap-1">
                    <DollarSign className="h-3 w-3" />
                    {salaryRange}
                  </Badge>
                )}
                {(job as any)?.application_close_date && (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Apply by {new Date((job as any).application_close_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Badge>
                )}
              </div>

              {job?.description && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">About This Role</h3>
                  {renderHtml(job.description)}
                </div>
              )}

              {job?.requirements && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Requirements</h3>
                    {renderHtml(job.requirements)}
                  </div>
                </>
              )}

              {job?.benefits && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Benefits</h3>
                    {renderHtml(job.benefits)}
                  </div>
                </>
              )}

              {!job?.description && !job?.requirements && !job?.benefits && (
                <p className="text-sm text-muted-foreground italic">No details available for this position.</p>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t px-6 py-4 flex items-center justify-end gap-2 bg-muted/30">
          {onShare && (
            <Button variant="outline" size="sm" onClick={onShare} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Share / Refer
            </Button>
          )}
          {vacancy.is_internal_apply && onApply && (
            <Button size="sm" onClick={onApply} className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Apply Now
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
