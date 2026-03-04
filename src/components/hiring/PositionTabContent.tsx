/**
 * PositionTabContent
 * Renders full application details (CV, Assignments, Interviews, Offer) for a given application ID.
 * Reused across all position tabs in the candidate profile.
 */

import { useState } from 'react';
import { useHiringApplication } from '@/services';
import { useAssignmentInstances, useInterviews, useOffer } from '@/services/useHiring';
import { useAssignmentTemplatesForPosition } from '@/hooks/useAssignmentTemplatesForPosition';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar, ClipboardList, DollarSign, Clock, FileText, Upload, Plus,
  Star, Eye, Copy, Link as LinkIcon, Video, User, ChevronDown, Send,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  APPLICATION_STAGE_LABELS,
  ASSIGNMENT_STATUS_LABELS,
  INTERVIEW_STATUS_LABELS,
  type ApplicationStage,
} from '@/types/hiring';
import { toast } from 'sonner';
import { CVUpload } from '@/components/hiring/CVUpload';
import { ResumeParseButton } from '@/components/hiring/ResumeParseButton';
import { AssignmentPreviewDialog } from '@/components/hiring/AssignmentPreviewDialog';
import { ScheduleInterviewDialog } from '@/components/hiring/interviews/ScheduleInterviewDialog';
import { CreateOfferDialog } from '@/components/hiring/offers/CreateOfferDialog';
import { SendOfferDialog } from '@/components/hiring/offers/SendOfferDialog';
import type { AssignmentTemplateForPosition } from '@/hooks/useAssignmentTemplatesForPosition';

interface PositionTabContentProps {
  applicationId: string;
}

export function PositionTabContent({ applicationId }: PositionTabContentProps) {
  const { data: application, isLoading } = useHiringApplication(applicationId);
  const { data: assignments } = useAssignmentInstances(applicationId);
  const { data: interviews } = useInterviews(applicationId);
  const { data: offer } = useOffer(applicationId);
  const { currentOrg } = useOrganization();
  const { data: positionTemplates } = useAssignmentTemplatesForPosition(application?.job?.title || '');
  const [previewTemplate, setPreviewTemplate] = useState<AssignmentTemplateForPosition | null>(null);
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [showSendOfferDialog, setShowSendOfferDialog] = useState(false);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>;
  }

  if (!application) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Application not found</CardContent></Card>;
  }

  const candidate = application.candidate;

  return (
    <div className="space-y-4">
      {/* Application Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Applied {format(new Date(application.created_at), 'PP')}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {formatDistanceToNow(new Date(application.created_at), { addSuffix: true })}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              Stage: {APPLICATION_STAGE_LABELS[application.stage as ApplicationStage] || application.stage}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* CV/Resume Card */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Upload className="h-5 w-5 text-primary" />
            CV / Resume
          </h2>
          {application.cv_file_path && (
            <ResumeParseButton
              filePath={application.cv_file_path}
              candidateId={candidate?.id || ''}
              applicationId={application.id}
            />
          )}
        </div>
        <CardContent className="p-4">
          <CVUpload
            candidateId={candidate?.id || ''}
            applicationId={application.id}
            currentFilePath={application.cv_file_path}
          />
        </CardContent>
      </Card>

      {/* Cover Letter */}
      {application.cover_letter && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 bg-card border-b">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              Cover Letter
            </h2>
          </div>
          <CardContent className="p-4">
            <p className="whitespace-pre-wrap text-sm text-foreground">{application.cover_letter}</p>
          </CardContent>
        </Card>
      )}

      {/* Assignments Card */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <ClipboardList className="h-5 w-5 text-primary" />
            Assignments
          </h2>
          {(positionTemplates?.templates?.length || 0) + (assignments?.length || 0) > 0 && (
            <Badge variant="secondary" className="text-xs">
              {(positionTemplates?.templates?.length || 0) + (assignments?.length || 0)}
            </Badge>
          )}
        </div>
        <CardContent className="p-4 space-y-3">
          {positionTemplates?.templates && positionTemplates.templates.length > 0 ? (
            positionTemplates.templates.map((template) => {
              const publicLink = template.slug && currentOrg?.slug
                ? `${window.location.origin}/careers/${currentOrg.slug}/assignment/${template.slug}`
                : null;
              return (
                <div key={template.id} className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {template.type && <Badge variant="secondary" className="text-[10px]">{template.type}</Badge>}
                        {template.recommended_effort && (
                          <span className="text-xs text-muted-foreground">Effort: {template.recommended_effort}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewTemplate(template)} title="Preview">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {publicLink && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(publicLink); toast.success('Link copied!'); }} title="Copy link">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(publicLink, '_blank')} title="Open">
                            <LinkIcon className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6">
              <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No assignments linked to this position yet</p>
            </div>
          )}

          {assignments && assignments.length > 0 && (
            <>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Submissions</p>
              {assignments.map((assignment) => (
                <div key={assignment.id} className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{assignment.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Due: {format(new Date(assignment.deadline), 'PPp')}</p>
                    </div>
                    <Badge variant={
                      assignment.status === 'submitted' ? 'default' :
                      assignment.status === 'reviewed' ? 'secondary' :
                      assignment.status === 'overdue' ? 'destructive' : 'outline'
                    }>
                      {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                    </Badge>
                  </div>
                  {assignment.rating && (
                    <div className="mt-2 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs">{assignment.rating}/5</span>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Interviews Card */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Calendar className="h-5 w-5 text-primary" />
            Interviews
          </h2>
          <div className="flex items-center gap-2">
            {interviews && interviews.length > 0 && <Badge variant="secondary" className="text-xs">{interviews.length}</Badge>}
            <Button size="sm" variant="outline" onClick={() => setShowInterviewDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Schedule
            </Button>
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          {interviews && interviews.length > 0 ? (
            interviews.map((interview) => (
              <Collapsible key={interview.id}>
                <div className="rounded-lg border bg-muted/30 overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{interview.interview_type}</h4>
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(interview.scheduled_at), 'PPp')} · {interview.duration_minutes} min
                          </p>
                          {interview.location && <p className="text-xs text-muted-foreground">{interview.location}</p>}
                        </div>
                        <Badge variant={
                          interview.status === 'completed' ? 'default' :
                          interview.status === 'cancelled' ? 'destructive' : 'outline'
                        } className="text-[10px]">
                          {INTERVIEW_STATUS_LABELS[interview.status]}
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2 border-t pt-2">
                      {interview.meeting_link && (
                        <div className="flex items-center gap-2">
                          <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">
                            {interview.meeting_link}
                          </a>
                          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(interview.meeting_link!); toast.success('Link copied'); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {interview.interviewer_ids && interview.interviewer_ids.length > 0 && (
                        <div className="flex items-start gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">{interview.interviewer_ids.length} interviewer(s)</p>
                        </div>
                      )}
                      {interview.notes && (
                        <div className="flex items-start gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs whitespace-pre-wrap">{interview.notes}</p>
                        </div>
                      )}
                      {interview.interview_scorecards && interview.interview_scorecards.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Star className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">{interview.interview_scorecards.length} scorecard(s)</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))
          ) : (
            <div className="text-center py-6">
              <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No interviews scheduled</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowInterviewDialog(true)}>
                Schedule Interview
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offer Card */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <DollarSign className="h-5 w-5 text-primary" />
            Offer
          </h2>
          {offer && (
            <Badge variant={
              offer.status === 'accepted' ? 'default' :
              offer.status === 'declined' ? 'destructive' :
              offer.status === 'sent' ? 'secondary' : 'outline'
            } className="text-xs">
              {offer.status?.charAt(0).toUpperCase() + offer.status?.slice(1)}
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          {offer ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">{offer.title}</h4>
                {offer.level && <p className="text-sm text-muted-foreground">Level: {offer.level}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {offer.base_salary && (
                  <div>
                    <p className="text-xs text-muted-foreground">Salary</p>
                    <p className="font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: offer.currency || 'USD', minimumFractionDigits: 0 }).format(offer.base_salary)}
                    </p>
                  </div>
                )}
                {offer.start_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">Start Date</p>
                    <p className="font-medium">{format(new Date(offer.start_date), 'PP')}</p>
                  </div>
                )}
                {offer.expires_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Expires</p>
                    <p className="font-medium">{format(new Date(offer.expires_at), 'PP')}</p>
                  </div>
                )}
                {offer.employment_type && (
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium">{offer.employment_type.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                  </div>
                )}
              </div>
              {(offer.status === 'draft' || offer.status === 'approved') && (
                <Button onClick={() => setShowSendOfferDialog(true)} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Send Offer to Candidate
                </Button>
              )}
              {offer.status === 'sent' && (
                <p className="text-center text-sm text-muted-foreground">Offer sent — awaiting candidate response</p>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No offer created yet</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowOfferDialog(true)}>
                Create Offer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ScheduleInterviewDialog
        open={showInterviewDialog}
        onOpenChange={setShowInterviewDialog}
        applicationId={applicationId}
      />
      <CreateOfferDialog
        open={showOfferDialog}
        onOpenChange={setShowOfferDialog}
        applicationId={applicationId}
        jobTitle={application.job?.title}
      />
      {offer && (
        <SendOfferDialog
          open={showSendOfferDialog}
          onOpenChange={setShowSendOfferDialog}
          offerId={offer.id}
          offerTitle={offer.title}
          candidateName={candidate?.name}
          candidateEmail={candidate?.email}
        />
      )}
      {previewTemplate && (
        <AssignmentPreviewDialog
          open={!!previewTemplate}
          onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }}
          formData={{
            name: previewTemplate.name,
            type: previewTemplate.type || '',
            instructions: previewTemplate.instructions,
            default_deadline_hours: previewTemplate.default_deadline_hours || 72,
            recommended_effort: previewTemplate.recommended_effort || '',
            expected_deliverables: {
              files: previewTemplate.expected_deliverables?.file_uploads?.enabled ?? previewTemplate.expected_deliverables?.files ?? false,
              url_fields: previewTemplate.expected_deliverables?.url_fields ?? [],
              questions: previewTemplate.expected_deliverables?.questions ?? [],
            },
          }}
          orgSlug={currentOrg?.slug}
          templateSlug={previewTemplate.slug || undefined}
        />
      )}
    </div>
  );
}
