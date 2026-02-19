import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight, Copy, Plus, Trash2,
  UserCheck, Users, Users2, Shuffle, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCreateEventType, useUpdateEventType, useSchedulerEventType } from '@/services/useScheduler';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DEFAULT_EVENT_CONFIG,
  type SchedulerEventType, type SchedulerLocationType,
  type AvailabilityDay, type CreateEventTypeFormData,
} from '@/types/scheduler';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

const TYPE_OPTIONS: { value: SchedulerEventType; label: string; description: string; icon: any; color: string }[] = [
  { value: 'one_on_one', label: 'One-on-One', description: 'One host meets one invitee at a time. Perfect for sales calls, coaching, or demos.', icon: UserCheck, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'group', label: 'Group', description: 'One host, multiple invitees in the same session. Great for webinars or classes.', icon: Users, color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'collective', label: 'Collective', description: 'Multiple hosts must all be available. Used for panel interviews or team reviews.', icon: Users2, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'round_robin', label: 'Round Robin', description: 'Rotate bookings among a pool of hosts to distribute load evenly.', icon: Shuffle, color: 'text-orange-600 bg-orange-50 border-orange-200' },
];

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const CREATE_STEPS = ['Type', 'Basics', 'Hosts', 'Availability', 'Questions', 'Share'];
const EDIT_STEPS = ['Basics', 'Hosts', 'Availability', 'Questions', 'Share'];

export default function CreateEventTypePage() {
  const navigate = useNavigate();
  const { orgCode, id } = useParams<{ orgCode: string; id?: string }>();
  const { currentOrg } = useOrganization();
  const createMutation = useCreateEventType();
  const updateMutation = useUpdateEventType();
  const { data: existingEventType } = useSchedulerEventType(id || null);

  const isEdit = !!id;
  const STEPS = isEdit ? EDIT_STEPS : CREATE_STEPS;

  const [step, setStep] = useState(0);
  const [employees, setEmployees] = useState<any[]>([]);
  const [saved, setSaved] = useState(false);
  const [savedSlug, setSavedSlug] = useState('');

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
      .select('id, user_id, position, profiles(full_name, avatar_url)')
      .eq('organization_id', currentOrg.id)
      .eq('status', 'active')
      .order('id')
      .then(({ data }) => setEmployees((data || []).map((e: any) => ({
        ...e,
        first_name: (e.profiles?.full_name || '').split(' ')[0] || '',
        last_name: (e.profiles?.full_name || '').split(' ').slice(1).join(' ') || '',
        avatar_url: e.profiles?.avatar_url || null,
        job_title: e.position || '',
      }))));
  }, [currentOrg?.id]);

  // Populate for edit
  useEffect(() => {
    if (existingEventType && isEdit) {
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
  }, [existingEventType, isEdit]);

  const basicsStepIdx = isEdit ? 0 : 1;
  const hostsStepIdx = isEdit ? 1 : 2;
  const availStepIdx = isEdit ? 2 : 3;
  const questionsStepIdx = isEdit ? 3 : 4;
  const shareStepIdx = isEdit ? 4 : 5;

  const handleNext = () => {
    if (step === basicsStepIdx) {
      if (!form.name.trim()) { toast.error('Please enter an event name'); return; }
      if (!form.slug.trim()) { toast.error('Please enter a URL slug'); return; }
    }
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, formData: form });
        setSavedSlug(form.slug);
      } else {
        const result = await createMutation.mutateAsync(form);
        setSavedSlug(form.slug);
      }
      setSaved(true);
    } catch (err: any) {
      if (err?.message?.includes('duplicate') || err?.message?.includes('unique')) {
        toast.error('This URL slug is already in use. Try a different name.');
      } else {
        toast.error(err?.message || 'Something went wrong');
      }
    }
  };

  const bookingLink = `${window.location.origin}/s/${orgCode}/scheduler/${savedSlug || form.slug}`;

  const isLastStep = step === STEPS.length - 1;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => navigate(`/org/${orgCode}/crm/scheduler`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Scheduler
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground">
            {isEdit ? `Edit: ${form.name || 'Event Type'}` : 'Create Event Type'}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className="flex gap-8">
          {/* Left sidebar — steps */}
          <div className="hidden md:block w-56 shrink-0">
            <div className="sticky top-24 space-y-1">
              {STEPS.map((label, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                    i === step ? 'bg-primary/10 text-primary font-medium' :
                    i < step ? 'text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted/50' :
                    'text-muted-foreground/50'
                  )}
                  onClick={() => i < step && setStep(i)}
                >
                  <div className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0 transition-all',
                    i < step ? 'bg-primary text-primary-foreground' :
                    i === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {i < step ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Right content */}
          <div className="flex-1 min-w-0">
            {/* Mobile step indicator */}
            <div className="flex items-center gap-1 mb-6 md:hidden">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full flex-1 transition-all',
                    i < step ? 'bg-primary' : i === step ? 'bg-primary' : 'bg-muted'
                  )}
                />
              ))}
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              {/* Step header */}
              <div className="mb-8">
                <p className="text-xs text-muted-foreground mb-1">Step {step + 1} of {STEPS.length}</p>
                <h1 className="text-xl font-bold text-foreground">{STEPS[step]}</h1>
              </div>

              {/* ─── STEP: Type ─── */}
              {!isEdit && step === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {TYPE_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const isSelected = form.type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                        className={cn(
                          'flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all hover:shadow-sm',
                          isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-muted-foreground/50'
                        )}
                      >
                        <div className={cn('p-2.5 rounded-xl border shrink-0', isSelected ? 'bg-primary/10 border-primary/20' : 'bg-muted border-border')}>
                          <Icon className={cn('h-6 w-6', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{opt.label}</div>
                          <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{opt.description}</div>
                        </div>
                        {isSelected && (
                          <div className="ml-auto shrink-0">
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ─── STEP: Basics ─── */}
              {step === basicsStepIdx && (
                <div className="space-y-5 max-w-lg">
                  <div className="space-y-2">
                    <Label>Event Name <span className="text-destructive">*</span></Label>
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
                  <div className="space-y-2">
                    <Label>URL Slug <span className="text-destructive">*</span></Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">/scheduler/</span>
                      <Input
                        placeholder="intro-call"
                        value={form.slug}
                        onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">This becomes your booking page URL</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="What is this meeting about? This will appear on your booking page."
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
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
                    <div className="space-y-2">
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
                    <div className="space-y-2">
                      <Label>
                        {form.location_type === 'phone' ? 'Phone Number' :
                         form.location_type === 'in_person' ? 'Address' : 'Custom URL / Details'}
                      </Label>
                      <Input
                        value={form.location_value}
                        onChange={e => setForm(f => ({ ...f, location_value: e.target.value }))}
                        placeholder={
                          form.location_type === 'phone' ? '+1 555 000 0000' :
                          form.location_type === 'in_person' ? '123 Main St, City' : 'https://...'
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ─── STEP: Hosts ─── */}
              {step === hostsStepIdx && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select who will host meetings for this event type. The first selected host will be the primary host.
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {employees.map(emp => {
                      const isSelected = form.host_employee_ids.includes(emp.id);
                      const idx = form.host_employee_ids.indexOf(emp.id);
                      return (
                        <button
                          key={emp.id}
                          onClick={() => setForm(f => ({
                            ...f,
                            host_employee_ids: isSelected
                              ? f.host_employee_ids.filter(i => i !== emp.id)
                              : [...f.host_employee_ids, emp.id],
                          }))}
                          className={cn(
                            'w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all',
                            isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:bg-muted/50 hover:border-muted-foreground/30'
                          )}
                        >
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0 border border-border">
                            {emp.first_name[0]}{emp.last_name?.[0] || ''}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground">
                              {emp.first_name} {emp.last_name}
                              {idx === 0 && <Badge variant="secondary" className="ml-2 text-xs">Primary</Badge>}
                            </div>
                            {emp.job_title && (
                              <div className="text-sm text-muted-foreground">{emp.job_title}</div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                    {employees.length === 0 && (
                      <p className="text-sm text-muted-foreground py-8 text-center">No active employees found.</p>
                    )}
                  </div>
                  {form.host_employee_ids.length === 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <p className="text-sm text-amber-700 dark:text-amber-400">⚠ Select at least one host to continue</p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── STEP: Availability ─── */}
              {step === availStepIdx && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Working Hours</Label>
                    {DAYS.map(day => {
                      const av = form.config.availability[day] as AvailabilityDay;
                      return (
                        <div key={day} className="flex items-center gap-4 py-2 border-b border-border/50 last:border-0">
                          <Switch
                            checked={av.enabled}
                            onCheckedChange={checked => setForm(f => ({
                              ...f,
                              config: {
                                ...f.config,
                                availability: { ...f.config.availability, [day]: { ...av, enabled: checked } },
                              },
                            }))}
                          />
                          <span className="w-24 text-sm font-medium text-foreground">{DAY_LABELS[day]}</span>
                          {av.enabled ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                type="time"
                                className="h-8 w-28"
                                value={av.start}
                                onChange={e => setForm(f => ({
                                  ...f,
                                  config: {
                                    ...f.config,
                                    availability: { ...f.config.availability, [day]: { ...av, start: e.target.value } },
                                  },
                                }))}
                              />
                              <span className="text-muted-foreground text-sm">–</span>
                              <Input
                                type="time"
                                className="h-8 w-28"
                                value={av.end}
                                onChange={e => setForm(f => ({
                                  ...f,
                                  config: {
                                    ...f.config,
                                    availability: { ...f.config.availability, [day]: { ...av, end: e.target.value } },
                                  },
                                }))}
                              />
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Unavailable</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    {[
                      { label: 'Buffer Before (min)', key: 'buffer_before_minutes', min: 0, max: 60, step: 5 },
                      { label: 'Buffer After (min)', key: 'buffer_after_minutes', min: 0, max: 60, step: 5 },
                      { label: 'Min Notice (hrs)', key: 'min_notice_hours', min: 0, max: 72, step: 1 },
                      { label: 'Max Days Ahead', key: 'max_days_in_advance', min: 1, max: 365, step: 1 },
                    ].map(({ label, key, min, max, step: stepVal }) => (
                      <div key={key} className="space-y-2">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          type="number"
                          min={min} max={max} step={stepVal}
                          value={(form.config.availability as any)[key]}
                          onChange={e => setForm(f => ({
                            ...f,
                            config: {
                              ...f.config,
                              availability: { ...f.config.availability, [key]: Number(e.target.value) },
                            },
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── STEP: Questions ─── */}
              {step === questionsStepIdx && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Name and Email are always collected. Add custom questions below.
                  </p>
                  <div className="space-y-2">
                    {[{ label: 'Name' }, { label: 'Email' }].map(q => (
                      <div key={q.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                        <span className="text-sm text-foreground font-medium flex-1">{q.label}</span>
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                        <span className="text-xs text-muted-foreground">Locked</span>
                      </div>
                    ))}
                  </div>

                  {form.config.questions.map((q, idx) => (
                    <div key={q.id} className="p-4 rounded-xl border border-border space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-2">
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
                          <div className="flex items-center gap-3">
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
                              <SelectTrigger className="h-8 text-xs w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Short text</SelectItem>
                                <SelectItem value="textarea">Long text</SelectItem>
                                <SelectItem value="radio">Single choice</SelectItem>
                              </SelectContent>
                            </Select>
                            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
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
                          className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
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
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
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

              {/* ─── STEP: Share ─── */}
              {step === shareStepIdx && (
                <div className="space-y-6">
                  {!saved ? (
                    <div className="text-center py-6">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-5">
                        <Check className="h-10 w-10 text-primary" />
                      </div>
                      <h2 className="text-xl font-bold text-foreground mb-2">
                        {isEdit ? 'Ready to save changes?' : 'Ready to create your event type?'}
                      </h2>
                      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                        Review your settings below and click "{isEdit ? 'Save Changes' : 'Create Event Type'}" to publish your booking page.
                      </p>

                      {/* Summary card */}
                      <div className="bg-muted/40 rounded-xl p-5 text-left space-y-3 mb-6 border border-border max-w-sm mx-auto">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Name</span>
                          <span className="font-medium text-foreground">{form.name || '—'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-medium text-foreground">{form.duration_minutes} min</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Location</span>
                          <span className="font-medium text-foreground capitalize">{form.location_type.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Hosts</span>
                          <span className="font-medium text-foreground">{form.host_employee_ids.length} selected</span>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="min-w-48"
                      >
                        {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Event Type'}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-5">
                        <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
                      </div>
                      <h2 className="text-xl font-bold text-foreground mb-2">
                        {isEdit ? 'Changes saved!' : 'Event type created!'}
                      </h2>
                      <p className="text-sm text-muted-foreground mb-6">
                        Share this link with anyone to let them book a meeting with you.
                      </p>

                      <div className="space-y-3 max-w-md mx-auto">
                        <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl border border-border">
                          <span className="text-sm text-foreground flex-1 truncate font-mono text-left">{bookingLink}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 gap-1.5"
                            onClick={() => { navigator.clipboard.writeText(bookingLink); toast.success('Link copied!'); }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </Button>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => window.open(bookingLink, '_blank', 'noopener,noreferrer')}
                          >
                            <ExternalLink className="h-4 w-4" />
                            Preview
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={() => navigate(`/org/${orgCode}/crm/scheduler`)}
                          >
                            Done
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation footer */}
            {!(step === shareStepIdx && saved) && (
              <div className="flex items-center justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => step === 0 ? navigate(`/org/${orgCode}/crm/scheduler`) : setStep(s => s - 1)}
                  className="gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {step === 0 ? 'Cancel' : 'Back'}
                </Button>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    Step {step + 1} of {STEPS.length}
                  </span>
                  {!isLastStep && (
                    <Button onClick={handleNext} className="gap-1.5">
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
