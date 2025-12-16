import { useState, useRef, useEffect } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertCircle, Loader2, Info, ArrowLeft, Trash2, Check, ChevronsUpDown, CalendarIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parse, isValid, parseISO } from "date-fns";

interface ParsedLeaveRecord {
  employee_email: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  day_type: string;
  effective_date: string;
  reason: string;
  status: string;
  isOpeningBalance: boolean;
}

interface ImportResult {
  employee_email: string;
  record_type: string;
  success: boolean;
  error?: string;
}

interface Employee {
  id: string;
  email: string;
  full_name: string;
}

interface LeaveType {
  id: string;
  name: string;
}

interface EditingCell {
  rowIndex: number;
  field: string;
}

const CSV_TEMPLATE = `Employee Email,Leave Type,Start Date,End Date,Days,Day Type,Effective Date,Reason,Status
john.doe@company.com,Annual Leave,,,18,Full Day,2025-01-01,Opening Balance 2025,
john.doe@company.com,Sick Leave,,,5,Full Day,2025-01-01,Opening Balance 2025,
john.doe@company.com,Annual Leave,2025-01-15,2025-01-17,-3,Full Day,,Team offsite,approved
jane.smith@company.com,Annual Leave,,,20,Full Day,2025-01-01,Opening Balance 2025,
jane.smith@company.com,Sick Leave,2025-02-10,2025-02-10,-0.5,First Half,,Doctor appointment,approved`;

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
  const lower = (dayType || '').toLowerCase().trim();
  if (lower.includes('first')) return 'first_half';
  if (lower.includes('second')) return 'second_half';
  return 'full';
};

// Editable cell component
const EditableCell = ({ 
  value, 
  onSave, 
  isEditing, 
  onStartEdit,
  className = "",
  error
}: { 
  value: string; 
  onSave: (value: string) => void; 
  isEditing: boolean;
  onStartEdit: () => void;
  className?: string;
  error?: string;
}) => {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      onSave(value);
    }
  };

  const cellContent = (
    <div 
      onClick={onStartEdit}
      className={`
        relative w-full h-full min-h-[28px] flex items-center
        ${isEditing 
          ? 'ring-2 ring-primary ring-inset bg-background z-10' 
          : error 
            ? 'cursor-cell hover:bg-destructive/10' 
            : 'cursor-cell hover:bg-primary/5 border border-transparent hover:border-primary/20'
        }
        ${error ? 'text-destructive' : ''}
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
          className={`w-full h-full px-1.5 py-1 text-xs bg-transparent outline-none border-none ${error ? 'text-destructive' : ''}`}
        />
      ) : (
        <span className={`px-1.5 py-1 text-xs truncate w-full ${error ? 'text-destructive' : ''}`}>
          {value || <span className="text-muted-foreground/50 italic">-</span>}
        </span>
      )}
    </div>
  );

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-destructive text-destructive-foreground">
            <p className="text-xs">{error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cellContent;
};

// Searchable select cell
const SearchableSelectCell = ({ 
  value, 
  options,
  onSave,
  placeholder = "Select...",
  error
}: { 
  value: string; 
  options: { value: string; label: string }[];
  onSave: (value: string) => void;
  placeholder?: string;
  error?: string;
}) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value.toLowerCase() === value.toLowerCase());

  const selectContent = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          className={cn(
            "flex h-7 w-full items-center justify-between px-2 text-xs bg-transparent hover:bg-primary/5 transition-colors",
            error ? "text-destructive" : ""
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : value ? value : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 z-50 bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Search..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onSave(opt.value);
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  <Check className={cn("mr-2 h-3 w-3", value.toLowerCase() === opt.value.toLowerCase() ? "opacity-100" : "opacity-0")} />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild><div className="w-full">{selectContent}</div></TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-destructive text-destructive-foreground">
            <p className="text-xs">{error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return selectContent;
};

// Date picker cell
const DatePickerCell = ({ 
  value, 
  onSave,
  placeholder = "Select date",
  error
}: { 
  value: string; 
  onSave: (value: string) => void;
  placeholder?: string;
  error?: string;
}) => {
  const [open, setOpen] = useState(false);
  
  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const isValidDate = selectedDate && isValid(selectedDate);
  
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onSave(format(date, 'yyyy-MM-dd'));
    } else {
      onSave('');
    }
    setOpen(false);
  };

  const selectContent = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn(
          "flex h-7 w-full items-center justify-between px-2 text-xs bg-transparent hover:bg-primary/5 transition-colors",
          error ? "text-destructive" : ""
        )}>
          <span className="truncate">
            {isValidDate ? format(selectedDate!, 'd MMM yyyy') : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <CalendarIcon className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
        <Calendar
          mode="single"
          selected={isValidDate ? selectedDate : undefined}
          onSelect={handleSelect}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild><div className="w-full">{selectContent}</div></TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-destructive text-destructive-foreground">
            <p className="text-xs">{error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return selectContent;
};

// Select cell for simple dropdowns
const SelectCell = ({ 
  value, 
  options,
  onSave,
  placeholder = "Select...",
  error
}: { 
  value: string; 
  options: { value: string; label: string }[];
  onSave: (value: string) => void;
  placeholder?: string;
  error?: string;
}) => {
  const selectContent = (
    <Select value={value} onValueChange={onSave}>
      <SelectTrigger className={cn("h-7 text-xs border-0 rounded-none focus:ring-2 focus:ring-primary focus:ring-inset bg-transparent", error && "text-destructive")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-popover z-50">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild><div>{selectContent}</div></TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs bg-destructive text-destructive-foreground">
            <p className="text-xs">{error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return selectContent;
};

const BulkLeaveImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedLeaveRecord[]>([]);
  const [validationErrors, setValidationErrors] = useState<Map<string, string>>(new Map());
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { currentOrg } = useOrganization();
  const { navigateOrg } = useOrgNavigation();

  useEffect(() => {
    if (currentOrg?.id) {
      loadReferenceData();
    }
  }, [currentOrg?.id]);

  const loadReferenceData = async () => {
    if (!currentOrg?.id) return;

    // Get current employee id for created_by field
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: currentEmp } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (currentEmp) {
        setCurrentEmployeeId(currentEmp.id);
      }
    }

    // Load employees with profiles
    const { data: empData } = await supabase
      .from('employees')
      .select('id, profiles!inner(email, full_name)')
      .eq('organization_id', currentOrg.id)
      .eq('status', 'active');

    if (empData) {
      setEmployees(empData.map((e: any) => ({
        id: e.id,
        email: e.profiles.email,
        full_name: e.profiles.full_name
      })));
    }

    // Load leave types
    const { data: ltData } = await supabase
      .from('leave_types')
      .select('id, name')
      .eq('organization_id', currentOrg.id)
      .eq('is_active', true);

    if (ltData) {
      setLeaveTypes(ltData);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leave_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(selectedFile);
  };

  // Proper CSV line parser that handles multi-word values and empty fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim()); // Push last value
    
    return result;
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast({ title: "Invalid CSV", description: "File must have a header row and at least one data row", variant: "destructive" });
      return;
    }

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, '_'));
    const records: ParsedLeaveRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      const getValue = (field: string) => {
        const idx = headers.findIndex(h => h.includes(field.replace(/[^a-z_]/g, '_')));
        return idx >= 0 ? (values[idx] || '') : '';
      };

      const employeeEmail = getValue('employee_email') || getValue('email');
      const leaveType = getValue('leave_type');
      const startDate = getValue('start_date');
      const endDate = getValue('end_date');
      const days = parseFloat(getValue('days')) || 0;
      const dayType = getValue('day_type') || 'Full Day';
      const effectiveDate = getValue('effective_date');
      const reason = getValue('reason');
      const status = getValue('status') || 'approved';

      if (!employeeEmail) continue;

      // Auto-detect: Opening balance if days > 0 and no start/end dates
      const isOpeningBalance = days > 0 && !startDate && !endDate;

      records.push({
        employee_email: employeeEmail,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days,
        day_type: dayType,
        effective_date: effectiveDate,
        reason,
        status,
        isOpeningBalance
      });
    }

    setParsedData(records);
    validateData(records);
    setStep('preview');
  };

  const validateData = (records: ParsedLeaveRecord[]) => {
    const errors = new Map<string, string>();
    const employeeEmails = new Set(employees.map(e => e.email.toLowerCase()));
    const leaveTypeNames = new Set(leaveTypes.map(lt => lt.name.toLowerCase()));

    records.forEach((record, idx) => {
      // Validate employee email
      if (!record.employee_email) {
        errors.set(`${idx}-employee_email`, 'Email is required');
      } else if (!employeeEmails.has(record.employee_email.toLowerCase())) {
        errors.set(`${idx}-employee_email`, 'Employee not found');
      }

      // Validate leave type
      if (!record.leave_type) {
        errors.set(`${idx}-leave_type`, 'Leave type is required');
      } else if (!leaveTypeNames.has(record.leave_type.toLowerCase())) {
        errors.set(`${idx}-leave_type`, 'Leave type not found');
      }

      // Validate days
      if (record.days === 0) {
        errors.set(`${idx}-days`, 'Days cannot be zero');
      }

      // For leave requests (negative days), require dates
      if (!record.isOpeningBalance) {
        if (!record.start_date) {
          errors.set(`${idx}-start_date`, 'Start date required for leave taken');
        } else {
          const parsed = parseDate(record.start_date);
          if (!parsed) errors.set(`${idx}-start_date`, 'Invalid date format');
        }
        if (!record.end_date) {
          errors.set(`${idx}-end_date`, 'End date required for leave taken');
        } else {
          const parsed = parseDate(record.end_date);
          if (!parsed) errors.set(`${idx}-end_date`, 'Invalid date format');
        }
      }
    });

    setValidationErrors(errors);
  };

  const updateRecord = (index: number, field: keyof ParsedLeaveRecord, value: string | number) => {
    const newData = [...parsedData];
    (newData[index] as any)[field] = value;
    
    // Re-detect opening balance
    if (field === 'days' || field === 'start_date' || field === 'end_date') {
      const days = typeof value === 'number' ? value : parseFloat(String(newData[index].days)) || 0;
      newData[index].isOpeningBalance = days > 0 && !newData[index].start_date && !newData[index].end_date;
    }
    
    setParsedData(newData);
    validateData(newData);
    setEditingCell(null);
  };

  const deleteRow = (index: number) => {
    const newData = parsedData.filter((_, i) => i !== index);
    setParsedData(newData);
    validateData(newData);
  };

  const handleImport = async () => {
    if (!currentOrg?.id || validationErrors.size > 0) return;
    
    setImporting(true);
    const results: ImportResult[] = [];

    try {
      const employeeMap = new Map(employees.map(e => [e.email.toLowerCase(), e.id]));
      const leaveTypeMap = new Map(leaveTypes.map(lt => [lt.name.toLowerCase(), lt.id]));

      // Separate opening balances and leave requests
      const openingBalances = parsedData.filter(r => r.isOpeningBalance);
      const leaveRequests = parsedData.filter(r => !r.isOpeningBalance);

      // Import opening balances (to leave_balance_logs)
      for (const record of openingBalances) {
        const employeeId = employeeMap.get(record.employee_email.toLowerCase());
        const leaveTypeId = leaveTypeMap.get(record.leave_type.toLowerCase());
        
        if (!employeeId || !leaveTypeId) {
          results.push({
            employee_email: record.employee_email,
            record_type: `Balance: ${record.leave_type}`,
            success: false,
            error: !employeeId ? 'Employee not found' : 'Leave type not found'
          });
          continue;
        }

        const { error } = await supabase
          .from('leave_balance_logs')
          .insert({
            employee_id: employeeId,
            organization_id: currentOrg.id,
            created_by: currentEmployeeId || employeeId,
            leave_type: record.leave_type,
            change_amount: record.days,
            previous_balance: 0,
            new_balance: record.days,
            reason: record.reason || 'Opening Balance',
            effective_date: record.effective_date ? parseDate(record.effective_date) : format(new Date(), 'yyyy-MM-dd')
          });

        results.push({
          employee_email: record.employee_email,
          record_type: `Balance: ${record.leave_type} (+${record.days} days)`,
          success: !error,
          error: error?.message
        });
      }

      // Import leave requests
      for (const record of leaveRequests) {
        const employeeId = employeeMap.get(record.employee_email.toLowerCase());
        
        if (!employeeId) {
          results.push({
            employee_email: record.employee_email,
            record_type: `Leave: ${record.leave_type}`,
            success: false,
            error: 'Employee not found'
          });
          continue;
        }

        const startDate = parseDate(record.start_date);
        const endDate = parseDate(record.end_date);

        if (!startDate || !endDate) {
          results.push({
            employee_email: record.employee_email,
            record_type: `Leave: ${record.leave_type}`,
            success: false,
            error: 'Invalid date format'
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
            days_count: Math.abs(record.days),
            half_day_type: parseHalfDayType(record.day_type),
            reason: record.reason || '',
            status: record.status || 'approved'
          });

        results.push({
          employee_email: record.employee_email,
          record_type: `Leave: ${record.leave_type} (${startDate} to ${endDate})`,
          success: !error,
          error: error?.message
        });
      }

      setImportResults(results);
      setStep('results');

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (failCount === 0) {
        toast({ title: "Import successful", description: `Successfully imported ${successCount} records` });
      } else if (successCount === 0) {
        toast({ title: "Import failed", description: `Failed to import all ${failCount} records`, variant: "destructive" });
      } else {
        toast({ title: "Import completed", description: `Imported ${successCount} records, ${failCount} failed` });
      }
    } catch (error: any) {
      toast({ title: "Import error", description: error.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setValidationErrors(new Map());
    setImportResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const employeeOptions = employees.map(e => ({ value: e.email, label: `${e.full_name} (${e.email})` }));
  const leaveTypeOptions = leaveTypes.map(lt => ({ value: lt.name, label: lt.name }));
  const dayTypeOptions = [
    { value: 'Full Day', label: 'Full Day' },
    { value: 'First Half', label: 'First Half' },
    { value: 'Second Half', label: 'Second Half' }
  ];
  const statusOptions = [
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const openingBalances = parsedData.filter(r => r.isOpeningBalance);
  const leaveRecords = parsedData.filter(r => !r.isOpeningBalance);
  const hasErrors = validationErrors.size > 0;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Import Leave History"
        subtitle="Import leave balances and historical leave records"
      >
        <Button variant="outline" onClick={() => navigateOrg('/leave-history')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Leave History
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {step === 'upload' && 'Upload CSV File'}
            {step === 'preview' && 'Review & Edit Import Data'}
            {step === 'results' && 'Import Results'}
          </CardTitle>
          <CardDescription>
            {step === 'upload' && 'Upload a CSV file with leave data. Opening balances and leave taken will be auto-detected.'}
            {step === 'preview' && `${parsedData.length} records found. ${openingBalances.length} opening balances, ${leaveRecords.length} leave requests.`}
            {step === 'results' && `Import completed with ${importResults.filter(r => r.success).length} successes and ${importResults.filter(r => !r.success).length} failures.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'upload' && (
            <>
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
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

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
                    <Info className="h-4 w-4" />
                    Format Instructions
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-4 bg-muted/30 rounded-lg text-sm space-y-2">
                  <p className="font-medium">Unified CSV Format:</p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li><strong>Opening Balances:</strong> Positive Days value, empty Start/End dates</li>
                    <li><strong>Leave Taken:</strong> Negative Days value, valid Start/End dates</li>
                    <li><strong>Day Type:</strong> "Full Day", "First Half", or "Second Half"</li>
                    <li><strong>Status:</strong> "approved" (default), "pending", or "rejected"</li>
                    <li><strong>Date Formats:</strong> yyyy-MM-dd, dd/MM/yyyy, or dd-MMM-yy</li>
                  </ul>
                  <div className="mt-3 pt-3 border-t">
                    <p className="font-medium">Available Employees ({employees.length}):</p>
                    <p className="text-xs text-muted-foreground">{employees.map(e => e.email).join(', ') || 'None'}</p>
                  </div>
                  <div className="mt-2">
                    <p className="font-medium">Leave Types ({leaveTypes.length}):</p>
                    <p className="text-xs text-muted-foreground">{leaveTypes.map(lt => lt.name).join(', ') || 'None'}</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {step === 'preview' && (
            <>
              {hasErrors && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {validationErrors.size} validation {validationErrors.size === 1 ? 'error' : 'errors'} - fix before importing
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{openingBalances.length} Opening Balances</Badge>
                <Badge variant="outline">{leaveRecords.length} Leave Requests</Badge>
              </div>

              <ScrollArea className="h-[400px] border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted z-10">
                    <tr>
                      <th className="p-2 text-left font-medium">Type</th>
                      <th className="p-2 text-left font-medium min-w-[180px]">Employee Email</th>
                      <th className="p-2 text-left font-medium min-w-[120px]">Leave Type</th>
                      <th className="p-2 text-left font-medium w-[100px]">Start Date</th>
                      <th className="p-2 text-left font-medium w-[100px]">End Date</th>
                      <th className="p-2 text-left font-medium w-[70px]">Days</th>
                      <th className="p-2 text-left font-medium w-[100px]">Day Type</th>
                      <th className="p-2 text-left font-medium w-[100px]">Effective</th>
                      <th className="p-2 text-left font-medium min-w-[120px]">Reason</th>
                      <th className="p-2 text-left font-medium w-[90px]">Status</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((record, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/30">
                        <td className="p-1">
                          <Badge variant={record.isOpeningBalance ? "secondary" : "outline"} className="text-[10px]">
                            {record.isOpeningBalance ? 'Balance' : 'Leave'}
                          </Badge>
                        </td>
                        <td className="p-1">
                          <SearchableSelectCell
                            value={record.employee_email}
                            options={employeeOptions}
                            onSave={(v) => updateRecord(idx, 'employee_email', v)}
                            placeholder="Select employee"
                            error={validationErrors.get(`${idx}-employee_email`)}
                          />
                        </td>
                        <td className="p-1">
                          <SearchableSelectCell
                            value={record.leave_type}
                            options={leaveTypeOptions}
                            onSave={(v) => updateRecord(idx, 'leave_type', v)}
                            placeholder="Select type"
                            error={validationErrors.get(`${idx}-leave_type`)}
                          />
                        </td>
                        <td className="p-1">
                          <DatePickerCell
                            value={record.start_date}
                            onSave={(v) => updateRecord(idx, 'start_date', v)}
                            placeholder="-"
                            error={validationErrors.get(`${idx}-start_date`)}
                          />
                        </td>
                        <td className="p-1">
                          <DatePickerCell
                            value={record.end_date}
                            onSave={(v) => updateRecord(idx, 'end_date', v)}
                            placeholder="-"
                            error={validationErrors.get(`${idx}-end_date`)}
                          />
                        </td>
                        <td className="p-1">
                          <EditableCell
                            value={String(record.days)}
                            onSave={(v) => updateRecord(idx, 'days', parseFloat(v) || 0)}
                            isEditing={editingCell?.rowIndex === idx && editingCell?.field === 'days'}
                            onStartEdit={() => setEditingCell({ rowIndex: idx, field: 'days' })}
                            error={validationErrors.get(`${idx}-days`)}
                          />
                        </td>
                        <td className="p-1">
                          <SelectCell
                            value={record.day_type}
                            options={dayTypeOptions}
                            onSave={(v) => updateRecord(idx, 'day_type', v)}
                          />
                        </td>
                        <td className="p-1">
                          <DatePickerCell
                            value={record.effective_date}
                            onSave={(v) => updateRecord(idx, 'effective_date', v)}
                            placeholder="-"
                          />
                        </td>
                        <td className="p-1">
                          <EditableCell
                            value={record.reason}
                            onSave={(v) => updateRecord(idx, 'reason', v)}
                            isEditing={editingCell?.rowIndex === idx && editingCell?.field === 'reason'}
                            onStartEdit={() => setEditingCell({ rowIndex: idx, field: 'reason' })}
                          />
                        </td>
                        <td className="p-1">
                          {!record.isOpeningBalance && (
                            <SelectCell
                              value={record.status}
                              options={statusOptions}
                              onSave={(v) => updateRecord(idx, 'status', v)}
                            />
                          )}
                        </td>
                        <td className="p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => deleteRow(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={resetImport}>
                  Start Over
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={importing || hasErrors || parsedData.length === 0}
                  className="gap-2"
                >
                  {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Import {parsedData.length} Records
                </Button>
              </div>
            </>
          )}

          {step === 'results' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold text-green-700">
                        {importResults.filter(r => r.success).length}
                      </div>
                      <div className="text-sm text-green-600">Successful</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-red-600" />
                    <div>
                      <div className="text-2xl font-bold text-red-700">
                        {importResults.filter(r => !r.success).length}
                      </div>
                      <div className="text-sm text-red-600">Failed</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="p-2 text-left font-medium">Status</th>
                      <th className="p-2 text-left font-medium">Employee</th>
                      <th className="p-2 text-left font-medium">Record Type</th>
                      <th className="p-2 text-left font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResults.map((result, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">
                          {result.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </td>
                        <td className="p-2">{result.employee_email}</td>
                        <td className="p-2">{result.record_type}</td>
                        <td className="p-2 text-destructive text-xs">{result.error || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={resetImport}>
                  Import More
                </Button>
                <Button onClick={() => navigateOrg('/leave-history')}>
                  Done
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkLeaveImport;
