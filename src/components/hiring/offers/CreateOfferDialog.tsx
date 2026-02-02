/**
 * Create Offer Dialog
 * Dialog to create a job offer for a candidate
 */

import { useState } from 'react';
import { useCreateOffer } from '@/services/useHiringMutations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, addDays } from 'date-fns';
import { EMPLOYMENT_TYPE_LABELS, type HiringEmploymentType } from '@/types/hiring';

interface CreateOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  jobTitle?: string;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'];

export function CreateOfferDialog({
  open,
  onOpenChange,
  applicationId,
  jobTitle,
}: CreateOfferDialogProps) {
  const createOffer = useCreateOffer();

  const [title, setTitle] = useState(jobTitle || '');
  const [level, setLevel] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [employmentType, setEmploymentType] = useState<HiringEmploymentType>('full_time');
  const [startDate, setStartDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
  const [expiresAt, setExpiresAt] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    await createOffer.mutateAsync({
      application_id: applicationId,
      title,
      level: level || undefined,
      base_salary: baseSalary ? parseFloat(baseSalary) : undefined,
      currency,
      employment_type: employmentType,
      start_date: startDate,
      expires_at: expiresAt,
      notes: notes || undefined,
    });

    onOpenChange(false);
    // Reset form
    setTitle(jobTitle || '');
    setLevel('');
    setBaseSalary('');
    setCurrency('USD');
    setEmploymentType('full_time');
    setStartDate(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
    setExpiresAt(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Offer</DialogTitle>
          <DialogDescription>
            Prepare a job offer for the candidate. You can send it after approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Senior Software Engineer"
            />
          </div>

          {/* Level */}
          <div className="space-y-2">
            <Label htmlFor="level">Level / Band</Label>
            <Input
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="e.g., L5, Senior, IC4"
            />
          </div>

          {/* Salary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary">Base Salary</Label>
              <Input
                id="salary"
                type="number"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                placeholder="e.g., 120000"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(curr => (
                    <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Employment Type */}
          <div className="space-y-2">
            <Label>Employment Type</Label>
            <Select value={employmentType} onValueChange={(v) => setEmploymentType(v as HiringEmploymentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Offer Expires</Label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Internal)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional notes about this offer..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!title || createOffer.isPending}
          >
            {createOffer.isPending ? 'Creating...' : 'Create Offer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
