/**
 * Resume Parse Button Component
 * Triggers AI-powered parsing of uploaded CV/resume
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';

interface ParsedResumeData {
  personal_info?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin_url?: string;
    portfolio_url?: string;
  };
  summary?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    year?: string;
    field?: string;
  }>;
  certifications?: string[];
  languages?: string[];
  total_years_experience?: number;
}

interface ResumeParseButtonProps {
  filePath: string;
  candidateId: string;
  applicationId: string;
  disabled?: boolean;
}

export function ResumeParseButton({
  filePath,
  candidateId,
  applicationId,
  disabled = false,
}: ResumeParseButtonProps) {
  const queryClient = useQueryClient();
  const [isParsing, setIsParsing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);

  const handleParse = async () => {
    if (!filePath) {
      toast.error('No resume file to parse');
      return;
    }

    setIsParsing(true);

    try {
      const { data, error } = await supabase.functions.invoke('parse-resume', {
        body: {
          file_path: filePath,
          candidate_id: candidateId,
          application_id: applicationId,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.message || 'Failed to parse resume');
      }

      setParsedData(data.data);
      setShowResults(true);
      toast.success('Resume parsed successfully');

      // Invalidate related queries to refresh candidate data
      queryClient.invalidateQueries({ queryKey: ['hiring'] });
    } catch (error: any) {
      console.error('Parse error:', error);
      toast.error(error.message || 'Failed to parse resume');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleParse}
        disabled={disabled || isParsing || !filePath}
        className="gap-2"
      >
        {isParsing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Parsing...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Parse with AI
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Resume Parsed Successfully
            </DialogTitle>
            <DialogDescription>
              AI-extracted information from the resume. Candidate profile has been updated.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {parsedData && (
              <div className="space-y-6">
                {/* Personal Info */}
                {parsedData.personal_info && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Personal Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {parsedData.personal_info.name && (
                        <div><span className="text-muted-foreground">Name:</span> {parsedData.personal_info.name}</div>
                      )}
                      {parsedData.personal_info.email && (
                        <div><span className="text-muted-foreground">Email:</span> {parsedData.personal_info.email}</div>
                      )}
                      {parsedData.personal_info.phone && (
                        <div><span className="text-muted-foreground">Phone:</span> {parsedData.personal_info.phone}</div>
                      )}
                      {parsedData.personal_info.location && (
                        <div><span className="text-muted-foreground">Location:</span> {parsedData.personal_info.location}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {parsedData.summary && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Summary</h4>
                    <p className="text-sm">{parsedData.summary}</p>
                  </div>
                )}

                {/* Skills */}
                {parsedData.skills && parsedData.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {parsedData.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {parsedData.experience && parsedData.experience.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">
                      Experience {parsedData.total_years_experience && `(${parsedData.total_years_experience} years)`}
                    </h4>
                    <div className="space-y-3">
                      {parsedData.experience.map((exp, index) => (
                        <div key={index} className="text-sm border-l-2 border-primary/30 pl-3">
                          <div className="font-medium">{exp.title}</div>
                          <div className="text-muted-foreground">
                            {exp.company} {exp.location && `• ${exp.location}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {exp.start_date} - {exp.end_date || 'Present'}
                          </div>
                          {exp.description && (
                            <p className="text-xs mt-1">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {parsedData.education && parsedData.education.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Education</h4>
                    <div className="space-y-2">
                      {parsedData.education.map((edu, index) => (
                        <div key={index} className="text-sm">
                          <div className="font-medium">{edu.degree} {edu.field && `in ${edu.field}`}</div>
                          <div className="text-muted-foreground">
                            {edu.institution} {edu.year && `• ${edu.year}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {parsedData.certifications && parsedData.certifications.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Certifications</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {parsedData.certifications.map((cert, index) => (
                        <li key={index}>{cert}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Languages */}
                {parsedData.languages && parsedData.languages.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Languages</h4>
                    <div className="flex flex-wrap gap-1">
                      {parsedData.languages.map((lang, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
