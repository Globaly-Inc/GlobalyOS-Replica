-- Create KPIs/OKRs table
CREATE TABLE public.kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT, -- e.g., '%', 'count', 'hours'
  quarter INTEGER NOT NULL, -- 1, 2, 3, 4
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'on_track' CHECK (status IN ('on_track', 'at_risk', 'behind', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI insights cache table
CREATE TABLE public.kpi_ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quarter INTEGER NOT NULL,
  year INTEGER NOT NULL,
  insights JSONB NOT NULL, -- { trends: [], focus_areas: [], recommendations: [] }
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, quarter, year)
);

-- Create performance reviews table
CREATE TABLE public.performance_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.employees(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'submitted', 'completed')),
  what_went_well TEXT,
  needs_improvement TEXT,
  goals_next_period TEXT,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  ai_draft JSONB, -- { what_went_well: '', needs_improvement: '', goals: '', summary: '' }
  ai_draft_generated_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

-- KPIs policies
CREATE POLICY "Users can view own KPIs" ON public.kpis
FOR SELECT USING (is_own_employee(employee_id));

CREATE POLICY "Managers can view direct reports KPIs" ON public.kpis
FOR SELECT USING (is_manager_of_employee(employee_id));

CREATE POLICY "HR and admins can manage all KPIs" ON public.kpis
FOR ALL USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own KPIs progress" ON public.kpis
FOR UPDATE USING (is_own_employee(employee_id));

-- AI Insights policies
CREATE POLICY "Users can view own AI insights" ON public.kpi_ai_insights
FOR SELECT USING (is_own_employee(employee_id));

CREATE POLICY "Managers can view direct reports AI insights" ON public.kpi_ai_insights
FOR SELECT USING (is_manager_of_employee(employee_id));

CREATE POLICY "HR and admins can manage AI insights" ON public.kpi_ai_insights
FOR ALL USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert AI insights" ON public.kpi_ai_insights
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update AI insights" ON public.kpi_ai_insights
FOR UPDATE USING (true);

-- Performance reviews policies
CREATE POLICY "Users can view own reviews" ON public.performance_reviews
FOR SELECT USING (is_own_employee(employee_id));

CREATE POLICY "Reviewers can view and manage their reviews" ON public.performance_reviews
FOR ALL USING (is_own_employee(reviewer_id))
WITH CHECK (is_own_employee(reviewer_id));

CREATE POLICY "Managers can view direct reports reviews" ON public.performance_reviews
FOR SELECT USING (is_manager_of_employee(employee_id));

CREATE POLICY "HR and admins can manage all reviews" ON public.performance_reviews
FOR ALL USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_kpis_employee_quarter ON public.kpis(employee_id, year, quarter);
CREATE INDEX idx_kpi_insights_employee ON public.kpi_ai_insights(employee_id, year, quarter);
CREATE INDEX idx_performance_reviews_employee ON public.performance_reviews(employee_id, review_period_start);