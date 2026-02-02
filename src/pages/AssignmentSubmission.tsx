/**
 * Public Assignment Submission Page
 * Candidates access this via secure token to complete their assignment
 */

import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useAssignmentByToken } from '@/services/useHiring';
import { useSubmitAssignment } from '@/services/useHiringMutations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  FileText,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Link as LinkIcon,
  Send
} from 'lucide-react';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import type { SubmissionData } from '@/types/hiring';

export default function AssignmentSubmission() {
  const { token } = useParams<{ token: string }>();
  const { data: assignment, isLoading, error } = useAssignmentByToken(token);
  const submitAssignment = useSubmitAssignment();
  
  const [submissionData, setSubmissionData] = useState<SubmissionData>({
    files: [],
    text_answers: [],
    urls: [],
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const isOverdue = assignment?.deadline ? isPast(new Date(assignment.deadline)) : false;
  const isSubmitted = assignment?.status === 'submitted' || assignment?.status === 'reviewed';

  const handleTextAnswerChange = (question: string, answer: string) => {
    setSubmissionData(prev => {
      const existing = prev.text_answers.findIndex(a => a.question === question);
      if (existing >= 0) {
        const updated = [...prev.text_answers];
        updated[existing] = { question, answer };
        return { ...prev, text_answers: updated };
      }
      return { ...prev, text_answers: [...prev.text_answers, { question, answer }] };
    });
  };

  const handleUrlChange = (label: string, url: string) => {
    setSubmissionData(prev => {
      const existing = prev.urls.findIndex(u => u.label === label);
      if (existing >= 0) {
        const updated = [...prev.urls];
        updated[existing] = { label, url };
        return { ...prev, urls: updated };
      }
      return { ...prev, urls: [...prev.urls, { label, url }] };
    });
  };

  const handleSubmit = async () => {
    if (!token) return;

    try {
      await submitAssignment.mutateAsync({
        token,
        input: { submission_data: submissionData },
      });
      setShowSuccess(true);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Invalid Assignment Link</h2>
            <p className="text-muted-foreground">
              This assignment link is invalid or has expired. Please contact the recruiter for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showSuccess || isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Assignment Submitted!</h2>
            <p className="text-muted-foreground">
              Thank you for completing the assignment. The team will review your submission and get back to you soon.
            </p>
            {assignment?.submitted_at && (
              <p className="text-sm text-muted-foreground mt-4">
                Submitted on {format(new Date(assignment.submitted_at), 'PPpp')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <Helmet>
        <title>{assignment?.title || 'Assignment'}</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          {isLoading ? (
            <Card>
              <CardContent className="py-8">
                <Skeleton className="h-8 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Header Card */}
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl">{assignment?.title}</CardTitle>
                      <CardDescription className="mt-1">
                        Complete the assignment below before the deadline
                      </CardDescription>
                    </div>
                    {isOverdue ? (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Overdue
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(assignment?.deadline || ''), { addSuffix: true })}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Deadline: {assignment?.deadline && format(new Date(assignment.deadline), 'PPpp')}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: assignment?.instructions || '' }}
                  />
                </CardContent>
              </Card>

              {/* Submission Form */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Your Submission</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Text Questions */}
                  {assignment?.expected_deliverables?.text_questions?.map((question, idx) => (
                    <div key={idx} className="space-y-2">
                      <Label>{question}</Label>
                      <Textarea
                        rows={4}
                        placeholder="Your answer..."
                        onChange={(e) => handleTextAnswerChange(question, e.target.value)}
                      />
                    </div>
                  ))}

                  {/* URL Fields */}
                  {assignment?.expected_deliverables?.url_fields?.map((label, idx) => (
                    <div key={idx} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        {label}
                      </Label>
                      <Input
                        type="url"
                        placeholder="https://..."
                        onChange={(e) => handleUrlChange(label, e.target.value)}
                      />
                    </div>
                  ))}

                  {/* File Upload Placeholder */}
                  {assignment?.expected_deliverables?.files && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        File Uploads
                      </Label>
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          File upload coming soon. For now, please share files via the URL fields above.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button 
                  size="lg" 
                  onClick={handleSubmit}
                  disabled={submitAssignment.isPending || isOverdue}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {submitAssignment.isPending ? 'Submitting...' : 'Submit Assignment'}
                </Button>
              </div>

              {isOverdue && (
                <p className="text-center text-sm text-destructive mt-4">
                  This assignment is past its deadline. Please contact the recruiter.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </HelmetProvider>
  );
}
