import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  company?: string;
  subject: string;
  message: string;
}

const subjectLabels: Record<string, string> = {
  general: "General Inquiry",
  demo: "Request a Demo",
  partnership: "Partnership Opportunity",
  press: "Media & Press",
  other: "Other",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-contact-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, company, subject, message }: ContactEmailRequest = await req.json();

    console.log("Processing contact form submission from:", email);

    // Validate required fields
    if (!name || !email || !subject || !message) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const subjectLabel = subjectLabels[subject] || subject;

    // Send notification email to the team
    const teamEmailResponse = await resend.emails.send({
      from: "GlobalyOS Contact <onboarding@resend.dev>",
      to: ["hello@globalyos.com"], // Replace with actual team email
      reply_to: email,
      subject: `[Contact Form] ${subjectLabel} from ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">New Contact Form Submission</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 120px;">Name:</td>
              <td style="padding: 8px 0; color: #333;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0; color: #333;"><a href="mailto:${email}" style="color: #0066cc;">${email}</a></td>
            </tr>
            ${company ? `
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Company:</td>
              <td style="padding: 8px 0; color: #333;">${company}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Subject:</td>
              <td style="padding: 8px 0; color: #333;">${subjectLabel}</td>
            </tr>
          </table>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">Message:</h3>
            <p style="color: #333; white-space: pre-wrap; margin: 0;">${message}</p>
          </div>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This email was sent from the GlobalyOS contact form.
          </p>
        </div>
      `,
    });

    console.log("Team notification email sent:", teamEmailResponse);

    // Send confirmation email to the user
    const userEmailResponse = await resend.emails.send({
      from: "GlobalyOS <onboarding@resend.dev>",
      to: [email],
      subject: "We received your message - GlobalyOS",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Thank you for reaching out, ${name}!</h1>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            We've received your message and will get back to you within 24 hours.
          </p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333;">Your message:</h3>
            <p style="color: #555; font-style: italic; margin: 0;">"${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"</p>
          </div>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            In the meantime, feel free to explore our <a href="https://globalyos.lovable.app/features" style="color: #0066cc;">features</a> 
            or check out our <a href="https://globalyos.lovable.app/blog" style="color: #0066cc;">blog</a> for the latest updates.
          </p>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Best regards,<br>
            <strong>The GlobalyOS Team</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            This is an automated response. Please do not reply directly to this email.
          </p>
        </div>
      `,
    });

    console.log("User confirmation email sent:", userEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Emails sent successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
