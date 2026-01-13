import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ErrorLog, ConsoleEntry, NetworkRequest, Breadcrumb, PerformanceMetrics } from '@/types/errorLogs';
import html2canvas from 'html2canvas';

interface ErrorLogPDFExportProps {
  log: ErrorLog;
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return 'N/A';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'error': return '#f97316';
    case 'warning': return '#eab308';
    default: return '#6b7280';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'new': return '#3b82f6';
    case 'investigating': return '#8b5cf6';
    case 'resolved': return '#22c55e';
    case 'ignored': return '#6b7280';
    default: return '#6b7280';
  }
}

const ErrorLogPDFExport = ({ log }: ErrorLogPDFExportProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Parse JSON fields safely
      const consoleLogs: ConsoleEntry[] = Array.isArray(log.console_logs) ? log.console_logs : [];
      const networkRequests: NetworkRequest[] = Array.isArray(log.network_requests) ? log.network_requests : [];
      const breadcrumbs: Breadcrumb[] = Array.isArray(log.breadcrumbs) ? log.breadcrumbs : [];
      const routeHistory: string[] = Array.isArray(log.route_history) ? log.route_history : [];
      const performanceMetrics: PerformanceMetrics | null = log.performance_metrics || null;

      // Create printable HTML content
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error Log Report - ${log.id.slice(0, 8)}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 11px;
              line-height: 1.5;
              color: #1f2937;
              padding: 20px;
              max-width: 210mm;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .logo {
              font-size: 20px;
              font-weight: 700;
              color: #1f2937;
            }
            .logo span { color: #3b82f6; }
            .report-title {
              text-align: right;
            }
            .report-title h1 {
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .report-title p {
              font-size: 10px;
              color: #6b7280;
            }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-size: 12px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 8px;
              padding-bottom: 4px;
              border-bottom: 1px solid #e5e7eb;
            }
            .error-message {
              background: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 6px;
              padding: 12px;
              margin-bottom: 16px;
            }
            .error-message p {
              color: #991b1b;
              font-weight: 500;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .info-row {
              display: flex;
              margin-bottom: 6px;
            }
            .info-label {
              font-weight: 500;
              color: #6b7280;
              width: 100px;
              flex-shrink: 0;
            }
            .info-value {
              color: #1f2937;
            }
            .code-block {
              background: #1e293b;
              color: #e2e8f0;
              border-radius: 6px;
              padding: 12px;
              font-family: 'Monaco', 'Menlo', monospace;
              font-size: 9px;
              white-space: pre-wrap;
              word-break: break-all;
              max-height: 200px;
              overflow: hidden;
            }
            .console-entry {
              margin-bottom: 2px;
            }
            .console-error { color: #f87171; }
            .console-warn { color: #fbbf24; }
            .console-log { color: #94a3b8; }
            .network-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
            }
            .network-table th, .network-table td {
              padding: 6px 8px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            .network-table th {
              background: #f9fafb;
              font-weight: 600;
            }
            .status-success { color: #22c55e; }
            .status-error { color: #ef4444; }
            .breadcrumb-item {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 4px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .breadcrumb-time {
              font-family: monospace;
              color: #6b7280;
              font-size: 9px;
              width: 70px;
            }
            .breadcrumb-type {
              display: inline-block;
              padding: 1px 6px;
              border-radius: 3px;
              font-size: 8px;
              font-weight: 500;
              width: 60px;
              text-align: center;
            }
            .type-click { background: #dbeafe; color: #1d4ed8; }
            .type-navigation { background: #dcfce7; color: #166534; }
            .type-input { background: #f3e8ff; color: #7c3aed; }
            .type-error { background: #fee2e2; color: #b91c1c; }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 16px;
            }
            .stat-card {
              background: #f9fafb;
              border-radius: 6px;
              padding: 12px;
              text-align: center;
            }
            .stat-value {
              font-size: 16px;
              font-weight: 700;
              color: #1f2937;
            }
            .stat-label {
              font-size: 9px;
              color: #6b7280;
              margin-top: 2px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #9ca3af;
              font-size: 9px;
            }
            .route-history {
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
            }
            .route-badge {
              background: #f3f4f6;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: monospace;
              font-size: 9px;
            }
            .metadata {
              background: #f9fafb;
              border-radius: 6px;
              padding: 12px;
              font-family: monospace;
              font-size: 9px;
              white-space: pre-wrap;
            }
            @media print {
              body { padding: 0; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Globaly<span>OS</span></div>
            <div class="report-title">
              <h1>Error Log Report</h1>
              <p>Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' HH:mm')}</p>
            </div>
          </div>

          <div class="section">
            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <span class="badge" style="background: ${getSeverityColor(log.severity)}; color: white;">
                ${log.severity}
              </span>
              <span class="badge" style="background: ${getStatusColor(log.status)}; color: white;">
                ${log.status}
              </span>
              <span class="badge" style="background: #e5e7eb; color: #374151;">
                ${log.error_type}
              </span>
            </div>
            <div class="error-message">
              <p>${log.error_message}</p>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${formatDuration(log.session_duration_ms)}</div>
              <div class="stat-label">Session Duration</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${performanceMetrics?.usedJSHeapSize ? `${performanceMetrics.usedJSHeapSize}MB` : 'N/A'}</div>
              <div class="stat-label">Memory Used</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${performanceMetrics?.connectionType || 'N/A'}</div>
              <div class="stat-label">Connection</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${routeHistory.length}</div>
              <div class="stat-label">Pages Visited</div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Details</h2>
            <div class="grid-2">
              <div>
                <div class="info-row">
                  <span class="info-label">Time:</span>
                  <span class="info-value">${format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">User:</span>
                  <span class="info-value">${log.profiles?.full_name || 'Anonymous'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${log.profiles?.email || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Organization:</span>
                  <span class="info-value">${log.organizations?.name || 'N/A'}</span>
                </div>
              </div>
              <div>
                <div class="info-row">
                  <span class="info-label">Component:</span>
                  <span class="info-value">${log.component_name || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Action:</span>
                  <span class="info-value">${log.action_attempted || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Device:</span>
                  <span class="info-value">${log.device_type || 'Unknown'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Browser:</span>
                  <span class="info-value">${log.browser_info || 'Unknown'}</span>
                </div>
              </div>
            </div>
            <div class="info-row" style="margin-top: 8px;">
              <span class="info-label">Page URL:</span>
              <span class="info-value">${log.page_url}</span>
            </div>
          </div>

          ${consoleLogs.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Console Logs (${consoleLogs.length})</h2>
            <div class="code-block">
${consoleLogs.map(entry => 
  `<div class="console-entry console-${entry.level}">[${format(new Date(entry.timestamp), 'HH:mm:ss.SSS')}] [${entry.level.toUpperCase()}] ${entry.message}</div>`
).join('')}
            </div>
          </div>
          ` : ''}

          ${networkRequests.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Network Requests (${networkRequests.length})</h2>
            <table class="network-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Method</th>
                  <th>URL</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
${networkRequests.map(req => `
                <tr>
                  <td>${format(new Date(req.timestamp), 'HH:mm:ss')}</td>
                  <td>${req.method}</td>
                  <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${req.url}</td>
                  <td class="${req.success ? 'status-success' : 'status-error'}">${req.status || 'ERR'}</td>
                  <td>${req.duration}ms</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${breadcrumbs.length > 0 ? `
          <div class="section">
            <h2 class="section-title">User Actions (${breadcrumbs.length})</h2>
            ${breadcrumbs.map(crumb => `
              <div class="breadcrumb-item">
                <span class="breadcrumb-time">${format(new Date(crumb.timestamp), 'HH:mm:ss.SSS')}</span>
                <span class="breadcrumb-type type-${crumb.type}">${crumb.type}</span>
                <span>${crumb.message || crumb.path || crumb.target || 'Action'}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${routeHistory.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Route History</h2>
            <div class="route-history">
              ${routeHistory.map(route => `<span class="route-badge">${route}</span>`).join(' → ')}
            </div>
          </div>
          ` : ''}

          ${log.error_stack ? `
          <div class="section">
            <h2 class="section-title">Stack Trace</h2>
            <div class="code-block">${log.error_stack}</div>
          </div>
          ` : ''}

          ${log.resolution_notes ? `
          <div class="section">
            <h2 class="section-title">Resolution Notes</h2>
            <div class="metadata">${log.resolution_notes}</div>
          </div>
          ` : ''}

          ${Object.keys(log.metadata || {}).length > 0 ? `
          <div class="section">
            <h2 class="section-title">Metadata</h2>
            <div class="metadata">${JSON.stringify(log.metadata, null, 2)}</div>
          </div>
          ` : ''}

          <div class="footer">
            <p>GlobalyOS Error Log Report • ID: ${log.id}</p>
            <p>Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
          </div>
        </body>
        </html>
      `;

      // Open print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window. Please allow popups.');
      }

      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };

      toast.success('PDF export ready');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </>
      )}
    </Button>
  );
};

export default ErrorLogPDFExport;
