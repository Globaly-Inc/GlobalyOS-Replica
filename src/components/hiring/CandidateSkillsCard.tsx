/**
 * CandidateSkillsCard
 * Displays candidate skills as badges with add/remove functionality
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Sparkles, Plus, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

interface CandidateSkillsCardProps {
  candidateId: string;
}

interface CandidateSkill {
  id: string;
  name: string;
  category: string | null;
  proficiency_level: string | null;
}

export function CandidateSkillsCard({ candidateId }: CandidateSkillsCardProps) {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState('');

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['candidate-skills', candidateId],
    queryFn: async () => {
      if (!candidateId || !currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('candidate_skills')
        .select('*')
        .eq('candidate_id', candidateId)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as CandidateSkill[];
    },
    enabled: !!candidateId && !!currentOrg?.id,
  });

  const addSkill = useMutation({
    mutationFn: async (input: { name: string; category?: string }) => {
      const { error } = await supabase.from('candidate_skills').insert({
        candidate_id: candidateId,
        organization_id: currentOrg!.id,
        name: input.name,
        category: input.category || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-skills', candidateId] });
      toast.success('Skill added');
      setSkillName('');
      setSkillCategory('');
      setShowAddDialog(false);
    },
    onError: () => toast.error('Failed to add skill'),
  });

  const deleteSkill = useMutation({
    mutationFn: async (skillId: string) => {
      const { error } = await supabase.from('candidate_skills').delete().eq('id', skillId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-skills', candidateId] });
      toast.success('Skill removed');
    },
    onError: () => toast.error('Failed to remove skill'),
  });

  const handleAdd = () => {
    if (!skillName.trim()) return;
    addSkill.mutate({ name: skillName.trim(), category: skillCategory.trim() });
  };

  // Group skills by category
  const grouped = skills.reduce<Record<string, CandidateSkill[]>>((acc, s) => {
    const cat = s.category || 'General';
    (acc[cat] = acc[cat] || []).push(s);
    return acc;
  }, {});

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-card border-b">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Skills
          </h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
          ) : skills.length === 0 ? (
            <div className="text-center py-6">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No skills added yet</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddDialog(true)}>
                Add Skill
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([category, catSkills]) => (
                <div key={category}>
                  {Object.keys(grouped).length > 1 && (
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{category}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {catSkills.map((skill) => (
                      <Badge key={skill.id} variant="secondary" className="gap-1 pr-1">
                        {skill.name}
                        <button
                          onClick={() => deleteSkill.mutate(skill.id)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Skill</DialogTitle>
            <DialogDescription>Add a new skill to this candidate's profile.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Skill Name <span className="text-destructive">*</span></Label>
              <Input value={skillName} onChange={(e) => setSkillName(e.target.value)} placeholder="e.g. React, Python, Project Management" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={skillCategory} onChange={(e) => setSkillCategory(e.target.value)} placeholder="e.g. Frontend, Backend, Soft Skills" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!skillName.trim() || addSkill.isPending}>
              {addSkill.isPending ? 'Adding…' : 'Add Skill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
