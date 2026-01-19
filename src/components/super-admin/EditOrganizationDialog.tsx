import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";

interface Organization {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  company_size?: string | null;
  logo_url?: string | null;
  owner_email?: string | null;
  owner_name?: string | null;
  timezone?: string | null;
}

interface EditOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization | null;
  onSave: () => void;
}

const COMPANY_SIZE_OPTIONS = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1000 employees' },
  { value: '1000+', label: '1000+ employees' },
];

const BUSINESS_CATEGORY_OPTIONS = [
  // Technology & IT
  { value: 'technology', label: 'Technology' },
  { value: 'it_services', label: 'IT Services & Consulting' },
  { value: 'software_development', label: 'Software Development' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'data_analytics', label: 'Data & Analytics' },
  
  // Professional Services
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'legal_firm', label: 'Legal Firm' },
  { value: 'tax_accounting', label: 'Tax & Accounting Firm' },
  { value: 'management_consulting', label: 'Management Consulting' },
  { value: 'hr_consulting', label: 'HR Consulting' },
  { value: 'business_consulting', label: 'Business Consulting' },
  
  // Education
  { value: 'education', label: 'Education' },
  { value: 'education_consultancy', label: 'Education Consultancy' },
  { value: 'training_coaching', label: 'Training & Coaching' },
  { value: 'elearning', label: 'E-Learning' },
  
  // Immigration & Legal
  { value: 'migration_agency', label: 'Migration Agency' },
  { value: 'immigration_services', label: 'Immigration Services' },
  
  // Healthcare
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'medical_practice', label: 'Medical Practice' },
  { value: 'dental_practice', label: 'Dental Practice' },
  { value: 'allied_health', label: 'Allied Health Services' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'mental_health', label: 'Mental Health Services' },
  
  // Finance
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'financial_advisory', label: 'Financial Advisory' },
  { value: 'wealth_management', label: 'Wealth Management' },
  { value: 'fintech', label: 'Fintech' },
  
  // Real Estate & Property
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'property_management', label: 'Property Management' },
  { value: 'construction', label: 'Construction' },
  { value: 'architecture_design', label: 'Architecture & Design' },
  
  // Retail & Commerce
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'wholesale', label: 'Wholesale & Distribution' },
  
  // Manufacturing & Industry
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'logistics', label: 'Logistics & Supply Chain' },
  { value: 'automotive', label: 'Automotive' },
  
  // Creative & Media
  { value: 'media', label: 'Media & Entertainment' },
  { value: 'advertising', label: 'Advertising & Marketing' },
  { value: 'design_agency', label: 'Design Agency' },
  { value: 'digital_marketing', label: 'Digital Marketing' },
  
  // Hospitality & Travel
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'travel_tourism', label: 'Travel & Tourism' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'event_management', label: 'Event Management' },
  
  // Other Sectors
  { value: 'nonprofit', label: 'Non-profit' },
  { value: 'government', label: 'Government' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'energy_utilities', label: 'Energy & Utilities' },
  { value: 'telecommunications', label: 'Telecommunications' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'sports_recreation', label: 'Sports & Recreation' },
  { value: 'religious', label: 'Religious Organization' },
  { value: 'other', label: 'Other' },
];

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
];

export const EditOrganizationDialog = ({
  open,
  onOpenChange,
  organization,
  onSave
}: EditOrganizationDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    company_size: '',
    logo_url: '',
    owner_email: '',
    owner_name: '',
    timezone: ''
  });
  const { logActivity } = useAdminActivityLog();

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        industry: organization.industry || '',
        company_size: organization.company_size || '',
        logo_url: organization.logo_url || '',
        owner_email: organization.owner_email || '',
        owner_name: organization.owner_name || '',
        timezone: organization.timezone || ''
      });
    }
  }, [organization]);

  const handleSave = async () => {
    if (!organization) return;
    if (!formData.name.trim()) {
      toast.error('Organization name is required');
      return;
    }

    setSaving(true);
    try {
      // Track changes for activity log
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      
      if (formData.name !== organization.name) {
        changes.name = { from: organization.name, to: formData.name };
      }
      if (formData.industry !== (organization.industry || '')) {
        changes.industry = { from: organization.industry, to: formData.industry || null };
      }
      if (formData.company_size !== (organization.company_size || '')) {
        changes.company_size = { from: organization.company_size, to: formData.company_size || null };
      }
      if (formData.logo_url !== (organization.logo_url || '')) {
        changes.logo_url = { from: organization.logo_url, to: formData.logo_url || null };
      }
      if (formData.owner_email !== (organization.owner_email || '')) {
        changes.owner_email = { from: organization.owner_email, to: formData.owner_email || null };
      }
      if (formData.owner_name !== (organization.owner_name || '')) {
        changes.owner_name = { from: organization.owner_name, to: formData.owner_name || null };
      }
      if (formData.timezone !== (organization.timezone || '')) {
        changes.timezone = { from: organization.timezone, to: formData.timezone || null };
      }

      if (Object.keys(changes).length === 0) {
        toast.info('No changes to save');
        onOpenChange(false);
        return;
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name.trim(),
          industry: formData.industry || null,
          company_size: formData.company_size || null,
          logo_url: formData.logo_url || null,
          owner_email: formData.owner_email || null,
          owner_name: formData.owner_name || null,
          timezone: formData.timezone || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', organization.id);

      if (error) throw error;

      // Log the activity
      await logActivity({
        organizationId: organization.id,
        actionType: 'org_updated',
        entityType: 'organization',
        entityId: organization.id,
        changes
      });

      toast.success('Organization updated successfully');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Edit Organization
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter organization name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">Slug (Read-only)</Label>
            <Input
              id="slug"
              value={organization?.slug || ''}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="industry">Business Category</Label>
              <Select
                value={formData.industry}
                onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_CATEGORY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="company_size">Company Size</Label>
              <Select
                value={formData.company_size}
                onValueChange={(value) => setFormData(prev => ({ ...prev, company_size: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="owner_name">Owner Name</Label>
            <Input
              id="owner_name"
              value={formData.owner_name}
              onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
              placeholder="Enter owner name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="owner_email">Owner Email</Label>
            <Input
              id="owner_email"
              type="email"
              value={formData.owner_email}
              onChange={(e) => setFormData(prev => ({ ...prev, owner_email: e.target.value }))}
              placeholder="Enter owner email"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="logo_url">Logo URL</Label>
            <div className="flex gap-2">
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
                className="flex-1"
              />
              {formData.logo_url && (
                <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center overflow-hidden">
                  <img 
                    src={formData.logo_url} 
                    alt="Logo preview" 
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
