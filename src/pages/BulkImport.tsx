import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertCircle, Loader2, Info, ArrowLeft, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ParsedEmployee {
  first_name: string;
  last_name: string;
  email: string;
  personal_email?: string;
  phone: string;
  department: string;
  position: string;
  join_date: string;
  date_of_birth: string;
  office_name: string;
  manager_email: string;
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

interface Office {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
}

interface EditingCell {
  rowIndex: number;
  field: string;
}

const CSV_TEMPLATE = `first_name (required),last_name (required),email (required),personal_email,phone (required),department (required),position (required),join_date (required),date_of_birth (required),office_name (required),manager_email (required),street (required),city (required),state (required),postcode,country (required),id_number,tax_number,remuneration,remuneration_currency,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,role
John,Doe,john.doe@company.com,john@personal.com,+1234567890,Engineering,Software Engineer,2024-01-15,1990-05-20,Head Office,manager@company.com,123 Main Street,New York,New York,10001,United States,ID123456,TAX789,75000,USD,Jane Doe,+0987654321,Spouse,user
Sarah,Smith,sarah.smith@company.com,sarah@gmail.com,+1987654321,Marketing,Marketing Manager,2024-02-01,1988-08-15,Head Office,manager@company.com,456 Oak Avenue,Los Angeles,California,90001,United States,ID789012,TAX456,85000,USD,Tom Smith,+1122334455,Spouse,hr`;

// Excel/Google Sheets style editable cell component
const EditableCell = ({ 
  value, 
  onSave, 
  isEditing, 
  onStartEdit,
  onNavigate,
  className = ""
}: { 
  value: string; 
  onSave: (value: string) => void; 
  isEditing: boolean;
  onStartEdit: () => void;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  className?: string;
}) => {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      onNavigate?.('down');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
      onNavigate?.(e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'Escape') {
      setEditValue(value);
      onSave(value);
    } else if (e.key === 'ArrowUp' && e.altKey) {
      e.preventDefault();
      handleSave();
      onNavigate?.('up');
    } else if (e.key === 'ArrowDown' && e.altKey) {
      e.preventDefault();
      handleSave();
      onNavigate?.('down');
    }
  };

  const handleDoubleClick = () => {
    if (!isEditing) {
      onStartEdit();
    }
  };

  const handleClick = () => {
    if (!isEditing) {
      onStartEdit();
    }
  };

  return (
    <div 
      ref={cellRef}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`
        relative w-full h-full min-h-[28px] flex items-center
        ${isEditing 
          ? 'ring-2 ring-primary ring-inset bg-background z-10' 
          : 'cursor-cell hover:bg-primary/5 border border-transparent hover:border-primary/20'
        }
        ${className}
      `}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full h-full px-1.5 py-1 text-xs bg-transparent outline-none border-none"
          style={{ minWidth: '60px' }}
        />
      ) : (
        <span className="px-1.5 py-1 text-xs truncate w-full">
          {value || <span className="text-muted-foreground/50 italic">-</span>}
        </span>
      )}
    </div>
  );
};

const BulkImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedEmployee[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [offices, setOffices] = useState<Office[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();

  // Field order for keyboard navigation
  const fieldOrder = [
    'first_name', 'last_name', 'email', 'phone', 'department', 'position',
    'join_date', 'date_of_birth', 'office_name', 'manager_email', 'street',
    'city', 'state', 'postcode', 'country', 'role'
  ];

  const navigateCell = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!editingCell) return;
    
    const { rowIndex, field } = editingCell;
    const fieldIndex = fieldOrder.indexOf(field);
    
    let newRowIndex = rowIndex;
    let newFieldIndex = fieldIndex;
    
    switch (direction) {
      case 'up':
        newRowIndex = Math.max(0, rowIndex - 1);
        break;
      case 'down':
        newRowIndex = Math.min(parsedData.length - 1, rowIndex + 1);
        break;
      case 'left':
        if (fieldIndex > 0) {
          newFieldIndex = fieldIndex - 1;
        } else if (rowIndex > 0) {
          newRowIndex = rowIndex - 1;
          newFieldIndex = fieldOrder.length - 1;
        }
        break;
      case 'right':
        if (fieldIndex < fieldOrder.length - 1) {
          newFieldIndex = fieldIndex + 1;
        } else if (rowIndex < parsedData.length - 1) {
          newRowIndex = rowIndex + 1;
          newFieldIndex = 0;
        }
        break;
    }
    
    setEditingCell({ rowIndex: newRowIndex, field: fieldOrder[newFieldIndex] });
  };

  const updateCellValue = (rowIndex: number, field: string, value: string) => {
    setParsedData(prev => {
      const updated = [...prev];
      (updated[rowIndex] as any)[field] = value;
      return updated;
    });
    // Re-validate after update
    const errors = validateData(parsedData.map((emp, i) => 
      i === rowIndex ? { ...emp, [field]: value } : emp
    ));
    setValidationErrors(errors);
  };

  const deleteRow = (rowIndex: number) => {
    const updated = parsedData.filter((_, i) => i !== rowIndex);
    setParsedData(updated);
    setEditingCell(null);
    setValidationErrors(validateData(updated));
  };

  useEffect(() => {
    if (currentOrg) {
      loadOffices();
      loadTeamMembers();
    }
  }, [currentOrg?.id]);

  const loadOffices = async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from('offices')
      .select('id, name')
      .eq('organization_id', currentOrg.id)
      .order('name');
    if (data) setOffices(data);
  };

  const loadTeamMembers = async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from('employees')
      .select(`id, profiles!inner(email, full_name)`)
      .eq('organization_id', currentOrg.id);
    if (data) {
      setTeamMembers(data.map((d: any) => ({
        id: d.id,
        email: d.profiles.email,
        full_name: d.profiles.full_name
      })));
    }
  };

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

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s*\(required\)\s*/gi, '').replace(/\s+/g, '_'));
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
    const officeNames = offices.map(o => o.name.toLowerCase());
    const managerEmails = teamMembers.map(m => m.email.toLowerCase());

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
      if (!emp.phone?.trim()) {
        errors.push(`Row ${row}: Phone is required`);
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
      if (!emp.date_of_birth?.trim()) {
        errors.push(`Row ${row}: Date of birth is required`);
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(emp.date_of_birth)) {
        errors.push(`Row ${row}: Date of birth must be in YYYY-MM-DD format`);
      }
      if (!emp.office_name?.trim()) {
        errors.push(`Row ${row}: Office name is required`);
      } else if (!officeNames.includes(emp.office_name.toLowerCase())) {
        errors.push(`Row ${row}: Office "${emp.office_name}" not found. Available: ${offices.map(o => o.name).join(', ')}`);
      }
      if (!emp.manager_email?.trim()) {
        errors.push(`Row ${row}: Manager email is required`);
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emp.manager_email)) {
        errors.push(`Row ${row}: Invalid manager email format`);
      } else if (!managerEmails.includes(emp.manager_email.toLowerCase())) {
        errors.push(`Row ${row}: Manager "${emp.manager_email}" not found in team`);
      }
      if (!emp.street?.trim()) {
        errors.push(`Row ${row}: Street is required`);
      }
      if (!emp.city?.trim()) {
        errors.push(`Row ${row}: City is required`);
      }
      if (!emp.state?.trim()) {
        errors.push(`Row ${row}: State is required`);
      }
      if (!emp.country?.trim()) {
        errors.push(`Row ${row}: Country is required`);
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
    <Layout>
      <div className="space-y-6">
        <PageHeader 
          title="Bulk Import Employees" 
          subtitle="Upload a CSV file to import multiple employees at once"
        >
          <Button variant="outline" onClick={() => navigate('/team')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Team
          </Button>
        </PageHeader>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 'upload' && 'Upload CSV File'}
              {step === 'preview' && 'Preview Import Data'}
              {step === 'results' && 'Import Results'}
            </CardTitle>
            <CardDescription>
              {step === 'upload' && 'Leave balances will be allocated automatically based on your organization settings.'}
              {step === 'preview' && 'Review the data before importing. Fix any validation errors in your CSV file.'}
              {step === 'results' && 'Review the import results below.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'upload' && (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground">CSV file only (max 5MB, 1000 rows)</p>
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

                <Collapsible defaultOpen>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                      <Info className="h-4 w-4" />
                      <span className="text-sm">View required fields & available options</span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <div className="text-xs space-y-3 p-4 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground mb-1">Required Fields:</p>
                        <p className="text-muted-foreground">first_name, last_name, email, phone, department, position, join_date, date_of_birth, office_name, manager_email, street, city, state, country</p>
                      </div>
                      
                      <div>
                        <p className="font-medium text-foreground mb-1">Available Offices:</p>
                        {offices.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {offices.map(office => (
                              <Badge key={office.id} variant="secondary" className="text-xs">{office.name}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground italic">No offices configured</p>
                        )}
                      </div>

                      <div>
                        <p className="font-medium text-foreground mb-1">Available Managers (use email):</p>
                        {teamMembers.length > 0 ? (
                          <ScrollArea className="h-24">
                            <div className="space-y-1">
                              {teamMembers.map(member => (
                                <div key={member.id} className="text-muted-foreground">
                                  {member.full_name} — <span className="font-mono text-xs">{member.email}</span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <p className="text-muted-foreground italic">No team members yet</p>
                        )}
                      </div>

                      <div>
                        <p className="font-medium text-foreground mb-1">Role Options:</p>
                        <div className="flex gap-1">
                          <Badge variant="secondary" className="text-xs">admin</Badge>
                          <Badge variant="secondary" className="text-xs">hr</Badge>
                          <Badge variant="secondary" className="text-xs">user</Badge>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-4">
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
                      <span className="text-sm font-medium">Validation Errors ({validationErrors.length})</span>
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

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    <span>Required</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30"></span>
                    <span>Optional</span>
                  </div>
                </div>

                <ScrollArea className="h-[400px] border rounded-lg bg-background">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-max border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-muted">
                          <th className="w-10 px-2 py-2 font-medium border border-border/50 bg-muted text-center text-muted-foreground">#</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">First Name *</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">Last Name *</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">Email *</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">Phone *</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">Department *</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">Position *</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">Join Date *</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">DOB *</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">Office *</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">Manager *</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">Street *</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">City *</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">State *</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">Postcode</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">Country *</th>
                          <th className="text-left px-2 py-2 font-medium border border-border/50 bg-muted whitespace-nowrap">Role</th>
                          <th className="w-10 px-2 py-2 font-medium border border-border/50 bg-muted"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.map((emp, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-2 py-1.5 border border-border/50 text-center text-muted-foreground text-xs bg-muted/30">{i + 1}</td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.first_name}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'first_name'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'first_name' })}
                                onSave={(v) => updateCellValue(i, 'first_name', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.last_name}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'last_name'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'last_name' })}
                                onSave={(v) => updateCellValue(i, 'last_name', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.email}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'email'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'email' })}
                                onSave={(v) => updateCellValue(i, 'email', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.phone}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'phone'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'phone' })}
                                onSave={(v) => updateCellValue(i, 'phone', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.department}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'department'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'department' })}
                                onSave={(v) => updateCellValue(i, 'department', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.position}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'position'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'position' })}
                                onSave={(v) => updateCellValue(i, 'position', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.join_date}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'join_date'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'join_date' })}
                                onSave={(v) => updateCellValue(i, 'join_date', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.date_of_birth}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'date_of_birth'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'date_of_birth' })}
                                onSave={(v) => updateCellValue(i, 'date_of_birth', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.office_name}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'office_name'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'office_name' })}
                                onSave={(v) => updateCellValue(i, 'office_name', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.manager_email}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'manager_email'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'manager_email' })}
                                onSave={(v) => updateCellValue(i, 'manager_email', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.street || ''}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'street'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'street' })}
                                onSave={(v) => updateCellValue(i, 'street', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.city || ''}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'city'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'city' })}
                                onSave={(v) => updateCellValue(i, 'city', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.state || ''}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'state'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'state' })}
                                onSave={(v) => updateCellValue(i, 'state', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.postcode || ''}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'postcode'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'postcode' })}
                                onSave={(v) => updateCellValue(i, 'postcode', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.country || ''}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'country'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'country' })}
                                onSave={(v) => updateCellValue(i, 'country', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50">
                              <EditableCell
                                value={emp.role || 'user'}
                                isEditing={editingCell?.rowIndex === i && editingCell?.field === 'role'}
                                onStartEdit={() => setEditingCell({ rowIndex: i, field: 'role' })}
                                onSave={(v) => updateCellValue(i, 'role', v)}
                                onNavigate={navigateCell}
                              />
                            </td>
                            <td className="p-0 border border-border/50 text-center">
                              <button
                                onClick={() => deleteRow(i)}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                title="Remove row"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
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
              <div className="space-y-4">
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

                <ScrollArea className="h-[400px] border rounded-lg">
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

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={resetState}>Import More</Button>
                  <Button onClick={() => navigate('/team')}>Done</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default BulkImport;
