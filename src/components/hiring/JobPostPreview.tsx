import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Building, 
  Briefcase, 
  Clock, 
  DollarSign,
  Calendar,
  Users
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface JobFormData {
  title: string;
  department_id: string;
  office_id: string;
  location: string;
  work_model: string;
  employment_type: string;
  headcount: number;
  salary_min: string;
  salary_max: string;
  salary_currency: string;
  salary_visible: boolean;
  target_start_date: string;
  description: string;
}

interface Department {
  id: string;
  name: string;
}

interface Office {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
}

interface JobPostPreviewProps {
  formData: JobFormData;
  departments: Department[];
  offices: Office[];
  companyName?: string;
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};

const WORK_MODEL_LABELS: Record<string, string> = {
  onsite: 'On-site',
  remote: 'Remote',
  hybrid: 'Hybrid',
};

export function JobPostPreview({ 
  formData, 
  departments, 
  offices,
  companyName 
}: JobPostPreviewProps) {
  const department = departments.find(d => d.id === formData.department_id);
  const office = offices.find(o => o.id === formData.office_id);
  
  // Build location display with city and country
  const getLocationDisplay = () => {
    if (formData.location) return formData.location;
    if (!office) return 'Location not specified';
    
    const parts = [office.city, office.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Location not specified';
  };
  
  const locationDisplay = getLocationDisplay();
  
  const formatSalary = (min: string, max: string, currency: string) => {
    if (!min && !max) return null;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    });
    if (min && max) {
      return `${formatter.format(Number(min))} - ${formatter.format(Number(max))}`;
    }
    if (min) return `From ${formatter.format(Number(min))}`;
    if (max) return `Up to ${formatter.format(Number(max))}`;
    return null;
  };

  const salaryRange = formatSalary(formData.salary_min, formData.salary_max, formData.salary_currency);

  const renderDescription = () => {
    if (!formData.description) {
      return (
        <p className="text-muted-foreground italic text-sm">
          Job description will appear here...
        </p>
      );
    }
    const html = marked.parse(formData.description, { async: false }) as string;
    const sanitized = DOMPurify.sanitize(html);
    return (
      <div 
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  };

  return (
    <Card className="sticky top-20 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="space-y-1">
          <p className="text-xs font-medium text-primary uppercase tracking-wider">
            Preview
          </p>
          <h2 className="text-xl font-bold">
            {formData.title || 'Job Title'}
          </h2>
          {companyName && (
            <p className="text-sm text-muted-foreground">{companyName}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Quick Info Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <Briefcase className="h-3 w-3" />
            {EMPLOYMENT_TYPE_LABELS[formData.employment_type] || 'Full-time'}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {WORK_MODEL_LABELS[formData.work_model] || 'On-site'}
          </Badge>
          {formData.headcount > 1 && (
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {formData.headcount} positions
            </Badge>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{locationDisplay}</span>
          </div>
          {department && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4 shrink-0" />
              <span>{department.name}</span>
            </div>
          )}
          {formData.salary_visible && salaryRange && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4 shrink-0" />
              <span>{salaryRange}</span>
            </div>
          )}
          {formData.target_start_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Start: {new Date(formData.target_start_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Description */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">About the Role</h3>
          {renderDescription()}
        </div>

        {/* Empty state hints */}
        {!formData.description && (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Fill in the form to see a live preview of your job posting
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
