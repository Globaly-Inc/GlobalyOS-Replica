import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, UserPlus, Check, X } from 'lucide-react';
import { useCandidates } from '@/services/useHiring';
import { useCreateCandidate, useCreateApplication } from '@/services/useHiringMutations';
import { APPLICATION_STAGE_LABELS, type ApplicationStage, type JobStage, type Candidate } from '@/types/hiring';
import { toast } from 'sonner';

const DEFAULT_STAGES: ApplicationStage[] = [
  'applied', 'screening', 'assignment', 'interview_1', 'interview_2', 'interview_3', 'offer', 'hired',
];

interface AddCandidateToPipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  stages: JobStage[];
  defaultStage: ApplicationStage;
  existingCandidateIds: string[];
}

export function AddCandidateToPipelineDialog({
  open,
  onOpenChange,
  jobId,
  stages,
  defaultStage,
  existingCandidateIds,
}: AddCandidateToPipelineDialogProps) {
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedStage, setSelectedStage] = useState<ApplicationStage>(defaultStage);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createCandidate = useCreateCandidate();
  const createApplication = useCreateApplication();

  const stageOptions = stages.length > 0
    ? stages.map(s => ({ key: s.stage_key, label: s.name }))
    : DEFAULT_STAGES.map(s => ({ key: s, label: APPLICATION_STAGE_LABELS[s] || s }));

  // Sync defaultStage when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedStage(defaultStage);
      setMode('search');
      setSearchQuery('');
      setDebouncedQuery('');
      setSelectedCandidate(null);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
    }
  }, [open, defaultStage]);

  // Debounce search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchQuery]);

  const { data: candidateResults } = useCandidates(
    debouncedQuery.length >= 2 ? { search: debouncedQuery } : undefined
  );

  const filteredResults = (candidateResults || []).filter(
    c => !existingCandidateIds.includes(c.id)
  );

  const isSubmitting = createCandidate.isPending || createApplication.isPending;

  const handleSubmit = async () => {
    try {
      if (mode === 'search') {
        if (!selectedCandidate) {
          toast.error('Please select a candidate');
          return;
        }
        await createApplication.mutateAsync({
          candidate_id: selectedCandidate.id,
          job_id: jobId,
          stage: selectedStage,
        });
      } else {
        if (!newName.trim()) { toast.error('Name is required'); return; }
        if (!newEmail.trim()) { toast.error('Email is required'); return; }
        const candidate = await createCandidate.mutateAsync({
          name: newName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim() || null,
        });
        await createApplication.mutateAsync({
          candidate_id: candidate.id,
          job_id: jobId,
          stage: selectedStage,
        });
      }
      onOpenChange(false);
    } catch {
      // errors are shown by the mutations themselves
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add Candidate to Pipeline
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stage selector */}
          <div className="space-y-1.5">
            <Label>Add to stage</Label>
            <Select value={selectedStage} onValueChange={v => setSelectedStage(v as ApplicationStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stageOptions.map(s => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Mode tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMode('search'); setSelectedCandidate(null); }}
              className={`flex-1 py-1.5 text-sm rounded-md border transition-colors ${
                mode === 'search'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input hover:bg-muted'
              }`}
            >
              Search existing
            </button>
            <button
              type="button"
              onClick={() => { setMode('create'); setSelectedCandidate(null); }}
              className={`flex-1 py-1.5 text-sm rounded-md border transition-colors ${
                mode === 'create'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input hover:bg-muted'
              }`}
            >
              New candidate
            </button>
          </div>

          {mode === 'search' ? (
            <div className="space-y-2">
              {selectedCandidate ? (
                <div className="flex items-center justify-between p-2.5 rounded-md border border-primary bg-primary/5">
                  <div>
                    <p className="text-sm font-medium">{selectedCandidate.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedCandidate.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8"
                      autoFocus
                    />
                  </div>
                  {debouncedQuery.length >= 2 && (
                    <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                      {filteredResults.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                          No candidates found
                          <button
                            type="button"
                            className="block mx-auto mt-1 text-primary hover:underline text-xs"
                            onClick={() => { setMode('create'); setNewName(searchQuery); }}
                          >
                            + Create "{searchQuery}"
                          </button>
                        </div>
                      ) : (
                        filteredResults.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted transition-colors"
                            onClick={() => { setSelectedCandidate(c); setSearchQuery(''); }}
                          >
                            <div>
                              <p className="text-sm font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.email}</p>
                            </div>
                            {c.tags?.length > 0 && (
                              <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                                {c.tags[0]}
                              </Badge>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {debouncedQuery.length < 2 && (
                    <p className="text-xs text-muted-foreground">Type at least 2 characters to search</p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Full name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : (
              <>
                <Check className="h-4 w-4" />
                Add Candidate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
