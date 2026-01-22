/**
 * Office QR Code PDF Export
 * Generates a professional A4 PDF for office QR codes with org branding
 */

import { format } from 'date-fns';

interface OfficeQRPDFExportProps {
  officeName: string;
  qrCodeDataUrl: string;
  orgName: string;
  orgLogoUrl: string | null;
  // Office details
  officeAddress?: string | null;
  officeCity?: string | null;
  officeCountry?: string | null;
  // Organization contact
  orgPhone?: string | null;
  orgEmail?: string | null;
  orgWebsite?: string | null;
}

/**
 * Convert a remote URL to a base64 data URL
 * This ensures images work in print windows without CORS issues
 */
const urlToDataUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const generateOfficeQRPDF = async ({
  officeName,
  qrCodeDataUrl,
  orgName,
  orgLogoUrl,
  officeAddress,
  officeCity,
  officeCountry,
  orgPhone,
  orgEmail,
  orgWebsite,
}: OfficeQRPDFExportProps): Promise<void> => {
  // Convert logo URL to base64 data URL if provided
  let logoDataUrl: string | null = null;
  if (orgLogoUrl) {
    logoDataUrl = await urlToDataUrl(orgLogoUrl);
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download the QR code PDF');
    return;
  }

  const currentDate = format(new Date(), 'd MMMM yyyy');
  const orgInitial = orgName?.charAt(0)?.toUpperCase() || 'O';

  // Build office address line
  const addressParts = [officeAddress, officeCity, officeCountry].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null;

  // Build contact line
  const contactParts = [
    orgPhone,
    orgEmail,
    orgWebsite?.replace(/^https?:\/\//, ''),
  ].filter(Boolean);
  const contactLine = contactParts.length > 0 ? contactParts.join(' • ') : null;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR Check-In - ${officeName}</title>
      <style>
        @page { 
          size: A4 portrait; 
          margin: 0; 
        }
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          color: #1e293b;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 35mm 20mm;
        }
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          width: 100%;
          max-width: 160mm;
        }
        .logo-container {
          margin-bottom: 28px;
        }
        .logo {
          max-height: 80px;
          max-width: 240px;
          object-fit: contain;
        }
        .logo-fallback {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: bold;
          color: white;
        }
        .divider {
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
          margin: 24px 0;
        }
        .office-name {
          font-size: 36pt;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
          line-height: 1.2;
        }
        .subtitle {
          font-size: 18pt;
          color: #64748b;
          margin-bottom: 12px;
        }
        .office-details {
          margin-bottom: 28px;
        }
        .office-address {
          font-size: 13pt;
          color: #64748b;
          max-width: 320px;
          line-height: 1.4;
        }
        .qr-container {
          background: white;
          padding: 24px;
          border-radius: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
          border: 2px solid #e2e8f0;
          margin-bottom: 36px;
        }
        .qr-code {
          width: 260px;
          height: 260px;
        }
        .instructions {
          font-size: 16pt;
          color: #334155;
          line-height: 1.6;
          max-width: 380px;
        }
        .instructions strong {
          color: #3b82f6;
        }
        .geofence-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #dcfce7;
          color: #16a34a;
          padding: 10px 20px;
          border-radius: 24px;
          font-size: 14pt;
          font-weight: 500;
          margin-top: 28px;
        }
        .geofence-icon {
          width: 20px;
          height: 20px;
        }
        .footer {
          position: fixed;
          bottom: 20mm;
          left: 0;
          right: 0;
          text-align: center;
        }
        .footer-divider {
          width: 160mm;
          height: 1px;
          background: #e2e8f0;
          margin: 0 auto 18px;
        }
        .footer-org {
          font-size: 14pt;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
        }
        .footer-contact {
          font-size: 11pt;
          color: #64748b;
          margin-bottom: 10px;
        }
        .footer-date {
          font-size: 10pt;
          color: #94a3b8;
        }
        @media print {
          body { 
            padding: 35mm 20mm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo-container">
          ${logoDataUrl 
            ? `<img src="${logoDataUrl}" class="logo" alt="${orgName}" />`
            : `<div class="logo-fallback">${orgInitial}</div>`
          }
        </div>
        
        <div class="divider"></div>
        
        <h1 class="office-name">${officeName}</h1>
        <p class="subtitle">Check-In Station</p>
        
        ${fullAddress ? `
          <div class="office-details">
            <p class="office-address">${fullAddress}</p>
          </div>
        ` : ''}
        
        <div class="qr-container">
          <img src="${qrCodeDataUrl}" class="qr-code" alt="QR Code" />
        </div>
        
        <p class="instructions">
          Scan this QR code with <strong>GlobalyOS</strong> to check in or check out
        </p>
        
        <div class="geofence-badge">
          <svg class="geofence-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          100m Location Verified
        </div>
      </div>
      
      <div class="footer">
        <div class="footer-divider"></div>
        <p class="footer-org">${orgName}</p>
        ${contactLine ? `<p class="footer-contact">${contactLine}</p>` : ''}
        <p class="footer-date">Generated on ${currentDate}</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for window to fully load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 100);
  };

  // Fallback in case onload doesn't fire
  setTimeout(() => {
    printWindow.print();
  }, 1000);
};

export default generateOfficeQRPDF;
