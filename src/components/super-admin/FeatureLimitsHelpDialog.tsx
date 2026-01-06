import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HelpCircle, Info } from "lucide-react";

interface FeatureLimitsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEATURE_DOCUMENTATION = [
  {
    feature: "storage_gb",
    displayName: "Storage",
    unit: "GB",
    description: "Total file storage across Wiki attachments, Chat files, Employee documents, and Profile avatars.",
    enforcement: "Checked on every file upload. Uploads are blocked when limit is reached.",
    example: "10 = 10GB max storage",
  },
  {
    feature: "ai_queries",
    displayName: "AI Queries",
    unit: "queries",
    description: "Monthly AI assistant interactions including Ask AI in Wiki, performance review generation, and chat AI features.",
    enforcement: "Tracked per billing period. Counter resets at period start.",
    example: "100 = 100 AI queries per month",
  },
  {
    feature: "team_members",
    displayName: "Team Members",
    unit: "count",
    description: "Maximum number of active employees that can be added to the organization.",
    enforcement: "Checked when creating or activating employees. Inactive employees don't count.",
    example: "25 = max 25 active employees",
  },
  {
    feature: "attendance_scans",
    displayName: "Attendance Scans",
    unit: "count",
    description: "Monthly QR code scans and location-based check-ins for attendance tracking.",
    enforcement: "Auto-tracked via database trigger on attendance_records inserts.",
    example: "1000 = 1000 scans per month",
  },
  {
    feature: "leave_requests",
    displayName: "Leave Requests",
    unit: "count",
    description: "Monthly leave/time-off requests that can be submitted.",
    enforcement: "Auto-tracked via database trigger on leave_requests inserts.",
    example: "200 = 200 requests per month",
  },
  {
    feature: "performance_reviews",
    displayName: "Performance Reviews",
    unit: "count",
    description: "Monthly performance review cycles or individual reviews that can be created.",
    enforcement: "Checked when creating review cycles or individual reviews.",
    example: "50 = 50 reviews per month",
  },
  {
    feature: "wiki_pages",
    displayName: "Wiki Pages",
    unit: "count",
    description: "Total number of wiki pages (not including folders) in the organization.",
    enforcement: "Checked when creating new wiki pages. Total count, not monthly.",
    example: "100 = max 100 wiki pages total",
  },
  {
    feature: "chat_spaces",
    displayName: "Chat Spaces",
    unit: "count",
    description: "Total number of chat spaces (channels/groups) that can be created.",
    enforcement: "Checked when creating new spaces. DMs don't count against this limit.",
    example: "20 = max 20 chat spaces",
  },
  {
    feature: "offices",
    displayName: "Offices",
    unit: "count",
    description: "Number of office locations that can be configured.",
    enforcement: "Checked when adding new offices.",
    example: "5 = max 5 office locations",
  },
  {
    feature: "projects",
    displayName: "Projects",
    unit: "count",
    description: "Number of active projects for employee assignment and tracking.",
    enforcement: "Checked when creating new projects.",
    example: "10 = max 10 active projects",
  },
  {
    feature: "kpi_metrics",
    displayName: "KPI Metrics",
    unit: "count",
    description: "Total KPI metrics that can be tracked across all employees.",
    enforcement: "Checked when creating new KPIs.",
    example: "50 = max 50 KPI metrics",
  },
  {
    feature: "okr_objectives",
    displayName: "OKR Objectives",
    unit: "count",
    description: "Total OKR objectives that can be created.",
    enforcement: "Checked when creating objectives.",
    example: "100 = max 100 objectives",
  },
];

export function FeatureLimitsHelpDialog({ open, onOpenChange }: FeatureLimitsHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Feature Limits Reference
          </DialogTitle>
          <DialogDescription>
            Complete guide to all available feature keys and how to configure them.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Quick Tips */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-primary" />
                Configuration Tips
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Set <code className="bg-muted px-1.5 py-0.5 rounded">-1</code> or leave empty for <strong>unlimited</strong></li>
                <li>• <strong>Feature key</strong> must match exactly as shown in the table below</li>
                <li>• <strong>Overage rate</strong> is the cost per unit when limit is exceeded (optional)</li>
                <li>• Inactive features are not enforced, even if they have limits set</li>
                <li>• Monthly limits reset at the start of each billing period</li>
                <li>• Total limits (non-monthly) persist across billing periods</li>
              </ul>
            </div>

            {/* Feature Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Feature Key</TableHead>
                  <TableHead className="w-32">Display Name</TableHead>
                  <TableHead className="w-20">Unit</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FEATURE_DOCUMENTATION.map((feature) => (
                  <TableRow key={feature.feature}>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                        {feature.feature}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{feature.displayName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{feature.unit}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">{feature.description}</p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Enforcement:</strong> {feature.enforcement}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Example:</strong> {feature.example}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Custom Features Note */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Adding Custom Features</h4>
              <p className="text-sm text-muted-foreground">
                You can add custom feature keys beyond this list. However, you must also implement
                the enforcement logic in the application code for custom features to be respected.
                Contact the development team before adding custom features.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
