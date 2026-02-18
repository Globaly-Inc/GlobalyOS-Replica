/**
 * Public Assignment Submission Page
 * Candidates access this via secure token to complete their assignment.
 * An OTP gate verifies candidate identity before showing the assignment.
 */

import { useParams } from 'react-router-dom';
import { useState, useRef } from 'react';
import { useAssignmentByToken } from '@/services/useHiring';
import { useSubmitAssignment } from '@/services/useHiringMutations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { 
  Clock, 
  FileText,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Link as LinkIcon,
  Send,
  Lock,
  Mail,
  ArrowLeft,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import DOMPurify from 'dompurify';
import { AssignmentFileUpload } from '@/components/hiring/AssignmentFileUpload';
import type { SubmissionData, AssignmentQuestion } from '@/types/hiring';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type GateState = 'email_entry' | 'otp_entry' | 'verified';

export default function AssignmentSubmission() {
  const { token } = useParams<{ token: string }>();

  // OTP gate state
  const [gateState, setGateState] = useState<GateState>('email_entry');
  const [email, setEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [gateError, setGateError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Assignment submission state (only relevant after verified)
  const { data: assignment, isLoading, error } = useAssignmentByToken(
    gateState === 'verified' ? token : undefined
  );
  const submitAssignment = useSubmitAssignment();
  const [submissionData, setSubmissionData] = useState<SubmissionData>({
    files: [],
    text_answers: [],
    urls: [],
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const isOverdue = assignment?.deadline ? isPast(new Date(assignment.deadline)) : false;
  const isSubmitted = assignment?.status === 'submitted' || assignment?.status === 'reviewed';

  // ── OTP gate handlers ──────────────────────────────────────────────────────

  const startResendCooldown = () => {
    setResendCooldown(60);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(resendTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setGateError('Please enter your email address.');
      return;
    }
    setGateError('');
    setIsSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-assignment-otp', {
        body: { token, email: email.trim() },
      });
      if (error) throw error;
      if (data?.notAssigned) {
        setGateError('This assignment has not been assigned to you. Please check your email and try again.');
        return;
      }
      if (data?.error) {
        setGateError(data.error);
        return;
      }
      setMaskedEmail(data.maskedEmail || email);
      setGateState('otp_entry');
      startResendCooldown();
    } catch (err: any) {
      const msg = err?.message || 'Failed to send verification code. Please try again.';
      // Parse edge function error body
      try {
        const parsed = JSON.parse(err?.message || '{}');
        if (parsed.notAssigned) {
          setGateError('This assignment has not been assigned to you. Please check your email and try again.');
          return;
        }
        setGateError(parsed.error || msg);
      } catch {
        setGateError(msg);
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      setGateError('Please enter the full 6-digit code.');
      return;
    }
    setGateError('');
    setIsVerifyingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-assignment-otp', {
        body: { token, email: email.trim(), code: otpValue },
      });
      if (error) throw error;
      if (data?.error) {
        setGateError(data.error);
        setOtpValue('');
        return;
      }
      if (data?.verified) {
        setGateState('verified');
        toast.success('Identity verified! Loading your assignment…');
      }
    } catch (err: any) {
      try {
        const parsed = JSON.parse(err?.message || '{}');
        setGateError(parsed.error || 'Verification failed. Please try again.');
      } catch {
        setGateError('Verification failed. Please try again.');
      }
      setOtpValue('');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setGateError('');
    setOtpValue('');
    setIsSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-assignment-otp', {
        body: { token, email: email.trim() },
      });
      if (error) throw error;
      if (data?.error) {
        setGateError(data.error);
        return;
      }
      toast.success('A new code has been sent to your email.');
      startResendCooldown();
    } catch {
      setGateError('Failed to resend code. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // ── Assignment submission handlers ─────────────────────────────────────────

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
    } catch {
      // Error handled by mutation
    }
  };

  // ── Gate screens ───────────────────────────────────────────────────────────

  if (gateState === 'email_entry') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Verify your identity</CardTitle>
            <CardDescription>
              Enter the email address this assignment was sent to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="candidate-email">Email address</Label>
              <Input
                id="candidate-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                disabled={isSendingOtp}
                autoFocus
              />
            </div>
            {gateError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{gateError}</p>
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleSendOtp}
              disabled={isSendingOtp || !email.trim()}
            >
              {isSendingOtp ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending code…</>
              ) : (
                'Send Verification Code'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gateState === 'otp_entry') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription>
              We sent a 6-digit code to <strong>{maskedEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={(val) => {
                  setOtpValue(val);
                  setGateError('');
                }}
                disabled={isVerifyingOtp}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {gateError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{gateError}</p>
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleVerifyOtp}
              disabled={isVerifyingOtp || otpValue.length !== 6}
            >
              {isVerifyingOtp ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying…</>
              ) : (
                'Verify Code'
              )}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setGateState('email_entry'); setGateError(''); setOtpValue(''); }}
                disabled={isVerifyingOtp}
                className="gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendOtp}
                disabled={isSendingOtp || resendCooldown > 0}
                className="gap-1 text-muted-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't get it? Resend"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Verified: show assignment ──────────────────────────────────────────────

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
            <CheckCircle2 className="h-16 w-16 mx-auto text-primary mb-4" />
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
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(assignment?.instructions || '') }}
                  />
                </CardContent>
              </Card>

              {/* Submission Form */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Your Submission</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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

                  {/* File Upload */}
                  {assignment?.expected_deliverables?.files && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        File Uploads
                      </Label>
                      <AssignmentFileUpload
                        assignmentId={assignment.id}
                        token={token || ''}
                        onFilesChange={(files) => {
                          setSubmissionData(prev => ({
                            ...prev,
                            files: files.map(f => ({ name: f.name, path: f.url, size: f.size })),
                          }));
                        }}
                        maxFiles={5}
                        disabled={isOverdue}
                      />
                    </div>
                  )}

                  {/* Questions */}
                  {(assignment?.expected_deliverables?.questions ?? []).map((q: AssignmentQuestion, idx: number) => {
                    const answer = submissionData.text_answers.find(a => a.question === q.id)?.answer ?? '';
                    const setAnswer = (val: string) => {
                      setSubmissionData(prev => {
                        const existing = prev.text_answers.findIndex(a => a.question === q.id);
                        if (existing >= 0) {
                          const updated = [...prev.text_answers];
                          updated[existing] = { question: q.id, answer: val };
                          return { ...prev, text_answers: updated };
                        }
                        return { ...prev, text_answers: [...prev.text_answers, { question: q.id, answer: val }] };
                      });
                    };

                    return (
                      <div key={q.id} className="space-y-3 rounded-lg border border-border/60 p-4 bg-muted/10">
                        <Label className="text-sm font-medium leading-relaxed">
                          {idx + 1}. {q.text || `Question ${idx + 1}`}
                          {q.required && <span className="text-destructive ml-1">*</span>}
                        </Label>

                        {q.type === 'paragraph' && (
                          <Textarea
                            placeholder="Your answer…"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            disabled={isOverdue}
                            rows={3}
                            className="resize-none"
                          />
                        )}

                        {q.type === 'multiple_choice' && q.options && (
                          <RadioGroup
                            value={answer}
                            onValueChange={setAnswer}
                            disabled={isOverdue}
                            className="space-y-2"
                          >
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center space-x-2">
                                <RadioGroupItem value={opt} id={`q${q.id}-o${oIdx}`} />
                                <Label htmlFor={`q${q.id}-o${oIdx}`} className="font-normal cursor-pointer">{opt}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}

                        {q.type === 'file_upload' && (
                          <AssignmentFileUpload
                            assignmentId={assignment.id}
                            token={token || ''}
                            maxFiles={q.max_files ?? 5}
                            maxSizeMB={q.max_size_mb ?? 25}
                            disabled={isOverdue}
                            onFilesChange={(files) => {
                              // Store per-question file URLs in text_answers as JSON
                              setAnswer(JSON.stringify(files.map(f => ({ name: f.name, url: f.url }))));
                            }}
                          />
                        )}

                        {q.type === 'url_input' && (() => {
                          const isInvalid = answer.length > 0 && !/^https?:\/\//i.test(answer);
                          return (
                            <div className="space-y-1.5">
                              <div className="relative">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="url"
                                  placeholder={q.url_placeholder || 'https://'}
                                  value={answer}
                                  onChange={(e) => setAnswer(e.target.value)}
                                  disabled={isOverdue}
                                  className={`pl-9 ${isInvalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                />
                              </div>
                              {isInvalid && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Must be a valid URL starting with https://
                                </p>
                              )}
                              {!isInvalid && (
                                <p className="text-xs text-muted-foreground">
                                  Must be a valid URL (https://…)
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
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
