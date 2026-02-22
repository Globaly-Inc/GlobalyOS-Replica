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

    const { featureName, featureLabel, featureDescription } = await req.json();
    if (!featureName || !featureLabel) {
      return new Response(JSON.stringify({ error: "featureName and featureLabel are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a senior Product Manager creating a comprehensive Product Requirements Document (PRD) for a SaaS platform called GlobalyOS — a Business Operating System that combines HRMS, team communication, Wiki/knowledge base, and CRM.

Generate a thorough, industry-standard PRD for the feature described below. The PRD must be professional, actionable, and follow best practices.

Use the following structure with clear markdown headings:

# PRD: [Feature Name]

## 1. Executive Summary
Brief overview of the feature, its purpose, and expected impact.

## 2. Problem Statement & Goals
What problem does this solve? What are the measurable goals?

## 3. User Personas & Use Cases
Who uses this feature? Describe 2-3 personas with specific use cases.

## 4. Functional Requirements
Detailed list of what the feature must do. Use numbered sub-sections (FR-1, FR-2, etc.).

## 5. Non-Functional Requirements
Performance targets, security considerations, scalability, accessibility, and compliance requirements.

## 6. Data Model & API Design
Describe the key entities, relationships, and API endpoints needed.

## 7. UI/UX Considerations
Wireframe descriptions, interaction patterns, responsive design notes, and accessibility guidelines.

## 8. Success Metrics & KPIs
How will we measure if this feature is successful? Include specific metrics.

## 9. Dependencies & Risks
External dependencies, technical risks, and mitigation strategies.

## 10. Timeline & Milestones
Suggested phases with estimated timelines.

## 11. Open Questions
List any unresolved questions or decisions that need stakeholder input.

Be specific, thorough, and practical. Include realistic examples relevant to a multi-tenant B2B SaaS platform.`;

    const userPrompt = `Generate a comprehensive PRD for the following feature:

**Feature Name:** ${featureLabel}
**Technical Key:** ${featureName}
**Description:** ${featureDescription || "No description provided."}

Please create a detailed, production-ready PRD document.`;

    console.log("Calling Lovable AI Gateway for PRD generation...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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

    console.log("PRD markdown generated, creating PDF...");

    // Generate a simple text-based PDF
    const pdfContent = generateSimplePdf(markdownContent, featureLabel);

    // Upload to storage
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const fileId = crypto.randomUUID();
    const filePath = `${featureName}/${fileId}.pdf`;
    const fileName = `PRD - ${featureLabel} - ${new Date().toISOString().split("T")[0]}.pdf`;

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
        feature_name: featureName,
        title: `PRD - ${featureLabel}`,
        description: "AI-generated Product Requirements Document",
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

    console.log("PRD generated and saved successfully:", prdRecord.id);

    return new Response(JSON.stringify({ success: true, prd: prdRecord }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-feature-prd error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Generate a minimal valid PDF from text content.
 * This creates a basic PDF with the markdown text rendered as plain text lines.
 */
function generateSimplePdf(markdown: string, title: string): Uint8Array {
  const lines = markdown.split("\n");
  const pageWidth = 595; // A4
  const pageHeight = 842;
  const margin = 50;
  const lineHeight = 14;
  const maxCharsPerLine = 85;
  const usableHeight = pageHeight - margin * 2;
  const linesPerPage = Math.floor(usableHeight / lineHeight);

  // Word-wrap and prepare all lines
  const wrappedLines: { text: string; bold: boolean; fontSize: number }[] = [];
  for (const line of lines) {
    const trimmed = line.trimEnd();

    let bold = false;
    let fontSize = 10;
    let displayText = trimmed;

    // Detect headings
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
    } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      displayText = trimmed.slice(2, -2);
      bold = true;
    }

    // Strip remaining markdown formatting
    displayText = displayText.replace(/\*\*(.*?)\*\*/g, "$1");
    displayText = displayText.replace(/\*(.*?)\*/g, "$1");
    displayText = displayText.replace(/`(.*?)`/g, "$1");

    if (displayText === "") {
      wrappedLines.push({ text: "", bold: false, fontSize: 10 });
    } else {
      // Word wrap
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

  // Split into pages
  const pages: { text: string; bold: boolean; fontSize: number }[][] = [];
  for (let i = 0; i < wrappedLines.length; i += linesPerPage) {
    pages.push(wrappedLines.slice(i, i + linesPerPage));
  }

  if (pages.length === 0) {
    pages.push([{ text: "Empty PRD", bold: false, fontSize: 10 }]);
  }

  // Build PDF
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

  // Header
  const header = "%PDF-1.4\n";
  currentOffset = new TextEncoder().encode(header).length;

  // Fonts
  const fontRegular = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  );
  const fontBold = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  );

  // Pages content streams and page objects
  const pageObjIds: number[] = [];

  for (const page of pages) {
    // Build content stream
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
      // Reset position for next line
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

  // Pages object
  const pagesId = addObject(
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjIds.length} >>`
  );

  // Catalog
  const catalogId = addObject(
    `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
  );

  // Fix page parent references
  const pagesRef = `${pagesId} 0 R`;
  for (let i = 0; i < objects.length; i++) {
    objects[i] = objects[i].replace(/PAGES_REF/g, pagesRef);
  }

  // Rebuild with correct offsets
  let pdf = header;
  const finalOffsets: number[] = [];
  for (const obj of objects) {
    finalOffsets.push(new TextEncoder().encode(pdf).length);
    pdf += obj;
  }

  // Cross-reference table
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
