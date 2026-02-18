/**
 * Merge Dialog
 * Side-by-side comparison for merging duplicate contacts or companies.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useMergeCRMContacts, useMergeCRMCompanies } from '@/services/useCRMDuplicates';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { CRMContact, CRMCompany } from '@/types/crm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'contact' | 'company';
  primary: CRMContact | CRMCompany;
  duplicate: CRMContact | CRMCompany;
}

const contactFields = [
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'notes', label: 'Notes' },
  { key: 'source', label: 'Source' },
  { key: 'rating', label: 'Rating' },
] as const;

const companyFields = [
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
  { key: 'industry', label: 'Industry' },
  { key: 'notes', label: 'Notes' },
  { key: 'source', label: 'Source' },
  { key: 'rating', label: 'Rating' },
] as const;

export const MergeDialog = ({ open, onOpenChange, type, primary, duplicate }: Props) => {
  const fields = type === 'contact' ? contactFields : companyFields;
  const [choices, setChoices] = useState<Record<string, 'primary' | 'duplicate'>>(() => {
    const initial: Record<string, 'primary' | 'duplicate'> = {};
    fields.forEach(f => { initial[f.key] = 'primary'; });
    return initial;
  });

  const mergeContacts = useMergeCRMContacts();
  const mergeCompanies = useMergeCRMCompanies();
  const navigate = useNavigate();

  const handleMerge = () => {
    const mergedData: Record<string, any> = {};
    fields.forEach(f => {
      const source = choices[f.key] === 'primary' ? primary : duplicate;
      mergedData[f.key] = (source as any)[f.key];
    });

    if (type === 'contact') {
      mergeContacts.mutate(
        { primaryId: primary.id, duplicateId: duplicate.id, mergedData },
        {
          onSuccess: () => { toast.success('Contacts merged'); onOpenChange(false); },
          onError: () => toast.error('Merge failed'),
        }
      );
    } else {
      mergeCompanies.mutate(
        { primaryId: primary.id, duplicateId: duplicate.id, mergedData },
        {
          onSuccess: () => { toast.success('Companies merged'); onOpenChange(false); },
          onError: () => toast.error('Merge failed'),
        }
      );
    }
  };

  const primaryName = type === 'contact'
    ? `${(primary as CRMContact).first_name} ${(primary as CRMContact).last_name || ''}`
    : (primary as CRMCompany).name;
  const duplicateName = type === 'contact'
    ? `${(duplicate as CRMContact).first_name} ${(duplicate as CRMContact).last_name || ''}`
    : (duplicate as CRMCompany).name;

  const isPending = mergeContacts.isPending || mergeCompanies.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge {type === 'contact' ? 'Contacts' : 'Companies'}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Choose which value to keep for each field. The duplicate will be deleted and its activities reassigned.
        </p>
        <div className="space-y-3 max-h-[400px] overflow-auto">
          {fields.map((f) => {
            const pVal = (primary as any)[f.key];
            const dVal = (duplicate as any)[f.key];
            if (!pVal && !dVal) return null;
            return (
              <div key={f.key} className="border rounded-lg p-3">
                <Label className="text-xs text-muted-foreground mb-2 block">{f.label}</Label>
                <RadioGroup
                  value={choices[f.key]}
                  onValueChange={(v) => setChoices(prev => ({ ...prev, [f.key]: v as 'primary' | 'duplicate' }))}
                  className="space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="primary" id={`${f.key}-primary`} />
                    <Label htmlFor={`${f.key}-primary`} className="text-sm font-normal cursor-pointer">
                      {pVal || <span className="text-muted-foreground italic">Empty</span>}
                      <span className="text-xs text-muted-foreground ml-2">({primaryName})</span>
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="duplicate" id={`${f.key}-duplicate`} />
                    <Label htmlFor={`${f.key}-duplicate`} className="text-sm font-normal cursor-pointer">
                      {dVal || <span className="text-muted-foreground italic">Empty</span>}
                      <span className="text-xs text-muted-foreground ml-2">({duplicateName})</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleMerge} disabled={isPending}>
            {isPending ? 'Merging...' : 'Merge & Delete Duplicate'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
