import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronLeft, UserCheck, Users, Users2, Shuffle, Check, Plus, Trash2, Copy } from 'lucide-react';
import { useCreateEventType, useUpdateEventType, useSchedulerEventType } from '@/services/useScheduler';
import { useOrganization } from '@/hooks/useOrganization';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  DEFAULT_EVENT_CONFIG, DEFAULT_AVAILABILITY,
  type SchedulerEventType, type SchedulerLocationType,
  type EventTypeConfig, type AvailabilityDay, type CustomQuestion,
  type CreateEventTypeFormData,
} from '@/types/scheduler';
import { toast } from 'sonner';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const TYPE_OPTIONS: { value: SchedulerEventType; label: string; description: string; icon: any }[] = [
  { value: 'one_on_one', label: 'One-on-One', description: 'One host meets with one invitee at a time', icon: UserCheck },
  { value: 'group', label: 'Group', description: 'One host, multiple invitees in same session', icon: Users },
  { value: 'collective', label: 'Collective', description: 'Multiple hosts, all must be available', icon: Users2 },
  { value: 'round_robin', label: 'Round Robin', description: 'Rotate bookings among a pool of hosts', icon: Shuffle },
];

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface Props {
  open: boolean;
  editId: string | null;
  onClose: () => void;
}

export function CreateEventTypeWizard({ open, editId, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [employees, setEmployees] = useState<any[]>([]);
  const { currentOrg } = useOrganization();
  const { orgCode } = useParams<{ orgCode: string }>();
  const createMutation = useCreateEventType();
  const updateMutation = useUpdateEventType();
  const { data: existingEventType } = useSchedulerEventType(editId);

  const [form, setForm] = useState<CreateEventTypeFormData>({
    type: 'one_on_one',
    name: '',
    slug: '',
    description: '',
    duration_minutes: 30,
    location_type: 'google_meet',
    location_value: '',
    host_employee_ids: [],
    config: { ...DEFAULT_EVENT_CONFIG },
  });

  // Load employees
  useEffect(() => {
    if (!currentOrg?.id) return;
    supabase
      .from('employees')
      .select('id, first_name, last_name, job_title, avatar_url')
      .eq('organization_id', currentOrg.id)
      .eq('status', 'active')
      .order('first_name')
      .then(({ data }) => setEmployees(data || []));
  }, [currentOrg?.id]);

  // Populate for edit
  useEffect(() => {
    if (existingEventType && editId) {
      setForm({
        type: existingEventType.type,
        name: existingEventType.name,
        slug: existingEventType.slug,
        description: existingEventType.description || '',
        duration_minutes: existingEventType.duration_minutes,
        location_type: existingEventType.location_type,
        location_value: existingEventType.location_value || '',
        host_employee_ids: (existingEventType.hosts || []).map(h => h.employee_id),
        config: existingEventType.config_json || DEFAULT_EVENT_CONFIG,
      });
    }
  }, [existingEventType, editId]);

  // Reset on open
  useEffect(() => {
    if (open && !editId) {
      setStep(0);
      setForm({
        type: 'one_on_one',
        name: '',
        slug: '',
        description: '',
        duration_minutes: 30,
        location_type: 'google_meet',
        location_value: '',
        host_employee_ids: [],
        config: { ...DEFAULT_EVENT_CONFIG },
      });
    }
    if (open) setStep(0);
  }, [open, editId]);

  const STEPS = editId
    ? ['Basics', 'Hosts', 'Availability', 'Questions', 'Share']
    : ['Type', 'Basics', 'Hosts', 'Availability', 'Questions', 'Share'];

  const isLastStep = step === STEPS.length - 1;

  const handleNext = () => {
    if (step === (editId ? 0 : 1)) {
      // Validate basics
      if (!form.name.trim()) { toast.error('Please enter an event name'); return; }
      if (!form.slug.trim()) { toast.error('Please enter a URL slug'); return; }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (editId) {
      await updateMutation.mutateAsync({ id: editId, formData: form });
    } else {
      await createMutation.mutateAsync(form);
    }
    onClose();
  };

  const siteUrl = window.location.origin;
  const bookingLink = `${siteUrl}/s/${orgCode}/scheduler/${form.slug}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? 'Edit Event Type' : 'Create Event Type'}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-all',
                i < step ? 'bg-primary text-primary-foreground' :
                i === step ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground'
              )}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={cn(
                'text-xs hidden sm:block',
                i === step ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}>{label}</span>
              {i < STEPS.length - 1 && <div className="h-px w-4 bg-border" />}
            </div>
          ))}
        </div>

        <div className="min-h-[300px]">
          {/* STEP 0 (new): Type selection */}
          {!editId && step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TYPE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-xl border text-left transition-all',
                      form.type === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground'
                    )}
                  >
                    <div className={cn(
                      'p-2 rounded-lg mt-0.5',
                      form.type === opt.value ? 'bg-primary/10' : 'bg-muted'
                    )}>
                      <Icon className={cn('h-5 w-5', form.type === opt.value ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div>
                      <div className="font-medium text-foreground text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Basics step */}
          {step === (editId ? 0 : 1) && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Event Name *</Label>
                <Input
                  placeholder="e.g. 30-min Intro Call"
                  value={form.name}
                  onChange={e => setForm(f => ({
                    ...f,
                    name: e.target.value,
                    slug: slugify(e.target.value),
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>URL Slug *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">/scheduler/</span>
                  <Input
                    placeholder="intro-call"
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  placeholder="What is this meeting about?"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Duration</Label>
                  <Select
                    value={String(form.duration_minutes)}
                    onValueChange={v => setForm(f => ({ ...f, duration_minutes: Number(v) }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[15, 20, 30, 45, 60, 90, 120].map(d => (
                        <SelectItem key={d} value={String(d)}>{d} minutes</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Select
                    value={form.location_type}
                    onValueChange={v => setForm(f => ({ ...f, location_type: v as SchedulerLocationType }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google_meet">Google Meet</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="in_person">In Person</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(form.location_type === 'in_person' || form.location_type === 'custom' || form.location_type === 'phone') && (
                <div className="space-y-1.5">
                  <Label>{form.location_type === 'phone' ? 'Phone Number' : form.location_type === 'in_person' ? 'Address' : 'Custom URL / Details'}</Label>
                  <Input
                    value={form.location_value}
                    onChange={e => setForm(f => ({ ...f, location_value: e.target.value }))}
                    placeholder={form.location_type === 'phone' ? '+1 555 000 0000' : form.location_type === 'in_person' ? '123 Main St, City' : 'https://...'}
                  />
                </div>
              )}
            </div>
          )}

          {/* Hosts step */}
          {step === (editId ? 1 : 2) && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Select who will host meetings for this event type.</p>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {employees.map(emp => {
                  const isSelected = form.host_employee_ids.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      onClick={() => setForm(f => ({
                        ...f,
                        host_employee_ids: isSelected
                          ? f.host_employee_ids.filter(id => id !== emp.id)
                          : [...f.host_employee_ids, emp.id],
                      }))}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {emp.first_name[0]}{emp.last_name?.[0] || ''}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground">
                          {emp.first_name} {emp.last_name}
                        </div>
                        {emp.job_title && (
                          <div className="text-xs text-muted-foreground">{emp.job_title}</div>
                        )}
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {form.host_employee_ids.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">Select at least one host</p>
              )}
            </div>
          )}

          {/* Availability step */}
          {step === (editId ? 2 : 3) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Working Hours</Label>
                {DAYS.map(day => {
                  const av = form.config.availability[day] as AvailabilityDay;
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <Switch
                        checked={av.enabled}
                        onCheckedChange={checked => setForm(f => ({
                          ...f,
                          config: {
                            ...f.config,
                            availability: {
                              ...f.config.availability,
                              [day]: { ...av, enabled: checked },
                            },
                          },
                        }))}
                      />
                      <span className="w-10 text-sm text-foreground">{DAY_LABELS[day]}</span>
                      {av.enabled && (
                        <>
                          <Input
                            type="time"
                            className="h-8 w-28"
                            value={av.start}
                            onChange={e => setForm(f => ({
                              ...f,
                              config: {
                                ...f.config,
                                availability: {
                                  ...f.config.availability,
                                  [day]: { ...av, start: e.target.value },
                                },
                              },
                            }))}
                          />
                          <span className="text-muted-foreground text-sm">to</span>
                          <Input
                            type="time"
                            className="h-8 w-28"
                            value={av.end}
                            onChange={e => setForm(f => ({
                              ...f,
                              config: {
                                ...f.config,
                                availability: {
                                  ...f.config.availability,
                                  [day]: { ...av, end: e.target.value },
                                },
                              },
                            }))}
                          />
                        </>
                      )}
                      {!av.enabled && <span className="text-muted-foreground text-sm">Unavailable</span>}
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Buffer Before (min)</Label>
                  <Input
                    type="number" min={0} max={60} step={5}
                    value={form.config.availability.buffer_before_minutes}
                    onChange={e => setForm(f => ({
                      ...f,
                      config: {
                        ...f.config,
                        availability: { ...f.config.availability, buffer_before_minutes: Number(e.target.value) },
                      },
                    }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Buffer After (min)</Label>
                  <Input
                    type="number" min={0} max={60} step={5}
                    value={form.config.availability.buffer_after_minutes}
                    onChange={e => setForm(f => ({
                      ...f,
                      config: {
                        ...f.config,
                        availability: { ...f.config.availability, buffer_after_minutes: Number(e.target.value) },
                      },
                    }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Min Notice (hours)</Label>
                  <Input
                    type="number" min={0} max={72}
                    value={form.config.availability.min_notice_hours}
                    onChange={e => setForm(f => ({
                      ...f,
                      config: {
                        ...f.config,
                        availability: { ...f.config.availability, min_notice_hours: Number(e.target.value) },
                      },
                    }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Days in Advance</Label>
                  <Input
                    type="number" min={1} max={365}
                    value={form.config.availability.max_days_in_advance}
                    onChange={e => setForm(f => ({
                      ...f,
                      config: {
                        ...f.config,
                        availability: { ...f.config.availability, max_days_in_advance: Number(e.target.value) },
                      },
                    }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Questions step */}
          {step === (editId ? 3 : 4) && (
            <div className="space-y-4">
              {/* Fixed questions */}
              <div className="space-y-2">
                {[
                  { label: 'Name', required: true },
                  { label: 'Email', required: true },
                ].map(q => (
                  <div key={q.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <span className="text-sm text-foreground font-medium flex-1">{q.label}</span>
                    <Badge variant="secondary" className="text-xs">Required</Badge>
                    <span className="text-xs text-muted-foreground">Locked</span>
                  </div>
                ))}
              </div>

              {/* Custom questions */}
              {form.config.questions.map((q, idx) => (
                <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      placeholder="Question label"
                      value={q.label}
                      onChange={e => setForm(f => ({
                        ...f,
                        config: {
                          ...f.config,
                          questions: f.config.questions.map((qq, i) =>
                            i === idx ? { ...qq, label: e.target.value } : qq
                          ),
                        },
                      }))}
                    />
                    <div className="flex items-center gap-2">
                      <Select
                        value={q.type}
                        onValueChange={v => setForm(f => ({
                          ...f,
                          config: {
                            ...f.config,
                            questions: f.config.questions.map((qq, i) =>
                              i === idx ? { ...qq, type: v as any } : qq
                            ),
                          },
                        }))}
                      >
                        <SelectTrigger className="h-7 text-xs w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Short text</SelectItem>
                          <SelectItem value="textarea">Long text</SelectItem>
                          <SelectItem value="radio">Single choice</SelectItem>
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <Switch
                          checked={q.required}
                          onCheckedChange={checked => setForm(f => ({
                            ...f,
                            config: {
                              ...f.config,
                              questions: f.config.questions.map((qq, i) =>
                                i === idx ? { ...qq, required: checked } : qq
                              ),
                            },
                          }))}
                          className="scale-75"
                        />
                        Required
                      </label>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setForm(f => ({
                      ...f,
                      config: {
                        ...f.config,
                        questions: f.config.questions.filter((_, i) => i !== idx),
                      },
                    }))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setForm(f => ({
                  ...f,
                  config: {
                    ...f.config,
                    questions: [
                      ...f.config.questions,
                      { id: uuidv4(), label: '', type: 'text', required: false },
                    ],
                  },
                }))}
              >
                <Plus className="h-4 w-4" />
                Add Question
              </Button>
            </div>
          )}

          {/* Share step */}
          {step === (editId ? 4 : 5) && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">
                  {editId ? 'Event Type Updated!' : 'Event Type Ready!'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Share this link with anyone to let them book a meeting with you.
                </p>
              </div>

              {form.slug && (
                <div className="space-y-2">
                  <Label className="text-sm">Your Booking Link</Label>
                  <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg border border-border">
                    <span className="text-sm text-foreground flex-1 truncate font-mono">{bookingLink}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      onClick={() => {
                        navigator.clipboard.writeText(bookingLink);
                        toast.success('Link copied!');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-primary"
                    onClick={() => window.open(bookingLink, '_blank')}
                  >
                    Preview booking page →
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
          <Button
            variant="ghost"
            onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
          >
            {step === 0 ? 'Cancel' : (
              <><ChevronLeft className="h-4 w-4 mr-1" />Back</>
            )}
          </Button>

          {!isLastStep ? (
            <Button onClick={handleNext} className="gap-1">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editId ? 'Save Changes' : 'Create Event Type'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
