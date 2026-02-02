/**
 * Public Job Detail Page
 * Shows job description and application form (no auth required)
 */

import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { usePublicJob } from '@/services/useHiring';
import { usePublicApplication } from '@/services/useHiringMutations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  MapPin, 
  Briefcase, 
  Clock, 
  Building2,
  ArrowLeft,
  DollarSign,
  Users,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { 
  WORK_MODEL_LABELS, 
  EMPLOYMENT_TYPE_LABELS 
} from '@/types/hiring';
import { toast } from 'sonner';
import { HelmetProvider, Helmet } from 'react-helmet-async';

export default function JobDetailPublic() {
  const { orgCode, jobSlug } = useParams<{ orgCode: string; jobSlug: string }>();
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { data: job, isLoading, error } = usePublicJob(orgCode, jobSlug);
  const submitApplication = usePublicApplication();

  // Application form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    cover_letter: '',
    consent: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.consent) {
      toast.error('Please accept the privacy policy to continue');
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
          phone: formData.phone || undefined,
          linkedin_url: formData.linkedin_url || undefined,
        },
        cover_letter: formData.cover_letter || undefined,
      });
      
      setShowApplyDialog(false);
      setShowSuccess(true);
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

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for applying to <strong>{job?.title}</strong>. 
              We'll review your application and get back to you soon.
            </p>
            <Button asChild>
              <Link to={`/careers/${orgCode}`}>View More Jobs</Link>
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
                  {job?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {WORK_MODEL_LABELS[job?.work_model || 'onsite']}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {EMPLOYMENT_TYPE_LABELS[job?.employment_type || 'full_time']}
                  </span>
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
                          className="prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: job.description }}
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
                          className="prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: job.requirements }}
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
                          className="prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: job.benefits }}
                        />
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="sticky top-4">
                <CardContent className="py-6">
                  <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full" size="lg">
                        Apply Now
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Apply for {job?.title}</DialogTitle>
                        <DialogDescription>
                          Fill in your details below to submit your application.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                          <Label htmlFor="cover_letter">Cover Letter</Label>
                          <Textarea
                            id="cover_letter"
                            rows={4}
                            placeholder="Tell us why you're interested in this role..."
                            value={formData.cover_letter}
                            onChange={(e) => setFormData({ ...formData, cover_letter: e.target.value })}
                          />
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
                          disabled={submitApplication.isPending}
                        >
                          {submitApplication.isPending ? 'Submitting...' : 'Submit Application'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <div className="mt-6 space-y-4">
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
