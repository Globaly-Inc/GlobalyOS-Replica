import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { parse, format, isValid, parseISO } from "date-fns";

interface ParsedLeaveRecord {
  employee_name: string;
  apply_date: string;
  leave_type: string;
  day_type: string;
  start_date: string;
  end_date: string;
  leave_day: number;
  reason: string;
  isOpeningBalance: boolean;
}

interface ImportResult {
  employee_name: string;
  record_type: string;
  success: boolean;
  error?: string;
}

const CSV_TEMPLATE = `Employee Name,Apply Date,Leave Type,Day Type,Start Date,End Date,Leave Day,Reason
John Doe,1/1/2025,Annual Leave,Full Day,,,10,Opening Balance
John Doe,1/1/2025,Sick Leave,Full Day,,,5,Opening Balance
John Doe,15/1/2025,Sick Leave,Full Day,15-Jan-25,15-Jan-25,-1,
John Doe,20/1/2025,Annual Leave,First Half,20-Jan-25,20-Jan-25,-0.5,Doctor appointment`;

const parseDate = (dateStr: string): string | null => {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const cleanDate = dateStr.trim();
  
  // Try various date formats
  const formats = [
    'dd-MMM-yy',    // 15-Jan-25
    'dd/MM/yyyy',   // 15/01/2025
    'd/M/yyyy',     // 1/1/2025
    'yyyy-MM-dd',   // 2025-01-15
    'dd-MM-yyyy',   // 15-01-2025
    'MMM d, yyyy',  // Jan 15, 2025
  ];
  
  for (const fmt of formats) {
    try {
      const parsed = parse(cleanDate, fmt, new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch {
      // Try next format
    }
  }
  
  // Try ISO format as fallback
  try {
    const parsed = parseISO(cleanDate);
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd');
    }
  } catch {
    // Ignore
  }
  
  return null;
};

const parseHalfDayType = (dayType: string): 'full' | 'first_half' | 'second_half' => {
  const lower = dayType.toLowerCase().trim();
  if (lower.includes('first')) return 'first_half';
  if (lower.includes('second')) return 'second_half';
  return 'full';
};

export const BulkLeaveImportDialog = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [parsedRecords, setParsedRecords] = useState<ParsedLeaveRecord[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { currentOrg } = useOrganization();

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leave_history_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      setErrors(['CSV file must have at least a header row and one data row']);
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const records: ParsedLeaveRecord[] = [];
    const parseErrors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      const employeeName = values[headers.indexOf('employee name')] || '';
      const applyDate = values[headers.indexOf('apply date')] || '';
      const leaveType = values[headers.indexOf('leave type')] || '';
      const dayType = values[headers.indexOf('day type')] || 'Full Day';
      const startDate = values[headers.indexOf('start date')] || '';
      const endDate = values[headers.indexOf('end date')] || '';
      const leaveDay = parseFloat(values[headers.indexOf('leave day')] || '0');
      const reason = values[headers.indexOf('reason')] || '';

      if (!employeeName) {
        parseErrors.push(`Row ${i + 1}: Missing employee name`);
        continue;
      }

      if (!leaveType) {
        parseErrors.push(`Row ${i + 1}: Missing leave type`);
        continue;
      }

      // Determine if this is an opening balance (positive leave_day with no dates)
      const isOpeningBalance = leaveDay > 0 && !startDate && !endDate;

      records.push({
        employee_name: employeeName,
        apply_date: applyDate,
        leave_type: leaveType,
        day_type: dayType,
        start_date: startDate,
        end_date: endDate,
        leave_day: leaveDay,
        reason: reason,
        isOpeningBalance,
      });
    }

    if (parseErrors.length > 0) {
      setErrors(parseErrors);
    } else {
      setErrors([]);
    }

    setParsedRecords(records);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!currentOrg?.id) return;
    setLoading(true);
    const importResults: ImportResult[] = [];

    try {
      // Get all employees in the organization
      const { data: employees } = await supabase
        .from('employees')
        .select('id, profiles!inner(full_name)')
        .eq('organization_id', currentOrg.id);

      const employeeMap = new Map(
        employees?.map(e => [
          (e.profiles as any).full_name.toLowerCase(),
          e.id
        ]) || []
      );

      // BulkLeaveImportDialog no longer uses leave_types lookup
      // Leave requests are inserted with leave_type name only
      // The office_leave_type_id resolution happens during approval or via trigger

      // Process opening balances first - no longer supported
      const openingBalances = parsedRecords.filter(r => r.isOpeningBalance);
      const leaveRequests = parsedRecords.filter(r => !r.isOpeningBalance);

      // Report opening balances as not supported
      for (const record of openingBalances) {
        importResults.push({
          employee_name: record.employee_name,
          record_type: `Balance: ${record.leave_type} (${record.leave_day} days)`,
          success: false,
          error: 'Opening balance import not supported. Use Leave Balance Init instead.',
        });
      }

      // Import leave requests
      for (const record of leaveRequests) {
        const employeeId = employeeMap.get(record.employee_name.toLowerCase());
        if (!employeeId) {
          importResults.push({
            employee_name: record.employee_name,
            record_type: `Leave: ${record.leave_type}`,
            success: false,
            error: 'Employee not found',
          });
          continue;
        }

        const startDate = parseDate(record.start_date);
        const endDate = parseDate(record.end_date);

        if (!startDate || !endDate) {
          importResults.push({
            employee_name: record.employee_name,
            record_type: `Leave: ${record.leave_type}`,
            success: false,
            error: 'Invalid date format',
          });
          continue;
        }

        const { error } = await supabase
          .from('leave_requests')
          .insert({
            employee_id: employeeId,
            organization_id: currentOrg.id,
            leave_type: record.leave_type,
            start_date: startDate,
            end_date: endDate,
            days_count: Math.abs(record.leave_day),
            half_day_type: parseHalfDayType(record.day_type),
            reason: record.reason || '',
            status: 'approved',
            created_at: parseDate(record.apply_date) || new Date().toISOString(),
          });

        importResults.push({
          employee_name: record.employee_name,
          record_type: `Leave: ${record.leave_type} (${startDate} to ${endDate})`,
          success: !error,
          error: error?.message,
        });
      }

      setResults(importResults);
      setStep('results');

      const successCount = importResults.filter(r => r.success).length;
      const failCount = importResults.filter(r => !r.success).length;
      
      if (failCount === 0) {
        toast.success(`Successfully imported ${successCount} records`);
      } else if (successCount === 0) {
        toast.error(`Failed to import all ${failCount} records`);
      } else {
        toast.warning(`Imported ${successCount} records, ${failCount} failed`);
      }
    } catch (error: any) {
      toast.error('Import failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep('upload');
    setParsedRecords([]);
    setResults([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openingBalances = parsedRecords.filter(r => r.isOpeningBalance);
  const leaveRecords = parsedRecords.filter(r => !r.isOpeningBalance);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Upload className="h-4 w-4" />
          Import Leave History
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Leave History Import
          </DialogTitle>
          <DialogDescription>
            Import historical leave data including opening balances and approved leave requests
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <Label htmlFor="csv-file" className="cursor-pointer">
                <span className="text-primary font-medium">Click to upload</span>
                <span className="text-muted-foreground"> or drag and drop</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">CSV file only</p>
              <Input
                ref={fileInputRef}
                id="csv-file"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
              <div>
                <p className="font-medium text-sm">Download Template</p>
                <p className="text-xs text-muted-foreground">
                  Use this template to format your leave data correctly
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>

            <div className="text-sm space-y-2 text-muted-foreground">
              <p className="font-medium text-foreground">Format Instructions:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Opening Balances:</strong> Rows with positive Leave Day and no Start/End dates</li>
                <li><strong>Leave Taken:</strong> Rows with negative Leave Day and valid Start/End dates</li>
                <li><strong>Day Type:</strong> "Full Day", "First Half", or "Second Half"</li>
                <li><strong>Date Formats:</strong> dd/MM/yyyy, dd-MMM-yy (e.g., 15-Jan-25), or yyyy-MM-dd</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            {errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm font-medium text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Parsing Errors
                </p>
                <ul className="text-xs text-destructive mt-1 list-disc pl-4">
                  {errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                  {errors.length > 5 && <li>...and {errors.length - 5} more</li>}
                </ul>
              </div>
            )}

            {openingBalances.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  Opening Balances ({openingBalances.length})
                </p>
                <ScrollArea className="h-[120px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openingBalances.map((record, i) => (
                        <TableRow key={i}>
                          <TableCell>{record.employee_name}</TableCell>
                          <TableCell>{record.leave_type}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{record.leave_day} days</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {leaveRecords.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  Leave Requests ({leaveRecords.length})
                </p>
                <ScrollArea className="h-[200px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Day Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRecords.map((record, i) => (
                        <TableRow key={i}>
                          <TableCell>{record.employee_name}</TableCell>
                          <TableCell>{record.leave_type}</TableCell>
                          <TableCell className="text-xs">
                            {record.start_date} - {record.end_date}
                          </TableCell>
                          <TableCell>{Math.abs(record.leave_day)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {record.day_type}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {step === 'results' && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {results.filter(r => r.success).length} Successful
              </div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-destructive" />
                {results.filter(r => !r.success).length} Failed
              </div>
            </div>
            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {result.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell>{result.employee_name}</TableCell>
                      <TableCell className="text-xs">{result.record_type}</TableCell>
                      <TableCell className="text-xs text-destructive">
                        {result.error}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={loading || parsedRecords.length === 0}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import {parsedRecords.length} Records
              </Button>
            </>
          )}
          {step === 'results' && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
