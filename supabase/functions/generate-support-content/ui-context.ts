/**
 * GlobalyOS UI Context
 * Comprehensive documentation of actual UI structure, navigation, and page elements
 * Used by AI content generation to produce accurate, grounded documentation
 */

export interface UIElement {
  name: string;
  type: 'button' | 'tab' | 'link' | 'input' | 'dialog' | 'card' | 'dropdown' | 'section';
  description?: string;
  roles?: string[];  // Which roles can see/use this element
  location?: string; // Where on the page
}

export interface PageContext {
  path: string;
  title: string;
  description: string;
  navigation: string;  // How to reach this page
  roles: string[];     // Who can access
  tabs?: { name: string; description: string }[];
  buttons?: UIElement[];
  sections?: { name: string; description: string }[];
  dialogs?: { trigger: string; title: string; fields?: string[] }[];
  filters?: string[];
  views?: string[];
}

export interface ModuleUIContext {
  overview: string;
  navigationPath: string;
  pages: PageContext[];
  commonActions: { action: string; steps: string[] }[];
}

// Actual GlobalyOS Navigation Structure
export const NAVIGATION_STRUCTURE = {
  topNav: {
    description: 'Main navigation bar at the top of the page',
    items: [
      { name: 'Home', path: '/', icon: 'Home', visibleTo: ['owner', 'admin', 'hr', 'user'] },
      { name: 'Team', path: '/team', icon: 'Users', visibleTo: ['owner', 'admin', 'hr', 'user'] },
      { name: 'Wiki', path: '/wiki', icon: 'BookOpen', visibleTo: ['owner', 'admin', 'hr', 'user'] },
      { name: 'Chat', path: '/chat', icon: 'MessageSquare', visibleTo: ['owner'], featureFlag: 'chat' },
      { name: 'Tasks', path: '/tasks', icon: 'CheckSquare', visibleTo: ['owner'], featureFlag: 'tasks' },
      { name: 'CRM', path: '/crm', icon: 'Briefcase', visibleTo: ['owner'], featureFlag: 'crm' },
    ],
  },
  teamSubNav: {
    description: 'Secondary navigation under Team section',
    items: [
      { name: 'Directory', path: '/team', icon: 'Users', visibleTo: ['owner', 'admin', 'hr', 'user'] },
      { name: 'KPIs', path: '/kpi-dashboard', icon: 'Target', visibleTo: ['owner', 'admin', 'hr', 'user'] },
      { name: 'Team Cal', path: '/calendar', icon: 'Calendar', visibleTo: ['owner', 'admin', 'hr', 'user'] },
      { name: 'Leave', path: '/leave-history', icon: 'CalendarDays', visibleTo: ['owner', 'admin', 'hr'], adminOnly: true },
      { name: 'Attendance', path: '/attendance-history', icon: 'Clock', visibleTo: ['owner', 'admin', 'hr'], adminOnly: true },
      { name: 'Payroll', path: '/payroll', icon: 'DollarSign', visibleTo: ['owner', 'admin', 'hr'], adminOnly: true },
    ],
  },
  userMenu: {
    description: 'Dropdown menu accessed by clicking your profile avatar in the top-right corner',
    trigger: 'Click your profile avatar in the top-right corner of the page',
    items: [
      { name: 'My Profile', description: 'View and edit your personal profile' },
      { name: 'My Leave', description: 'View your leave balance and request time off' },
      { name: 'My Attendance', description: 'View your attendance records' },
      { name: 'My Payslips', description: 'View your payslips and payment history' },
      { name: 'Notifications', description: 'View and manage your notifications' },
      { name: 'Settings', description: 'Access organization and personal settings (Owner/Admin only)' },
      { name: 'Sign Out', description: 'Log out of GlobalyOS' },
    ],
  },
  settingsAccess: 'Click your profile avatar in the top-right corner, then select "Settings" from the dropdown menu',
};

// Module-specific UI Context
export const MODULE_UI_CONTEXT: Record<string, ModuleUIContext> = {
  team: {
    overview: 'The Team module is your central hub for managing employees, viewing the organization structure, and accessing team member profiles.',
    navigationPath: 'Click **Team** in the main navigation bar at the top of the page',
    pages: [
      {
        path: '/team',
        title: 'Team Directory',
        description: 'View all team members in a card grid or list format',
        navigation: 'Click **Team** in the main navigation bar',
        roles: ['owner', 'admin', 'hr', 'user'],
        views: ['Cards view (default grid layout)', 'Org Chart view'],
        filters: ['Status filter (Active/All)', 'Online status filter', 'Project filter', 'Search by name'],
        buttons: [
          { name: '+ Invite', type: 'button', description: 'Invite new team members via email', roles: ['owner', 'admin', 'hr'], location: 'Top-right of the page' },
          { name: 'Import icon', type: 'button', description: 'Bulk import employees from CSV', roles: ['owner', 'admin'], location: 'Next to Invite button' },
          { name: 'Org Chart toggle', type: 'button', description: 'Switch between card view and org chart view', location: 'Top-right, next to import' },
        ],
        sections: [
          { name: 'Team member cards', description: 'Grid of employee cards showing photo, name, position, department, and online status' },
        ],
      },
      {
        path: '/team/:id',
        title: 'Employee Profile',
        description: 'Detailed view of an individual team member',
        navigation: 'Click on any team member card in the Directory to open their profile',
        roles: ['owner', 'admin', 'hr', 'user'],
        tabs: [
          { name: 'Overview', description: 'Basic info, contact details, employment information' },
          { name: 'Documents', description: 'Employee documents and files (visible to self, admin, hr)' },
          { name: 'KPIs', description: 'Performance indicators and metrics' },
          { name: 'Reviews', description: 'Performance review history' },
          { name: 'Leave', description: 'Leave balance and history' },
          { name: 'Attendance', description: 'Attendance records' },
        ],
        buttons: [
          { name: 'Edit Profile', type: 'button', description: 'Edit employee details', roles: ['owner', 'admin', 'hr'], location: 'Top-right of profile header' },
          { name: 'More Actions (⋮)', type: 'dropdown', description: 'Additional actions like change role, deactivate', roles: ['owner', 'admin'] },
        ],
      },
    ],
    commonActions: [
      {
        action: 'Invite a new team member',
        steps: [
          'Click **Team** in the main navigation',
          'Click the **+ Invite** button in the top-right corner',
          'Enter the new team member\'s email address',
          'Select their role (Admin, HR, or User)',
          'Optionally fill in their name, department, and position',
          'Click **Send Invite**',
        ],
      },
      {
        action: 'View the organization chart',
        steps: [
          'Click **Team** in the main navigation',
          'Click the **Org Chart** toggle button in the top-right area',
          'The view will switch from cards to a hierarchical org chart',
          'Click on any node to view that person\'s profile',
        ],
      },
    ],
  },
  leave: {
    overview: 'The Leave module allows employees to request time off, view their leave balances, and (for managers/HR) approve or reject leave requests.',
    navigationPath: 'Personal leave: Click your profile avatar → **My Leave**. Team leave (Admin/HR): Click **Team** → **Leave** in the sub-navigation',
    pages: [
      {
        path: '/leave',
        title: 'My Leave',
        description: 'Personal leave dashboard showing your balances and requests',
        navigation: 'Click your profile avatar in the top-right, then select **My Leave**',
        roles: ['owner', 'admin', 'hr', 'user'],
        sections: [
          { name: 'Leave Balance Cards', description: 'Colored cards showing available days for each leave type (Annual, Sick, etc.)' },
          { name: 'Recent Requests', description: 'List of your recent leave requests with status badges' },
          { name: 'Upcoming Leave', description: 'Calendar or list of your scheduled upcoming leave' },
        ],
        buttons: [
          { name: '+ Request Leave', type: 'button', description: 'Open the leave request form', location: 'Top-right of the page' },
        ],
        dialogs: [
          {
            trigger: '+ Request Leave button',
            title: 'Request Leave',
            fields: ['Leave Type dropdown', 'Start Date picker', 'End Date picker', 'Reason/Notes text area'],
          },
        ],
      },
      {
        path: '/leave-history',
        title: 'Team Leave',
        description: 'Admin/HR view of all team leave requests',
        navigation: 'Click **Team** in main nav, then **Leave** in the sub-navigation bar',
        roles: ['owner', 'admin', 'hr'],
        tabs: [
          { name: 'Pending', description: 'Leave requests awaiting approval' },
          { name: 'Approved', description: 'Approved leave requests' },
          { name: 'Rejected', description: 'Rejected leave requests' },
          { name: 'All', description: 'All leave requests regardless of status' },
        ],
        filters: ['Date range filter', 'Employee filter', 'Leave type filter', 'Status filter'],
        buttons: [
          { name: 'Approve', type: 'button', description: 'Approve selected leave request', roles: ['owner', 'admin', 'hr'], location: 'On each pending request row' },
          { name: 'Reject', type: 'button', description: 'Reject selected leave request', roles: ['owner', 'admin', 'hr'], location: 'On each pending request row' },
        ],
      },
    ],
    commonActions: [
      {
        action: 'Request time off',
        steps: [
          'Click your profile avatar in the top-right corner',
          'Select **My Leave** from the dropdown menu',
          'Click the **+ Request Leave** button',
          'Select your leave type from the dropdown (e.g., Annual Leave, Sick Leave)',
          'Choose your start date and end date using the date pickers',
          'Add any notes or reason for your leave (optional)',
          'Click **Submit Request**',
        ],
      },
      {
        action: 'Approve a leave request (Admin/HR)',
        steps: [
          'Click **Team** in the main navigation',
          'Click **Leave** in the sub-navigation bar',
          'Find the pending request in the **Pending** tab',
          'Review the request details',
          'Click the **Approve** button to approve, or **Reject** to decline',
          'Optionally add a comment explaining your decision',
        ],
      },
    ],
  },
  attendance: {
    overview: 'The Attendance module tracks employee work hours through check-in/check-out functionality and provides reports for managers.',
    navigationPath: 'Personal attendance: Click your profile avatar → **My Attendance**. Team attendance (Admin/HR): Click **Team** → **Attendance** in the sub-navigation',
    pages: [
      {
        path: '/attendance',
        title: 'My Attendance',
        description: 'Personal attendance tracking and history',
        navigation: 'Click your profile avatar in the top-right, then select **My Attendance**',
        roles: ['owner', 'admin', 'hr', 'user'],
        sections: [
          { name: 'Check-in Widget', description: 'Large button to check in or check out, shows current status' },
          { name: 'Today\'s Status', description: 'Card showing today\'s check-in time, work hours so far' },
          { name: 'Recent Records', description: 'Table of recent attendance records with date, check-in, check-out, hours' },
        ],
        buttons: [
          { name: 'Check In / Check Out', type: 'button', description: 'Toggle your attendance status', location: 'Center of the page, prominent button' },
        ],
      },
      {
        path: '/attendance-history',
        title: 'Team Attendance',
        description: 'Admin/HR view of team attendance records and reports',
        navigation: 'Click **Team** in main nav, then **Attendance** in the sub-navigation bar',
        roles: ['owner', 'admin', 'hr'],
        tabs: [
          { name: 'Records', description: 'Daily attendance records for all employees' },
          { name: 'Reports', description: 'Attendance analytics and summary reports' },
          { name: 'Settings', description: 'Configure attendance policies and rules' },
        ],
        filters: ['Date range filter', 'Employee filter', 'Department filter', 'Status filter (Present/Absent/Late)'],
        buttons: [
          { name: 'Export', type: 'button', description: 'Export attendance data to CSV', roles: ['owner', 'admin', 'hr'], location: 'Top-right of the table' },
          { name: 'Add Manual Entry', type: 'button', description: 'Add an attendance record manually', roles: ['owner', 'admin', 'hr'] },
        ],
      },
    ],
    commonActions: [
      {
        action: 'Check in for work',
        steps: [
          'Click your profile avatar in the top-right corner',
          'Select **My Attendance** from the dropdown menu',
          'Click the large **Check In** button in the center of the page',
          'If location tracking is enabled, allow location access when prompted',
          'Your check-in time will be recorded and displayed',
        ],
      },
      {
        action: 'Check out at end of day',
        steps: [
          'Click your profile avatar in the top-right corner',
          'Select **My Attendance** from the dropdown menu',
          'Click the **Check Out** button (the same button that said Check In)',
          'Your work hours for the day will be calculated and displayed',
        ],
      },
    ],
  },
  kpi: {
    overview: 'The KPI module helps track individual and team performance through Key Performance Indicators and OKRs (Objectives and Key Results).',
    navigationPath: 'Click **Team** in main navigation, then **KPIs** in the sub-navigation bar',
    pages: [
      {
        path: '/kpi-dashboard',
        title: 'KPI Dashboard',
        description: 'Overview of KPIs with progress tracking and AI insights',
        navigation: 'Click **Team** in main nav, then **KPIs** in the sub-navigation bar',
        roles: ['owner', 'admin', 'hr', 'user'],
        tabs: [
          { name: 'My KPIs', description: 'Your personal KPIs and progress' },
          { name: 'Team KPIs', description: 'Overview of team performance (Admin/HR)' },
          { name: 'Templates', description: 'KPI templates for creating new KPIs (Admin/HR)' },
        ],
        sections: [
          { name: 'KPI Cards', description: 'Cards showing each KPI with target, current value, and progress bar' },
          { name: 'AI Insights Panel', description: 'AI-generated analysis and recommendations based on your KPI data' },
        ],
        buttons: [
          { name: '+ Add KPI', type: 'button', description: 'Create a new KPI', roles: ['owner', 'admin', 'hr'], location: 'Top-right of the page' },
          { name: 'Update Progress', type: 'button', description: 'Log a new value for a KPI', location: 'On each KPI card' },
        ],
        dialogs: [
          {
            trigger: '+ Add KPI button',
            title: 'Create KPI',
            fields: ['Title', 'Description', 'Target Value', 'Unit', 'Time Period', 'Assigned Employee'],
          },
        ],
      },
    ],
    commonActions: [
      {
        action: 'Update your KPI progress',
        steps: [
          'Click **Team** in the main navigation',
          'Click **KPIs** in the sub-navigation bar',
          'Find the KPI you want to update in the **My KPIs** tab',
          'Click the **Update Progress** button on the KPI card',
          'Enter your new value in the dialog',
          'Optionally add a note explaining the progress',
          'Click **Save** to record your update',
        ],
      },
      {
        action: 'Create a new KPI for a team member (Admin/HR)',
        steps: [
          'Click **Team** in the main navigation',
          'Click **KPIs** in the sub-navigation bar',
          'Click the **+ Add KPI** button in the top-right',
          'Fill in the KPI details: title, description, target value',
          'Select the employee this KPI is assigned to',
          'Set the time period (e.g., Q1 2024)',
          'Click **Create KPI** to save',
        ],
      },
    ],
  },
  calendar: {
    overview: 'The Team Calendar shows company holidays, team events, and employee leave in a unified calendar view.',
    navigationPath: 'Click **Team** in main navigation, then **Team Cal** in the sub-navigation bar',
    pages: [
      {
        path: '/calendar',
        title: 'Team Calendar',
        description: 'Company-wide calendar with holidays and events',
        navigation: 'Click **Team** in main nav, then **Team Cal** in the sub-navigation bar',
        roles: ['owner', 'admin', 'hr', 'user'],
        views: ['Month view (default)', 'Week view', 'Day view'],
        sections: [
          { name: 'Calendar Grid', description: 'Interactive calendar showing events, holidays, and leave' },
          { name: 'Upcoming Events Sidebar', description: 'List of upcoming events in the next 7 days' },
          { name: 'Legend', description: 'Color coding for different event types' },
        ],
        buttons: [
          { name: '+ Add Event', type: 'button', description: 'Create a new calendar event', roles: ['owner', 'admin', 'hr'], location: 'Top-right of the page' },
        ],
        dialogs: [
          {
            trigger: '+ Add Event button or clicking on a date',
            title: 'Create Event',
            fields: ['Event Title', 'Event Type dropdown', 'Start Date', 'End Date', 'Description', 'Applies to (All offices or specific)'],
          },
        ],
      },
    ],
    commonActions: [
      {
        action: 'Add a company holiday',
        steps: [
          'Click **Team** in the main navigation',
          'Click **Team Cal** in the sub-navigation bar',
          'Click the **+ Add Event** button',
          'Enter the holiday name (e.g., "Christmas Day")',
          'Select **Holiday** from the Event Type dropdown',
          'Choose the date(s) for the holiday',
          'Select whether it applies to all offices or specific locations',
          'Click **Save** to add the holiday to the calendar',
        ],
      },
    ],
  },
  wiki: {
    overview: 'The Wiki is your organization\'s knowledge base where you can create, organize, and share documentation with your team.',
    navigationPath: 'Click **Wiki** in the main navigation bar',
    pages: [
      {
        path: '/wiki',
        title: 'Wiki Home',
        description: 'Knowledge base with folders and pages',
        navigation: 'Click **Wiki** in the main navigation bar',
        roles: ['owner', 'admin', 'hr', 'user'],
        sections: [
          { name: 'Folder Tree Sidebar', description: 'Left sidebar showing folder hierarchy and pages' },
          { name: 'Page Content', description: 'Main area showing the selected page content' },
          { name: 'AI Q&A', description: 'Ask AI questions about your wiki content' },
        ],
        buttons: [
          { name: '+ New Page', type: 'button', description: 'Create a new wiki page', location: 'Top of the sidebar or in the content area' },
          { name: '+ New Folder', type: 'button', description: 'Create a new folder', location: 'Top of the sidebar' },
          { name: 'Edit', type: 'button', description: 'Edit the current page', location: 'Top-right of page content' },
        ],
      },
    ],
    commonActions: [
      {
        action: 'Create a new wiki page',
        steps: [
          'Click **Wiki** in the main navigation',
          'Click the **+ New Page** button',
          'Enter a title for your page',
          'Select which folder to place the page in (or create in root)',
          'Set visibility permissions (who can view/edit)',
          'Use the rich text editor to add your content',
          'Click **Save** when done',
        ],
      },
    ],
  },
  chat: {
    overview: 'The Chat module provides team messaging with direct messages, group chats, and organized spaces for topic-based discussions.',
    navigationPath: 'Click **Chat** in the main navigation bar (visible to Owner when Chat feature is enabled)',
    pages: [
      {
        path: '/chat',
        title: 'Chat',
        description: 'Team messaging and communication hub',
        navigation: 'Click **Chat** in the main navigation bar',
        roles: ['owner', 'admin', 'hr', 'user'],
        sections: [
          { name: 'Conversations List', description: 'Left sidebar listing all your chats and spaces' },
          { name: 'Message Area', description: 'Main chat area showing messages' },
          { name: 'Right Panel', description: 'Details panel showing pinned messages, resources, members' },
        ],
        buttons: [
          { name: '+ New Chat', type: 'button', description: 'Start a new direct message or group', location: 'Top of conversations sidebar' },
          { name: '+ Create Space', type: 'button', description: 'Create a new organized space', location: 'In the Spaces section of sidebar' },
        ],
        dialogs: [
          {
            trigger: '+ New Chat button',
            title: 'New Conversation',
            fields: ['Search for people', 'Selected participants list'],
          },
        ],
      },
    ],
    commonActions: [
      {
        action: 'Start a direct message',
        steps: [
          'Click **Chat** in the main navigation',
          'Click the **+ New Chat** button at the top of the sidebar',
          'Search for the person you want to message',
          'Click on their name to select them',
          'Click **Start Chat** or press Enter',
          'Type your message and press Enter to send',
        ],
      },
    ],
  },
  settings: {
    overview: 'Settings is where organization owners and admins can configure GlobalyOS, manage users, set up integrations, and control organization-wide preferences.',
    navigationPath: 'Click your profile avatar in the top-right corner, then select **Settings** from the dropdown menu',
    pages: [
      {
        path: '/settings',
        title: 'Settings',
        description: 'Organization and system configuration',
        navigation: 'Click your profile avatar in the top-right → Select **Settings**',
        roles: ['owner', 'admin'],
        tabs: [
          { name: 'Organization', description: 'Company name, logo, and basic info' },
          { name: 'Fields', description: 'Custom fields for employee profiles' },
          { name: 'Attendance', description: 'Attendance policies and work schedules' },
          { name: 'Leave', description: 'Leave types and policies' },
          { name: 'AI', description: 'AI features and knowledge base settings' },
          { name: 'Integrations', description: 'Third-party integrations and APIs' },
          { name: 'Billing', description: 'Subscription and payment settings (Owner only)' },
        ],
      },
    ],
    commonActions: [
      {
        action: 'Change organization settings',
        steps: [
          'Click your profile avatar in the top-right corner',
          'Select **Settings** from the dropdown menu',
          'You\'ll land on the **Organization** tab by default',
          'Update the organization name, upload a logo, or change other settings',
          'Click **Save Changes** to apply your updates',
        ],
      },
    ],
  },
  general: {
    overview: 'General information about navigating GlobalyOS, getting started, and understanding the overall platform structure.',
    navigationPath: 'This applies to the entire GlobalyOS platform',
    pages: [
      {
        path: '/',
        title: 'Home Dashboard',
        description: 'Your personal dashboard with overview of key information',
        navigation: 'Click **Home** in the main navigation bar, or click the GlobalyOS logo',
        roles: ['owner', 'admin', 'hr', 'user'],
        sections: [
          { name: 'Welcome Section', description: 'Greeting and quick actions' },
          { name: 'Activity Feed', description: 'Recent activity from your organization' },
          { name: 'Quick Stats', description: 'At-a-glance metrics and summaries' },
        ],
      },
    ],
    commonActions: [
      {
        action: 'Navigate between modules',
        steps: [
          'Look at the main navigation bar at the top of the page',
          'Click on any module name: **Home**, **Team**, **Wiki**, **Chat**, **Tasks**, or **CRM**',
          'The selected module will highlight to show it\'s active',
          'For Team-related sub-sections, use the secondary navigation bar that appears below',
        ],
      },
      {
        action: 'Access personal settings',
        steps: [
          'Click your profile avatar in the top-right corner of the page',
          'A dropdown menu will appear with options',
          'Select the option you need: My Profile, My Leave, My Attendance, Notifications, or Settings',
        ],
      },
    ],
  },
  crm: {
    overview: 'The CRM (Customer Relationship Management) module helps you manage contacts, companies, deals, and sales activities.',
    navigationPath: 'Click **CRM** in the main navigation bar (visible to Owner when CRM feature is enabled)',
    pages: [
      {
        path: '/crm',
        title: 'CRM Dashboard',
        description: 'Overview of your sales pipeline and activities',
        navigation: 'Click **CRM** in the main navigation bar',
        roles: ['owner', 'admin', 'user'],
        tabs: [
          { name: 'Dashboard', description: 'Sales overview and metrics' },
          { name: 'Contacts', description: 'Manage individual contacts' },
          { name: 'Companies', description: 'Manage company/organization records' },
          { name: 'Deals', description: 'Track sales opportunities and pipeline' },
          { name: 'Activities', description: 'Log and view sales activities' },
        ],
        buttons: [
          { name: '+ New Contact', type: 'button', description: 'Add a new contact', location: 'Top-right of Contacts tab' },
          { name: '+ New Deal', type: 'button', description: 'Create a new deal', location: 'Top-right of Deals tab' },
        ],
      },
    ],
    commonActions: [
      {
        action: 'Add a new contact',
        steps: [
          'Click **CRM** in the main navigation',
          'Click the **Contacts** tab',
          'Click the **+ New Contact** button',
          'Fill in the contact details: name, email, phone, company',
          'Click **Save Contact** to add them to your CRM',
        ],
      },
    ],
  },
  tasks: {
    overview: 'The Tasks module provides task management for individuals and teams with lists, due dates, and assignments.',
    navigationPath: 'Click **Tasks** in the main navigation bar (visible to Owner when Tasks feature is enabled)',
    pages: [
      {
        path: '/tasks',
        title: 'Tasks',
        description: 'Personal and team task management',
        navigation: 'Click **Tasks** in the main navigation bar',
        roles: ['owner', 'admin', 'hr', 'user'],
        sections: [
          { name: 'Task Lists Sidebar', description: 'Left sidebar showing your task lists' },
          { name: 'Task List View', description: 'Main area showing tasks in the selected list' },
        ],
        buttons: [
          { name: '+ New Task', type: 'button', description: 'Add a new task', location: 'Top of the task list or sidebar' },
          { name: '+ New List', type: 'button', description: 'Create a new task list', location: 'In the sidebar' },
        ],
      },
    ],
    commonActions: [
      {
        action: 'Create a new task',
        steps: [
          'Click **Tasks** in the main navigation',
          'Click the **+ New Task** button',
          'Enter the task title',
          'Set a due date (optional)',
          'Assign to a team member (optional)',
          'Add description or notes (optional)',
          'Press Enter or click **Create** to add the task',
        ],
      },
    ],
  },
  reviews: {
    overview: 'The Performance Reviews module manages employee evaluations including self-reviews, peer reviews, and manager assessments.',
    navigationPath: 'Access via employee profile → Reviews tab, or through Settings → Performance Reviews (Admin)',
    pages: [
      {
        path: '/reviews',
        title: 'Performance Reviews',
        description: 'Employee performance evaluation management',
        navigation: 'Click on an employee profile → **Reviews** tab, or go to Settings → Performance Reviews',
        roles: ['owner', 'admin', 'hr', 'user'],
        tabs: [
          { name: 'My Reviews', description: 'Reviews where you are the subject or reviewer' },
          { name: 'Pending', description: 'Reviews awaiting your input' },
          { name: 'Completed', description: 'Finished reviews' },
        ],
        buttons: [
          { name: 'Start Review', type: 'button', description: 'Begin a review process', roles: ['owner', 'admin', 'hr'] },
          { name: 'Submit Review', type: 'button', description: 'Submit your completed review' },
        ],
      },
    ],
    commonActions: [
      {
        action: 'Complete a self-review',
        steps: [
          'Check your notifications or email for a review invitation',
          'Click the link to access your pending review',
          'Answer each question in the review form',
          'Rate yourself on the provided criteria',
          'Add any additional comments or reflections',
          'Click **Submit Review** when complete',
        ],
      },
    ],
  },
  payroll: {
    overview: 'The Payroll module handles salary processing, payslips, and payment management for your organization.',
    navigationPath: 'Click **Team** in main navigation, then **Payroll** in the sub-navigation bar (Admin/HR only)',
    pages: [
      {
        path: '/payroll',
        title: 'Payroll Dashboard',
        description: 'Payroll processing and management',
        navigation: 'Click **Team** in main nav, then **Payroll** in the sub-navigation bar',
        roles: ['owner', 'admin', 'hr'],
        tabs: [
          { name: 'Overview', description: 'Payroll summary and quick actions' },
          { name: 'Runs', description: 'Payroll runs and processing' },
          { name: 'Employees', description: 'Employee payroll profiles' },
          { name: 'Reports', description: 'Payroll reports and exports' },
        ],
        buttons: [
          { name: '+ New Payroll Run', type: 'button', description: 'Start a new payroll run', roles: ['owner', 'admin', 'hr'], location: 'Top-right of the page' },
          { name: 'Process', type: 'button', description: 'Process the payroll run', roles: ['owner', 'admin'] },
        ],
      },
    ],
    commonActions: [
      {
        action: 'Run payroll',
        steps: [
          'Click **Team** in the main navigation',
          'Click **Payroll** in the sub-navigation bar',
          'Click the **+ New Payroll Run** button',
          'Select the pay period and employees to include',
          'Review the calculated amounts',
          'Make any adjustments or additions as needed',
          'Click **Process** to finalize the payroll',
        ],
      },
    ],
  },
};

// Helper function to get formatted UI context for a module
export function getModuleUIContextText(module: string): string {
  const context = MODULE_UI_CONTEXT[module];
  if (!context) return '';

  let text = `## ACTUAL UI CONTEXT FOR ${module.toUpperCase()} MODULE\n\n`;
  text += `### Overview\n${context.overview}\n\n`;
  text += `### How to Navigate There\n${context.navigationPath}\n\n`;

  // Navigation structure
  text += `### GlobalyOS Navigation Structure\n`;
  text += `**Main Navigation Bar (Top):** ${NAVIGATION_STRUCTURE.topNav.items.map(i => i.name).join(' | ')}\n`;
  text += `**Team Sub-Navigation:** ${NAVIGATION_STRUCTURE.teamSubNav.items.map(i => i.name).join(' | ')}\n`;
  text += `**User Menu (Profile Avatar → Dropdown):** ${NAVIGATION_STRUCTURE.userMenu.items.map(i => i.name).join(' | ')}\n`;
  text += `**To access Settings:** ${NAVIGATION_STRUCTURE.settingsAccess}\n\n`;

  // Pages
  context.pages.forEach(page => {
    text += `### Page: ${page.title}\n`;
    text += `- **Path:** ${page.path}\n`;
    text += `- **Navigation:** ${page.navigation}\n`;
    text += `- **Roles:** ${page.roles.join(', ')}\n`;
    
    if (page.tabs) {
      text += `- **Tabs:** ${page.tabs.map(t => `${t.name} (${t.description})`).join(', ')}\n`;
    }
    if (page.views) {
      text += `- **Views:** ${page.views.join(', ')}\n`;
    }
    if (page.filters) {
      text += `- **Filters:** ${page.filters.join(', ')}\n`;
    }
    if (page.buttons) {
      text += `- **Buttons:** ${page.buttons.map(b => `"${b.name}" - ${b.description}${b.roles ? ` (${b.roles.join('/')})` : ''}`).join('; ')}\n`;
    }
    if (page.sections) {
      text += `- **UI Sections:** ${page.sections.map(s => `${s.name}: ${s.description}`).join('; ')}\n`;
    }
    if (page.dialogs) {
      text += `- **Dialogs:** ${page.dialogs.map(d => `"${d.title}" triggered by ${d.trigger}`).join('; ')}\n`;
    }
    text += '\n';
  });

  // Common actions with exact steps
  if (context.commonActions.length > 0) {
    text += `### Common Actions (EXACT STEPS)\n`;
    context.commonActions.forEach(action => {
      text += `**${action.action}:**\n`;
      action.steps.forEach((step, i) => {
        text += `${i + 1}. ${step}\n`;
      });
      text += '\n';
    });
  }

  return text;
}
