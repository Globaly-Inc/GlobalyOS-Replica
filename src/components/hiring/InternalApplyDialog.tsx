import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { useOrganization } from '@/hooks/useOrganization';
import { useQueryClient } from '@tanstack/react-query';

interface InternalApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancy: {
    id: string;
    title: string;
  };
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE = 25 * 1024 * 1024;

export const InternalApplyDialog = ({ open, onOpenChange, vacancy }: InternalApplyDialogProps) => {
  const { data: employee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const employeeName = employee?.profiles?.full_name ?? '';
  const employeeEmail = employee?.profiles?.email ?? '';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only PDF, DOC, and DOCX files are allowed');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('File must be under 25MB');
      return;
    }
    setResumeFile(file);
  };

  const handleSubmit = async () => {
    if (!currentOrg?.slug || !employee) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('org_code', currentOrg.slug);
      formData.append('job_id', vacancy.id);
      formData.append('candidate_name', employeeName);
      formData.append('candidate_email', employeeEmail);
      formData.append('source_of_application', 'internal');
      if (resumeFile) {
        formData.append('resume', resumeFile);
      }

      const { data, error } = await supabase.functions.invoke('submit-public-application', {
        body: formData,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Application submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['internal-vacancies-applied'] });
      onOpenChange(false);
      setResumeFile(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for {vacancy.title}</DialogTitle>
          <DialogDescription>
            Your details are pre-filled from your profile. Upload your resume to apply.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Full Name</Label>
            <Input value={employeeName} disabled className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Email</Label>
            <Input value={employeeEmail} disabled className="bg-muted" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Resume</Label>
            {resumeFile ? (
              <div className="flex items-center gap-2 rounded-md border p-2.5 bg-muted/50">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm truncate flex-1">{resumeFile.name}</span>
                <button
                  type="button"
                  onClick={() => { setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full rounded-md border-2 border-dashed border-muted-foreground/25 p-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Upload className="h-4 w-4" />
                Click to upload resume (PDF, DOC, DOCX)
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Submit Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
