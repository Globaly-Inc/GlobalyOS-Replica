/**
 * Post Poll Component
 * Displays poll with voting functionality
 */

import { useState } from 'react';
import { usePollVotes, usePollVote } from '@/services/useSocialFeed';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Check, Clock, Users } from 'lucide-react';
import { formatDistanceToNow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PollOption {
  id: string;
  option_text: string;
  sort_order: number;
}

interface Poll {
  id: string;
  question: string;
  allow_multiple: boolean;
  ends_at: string | null;
  is_anonymous: boolean;
  poll_options: PollOption[];
}

interface PostPollProps {
  poll: Poll;
}

export const PostPoll = ({ poll }: PostPollProps) => {
  const { data: currentEmployee } = useCurrentEmployee();
  const { toast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const isExpired = poll.ends_at && isPast(new Date(poll.ends_at));

  // Use centralized hooks
  const { data: votesData = [] } = usePollVotes(poll.id);
  const submitVote = usePollVote();

  const totalVoters = new Set(votesData.map(v => v.employee_id)).size;
  const hasVoted = votesData.some(v => v.employee_id === currentEmployee?.id);
  const userVotes = votesData.filter(v => v.employee_id === currentEmployee?.id).map(v => v.option_id);

  // Calculate vote counts per option
  const voteCounts = poll.poll_options.reduce((acc, opt) => {
    acc[opt.id] = votesData.filter(v => v.option_id === opt.id).length;
    return acc;
  }, {} as Record<string, number>);

  const maxVotes = Math.max(...Object.values(voteCounts), 1);

  const handleVote = () => {
    if (selectedOptions.length === 0) {
      toast({
        title: 'Select an option',
        description: 'Please select at least one option to vote',
        variant: 'destructive',
      });
      return;
    }
    submitVote.mutate({ pollId: poll.id, optionIds: selectedOptions }, {
      onSuccess: () => setSelectedOptions([]),
    });
  };

  const handleOptionChange = (optionId: string, checked: boolean) => {
    if (poll.allow_multiple) {
      setSelectedOptions(prev =>
        checked ? [...prev, optionId] : prev.filter(id => id !== optionId)
      );
    } else {
      setSelectedOptions(checked ? [optionId] : []);
    }
  };

  const showResults = hasVoted || isExpired;

  return (
    <div className="border border-border rounded-lg p-4 bg-muted/30">
      <h4 className="font-medium mb-3">{poll.question}</h4>

      <div className="space-y-2">
        {poll.poll_options
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((option) => {
            const count = voteCounts[option.id] || 0;
            const percentage = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
            const isUserVote = userVotes.includes(option.id);
            const isLeading = count === maxVotes && count > 0;

            if (showResults) {
              return (
                <div key={option.id} className="relative">
                  <div className="relative z-10 flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                    <div className="flex items-center gap-2">
                      {isUserVote && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                      <span className={cn(isLeading && "font-medium")}>{option.option_text}</span>
                    </div>
                    <span className={cn("text-sm", isLeading ? "font-semibold" : "text-muted-foreground")}>
                      {percentage}%
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-lg",
                      isLeading ? "bg-primary/20" : "bg-muted"
                    )}
                  />
                </div>
              );
            }

            return (
              <div
                key={option.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedOptions.includes(option.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => handleOptionChange(option.id, !selectedOptions.includes(option.id))}
              >
                {poll.allow_multiple ? (
                  <Checkbox
                    checked={selectedOptions.includes(option.id)}
                    onCheckedChange={(checked) => handleOptionChange(option.id, !!checked)}
                  />
                ) : (
                  <RadioGroup value={selectedOptions[0] || ''}>
                    <RadioGroupItem value={option.id} />
                  </RadioGroup>
                )}
                <Label className="flex-1 cursor-pointer">{option.option_text}</Label>
              </div>
            );
          })}
      </div>

      {/* Vote button and info */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {totalVoters} {totalVoters === 1 ? 'vote' : 'votes'}
          </span>
          {poll.ends_at && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {isExpired 
                ? 'Ended' 
                : `Ends ${formatDistanceToNow(new Date(poll.ends_at), { addSuffix: true })}`
              }
            </span>
          )}
          {poll.is_anonymous && (
            <span className="text-xs">Anonymous poll</span>
          )}
        </div>

        {!showResults && !isExpired && (
          <Button
            size="sm"
            onClick={handleVote}
            disabled={selectedOptions.length === 0 || submitVote.isPending}
          >
            Vote
          </Button>
        )}
      </div>
    </div>
  );
};
