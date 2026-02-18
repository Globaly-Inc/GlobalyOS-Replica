/**
 * AssignmentPreviewDialog
 * Shows a recruiter exactly how a candidate experiences the assignment:
 * Tab 1 — Email Gate, Tab 2 — Assignment View, Tab 3 — Success Screen
 */

import { useState } from 'react';
import { Copy, Check, Lock, Mail, Clock, FileText, Link as LinkIcon, Upload, CheckCircle2, Info } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import type { AssignmentQuestion } from '@/types/hiring';

interface FormData {
  name: string;
  type: string;
  instructions: string;
  default_deadline_hours: number;
  recommended_effort: string;
  expected_deliverables: {
    files: boolean;
    url_fields: string[];
    questions: AssignmentQuestion[];
  };
}

interface AssignmentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  isEditMode?: boolean;
  secureToken?: string; // optional: if a real token exists for copying
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local[0]}***@${domain}`;
}

// ── Email Gate Tab ─────────────────────────────────────────────────────────────
function EmailGatePreview() {
  return (
    <div className="bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-6 rounded-lg">
      <Card className="max-w-md w-full shadow-md">
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
            <Label>Email address</Label>
            <Input type="email" placeholder="you@example.com" disabled className="opacity-70" />
          </div>
          <Button className="w-full" disabled>
            Send Verification Code
          </Button>
          <div className="pt-2">
            <p className="text-center text-xs text-muted-foreground">Step 2: Check your email</p>
            <div className="mt-3 rounded-lg border border-border/60 bg-muted/40 p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Check your email</p>
                  <p className="text-xs text-muted-foreground">We'll send a 6-digit code to {maskEmail('candidate@example.com')}</p>
                </div>
              </div>
              <div className="flex justify-center opacity-60">
                <InputOTP maxLength={6} value="" onChange={() => {}} disabled>
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button className="w-full" size="sm" disabled>Verify Code</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Assignment View Tab ────────────────────────────────────────────────────────
function AssignmentViewPreview({ formData }: { formData: FormData }) {
  const deadlineLabel = (() => {
    const hours = formData.default_deadline_hours || 72;
    if (hours < 24) return `${hours} hours from now`;
    const days = Math.round(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} from now`;
  })();

  const sanitized = DOMPurify.sanitize(formData.instructions || '');

  return (
    <div className="space-y-4 p-1">
      {/* Header Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl leading-tight truncate">
                {formData.name || 'Untitled Assignment'}
              </CardTitle>
              <CardDescription className="mt-1">Complete the assignment below before the deadline</CardDescription>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
              <Clock className="h-3 w-3" />
              {deadlineLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Deadline: {deadlineLabel}
            </span>
            {formData.recommended_effort && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Estimated effort: {formData.recommended_effort}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sanitized ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />
          ) : (
            <p className="text-sm text-muted-foreground italic">No instructions added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Submission Form */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your Submission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* No questions placeholder */}
          {formData.expected_deliverables.questions.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              No submission fields configured yet.
            </p>
          )}

          {/* Questions */}
          {formData.expected_deliverables.questions.map((q, idx) => (
            <div key={idx} className="space-y-3 rounded-lg border border-border/60 p-4 bg-muted/10">
              <Label className="text-sm font-medium leading-relaxed">
                {idx + 1}. {q.text || `Question ${idx + 1}`}
                {q.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {q.type === 'multiple_choice' && q.options && (
                <RadioGroup disabled className="space-y-2">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center space-x-2 opacity-60">
                      <RadioGroupItem value={opt} id={`q${idx}-o${oIdx}`} disabled />
                      <Label htmlFor={`q${idx}-o${oIdx}`} className="font-normal cursor-default">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              {q.type === 'paragraph' && (
                <Textarea placeholder="Candidate's answer will appear here…" disabled className="opacity-60 resize-none" rows={3} />
              )}
              {q.type === 'file_upload' && (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/20">
                  <Upload className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Drop files here or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Up to {q.max_files ?? 5} file{(q.max_files ?? 5) !== 1 ? 's' : ''} · Max {q.max_size_mb ?? 25} MB each
                    {q.accept_all_types !== false ? ' · All file types accepted' : ''}
                  </p>
                </div>
              )}
              {q.type === 'url_input' && (
                <div className="space-y-1.5">
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="url"
                      placeholder={q.url_placeholder || 'https://your-url-here'}
                      disabled
                      className="pl-9 opacity-60"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="text-primary">✓</span> Must be a valid URL (https://…)
                  </p>
                </div>
              )}
            </div>
          ))}

          <Button className="w-full mt-2" disabled>
            Submit Assignment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Success Tab ────────────────────────────────────────────────────────────────
function SuccessPreview() {
  return (
    <div className="flex items-center justify-center p-6">
      <Card className="max-w-md w-full shadow-md">
        <CardContent className="pt-8 pb-8 text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: 'hsl(142 71% 45%)' }} />
          <h2 className="text-2xl font-semibold mb-2">Assignment Submitted!</h2>
          <p className="text-muted-foreground">
            Thank you for completing the assignment. The team will review your submission and get back to you soon.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Submitted on {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} at{' '}
            {new Date().toLocaleTimeString('en-US', { timeStyle: 'short' })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Dialog ────────────────────────────────────────────────────────────────
export function AssignmentPreviewDialog({
  open,
  onOpenChange,
  formData,
  isEditMode = false,
  secureToken,
}: AssignmentPreviewDialogProps) {
  const [copied, setCopied] = useState(false);

  const publicLink = secureToken
    ? `${window.location.origin}/assignment/${secureToken}`
    : null;

  const handleCopy = async () => {
    if (!publicLink) return;
    await navigator.clipboard.writeText(publicLink);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Fixed Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <DialogTitle className="text-lg font-semibold leading-none">
                Candidate Preview
              </DialogTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 font-semibold tracking-wide">
                PREVIEW MODE
              </Badge>
            </div>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              This is exactly how candidates experience this assignment
            </DialogDescription>
          </div>
        </div>

        {/* Tabs — takes all remaining height */}
        <Tabs defaultValue="email-gate" className="flex flex-col flex-1 min-h-0 px-6 pt-4">
          <TabsList className="w-full grid grid-cols-3 shrink-0">
            <TabsTrigger value="email-gate" className="gap-1.5 text-xs sm:text-sm">
              <Lock className="h-3.5 w-3.5" />
              <span>Email Gate</span>
            </TabsTrigger>
            <TabsTrigger value="assignment" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5" />
              <span>Assignment</span>
            </TabsTrigger>
            <TabsTrigger value="success" className="gap-1.5 text-xs sm:text-sm">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Success</span>
            </TabsTrigger>
          </TabsList>

          {/* Scrollable tab content — fills remaining space */}
          <div className="flex-1 overflow-y-auto min-h-0 pb-2">
            <TabsContent value="email-gate" className="mt-4">
              <EmailGatePreview />
            </TabsContent>
            <TabsContent value="assignment" className="mt-4">
              <AssignmentViewPreview formData={formData} />
            </TabsContent>
            <TabsContent value="success" className="mt-4">
              <SuccessPreview />
            </TabsContent>
          </div>
        </Tabs>

        {/* Fixed Footer — Copy Link section */}
        <div className="mt-auto px-6 py-4 border-t border-border/60 shrink-0 bg-muted/20">
          {publicLink ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground truncate font-mono">
                {publicLink}
              </div>
              <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0 gap-2">
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <p>
                <span className="font-medium text-foreground">Public links are per-candidate.</span>
                {' '}Each candidate receives a unique secure link when you assign this template to them from the pipeline. The link includes an OTP email verification step to ensure only the assigned candidate can access it.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
