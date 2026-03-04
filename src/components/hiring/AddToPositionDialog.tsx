/**
 * Add Candidate to Another Position Dialog
 * Allows recruiters to apply a candidate to additional open jobs
 */

import { useState } from 'react';
import { useJobs } from '@/services/useHiring';
import { useCreateApplication } from '@/services/useHiringMutations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Search, MapPin, Building } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';

interface AddToPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  existingJobIds: string[];
  currentCvFilePath?: string | null;
}

export function AddToPositionDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  existingJobIds,
  currentCvFilePath,
}: AddToPositionDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const { data: jobs, isLoading } = useJobs({ status: 'open' });
  const createApplication = useCreateApplication();

  // Filter out jobs the candidate already applied to
  const availableJobs = (jobs || []).filter(
    (job) => !existingJobIds.includes(job.id) && 
    (search === '' || job.title.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSubmit = async () => {
    if (!selectedJobId) return;

    try {
      await createApplication.mutateAsync({
        candidate_id: candidateId,
        job_id: selectedJobId,
        stage: 'applied',
        cv_file_path: currentCvFilePath || undefined,
      });
      onOpenChange(false);
      setSelectedJobId(null);
      setSearch('');
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply to Another Position</DialogTitle>
          <DialogDescription>
            Select an open position to apply {candidateName} to.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search positions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="max-h-64">
          <div className="space-y-1">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : availableJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {search ? 'No matching positions found' : 'No open positions available'}
              </p>
            ) : (
              availableJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedJobId === job.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedJobId(job.id)}
                >
                  <div className="flex items-start gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{job.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {job.department?.name && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building className="h-3 w-3" />
                            {job.department.name}
                          </span>
                        )}
                        {job.office?.city && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {job.office.city}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {job.employment_type?.replace('_', ' ') || 'Open'}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedJobId || createApplication.isPending}
          >
            {createApplication.isPending ? 'Applying...' : 'Apply to Position'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
