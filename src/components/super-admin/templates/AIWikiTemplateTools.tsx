import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, FileText, Globe, Building2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES, getFlagEmoji } from "@/lib/countries";
import { BUSINESS_CATEGORIES } from "@/constants/businessCategories";
import { TemplateWikiDocument } from "./TemplateWikiTab";
import { Progress } from "@/components/ui/progress";

// Policy types available for generation
const POLICY_TYPES = [
  { value: "annual_leave", label: "Annual Leave Policy" },
  { value: "sick_leave", label: "Sick Leave Policy" },
  { value: "parental_leave", label: "Parental Leave Policy" },
  { value: "code_of_conduct", label: "Code of Conduct" },
  { value: "remote_work", label: "Remote Work Policy" },
  { value: "data_privacy", label: "Data Privacy Policy" },
  { value: "anti_harassment", label: "Anti-Harassment Policy" },
  { value: "expense", label: "Expense Reimbursement Policy" },
  { value: "attendance", label: "Attendance Policy" },
  { value: "dress_code", label: "Dress Code Policy" },
];

// SOP types by industry
const SOP_TYPES = [
  { value: "onboarding", label: "Employee Onboarding" },
  { value: "offboarding", label: "Employee Offboarding" },
  { value: "performance_review", label: "Performance Review Process" },
  { value: "expense_approval", label: "Expense Approval" },
  { value: "leave_request", label: "Leave Request Process" },
  { value: "incident_reporting", label: "Incident Reporting" },
  { value: "customer_complaint", label: "Customer Complaint Handling" },
  { value: "quality_assurance", label: "Quality Assurance" },
];

interface AIWikiTemplateToolsProps {
  templates: TemplateWikiDocument[];
}

export function AIWikiTemplateTools({ templates }: AIWikiTemplateToolsProps) {
  const queryClient = useQueryClient();
  
  // Policy generation state
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("global");
  
  // SOP generation state
  const [sopDialogOpen, setSopDialogOpen] = useState(false);
  const [selectedSops, setSelectedSops] = useState<string[]>([]);
  const [selectedBusinessCategory, setSelectedBusinessCategory] = useState<string>("");
  
  // Content generation state
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  
  // Progress state
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [results, setResults] = useState<{ item: string; success: boolean; error?: string }[]>([]);

  // Stats
  const templatesWithoutContent = templates.filter(t => !t.content || t.content.length === 0);
  const policiesCount = templates.filter(t => t.category === 'policies').length;
  const sopsCount = templates.filter(t => t.category === 'sops').length;

  // Generate policies mutation
  const generatePoliciesMutation = useMutation({
    mutationFn: async () => {
      setStatus('generating');
      setProgress(0);
      setResults([]);

      const allResults: { item: string; success: boolean; error?: string }[] = [];

      for (let i = 0; i < selectedPolicies.length; i++) {
        const policyType = selectedPolicies[i];
        const policyLabel = POLICY_TYPES.find(p => p.value === policyType)?.label || policyType;
        
        setProgress(Math.round(((i + 0.5) / selectedPolicies.length) * 100));

        try {
          const { data, error } = await supabase.functions.invoke('generate-wiki-policy-templates', {
            body: {
              policy_type: policyType,
              country_code: selectedCountry === 'global' ? null : selectedCountry,
            }
          });

          if (error) throw error;
          
          allResults.push({ item: policyLabel, success: true });
        } catch (error: any) {
          allResults.push({ item: policyLabel, success: false, error: error.message });
        }

        setResults([...allResults]);
        setProgress(Math.round(((i + 1) / selectedPolicies.length) * 100));
      }

      return allResults;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      setStatus('done');
      queryClient.invalidateQueries({ queryKey: ["template-wiki-documents"] });
      
      if (successCount === results.length) {
        toast.success(`Generated ${successCount} policy templates`);
      } else {
        toast.warning(`Generated ${successCount}/${results.length} templates`);
      }
    },
    onError: () => {
      setStatus('error');
      toast.error("Failed to generate templates");
    },
  });

  // Generate SOPs mutation
  const generateSopsMutation = useMutation({
    mutationFn: async () => {
      setStatus('generating');
      setProgress(0);
      setResults([]);

      const allResults: { item: string; success: boolean; error?: string }[] = [];

      for (let i = 0; i < selectedSops.length; i++) {
        const sopType = selectedSops[i];
        const sopLabel = SOP_TYPES.find(s => s.value === sopType)?.label || sopType;
        
        setProgress(Math.round(((i + 0.5) / selectedSops.length) * 100));

        try {
          const { data, error } = await supabase.functions.invoke('generate-wiki-sops', {
            body: {
              sop_type: sopType,
              business_category: selectedBusinessCategory || null,
            }
          });

          if (error) throw error;
          
          allResults.push({ item: sopLabel, success: true });
        } catch (error: any) {
          allResults.push({ item: sopLabel, success: false, error: error.message });
        }

        setResults([...allResults]);
        setProgress(Math.round(((i + 1) / selectedSops.length) * 100));
      }

      return allResults;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      setStatus('done');
      queryClient.invalidateQueries({ queryKey: ["template-wiki-documents"] });
      
      if (successCount === results.length) {
        toast.success(`Generated ${successCount} SOP templates`);
      } else {
        toast.warning(`Generated ${successCount}/${results.length} templates`);
      }
    },
    onError: () => {
      setStatus('error');
      toast.error("Failed to generate SOPs");
    },
  });

  // Bulk content generation mutation
  const generateContentMutation = useMutation({
    mutationFn: async () => {
      setStatus('generating');
      setProgress(0);
      setResults([]);

      const allResults: { item: string; success: boolean; error?: string }[] = [];
      const toProcess = templatesWithoutContent.slice(0, 10); // Limit to 10 at a time

      for (let i = 0; i < toProcess.length; i++) {
        const template = toProcess[i];
        
        setProgress(Math.round(((i + 0.5) / toProcess.length) * 100));

        try {
          const { data, error } = await supabase.functions.invoke('bulk-generate-wiki-content', {
            body: { template_id: template.id }
          });

          if (error) throw error;
          
          allResults.push({ item: template.name, success: true });
        } catch (error: any) {
          allResults.push({ item: template.name, success: false, error: error.message });
        }

        setResults([...allResults]);
        setProgress(Math.round(((i + 1) / toProcess.length) * 100));
      }

      return allResults;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      setStatus('done');
      queryClient.invalidateQueries({ queryKey: ["template-wiki-documents"] });
      
      if (successCount === results.length) {
        toast.success(`Generated content for ${successCount} templates`);
      } else {
        toast.warning(`Generated content for ${successCount}/${results.length} templates`);
      }
    },
    onError: () => {
      setStatus('error');
      toast.error("Failed to generate content");
    },
  });

  const resetState = () => {
    setStatus('idle');
    setProgress(0);
    setResults([]);
    setSelectedPolicies([]);
    setSelectedSops([]);
  };

  const togglePolicy = (value: string) => {
    setSelectedPolicies(prev => 
      prev.includes(value) 
        ? prev.filter(p => p !== value) 
        : [...prev, value]
    );
  };

  const toggleSop = (value: string) => {
    setSelectedSops(prev => 
      prev.includes(value) 
        ? prev.filter(s => s !== value) 
        : [...prev, value]
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Wiki Template Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {/* Generate Policies Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetState();
                setPolicyDialogOpen(true);
              }}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Generate Policies
              <span className="text-xs text-muted-foreground">({policiesCount} existing)</span>
            </Button>

            {/* Generate SOPs Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetState();
                setSopDialogOpen(true);
              }}
              className="gap-2"
            >
              <Building2 className="h-4 w-4" />
              Generate SOPs
              <span className="text-xs text-muted-foreground">({sopsCount} existing)</span>
            </Button>

            {/* Generate Content Button */}
            {templatesWithoutContent.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetState();
                  setContentDialogOpen(true);
                }}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Fill Missing Content
                <span className="text-xs text-muted-foreground">
                  ({templatesWithoutContent.length} templates)
                </span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Policy Generation Dialog */}
      <Dialog open={policyDialogOpen} onOpenChange={(open) => {
        if (!generatePoliciesMutation.isPending) {
          setPolicyDialogOpen(open);
          if (!open) resetState();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Policy Templates
            </DialogTitle>
            <DialogDescription>
              Select policies to generate with AI. Choose a country for country-specific policies.
            </DialogDescription>
          </DialogHeader>

          {status === 'idle' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Country</label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      <span className="flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Global (General)
                      </span>
                    </SelectItem>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country.code} value={country.code}>
                        <span className="flex items-center gap-2">
                          {getFlagEmoji(country.code)} {country.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Policies</label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {POLICY_TYPES.map(policy => (
                    <div key={policy.value} className="flex items-center gap-2">
                      <Checkbox
                        id={policy.value}
                        checked={selectedPolicies.includes(policy.value)}
                        onCheckedChange={() => togglePolicy(policy.value)}
                      />
                      <label htmlFor={policy.value} className="text-sm cursor-pointer">
                        {policy.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(status === 'generating' || status === 'done') && (
            <div className="space-y-4 py-4">
              <Progress value={progress} />
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.map((result, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>{result.item}</span>
                    {result.error && (
                      <span className="text-xs text-muted-foreground">({result.error})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {status === 'idle' && (
              <>
                <Button variant="outline" onClick={() => setPolicyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => generatePoliciesMutation.mutate()}
                  disabled={selectedPolicies.length === 0}
                >
                  Generate {selectedPolicies.length} Policies
                </Button>
              </>
            )}
            {status === 'generating' && (
              <Button disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </Button>
            )}
            {status === 'done' && (
              <Button onClick={() => {
                setPolicyDialogOpen(false);
                resetState();
              }}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SOP Generation Dialog */}
      <Dialog open={sopDialogOpen} onOpenChange={(open) => {
        if (!generateSopsMutation.isPending) {
          setSopDialogOpen(open);
          if (!open) resetState();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate SOP Templates
            </DialogTitle>
            <DialogDescription>
              Select SOPs to generate. Choose a business category for industry-specific procedures.
            </DialogDescription>
          </DialogHeader>

          {status === 'idle' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Category (Optional)</label>
                <Select value={selectedBusinessCategory} onValueChange={setSelectedBusinessCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Universal (All Industries)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      <span className="flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Universal (All Industries)
                      </span>
                    </SelectItem>
                    {BUSINESS_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select SOPs</label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {SOP_TYPES.map(sop => (
                    <div key={sop.value} className="flex items-center gap-2">
                      <Checkbox
                        id={sop.value}
                        checked={selectedSops.includes(sop.value)}
                        onCheckedChange={() => toggleSop(sop.value)}
                      />
                      <label htmlFor={sop.value} className="text-sm cursor-pointer">
                        {sop.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(status === 'generating' || status === 'done') && (
            <div className="space-y-4 py-4">
              <Progress value={progress} />
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.map((result, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>{result.item}</span>
                    {result.error && (
                      <span className="text-xs text-muted-foreground">({result.error})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {status === 'idle' && (
              <>
                <Button variant="outline" onClick={() => setSopDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => generateSopsMutation.mutate()}
                  disabled={selectedSops.length === 0}
                >
                  Generate {selectedSops.length} SOPs
                </Button>
              </>
            )}
            {status === 'generating' && (
              <Button disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </Button>
            )}
            {status === 'done' && (
              <Button onClick={() => {
                setSopDialogOpen(false);
                resetState();
              }}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Generation Dialog */}
      <Dialog open={contentDialogOpen} onOpenChange={(open) => {
        if (!generateContentMutation.isPending) {
          setContentDialogOpen(open);
          if (!open) resetState();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate Missing Content
            </DialogTitle>
            <DialogDescription>
              AI will generate detailed content for templates that are currently empty.
            </DialogDescription>
          </DialogHeader>

          {status === 'idle' && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Found <strong>{templatesWithoutContent.length}</strong> templates without content.
                {templatesWithoutContent.length > 10 && (
                  <span> Will process the first 10.</span>
                )}
              </p>
              <div className="mt-4 space-y-1 max-h-48 overflow-y-auto">
                {templatesWithoutContent.slice(0, 10).map(t => (
                  <div key={t.id} className="text-sm text-muted-foreground">
                    • {t.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(status === 'generating' || status === 'done') && (
            <div className="space-y-4 py-4">
              <Progress value={progress} />
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.map((result, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>{result.item}</span>
                    {result.error && (
                      <span className="text-xs text-muted-foreground">({result.error})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {status === 'idle' && (
              <>
                <Button variant="outline" onClick={() => setContentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => generateContentMutation.mutate()}
                  disabled={templatesWithoutContent.length === 0}
                >
                  Generate Content
                </Button>
              </>
            )}
            {status === 'generating' && (
              <Button disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </Button>
            )}
            {status === 'done' && (
              <Button onClick={() => {
                setContentDialogOpen(false);
                resetState();
              }}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
