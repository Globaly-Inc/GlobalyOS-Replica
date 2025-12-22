import { format } from "date-fns";
import { useOrganization } from "@/hooks/useOrganization";
import { useTimezone } from "@/hooks/useTimezone";
import { formatTimeInTimezone } from "@/utils/timezone";

interface AttendanceMetrics {
  totalRecords: number;
  onTime: number;
  lateArrivals: number;
  earlyDepartures: number;
  belowTime: number;
  overTime: number;
  avgNetHours: number;
  wfhCount: number;
  attendanceRate: number;
  onLeaveCount: number;
  missingCount: number;
}

interface ChartDataPoint {
  date: string;
  total: number;
  onTime: number;
  late: number;
  early: number;
  wfh: number;
}

interface AttendanceRecord {
  id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  work_hours: number | null;
  employee: {
    profiles: { full_name: string; avatar_url?: string };
    department?: string;
  };
}

interface AttendancePDFExportProps {
  records: AttendanceRecord[];
  metrics: AttendanceMetrics;
  chartData: ChartDataPoint[];
  dateRange: { start: Date; end: Date };
  dateRangeLabel: string;
}

export const AttendancePDFExport = ({
  records,
  metrics,
  chartData,
  dateRange,
  dateRangeLabel,
}: AttendancePDFExportProps) => {
  const { currentOrg } = useOrganization();
  const { timezone } = useTimezone();

  const handleExport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export PDF");
      return;
    }

    const periodText = `${format(dateRange.start, "MMM d, yyyy")} - ${format(dateRange.end, "MMM d, yyyy")}`;

    // Generate chart SVG
    const maxValue = Math.max(...chartData.map(d => d.total), 10);
    const chartWidth = 700;
    const chartHeight = 200;
    const padding = 40;
    const barWidth = chartData.length > 0 ? Math.min(30, (chartWidth - padding * 2) / chartData.length - 5) : 30;

    const chartSVG = chartData.length > 0 ? `
      <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="chart">
        <!-- Grid lines -->
        ${[0, 25, 50, 75, 100].map(pct => {
          const y = chartHeight - padding - (pct / 100) * (chartHeight - padding * 2);
          return `<line x1="${padding}" y1="${y}" x2="${chartWidth - padding}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>
                  <text x="${padding - 8}" y="${y + 4}" font-size="10" fill="#6b7280" text-anchor="end">${Math.round(maxValue * pct / 100)}</text>`;
        }).join('')}
        
        <!-- Bars -->
        ${chartData.map((d, i) => {
          const x = padding + i * ((chartWidth - padding * 2) / chartData.length) + barWidth / 2;
          const barHeight = (d.total / maxValue) * (chartHeight - padding * 2);
          const y = chartHeight - padding - barHeight;
          return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#3b82f6" rx="2"/>
            <text x="${x + barWidth / 2}" y="${chartHeight - padding + 15}" font-size="9" fill="#6b7280" text-anchor="middle">${format(new Date(d.date), "MMM d")}</text>
          `;
        }).join('')}
      </svg>
    ` : '<p class="no-data">No chart data available for this period</p>';

    // Generate records table - use timezone-aware formatting
    const recordsTable = records.slice(0, 100).map(record => `
      <tr>
        <td>${(record.employee as any)?.profiles?.full_name || 'Unknown'}</td>
        <td>${format(new Date(record.date), "MMM d, yyyy")}</td>
        <td>${record.check_in_time ? formatTimeInTimezone(record.check_in_time, timezone, "h:mm a") : "—"}</td>
        <td>${record.check_out_time ? formatTimeInTimezone(record.check_out_time, timezone, "h:mm a") : "—"}</td>
        <td>${record.work_hours ? record.work_hours.toFixed(1) + "h" : "—"}</td>
        <td><span class="status status-${record.status}">${record.status}</span></td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report - ${currentOrg?.name || 'Organization'}</title>
        <style>
          @page { size: A4 landscape; margin: 1.5cm; }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            font-size: 10pt;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .header-left h1 {
            margin: 0 0 4px 0;
            font-size: 20pt;
            color: #3b82f6;
          }
          .header-left p {
            margin: 0;
            color: #666;
            font-size: 11pt;
          }
          .logo {
            max-height: 40px;
            max-width: 120px;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .metric-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
          }
          .metric-value {
            font-size: 20pt;
            font-weight: bold;
            color: #1e293b;
          }
          .metric-label {
            font-size: 9pt;
            color: #64748b;
            margin-top: 2px;
          }
          .metric-card.primary { border-left: 4px solid #3b82f6; }
          .metric-card.success { border-left: 4px solid #22c55e; }
          .metric-card.warning { border-left: 4px solid #f59e0b; }
          .metric-card.danger { border-left: 4px solid #ef4444; }
          .metric-card.purple { border-left: 4px solid #8b5cf6; }
          .metric-card.gray { border-left: 4px solid #6b7280; }
          .chart-section {
            margin-bottom: 20px;
          }
          .chart-section h2 {
            font-size: 12pt;
            color: #1e293b;
            margin: 0 0 12px 0;
          }
          .chart {
            width: 100%;
            max-width: 100%;
            height: auto;
            background: #fafafa;
            border-radius: 8px;
          }
          .no-data {
            text-align: center;
            color: #6b7280;
            padding: 40px;
            background: #f8fafc;
            border-radius: 8px;
          }
          .records-section {
            margin-top: 20px;
          }
          .records-section h2 {
            font-size: 12pt;
            color: #1e293b;
            margin: 0 0 12px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
          }
          th, td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f1f5f9;
            font-weight: 600;
            color: #475569;
          }
          tr:nth-child(even) { background: #f8fafc; }
          .status {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 8pt;
            font-weight: 500;
          }
          .status-present { background: #dcfce7; color: #16a34a; }
          .status-remote { background: #f3e8ff; color: #7c3aed; }
          .status-absent { background: #fee2e2; color: #dc2626; }
          .status-late { background: #fef3c7; color: #d97706; }
          .footer {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #94a3b8;
            font-size: 8pt;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>Attendance Report</h1>
            <p>${periodText}</p>
          </div>
          ${currentOrg?.logo_url 
            ? `<img src="${currentOrg.logo_url}" class="logo" alt="${currentOrg.name}" />`
            : `<div style="font-size: 14pt; font-weight: bold; color: #3b82f6;">${currentOrg?.name || 'Organization'}</div>`
          }
        </div>

        <div class="metrics-grid">
          <div class="metric-card primary">
            <div class="metric-value">${metrics.totalRecords}</div>
            <div class="metric-label">Total Records</div>
          </div>
          <div class="metric-card success">
            <div class="metric-value">${metrics.onTime}</div>
            <div class="metric-label">On Time</div>
          </div>
          <div class="metric-card warning">
            <div class="metric-value">${metrics.lateArrivals}</div>
            <div class="metric-label">Late Arrivals</div>
          </div>
          <div class="metric-card danger">
            <div class="metric-value">${metrics.earlyDepartures}</div>
            <div class="metric-label">Early Departures</div>
          </div>
          <div class="metric-card gray">
            <div class="metric-value">${metrics.belowTime}</div>
            <div class="metric-label">Below Time</div>
          </div>
          <div class="metric-card primary">
            <div class="metric-value">${metrics.overTime}</div>
            <div class="metric-label">Over Time</div>
          </div>
          <div class="metric-card purple">
            <div class="metric-value">${metrics.avgNetHours.toFixed(1)}h</div>
            <div class="metric-label">Avg Net Hours</div>
          </div>
          <div class="metric-card purple">
            <div class="metric-value">${metrics.wfhCount}</div>
            <div class="metric-label">WFH</div>
          </div>
        </div>

        <div class="chart-section">
          <h2>Attendance Trend</h2>
          ${chartSVG}
        </div>

        <div class="records-section">
          <h2>Attendance Records ${records.length > 100 ? '(Showing first 100)' : ''}</h2>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${recordsTable}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Generated from GlobalyOS on ${format(new Date(), "d MMMM yyyy 'at' HH:mm")}</p>
          <p>This report contains ${records.length} attendance records for ${dateRangeLabel}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return { handleExport };
};

export default AttendancePDFExport;
