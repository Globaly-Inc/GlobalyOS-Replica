/**
 * Application Detail Page
 * Candidate profile view matching TeamMemberProfile layout pattern
 */

import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useHiringApplication } from '@/services';
import { 
  useCandidateApplications,
  useCandidateActivityLog,
} from '@/services/useHiring';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  useUpdateApplicationStage,
} from '@/services/useHiringMutations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrgLink } from '@/components/OrgLink';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  FileText,
  Calendar,
  ClipboardList,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  User,
  MessageSquare,
  Send,
  Star,
  Upload,
  UserPlus,
  Video,
  Link as LinkIcon,
  Copy,
  ChevronDown,
  Eye,
  Activity,
  Briefcase,
  Plus,
  Globe,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  APPLICATION_STAGE_LABELS, 
  ASSIGNMENT_STATUS_LABELS,
  INTERVIEW_STATUS_LABELS,
  APPLICATION_STATUS_LABELS,
  type ApplicationStage 
} from '@/types/hiring';
import { toast } from 'sonner';
import { ScheduleInterviewDialog } from '@/components/hiring/interviews/ScheduleInterviewDialog';
import { CreateOfferDialog } from '@/components/hiring/offers/CreateOfferDialog';
import { SendOfferDialog } from '@/components/hiring/offers/SendOfferDialog';
import { CVUpload } from '@/components/hiring/CVUpload';
import { ResumeParseButton } from '@/components/hiring/ResumeParseButton';
import { ConvertToEmployeeDialog } from '@/components/hiring/ConvertToEmployeeDialog';
import { AssignmentPreviewDialog } from '@/components/hiring/AssignmentPreviewDialog';
import { AddToPositionDialog } from '@/components/hiring/AddToPositionDialog';
import { CandidateSkillsCard } from '@/components/hiring/CandidateSkillsCard';
import { CandidateExperienceCard } from '@/components/hiring/CandidateExperienceCard';
import { CandidateEducationCard } from '@/components/hiring/CandidateEducationCard';
import type { AssignmentTemplateForPosition } from '@/hooks/useAssignmentTemplatesForPosition';

// ─── Activity Icon Mapping ────────────────────────────────────────
const getActivityIcon = (action: string) => {
  if (action.includes('stage') || action.includes('moved')) return ChevronDown;
  if (action.includes('interview')) return Calendar;
  if (action.includes('assignment')) return ClipboardList;
  if (action.includes('offer')) return DollarSign;
  if (action.includes('email') || action.includes('sent')) return Mail;
  if (action.includes('note')) return FileText;
  if (action.includes('reject')) return XCircle;
  if (action.includes('hire') || action.includes('convert')) return UserPlus;
  return MessageSquare;
};

const getActivityColor = (action: string) => {
  if (action.includes('reject')) return 'bg-destructive/10 text-destructive';
  if (action.includes('hire') || action.includes('offer_accepted')) return 'bg-green-500/10 text-green-600';
  if (action.includes('interview')) return 'bg-blue-500/10 text-blue-600';
  if (action.includes('offer')) return 'bg-amber-500/10 text-amber-600';
  if (action.includes('assignment')) return 'bg-purple-500/10 text-purple-600';
  return 'bg-muted text-muted-foreground';
};

// Format activity log entry as a proper sentence with actor name
const formatActivityDescription = (
  action: string,
  details: Record<string, unknown> | null | undefined,
  actorName: string | null | undefined,
) => {
  const actor = actorName || 'System';
  const d = (details || {}) as Record<string, unknown>;

  switch (action) {
    case 'stage_changed':
      return `${actor} moved the candidate from "${String(d.from_stage || 'unknown').replace(/_/g, ' ')}" to "${String(d.to_stage || 'unknown').replace(/_/g, ' ')}".`;
    case 'application_created':
      return `${actor} created this application.`;
    case 'interview_scheduled':
      return `${actor} scheduled an interview${d.interview_type ? ` (${String(d.interview_type).replace(/_/g, ' ')})` : ''}.`;
    case 'interview_completed':
      return `${actor} marked the interview as completed.`;
    case 'interview_cancelled':
      return `${actor} cancelled the interview.`;
    case 'assignment_sent':
      return `${actor} sent an assignment${d.template_name ? ` "${d.template_name}"` : ''}.`;
    case 'assignment_submitted':
      return `${actor} submitted the assignment.`;
    case 'assignment_graded':
      return `${actor} graded the assignment${d.score != null ? ` with a score of ${d.score}` : ''}.`;
    case 'offer_created':
      return `${actor} created an offer${d.title ? ` for "${d.title}"` : ''}.`;
    case 'offer_sent':
      return `${actor} sent the offer to the candidate.`;
    case 'offer_accepted':
      return `${actor} accepted the offer.`;
    case 'offer_declined':
      return `${actor} declined the offer.`;
    case 'offer_withdrawn':
      return `${actor} withdrew the offer.`;
    case 'email_sent':
      return `${actor} sent an email${d.subject ? ` "${d.subject}"` : ''}.`;
    case 'note_added':
      return `${actor} added a note.`;
    case 'candidate_rejected':
      return `${actor} rejected the candidate${d.reason ? `: ${d.reason}` : ''}.`;
    case 'candidate_hired':
    case 'converted_to_employee':
      return `${actor} converted the candidate to an employee.`;
    case 'cv_uploaded':
      return `${actor} uploaded a CV/resume.`;
    case 'cv_parsed':
      return `${actor} parsed the candidate's resume.`;
    default: {
      // Fallback: format action as readable text
      const readable = action.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      return `${actor} — ${readable}.`;
    }
  }
};

export default function ApplicationDetail() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [showSendOfferDialog, setShowSendOfferDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showAddPositionDialog, setShowAddPositionDialog] = useState(false);

  const { data: application, isLoading } = useHiringApplication(applicationId);
  const { data: activityLog } = useCandidateActivityLog(application?.candidate?.id);
  const { currentOrg } = useOrganization();
  const { data: siblingApplications } = useCandidateApplications(application?.candidate?.id);
  
  const updateStage = useUpdateApplicationStage();

  const handleStageChange = async (stage: ApplicationStage) => {
    if (!applicationId) return;
    try {
      await updateStage.mutateAsync({ applicationId, stage });
      toast.success(`Moved to ${APPLICATION_STAGE_LABELS[stage]}`);
    } catch {
      // Error handled by mutation
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-96" />
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-lg font-semibold">Application not found</h2>
            <OrgLink to="/hiring/candidates" className="text-primary hover:underline mt-2 inline-block">
              Back to candidates
            </OrgLink>
          </CardContent>
        </Card>
      </div>
    );
  }

  const candidate = application.candidate;
  const customFields = (application as any).custom_fields as Record<string, string> | null;
  const salaryExpectation = customFields?.salary_expectation || customFields?.salary || customFields?.expected_salary;

  const statusBadgeClass = application.status === 'active'
    ? 'bg-green-500/10 text-green-600 border-green-500/20'
    : application.status === 'hired'
    ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    : application.status === 'rejected'
    ? 'bg-destructive/10 text-destructive border-destructive/20'
    : 'bg-muted text-muted-foreground';

  return (
    <div className="container mx-auto py-6 px-4 space-y-4">
      {/* ── Top Bar: Back + Actions ───────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <OrgLink to={`/hiring/jobs/${application.job?.slug}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </OrgLink>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowInterviewDialog(true)}>
            <Calendar className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Schedule Interview</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowOfferDialog(true)}>
            <DollarSign className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Create Offer</span>
          </Button>
          {offer?.status === 'accepted' && application.status !== 'hired' && (
            <Button size="sm" onClick={() => setShowConvertDialog(true)}>
              <UserPlus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Convert to Employee</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" />
                Download CV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleStageChange('rejected')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Candidate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Profile Header Card ───────────────────────────────── */}
      <Card className="p-4 overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-4 min-w-0">
          {/* Avatar */}
          <Avatar className="h-28 w-28 border-4 border-primary/10 shrink-0">
            <AvatarImage src={candidate?.avatar_url || undefined} alt={candidate?.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-3xl font-bold">
              {getInitials(candidate?.name || 'U')}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 space-y-1.5 flex flex-col justify-center min-w-0">
            {/* Name + Status Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{candidate?.name || 'Unknown Candidate'}</h1>
              <Badge variant="outline" className={`text-xs ${statusBadgeClass}`}>
                {APPLICATION_STATUS_LABELS[application.status]}
              </Badge>
              {application.is_internal && (
                <Badge variant="secondary" className="text-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                  Internal Candidate
                </Badge>
              )}
            </div>

            {/* Position + Source */}
            <div className="flex items-center gap-2 flex-wrap">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Applied for</span>
              <OrgLink to={`/hiring/jobs/${application.job?.slug}`} className="text-sm font-medium text-primary hover:underline">
                {application.job?.title}
              </OrgLink>
              {candidate?.source && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <Badge variant="outline" className="text-xs">{candidate.source}</Badge>
                </>
              )}
            </div>

            {/* Contact Info */}
            <div className="flex items-center gap-4 flex-wrap text-sm">
              {candidate?.email && (
                <a href={`mailto:${candidate.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{candidate.email}</span>
                </a>
              )}
              {candidate?.phone && (
                <a href={`tel:${candidate.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                  <Phone className="h-3.5 w-3.5" />
                  {candidate.phone}
                </a>
              )}
              {candidate?.location && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {candidate.location}
                </span>
              )}
              {candidate?.linkedin_url && (
                <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                  <Linkedin className="h-3.5 w-3.5" />
                  LinkedIn
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Stage Selector */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Stage:</span>
              <Select
                value={application.stage}
                onValueChange={(value) => handleStageChange(value as ApplicationStage)}
              >
                <SelectTrigger className="h-7 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(APPLICATION_STAGE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Two Column Layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ── Left Column (1/3) ─────────────────────────────── */}
        <div className="space-y-4 lg:col-span-1">
          {/* Activity Log Card */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Activity className="h-5 w-5 text-primary" />
                Activity Log
              </h2>
              {activityLog && activityLog.length > 0 && (
                <Badge variant="secondary" className="text-xs">{activityLog.length}</Badge>
              )}
            </div>
            <CardContent className="p-4">
              {activityLog && activityLog.length > 0 ? (
                <div className="space-y-3">
                  {activityLog.map((log) => {
                    const Icon = getActivityIcon(log.action);
                    const colorClass = getActivityColor(log.action);
                    const actorName = (log as any).actor?.profiles?.full_name;
                    return (
                      <div key={log.id} className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-snug">
                            {formatActivityDescription(log.action, log.details, actorName)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">No activity yet</p>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          {candidate?.id && <CandidateSkillsCard candidateId={candidate.id} />}

          {/* Experience */}
          {candidate?.id && <CandidateExperienceCard candidateId={candidate.id} />}

          {/* Education */}
          {candidate?.id && <CandidateEducationCard candidateId={candidate.id} />}
        </div>

        {/* ── Right Column (2/3) ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Position Tab(s) */}
          {(() => {
            // Other positions this candidate applied to (excluding current)
            const otherApps = (siblingApplications || []).filter(a => a.id !== applicationId);
            const existingJobIds = (siblingApplications || []).map(a => (a.job as any)?.id).filter(Boolean);

            return (
              <Tabs defaultValue="current" className="w-full">
                <div className="flex items-center gap-2">
                  <TabsList>
                    <TabsTrigger value="current" className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      {application.job?.title || 'Position'}
                    </TabsTrigger>
                    {otherApps.map((app) => (
                      <TabsTrigger key={app.id} value={app.id} className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5" />
                        {(app.job as any)?.title || 'Position'}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setShowAddPositionDialog(true)}
                    title="Apply to another position"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <TabsContent value="current" className="mt-4 space-y-4">
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
                  {/* Position-linked assignment templates */}
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
                                {template.type && (
                                  <Badge variant="secondary" className="text-[10px]">{template.type}</Badge>
                                )}
                                {template.recommended_effort && (
                                  <span className="text-xs text-muted-foreground">
                                    Effort: {template.recommended_effort}
                                  </span>
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

                  {/* Submitted assignment instances */}
                  {assignments && assignments.length > 0 && (
                    <>
                      <Separator />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Submissions</p>
                      {assignments.map((assignment) => (
                        <div key={assignment.id} className="p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm">{assignment.title}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Due: {format(new Date(assignment.deadline), 'PPp')}
                              </p>
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
                    {interviews && interviews.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{interviews.length}</Badge>
                    )}
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
                                  {interview.location && (
                                    <p className="text-xs text-muted-foreground">{interview.location}</p>
                                  )}
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
                        {offer.level && (
                          <p className="text-sm text-muted-foreground">Level: {offer.level}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {offer.base_salary && (
                          <div>
                            <p className="text-xs text-muted-foreground">Salary</p>
                            <p className="font-medium">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: offer.currency || 'USD',
                                minimumFractionDigits: 0,
                              }).format(offer.base_salary)}
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
                            <p className="font-medium">
                              {offer.employment_type.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            </p>
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
                        <p className="text-center text-sm text-muted-foreground">
                          Offer sent — awaiting candidate response
                        </p>
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
            </TabsContent>

                {/* Other position tabs - link to their application pages */}
                {otherApps.map((app) => (
                  <TabsContent key={app.id} value={app.id} className="mt-4">
                    <Card>
                      <CardContent className="py-6 text-center space-y-3">
                        <Briefcase className="h-8 w-8 mx-auto text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{(app.job as any)?.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Stage: {APPLICATION_STAGE_LABELS[(app.stage as ApplicationStage)] || app.stage}
                            {' · '}
                            Status: {APPLICATION_STATUS_LABELS[app.status]}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <OrgLink to={`/hiring/applications/${app.id}`}>
                          <Button variant="outline" size="sm">
                            View Full Application
                          </Button>
                        </OrgLink>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            );
          })()}
        </div>
      </div>

      {/* ── Dialogs ───────────────────────────────────────────── */}
      <ScheduleInterviewDialog
        open={showInterviewDialog}
        onOpenChange={setShowInterviewDialog}
        applicationId={applicationId!}
      />
      <CreateOfferDialog
        open={showOfferDialog}
        onOpenChange={setShowOfferDialog}
        applicationId={applicationId!}
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
      <ConvertToEmployeeDialog
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        applicationId={applicationId!}
        candidateName={candidate?.name}
        jobTitle={application.job?.title}
      />
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
      <AddToPositionDialog
        open={showAddPositionDialog}
        onOpenChange={setShowAddPositionDialog}
        candidateId={candidate?.id || ''}
        candidateName={candidate?.name || 'Candidate'}
        existingJobIds={(siblingApplications || []).map(a => (a.job as any)?.id).filter(Boolean)}
      />
    </div>
  );
}

// ─── Detail Row Helper Component ──────────────────────────────
function DetailRow({
  icon: Icon,
  label,
  value,
  href,
  external,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        {href ? (
          <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="text-primary hover:underline break-all"
          >
            {value}
            {external && <ExternalLink className="inline h-3 w-3 ml-1" />}
          </a>
        ) : (
          <p className={highlight ? 'font-medium' : ''}>{value}</p>
        )}
      </div>
    </div>
  );
}
