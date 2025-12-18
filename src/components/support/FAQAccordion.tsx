/**
 * FAQ Accordion Component
 * Displays FAQ items in an accordion format
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { marked } from 'marked';

// Configure marked to return string synchronously
marked.use({ async: false });

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  defaultOpen?: string[];
}

export const FAQAccordion = ({ items, defaultOpen }: FAQAccordionProps) => {
  if (!items.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No FAQ items found.</p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger className="text-left">
            {item.question}
          </AccordionTrigger>
          <AccordionContent>
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: marked(item.answer) as string }}
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

// Sample FAQ data - can be moved to database later
export const SAMPLE_FAQ_ITEMS: FAQItem[] = [
  {
    id: 'what-is-globalyos',
    question: 'What is GlobalyOS?',
    answer: 'GlobalyOS is a comprehensive Business Operating System that combines HRMS (attendance, leave, KPIs/OKRs, performance reviews), team communication, knowledge base, and CRM into one unified platform.',
    category: 'general',
  },
  {
    id: 'how-to-request-leave',
    question: 'How do I request time off?',
    answer: 'Navigate to **Leave** from the main menu, click the **Request Leave** button, select your leave type, dates, and provide any necessary details. Your manager will receive a notification to approve or decline your request.',
    category: 'leave',
  },
  {
    id: 'how-to-check-in',
    question: 'How do I check in for work?',
    answer: 'From your home dashboard, use the **Check In** button. If your organization requires location verification, you may need to enable location services. You can also check out when your workday ends.',
    category: 'attendance',
  },
  {
    id: 'how-to-add-kpi',
    question: 'How do I create a KPI?',
    answer: 'Go to the **KPI Dashboard**, click **Add KPI**, fill in the title, target value, and due date. You can track progress by updating the current value as you work toward your goal.',
    category: 'performance',
  },
  {
    id: 'what-is-wiki',
    question: 'What is the Wiki/Knowledge Base?',
    answer: 'The Wiki is your organization\'s knowledge repository. Create pages and folders to document processes, policies, and information. Use the rich text editor to format content and add attachments.',
    category: 'wiki',
  },
  {
    id: 'how-to-invite-team',
    question: 'How do I invite team members?',
    answer: 'If you have admin or HR permissions, go to **Team** and click **Invite Member**. Enter their email address and role. They\'ll receive an invitation to join your organization.',
    category: 'team',
  },
  {
    id: 'mobile-support',
    question: 'Can I use GlobalyOS on mobile?',
    answer: 'Yes! GlobalyOS is a Progressive Web App (PWA). You can install it on your mobile device for a native app-like experience. Look for the install prompt in your browser or use the **Install** option.',
    category: 'general',
  },
  {
    id: 'data-security',
    question: 'How is my data secured?',
    answer: 'We use industry-standard encryption, secure authentication, and role-based access control. All data is isolated per organization, ensuring your information remains private and secure.',
    category: 'general',
  },
];
