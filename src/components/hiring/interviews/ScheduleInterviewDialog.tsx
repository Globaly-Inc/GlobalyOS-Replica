/**
 * Schedule Interview Dialog
 * Dialog to schedule an interview with a candidate
 */

import { useState } from 'react';
import { useScheduleInterview } from '@/services/useHiringMutations';
import { useEmployees } from '@/services/useEmployees';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, addDays, setHours, setMinutes } from 'date-fns';

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
}

const INTERVIEW_TYPES = [
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'video_call', label: 'Video Call' },
  { value: 'technical', label: 'Technical Interview' },
  { value: 'behavioral', label: 'Behavioral Interview' },
  { value: 'culture_fit', label: 'Culture Fit' },
  { value: 'final_round', label: 'Final Round' },
  { value: 'hiring_manager', label: 'Hiring Manager' },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
  applicationId,
}: ScheduleInterviewDialogProps) {
  const scheduleInterview = useScheduleInterview();
  const { data: employees } = useEmployees();

  const [interviewType, setInterviewType] = useState('video_call');
  const [date, setDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([]);

  const toggleInterviewer = (employeeId: string) => {
    setSelectedInterviewers(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSubmit = async () => {
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledAt = setMinutes(setHours(new Date(date), hours), minutes);

    await scheduleInterview.mutateAsync({
      application_id: applicationId,
      interview_type: interviewType,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: duration,
      location: location || undefined,
      meeting_link: meetingLink || undefined,
      interviewer_ids: selectedInterviewers,
    });

    onOpenChange(false);
    // Reset form
    setInterviewType('video_call');
    setDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    setTime('10:00');
    setDuration(60);
    setLocation('');
    setMeetingLink('');
    setSelectedInterviewers([]);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>
            Set up an interview with the candidate. They'll receive an email invitation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Interview Type */}
          <div className="space-y-2">
            <Label>Interview Type *</Label>
            <Select value={interviewType} onValueChange={setInterviewType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Conference Room A, Office Address"
            />
          </div>

          {/* Meeting Link */}
          <div className="space-y-2">
            <Label htmlFor="meetingLink">Meeting Link (Optional)</Label>
            <Input
              id="meetingLink"
              type="url"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>

          {/* Interviewers */}
          <div className="space-y-2">
            <Label>Interviewers *</Label>
            <ScrollArea className="h-40 border rounded-md p-2">
              <div className="space-y-2">
                {(employees as any)?.map((employee: any) => (
                  <label
                    key={employee.id}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedInterviewers.includes(employee.id)}
                      onCheckedChange={() => toggleInterviewer(employee.id)}
                    />
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={employee.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(employee.profiles?.full_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{employee.profiles?.full_name}</span>
                    {employee.position && (
                      <span className="text-xs text-muted-foreground">({employee.position})</span>
                    )}
                  </label>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {selectedInterviewers.length} interviewer(s) selected
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!date || !time || selectedInterviewers.length === 0 || scheduleInterview.isPending}
          >
            {scheduleInterview.isPending ? 'Scheduling...' : 'Schedule Interview'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
