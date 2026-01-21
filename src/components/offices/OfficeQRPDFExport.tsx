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
}

export const generateOfficeQRPDF = ({
  officeName,
  qrCodeDataUrl,
  orgName,
  orgLogoUrl,
}: OfficeQRPDFExportProps): void => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download the QR code PDF');
    return;
  }

  const currentDate = format(new Date(), 'd MMMM yyyy');
  const orgInitial = orgName?.charAt(0)?.toUpperCase() || 'O';

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
          padding: 40mm 20mm;
        }
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          width: 100%;
          max-width: 150mm;
        }
        .logo-container {
          margin-bottom: 24px;
        }
        .logo {
          max-height: 60px;
          max-width: 180px;
          object-fit: contain;
        }
        .logo-fallback {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: bold;
          color: white;
        }
        .divider {
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
          margin: 20px 0;
        }
        .office-name {
          font-size: 28pt;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
          line-height: 1.2;
        }
        .subtitle {
          font-size: 14pt;
          color: #64748b;
          margin-bottom: 32px;
        }
        .qr-container {
          background: white;
          padding: 16px;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
          border: 2px solid #e2e8f0;
          margin-bottom: 32px;
        }
        .qr-code {
          width: 180px;
          height: 180px;
        }
        .instructions {
          font-size: 13pt;
          color: #334155;
          line-height: 1.6;
          max-width: 280px;
        }
        .instructions strong {
          color: #3b82f6;
        }
        .geofence-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #dcfce7;
          color: #16a34a;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 11pt;
          font-weight: 500;
          margin-top: 24px;
        }
        .geofence-icon {
          width: 16px;
          height: 16px;
        }
        .footer {
          position: fixed;
          bottom: 20mm;
          left: 0;
          right: 0;
          text-align: center;
        }
        .footer-divider {
          width: 150mm;
          height: 1px;
          background: #e2e8f0;
          margin: 0 auto 16px;
        }
        .footer-text {
          font-size: 10pt;
          color: #94a3b8;
        }
        @media print {
          body { 
            padding: 40mm 20mm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo-container">
          ${orgLogoUrl 
            ? `<img src="${orgLogoUrl}" class="logo" alt="${orgName}" crossorigin="anonymous" />`
            : `<div class="logo-fallback">${orgInitial}</div>`
          }
        </div>
        
        <div class="divider"></div>
        
        <h1 class="office-name">${officeName}</h1>
        <p class="subtitle">Check-In Station</p>
        
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
        <p class="footer-text">${orgName} • Generated on ${currentDate}</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for images to load before printing
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

export default generateOfficeQRPDF;
