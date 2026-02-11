/**
 * Public Job Detail Page
 * Shows job description and application form (no auth required)
 */

import { useParams, Link } from 'react-router-dom';
import { countryToFlag } from '@/utils/countryFlag';
import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { usePublicJob } from '@/services/useHiring';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MapPin, 
  Briefcase, 
  Clock, 
  Building2,
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Users,
  CheckCircle2,
  FileText,
  Upload,
  X
} from 'lucide-react';
import { 
  WORK_MODEL_LABELS, 
  EMPLOYMENT_TYPE_LABELS 
} from '@/types/hiring';
import { toast } from 'sonner';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import DOMPurify from 'dompurify';
import { PhoneInput } from '@/components/ui/phone-input';
import { getDefaultCountryCode, getPhoneCountry, validatePhoneNumber } from '@/lib/phoneCountries';

export default function JobDetailPublic() {
  const { orgCode, jobSlug } = useParams<{ orgCode: string; jobSlug: string }>();
  const [hasApplied, setHasApplied] = useState(false);
  const [appliedAt, setAppliedAt] = useState<string | null>(null);
  
  const { data: job, isLoading, error } = usePublicJob(orgCode, jobSlug);

  // Fetch org data independently so the header shows immediately
  const { data: org } = useQuery({
    queryKey: ['public-org', orgCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('name, logo_url, website')
        .eq('slug', orgCode!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgCode,
  });

  const ACCEPTED_FILE_TYPES = '.pdf,.png,.jpeg,.jpg,.doc,.docx';
  const MAX_FILE_SIZE_MB = 25;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  // Create mutation using the edge function
  const submitApplication = useMutation({
    mutationFn: async (data: {
      orgCode: string;
      jobId: string;
      candidate: {
        name: string;
        email: string;
        phone?: string;
        linkedin_url?: string;
      };
      resume: File;
      additionalFiles?: File[];
    }) => {
      const formPayload = new FormData();
      formPayload.append('org_code', data.orgCode);
      formPayload.append('job_id', data.jobId);
      formPayload.append('candidate_name', data.candidate.name);
      formPayload.append('candidate_email', data.candidate.email);
      if (data.candidate.phone) formPayload.append('candidate_phone', data.candidate.phone);
      if (data.candidate.linkedin_url) formPayload.append('candidate_linkedin_url', data.candidate.linkedin_url);
      formPayload.append('resume', data.resume);
      if (data.additionalFiles) {
        data.additionalFiles.forEach((file) => {
          formPayload.append('additional_files', file);
        });
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/submit-public-application`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
        },
        body: formPayload,
      });

      const response = await res.json();
      if (!res.ok || response?.error) throw new Error(response.error || 'Failed to submit');
      return response;
    },
    onSuccess: () => {
      const now = new Date().toISOString();
      if (job && orgCode) {
        localStorage.setItem(`applied-${orgCode}-${job.id}`, JSON.stringify({ jobId: job.id, appliedAt: now }));
      }
      setAppliedAt(now);
      setHasApplied(true);
      toast.success('Application submitted successfully!');
    },
    onError: (error: Error) => {
      console.error('Error submitting application:', error);
      if (error.message?.includes('already applied')) {
        toast.error('You have already applied for this position');
      } else {
        toast.error(error.message || 'Failed to submit application. Please try again.');
      }
    },
  });

  // Check localStorage for existing application
  useEffect(() => {
    if (job && orgCode) {
      const stored = localStorage.getItem(`applied-${orgCode}-${job.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setHasApplied(true);
          setAppliedAt(parsed.appliedAt);
        } catch {}
      }
    }
  }, [job, orgCode]);

  // Application form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    consent: false,
  });
  const [phoneCountryCode, setPhoneCountryCode] = useState(() => getDefaultCountryCode());
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const valid: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit`);
        continue;
      }
      valid.push(file);
    }
    setResumeFiles((prev) => [...prev, ...valid]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setResumeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.consent) {
      toast.error('Please accept the privacy policy to continue');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    if (!validatePhoneNumber(formData.phone, phoneCountryCode)) {
      const country = getPhoneCountry(phoneCountryCode);
      toast.error(`Please enter a valid phone number (${country?.minDigits}-${country?.maxDigits} digits)`);
      return;
    }

    if (resumeFiles.length === 0) {
      toast.error('Please upload at least one file (resume)');
      return;
    }

    if (!job || !orgCode) return;

    try {
      await submitApplication.mutateAsync({
        orgCode,
        jobId: job.id,
        candidate: {
          name: formData.name,
          email: formData.email,
          phone: `${getPhoneCountry(phoneCountryCode)?.dialCode || ''} ${formData.phone.replace(/\D/g, '')}`.trim(),
          linkedin_url: formData.linkedin_url || undefined,
        },
        resume: resumeFiles[0],
        additionalFiles: resumeFiles.slice(1),
      });
      
      // Applied state is set in onSuccess
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (error || (!isLoading && !job)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Job Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This position is no longer available or doesn't exist.
            </p>
            <Button asChild>
              <Link to={`/careers/${orgCode}`}>View All Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <HelmetProvider>
      <Helmet>
        <title>{job?.title || 'Job'} | Careers</title>
        <meta name="description" content={job?.description?.slice(0, 160) || ''} />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        {/* Top Menu Bar */}
        <header className="sticky top-0 z-50 w-full h-[100px] bg-white border-b">
          <div className="container mx-auto px-4 h-full flex items-center justify-between">
            <Link to={`/careers/${orgCode}`} className="flex items-center gap-3">
              {org?.logo_url ? (
                <img src={org.logo_url} alt={org.name ?? 'Organization'} className="max-h-16 object-contain" />
              ) : org?.name ? (
                <span className="text-2xl font-bold text-foreground">{org.name}</span>
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </Link>
            {(org as any)?.website && (
              <Button asChild variant="outline">
                <a href={(org as any).website} target="_blank" rel="noopener noreferrer">
                  Go to Website <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </header>

        {/* Header */}
        <div className="bg-primary text-primary-foreground py-8">
          <div className="container mx-auto px-4">
            <Link 
              to={`/careers/${orgCode}`}
              className="inline-flex items-center text-sm opacity-80 hover:opacity-100 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to all jobs
            </Link>
            
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-1/2 bg-primary-foreground/20 mb-2" />
                <Skeleton className="h-5 w-1/3 bg-primary-foreground/20" />
              </>
            ) : (
              <>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{job?.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm opacity-90">
                  {(() => {
                    const city = job?.location || (job as any)?.office?.city;
                    const country = (job as any)?.office?.country;
                    const locationText = [city, country].filter(Boolean).join(', ');
                    const flag = countryToFlag(country);
                    if (!locationText) return null;
                    return (
                      <span className="flex items-center gap-1">
                        {flag ? <span className="text-base">{flag}</span> : <MapPin className="h-4 w-4" />}
                        {locationText}
                      </span>
                    );
                  })()}
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {WORK_MODEL_LABELS[job?.work_model || 'onsite']}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {EMPLOYMENT_TYPE_LABELS[job?.employment_type || 'full_time']}
                  </span>
                  {(job as any)?.application_close_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Apply by {new Date((job as any).application_close_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {isLoading ? (
                <Card>
                  <CardContent className="py-6 space-y-4">
                    <Skeleton className="h-6 w-1/4 mb-4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ) : (
                <>
                  {job?.description && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          About This Role
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div 
                          className="prose prose-sm max-w-none dark:prose-invert [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.description) }}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {job?.requirements && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Requirements</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div 
                          className="prose prose-sm max-w-none dark:prose-invert [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.requirements) }}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {job?.benefits && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Benefits</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div 
                          className="prose prose-sm max-w-none dark:prose-invert [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.benefits) }}
                        />
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="sticky top-[116px]">
                <CardContent className="py-6">
                  {/* Job metadata */}
                  <div className="space-y-4 mb-6">
                    {job?.salary_visible && job?.salary_min && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Salary Range</span>
                        <span className="font-medium">
                          {job.salary_currency} {job.salary_min.toLocaleString()}
                          {job.salary_max && ` - ${job.salary_max.toLocaleString()}`}
                        </span>
                      </div>
                    )}

                    {job?.headcount && job.headcount > 1 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Positions</span>
                        <span className="font-medium">{job.headcount} openings</span>
                      </div>
                    )}
                  </div>

                  {hasApplied ? (
                    <div className="text-center space-y-3">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-3" />
                        <h3 className="text-lg font-semibold text-green-800">Application Submitted</h3>
                        {appliedAt && (
                          <p className="text-sm text-green-600 mt-1">
                            Applied on {new Date(appliedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(appliedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <Link to={`/careers/${orgCode}`}>View More Jobs</Link>
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Apply for this position</h3>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number *</Label>
                          <PhoneInput
                            countryCode={phoneCountryCode}
                            onCountryChange={setPhoneCountryCode}
                            phone={formData.phone}
                            onPhoneChange={(val) => setFormData({ ...formData, phone: val })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="linkedin">LinkedIn URL</Label>
                          <Input
                            id="linkedin"
                            type="url"
                            placeholder="https://linkedin.com/in/..."
                            value={formData.linkedin_url}
                            onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="resume">Upload Resume & Portfolios *</Label>
                          {resumeFiles.length > 0 && (
                            <div className="space-y-2">
                              {resumeFiles.map((file, index) => (
                                <div key={index} className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-sm truncate flex-1">{file.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeFile(index)}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <label
                            htmlFor="resume"
                            className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                          >
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground text-center">
                              {resumeFiles.length > 0 ? 'Add more files' : 'Click to upload'} (PDF, DOC, DOCX, JPEG, PNG)
                            </span>
                            <span className="text-xs text-muted-foreground">Max {MAX_FILE_SIZE_MB}MB per file</span>
                            <input
                              id="resume"
                              type="file"
                              accept={ACCEPTED_FILE_TYPES}
                              onChange={handleFileChange}
                              multiple
                              className="sr-only"
                            />
                          </label>
                        </div>

                        <div className="flex items-start gap-2">
                          <Checkbox
                            id="consent"
                            checked={formData.consent}
                            onCheckedChange={(checked) => 
                              setFormData({ ...formData, consent: checked as boolean })
                            }
                          />
                          <Label htmlFor="consent" className="text-sm leading-tight">
                            I agree to the processing of my personal data in accordance with the privacy policy.
                          </Label>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={
                            submitApplication.isPending ||
                            !formData.name.trim() ||
                            !formData.email.trim() ||
                            !formData.phone.trim() ||
                            resumeFiles.length === 0 ||
                            !formData.consent
                          }
                        >
                          {submitApplication.isPending ? 'Submitting...' : 'Submit Application'}
                        </Button>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t py-8 mt-12">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>Powered by GlobalyOS</p>
          </div>
        </div>
      </div>
    </HelmetProvider>
  );
}
