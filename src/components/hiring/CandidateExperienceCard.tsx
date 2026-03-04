/**
 * CandidateExperienceCard
 * Lists work history with full CRUD via dialogs
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Briefcase, Plus, Pencil, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

interface CandidateExperienceCardProps {
  candidateId: string;
}

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  is_current: boolean | null;
  sort_order: number | null;
}

const emptyForm = { title: '', company: '', location: '', start_date: '', end_date: '', description: '', is_current: false };

export function CandidateExperienceCard({ candidateId }: CandidateExperienceCardProps) {
  const { currentOrg } = useOrganization();
  const qc = useQueryClient();
  const qk = ['candidate-experiences', candidateId];

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Experience | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: experiences = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      if (!candidateId || !currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('candidate_experiences')
        .select('*')
        .eq('candidate_id', candidateId)
        .eq('organization_id', currentOrg.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Experience[];
    },
    enabled: !!candidateId && !!currentOrg?.id,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from('candidate_experiences').update({
          title: form.title,
          company: form.company,
          location: form.location || null,
          start_date: form.start_date || null,
          end_date: form.is_current ? null : (form.end_date || null),
          description: form.description || null,
          is_current: form.is_current,
          updated_at: new Date().toISOString(),
        }).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('candidate_experiences').insert({
          candidate_id: candidateId,
          organization_id: currentOrg!.id,
          title: form.title,
          company: form.company,
          location: form.location || null,
          start_date: form.start_date || null,
          end_date: form.is_current ? null : (form.end_date || null),
          description: form.description || null,
          is_current: form.is_current,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk });
      toast.success(editing ? 'Experience updated' : 'Experience added');
      closeDialog();
    },
    onError: () => toast.error('Failed to save experience'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('candidate_experiences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk });
      toast.success('Experience removed');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to remove experience'),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (exp: Experience) => {
    setEditing(exp);
    setForm({
      title: exp.title,
      company: exp.company,
      location: exp.location || '',
      start_date: exp.start_date || '',
      end_date: exp.end_date || '',
      description: exp.description || '',
      is_current: exp.is_current || false,
    });
    setShowDialog(true);
  };
  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(emptyForm); };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Briefcase className="h-5 w-5 text-primary" />
            Experience
          </h2>
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
          ) : experiences.length === 0 ? (
            <div className="text-center py-6">
              <Briefcase className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No experience added yet</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>Add Experience</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {experiences.map((exp) => (
                <div key={exp.id} className="group relative p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm">{exp.title}</h4>
                      <p className="text-sm text-muted-foreground">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {exp.start_date || '?'} — {exp.is_current ? 'Present' : (exp.end_date || '?')}
                      </p>
                      {exp.description && (
                        <p className="text-xs text-foreground mt-1.5 whitespace-pre-wrap">{exp.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(exp)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(exp.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {exp.is_current && <Badge variant="secondary" className="text-[10px] mt-1.5">Current</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Experience' : 'Add Experience'}</DialogTitle>
            <DialogDescription>{editing ? 'Update the work experience details.' : 'Add a new work experience entry.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Job Title <span className="text-destructive">*</span></Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Software Engineer" />
              </div>
              <div className="space-y-2">
                <Label>Company <span className="text-destructive">*</span></Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Inc." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="San Francisco, CA" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} placeholder="2020-01 or Jan 2020" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} placeholder="2023-06 or Present" disabled={form.is_current} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="is_current" checked={form.is_current} onCheckedChange={(checked) => setForm({ ...form, is_current: !!checked })} />
              <Label htmlFor="is_current" className="text-sm cursor-pointer">Currently working here</Label>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Key responsibilities and achievements…" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.title.trim() || !form.company.trim() || save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Experience'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Experience</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove this experience entry? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && remove.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
