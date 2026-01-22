import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Calendar, Globe, Sparkles, Trash2, Edit2 } from 'lucide-react';
import { COUNTRIES, getFlagEmoji, getCountryNameFromCode } from '@/lib/countries';
import { toast } from 'sonner';
import { TemplateHolidayEditor } from './TemplateHolidayEditor';
import { AIHolidayTools } from './AIHolidayTools';

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
  created_at: string;
  updated_at: string;
}

interface CountryHolidayStats {
  countryCode: string;
  countryName: string;
  holidayCount: number;
  hasMovable: boolean;
}

export function TemplateHolidaysTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<TemplateHoliday | null>(null);

  // Fetch all template holidays
  const { data: holidays = [], isLoading: holidaysLoading } = useQuery({
    queryKey: ['template-holidays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_holidays')
        .select('*')
        .order('country_code')
        .order('sort_order');
      if (error) throw error;
      return data as TemplateHoliday[];
    },
  });

  // Compute country stats
  const countryStats: CountryHolidayStats[] = COUNTRIES.map(country => {
    const countryHolidays = holidays.filter(h => h.country_code === country.code);
    return {
      countryCode: country.code,
      countryName: country.name,
      holidayCount: countryHolidays.length,
      hasMovable: countryHolidays.some(h => h.is_movable),
    };
  }).sort((a, b) => b.holidayCount - a.holidayCount);

  // Filter countries by search
  const filteredCountries = countryStats.filter(c =>
    c.countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.countryCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get holidays for selected country
  const selectedCountryHolidays = selectedCountry
    ? holidays.filter(h => h.country_code === selectedCountry).sort((a, b) => a.sort_order - b.sort_order)
    : [];

  // Delete holiday mutation
  const deleteHolidayMutation = useMutation({
    mutationFn: async (holidayId: string) => {
      const { error } = await supabase
        .from('template_holidays')
        .delete()
        .eq('id', holidayId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-holidays'] });
      toast.success('Holiday deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete holiday: ' + error.message);
    },
  });

  const handleAddHoliday = () => {
    setEditingHoliday(null);
    setIsEditorOpen(true);
  };

  const handleEditHoliday = (holiday: TemplateHoliday) => {
    setEditingHoliday(holiday);
    setIsEditorOpen(true);
  };

  const handleDeleteHoliday = (holidayId: string) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      deleteHolidayMutation.mutate(holidayId);
    }
  };

  const countriesWithHolidays = countryStats.filter(c => c.holidayCount > 0).length;
  const totalHolidays = holidays.length;
  const countriesWithoutHolidays = COUNTRIES.length - countriesWithHolidays;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{countriesWithHolidays}</p>
                <p className="text-xs text-muted-foreground">Countries with holidays</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalHolidays}</p>
                <p className="text-xs text-muted-foreground">Total holidays</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{countriesWithoutHolidays}</p>
                <p className="text-xs text-muted-foreground">Countries missing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{countryStats.filter(c => c.hasMovable).length}</p>
                <p className="text-xs text-muted-foreground">With movable holidays</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Tools */}
      <AIHolidayTools
        holidays={holidays}
        countriesWithHolidays={countriesWithHolidays}
        totalCountries={COUNTRIES.length}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Country List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Countries</span>
              <Badge variant="secondary">{COUNTRIES.length}</Badge>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-1 p-2">
                {filteredCountries.map((country) => (
                  <button
                    key={country.countryCode}
                    onClick={() => setSelectedCountry(country.countryCode)}
                    className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-colors ${
                      selectedCountry === country.countryCode
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getFlagEmoji(country.countryCode)}</span>
                      <span className="text-sm font-medium truncate">{country.countryName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {country.holidayCount > 0 ? (
                        <Badge variant={selectedCountry === country.countryCode ? 'secondary' : 'default'} className="text-xs">
                          {country.holidayCount}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          0
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Holiday List for Selected Country */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              {selectedCountry ? (
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getFlagEmoji(selectedCountry)}</span>
                  <span>{getCountryNameFromCode(selectedCountry)} Holidays</span>
                </div>
              ) : (
                <span>Select a country</span>
              )}
              {selectedCountry && (
                <Button size="sm" onClick={handleAddHoliday}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Holiday
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedCountry ? (
              <div className="text-center text-muted-foreground py-12">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a country to view and manage its holidays</p>
              </div>
            ) : selectedCountryHolidays.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No holidays configured for this country</p>
                <Button variant="outline" className="mt-4" onClick={handleAddHoliday}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add First Holiday
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[450px]">
                <div className="space-y-2">
                  {selectedCountryHolidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{holiday.title}</span>
                          {holiday.title_local && (
                            <span className="text-sm text-muted-foreground">({holiday.title_local})</span>
                          )}
                          {holiday.is_movable && (
                            <Badge variant="outline" className="text-xs">
                              Movable
                            </Badge>
                          )}
                          {!holiday.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {holiday.day ? (
                            <span>
                              {new Date(2024, holiday.month - 1, holiday.day).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          ) : (
                            <span className="italic">{holiday.movable_rule || 'Date varies'}</span>
                          )}
                          {holiday.year && <span className="ml-2">({holiday.year})</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditHoliday(holiday)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteHoliday(holiday.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Holiday Editor Dialog */}
      <TemplateHolidayEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        holiday={editingHoliday}
        selectedCountryCode={selectedCountry}
      />
    </div>
  );
}
