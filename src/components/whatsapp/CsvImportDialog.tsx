import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  onImported: () => void;
}

interface ParsedRow {
  phone: string;
  name?: string;
  tags?: string;
  opt_in_status?: string;
}

export default function CsvImportDialog({ open, onOpenChange, orgId, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [defaultOptIn, setDefaultOptIn] = useState('pending');
  const [fileName, setFileName] = useState('');

  const reset = () => {
    setRows([]);
    setErrors([]);
    setFileName('');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setErrors(['File must have a header row and at least one data row.']);
        return;
      }

      const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''));
      const phoneIdx = header.findIndex((h) => h === 'phone' || h === 'phone_number' || h === 'mobile');
      const nameIdx = header.findIndex((h) => h === 'name' || h === 'full_name');
      const tagsIdx = header.findIndex((h) => h === 'tags' || h === 'tag');
      const optIdx = header.findIndex((h) => h === 'opt_in' || h === 'opt_in_status' || h === 'consent');

      if (phoneIdx === -1) {
        setErrors(['CSV must have a "phone" column.']);
        return;
      }

      const parsed: ParsedRow[] = [];
      const errs: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const phone = cols[phoneIdx]?.replace(/\s/g, '');
        if (!phone) {
          errs.push(`Row ${i + 1}: missing phone number`);
          continue;
        }
        if (!/^\+?\d{7,15}$/.test(phone)) {
          errs.push(`Row ${i + 1}: invalid phone "${phone}"`);
          continue;
        }
        parsed.push({
          phone: phone.startsWith('+') ? phone : `+${phone}`,
          name: nameIdx >= 0 ? cols[nameIdx] : undefined,
          tags: tagsIdx >= 0 ? cols[tagsIdx] : undefined,
          opt_in_status: optIdx >= 0 ? cols[optIdx] : undefined,
        });
      }

      setRows(parsed);
      setErrors(errs);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);

    try {
      const toInsert = rows.map((r) => ({
        organization_id: orgId,
        phone: r.phone,
        name: r.name || null,
        tags: r.tags ? r.tags.split(';').map((t) => t.trim()).filter(Boolean) : [],
        opt_in_status: r.opt_in_status || defaultOptIn,
        opt_in_source: 'csv_import',
      }));

      // Insert in batches of 100
      let imported = 0;
      for (let i = 0; i < toInsert.length; i += 100) {
        const batch = toInsert.slice(i, i + 100);
        const { error } = await supabase.from('wa_contacts').upsert(batch as any, {
          onConflict: 'organization_id,phone',
          ignoreDuplicates: false,
        });
        if (error) throw error;
        imported += batch.length;
      }

      toast.success(`${imported} contacts imported`);
      onImported();
      onOpenChange(false);
      reset();
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>Upload a CSV file with phone numbers. Consent status is required for compliance.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
            {fileName ? (
              <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                <FileText className="h-5 w-5 text-primary" />
                {fileName}
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload CSV</p>
                <p className="text-xs text-muted-foreground mt-1">Required: phone column. Optional: name, tags, opt_in_status</p>
              </div>
            )}
          </div>

          {/* Default consent */}
          <div>
            <label className="text-sm font-medium text-foreground">Default consent status</label>
            <Select value={defaultOptIn} onValueChange={setDefaultOptIn}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="opted_in">Opted In</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Applied when no opt_in column is present in CSV</p>
          </div>

          {/* Preview */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-foreground">{rows.length} valid contacts found</span>
              </div>
              <ScrollArea className="h-32 border rounded-md">
                <div className="p-2 text-xs font-mono space-y-0.5">
                  {rows.slice(0, 20).map((r, i) => (
                    <div key={i} className="text-muted-foreground">
                      {r.phone} {r.name ? `· ${r.name}` : ''} {r.tags ? `· [${r.tags}]` : ''}
                    </div>
                  ))}
                  {rows.length > 20 && <div className="text-muted-foreground">...and {rows.length - 20} more</div>}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-600">{errors.length} rows skipped</span>
              </div>
              <ScrollArea className="h-20 border rounded-md">
                <div className="p-2 text-xs space-y-0.5">
                  {errors.map((e, i) => (
                    <div key={i} className="text-destructive">{e}</div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Cancel</Button>
          <Button onClick={handleImport} disabled={rows.length === 0 || importing}>
            {importing ? 'Importing...' : `Import ${rows.length} Contacts`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
