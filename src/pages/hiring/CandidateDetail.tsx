/**
 * Candidate Detail Page
 * Full profile view of a candidate with all their applications
 */

import { useParams } from 'react-router-dom';
import { useCandidate } from '@/services/useHiring';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrgLink } from '@/components/OrgLink';
import { 
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  ExternalLink,
  FileText,
  Briefcase,
  Calendar,
  Clock,
  Star,
  ClipboardList,
  MessageSquare
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  getCandidateSourceLabel, 
  APPLICATION_STAGE_LABELS,
  APPLICATION_STATUS_LABELS 
} from '@/types/hiring';

export default function CandidateDetail() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const { data: candidate, isLoading } = useCandidate(candidateId || '');

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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-semibold mb-2">Candidate not found</h2>
        <p className="text-muted-foreground mb-4">This candidate doesn't exist or was deleted.</p>
        <Button asChild>
          <OrgLink to="/hiring/candidates">Back to Candidates</OrgLink>
        </Button>
      </div>
    );
  }

  const applications = candidate.candidate_applications || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <OrgLink to="/hiring/candidates">
            <ArrowLeft className="h-4 w-4" />
          </OrgLink>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{candidate.name}</h1>
          <p className="text-muted-foreground">
            Added {formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Profile Card */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage src={candidate.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(candidate.name)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold">{candidate.name}</h3>
                <Badge variant="secondary" className="mt-2">
                  {getCandidateSourceLabel(candidate.source)}
                </Badge>
              </div>

              <Separator className="my-4" />

              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`mailto:${candidate.email}`}
                    className="text-primary hover:underline truncate"
                  >
                    {candidate.email}
                  </a>
                </div>

                {candidate.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${candidate.phone}`} className="hover:underline">
                      {candidate.phone}
                    </a>
                  </div>
                )}

                {candidate.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.location}</span>
                  </div>
                )}

                {candidate.linkedin_url && (
                  <div className="flex items-center gap-3 text-sm">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={candidate.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      LinkedIn
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {candidate.portfolio_url && (
                  <div className="flex items-center gap-3 text-sm">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={candidate.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Portfolio
                    </a>
                  </div>
                )}
              </div>

              {/* Tags */}
              {candidate.tags && candidate.tags.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex flex-wrap gap-2">
                    {candidate.tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {candidate.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{candidate.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Applications</span>
                <span className="font-medium">{applications.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium">
                  {applications.filter((a: any) => a.status === 'active').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium">{getCandidateSourceLabel(candidate.source)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="applications">
            <TabsList>
              <TabsTrigger value="applications" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Applications ({applications.length})
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </TabsTrigger>
            </TabsList>

            <TabsContent value="applications" className="mt-6 space-y-4">
              {applications.length > 0 ? (
                applications.map((app: any) => (
                  <Card key={app.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <OrgLink 
                            to={`/hiring/applications/${app.id}`}
                            className="font-semibold hover:text-primary transition-colors"
                          >
                            {app.job?.title || 'Unknown Job'}
                          </OrgLink>
                          
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Applied {format(new Date(app.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>

                          {app.cover_letter && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {app.cover_letter}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={app.status === 'active' ? 'default' : 'secondary'}>
                            {APPLICATION_STATUS_LABELS[app.status]}
                          </Badge>
                          <Badge variant="outline">
                            {APPLICATION_STAGE_LABELS[app.stage]}
                          </Badge>
                          {app.rating && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-4 w-4 text-yellow-500" />
                              {app.rating}/5
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t flex justify-end">
                        <Button variant="outline" size="sm" asChild>
                          <OrgLink to={`/hiring/applications/${app.id}`}>
                            View Application
                          </OrgLink>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No applications yet</h3>
                    <p className="text-muted-foreground">
                      This candidate hasn't applied to any positions
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-6">
              <Card>
                <CardContent className="py-8 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Activity Timeline</h3>
                  <p className="text-muted-foreground">
                    Timeline view coming soon
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
