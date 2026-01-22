import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { CountrySelector } from '@/components/ui/country-selector';
import { getCountryNameFromCode } from '@/lib/countries';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const holidaySchema = z.object({
  country_code: z.string().min(2, 'Country is required'),
  title: z.string().min(1, 'Title is required'),
  title_local: z.string().optional(),
  month: z.coerce.number().min(1).max(12),
  day: z.coerce.number().min(1).max(31).optional().nullable(),
  is_movable: z.boolean().default(false),
  movable_rule: z.string().optional(),
  year: z.coerce.number().optional().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().default(0),
});

type HolidayFormValues = z.infer<typeof holidaySchema>;

interface TemplateHoliday {
  id: string;
  country_code: string;
  country_name: string;
  title: string;
  title_local: string | null;
  month: number;
  day: number | null;
  is_movable: boolean;
  movable_rule: string | null;
  year: number | null;
  is_active: boolean;
  sort_order: number;
}

interface TemplateHolidayEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holiday: TemplateHoliday | null;
  selectedCountryCode: string | null;
}

export function TemplateHolidayEditor({
  open,
  onOpenChange,
  holiday,
  selectedCountryCode,
}: TemplateHolidayEditorProps) {
  const queryClient = useQueryClient();
  const isEditing = !!holiday;

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      country_code: selectedCountryCode || '',
      title: '',
      title_local: '',
      month: 1,
      day: 1,
      is_movable: false,
      movable_rule: '',
      year: null,
      is_active: true,
      sort_order: 0,
    },
  });

  // Reset form when dialog opens/closes or holiday changes
  useEffect(() => {
    if (open) {
      if (holiday) {
        form.reset({
          country_code: holiday.country_code,
          title: holiday.title,
          title_local: holiday.title_local || '',
          month: holiday.month,
          day: holiday.day,
          is_movable: holiday.is_movable,
          movable_rule: holiday.movable_rule || '',
          year: holiday.year,
          is_active: holiday.is_active,
          sort_order: holiday.sort_order,
        });
      } else {
        form.reset({
          country_code: selectedCountryCode || '',
          title: '',
          title_local: '',
          month: 1,
          day: 1,
          is_movable: false,
          movable_rule: '',
          year: null,
          is_active: true,
          sort_order: 0,
        });
      }
    }
  }, [open, holiday, selectedCountryCode, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: HolidayFormValues) => {
      const countryName = getCountryNameFromCode(values.country_code);
      
      const payload = {
        country_code: values.country_code,
        country_name: countryName,
        title: values.title,
        title_local: values.title_local || null,
        month: values.month,
        day: values.is_movable ? null : values.day,
        is_movable: values.is_movable,
        movable_rule: values.is_movable ? values.movable_rule : null,
        year: values.year || null,
        is_active: values.is_active,
        sort_order: values.sort_order,
      };

      if (isEditing && holiday) {
        const { error } = await supabase
          .from('template_holidays')
          .update(payload)
          .eq('id', holiday.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('template_holidays')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-holidays'] });
      toast.success(isEditing ? 'Holiday updated' : 'Holiday created');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to save holiday: ' + error.message);
    },
  });

  const onSubmit = (values: HolidayFormValues) => {
    saveMutation.mutate(values);
  };

  const isMovable = form.watch('is_movable');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="country_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <CountrySelector
                      value={field.value}
                      onChange={field.onChange}
                      valueType="code"
                      disabled={isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Holiday Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Christmas Day" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title_local"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Navidad" {...field} />
                  </FormControl>
                  <FormDescription>The holiday name in the local language</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={12} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isMovable && (
                <FormField
                  control={form.control}
                  name="day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          max={31} 
                          {...field} 
                          value={field.value ?? ''} 
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="is_movable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Movable Holiday</FormLabel>
                    <FormDescription>
                      Date changes each year (e.g., Easter, Eid)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {isMovable && (
              <FormField
                control={form.control}
                name="movable_rule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Description</FormLabel>
                    <FormControl>
                      <Input placeholder="First Monday after the first full moon after March 21" {...field} />
                    </FormControl>
                    <FormDescription>Describe how this holiday date is calculated</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specific Year (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Leave empty for every year" 
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormDescription>Set for year-specific movable holiday dates</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Include this holiday in new organization setups
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Add Holiday'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
