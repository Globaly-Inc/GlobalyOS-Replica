/**
 * CandidateEducationCard
 * Lists education background with full CRUD via dialogs
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { GraduationCap, Plus, Pencil, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

interface CandidateEducationCardProps {
  candidateId: string;
}

interface Education {
  id: string;
  degree: string;
  institution: string;
  field_of_study: string | null;
  start_year: string | null;
  end_year: string | null;
  description: string | null;
}

const emptyForm = { degree: '', institution: '', field_of_study: '', start_year: '', end_year: '', description: '' };

export function CandidateEducationCard({ candidateId }: CandidateEducationCardProps) {
  const { currentOrg } = useOrganization();
  const qc = useQueryClient();
  const qk = ['candidate-education', candidateId];

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Education | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: education = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      if (!candidateId || !currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('candidate_education')
        .select('*')
        .eq('candidate_id', candidateId)
        .eq('organization_id', currentOrg.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Education[];
    },
    enabled: !!candidateId && !!currentOrg?.id,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from('candidate_education').update({
          degree: form.degree,
          institution: form.institution,
          field_of_study: form.field_of_study || null,
          start_year: form.start_year || null,
          end_year: form.end_year || null,
          description: form.description || null,
          updated_at: new Date().toISOString(),
        }).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('candidate_education').insert({
          candidate_id: candidateId,
          organization_id: currentOrg!.id,
          degree: form.degree,
          institution: form.institution,
          field_of_study: form.field_of_study || null,
          start_year: form.start_year || null,
          end_year: form.end_year || null,
          description: form.description || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk });
      toast.success(editing ? 'Education updated' : 'Education added');
      closeDialog();
    },
    onError: () => toast.error('Failed to save education'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('candidate_education').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk });
      toast.success('Education removed');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to remove education'),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (edu: Education) => {
    setEditing(edu);
    setForm({
      degree: edu.degree,
      institution: edu.institution,
      field_of_study: edu.field_of_study || '',
      start_year: edu.start_year || '',
      end_year: edu.end_year || '',
      description: edu.description || '',
    });
    setShowDialog(true);
  };
  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(emptyForm); };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <GraduationCap className="h-5 w-5 text-primary" />
            Education
          </h2>
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
          ) : education.length === 0 ? (
            <div className="text-center py-6">
              <GraduationCap className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No education added yet</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>Add Education</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {education.map((edu) => (
                <div key={edu.id} className="group relative p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm">{edu.degree}</h4>
                      <p className="text-sm text-muted-foreground">{edu.institution}{edu.field_of_study ? ` · ${edu.field_of_study}` : ''}</p>
                      {(edu.start_year || edu.end_year) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {edu.start_year || '?'} — {edu.end_year || '?'}
                        </p>
                      )}
                      {edu.description && (
                        <p className="text-xs text-foreground mt-1.5 whitespace-pre-wrap">{edu.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(edu)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(edu.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Education' : 'Add Education'}</DialogTitle>
            <DialogDescription>{editing ? 'Update the education details.' : 'Add a new education entry.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Degree <span className="text-destructive">*</span></Label>
                <Input value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} placeholder="Bachelor of Science" />
              </div>
              <div className="space-y-2">
                <Label>Institution <span className="text-destructive">*</span></Label>
                <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="MIT" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Field of Study</Label>
              <Input value={form.field_of_study} onChange={(e) => setForm({ ...form, field_of_study: e.target.value })} placeholder="Computer Science" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Year</Label>
                <Input value={form.start_year} onChange={(e) => setForm({ ...form, start_year: e.target.value })} placeholder="2016" />
              </div>
              <div className="space-y-2">
                <Label>End Year</Label>
                <Input value={form.end_year} onChange={(e) => setForm({ ...form, end_year: e.target.value })} placeholder="2020" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Additional details…" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.degree.trim() || !form.institution.trim() || save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Education'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Education</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove this education entry? This action cannot be undone.</AlertDialogDescription>
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
