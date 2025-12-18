-- Phase 1: Enhance support_screenshots table with AI analysis fields
ALTER TABLE public.support_screenshots 
ADD COLUMN IF NOT EXISTS ai_description text,
ADD COLUMN IF NOT EXISTS ui_elements jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS feature_context text,
ADD COLUMN IF NOT EXISTS flow_group text,
ADD COLUMN IF NOT EXISTS flow_order integer,
ADD COLUMN IF NOT EXISTS is_analyzed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS analyzed_at timestamp with time zone;

-- Add index for AI analysis queries
CREATE INDEX IF NOT EXISTS idx_support_screenshots_is_analyzed 
ON public.support_screenshots(is_analyzed);

CREATE INDEX IF NOT EXISTS idx_support_screenshots_flow 
ON public.support_screenshots(flow_group, flow_order);

-- Phase 2: Create route registry table for capturable routes
CREATE TABLE IF NOT EXISTS public.support_screenshot_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module text NOT NULL,
  route_template text NOT NULL,
  feature_name text NOT NULL,
  description text,
  is_flow_step boolean DEFAULT false,
  flow_name text,
  flow_order integer,
  requires_auth boolean DEFAULT true,
  requires_data boolean DEFAULT false,
  sample_data_notes text,
  highlight_selector text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(module, route_template)
);

-- Add indexes for route queries
CREATE INDEX IF NOT EXISTS idx_support_screenshot_routes_module 
ON public.support_screenshot_routes(module);

CREATE INDEX IF NOT EXISTS idx_support_screenshot_routes_active 
ON public.support_screenshot_routes(is_active) WHERE is_active = true;

-- Insert initial route registry entries for all modules
INSERT INTO public.support_screenshot_routes (module, route_template, feature_name, description, is_flow_step, flow_name, flow_order) VALUES
-- General / Dashboard
('general', '/org/{slug}', 'Dashboard', 'Main dashboard overview', false, NULL, NULL),
('general', '/org/{slug}/profile', 'My Profile', 'Personal profile page', false, NULL, NULL),
('general', '/org/{slug}/notifications', 'Notifications', 'Notifications center', false, NULL, NULL),

-- Team module
('team', '/org/{slug}/team', 'Team Directory', 'Team overview and directory listing', false, NULL, NULL),
('team', '/org/{slug}/team/{id}', 'Employee Profile', 'Individual employee profile view', false, NULL, NULL),
('team', '/org/{slug}/team/org-chart', 'Org Chart', 'Organization hierarchy chart', false, NULL, NULL),
('team', '/org/{slug}/settings/team', 'Team Settings', 'Team configuration settings', false, NULL, NULL),

-- Leave module
('leave', '/org/{slug}/leave', 'Leave Dashboard', 'Leave requests dashboard with balances', false, NULL, NULL),
('leave', '/org/{slug}/leave/request', 'Request Leave', 'Leave request form', true, 'request-leave', 1),
('leave', '/org/{slug}/leave/history', 'Leave History', 'Historical leave records', false, NULL, NULL),
('leave', '/org/{slug}/leave/calendar', 'Leave Calendar', 'Team leave calendar view', false, NULL, NULL),
('leave', '/org/{slug}/settings/leave', 'Leave Settings', 'Leave types and policies configuration', false, NULL, NULL),

-- Attendance module
('attendance', '/org/{slug}/attendance', 'Attendance Dashboard', 'Daily attendance tracking overview', false, NULL, NULL),
('attendance', '/org/{slug}/attendance/check-in', 'Check In', 'Attendance check-in interface', true, 'check-in-flow', 1),
('attendance', '/org/{slug}/attendance/reports', 'Attendance Reports', 'Attendance analytics and reports', false, NULL, NULL),
('attendance', '/org/{slug}/settings/attendance', 'Attendance Settings', 'Attendance policies configuration', false, NULL, NULL),

-- Calendar module
('calendar', '/org/{slug}/calendar', 'Company Calendar', 'Company-wide calendar with events', false, NULL, NULL),
('calendar', '/org/{slug}/calendar/events', 'Calendar Events', 'Calendar event management', false, NULL, NULL),

-- KPI module
('kpi', '/org/{slug}/kpis', 'KPI Dashboard', 'Personal and team KPIs overview', false, NULL, NULL),
('kpi', '/org/{slug}/kpis/create', 'Create KPI', 'KPI creation form', true, 'create-kpi', 1),
('kpi', '/org/{slug}/kpis/templates', 'KPI Templates', 'Reusable KPI templates', false, NULL, NULL),
('kpi', '/org/{slug}/okrs', 'OKRs', 'Objectives and Key Results view', false, NULL, NULL),

-- Reviews module
('reviews', '/org/{slug}/reviews', 'Reviews Dashboard', 'Performance reviews overview', false, NULL, NULL),
('reviews', '/org/{slug}/reviews/self', 'Self Review', 'Self-assessment form', true, 'review-flow', 1),
('reviews', '/org/{slug}/reviews/cycles', 'Review Cycles', 'Review cycle management', false, NULL, NULL),

-- Wiki module
('wiki', '/org/{slug}/wiki', 'Knowledge Base', 'Wiki home with folders and pages', false, NULL, NULL),
('wiki', '/org/{slug}/wiki/create', 'Create Page', 'New wiki page editor', true, 'create-page', 1),
('wiki', '/org/{slug}/wiki/{pageId}', 'Wiki Page', 'Individual wiki page view', false, NULL, NULL),

-- Chat module
('chat', '/org/{slug}/chat', 'Team Chat', 'Chat spaces and conversations', false, NULL, NULL),
('chat', '/org/{slug}/chat/spaces', 'Chat Spaces', 'Team spaces overview', false, NULL, NULL),

-- Tasks module
('tasks', '/org/{slug}/tasks', 'Tasks Dashboard', 'Task management interface', false, NULL, NULL),
('tasks', '/org/{slug}/tasks/create', 'Create Task', 'New task creation form', true, 'create-task', 1),

-- CRM module
('crm', '/org/{slug}/crm', 'CRM Dashboard', 'CRM overview with metrics', false, NULL, NULL),
('crm', '/org/{slug}/crm/contacts', 'Contacts', 'Contact management list', false, NULL, NULL),
('crm', '/org/{slug}/crm/companies', 'Companies', 'Company profiles list', false, NULL, NULL),
('crm', '/org/{slug}/crm/deals', 'Deals Pipeline', 'Sales deals pipeline view', false, NULL, NULL),
('crm', '/org/{slug}/crm/activities', 'Activities', 'CRM activity feed', false, NULL, NULL),

-- Payroll module
('payroll', '/org/{slug}/payroll', 'Payroll Dashboard', 'Payroll overview', false, NULL, NULL),
('payroll', '/org/{slug}/payroll/runs', 'Payroll Runs', 'Payroll run history', false, NULL, NULL),
('payroll', '/org/{slug}/payroll/slips', 'Pay Slips', 'Employee pay slips', false, NULL, NULL),

-- Settings module
('settings', '/org/{slug}/settings', 'Settings Overview', 'Organization settings home', false, NULL, NULL),
('settings', '/org/{slug}/settings/organization', 'Organization Settings', 'Basic org configuration', false, NULL, NULL),
('settings', '/org/{slug}/settings/users', 'User Management', 'User and roles management', false, NULL, NULL),
('settings', '/org/{slug}/settings/billing', 'Billing Settings', 'Subscription and billing', false, NULL, NULL),
('settings', '/org/{slug}/settings/integrations', 'Integrations', 'Third-party integrations', false, NULL, NULL)
ON CONFLICT (module, route_template) DO NOTHING;