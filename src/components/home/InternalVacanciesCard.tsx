import { useState } from 'react';
import { Briefcase, MapPin, ArrowRight, Send, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrgLink } from '@/components/OrgLink';
import { useInternalVacancies, InternalVacancy } from '@/hooks/useInternalVacancies';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { InternalApplyDialog } from '@/components/hiring/InternalApplyDialog';
import { ShareVacancyDialog } from '@/components/hiring/ShareVacancyDialog';
import { VacancyPreviewDialog } from '@/components/hiring/VacancyPreviewDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const MAX_DISPLAY = 3;

export const InternalVacanciesCard = () => {
  const { vacancies, isLoading } = useInternalVacancies();
  const { getShortRelativeTime } = useRelativeTime();
  const [previewVacancy, setPreviewVacancy] = useState<InternalVacancy | null>(null);
  const [applyVacancy, setApplyVacancy] = useState<InternalVacancy | null>(null);
  const [shareVacancy, setShareVacancy] = useState<InternalVacancy | null>(null);

  if (isLoading || vacancies.length === 0) return null;

  const displayVacancies = vacancies.slice(0, MAX_DISPLAY);
  const hasMore = vacancies.length > MAX_DISPLAY;

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Briefcase className="h-5 w-5 text-primary" />
            Open Positions
          </h3>
          <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
            {vacancies.length}
          </span>
        </div>

        <div className="space-y-1">
          {displayVacancies.map((vacancy) => {
            const locationLabel = vacancy.office?.city || vacancy.office?.name || vacancy.location;
            return (
              <div key={vacancy.id} className="group rounded-lg p-2.5 -mx-1 transition-colors hover:bg-muted">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => setPreviewVacancy(vacancy)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {vacancy.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      {vacancy.department?.name && (
                        <span className="truncate">{vacancy.department.name}</span>
                      )}
                      {vacancy.department?.name && locationLabel && <span>·</span>}
                      {locationLabel && (
                        <span className="flex items-center gap-0.5 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {locationLabel}
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                    {vacancy.is_internal_apply && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => { e.stopPropagation(); setApplyVacancy(vacancy); }}
                            className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>Apply</p></TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShareVacancy(vacancy); }}
                          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>Share / Refer</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {vacancy.employment_type && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                      {vacancy.employment_type.replace(/_/g, '-')}
                    </Badge>
                  )}
                  {vacancy.work_model && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                      {vacancy.work_model.charAt(0).toUpperCase() + vacancy.work_model.slice(1)}
                    </Badge>
                  )}
                  {vacancy.published_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {getShortRelativeTime(vacancy.published_at)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hasMore && (
          <OrgLink
            to="/hiring"
            className="flex items-center justify-center gap-1 mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View All Positions
            <ArrowRight className="h-3 w-3" />
          </OrgLink>
        )}
      </Card>

      {previewVacancy && (
        <VacancyPreviewDialog
          open={!!previewVacancy}
          onOpenChange={(open) => !open && setPreviewVacancy(null)}
          vacancy={previewVacancy}
          onApply={() => { setApplyVacancy(previewVacancy); setPreviewVacancy(null); }}
          onShare={() => { setShareVacancy(previewVacancy); setPreviewVacancy(null); }}
        />
      )}

      {applyVacancy && (
        <InternalApplyDialog
          open={!!applyVacancy}
          onOpenChange={(open) => !open && setApplyVacancy(null)}
          vacancy={applyVacancy}
        />
      )}

      {shareVacancy && (
        <ShareVacancyDialog
          open={!!shareVacancy}
          onOpenChange={(open) => !open && setShareVacancy(null)}
          vacancy={shareVacancy}
        />
      )}
    </>
  );
};

export default InternalVacanciesCard;
