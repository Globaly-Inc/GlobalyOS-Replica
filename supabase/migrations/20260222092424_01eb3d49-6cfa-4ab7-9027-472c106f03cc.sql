
-- Performance indexes for 1M+ user scale

-- Leave requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_org_employee 
  ON public.leave_requests (organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_org_status 
  ON public.leave_requests (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_org_created 
  ON public.leave_requests (organization_id, created_at DESC);

-- Leave type balances
CREATE INDEX IF NOT EXISTS idx_leave_type_balances_org_employee 
  ON public.leave_type_balances (organization_id, employee_id);

-- Leave balance logs
CREATE INDEX IF NOT EXISTS idx_leave_balance_logs_org_employee 
  ON public.leave_balance_logs (organization_id, employee_id);

-- Posts
CREATE INDEX IF NOT EXISTS idx_posts_org_created 
  ON public.posts (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_org_post_type 
  ON public.posts (organization_id, post_type);

-- Post comments
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created 
  ON public.post_comments (post_id, created_at DESC);

-- Post reactions
CREATE INDEX IF NOT EXISTS idx_post_reactions_post 
  ON public.post_reactions (post_id);

-- KPI updates
CREATE INDEX IF NOT EXISTS idx_kpi_updates_org 
  ON public.kpi_updates (organization_id);

-- WFH requests
CREATE INDEX IF NOT EXISTS idx_wfh_requests_org_status 
  ON public.wfh_requests (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_wfh_requests_org_employee 
  ON public.wfh_requests (organization_id, employee_id);

-- Employee workflows
CREATE INDEX IF NOT EXISTS idx_employee_workflows_org 
  ON public.employee_workflows (organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_workflows_org_status 
  ON public.employee_workflows (organization_id, status);

-- Workflow tasks
CREATE INDEX IF NOT EXISTS idx_employee_workflow_tasks_org 
  ON public.employee_workflow_tasks (organization_id);

-- Attendance records
CREATE INDEX IF NOT EXISTS idx_attendance_records_org_date 
  ON public.attendance_records (organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_org_employee_date 
  ON public.attendance_records (organization_id, employee_id, date DESC);

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_org 
  ON public.employees (organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_org_status 
  ON public.employees (organization_id, status);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_space_status 
  ON public.tasks (space_id, status_id);
CREATE INDEX IF NOT EXISTS idx_tasks_space_created 
  ON public.tasks (space_id, created_at DESC);

-- Chat conversations
CREATE INDEX IF NOT EXISTS idx_chat_conversations_org 
  ON public.chat_conversations (organization_id);

-- Wiki pages
CREATE INDEX IF NOT EXISTS idx_wiki_pages_org 
  ON public.wiki_pages (organization_id);
