/**
 * Candidate Detail Panel
 * Slide-out panel showing candidate details in context
 */

import { useState } from 'react';
import { useCandidate } from '@/services/useHiring';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrgLink } from '@/components/OrgLink';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Linkedin, 
  ExternalLink,
  FileText,
  Calendar,
  Briefcase
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { getCandidateSourceLabel, APPLICATION_STAGE_LABELS } from '@/types/hiring';

interface CandidateDetailPanelProps {
  candidateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CandidateDetailPanel({
  candidateId,
  open,
  onOpenChange,
}: CandidateDetailPanelProps) {
  const { data: candidate, isLoading } = useCandidate(candidateId || '');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-20 w-20 rounded-full mx-auto" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : candidate ? (
          <ScrollArea className="h-full">
            <div className="p-6">
              {/* Header */}
              <SheetHeader className="text-center mb-6">
                <Avatar className="h-20 w-20 mx-auto mb-3">
                  <AvatarImage src={candidate.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(candidate.name)}
                  </AvatarFallback>
                </Avatar>
                <SheetTitle className="text-xl">{candidate.name}</SheetTitle>
                <Badge variant="secondary" className="w-fit mx-auto">
                  {getCandidateSourceLabel(candidate.source)}
                </Badge>
              </SheetHeader>

              <Separator className="my-6" />

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-medium text-muted-foreground">Contact</h4>
                
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`mailto:${candidate.email}`} 
                    className="text-primary hover:underline"
                  >
                    {candidate.email}
                  </a>
                </div>

                {candidate.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${candidate.phone}`} className="hover:underline">
                      {candidate.phone}
                    </a>
                  </div>
                )}

                {candidate.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.location}</span>
                  </div>
                )}
              </div>

              {/* Links */}
              {(candidate.linkedin_url || candidate.portfolio_url) && (
                <>
                  <div className="space-y-3 mb-6">
                    <h4 className="text-sm font-medium text-muted-foreground">Links</h4>
                    
                    {candidate.linkedin_url && (
                      <a 
                        href={candidate.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Linkedin className="h-4 w-4" />
                        LinkedIn Profile
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}

                    {candidate.portfolio_url && (
                      <a 
                        href={candidate.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Portfolio
                      </a>
                    )}
                  </div>
                </>
              )}

              <Separator className="my-6" />

              {/* Applications */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Applications ({candidate.candidate_applications?.length || 0})
                </h4>
                
                {candidate.candidate_applications?.length ? (
                  <div className="space-y-3">
                    {candidate.candidate_applications.map((app: any) => (
                      <OrgLink 
                        key={app.id}
                        to={`/hiring/applications/${app.id}`}
                        className="block"
                      >
                        <div className="p-3 border rounded-md hover:bg-muted transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">
                              {app.job?.title || 'Unknown Job'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {APPLICATION_STAGE_LABELS[app.stage]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </OrgLink>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No applications yet</p>
                )}
              </div>

              {/* Notes */}
              {candidate.notes && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notes
                    </h4>
                    <p className="text-sm whitespace-pre-wrap">{candidate.notes}</p>
                  </div>
                </>
              )}

              {/* Tags */}
              {candidate.tags && candidate.tags.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {candidate.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="mt-6 pt-6 border-t">
                <Button asChild className="w-full">
                  <OrgLink to={`/hiring/candidates/${candidate.id}`}>
                    View Full Profile
                  </OrgLink>
                </Button>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            Candidate not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
