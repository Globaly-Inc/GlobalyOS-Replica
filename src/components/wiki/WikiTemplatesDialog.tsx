import { useState } from "react";
import { FileText, FileCheck, BookOpen, HelpCircle, ListChecks, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  content: string;
}

const TEMPLATES: Template[] = [
  {
    id: "blank",
    name: "Blank Page",
    description: "Start with an empty page",
    icon: <FileText className="h-6 w-6" />,
    content: "",
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    description: "Capture meeting discussions and action items",
    icon: <Users className="h-6 w-6" />,
    content: `<h1>Meeting Notes</h1>
<p><strong>Date:</strong> [Date]</p>
<p><strong>Attendees:</strong> [Names]</p>
<p><strong>Location:</strong> [Room/Virtual]</p>
<hr>
<h2>Agenda</h2>
<ol>
<li>Topic 1</li>
<li>Topic 2</li>
<li>Topic 3</li>
</ol>
<h2>Discussion Points</h2>
<ul>
<li>Key discussion point 1</li>
<li>Key discussion point 2</li>
</ul>
<h2>Action Items</h2>
<ul>
<li>[ ] Action item 1 - Owner: [Name] - Due: [Date]</li>
<li>[ ] Action item 2 - Owner: [Name] - Due: [Date]</li>
</ul>
<h2>Next Steps</h2>
<p>Summary of next steps and follow-up meeting date.</p>`,
  },
  {
    id: "sop",
    name: "Standard Operating Procedure",
    description: "Document step-by-step processes",
    icon: <ListChecks className="h-6 w-6" />,
    content: `<h1>Standard Operating Procedure</h1>
<p><strong>Document ID:</strong> SOP-XXX</p>
<p><strong>Version:</strong> 1.0</p>
<p><strong>Effective Date:</strong> [Date]</p>
<p><strong>Owner:</strong> [Department/Role]</p>
<hr>
<h2>Purpose</h2>
<p>Describe the purpose and objective of this procedure.</p>
<h2>Scope</h2>
<p>Define who this procedure applies to and under what circumstances.</p>
<h2>Prerequisites</h2>
<ul>
<li>Required access/permissions</li>
<li>Required tools/systems</li>
<li>Required knowledge</li>
</ul>
<h2>Procedure</h2>
<h3>Step 1: [Step Title]</h3>
<p>Detailed instructions for step 1.</p>
<h3>Step 2: [Step Title]</h3>
<p>Detailed instructions for step 2.</p>
<h3>Step 3: [Step Title]</h3>
<p>Detailed instructions for step 3.</p>
<h2>Troubleshooting</h2>
<p><strong>Issue:</strong> Common problem</p>
<p><strong>Solution:</strong> How to resolve it</p>
<h2>Related Documents</h2>
<ul>
<li>Link to related SOP</li>
<li>Link to reference material</li>
</ul>`,
  },
  {
    id: "onboarding",
    name: "Onboarding Guide",
    description: "Welcome and orient new team members",
    icon: <BookOpen className="h-6 w-6" />,
    content: `<h1>Welcome to [Team/Company Name]!</h1>
<p>We're excited to have you join our team. This guide will help you get started.</p>
<hr>
<h2>First Day Checklist</h2>
<ul>
<li>[ ] Get your equipment set up</li>
<li>[ ] Complete HR paperwork</li>
<li>[ ] Set up email and communication tools</li>
<li>[ ] Meet your team members</li>
<li>[ ] Review company policies</li>
</ul>
<h2>First Week Goals</h2>
<ul>
<li>[ ] Complete required training</li>
<li>[ ] Shadow team members</li>
<li>[ ] Set up 1:1 with manager</li>
<li>[ ] Review current projects</li>
</ul>
<h2>Key Contacts</h2>
<ul>
<li><strong>Manager:</strong> [Name] - [Email]</li>
<li><strong>HR:</strong> [Name] - [Email]</li>
<li><strong>IT Support:</strong> [Email/Ticket System]</li>
</ul>
<h2>Important Links</h2>
<ul>
<li>Company Handbook</li>
<li>Benefits Information</li>
<li>IT Help Desk</li>
<li>Team Calendar</li>
</ul>
<h2>Tools We Use</h2>
<ul>
<li><strong>Communication:</strong> [Tool names]</li>
<li><strong>Project Management:</strong> [Tool names]</li>
<li><strong>Documentation:</strong> [Tool names]</li>
</ul>`,
  },
  {
    id: "how-to",
    name: "How-To Article",
    description: "Explain how to accomplish a task",
    icon: <HelpCircle className="h-6 w-6" />,
    content: `<h1>How to [Task Name]</h1>
<p><strong>Last Updated:</strong> [Date]</p>
<p><strong>Time Required:</strong> [Estimate]</p>
<hr>
<h2>Overview</h2>
<p>Brief description of what this guide covers and why it's useful.</p>
<h2>Before You Begin</h2>
<p>What you'll need:</p>
<ul>
<li>Requirement 1</li>
<li>Requirement 2</li>
<li>Requirement 3</li>
</ul>
<h2>Instructions</h2>
<h3>Step 1</h3>
<p>Detailed instructions with any relevant tips or warnings.</p>
<h3>Step 2</h3>
<p>Continue with clear, numbered steps.</p>
<h3>Step 3</h3>
<p>Include screenshots or examples where helpful.</p>
<h2>Tips & Best Practices</h2>
<ul>
<li>Helpful tip 1</li>
<li>Helpful tip 2</li>
</ul>
<h2>Common Issues</h2>
<p><strong>Problem:</strong> Description of common issue</p>
<p><strong>Solution:</strong> How to fix it</p>
<h2>Need More Help?</h2>
<p>Contact [Team/Person] or refer to [Related Documentation].</p>`,
  },
  {
    id: "project-brief",
    name: "Project Brief",
    description: "Outline project goals and requirements",
    icon: <FileCheck className="h-6 w-6" />,
    content: `<h1>Project Brief: [Project Name]</h1>
<p><strong>Project Owner:</strong> [Name]</p>
<p><strong>Start Date:</strong> [Date]</p>
<p><strong>Target Completion:</strong> [Date]</p>
<hr>
<h2>Executive Summary</h2>
<p>Brief overview of the project and its significance.</p>
<h2>Objectives</h2>
<ul>
<li>Primary objective 1</li>
<li>Primary objective 2</li>
<li>Primary objective 3</li>
</ul>
<h2>Scope</h2>
<h3>In Scope</h3>
<ul>
<li>Deliverable 1</li>
<li>Deliverable 2</li>
</ul>
<h3>Out of Scope</h3>
<ul>
<li>Items explicitly not included</li>
</ul>
<h2>Stakeholders</h2>
<ul>
<li><strong>Sponsor:</strong> [Name]</li>
<li><strong>Project Lead:</strong> [Name]</li>
<li><strong>Team Members:</strong> [Names]</li>
</ul>
<h2>Timeline & Milestones</h2>
<ul>
<li><strong>Phase 1:</strong> [Dates] - Description</li>
<li><strong>Phase 2:</strong> [Dates] - Description</li>
<li><strong>Launch:</strong> [Date]</li>
</ul>
<h2>Success Metrics</h2>
<ul>
<li>KPI 1: Target</li>
<li>KPI 2: Target</li>
</ul>
<h2>Risks & Mitigation</h2>
<ul>
<li><strong>Risk:</strong> Description | <strong>Mitigation:</strong> Plan</li>
</ul>`,
  },
];

interface WikiTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (title: string, content: string) => void;
}

export const WikiTemplatesDialog = ({
  open,
  onOpenChange,
  onSelectTemplate,
}: WikiTemplatesDialogProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleSelect = () => {
    const template = TEMPLATES.find((t) => t.id === selectedTemplate);
    if (template) {
      const title = template.id === "blank" ? "Untitled Page" : template.name;
      onSelectTemplate(title, template.content);
      onOpenChange(false);
      setSelectedTemplate(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-4">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={cn(
                "flex flex-col items-center p-4 rounded-lg border-2 transition-all text-left",
                "hover:border-primary/50 hover:bg-muted/50",
                selectedTemplate === template.id
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
            >
              <div
                className={cn(
                  "p-3 rounded-lg mb-2",
                  selectedTemplate === template.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {template.icon}
              </div>
              <span className="font-medium text-sm">{template.name}</span>
              <span className="text-xs text-muted-foreground text-center mt-1">
                {template.description}
              </span>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedTemplate}>
            Use Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
