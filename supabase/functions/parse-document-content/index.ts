import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseRequest {
  fileContent: string; // base64 encoded
  fileName: string;
  mimeType?: string;
}

// Simple CSV parser
function parseCSV(content: string): string {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return '';
  
  const result: string[] = [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  result.push(`Headers: ${headers.join(', ')}`);
  result.push('');
  
  for (let i = 1; i < Math.min(lines.length, 100); i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = headers.map((h, idx) => `${h}: ${values[idx] || ''}`).join(', ');
    result.push(`Row ${i}: ${row}`);
  }
  
  if (lines.length > 100) {
    result.push(`... and ${lines.length - 100} more rows`);
  }
  
  return result.join('\n');
}

// Parse DOCX - extract text from document.xml
async function parseDOCX(base64Content: string): Promise<string> {
  try {
    // Decode base64 to binary
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Use JSZip to extract content
    const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
    const zip = await JSZip.loadAsync(bytes);
    
    // Get document.xml
    const docXml = await zip.file("word/document.xml")?.async("string");
    if (!docXml) {
      throw new Error("Could not find document.xml in DOCX file");
    }
    
    // Extract text content from XML
    // Remove XML tags and extract text
    const textContent = docXml
      .replace(/<w:p[^>]*>/g, '\n') // Paragraph breaks
      .replace(/<w:br[^>]*>/g, '\n') // Line breaks
      .replace(/<w:tab[^>]*>/g, '\t') // Tabs
      .replace(/<[^>]+>/g, '') // Remove all remaining tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
      .trim();
    
    return textContent;
  } catch (error) {
    console.error("DOCX parsing error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to parse DOCX: ${message}`);
  }
}
// Parse XLSX - extract text from sheets
async function parseXLSX(base64Content: string): Promise<string> {
  try {
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
    const zip = await JSZip.loadAsync(bytes);
    
    // Get shared strings (for cell text values)
    const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("string");
    const sharedStrings: string[] = [];
    
    if (sharedStringsXml) {
      const matches = sharedStringsXml.matchAll(/<t[^>]*>([^<]*)<\/t>/g);
      for (const match of matches) {
        sharedStrings.push(match[1]);
      }
    }
    
    // Get sheet1.xml
    const sheet1Xml = await zip.file("xl/worksheets/sheet1.xml")?.async("string");
    if (!sheet1Xml) {
      throw new Error("Could not find sheet1.xml in XLSX file");
    }
    
    const result: string[] = [];
    const rows = sheet1Xml.matchAll(/<row[^>]*>(.*?)<\/row>/gs);
    let rowNum = 0;
    
    for (const row of rows) {
      rowNum++;
      if (rowNum > 100) {
        result.push("... (truncated for length)");
        break;
      }
      
      const cells = row[1].matchAll(/<c[^>]*(?:t="s")?[^>]*>(?:<v>(\d+)<\/v>)?/g);
      const cellValues: string[] = [];
      
      for (const cell of cells) {
        if (cell[1] !== undefined) {
          const idx = parseInt(cell[1]);
          if (sharedStrings[idx]) {
            cellValues.push(sharedStrings[idx]);
          } else {
            cellValues.push(cell[1]);
          }
        }
      }
      
      if (cellValues.length > 0) {
        result.push(`Row ${rowNum}: ${cellValues.join(' | ')}`);
      }
    }
    
    return result.join('\n');
  } catch (error) {
    console.error("XLSX parsing error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to parse XLSX: ${message}`);
  }
}

// Parse PDF - basic text extraction
async function parsePDF(base64Content: string): Promise<string> {
  try {
    // Decode base64 to binary
    const binaryString = atob(base64Content);
    
    // Simple text extraction from PDF
    // This is a basic approach - extracts visible text streams
    const textMatches: string[] = [];
    
    // Look for text streams in the PDF
    // PDF text is often between BT and ET markers
    const btEtPattern = /BT\s*([\s\S]*?)\s*ET/g;
    let match;
    
    while ((match = btEtPattern.exec(binaryString)) !== null) {
      const textBlock = match[1];
      // Extract text from Tj and TJ operators
      const tjPattern = /\(([^)]*)\)\s*Tj|\[([^\]]*)\]\s*TJ/g;
      let textMatch;
      
      while ((textMatch = tjPattern.exec(textBlock)) !== null) {
        const text = textMatch[1] || textMatch[2];
        if (text) {
          // Clean up the text
          const cleaned = text
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          if (cleaned && cleaned.length > 1) {
            textMatches.push(cleaned);
          }
        }
      }
    }
    
    // Also try to find plain text content
    const textPattern = /\/Contents\s*\(([\s\S]*?)\)/g;
    while ((match = textPattern.exec(binaryString)) !== null) {
      const content = match[1].replace(/\\\(/g, '(').replace(/\\\)/g, ')');
      if (content.length > 10) {
        textMatches.push(content);
      }
    }
    
    // Extract text that looks readable
    const plainTextPattern = /([A-Za-z][A-Za-z0-9\s\.,;:!?'\-]{20,})/g;
    while ((match = plainTextPattern.exec(binaryString)) !== null) {
      if (match[1].length > 30 && /[aeiou]/i.test(match[1])) {
        textMatches.push(match[1].trim());
      }
    }
    
    if (textMatches.length === 0) {
      return "PDF text extraction limited. For best results, copy text manually or use a dedicated PDF tool. The document was uploaded but text extraction was minimal.";
    }
    
    // Deduplicate and join
    const uniqueTexts = [...new Set(textMatches)];
    return uniqueTexts.slice(0, 500).join('\n');
  } catch (error) {
    console.error("PDF parsing error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to parse PDF: ${message}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, fileName, mimeType }: ParseRequest = await req.json();
    
    if (!fileContent || !fileName) {
      return new Response(
        JSON.stringify({ error: "Missing fileContent or fileName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extension = fileName.toLowerCase().split('.').pop();
    let extractedText = "";
    let pageCount: number | undefined;

    console.log(`Parsing document: ${fileName} (extension: ${extension})`);

    switch (extension) {
      case 'csv':
        // CSV is text-based, decode and parse
        const csvContent = atob(fileContent);
        extractedText = parseCSV(csvContent);
        break;

      case 'txt':
      case 'md':
        // Plain text files
        extractedText = atob(fileContent);
        break;

      case 'docx':
        extractedText = await parseDOCX(fileContent);
        break;

      case 'xlsx':
      case 'xls':
        extractedText = await parseXLSX(fileContent);
        break;

      case 'pdf':
        extractedText = await parsePDF(fileContent);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unsupported file format: ${extension}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`Successfully extracted ${extractedText.length} characters from ${fileName}`);

    return new Response(
      JSON.stringify({ 
        text: extractedText,
        pageCount,
        characterCount: extractedText.length,
        fileName 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Document parsing error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to parse document" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
