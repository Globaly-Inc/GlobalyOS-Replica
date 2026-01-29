import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface WikiTemplate {
  id: string;
  name: string;
  description: string | null;
  content: string | null;
  category: string;
  subcategory: string | null;
  icon_name: string | null;
  tags: string[] | null;
  business_category: string | null;
  country_code: string | null;
}

interface Organization {
  business_category?: string | null;
  country?: string | null;
}

// Built-in templates as fallback
const BUILTIN_TEMPLATES: WikiTemplate[] = [
  {
    id: "builtin-blank",
    name: "Blank Page",
    description: "Start with an empty page",
    content: "",
    category: "general",
    subcategory: null,
    icon_name: "FileText",
    tags: ["blank", "empty"],
    business_category: null,
    country_code: null,
  },
  {
    id: "builtin-meeting-notes",
    name: "Meeting Notes",
    description: "Capture meeting discussions and action items",
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
    category: "general",
    subcategory: "meetings",
    icon_name: "Users",
    tags: ["meeting", "notes", "action items"],
    business_category: null,
    country_code: null,
  },
  {
    id: "builtin-sop",
    name: "Standard Operating Procedure",
    description: "Document step-by-step processes",
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
<p><strong>Solution:</strong> How to resolve it</p>`,
    category: "sops",
    subcategory: null,
    icon_name: "ListChecks",
    tags: ["sop", "procedure", "process"],
    business_category: null,
    country_code: null,
  },
];

export function useWikiTemplates() {
  const { currentOrg } = useOrganization();
  const org = currentOrg as Organization | null;

  return useQuery({
    queryKey: ["wiki-templates", org?.business_category, org?.country],
    queryFn: async () => {
      // Fetch active templates from database
      const { data, error } = await supabase
        .from("template_wiki_documents")
        .select("id, name, description, content, category, subcategory, icon_name, tags, business_category, country_code")
        .eq("is_active", true)
        .order("category")
        .order("sort_order");

      if (error) {
        console.error("Error fetching wiki templates:", error);
        return BUILTIN_TEMPLATES;
      }

      const dbTemplates = data as WikiTemplate[];
      
      // If no database templates, return builtin ones
      if (!dbTemplates || dbTemplates.length === 0) {
        return BUILTIN_TEMPLATES;
      }

      // Filter templates based on organization's business category and country
      const orgBusinessCategory = org?.business_category;
      const orgCountry = org?.country;

      const filteredTemplates = dbTemplates.filter((template) => {
        // Universal templates (both null) always show
        if (!template.business_category && !template.country_code) {
          return true;
        }

        // Check business category match
        const businessMatch = !template.business_category || 
          template.business_category === orgBusinessCategory;

        // Check country match
        const countryMatch = !template.country_code || 
          template.country_code === orgCountry;

        return businessMatch && countryMatch;
      });

      // Sort templates by relevance (exact matches first)
      const sortedTemplates = filteredTemplates.sort((a, b) => {
        const aScore = getRelevanceScore(a, orgBusinessCategory, orgCountry);
        const bScore = getRelevanceScore(b, orgBusinessCategory, orgCountry);
        return bScore - aScore;
      });

      // Combine with builtin templates (add blank template at the start)
      const blankTemplate = BUILTIN_TEMPLATES.find(t => t.id === "builtin-blank")!;
      return [blankTemplate, ...sortedTemplates];
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

// Helper to score template relevance
function getRelevanceScore(
  template: WikiTemplate, 
  orgBusinessCategory?: string | null, 
  orgCountry?: string | null
): number {
  let score = 0;
  
  // Exact business category match
  if (template.business_category && template.business_category === orgBusinessCategory) {
    score += 2;
  }
  
  // Exact country match
  if (template.country_code && template.country_code === orgCountry) {
    score += 2;
  }
  
  // Universal templates get base score
  if (!template.business_category && !template.country_code) {
    score += 1;
  }
  
  return score;
}

// Hook to get templates grouped by category
export function useWikiTemplatesGrouped() {
  const { data: templates = [], ...rest } = useWikiTemplates();

  const grouped = templates.reduce((acc, template) => {
    const category = template.category || "general";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, WikiTemplate[]>);

  return { grouped, templates, ...rest };
}
