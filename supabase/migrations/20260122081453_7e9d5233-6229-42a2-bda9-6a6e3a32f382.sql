-- Create template_holidays table for storing country-specific public holiday templates
CREATE TABLE public.template_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  title TEXT NOT NULL,
  title_local TEXT,
  month INTEGER NOT NULL,
  day INTEGER,
  is_movable BOOLEAN DEFAULT false,
  movable_rule TEXT,
  year INTEGER,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique index to handle NULL years properly
CREATE UNIQUE INDEX idx_template_holidays_unique ON public.template_holidays(country_code, title, COALESCE(year, 0));

-- Add validation trigger
CREATE OR REPLACE FUNCTION public.validate_template_holiday()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.month < 1 OR NEW.month > 12 THEN
    RAISE EXCEPTION 'Month must be between 1 and 12';
  END IF;
  IF NEW.day IS NOT NULL AND (NEW.day < 1 OR NEW.day > 31) THEN
    RAISE EXCEPTION 'Day must be between 1 and 31';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_template_holiday_trigger
BEFORE INSERT OR UPDATE ON public.template_holidays
FOR EACH ROW EXECUTE FUNCTION public.validate_template_holiday();

-- Create template_holiday_generations table for tracking AI updates
CREATE TABLE public.template_holiday_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  year INTEGER NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'completed',
  notes TEXT,
  UNIQUE(country_code, year)
);

-- Create indexes for common queries
CREATE INDEX idx_template_holidays_country ON public.template_holidays(country_code);
CREATE INDEX idx_template_holidays_active ON public.template_holidays(is_active) WHERE is_active = true;
CREATE INDEX idx_template_holiday_generations_country_year ON public.template_holiday_generations(country_code, year);

-- Enable RLS
ALTER TABLE public.template_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_holiday_generations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role can manage template_holidays"
ON public.template_holidays FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read template_holidays"
ON public.template_holidays FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage template_holiday_generations"
ON public.template_holiday_generations FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read template_holiday_generations"
ON public.template_holiday_generations FOR SELECT TO authenticated USING (true);

-- Seed initial data - United States
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('US', 'United States', 'New Year''s Day', 1, 1, 1),
('US', 'United States', 'Martin Luther King Jr. Day', 1, 20, 2),
('US', 'United States', 'Presidents'' Day', 2, 17, 3),
('US', 'United States', 'Memorial Day', 5, 26, 4),
('US', 'United States', 'Independence Day', 7, 4, 5),
('US', 'United States', 'Labor Day', 9, 1, 6),
('US', 'United States', 'Columbus Day', 10, 13, 7),
('US', 'United States', 'Veterans Day', 11, 11, 8),
('US', 'United States', 'Thanksgiving Day', 11, 27, 9),
('US', 'United States', 'Christmas Day', 12, 25, 10);

-- United Kingdom
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('GB', 'United Kingdom', 'New Year''s Day', 1, 1, 1),
('GB', 'United Kingdom', 'Good Friday', 4, 18, 2),
('GB', 'United Kingdom', 'Easter Monday', 4, 21, 3),
('GB', 'United Kingdom', 'Early May Bank Holiday', 5, 5, 4),
('GB', 'United Kingdom', 'Spring Bank Holiday', 5, 26, 5),
('GB', 'United Kingdom', 'Summer Bank Holiday', 8, 25, 6),
('GB', 'United Kingdom', 'Christmas Day', 12, 25, 7),
('GB', 'United Kingdom', 'Boxing Day', 12, 26, 8);

-- Germany
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('DE', 'Germany', 'New Year''s Day', 1, 1, 1),
('DE', 'Germany', 'Good Friday', 4, 18, 2),
('DE', 'Germany', 'Easter Monday', 4, 21, 3),
('DE', 'Germany', 'Labour Day', 5, 1, 4),
('DE', 'Germany', 'Ascension Day', 5, 29, 5),
('DE', 'Germany', 'Whit Monday', 6, 9, 6),
('DE', 'Germany', 'German Unity Day', 10, 3, 7),
('DE', 'Germany', 'Christmas Day', 12, 25, 8),
('DE', 'Germany', 'St. Stephen''s Day', 12, 26, 9);

-- France
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('FR', 'France', 'New Year''s Day', 1, 1, 1),
('FR', 'France', 'Easter Monday', 4, 21, 2),
('FR', 'France', 'Labour Day', 5, 1, 3),
('FR', 'France', 'Victory in Europe Day', 5, 8, 4),
('FR', 'France', 'Ascension Day', 5, 29, 5),
('FR', 'France', 'Whit Monday', 6, 9, 6),
('FR', 'France', 'Bastille Day', 7, 14, 7),
('FR', 'France', 'Assumption of Mary', 8, 15, 8),
('FR', 'France', 'All Saints'' Day', 11, 1, 9),
('FR', 'France', 'Armistice Day', 11, 11, 10),
('FR', 'France', 'Christmas Day', 12, 25, 11);

-- Canada
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('CA', 'Canada', 'New Year''s Day', 1, 1, 1),
('CA', 'Canada', 'Good Friday', 4, 18, 2),
('CA', 'Canada', 'Victoria Day', 5, 19, 3),
('CA', 'Canada', 'Canada Day', 7, 1, 4),
('CA', 'Canada', 'Labour Day', 9, 1, 5),
('CA', 'Canada', 'Thanksgiving Day', 10, 13, 6),
('CA', 'Canada', 'Remembrance Day', 11, 11, 7),
('CA', 'Canada', 'Christmas Day', 12, 25, 8),
('CA', 'Canada', 'Boxing Day', 12, 26, 9);

-- Australia
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('AU', 'Australia', 'New Year''s Day', 1, 1, 1),
('AU', 'Australia', 'Australia Day', 1, 26, 2),
('AU', 'Australia', 'Good Friday', 4, 18, 3),
('AU', 'Australia', 'Easter Saturday', 4, 19, 4),
('AU', 'Australia', 'Easter Monday', 4, 21, 5),
('AU', 'Australia', 'Anzac Day', 4, 25, 6),
('AU', 'Australia', 'Queen''s Birthday', 6, 9, 7),
('AU', 'Australia', 'Christmas Day', 12, 25, 8),
('AU', 'Australia', 'Boxing Day', 12, 26, 9);

-- India
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('IN', 'India', 'Republic Day', 1, 26, 1),
('IN', 'India', 'Holi', 3, 14, 2),
('IN', 'India', 'Good Friday', 4, 18, 3),
('IN', 'India', 'Independence Day', 8, 15, 4),
('IN', 'India', 'Gandhi Jayanti', 10, 2, 5),
('IN', 'India', 'Diwali', 10, 20, 6),
('IN', 'India', 'Christmas Day', 12, 25, 7);

-- Japan
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('JP', 'Japan', 'New Year''s Day', 1, 1, 1),
('JP', 'Japan', 'Coming of Age Day', 1, 13, 2),
('JP', 'Japan', 'National Foundation Day', 2, 11, 3),
('JP', 'Japan', 'Emperor''s Birthday', 2, 23, 4),
('JP', 'Japan', 'Vernal Equinox Day', 3, 20, 5),
('JP', 'Japan', 'Showa Day', 4, 29, 6),
('JP', 'Japan', 'Constitution Memorial Day', 5, 3, 7),
('JP', 'Japan', 'Greenery Day', 5, 4, 8),
('JP', 'Japan', 'Children''s Day', 5, 5, 9),
('JP', 'Japan', 'Marine Day', 7, 21, 10),
('JP', 'Japan', 'Mountain Day', 8, 11, 11),
('JP', 'Japan', 'Respect for the Aged Day', 9, 15, 12),
('JP', 'Japan', 'Autumnal Equinox Day', 9, 23, 13),
('JP', 'Japan', 'Sports Day', 10, 13, 14),
('JP', 'Japan', 'Culture Day', 11, 3, 15),
('JP', 'Japan', 'Labour Thanksgiving Day', 11, 23, 16);

-- China
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('CN', 'China', 'New Year''s Day', 1, 1, 1),
('CN', 'China', 'Chinese New Year', 1, 29, 2),
('CN', 'China', 'Qingming Festival', 4, 4, 3),
('CN', 'China', 'Labour Day', 5, 1, 4),
('CN', 'China', 'Dragon Boat Festival', 6, 2, 5),
('CN', 'China', 'Mid-Autumn Festival', 9, 17, 6),
('CN', 'China', 'National Day', 10, 1, 7);

-- Brazil
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('BR', 'Brazil', 'New Year''s Day', 1, 1, 1),
('BR', 'Brazil', 'Carnival', 3, 4, 2),
('BR', 'Brazil', 'Good Friday', 4, 18, 3),
('BR', 'Brazil', 'Tiradentes Day', 4, 21, 4),
('BR', 'Brazil', 'Labour Day', 5, 1, 5),
('BR', 'Brazil', 'Corpus Christi', 6, 19, 6),
('BR', 'Brazil', 'Independence Day', 9, 7, 7),
('BR', 'Brazil', 'Our Lady of Aparecida', 10, 12, 8),
('BR', 'Brazil', 'All Souls'' Day', 11, 2, 9),
('BR', 'Brazil', 'Republic Day', 11, 15, 10),
('BR', 'Brazil', 'Christmas Day', 12, 25, 11);

-- UAE
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('AE', 'United Arab Emirates', 'New Year''s Day', 1, 1, 1),
('AE', 'United Arab Emirates', 'Eid al-Fitr', 3, 30, 2),
('AE', 'United Arab Emirates', 'Eid al-Adha', 6, 6, 3),
('AE', 'United Arab Emirates', 'Islamic New Year', 6, 26, 4),
('AE', 'United Arab Emirates', 'Prophet''s Birthday', 9, 4, 5),
('AE', 'United Arab Emirates', 'Commemoration Day', 11, 30, 6),
('AE', 'United Arab Emirates', 'National Day', 12, 2, 7);

-- Singapore
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('SG', 'Singapore', 'New Year''s Day', 1, 1, 1),
('SG', 'Singapore', 'Chinese New Year', 1, 29, 2),
('SG', 'Singapore', 'Good Friday', 4, 18, 3),
('SG', 'Singapore', 'Labour Day', 5, 1, 4),
('SG', 'Singapore', 'Vesak Day', 5, 12, 5),
('SG', 'Singapore', 'Hari Raya Puasa', 3, 30, 6),
('SG', 'Singapore', 'Hari Raya Haji', 6, 6, 7),
('SG', 'Singapore', 'National Day', 8, 9, 8),
('SG', 'Singapore', 'Deepavali', 10, 20, 9),
('SG', 'Singapore', 'Christmas Day', 12, 25, 10);

-- Netherlands
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('NL', 'Netherlands', 'New Year''s Day', 1, 1, 1),
('NL', 'Netherlands', 'Good Friday', 4, 18, 2),
('NL', 'Netherlands', 'Easter Sunday', 4, 20, 3),
('NL', 'Netherlands', 'Easter Monday', 4, 21, 4),
('NL', 'Netherlands', 'King''s Day', 4, 27, 5),
('NL', 'Netherlands', 'Liberation Day', 5, 5, 6),
('NL', 'Netherlands', 'Ascension Day', 5, 29, 7),
('NL', 'Netherlands', 'Whit Sunday', 6, 8, 8),
('NL', 'Netherlands', 'Whit Monday', 6, 9, 9),
('NL', 'Netherlands', 'Christmas Day', 12, 25, 10),
('NL', 'Netherlands', 'Second Christmas Day', 12, 26, 11);

-- Spain
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('ES', 'Spain', 'New Year''s Day', 1, 1, 1),
('ES', 'Spain', 'Epiphany', 1, 6, 2),
('ES', 'Spain', 'Good Friday', 4, 18, 3),
('ES', 'Spain', 'Labour Day', 5, 1, 4),
('ES', 'Spain', 'Assumption of Mary', 8, 15, 5),
('ES', 'Spain', 'Hispanic Day', 10, 12, 6),
('ES', 'Spain', 'All Saints'' Day', 11, 1, 7),
('ES', 'Spain', 'Constitution Day', 12, 6, 8),
('ES', 'Spain', 'Immaculate Conception', 12, 8, 9),
('ES', 'Spain', 'Christmas Day', 12, 25, 10);

-- Italy
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('IT', 'Italy', 'New Year''s Day', 1, 1, 1),
('IT', 'Italy', 'Epiphany', 1, 6, 2),
('IT', 'Italy', 'Easter Monday', 4, 21, 3),
('IT', 'Italy', 'Liberation Day', 4, 25, 4),
('IT', 'Italy', 'Labour Day', 5, 1, 5),
('IT', 'Italy', 'Republic Day', 6, 2, 6),
('IT', 'Italy', 'Assumption of Mary', 8, 15, 7),
('IT', 'Italy', 'All Saints'' Day', 11, 1, 8),
('IT', 'Italy', 'Immaculate Conception', 12, 8, 9),
('IT', 'Italy', 'Christmas Day', 12, 25, 10),
('IT', 'Italy', 'St. Stephen''s Day', 12, 26, 11);

-- South Korea
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('KR', 'South Korea', 'New Year''s Day', 1, 1, 1),
('KR', 'South Korea', 'Seollal', 1, 29, 2),
('KR', 'South Korea', 'Independence Movement Day', 3, 1, 3),
('KR', 'South Korea', 'Children''s Day', 5, 5, 4),
('KR', 'South Korea', 'Buddha''s Birthday', 5, 5, 5),
('KR', 'South Korea', 'Memorial Day', 6, 6, 6),
('KR', 'South Korea', 'Liberation Day', 8, 15, 7),
('KR', 'South Korea', 'Chuseok', 10, 6, 8),
('KR', 'South Korea', 'National Foundation Day', 10, 3, 9),
('KR', 'South Korea', 'Hangul Day', 10, 9, 10),
('KR', 'South Korea', 'Christmas Day', 12, 25, 11);

-- Mexico
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('MX', 'Mexico', 'New Year''s Day', 1, 1, 1),
('MX', 'Mexico', 'Constitution Day', 2, 3, 2),
('MX', 'Mexico', 'Benito Juarez Birthday', 3, 17, 3),
('MX', 'Mexico', 'Labour Day', 5, 1, 4),
('MX', 'Mexico', 'Independence Day', 9, 16, 5),
('MX', 'Mexico', 'Revolution Day', 11, 17, 6),
('MX', 'Mexico', 'Christmas Day', 12, 25, 7);

-- South Africa
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('ZA', 'South Africa', 'New Year''s Day', 1, 1, 1),
('ZA', 'South Africa', 'Human Rights Day', 3, 21, 2),
('ZA', 'South Africa', 'Good Friday', 4, 18, 3),
('ZA', 'South Africa', 'Family Day', 4, 21, 4),
('ZA', 'South Africa', 'Freedom Day', 4, 27, 5),
('ZA', 'South Africa', 'Workers Day', 5, 1, 6),
('ZA', 'South Africa', 'Youth Day', 6, 16, 7),
('ZA', 'South Africa', 'National Womens Day', 8, 9, 8),
('ZA', 'South Africa', 'Heritage Day', 9, 24, 9),
('ZA', 'South Africa', 'Day of Reconciliation', 12, 16, 10),
('ZA', 'South Africa', 'Christmas Day', 12, 25, 11),
('ZA', 'South Africa', 'Day of Goodwill', 12, 26, 12);

-- Ireland
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('IE', 'Ireland', 'New Year''s Day', 1, 1, 1),
('IE', 'Ireland', 'St. Brigids Day', 2, 3, 2),
('IE', 'Ireland', 'St. Patricks Day', 3, 17, 3),
('IE', 'Ireland', 'Easter Monday', 4, 21, 4),
('IE', 'Ireland', 'May Day', 5, 5, 5),
('IE', 'Ireland', 'June Bank Holiday', 6, 2, 6),
('IE', 'Ireland', 'August Bank Holiday', 8, 4, 7),
('IE', 'Ireland', 'October Bank Holiday', 10, 27, 8),
('IE', 'Ireland', 'Christmas Day', 12, 25, 9),
('IE', 'Ireland', 'St. Stephens Day', 12, 26, 10);

-- Poland
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('PL', 'Poland', 'New Year''s Day', 1, 1, 1),
('PL', 'Poland', 'Epiphany', 1, 6, 2),
('PL', 'Poland', 'Easter Monday', 4, 21, 3),
('PL', 'Poland', 'Labour Day', 5, 1, 4),
('PL', 'Poland', 'Constitution Day', 5, 3, 5),
('PL', 'Poland', 'Corpus Christi', 6, 19, 6),
('PL', 'Poland', 'Assumption of Mary', 8, 15, 7),
('PL', 'Poland', 'All Saints Day', 11, 1, 8),
('PL', 'Poland', 'Independence Day', 11, 11, 9),
('PL', 'Poland', 'Christmas Day', 12, 25, 10),
('PL', 'Poland', 'Second Christmas Day', 12, 26, 11);

-- Sweden
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('SE', 'Sweden', 'New Year''s Day', 1, 1, 1),
('SE', 'Sweden', 'Epiphany', 1, 6, 2),
('SE', 'Sweden', 'Good Friday', 4, 18, 3),
('SE', 'Sweden', 'Easter Monday', 4, 21, 4),
('SE', 'Sweden', 'Labour Day', 5, 1, 5),
('SE', 'Sweden', 'Ascension Day', 5, 29, 6),
('SE', 'Sweden', 'National Day', 6, 6, 7),
('SE', 'Sweden', 'Midsummer Day', 6, 21, 8),
('SE', 'Sweden', 'All Saints Day', 11, 1, 9),
('SE', 'Sweden', 'Christmas Day', 12, 25, 10),
('SE', 'Sweden', 'Boxing Day', 12, 26, 11);

-- Norway
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('NO', 'Norway', 'New Year''s Day', 1, 1, 1),
('NO', 'Norway', 'Maundy Thursday', 4, 17, 2),
('NO', 'Norway', 'Good Friday', 4, 18, 3),
('NO', 'Norway', 'Easter Monday', 4, 21, 4),
('NO', 'Norway', 'Labour Day', 5, 1, 5),
('NO', 'Norway', 'Constitution Day', 5, 17, 6),
('NO', 'Norway', 'Ascension Day', 5, 29, 7),
('NO', 'Norway', 'Whit Monday', 6, 9, 8),
('NO', 'Norway', 'Christmas Day', 12, 25, 9),
('NO', 'Norway', 'Boxing Day', 12, 26, 10);

-- Switzerland
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('CH', 'Switzerland', 'New Year''s Day', 1, 1, 1),
('CH', 'Switzerland', 'Good Friday', 4, 18, 2),
('CH', 'Switzerland', 'Easter Monday', 4, 21, 3),
('CH', 'Switzerland', 'Ascension Day', 5, 29, 4),
('CH', 'Switzerland', 'Whit Monday', 6, 9, 5),
('CH', 'Switzerland', 'National Day', 8, 1, 6),
('CH', 'Switzerland', 'Christmas Day', 12, 25, 7),
('CH', 'Switzerland', 'St. Stephens Day', 12, 26, 8);

-- Austria
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('AT', 'Austria', 'New Year''s Day', 1, 1, 1),
('AT', 'Austria', 'Epiphany', 1, 6, 2),
('AT', 'Austria', 'Easter Monday', 4, 21, 3),
('AT', 'Austria', 'Labour Day', 5, 1, 4),
('AT', 'Austria', 'Ascension Day', 5, 29, 5),
('AT', 'Austria', 'Whit Monday', 6, 9, 6),
('AT', 'Austria', 'Corpus Christi', 6, 19, 7),
('AT', 'Austria', 'Assumption of Mary', 8, 15, 8),
('AT', 'Austria', 'National Day', 10, 26, 9),
('AT', 'Austria', 'All Saints Day', 11, 1, 10),
('AT', 'Austria', 'Immaculate Conception', 12, 8, 11),
('AT', 'Austria', 'Christmas Day', 12, 25, 12),
('AT', 'Austria', 'St. Stephens Day', 12, 26, 13);

-- Belgium
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('BE', 'Belgium', 'New Year''s Day', 1, 1, 1),
('BE', 'Belgium', 'Easter Monday', 4, 21, 2),
('BE', 'Belgium', 'Labour Day', 5, 1, 3),
('BE', 'Belgium', 'Ascension Day', 5, 29, 4),
('BE', 'Belgium', 'Whit Monday', 6, 9, 5),
('BE', 'Belgium', 'National Day', 7, 21, 6),
('BE', 'Belgium', 'Assumption of Mary', 8, 15, 7),
('BE', 'Belgium', 'All Saints Day', 11, 1, 8),
('BE', 'Belgium', 'Armistice Day', 11, 11, 9),
('BE', 'Belgium', 'Christmas Day', 12, 25, 10);

-- Portugal
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('PT', 'Portugal', 'New Year''s Day', 1, 1, 1),
('PT', 'Portugal', 'Good Friday', 4, 18, 2),
('PT', 'Portugal', 'Easter Sunday', 4, 20, 3),
('PT', 'Portugal', 'Freedom Day', 4, 25, 4),
('PT', 'Portugal', 'Labour Day', 5, 1, 5),
('PT', 'Portugal', 'Corpus Christi', 6, 19, 6),
('PT', 'Portugal', 'Portugal Day', 6, 10, 7),
('PT', 'Portugal', 'Assumption of Mary', 8, 15, 8),
('PT', 'Portugal', 'Republic Day', 10, 5, 9),
('PT', 'Portugal', 'All Saints Day', 11, 1, 10),
('PT', 'Portugal', 'Independence Day', 12, 1, 11),
('PT', 'Portugal', 'Immaculate Conception', 12, 8, 12),
('PT', 'Portugal', 'Christmas Day', 12, 25, 13);

-- New Zealand
INSERT INTO public.template_holidays (country_code, country_name, title, month, day, sort_order) VALUES
('NZ', 'New Zealand', 'New Year''s Day', 1, 1, 1),
('NZ', 'New Zealand', 'Day After New Year', 1, 2, 2),
('NZ', 'New Zealand', 'Waitangi Day', 2, 6, 3),
('NZ', 'New Zealand', 'Good Friday', 4, 18, 4),
('NZ', 'New Zealand', 'Easter Monday', 4, 21, 5),
('NZ', 'New Zealand', 'Anzac Day', 4, 25, 6),
('NZ', 'New Zealand', 'King''s Birthday', 6, 2, 7),
('NZ', 'New Zealand', 'Matariki', 6, 20, 8),
('NZ', 'New Zealand', 'Labour Day', 10, 27, 9),
('NZ', 'New Zealand', 'Christmas Day', 12, 25, 10),
('NZ', 'New Zealand', 'Boxing Day', 12, 26, 11);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_template_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_holidays_updated_at_trigger
BEFORE UPDATE ON public.template_holidays
FOR EACH ROW EXECUTE FUNCTION public.update_template_holidays_updated_at();