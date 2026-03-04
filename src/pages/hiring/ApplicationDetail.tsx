/**
 * Application Detail Page
 * Full view of a candidate's application with all activities
 */

import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useHiringApplication } from '@/services';
import { 
  useAssignmentInstances, 
  useInterviews, 
  useOffer,
  useHiringActivityLog 
} from '@/services/useHiring';
import { useAssignmentTemplatesForPosition } from '@/hooks/useAssignmentTemplatesForPosition';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  useUpdateApplicationStage,
  useAssignAssignment,
  useScheduleInterview,
  useCreateOffer
} from '@/services/useHiringMutations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrgLink } from '@/components/OrgLink';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ChevronDown
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
import { AssignAssignmentDialog } from '@/components/hiring/assignments/AssignAssignmentDialog'; // kept for potential future use
import { ScheduleInterviewDialog } from '@/components/hiring/interviews/ScheduleInterviewDialog';
import { CreateOfferDialog } from '@/components/hiring/offers/CreateOfferDialog';
import { SendOfferDialog } from '@/components/hiring/offers/SendOfferDialog';
import { CVUpload } from '@/components/hiring/CVUpload';
import { ResumeParseButton } from '@/components/hiring/ResumeParseButton';
import { ConvertToEmployeeDialog } from '@/components/hiring/ConvertToEmployeeDialog';

export default function ApplicationDetail() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [showAssignmentDialog] = useState(false); // kept for potential future use
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [showSendOfferDialog, setShowSendOfferDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  const { data: application, isLoading } = useHiringApplication(applicationId);
  const { data: assignments } = useAssignmentInstances(applicationId);
  const { data: interviews } = useInterviews(applicationId);
  const { data: offer } = useOffer(applicationId);
  const { data: activityLog } = useHiringActivityLog('application', applicationId);
  
  const updateStage = useUpdateApplicationStage();

  const handleStageChange = async (stage: ApplicationStage) => {
    if (!applicationId) return;
    
    try {
      await updateStage.mutateAsync({ applicationId, stage });
      toast.success(`Moved to ${APPLICATION_STAGE_LABELS[stage]}`);
    } catch (error) {
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-64" />
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

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <OrgLink to={`/hiring/jobs/${application.job?.slug}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </OrgLink>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{candidate?.name || 'Unknown Candidate'}</h1>
          <p className="text-muted-foreground">
            Applied for <OrgLink to={`/hiring/jobs/${application.job?.slug}`} className="text-primary hover:underline">{application.job?.title}</OrgLink>
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowInterviewDialog(true)}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Interview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowOfferDialog(true)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Create Offer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => handleStageChange('rejected')}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stage Selector */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Current Stage:</span>
                  <Select
                    value={application.stage}
                    onValueChange={(value) => handleStageChange(value as ApplicationStage)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(APPLICATION_STAGE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Badge variant={application.status === 'active' ? 'default' : 'secondary'}>
                  {APPLICATION_STATUS_LABELS[application.status]}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="assignments">
                Assignments ({assignments?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="interviews">
                Interviews ({interviews?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="offer">
                Offer {offer ? '✓' : ''}
              </TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* CV/Resume */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      CV / Resume
                    </span>
                    {application.cv_file_path && (
                      <ResumeParseButton
                        filePath={application.cv_file_path}
                        candidateId={candidate?.id || ''}
                        applicationId={application.id}
                      />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CVUpload
                    candidateId={candidate?.id || ''}
                    applicationId={application.id}
                    currentFilePath={application.cv_file_path}
                  />
                </CardContent>
              </Card>

              {/* Cover Letter */}
              {application.cover_letter && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cover Letter</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm">{application.cover_letter}</p>
                  </CardContent>
                </Card>
              )}

              {/* Rating */}
              {application.rating && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-5 w-5 text-warning" />
                      Rating: {application.rating}/5
                    </CardTitle>
                  </CardHeader>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="assignments" className="space-y-4 mt-4">
              {assignments && assignments.length > 0 ? (
                assignments.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{assignment.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Due: {format(new Date(assignment.deadline), 'PPp')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            assignment.status === 'submitted' ? 'default' :
                            assignment.status === 'reviewed' ? 'secondary' :
                            assignment.status === 'overdue' ? 'destructive' : 'outline'
                          }>
                            {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                          </Badge>
                          {((assignment as any).template?.slug || (assignment as any).template?.public_token) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                const tmpl = (assignment as any).template;
                                const link = tmpl?.slug
                                  ? `${window.location.origin}/careers/${(application as any)?.job?.organization?.slug || ''}/assignment/${tmpl.slug}`
                                  : `${window.location.origin}/assignment/t/${tmpl.public_token}`;
                                navigator.clipboard.writeText(link);
                                toast.success('Assignment link copied!');
                              }}
                              title="Copy public assignment link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {assignment.rating && (
                        <div className="mt-2 flex items-center gap-1">
                          <Star className="h-4 w-4 text-warning" />
                          <span className="text-sm">{assignment.rating}/5</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No assignments linked to this position yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="interviews" className="space-y-4 mt-4">
              {interviews && interviews.length > 0 ? (
                interviews.map((interview) => (
                  <Collapsible key={interview.id}>
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardContent className="py-4 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{interview.interview_type}</h4>
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(interview.scheduled_at), 'PPp')} ({interview.duration_minutes} min)
                              </p>
                              {interview.location && (
                                <p className="text-sm text-muted-foreground">{interview.location}</p>
                              )}
                            </div>
                            <Badge variant={
                              interview.status === 'completed' ? 'default' :
                              interview.status === 'cancelled' ? 'destructive' : 'outline'
                            }>
                              {INTERVIEW_STATUS_LABELS[interview.status]}
                            </Badge>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-6 pb-4 space-y-3 border-t pt-3">
                          {/* Meeting Link */}
                          {interview.meeting_link && (
                            <div className="flex items-center gap-2">
                              <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                              <a
                                href={interview.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline truncate"
                              >
                                {interview.meeting_link}
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(interview.meeting_link!);
                                  toast.success('Meeting link copied');
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          {/* Interviewer IDs */}
                          {interview.interviewer_ids && interview.interviewer_ids.length > 0 && (
                            <div className="flex items-start gap-2">
                              <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Interviewers</p>
                                <p className="text-sm">{interview.interviewer_ids.length} interviewer(s) assigned</p>
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {interview.notes && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                                <p className="text-sm whitespace-pre-wrap">{interview.notes}</p>
                              </div>
                            </div>
                          )}

                          {/* Scorecards */}
                          {interview.interview_scorecards && interview.interview_scorecards.length > 0 && (
                            <div className="flex items-start gap-2">
                              <Star className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Scorecards</p>
                                <p className="text-sm">{interview.interview_scorecards.length} scorecard(s) submitted</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No interviews scheduled</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setShowInterviewDialog(true)}
                    >
                      Schedule Interview
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="offer" className="mt-4">
              {offer ? (
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-lg">{offer.title}</h4>
                        {offer.level && (
                          <p className="text-sm text-muted-foreground">Level: {offer.level}</p>
                        )}
                      </div>
                      <Badge variant={
                        offer.status === 'accepted' ? 'default' :
                        offer.status === 'declined' ? 'destructive' :
                        offer.status === 'sent' ? 'secondary' : 'outline'
                      }>
                        {offer.status?.charAt(0).toUpperCase() + offer.status?.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      {offer.base_salary && (
                        <div>
                          <span className="text-muted-foreground">Salary:</span>{' '}
                          <span className="font-medium">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: offer.currency || 'USD',
                              minimumFractionDigits: 0,
                            }).format(offer.base_salary)}
                          </span>
                        </div>
                      )}
                      {offer.start_date && (
                        <div>
                          <span className="text-muted-foreground">Start Date:</span>{' '}
                          <span className="font-medium">{format(new Date(offer.start_date), 'PP')}</span>
                        </div>
                      )}
                      {offer.expires_at && (
                        <div>
                          <span className="text-muted-foreground">Expires:</span>{' '}
                          <span className="font-medium">{format(new Date(offer.expires_at), 'PP')}</span>
                        </div>
                      )}
                      {offer.employment_type && (
                        <div>
                          <span className="text-muted-foreground">Type:</span>{' '}
                          <span className="font-medium">
                            {offer.employment_type.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </span>
                        </div>
                      )}
                    </div>

                    {offer.status === 'draft' || offer.status === 'approved' ? (
                      <Button onClick={() => setShowSendOfferDialog(true)} className="w-full">
                        <Send className="h-4 w-4 mr-2" />
                        Send Offer to Candidate
                      </Button>
                    ) : offer.status === 'sent' ? (
                      <p className="text-center text-muted-foreground text-sm">
                        Offer sent - awaiting candidate response
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No offer created yet</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setShowOfferDialog(true)}
                    >
                      Create Offer
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardContent className="py-4">
                  <ScrollArea className="h-80">
                    {activityLog && activityLog.length > 0 ? (
                      <div className="space-y-4">
                        {activityLog.map((log) => (
                          <div key={log.id} className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-medium">System</span>
                                {' '}
                                {log.action.replace(/_/g, ' ')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No activity yet</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Candidate Info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="py-6">
              <div className="text-center mb-4">
                <Avatar className="h-20 w-20 mx-auto mb-3">
                  <AvatarImage src={candidate?.avatar_url || undefined} />
                  <AvatarFallback className="text-xl">
                    {getInitials(candidate?.name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg">{candidate?.name || 'Unknown Candidate'}</h3>
                {application.is_internal && (
                  <Badge variant="secondary" className="mt-1">Internal Candidate</Badge>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Full Name</p>
                    <p className="font-medium">{candidate?.name || '—'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                    <a href={`mailto:${candidate?.email}`} className="text-primary hover:underline break-all">
                      {candidate?.email || '—'}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                    {candidate?.phone ? (
                      <a href={`tel:${candidate.phone}`} className="hover:underline">
                        {candidate.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Location</p>
                    <span>{candidate?.location || '—'}</span>
                  </div>
                </div>

                {(() => {
                  const customFields = (application as any).custom_fields as Record<string, string> | null;
                  const salaryExpectation = customFields?.salary_expectation || customFields?.salary || customFields?.expected_salary;
                  if (!salaryExpectation) return null;
                  return (
                    <div className="flex items-start gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Salary Expectation</p>
                        <span className="font-medium">{salaryExpectation}</span>
                      </div>
                    </div>
                  );
                })()}

                {candidate?.linkedin_url && (
                  <div className="flex items-start gap-2 text-sm">
                    <Linkedin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">LinkedIn</p>
                      <a 
                        href={candidate.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Profile
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="text-sm text-muted-foreground space-y-1">
                <p>Applied {formatDistanceToNow(new Date(application.created_at), { addSuffix: true })}</p>
                <p>Source: {candidate?.source || 'Unknown'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowInterviewDialog(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Interview
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowOfferDialog(true)}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Create Offer
              </Button>
              {offer?.status === 'accepted' && application.status !== 'hired' && (
                <Button 
                  className="w-full justify-start"
                  onClick={() => setShowConvertDialog(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Convert to Employee
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
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
    </div>
  );
}
