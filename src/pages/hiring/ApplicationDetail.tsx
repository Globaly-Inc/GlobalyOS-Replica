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
  Upload
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
import { AssignAssignmentDialog } from '@/components/hiring/assignments/AssignAssignmentDialog';
import { ScheduleInterviewDialog } from '@/components/hiring/interviews/ScheduleInterviewDialog';
import { CreateOfferDialog } from '@/components/hiring/offers/CreateOfferDialog';
import { CVUpload } from '@/components/hiring/CVUpload';

export default function ApplicationDetail() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);

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
            <DropdownMenuItem onClick={() => setShowAssignmentDialog(true)}>
              <ClipboardList className="h-4 w-4 mr-2" />
              Assign Task
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
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* CV/Resume */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    CV / Resume
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
                      <Star className="h-5 w-5 text-yellow-500" />
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
                        <div>
                          <h4 className="font-medium">{assignment.title}</h4>
                          <p className="text-sm text-muted-foreground">
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
                          <Star className="h-4 w-4 text-yellow-500" />
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
                    <p className="text-muted-foreground">No assignments yet</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setShowAssignmentDialog(true)}
                    >
                      Assign Task
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="interviews" className="space-y-4 mt-4">
              {interviews && interviews.length > 0 ? (
                interviews.map((interview) => (
                  <Card key={interview.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{interview.interview_type}</h4>
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
                  </Card>
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
                <h3 className="font-semibold text-lg">{candidate?.name}</h3>
                {application.is_internal && (
                  <Badge variant="secondary" className="mt-1">Internal Candidate</Badge>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${candidate?.email}`} className="text-primary hover:underline">
                    {candidate?.email}
                  </a>
                </div>
                
                {candidate?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${candidate.phone}`} className="hover:underline">
                      {candidate.phone}
                    </a>
                  </div>
                )}

                {candidate?.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.location}</span>
                  </div>
                )}

                {candidate?.linkedin_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={candidate.linkedin_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      LinkedIn Profile
                    </a>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="text-sm text-muted-foreground">
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
                onClick={() => setShowAssignmentDialog(true)}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Assign Task
              </Button>
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <AssignAssignmentDialog
        open={showAssignmentDialog}
        onOpenChange={setShowAssignmentDialog}
        applicationId={applicationId!}
      />
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
    </div>
  );
}
