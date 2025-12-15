-- Testing Infrastructure Tables

-- Test runs table to track test executions
CREATE TABLE public.test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'passed', 'failed', 'error', 'cancelled')),
  test_type TEXT NOT NULL CHECK (test_type IN ('unit', 'integration', 'security', 'e2e', 'all')),
  total_tests INTEGER DEFAULT 0,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  skipped_tests INTEGER DEFAULT 0,
  duration_ms INTEGER,
  triggered_by UUID REFERENCES auth.users(id),
  environment TEXT DEFAULT 'development',
  git_commit TEXT,
  git_branch TEXT,
  summary JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual test results
CREATE TABLE public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_file TEXT NOT NULL,
  test_suite TEXT,
  test_category TEXT NOT NULL CHECK (test_category IN ('unit', 'integration', 'security', 'e2e', 'component')),
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'skipped', 'pending')),
  duration_ms INTEGER,
  error_message TEXT,
  stack_trace TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Security-specific test runs
CREATE TABLE public.security_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'passed', 'failed', 'error')),
  test_type TEXT NOT NULL CHECK (test_type IN ('rls', 'injection', 'isolation', 'all')),
  total_tests INTEGER DEFAULT 0,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  critical_failures INTEGER DEFAULT 0,
  triggered_by UUID REFERENCES auth.users(id),
  summary JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Security test results
CREATE TABLE public.security_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.security_test_runs(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_category TEXT NOT NULL CHECK (test_category IN ('rls', 'injection', 'isolation', 'auth', 'permission')),
  table_name TEXT,
  policy_name TEXT,
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'skipped')),
  duration_ms INTEGER,
  error_message TEXT,
  attack_vector TEXT,
  expected_result TEXT,
  actual_result TEXT,
  recommendation TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Code coverage reports
CREATE TABLE public.coverage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID REFERENCES public.test_runs(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  summary JSONB NOT NULL, -- { lines: %, functions: %, branches: %, statements: % }
  file_coverage JSONB NOT NULL, -- Detailed per-file coverage
  uncovered_lines JSONB, -- List of uncovered lines per file
  thresholds JSONB, -- Configured thresholds
  meets_thresholds BOOLEAN DEFAULT true,
  trend_data JSONB, -- Comparison with previous runs
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Visual regression snapshots
CREATE TABLE public.visual_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID REFERENCES public.test_runs(id) ON DELETE CASCADE,
  page_name TEXT NOT NULL,
  page_path TEXT NOT NULL,
  baseline_image_path TEXT,
  current_image_path TEXT,
  diff_image_path TEXT,
  diff_percentage DECIMAL(5,2),
  status TEXT CHECK (status IN ('matched', 'diff', 'new', 'missing')),
  viewport TEXT, -- e.g., 'desktop', 'tablet', 'mobile'
  browser TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_snapshots ENABLE ROW LEVEL SECURITY;

-- Super admin only policies (testing data is super admin access only)
CREATE POLICY "Super admins can manage test_runs"
  ON public.test_runs FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage test_results"
  ON public.test_results FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage security_test_runs"
  ON public.security_test_runs FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage security_test_results"
  ON public.security_test_results FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage coverage_reports"
  ON public.coverage_reports FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage visual_snapshots"
  ON public.visual_snapshots FOR ALL
  USING (is_super_admin(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_test_runs_status ON public.test_runs(status);
CREATE INDEX idx_test_runs_type ON public.test_runs(test_type);
CREATE INDEX idx_test_runs_created ON public.test_runs(created_at DESC);
CREATE INDEX idx_test_results_run ON public.test_results(run_id);
CREATE INDEX idx_test_results_status ON public.test_results(status);
CREATE INDEX idx_security_test_runs_created ON public.security_test_runs(created_at DESC);
CREATE INDEX idx_security_test_results_run ON public.security_test_results(run_id);
CREATE INDEX idx_coverage_reports_created ON public.coverage_reports(created_at DESC);