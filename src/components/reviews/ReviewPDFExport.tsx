import { format } from "date-fns";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RATING_CRITERIA } from "./RatingCriteriaTooltip";

interface ReviewPDFExportProps {
  review: {
    review_period_start: string;
    review_period_end: string;
    what_went_well?: string | null;
    needs_improvement?: string | null;
    goals_next_period?: string | null;
    overall_rating?: number | null;
    self_what_went_well?: string | null;
    self_needs_improvement?: string | null;
    self_goals_next_period?: string | null;
    self_overall_rating?: number | null;
    self_submitted_at?: string | null;
    employee_comments?: string | null;
    acknowledged_at?: string | null;
    created_at: string;
  };
  employeeName: string;
  employeePosition: string;
  employeeDepartment: string;
  reviewerName: string;
  organizationName: string;
  organizationLogo?: string | null;
}

const getRatingLabel = (rating: number) => {
  return RATING_CRITERIA[rating - 1]?.label || "Not Rated";
};

const generateStars = (rating: number) => {
  return Array.from({ length: 5 })
    .map((_, i) => (i < rating ? "★" : "☆"))
    .join("");
};

export const ReviewPDFExport = ({
  review,
  employeeName,
  employeePosition,
  employeeDepartment,
  reviewerName,
  organizationName,
  organizationLogo,
}: ReviewPDFExportProps) => {
  const handleExport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export PDF");
      return;
    }

    const periodText = `${format(new Date(review.review_period_start), "MMM yyyy")} - ${format(new Date(review.review_period_end), "MMM yyyy")}`;

    const selfAssessmentSection = review.self_submitted_at
      ? `
        <div class="section">
          <h2>Employee Self-Assessment</h2>
          <p class="timestamp">Submitted: ${format(new Date(review.self_submitted_at), "d MMMM yyyy")}</p>
          
          <div class="subsection">
            <h3>What Went Well</h3>
            <p>${review.self_what_went_well?.replace(/\n/g, "<br>") || "Not provided"}</p>
          </div>
          
          <div class="subsection">
            <h3>Areas for Improvement</h3>
            <p>${review.self_needs_improvement?.replace(/\n/g, "<br>") || "Not provided"}</p>
          </div>
          
          <div class="subsection">
            <h3>Goals for Next Period</h3>
            <p>${review.self_goals_next_period?.replace(/\n/g, "<br>") || "Not provided"}</p>
          </div>
          
          <div class="rating-box">
            <span class="rating-label">Self Rating:</span>
            <span class="stars">${generateStars(review.self_overall_rating || 0)}</span>
            <span class="rating-text">(${review.self_overall_rating || 0}/5 - ${getRatingLabel(review.self_overall_rating || 0)})</span>
          </div>
        </div>
      `
      : "";

    const managerReviewSection = `
      <div class="section">
        <h2>Manager Review</h2>
        <p class="reviewer">Reviewed by: ${reviewerName}</p>
        
        <div class="subsection">
          <h3>What Went Well</h3>
          <p>${review.what_went_well?.replace(/\n/g, "<br>") || "Not provided"}</p>
        </div>
        
        <div class="subsection">
          <h3>Areas for Improvement</h3>
          <p>${review.needs_improvement?.replace(/\n/g, "<br>") || "Not provided"}</p>
        </div>
        
        <div class="subsection">
          <h3>Goals for Next Period</h3>
          <p>${review.goals_next_period?.replace(/\n/g, "<br>") || "Not provided"}</p>
        </div>
        
        <div class="rating-box">
          <span class="rating-label">Manager Rating:</span>
          <span class="stars">${generateStars(review.overall_rating || 0)}</span>
          <span class="rating-text">(${review.overall_rating || 0}/5 - ${getRatingLabel(review.overall_rating || 0)})</span>
        </div>
      </div>
    `;

    const ratingsComparisonSection =
      review.self_overall_rating && review.overall_rating
        ? `
        <div class="section comparison">
          <h2>Ratings Comparison</h2>
          <div class="comparison-grid">
            <div class="comparison-item">
              <span class="label">Self Rating</span>
              <span class="stars">${generateStars(review.self_overall_rating)}</span>
              <span class="value">${review.self_overall_rating}/5</span>
            </div>
            <div class="comparison-item">
              <span class="label">Manager Rating</span>
              <span class="stars">${generateStars(review.overall_rating)}</span>
              <span class="value">${review.overall_rating}/5</span>
            </div>
          </div>
        </div>
      `
        : "";

    const acknowledgmentSection = review.acknowledged_at
      ? `
        <div class="section acknowledgment">
          <h2>Employee Acknowledgment</h2>
          <p>Acknowledged on: ${format(new Date(review.acknowledged_at), "d MMMM yyyy 'at' HH:mm")}</p>
          ${review.employee_comments ? `<div class="comments"><h3>Employee Comments</h3><p>${review.employee_comments.replace(/\n/g, "<br>")}</p></div>` : ""}
        </div>
      `
      : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Performance Review - ${employeeName}</title>
        <style>
          @page { size: A4; margin: 2cm; }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            font-size: 11pt;
            line-height: 1.5;
            color: #333;
            margin: 0;
            padding: 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #7c3aed;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .header-left h1 {
            margin: 0 0 4px 0;
            font-size: 24pt;
            color: #7c3aed;
          }
          .header-left p {
            margin: 0;
            color: #666;
          }
          .logo {
            max-height: 50px;
            max-width: 150px;
          }
          .employee-info {
            background: #f8f4ff;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
          }
          .employee-info h2 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 16pt;
          }
          .employee-info p {
            margin: 4px 0;
            color: #666;
          }
          .section {
            margin-bottom: 24px;
            page-break-inside: avoid;
          }
          .section h2 {
            color: #7c3aed;
            font-size: 14pt;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 8px;
            margin-bottom: 16px;
          }
          .subsection {
            margin-bottom: 16px;
          }
          .subsection h3 {
            color: #555;
            font-size: 11pt;
            margin: 0 0 8px 0;
          }
          .subsection p {
            margin: 0;
            color: #333;
          }
          .rating-box {
            background: #fef3c7;
            border-radius: 6px;
            padding: 12px;
            margin-top: 16px;
          }
          .rating-label {
            font-weight: 600;
            margin-right: 8px;
          }
          .stars {
            color: #f59e0b;
            font-size: 14pt;
            margin-right: 8px;
          }
          .rating-text {
            color: #666;
          }
          .comparison {
            background: #f0fdf4;
            border-radius: 8px;
            padding: 16px;
          }
          .comparison-grid {
            display: flex;
            justify-content: space-around;
            gap: 32px;
          }
          .comparison-item {
            text-align: center;
          }
          .comparison-item .label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .comparison-item .value {
            display: block;
            font-size: 18pt;
            color: #7c3aed;
            font-weight: bold;
          }
          .acknowledgment {
            background: #f0f9ff;
            border-radius: 8px;
            padding: 16px;
          }
          .acknowledgment .comments {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #d0e7ff;
          }
          .timestamp, .reviewer {
            color: #666;
            font-size: 10pt;
            margin-bottom: 12px;
          }
          .footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #999;
            font-size: 9pt;
          }
          @media print {
            body { padding: 0; }
            .section { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>Performance Review</h1>
            <p>${periodText}</p>
          </div>
          ${organizationLogo ? `<img src="${organizationLogo}" class="logo" alt="${organizationName}" />` : `<div style="font-size: 14pt; font-weight: bold; color: #7c3aed;">${organizationName}</div>`}
        </div>
        
        <div class="employee-info">
          <h2>${employeeName}</h2>
          <p><strong>Position:</strong> ${employeePosition}</p>
          <p><strong>Department:</strong> ${employeeDepartment}</p>
        </div>
        
        ${selfAssessmentSection}
        ${managerReviewSection}
        ${ratingsComparisonSection}
        ${acknowledgmentSection}
        
        <div class="footer">
          <p>Generated from GlobalyOS on ${format(new Date(), "d MMMM yyyy 'at' HH:mm")}</p>
          <p>This document is confidential and intended for the employee and management only.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4 mr-1" />
      Export PDF
    </Button>
  );
};

export default ReviewPDFExport;
