import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedEmployee {
  first_name: string;
  last_name: string;
  email: string;
  personal_email?: string;
  phone?: string;
  department: string;
  position: string;
  join_date: string;
  date_of_birth?: string;
  office_name?: string;
  manager_email?: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  id_number?: string;
  tax_number?: string;
  remuneration?: string;
  remuneration_currency?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  role?: string;
}

interface ImportResult {
  email: string;
  name: string;
  success: boolean;
  error?: string;
  invitationSent?: boolean;
}

const CSV_TEMPLATE = `first_name,last_name,email,personal_email,phone,department,position,join_date,date_of_birth,office_name,manager_email,street,city,state,postcode,country,id_number,tax_number,remuneration,remuneration_currency,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,role
John,Doe,john.doe@company.com,john@personal.com,+1234567890,Engineering,Software Engineer,2024-01-15,1990-05-20,New York Office,manager@company.com,123 Main St,New York,NY,10001,United States,ID123456,TAX789,75000,USD,Jane Doe,+0987654321,Spouse,user
Jane,Smith,jane.smith@company.com,,+1234567891,Marketing,Marketing Manager,2024-02-01,,London Office,,456 High St,London,,SW1A 1AA,United Kingdom,,,85000,GBP,,,admin`;

export function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedEmployee[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { currentOrg } = useOrganization();

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setImportResults([]);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ParsedEmployee[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const employees: ParsedEmployee[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const employee: any = {};
      
      headers.forEach((header, index) => {
        employee[header] = values[index]?.trim() || '';
      });

      employees.push(employee as ParsedEmployee);
    }

    return employees;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const validateData = (data: ParsedEmployee[]): string[] => {
    const errors: string[] = [];
    const emails = new Set<string>();

    data.forEach((emp, index) => {
      const row = index + 2;

      if (!emp.first_name?.trim()) {
        errors.push(`Row ${row}: First name is required`);
      }
      if (!emp.last_name?.trim()) {
        errors.push(`Row ${row}: Last name is required`);
      }
      if (!emp.email?.trim()) {
        errors.push(`Row ${row}: Email is required`);
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emp.email)) {
        errors.push(`Row ${row}: Invalid email format`);
      } else if (emails.has(emp.email.toLowerCase())) {
        errors.push(`Row ${row}: Duplicate email ${emp.email}`);
      } else {
        emails.add(emp.email.toLowerCase());
      }
      if (!emp.department?.trim()) {
        errors.push(`Row ${row}: Department is required`);
      }
      if (!emp.position?.trim()) {
        errors.push(`Row ${row}: Position is required`);
      }
      if (!emp.join_date?.trim()) {
        errors.push(`Row ${row}: Join date is required`);
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(emp.join_date)) {
        errors.push(`Row ${row}: Join date must be in YYYY-MM-DD format`);
      }
      if (emp.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(emp.date_of_birth)) {
        errors.push(`Row ${row}: Date of birth must be in YYYY-MM-DD format`);
      }
      if (emp.manager_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emp.manager_email)) {
        errors.push(`Row ${row}: Invalid manager email format`);
      }
      if (emp.role && !['admin', 'hr', 'user'].includes(emp.role.toLowerCase())) {
        errors.push(`Row ${row}: Role must be admin, hr, or user`);
      }
    });

    return errors;
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_ROWS = 1000;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    // Security: Check file size to prevent memory exhaustion
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    
    const text = await selectedFile.text();
    const parsed = parseCSV(text);

    // Security: Limit number of rows to prevent DoS
    if (parsed.length > MAX_ROWS) {
      toast({
        title: "Too many rows",
        description: `Maximum ${MAX_ROWS} employees per import. Your file has ${parsed.length} rows.`,
        variant: "destructive",
      });
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const errors = validateData(parsed);

    setParsedData(parsed);
    setValidationErrors(errors);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!currentOrg || parsedData.length === 0) return;

    setImporting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to import employees",
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('bulk-import-employees', {
        body: {
          employees: parsedData,
          organizationId: currentOrg.id
        }
      });

      if (error) {
        toast({
          title: "Import failed",
          description: error.message,
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      setImportResults(data.results || []);
      setStep('results');

      const successCount = (data.results || []).filter((r: ImportResult) => r.success).length;
      if (successCount > 0) {
        toast({
          title: "Import completed",
          description: `Successfully imported ${successCount} of ${data.results?.length || 0} employees`,
        });
        onSuccess?.();
      }
    } catch (err: any) {
      toast({
        title: "Import failed",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
    }

    setImporting(false);
  };

  const successCount = importResults.filter(r => r.success).length;
  const failCount = importResults.filter(r => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Employees</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple employees at once. Leave balances will be allocated automatically.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground">CSV file only</p>
                </div>
              </Label>
              <Input
                id="csv-upload"
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Need a template?</p>
                <p className="text-xs text-muted-foreground">Download our CSV template with all supported fields</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{file?.name}</p>
                <p className="text-xs text-muted-foreground">{parsedData.length} employees found</p>
              </div>
              <Button variant="outline" size="sm" onClick={resetState}>
                Change File
              </Button>
            </div>

            {validationErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Validation Errors</span>
                </div>
                <ScrollArea className="h-32">
                  <ul className="text-xs text-destructive space-y-1">
                    {validationErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Position</th>
                      <th className="text-left p-2">Department</th>
                      <th className="text-left p-2">Join Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((emp, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2">{emp.first_name} {emp.last_name}</td>
                        <td className="p-2">{emp.email}</td>
                        <td className="p-2">{emp.position}</td>
                        <td className="p-2">{emp.department}</td>
                        <td className="p-2">{emp.join_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={resetState}>Cancel</Button>
              <Button 
                onClick={handleImport} 
                disabled={validationErrors.length > 0 || importing}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>Import {parsedData.length} Employees</>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex gap-4">
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {successCount} Successful
              </Badge>
              {failCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <XCircle className="h-3 w-3 text-destructive" />
                  {failCount} Failed
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-4 space-y-2">
                {importResults.map((result, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      result.success ? 'bg-green-500/10' : 'bg-destructive/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{result.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.email}
                          {result.success && result.invitationSent && (
                            <span className="ml-2 text-green-600">· Invitation sent</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {result.error && (
                      <p className="text-xs text-destructive">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end">
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
