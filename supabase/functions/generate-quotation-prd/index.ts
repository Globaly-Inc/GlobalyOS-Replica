import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating Quotation Management System PRD...");

    const systemPrompt = `You are a world-class Senior Product Manager at a leading SaaS company. You are creating the most comprehensive and detailed Product Requirements Document (PRD) ever written for a Quotation Management System within GlobalyOS — a multi-tenant Business Operating System.

GlobalyOS combines HRMS, team communication, Wiki/knowledge base, and CRM into one platform. The quotation feature must integrate deeply with the existing CRM module.

## EXISTING CODEBASE CONTEXT

The following entities and tables already exist in the GlobalyOS CRM and must be leveraged:

### CRM Services (crm_services table)
- Services have: name, category, short_description, long_description, service_type (direct/represented_provider/internal_only), provider_partner_id, visibility, status, tags, eligibility_notes, workflow_stages, sla_target_days
- Services are scoped by organization_id and can be linked to offices via crm_service_offices

### CRM Products & Fee Structure (existing tables)
- crm_product_fee_types: Fee categories (e.g., tuition, registration, material)
- crm_product_fee_items: Individual fee line items within a fee type
- crm_product_fee_options: Named fee packages/options (e.g., "Standard Package", "Premium Package") with currency, total amounts
- crm_deal_fees: Fee assignments on deals with revenue_type (revenue/commission), installment_type (equal/custom), tax handling (inclusive/exclusive GST)
- crm_deal_fee_instalments: Individual instalment records with amount, due_date, status (pending/paid/overdue)

### CRM Deals & Pipeline
- crm_deals: contact_id, company_id, pipeline_stage_id, deal_owner, assigned_to, value, status (open/won/lost), expected_close_date
- crm_pipeline_stages: pipeline-based stage management for deal progression

### CRM Contacts & Companies
- crm_contacts: first_name, last_name, email, phone, company_id, lead_temperature, tags, assigned_to
- crm_companies: name, industry, website, with linked contacts

### Partners & Agents
- crm_partners: type (agent/provider/both), contract_status, compliance_docs
- crm_partner_branches: branch locations for partners
- partner_users: users belonging to partner organizations

### Accounting System (existing)
- accounting_invoices: invoice_number, contact_id, status (draft/sent/approved/paid/overdue/void), amounts, tax, payment tracking
- accounting_invoice_lines: line items with account_id, quantity, unit_price, tax
- accounting_invoice_payments: payment records with method, amount, stripe integration

### Client Portal (existing)
- Portal users authenticate via OTP
- Portal has its own API layer (portal-api edge function)
- Supports document viewing, form submissions

### Service Applications (existing)
- service_applications: Applications for services with multi-option support, workflow stages, document requirements
- application_fee_overrides: Custom fee adjustments per application

## REFERENCE DOCUMENT INSIGHTS

Based on reference materials analyzed:

### Create Automated Quotation Flow:
1. User selects a contact from CRM
2. Chooses services from the service catalog
3. For each service, selects a fee option (package) which auto-populates fee structure
4. Can add multiple options (Option A, Option B, etc.) for the contact to choose from
5. Each option can have different services and fee configurations
6. Tax (GST) can be inclusive or exclusive per fee item
7. Instalments can be equal-split or custom amounts
8. Revenue type distinguishes between revenue and commission items
9. Payment details section for bank transfer information

### Quotation Template System:
1. Templates save the entire quotation structure (services, fees, instalments) for reuse
2. Templates can be created from scratch or saved from an existing quotation
3. Templates are organization-scoped
4. Quick-apply: select template -> auto-populate quotation

### Sending & Approving Quotation:
1. Quotation generates a unique public URL with expiry
2. Contact receives email with the quotation link
3. Public page shows all options with pricing breakdown
4. Contact can approve one specific option
5. Approval triggers automatic deal creation or update
6. Status transitions: Draft -> Sent -> Viewed -> Approved -> Processed -> Archived
7. Approved quotation can auto-generate an invoice

### Tax in Automated Quotation:
1. GST inclusive: tax is included in the displayed amount
2. GST exclusive: tax is added on top of the base amount
3. Tax rate configurable per fee item
4. Tax summary shown at quotation level
5. Different tax rates can apply to different fee items within the same quotation

## INDUSTRY BEST PRACTICES & GAPS TO ADDRESS

Based on research of leading CPQ (Configure-Price-Quote) systems in 2025:

### Must-Have Features (Industry Standard):
1. Multi-currency support with exchange rate handling
2. Discount management (percentage, fixed amount, tiered)
3. Validity period / expiry dates on quotations
4. Version control (quote revisions with history)
5. Approval workflows (internal approval before sending)
6. Digital signatures / e-signatures
7. PDF generation with customizable templates
8. Email integration with tracking (opened, clicked)
9. Quote-to-order/invoice automation
10. Mobile-responsive public quotation view

### Differentiating AI Features (Gap Fillers):
1. AI Smart Pricing: Analyze historical deal data to suggest optimal pricing
2. AI Quote Generator: Auto-create quotation from deal context
3. AI Follow-Up Reminders: Predict best time to follow up on pending quotes
4. AI Template Recommendations: Suggest best template based on contact profile
5. AI Negotiation Assistant: Suggest counter-offers during negotiations
6. AI Content Generator: Generate professional cover letters and descriptions
7. AI Win Probability: Predict likelihood of quote acceptance

### Modern UX Patterns:
1. Drag-and-drop service ordering within options
2. Real-time pricing calculator with instant totals
3. Side-by-side option comparison view (public page)
4. Interactive fee breakdown with expand/collapse
5. Inline editing of amounts and descriptions
6. Auto-save with undo/redo
7. Comment threads between staff and client on quotation

Write the PRD with extreme detail. Every section should be thorough enough to serve as a complete implementation specification. Include specific field names, data types, API endpoint designs, and UI component descriptions.`;

    const userPrompt = `Generate the most comprehensive PRD document possible for the Quotation Management System in GlobalyOS.

The PRD must cover ALL of the following in extreme detail:

# PRD: Quotation Management System — GlobalyOS

## 1. Executive Summary
- Vision, scope, and strategic value
- How quotations bridge CRM pipeline to accounting invoicing

## 2. Problem Statement & Goals
- Current gap: no structured quote-to-invoice pipeline
- Manual pricing errors, slow approval cycles
- Goals: reduce quote creation time by 70%, increase approval rates by 40%

## 3. User Personas & Use Cases
- Counselor/Sales Rep: Creates and sends quotations
- Manager/Admin: Oversees quotation performance, configures templates
- Contact/Client (external): Views and approves quotations online
- Agent/Partner: Creates quotations on behalf of clients via agent portal
- Finance Team: Converts approved quotations to invoices

## 4. Functional Requirements (FR-1 through FR-20+)
Cover every feature in detail:
- Quotation CRUD with multi-option support
- Service selection from existing crm_services catalog
- Fee configuration reusing crm_product_fee_options/types/items
- Tax handling (inclusive/exclusive GST) per fee item
- Instalment plans (equal/custom split, revenue/commission)
- Template management (create, apply, edit, delete)
- Public quotation link with token-based auth and expiry
- Contact approval flow (select option -> approve -> trigger deal)
- Quote-to-Invoice automation
- Email composition with PDF attachment
- PDF generation with branded templates
- Version control and revision history
- Discount management
- Internal approval workflows
- Comment/note system (staff + client)
- Notifications (in-app, email, push)
- Client Portal integration
- Agent Portal quotation creation
- Dashboard and analytics
- AI-powered features (smart pricing, auto-fill, follow-up)

## 5. Non-Functional Requirements
- Performance, security, scalability, accessibility
- Multi-tenant isolation requirements
- GDPR/data privacy for public quotation links

## 6. Data Model & API Design
- Complete table schemas with column types for:
  - crm_quotations
  - crm_quotation_options
  - crm_quotation_option_services
  - crm_quotation_service_fees
  - crm_quotation_comments
  - crm_quotation_settings
- RLS policy descriptions
- API endpoint specifications
- Relationships to existing tables (crm_services, crm_contacts, crm_deals, accounting_invoices)

## 7. UI/UX Considerations
- Quotation list page layout and filters
- Quotation detail/editor page sections
- Multi-option editor with drag-and-drop
- Service selection drawer
- Fee configuration panel
- Public quotation approval page
- Mobile responsive design
- Accessibility guidelines (WCAG 2.1 AA)

## 8. Success Metrics & KPIs
- Quotation creation time, approval rate, conversion rate
- Average time to approval, revenue per quotation
- Template reuse rate, AI suggestion acceptance rate

## 9. Dependencies & Risks
- Dependencies on existing CRM, accounting, partner systems
- Risk of data migration for existing manual quotes
- Performance risk with large quotations (many options/services)

## 10. Timeline & Milestones
- Phase breakdown with estimated effort

## 11. Gap Analysis vs Industry Leaders
- Compare to HubSpot, Salesforce CPQ, PandaDoc, Proposify
- Feature gaps identified and addressed

## 12. AI Value-Add Opportunities
- Detailed description of each AI feature
- Implementation approach and expected impact
- Data requirements and model selection

Make this the most thorough PRD document possible. Include specific field names, data types, enum values, and implementation notes throughout.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const markdownContent = aiData.choices?.[0]?.message?.content;
    if (!markdownContent) {
      throw new Error("No content received from AI");
    }

    console.log("PRD markdown generated, length:", markdownContent.length, "chars. Creating PDF...");

    // Generate PDF
    const pdfContent = generateSimplePdf(markdownContent, "Quotation Management System");

    // Upload to storage
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const fileId = crypto.randomUUID();
    const filePath = `quotations/${fileId}.pdf`;
    const fileName = `PRD - Quotation Management System - ${new Date().toISOString().split("T")[0]}.pdf`;

    const { error: uploadError } = await adminClient.storage
      .from("feature-prd-documents")
      .upload(filePath, pdfContent, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Insert record
    const { data: prdRecord, error: insertError } = await adminClient
      .from("feature_prd_documents")
      .insert({
        feature_name: "quotations",
        title: "PRD - Quotation Management System",
        description: "Comprehensive AI-generated PRD with full codebase context, industry research, and implementation specifications for the Quotation Management feature.",
        file_path: filePath,
        file_name: fileName,
        generated_at: new Date().toISOString(),
        created_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to save PRD record: ${insertError.message}`);
    }

    // Also return the markdown for immediate viewing
    console.log("PRD generated and saved successfully:", prdRecord.id);

    return new Response(JSON.stringify({ success: true, prd: prdRecord, markdown: markdownContent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quotation-prd error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Generate a minimal valid PDF from text content.
 */
function generateSimplePdf(markdown: string, title: string): Uint8Array {
  const lines = markdown.split("\n");
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const lineHeight = 14;
  const maxCharsPerLine = 85;
  const usableHeight = pageHeight - margin * 2;
  const linesPerPage = Math.floor(usableHeight / lineHeight);

  const wrappedLines: { text: string; bold: boolean; fontSize: number }[] = [];
  for (const line of lines) {
    const trimmed = line.trimEnd();

    let bold = false;
    let fontSize = 10;
    let displayText = trimmed;

    if (trimmed.startsWith("# ")) {
      displayText = trimmed.slice(2);
      bold = true;
      fontSize = 18;
    } else if (trimmed.startsWith("## ")) {
      displayText = trimmed.slice(3);
      bold = true;
      fontSize = 14;
    } else if (trimmed.startsWith("### ")) {
      displayText = trimmed.slice(4);
      bold = true;
      fontSize = 12;
    } else if (trimmed.startsWith("#### ")) {
      displayText = trimmed.slice(5);
      bold = true;
      fontSize = 11;
    } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      displayText = trimmed.slice(2, -2);
      bold = true;
    }

    displayText = displayText.replace(/\*\*(.*?)\*\*/g, "$1");
    displayText = displayText.replace(/\*(.*?)\*/g, "$1");
    displayText = displayText.replace(/`(.*?)`/g, "$1");
    displayText = displayText.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    if (displayText === "") {
      wrappedLines.push({ text: "", bold: false, fontSize: 10 });
    } else {
      const words = displayText.split(" ");
      let currentLine = "";
      for (const word of words) {
        if (currentLine.length + word.length + 1 > maxCharsPerLine) {
          wrappedLines.push({ text: currentLine, bold, fontSize });
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + " " + word : word;
        }
      }
      if (currentLine) {
        wrappedLines.push({ text: currentLine, bold, fontSize });
      }
    }
  }

  const pages: { text: string; bold: boolean; fontSize: number }[][] = [];
  for (let i = 0; i < wrappedLines.length; i += linesPerPage) {
    pages.push(wrappedLines.slice(i, i + linesPerPage));
  }

  if (pages.length === 0) {
    pages.push([{ text: "Empty PRD", bold: false, fontSize: 10 }]);
  }

  const objects: string[] = [];
  let objectCount = 0;
  const offsets: number[] = [];
  let currentOffset = 0;

  const addObject = (content: string) => {
    objectCount++;
    offsets.push(currentOffset);
    const obj = `${objectCount} 0 obj\n${content}\nendobj\n`;
    objects.push(obj);
    currentOffset += new TextEncoder().encode(obj).length;
    return objectCount;
  };

  const header = "%PDF-1.4\n";
  currentOffset = new TextEncoder().encode(header).length;

  const fontRegular = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBold = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  const pageObjIds: number[] = [];

  for (const page of pages) {
    let stream = "BT\n";
    let y = pageHeight - margin;

    for (const line of page) {
      const font = line.bold ? "F2" : "F1";
      const escaped = line.text
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
      stream += `/${font} ${line.fontSize} Tf\n`;
      stream += `${margin} ${y} Td\n`;
      stream += `(${escaped}) Tj\n`;
      y -= lineHeight;
      stream += `${-margin} ${-y - lineHeight + y + lineHeight} Td\n`;
    }
    stream += "ET\n";

    const streamId = addObject(
      `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}endstream`
    );

    const pageId = addObject(
      `<< /Type /Page /Parent PAGES_REF /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${streamId} 0 R /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> >>`
    );
    pageObjIds.push(pageId);
  }

  const pagesId = addObject(
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjIds.length} >>`
  );

  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const pagesRef = `${pagesId} 0 R`;
  for (let i = 0; i < objects.length; i++) {
    objects[i] = objects[i].replace(/PAGES_REF/g, pagesRef);
  }

  let pdf = header;
  const finalOffsets: number[] = [];
  for (const obj of objects) {
    finalOffsets.push(new TextEncoder().encode(pdf).length);
    pdf += obj;
  }

  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objectCount + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of finalOffsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objectCount + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}
