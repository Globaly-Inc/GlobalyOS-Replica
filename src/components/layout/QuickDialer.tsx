import { useState } from 'react';
import { Phone, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrgPhoneNumbers } from '@/hooks/useTelephony';

interface QuickDialerProps {
  organizationId: string | undefined;
}

const DIAL_PAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

export const QuickDialer = ({ organizationId }: QuickDialerProps) => {
  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('+');
  const [selectedNumberId, setSelectedNumberId] = useState<string>('');
  const [calling, setCalling] = useState(false);
  const { data: orgPhoneNumbers = [] } = useOrgPhoneNumbers();

  const activeNumbers = orgPhoneNumbers.filter((n: any) => n.status === 'active');

  const handleDigitPress = (digit: string) => {
    setPhoneNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => (prev.length > 1 ? prev.slice(0, -1) : '+'));
  };

  const isValid = phoneNumber.startsWith('+') && phoneNumber.replace(/\D/g, '').length >= 10;

  const handleCall = async () => {
    if (!organizationId || !isValid) return;

    setCalling(true);
    try {
      const body: Record<string, string> = {
        to_number: phoneNumber,
        organization_id: organizationId,
      };
      if (selectedNumberId) {
        body.phone_number_id = selectedNumberId;
      }

      const { data, error } = await supabase.functions.invoke('twilio-outbound-call', { body });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Call initiated successfully');
      setOpen(false);
      setPhoneNumber('+');
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate call');
    } finally {
      setCalling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Phone className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Phone Dialer</p>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle>Make a Call</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {activeNumbers.length > 1 && (
            <Select value={selectedNumberId} onValueChange={setSelectedNumberId}>
              <SelectTrigger>
                <SelectValue placeholder="Select caller ID" />
              </SelectTrigger>
              <SelectContent>
                {activeNumbers.map((num: any) => (
                  <SelectItem key={num.id} value={num.id}>
                    {num.friendly_name || num.phone_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 555 123 4567"
            className="text-center text-lg font-mono tracking-wider"
          />

          <div className="grid grid-cols-3 gap-2">
            {DIAL_PAD.map((row) =>
              row.map((digit) => (
                <Button
                  key={digit}
                  variant="outline"
                  className="h-12 text-lg font-semibold"
                  onClick={() => handleDigitPress(digit)}
                >
                  {digit}
                </Button>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleBackspace}
            >
              <Delete className="h-4 w-4 mr-1" />
              Backspace
            </Button>
          </div>

          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={!isValid || calling}
            onClick={handleCall}
          >
            <Phone className="h-4 w-4 mr-2" />
            {calling ? 'Calling…' : 'Call'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
