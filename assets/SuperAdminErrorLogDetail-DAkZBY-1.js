import{j as e}from"./vendor-editor-CxdtVjO1.js";import{r as m}from"./vendor-charts-LTecantw.js";import{S as ce}from"./SuperAdminLayout-CBCuisaB.js";import{af as Ce,aa as $,aj as y,ap as ue,as as pe,at as xe,au as he,y as Y,c6 as Ae,c7 as Te,c8 as ee,F as Le,ag as w,c9 as se,s as g,bi as He,bj as U,a8 as fe,bx as A,bP as B,ad as Oe,ab as x,bD as ge,c1 as je,u as De,ar as de,ae as Pe,fB as Ue,bn as Be,a1 as be,bN as ye,av as G,bO as Je,aW as Ee,c$ as Me,c as D,bh as Qe,bW as Ve,bc as Ge,Z as We,G as Re,v as Ke,ak as Ze,al as we,cW as Xe,p as Ye,dZ as Ne,ah as es,B as ss,d0 as ts,a3 as rs,a4 as as,a5 as ns,a6 as is,a7 as X,d2 as os}from"./index-ckjZnHAL.js";import{C as S,b as R,c as z,a as _}from"./card-Cwp5NqTp.js";import{C as J,a as Q,b as V}from"./collapsible-C6fe1DRD.js";import{a as ls}from"./useErrorLogs-cmo3B2F6.js";import cs from"./wand-sparkles-DE0QXZGO.js";import ds from"./copy-ClVz7VAP.js";import ms from"./download-Cj3Xv_Xt.js";import ze from"./ticket-Dgn9jVjx.js";import Fe from"./external-link-BT8sDNF8.js";import ke from"./link-2-1diXmohn.js";import me from"./flask-conical-HXhcKS7V.js";import us from"./database-CRBKylal.js";import ps from"./code-xml-B6ymmV00.js";import xs from"./gauge-DbeostvZ.js";import Se from"./route-DVRuY6Oj.js";import hs from"./terminal-ibTEY55f.js";import fs from"./mouse-pointer-I5yqzOj9.js";import gs from"./save-DV6yn8TI.js";import"./layout-template-DAbA8WP0.js";import"./vendor-radix-Dg-TEZCg.js";import"./vendor-supabase-BvfXSNuG.js";import"./flag-Ny7jF7x_.js";const js=s=>Ce({queryKey:["error-log",s],queryFn:async()=>{if(!s)return null;const{data:r,error:t}=await $.from("user_error_logs").select(`
          *,
          profiles(full_name, email, avatar_url),
          organizations(name)
        `).eq("id",s).single();if(t)throw t;return r},enabled:!!s});function ys(s){return!s||s.length===0?"No console logs captured.":s.map(r=>`[${y(new Date(r.timestamp),"HH:mm:ss.SSS")}] [${r.level.toUpperCase()}] ${r.message}${r.stack?`
  Stack: ${r.stack}`:""}`).join(`
`)}function _e(s){return!s||s.length===0?"No network requests captured.":s.map(r=>`[${y(new Date(r.timestamp),"HH:mm:ss.SSS")}] ${r.method} ${r.url}
  Status: ${r.status||"Failed"} | Duration: ${r.duration}ms | Success: ${r.success}${r.error?`
  Error: ${r.error}`:""}`).join(`

`)}function vs(s){return!s||s.length===0?"No user actions captured.":s.map(r=>`[${y(new Date(r.timestamp),"HH:mm:ss.SSS")}] [${r.type.toUpperCase()}] ${r.message||r.path||r.target||"Action"}`).join(`
`)}function bs(s){if(!s)return"N/A";const r=Math.floor(s/1e3),t=Math.floor(r/60),o=Math.floor(t/60);return o>0?`${o}h ${t%60}m ${r%60}s`:t>0?`${t}m ${r%60}s`:`${r}s`}function ws(s){if(!s)return"No performance metrics available.";const r=[];return s.usedJSHeapSize&&r.push(`Memory Used: ${s.usedJSHeapSize}MB`),s.totalJSHeapSize&&r.push(`Total Heap: ${s.totalJSHeapSize}MB`),s.connectionType&&r.push(`Connection: ${s.connectionType}`),s.downlink&&r.push(`Downlink: ${s.downlink}Mbps`),s.rtt&&r.push(`RTT: ${s.rtt}ms`),r.length>0?r.join(" | "):"No metrics available."}function Ns(s){const r=Array.isArray(s.console_logs)?s.console_logs:[],t=Array.isArray(s.network_requests)?s.network_requests:[],o=Array.isArray(s.breadcrumbs)?s.breadcrumbs:[],p=Array.isArray(s.route_history)?s.route_history:[],u=s.performance_metrics||null,a=t.filter(l=>!l.success);return`## Error Analysis Request

You are an expert software engineer debugging a production error in a React/TypeScript SaaS application (GlobalyOS - a business operating system with HRMS, CRM, Wiki, and Team features).

### Error Details
- **Error Type:** ${s.error_type}
- **Severity:** ${s.severity.toUpperCase()}
- **Error Message:** ${s.error_message}
- **Component:** ${s.component_name||"Unknown"}
- **User Action:** ${s.action_attempted||"Unknown"}
- **Page URL:** ${s.page_url}
- **Occurred At:** ${y(new Date(s.created_at),"yyyy-MM-dd HH:mm:ss")}

### Stack Trace
\`\`\`
${s.error_stack||"No stack trace available."}
\`\`\`

### Console Logs (last entries before error)
\`\`\`
${ys(r)}
\`\`\`

### Failed Network Requests
\`\`\`
${a.length>0?_e(a):"No failed requests."}
\`\`\`

### All Recent Network Requests
\`\`\`
${_e(t)}
\`\`\`

### User Action Trail (Breadcrumbs)
The following actions led to this error:
\`\`\`
${vs(o)}
\`\`\`

### Environment Context
- **Session Duration:** ${bs(s.session_duration_ms)}
- **Performance:** ${ws(u)}
- **Browser:** ${s.browser_info||"Unknown"}
- **Device:** ${s.device_type||"Unknown"}
- **User Agent:** ${s.user_agent||"Unknown"}
- **Route History:** ${p.length>0?p.join(" → "):"Not available"}

### User Context
- **User:** ${s.profiles?.full_name||"Anonymous"} (${s.profiles?.email||"No email"})
- **Organization:** ${s.organizations?.name||"N/A"}

### Additional Metadata
\`\`\`json
${JSON.stringify(s.metadata||{},null,2)}
\`\`\`

---

Please provide:

1. **Root Cause Analysis**
   - What is the most likely cause of this error?
   - What evidence supports this conclusion?

2. **Debugging Steps**
   - Step-by-step approach to verify the root cause
   - Key areas to investigate in the codebase

3. **Recommended Fix**
   - Specific code changes with examples
   - Any database or configuration changes needed

4. **Prevention Strategies**
   - How to prevent this error in the future
   - Recommended tests to add
   - Any monitoring/alerting improvements

5. **Impact Assessment**
   - How widespread is this likely affecting users?
   - Priority level for fixing (P0-P3)`}function ks(s){const r=Array.isArray(s.console_logs)?s.console_logs:[],t=Array.isArray(s.network_requests)?s.network_requests:[],o=Array.isArray(s.breadcrumbs)?s.breadcrumbs:[];return`Error: ${s.error_message}
Type: ${s.error_type} | Severity: ${s.severity}
Component: ${s.component_name||"Unknown"}
Action: ${s.action_attempted||"Unknown"}
Console Logs: ${r.length} | Network Requests: ${t.length} | Breadcrumbs: ${o.length}`}const Ss=({log:s,open:r,onOpenChange:t,onApplyToNotes:o})=>{const[p,u]=m.useState(""),[a,l]=m.useState(""),[n,h]=m.useState(!1),[v,d]=m.useState(!1),[j,f]=m.useState(!1),[N,F]=m.useState("prompt"),C=m.useRef(null);m.useEffect(()=>{r&&s&&(u(Ns(s)),l(""),F("prompt"))},[r,s]),m.useEffect(()=>{C.current&&(C.current.scrollTop=C.current.scrollHeight)},[a]);const I=async()=>{h(!0),l(""),F("response");try{const b=await fetch("https://rygowmzkvxgnxagqlyxf.supabase.co/functions/v1/analyze-error",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5Z293bXprdnhnbnhhZ3FseXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjQ5MjYsImV4cCI6MjA3ODU0MDkyNn0.I9JkWxObT4vkzbf6gq6XfXC2xE9aFZI8gZEScUV00Ns"},body:JSON.stringify({prompt:p,errorId:s.id})});if(!b.ok)throw b.status===429?new Error("Rate limit exceeded. Please try again later."):b.status===402?new Error("AI credits exhausted. Please add more credits."):new Error("Failed to analyze error");if(!b.body)throw new Error("No response body");const c=b.body.getReader(),E=new TextDecoder;let M="";for(;;){const{done:W,value:te}=await c.read();if(W)break;M+=E.decode(te,{stream:!0});let O;for(;(O=M.indexOf(`
`))!==-1;){let T=M.slice(0,O);if(M=M.slice(O+1),T.endsWith("\r")&&(T=T.slice(0,-1)),T.startsWith(":")||T.trim()===""||!T.startsWith("data: "))continue;const K=T.slice(6).trim();if(K==="[DONE]")break;try{const P=JSON.parse(K).choices?.[0]?.delta?.content;P&&l(re=>re+P)}catch{M=T+`
`+M;break}}}}catch(b){x.error(b instanceof Error?b.message:"Failed to analyze error"),l("")}finally{h(!1)}},q=async()=>{try{await navigator.clipboard.writeText(a),d(!0),x.success("Copied to clipboard"),setTimeout(()=>d(!1),2e3)}catch{x.error("Failed to copy")}},L=()=>{o&&a&&(o(a),x.success("Applied to resolution notes"),t(!1))},H=ks(s);return e.jsx(ue,{open:r,onOpenChange:t,children:e.jsxs(pe,{className:"max-w-4xl max-h-[90vh] flex flex-col",children:[e.jsx(xe,{children:e.jsxs(he,{className:"flex items-center gap-2",children:[e.jsx(Y,{className:"h-5 w-5 text-primary"}),"AI Error Analysis"]})}),e.jsxs(Ae,{value:N,onValueChange:F,className:"flex-1 flex flex-col min-h-0",children:[e.jsxs(Te,{className:"grid w-full grid-cols-2",children:[e.jsxs(ee,{value:"prompt",className:"flex items-center gap-2",children:[e.jsx(Le,{className:"h-4 w-4"}),"Prompt"]}),e.jsxs(ee,{value:"response",className:"flex items-center gap-2",children:[e.jsx(cs,{className:"h-4 w-4"}),"AI Response",a&&e.jsx(w,{variant:"secondary",className:"ml-1 text-xs",children:"Ready"})]})]}),e.jsxs(se,{value:"prompt",className:"flex-1 flex flex-col min-h-0 mt-4",children:[e.jsxs("div",{className:"bg-muted/50 rounded-lg p-3 mb-4",children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("span",{className:"text-sm font-medium",children:"Prompt Summary"}),e.jsx(g,{variant:"ghost",size:"sm",onClick:()=>f(!j),children:j?e.jsxs(e.Fragment,{children:[e.jsx(He,{className:"h-4 w-4 mr-1"}),"Show Less"]}):e.jsxs(e.Fragment,{children:[e.jsx(U,{className:"h-4 w-4 mr-1"}),"Show Full Prompt"]})})]}),e.jsx("pre",{className:"text-xs text-muted-foreground whitespace-pre-wrap",children:H})]}),j&&e.jsx("div",{className:"flex-1 min-h-0 mb-4",children:e.jsx(fe,{value:p,onChange:b=>u(b.target.value),className:"h-full min-h-[300px] font-mono text-xs resize-none",placeholder:"Edit the prompt to customize the analysis..."})}),e.jsx(g,{onClick:I,disabled:n||!p,className:"w-full",children:n?e.jsxs(e.Fragment,{children:[e.jsx(A,{className:"h-4 w-4 mr-2 animate-spin"}),"Analyzing..."]}):e.jsxs(e.Fragment,{children:[e.jsx(Y,{className:"h-4 w-4 mr-2"}),"Get AI Analysis"]})})]}),e.jsx(se,{value:"response",className:"flex-1 flex flex-col min-h-0 mt-4",children:a?e.jsxs(e.Fragment,{children:[e.jsx(B,{className:"flex-1 min-h-0 max-h-[50vh] border rounded-lg [&>div]:!block",children:e.jsxs("div",{ref:C,className:"p-4 prose prose-sm dark:prose-invert max-w-none",children:[e.jsx("div",{className:"whitespace-pre-wrap font-sans text-sm",children:a}),n&&e.jsx("span",{className:"inline-block w-2 h-4 bg-primary animate-pulse ml-1"})]})}),e.jsxs("div",{className:"flex gap-2 mt-4",children:[e.jsx(g,{variant:"outline",onClick:q,disabled:n,className:"flex-1",children:v?e.jsxs(e.Fragment,{children:[e.jsx(Oe,{className:"h-4 w-4 mr-2"}),"Copied"]}):e.jsxs(e.Fragment,{children:[e.jsx(ds,{className:"h-4 w-4 mr-2"}),"Copy Response"]})}),o&&e.jsx(g,{onClick:L,disabled:n||!a,className:"flex-1",children:"Apply to Resolution Notes"})]})]}):e.jsx("div",{className:"flex-1 flex items-center justify-center text-muted-foreground",children:n?e.jsxs("div",{className:"flex flex-col items-center gap-2",children:[e.jsx(A,{className:"h-8 w-8 animate-spin"}),e.jsx("span",{children:"Analyzing error..."})]}):e.jsxs("div",{className:"text-center",children:[e.jsx(Y,{className:"h-12 w-12 mx-auto mb-4 opacity-20"}),e.jsx("p",{children:'Click "Get AI Analysis" to generate resolution suggestions'})]})})})]})]})})};function _s(s){if(!s)return"N/A";const r=Math.floor(s/1e3),t=Math.floor(r/60),o=Math.floor(t/60);return o>0?`${o}h ${t%60}m`:t>0?`${t}m ${r%60}s`:`${r}s`}function $s(s){switch(s){case"critical":return"#dc2626";case"error":return"#f97316";case"warning":return"#eab308";default:return"#6b7280"}}function Cs(s){switch(s){case"new":return"#3b82f6";case"investigating":return"#8b5cf6";case"resolved":return"#22c55e";case"ignored":return"#6b7280";default:return"#6b7280"}}const As=({log:s})=>{const[r,t]=m.useState(!1),o=async()=>{t(!0);try{const p=Array.isArray(s.console_logs)?s.console_logs:[],u=Array.isArray(s.network_requests)?s.network_requests:[],a=Array.isArray(s.breadcrumbs)?s.breadcrumbs:[],l=Array.isArray(s.route_history)?s.route_history:[],n=s.performance_metrics||null,h=`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error Log Report - ${s.id.slice(0,8)}</title>
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
              <p>Generated on ${y(new Date,"MMMM d, yyyy 'at' HH:mm")}</p>
            </div>
          </div>

          <div class="section">
            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <span class="badge" style="background: ${$s(s.severity)}; color: white;">
                ${s.severity}
              </span>
              <span class="badge" style="background: ${Cs(s.status)}; color: white;">
                ${s.status}
              </span>
              <span class="badge" style="background: #e5e7eb; color: #374151;">
                ${s.error_type}
              </span>
            </div>
            <div class="error-message">
              <p>${s.error_message}</p>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${_s(s.session_duration_ms)}</div>
              <div class="stat-label">Session Duration</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${n?.usedJSHeapSize?`${n.usedJSHeapSize}MB`:"N/A"}</div>
              <div class="stat-label">Memory Used</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${n?.connectionType||"N/A"}</div>
              <div class="stat-label">Connection</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${l.length}</div>
              <div class="stat-label">Pages Visited</div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Details</h2>
            <div class="grid-2">
              <div>
                <div class="info-row">
                  <span class="info-label">Time:</span>
                  <span class="info-value">${y(new Date(s.created_at),"MMM d, yyyy HH:mm:ss")}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">User:</span>
                  <span class="info-value">${s.profiles?.full_name||"Anonymous"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${s.profiles?.email||"N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Organization:</span>
                  <span class="info-value">${s.organizations?.name||"N/A"}</span>
                </div>
              </div>
              <div>
                <div class="info-row">
                  <span class="info-label">Component:</span>
                  <span class="info-value">${s.component_name||"N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Action:</span>
                  <span class="info-value">${s.action_attempted||"N/A"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Device:</span>
                  <span class="info-value">${s.device_type||"Unknown"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Browser:</span>
                  <span class="info-value">${s.browser_info||"Unknown"}</span>
                </div>
              </div>
            </div>
            <div class="info-row" style="margin-top: 8px;">
              <span class="info-label">Page URL:</span>
              <span class="info-value">${s.page_url}</span>
            </div>
          </div>

          ${p.length>0?`
          <div class="section">
            <h2 class="section-title">Console Logs (${p.length})</h2>
            <div class="code-block">
${p.map(d=>`<div class="console-entry console-${d.level}">[${y(new Date(d.timestamp),"HH:mm:ss.SSS")}] [${d.level.toUpperCase()}] ${d.message}</div>`).join("")}
            </div>
          </div>
          `:""}

          ${u.length>0?`
          <div class="section">
            <h2 class="section-title">Network Requests (${u.length})</h2>
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
${u.map(d=>`
                <tr>
                  <td>${y(new Date(d.timestamp),"HH:mm:ss")}</td>
                  <td>${d.method}</td>
                  <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${d.url}</td>
                  <td class="${d.success?"status-success":"status-error"}">${d.status||"ERR"}</td>
                  <td>${d.duration}ms</td>
                </tr>`).join("")}
              </tbody>
            </table>
          </div>
          `:""}

          ${a.length>0?`
          <div class="section">
            <h2 class="section-title">User Actions (${a.length})</h2>
            ${a.map(d=>`
              <div class="breadcrumb-item">
                <span class="breadcrumb-time">${y(new Date(d.timestamp),"HH:mm:ss.SSS")}</span>
                <span class="breadcrumb-type type-${d.type}">${d.type}</span>
                <span>${d.message||d.path||d.target||"Action"}</span>
              </div>
            `).join("")}
          </div>
          `:""}

          ${l.length>0?`
          <div class="section">
            <h2 class="section-title">Route History</h2>
            <div class="route-history">
              ${l.map(d=>`<span class="route-badge">${d}</span>`).join(" → ")}
            </div>
          </div>
          `:""}

          ${s.error_stack?`
          <div class="section">
            <h2 class="section-title">Stack Trace</h2>
            <div class="code-block">${s.error_stack}</div>
          </div>
          `:""}

          ${s.resolution_notes?`
          <div class="section">
            <h2 class="section-title">Resolution Notes</h2>
            <div class="metadata">${s.resolution_notes}</div>
          </div>
          `:""}

          ${Object.keys(s.metadata||{}).length>0?`
          <div class="section">
            <h2 class="section-title">Metadata</h2>
            <div class="metadata">${JSON.stringify(s.metadata,null,2)}</div>
          </div>
          `:""}

          <div class="footer">
            <p>GlobalyOS Error Log Report • ID: ${s.id}</p>
            <p>Generated on ${y(new Date,"yyyy-MM-dd HH:mm:ss")}</p>
          </div>
        </body>
        </html>
      `,v=window.open("","_blank");if(!v)throw new Error("Could not open print window. Please allow popups.");v.document.write(h),v.document.close(),v.onload=()=>{setTimeout(()=>{v.print()},250)},x.success("PDF export ready")}catch(p){x.error(p instanceof Error?p.message:"Failed to export PDF")}finally{t(!1)}};return e.jsx(g,{variant:"outline",onClick:o,disabled:r,children:r?e.jsxs(e.Fragment,{children:[e.jsx(A,{className:"h-4 w-4 mr-2 animate-spin"}),"Exporting..."]}):e.jsxs(e.Fragment,{children:[e.jsx(ms,{className:"h-4 w-4 mr-2"}),"Export PDF"]})})},Ie=s=>Ce({queryKey:["error-linked-tickets",s],queryFn:async()=>{if(!s)return[];const{data:r,error:t}=await $.from("error_support_links").select(`
          *,
          support_requests(id, title, type, status, priority, created_at, resolved_at)
        `).eq("error_log_id",s).order("created_at",{ascending:!1});if(t)throw t;return r||[]},enabled:!!s}),qe=()=>{const s=ge();return je({mutationFn:async({errorLogId:r,supportRequestId:t,notes:o})=>{const{data:{user:p}}=await $.auth.getUser(),{data:u,error:a}=await $.from("error_support_links").insert({error_log_id:r,support_request_id:t,linked_by:p?.id,notes:o||null}).select().single();if(a)throw a;return await $.from("user_error_logs").update({linked_support_request_id:t}).eq("id",r),u},onSuccess:(r,t)=>{s.invalidateQueries({queryKey:["error-linked-tickets",t.errorLogId]}),s.invalidateQueries({queryKey:["ticket-linked-errors",t.supportRequestId]}),s.invalidateQueries({queryKey:["error-log",t.errorLogId]}),s.invalidateQueries({queryKey:["error-logs"]})}})},Ts=()=>{const s=ge();return je({mutationFn:async({errorLogId:r,supportRequestId:t})=>{const{error:o}=await $.from("error_support_links").delete().eq("error_log_id",r).eq("support_request_id",t);if(o)throw o;const{data:p}=await $.from("error_support_links").select("id").eq("error_log_id",r).limit(1);p?.length||await $.from("user_error_logs").update({linked_support_request_id:null}).eq("id",r)},onSuccess:(r,t)=>{s.invalidateQueries({queryKey:["error-linked-tickets",t.errorLogId]}),s.invalidateQueries({queryKey:["ticket-linked-errors",t.supportRequestId]}),s.invalidateQueries({queryKey:["error-log",t.errorLogId]}),s.invalidateQueries({queryKey:["error-logs"]})}})},Ds=()=>{const s=ge(),r=qe();return je({mutationFn:async({errorLogId:t,title:o,description:p,priority:u="high"})=>{const{data:{user:a}}=await $.auth.getUser();if(!a)throw new Error("Not authenticated");const{data:l}=await $.from("user_error_logs").select("page_url, organization_id").eq("id",t).single(),n={user_id:a.id,organization_id:l?.organization_id||null,type:"bug",status:"open",priority:u,title:o,description:p,page_url:l?.page_url||window.location.href,browser_info:navigator.userAgent,device_type:/Mobile|Android|iPhone/i.test(navigator.userAgent)?"mobile":"desktop"},{data:h,error:v}=await $.from("support_requests").insert(n).select().single();if(v)throw v;return await r.mutateAsync({errorLogId:t,supportRequestId:h.id,notes:"Auto-linked from error log"}),h},onSuccess:()=>{s.invalidateQueries({queryKey:["support-requests"]})}})},Es={low:"bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",medium:"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",high:"bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",urgent:"bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"},Ms={open:"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",in_progress:"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",pending:"bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",resolved:"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",closed:"bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"},Rs=({errorLogId:s,onLinkClick:r})=>{const t=De(),{data:o,isLoading:p}=Ie(s),u=Ts(),a=async l=>{try{await u.mutateAsync({errorLogId:s,supportRequestId:l}),x.success("Ticket unlinked")}catch{x.error("Failed to unlink ticket")}};return e.jsxs(S,{children:[e.jsx(R,{className:"pb-3",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs(z,{className:"text-base flex items-center gap-2",children:[e.jsx(ze,{className:"h-4 w-4"}),"Linked Tickets"]}),e.jsxs(g,{variant:"outline",size:"sm",onClick:r,children:[e.jsx(de,{className:"h-4 w-4 mr-1"}),"Link"]})]})}),e.jsx(_,{children:p?e.jsx("div",{className:"flex items-center justify-center py-4",children:e.jsx(A,{className:"h-5 w-5 animate-spin text-muted-foreground"})}):o?.length===0?e.jsx("p",{className:"text-sm text-muted-foreground text-center py-4",children:"No linked tickets"}):e.jsx("div",{className:"space-y-3",children:o?.map(l=>{const n=l.support_requests;return n?e.jsx("div",{className:"p-3 border rounded-lg hover:bg-muted/50 transition-colors",children:e.jsxs("div",{className:"flex items-start justify-between gap-2",children:[e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"flex items-center gap-1.5 mb-1 flex-wrap",children:[e.jsx(w,{className:Es[n.priority],variant:"secondary",children:n.priority}),e.jsx(w,{className:Ms[n.status],variant:"secondary",children:n.status.replace("_"," ")})]}),e.jsx("h4",{className:"text-sm font-medium truncate",children:n.title}),e.jsxs("p",{className:"text-xs text-muted-foreground mt-1",children:["Created ",y(new Date(n.created_at),"MMM d, yyyy"),n.resolved_at&&e.jsxs(e.Fragment,{children:[" • Resolved ",y(new Date(n.resolved_at),"MMM d")]})]})]}),e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx(g,{variant:"ghost",size:"icon",className:"h-7 w-7",onClick:()=>t(`/super-admin/customer-success/${n.id}`),children:e.jsx(Fe,{className:"h-3.5 w-3.5"})}),e.jsx(g,{variant:"ghost",size:"icon",className:"h-7 w-7 text-muted-foreground hover:text-destructive",onClick:()=>a(n.id),disabled:u.isPending,children:u.isPending?e.jsx(A,{className:"h-3.5 w-3.5 animate-spin"}):e.jsx(Pe,{className:"h-3.5 w-3.5"})})]})]})},l.id):null})})})]})},zs={low:"bg-gray-100 text-gray-800",medium:"bg-blue-100 text-blue-800",high:"bg-orange-100 text-orange-800",urgent:"bg-red-100 text-red-800"},Fs={open:"bg-yellow-100 text-yellow-800",in_progress:"bg-blue-100 text-blue-800",pending:"bg-purple-100 text-purple-800",resolved:"bg-green-100 text-green-800",closed:"bg-gray-100 text-gray-800"},Is=({log:s,open:r,onOpenChange:t})=>{const[o,p]=m.useState("existing"),[u,a]=m.useState(""),[l,n]=m.useState(`Error: ${s.error_message.slice(0,50)}...`),[h,v]=m.useState(`
Error Type: ${s.error_type}
Severity: ${s.severity}
Component: ${s.component_name||"Unknown"}
Action: ${s.action_attempted||"Unknown"}
Page: ${s.page_url}

Error Message:
${s.error_message}

${s.error_stack?`Stack Trace:
${s.error_stack.slice(0,500)}...`:""}
  `.trim()),[d,j]=m.useState(s.severity==="critical"?"urgent":s.severity==="error"?"high":"medium"),{data:f,isLoading:N}=Ue(),{data:F}=Ie(s.id),C=qe(),I=Ds(),q=new Set(F?.map(c=>c.support_request_id)||[]),L=f?.filter(c=>q.has(c.id)?!1:u?c.title.toLowerCase().includes(u.toLowerCase())||c.description.toLowerCase().includes(u.toLowerCase()):!0),H=async c=>{try{await C.mutateAsync({errorLogId:s.id,supportRequestId:c}),x.success("Error linked to ticket"),t(!1)}catch{x.error("Failed to link error to ticket")}},b=async()=>{if(!l.trim()){x.error("Please enter a title");return}try{await I.mutateAsync({errorLogId:s.id,title:l,description:h,priority:d}),x.success("Ticket created and linked"),t(!1)}catch{x.error("Failed to create ticket")}};return e.jsx(ue,{open:r,onOpenChange:t,children:e.jsxs(pe,{className:"max-w-2xl max-h-[80vh] flex flex-col",children:[e.jsx(xe,{children:e.jsxs(he,{className:"flex items-center gap-2",children:[e.jsx(ze,{className:"h-5 w-5"}),"Link to Support Ticket"]})}),e.jsxs(Ae,{value:o,onValueChange:p,className:"flex-1 flex flex-col min-h-0",children:[e.jsxs(Te,{className:"grid w-full grid-cols-2",children:[e.jsxs(ee,{value:"existing",className:"flex items-center gap-2",children:[e.jsx(ke,{className:"h-4 w-4"}),"Link to Existing"]}),e.jsxs(ee,{value:"new",className:"flex items-center gap-2",children:[e.jsx(de,{className:"h-4 w-4"}),"Create New Ticket"]})]}),e.jsxs(se,{value:"existing",className:"flex-1 flex flex-col min-h-0 mt-4",children:[e.jsxs("div",{className:"relative mb-4",children:[e.jsx(Be,{className:"absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"}),e.jsx(be,{placeholder:"Search tickets...",className:"pl-10",value:u,onChange:c=>a(c.target.value)})]}),e.jsx(B,{className:"flex-1 min-h-0",children:N?e.jsx("div",{className:"flex items-center justify-center py-8",children:e.jsx(A,{className:"h-6 w-6 animate-spin text-muted-foreground"})}):L?.length===0?e.jsxs("div",{className:"text-center py-8 text-muted-foreground",children:[e.jsx(ye,{className:"h-8 w-8 mx-auto mb-2 opacity-50"}),e.jsx("p",{children:"No tickets found"})]}):e.jsx("div",{className:"space-y-2",children:L?.map(c=>e.jsx("div",{className:"p-3 border rounded-lg hover:bg-muted/50 transition-colors",children:e.jsxs("div",{className:"flex items-start justify-between gap-3",children:[e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx(w,{className:zs[c.priority],children:c.priority}),e.jsx(w,{className:Fs[c.status],children:c.status.replace("_"," ")}),e.jsx(w,{variant:"outline",children:c.type})]}),e.jsx("h4",{className:"font-medium text-sm truncate",children:c.title}),e.jsxs("p",{className:"text-xs text-muted-foreground mt-1",children:["Created ",y(new Date(c.created_at),"MMM d, yyyy")]})]}),e.jsx(g,{size:"sm",onClick:()=>H(c.id),disabled:C.isPending,children:C.isPending?e.jsx(A,{className:"h-4 w-4 animate-spin"}):e.jsxs(e.Fragment,{children:[e.jsx(ke,{className:"h-4 w-4 mr-1"}),"Link"]})})]})},c.id))})})]}),e.jsxs(se,{value:"new",className:"flex-1 flex flex-col min-h-0 mt-4 space-y-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(G,{children:"Title"}),e.jsx(be,{value:l,onChange:c=>n(c.target.value),placeholder:"Ticket title..."})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(G,{children:"Priority"}),e.jsx("div",{className:"flex gap-2",children:["low","medium","high","urgent"].map(c=>e.jsx(g,{variant:d===c?"default":"outline",size:"sm",onClick:()=>j(c),children:c},c))})]}),e.jsxs("div",{className:"space-y-2 flex-1",children:[e.jsx(G,{children:"Description"}),e.jsx(fe,{value:h,onChange:c=>v(c.target.value),placeholder:"Describe the issue...",className:"h-[200px] resize-none"})]}),e.jsx(g,{onClick:b,disabled:I.isPending||!l.trim(),className:"w-full",children:I.isPending?e.jsxs(e.Fragment,{children:[e.jsx(A,{className:"h-4 w-4 mr-2 animate-spin"}),"Creating..."]}):e.jsxs(e.Fragment,{children:[e.jsx(de,{className:"h-4 w-4 mr-2"}),"Create & Link Ticket"]})})]})]})]})})};function qs(s){const r=s.match(/\/functions\/v1\/([a-zA-Z0-9_-]+)/);return r?r[1]:null}function Ls(s){const t=(Array.isArray(s.network_requests)?s.network_requests:[]).find(o=>!o.success);if(s.error_type==="edge_function"||t&&t.url.includes("/functions/v1/")){const o=t?qs(t.url):null;if(o)return{type:"edge_function",label:"Re-invoke Edge Function",description:`Test the ${o} function with a health check request`,icon:We,endpoint:t?.url,method:t?.method||"POST",originalStatus:t?.status,functionName:o}}return s.error_type==="network"&&t?{type:"network_request",label:"Re-send Network Request",description:"Attempt the same HTTP request to check if the endpoint is responding",icon:Re,endpoint:t.url,method:t.method,originalStatus:t.status}:s.error_type==="database"?{type:"unsupported",label:"Database Query Test",description:"Database errors require manual testing through the database interface",icon:us}:s.error_type==="auth"?{type:"unsupported",label:"Authentication Test",description:"Auth errors involve user sessions and should be tested through the login flow",icon:Ke}:s.page_url?{type:"navigation",label:"Navigate to Error Page",description:"Open the page where the error occurred to verify the fix",icon:Fe,endpoint:s.page_url}:{type:"unsupported",label:"Manual Testing Required",description:"This error type requires manual verification",icon:ps}}function Hs({log:s,open:r,onOpenChange:t,onVerificationComplete:o}){const[p,u]=m.useState(!1),[a,l]=m.useState(null),n=m.useMemo(()=>Ls(s),[s]),h=n.icon,v=async()=>{u(!0),l(null);const j=Date.now();try{if(n.type==="edge_function"&&n.functionName){const{data:f,error:N}=await $.functions.invoke("test-error-scenario",{body:{testType:"edge_function",functionName:n.functionName,originalMethod:n.method}});l(N?{success:!1,responseTime:Date.now()-j,error:N.message,testedAt:new Date().toISOString()}:{success:f.success,status:f.status,responseTime:f.responseTime||Date.now()-j,error:f.error,testedAt:new Date().toISOString()})}else if(n.type==="network_request"&&n.endpoint){const{data:f,error:N}=await $.functions.invoke("test-error-scenario",{body:{testType:"network_request",url:n.endpoint,method:n.method||"GET"}});l(N?{success:!1,responseTime:Date.now()-j,error:N.message,testedAt:new Date().toISOString()}:{success:f.success,status:f.status,responseTime:f.responseTime||Date.now()-j,error:f.error,testedAt:new Date().toISOString()})}else n.type==="navigation"?(window.open(n.endpoint,"_blank"),l({success:!0,responseTime:Date.now()-j,testedAt:new Date().toISOString()}),x.info("Page opened in new tab - verify the error is resolved manually")):(x.error("This error type cannot be automatically tested"),l({success:!1,error:"Automatic testing not supported for this error type",testedAt:new Date().toISOString()}))}catch(f){l({success:!1,responseTime:Date.now()-j,error:f instanceof Error?f.message:"Unknown error occurred",testedAt:new Date().toISOString()})}finally{u(!1)}},d=()=>{if(a){const j=`
---
Verification Test (${y(new Date(a.testedAt),"MMM d, yyyy HH:mm")})
Result: ${a.success?"✅ PASSED":"❌ FAILED"}
${a.status?`Status Code: ${a.status}`:""}
${a.responseTime?`Response Time: ${a.responseTime}ms`:""}
${a.error?`Error: ${a.error}`:""}
`.trim();o?.(a.success,j),x.success("Verification notes added"),t(!1)}};return e.jsx(ue,{open:r,onOpenChange:t,children:e.jsxs(pe,{className:"max-w-lg",children:[e.jsxs(xe,{children:[e.jsxs(he,{className:"flex items-center gap-2",children:[e.jsx(me,{className:"h-5 w-5 text-primary"}),"Test Error Scenario"]}),e.jsx(Je,{children:"Verify if the error has been fixed by re-testing the scenario"})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"bg-muted/50 rounded-lg p-4 space-y-3",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-sm text-muted-foreground",children:"Error Type"}),e.jsx(w,{variant:"outline",children:s.error_type})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(h,{className:"h-4 w-4 text-primary"}),e.jsx("span",{className:"font-medium text-sm",children:n.label})]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:n.description})]}),n.endpoint&&e.jsxs("div",{className:"bg-slate-900 rounded-lg p-4 font-mono text-xs space-y-2",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(w,{variant:"secondary",className:"text-[10px]",children:n.method||"GET"}),e.jsx("span",{className:"text-slate-300 break-all",children:n.endpoint})]}),n.originalStatus&&e.jsxs("div",{className:"text-slate-500",children:["Original Status: ",e.jsx("span",{className:"text-red-400",children:n.originalStatus})]})]}),n.type!=="unsupported"&&e.jsxs("div",{className:"flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20",children:[e.jsx(Ee,{className:"h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5"}),e.jsx("p",{className:"text-xs text-yellow-700 dark:text-yellow-300",children:"This will make a real request to the endpoint. Ensure you have appropriate access and the test won't cause unintended side effects."})]}),n.type!=="unsupported"&&e.jsx(g,{onClick:v,disabled:p,className:"w-full",children:p?e.jsxs(e.Fragment,{children:[e.jsx(A,{className:"h-4 w-4 mr-2 animate-spin"}),"Running Test..."]}):e.jsxs(e.Fragment,{children:[e.jsx(me,{className:"h-4 w-4 mr-2"}),"Run Test"]})}),a&&e.jsxs(e.Fragment,{children:[e.jsx(Me,{}),e.jsxs("div",{className:"space-y-3",children:[e.jsx("h4",{className:"font-medium text-sm",children:"Test Results"}),e.jsxs("div",{className:D("p-4 rounded-lg border",a.success?"bg-green-500/10 border-green-500/20":"bg-red-500/10 border-red-500/20"),children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[a.success?e.jsx(Qe,{className:"h-5 w-5 text-green-500"}):e.jsx(Ve,{className:"h-5 w-5 text-red-500"}),e.jsx("span",{className:D("font-medium",a.success?"text-green-700 dark:text-green-300":"text-red-700 dark:text-red-300"),children:a.success?"Test Passed":"Test Failed"})]}),e.jsxs("div",{className:"space-y-1 text-xs",children:[a.status&&e.jsxs("p",{className:"text-muted-foreground",children:["Status Code: ",e.jsx("span",{className:"font-mono",children:a.status})]}),a.responseTime&&e.jsxs("p",{className:"text-muted-foreground",children:["Response Time: ",e.jsxs("span",{className:"font-mono",children:[a.responseTime,"ms"]})]}),a.error&&e.jsxs("p",{className:"text-red-600 dark:text-red-400",children:["Error: ",a.error]})]})]})]})]})]}),e.jsxs(Ge,{children:[a&&e.jsx(g,{variant:a.success?"default":"outline",onClick:d,children:a.success?"Resolve Error":"Add Verification Notes"}),e.jsx(g,{variant:"ghost",onClick:()=>t(!1),children:"Close"})]})]})})}const Os={critical:{label:"Critical",icon:ye,className:"bg-destructive text-destructive-foreground"},error:{label:"Error",icon:Ee,className:"bg-orange-500 text-white"},warning:{label:"Warning",icon:Xe,className:"bg-yellow-500 text-black"}},$e={new:{label:"New",className:"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"},investigating:{label:"Investigating",className:"bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"},resolved:{label:"Resolved",className:"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"},ignored:{label:"Ignored",className:"bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300"}};function Ps(s){if(!s)return"N/A";const r=Math.floor(s/1e3),t=Math.floor(r/60),o=Math.floor(t/60);return o>0?`${o}h ${t%60}m`:t>0?`${t}m ${r%60}s`:`${r}s`}function Us(s){return y(new Date(s),"HH:mm:ss.SSS")}const ft=()=>{const{errorId:s}=Ze(),r=De(),{data:t,isLoading:o,error:p}=js(s),u=ls(),[a,l]=m.useState("new"),[n,h]=m.useState(""),[v,d]=m.useState(!1),[j,f]=m.useState(!0),[N,F]=m.useState(!0),[C,I]=m.useState(!0),[q,L]=m.useState(!0),[H,b]=m.useState(!1),[c,E]=m.useState(!1),[M,W]=m.useState(!1),[te,O]=m.useState(!1);m.useEffect(()=>{t&&(l(t.status),h(t.resolution_notes||""),E(!1))},[t]),m.useEffect(()=>{if(t){const i=a!==t.status||n!==(t.resolution_notes||"");E(i)}},[a,n,t]);const T=async()=>{if(t)try{await u.mutateAsync({id:t.id,status:a,resolutionNotes:n||void 0}),x.success("Error log updated"),E(!1)}catch{x.error("Failed to update error log")}},K=i=>{h(k=>k?`${k}

---

AI Analysis:
${i}`:`AI Analysis:
${i}`)},ve=async(i,k)=>{const Z=n?`${n}

${k}`:k;if(i)try{await u.mutateAsync({id:t.id,status:"resolved",resolutionNotes:Z}),l("resolved"),h(Z),E(!1),x.success("Test passed - Error automatically marked as resolved")}catch{x.error("Failed to auto-resolve error"),h(Z),E(!0)}else h(Z),E(!0),x.info("Test failed - review and update status manually")};if(o)return e.jsx(ce,{children:e.jsx("div",{className:"flex items-center justify-center min-h-[400px]",children:e.jsx(A,{className:"h-8 w-8 animate-spin text-muted-foreground"})})});if(p||!t)return e.jsx(ce,{children:e.jsxs("div",{className:"flex flex-col items-center justify-center min-h-[400px] gap-4",children:[e.jsx(ye,{className:"h-12 w-12 text-destructive"}),e.jsx("h2",{className:"text-xl font-semibold",children:"Error Not Found"}),e.jsx("p",{className:"text-muted-foreground",children:"The error log you're looking for doesn't exist."}),e.jsxs(g,{onClick:()=>r("/super-admin/error-logs"),children:[e.jsx(we,{className:"h-4 w-4 mr-2"}),"Back to Error Logs"]})]})});const P=Os[t.severity],re=P.icon,ae=Array.isArray(t.console_logs)?t.console_logs:[],ne=Array.isArray(t.network_requests)?t.network_requests:[],ie=Array.isArray(t.breadcrumbs)?t.breadcrumbs:[],oe=Array.isArray(t.route_history)?t.route_history:[],le=t.performance_metrics||{};return e.jsxs(ce,{children:[e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",children:[e.jsxs("div",{className:"flex items-start gap-4",children:[e.jsx(g,{variant:"ghost",size:"icon",onClick:()=>r("/super-admin/error-logs"),children:e.jsx(we,{className:"h-5 w-5"})}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[e.jsxs(w,{className:P.className,children:[e.jsx(re,{className:"h-3 w-3 mr-1"}),P.label]}),e.jsx(w,{className:$e[t.status].className,children:$e[t.status].label}),e.jsx(w,{variant:"outline",children:t.error_type})]}),e.jsx("h1",{className:"text-lg font-medium text-foreground line-clamp-2",children:t.error_message}),e.jsx("p",{className:"text-sm text-muted-foreground mt-1",children:y(new Date(t.created_at),"MMMM d, yyyy 'at' HH:mm:ss")})]})]}),e.jsxs("div",{className:"flex items-center gap-2 ml-12 sm:ml-0",children:[e.jsxs(g,{variant:"outline",onClick:()=>d(!0),children:[e.jsx(Y,{className:"h-4 w-4 mr-2"}),"AI Analysis"]}),e.jsx(As,{log:t})]})]}),e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-4 gap-4",children:[e.jsx(S,{children:e.jsx(_,{className:"pt-4",children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(Ye,{className:"h-4 w-4 text-muted-foreground"}),e.jsxs("div",{children:[e.jsx("div",{className:"text-xs text-muted-foreground",children:"Session"}),e.jsx("div",{className:"font-semibold",children:Ps(t.session_duration_ms)})]})]})})}),e.jsx(S,{children:e.jsx(_,{className:"pt-4",children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(xs,{className:"h-4 w-4 text-muted-foreground"}),e.jsxs("div",{children:[e.jsx("div",{className:"text-xs text-muted-foreground",children:"Memory"}),e.jsx("div",{className:"font-semibold",children:le.usedJSHeapSize?`${le.usedJSHeapSize}MB`:"N/A"})]})]})})}),e.jsx(S,{children:e.jsx(_,{className:"pt-4",children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(Ne,{className:"h-4 w-4 text-muted-foreground"}),e.jsxs("div",{children:[e.jsx("div",{className:"text-xs text-muted-foreground",children:"Connection"}),e.jsx("div",{className:"font-semibold",children:le.connectionType||"N/A"})]})]})})}),e.jsx(S,{children:e.jsx(_,{className:"pt-4",children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(Se,{className:"h-4 w-4 text-muted-foreground"}),e.jsxs("div",{children:[e.jsx("div",{className:"text-xs text-muted-foreground",children:"Pages Visited"}),e.jsx("div",{className:"font-semibold",children:oe.length})]})]})})})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-6",children:[e.jsxs("div",{className:"lg:col-span-2 space-y-6",children:[e.jsxs(S,{children:[e.jsx(R,{children:e.jsx(z,{className:"text-base",children:"Error Details"})}),e.jsxs(_,{className:"space-y-4",children:[e.jsx("div",{className:"bg-destructive/10 border border-destructive/20 rounded-lg p-4",children:e.jsx("p",{className:"text-sm font-medium text-destructive",children:t.error_message})}),e.jsxs("div",{className:"grid grid-cols-2 gap-4 text-sm",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(es,{className:"h-4 w-4 text-muted-foreground"}),e.jsx("span",{className:"text-muted-foreground",children:"User:"}),e.jsx("span",{className:"font-medium",children:t.profiles?.full_name||"Anonymous"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(ss,{className:"h-4 w-4 text-muted-foreground"}),e.jsx("span",{className:"text-muted-foreground",children:"Organization:"}),e.jsx("span",{className:"font-medium",children:t.organizations?.name||"N/A"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(ts,{className:"h-4 w-4 text-muted-foreground"}),e.jsx("span",{className:"text-muted-foreground",children:"Device:"}),e.jsx("span",{className:"font-medium",children:t.device_type||"Unknown"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(Re,{className:"h-4 w-4 text-muted-foreground"}),e.jsx("span",{className:"text-muted-foreground",children:"Browser:"}),e.jsx("span",{className:"font-medium",children:t.browser_info||"Unknown"})]})]}),t.component_name&&e.jsxs("div",{className:"text-sm",children:[e.jsx("span",{className:"text-muted-foreground",children:"Component:"})," ",e.jsx("code",{className:"bg-muted px-2 py-0.5 rounded text-xs",children:t.component_name})]}),t.action_attempted&&e.jsxs("div",{className:"text-sm",children:[e.jsx("span",{className:"text-muted-foreground",children:"Action:"})," ",e.jsx("span",{className:"font-medium",children:t.action_attempted})]}),e.jsxs("div",{className:"text-sm",children:[e.jsx("span",{className:"text-muted-foreground",children:"Page URL:"})," ",e.jsx("a",{href:t.page_url,target:"_blank",rel:"noopener noreferrer",className:"text-primary hover:underline break-all",children:t.page_url})]})]})]}),ae.length>0&&e.jsx(S,{children:e.jsxs(J,{open:j,onOpenChange:f,children:[e.jsx(R,{className:"cursor-pointer",onClick:()=>f(!j),children:e.jsx(Q,{asChild:!0,children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs(z,{className:"text-base flex items-center gap-2",children:[e.jsx(hs,{className:"h-4 w-4"}),"Console Logs (",ae.length,")"]}),e.jsx(U,{className:D("h-4 w-4 transition-transform",j&&"rotate-180")})]})})}),e.jsx(V,{children:e.jsx(_,{className:"pt-0",children:e.jsx(B,{className:"h-[250px]",children:e.jsx("div",{className:"bg-slate-900 rounded-lg p-4 font-mono text-xs space-y-1",children:ae.map((i,k)=>e.jsxs("div",{className:D("py-0.5",i.level==="error"&&"text-red-400",i.level==="warn"&&"text-yellow-400",i.level==="log"&&"text-slate-300"),children:[e.jsxs("span",{className:"text-slate-500",children:["[",y(new Date(i.timestamp),"HH:mm:ss.SSS"),"]"]}),e.jsx("span",{className:D("mx-2 uppercase text-[10px] px-1 rounded",i.level==="error"&&"bg-red-500/20",i.level==="warn"&&"bg-yellow-500/20",i.level==="log"&&"bg-slate-500/20"),children:i.level}),e.jsx("span",{className:"break-all",children:i.message})]},k))})})})})]})}),ne.length>0&&e.jsx(S,{children:e.jsxs(J,{open:N,onOpenChange:F,children:[e.jsx(R,{className:"cursor-pointer",onClick:()=>F(!N),children:e.jsx(Q,{asChild:!0,children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs(z,{className:"text-base flex items-center gap-2",children:[e.jsx(Ne,{className:"h-4 w-4"}),"Network Requests (",ne.length,")"]}),e.jsx(U,{className:D("h-4 w-4 transition-transform",N&&"rotate-180")})]})})}),e.jsx(V,{children:e.jsx(_,{className:"pt-0",children:e.jsx(B,{className:"h-[250px]",children:e.jsx("div",{className:"space-y-2",children:ne.map((i,k)=>e.jsxs("div",{className:"text-xs flex items-center gap-2 p-3 rounded-lg bg-muted/50",children:[e.jsx(w,{variant:i.success?"outline":"destructive",className:"w-14 justify-center text-[10px]",children:i.status||"ERR"}),e.jsx("span",{className:"font-mono text-muted-foreground w-12",children:i.method}),e.jsx("span",{className:"truncate flex-1 font-mono",children:i.url}),e.jsxs("span",{className:"text-muted-foreground w-16 text-right",children:[i.duration,"ms"]}),i.error&&e.jsx("span",{className:"text-destructive truncate max-w-[150px]",children:i.error})]},k))})})})})]})}),ie.length>0&&e.jsx(S,{children:e.jsxs(J,{open:C,onOpenChange:I,children:[e.jsx(R,{className:"cursor-pointer",onClick:()=>I(!C),children:e.jsx(Q,{asChild:!0,children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs(z,{className:"text-base flex items-center gap-2",children:[e.jsx(fs,{className:"h-4 w-4"}),"User Actions (",ie.length,")"]}),e.jsx(U,{className:D("h-4 w-4 transition-transform",C&&"rotate-180")})]})})}),e.jsx(V,{children:e.jsx(_,{className:"pt-0",children:e.jsx(B,{className:"h-[250px]",children:e.jsx("div",{className:"space-y-1",children:ie.map((i,k)=>e.jsxs("div",{className:"text-xs flex items-center gap-2 p-2 rounded bg-muted/50",children:[e.jsx("span",{className:"text-muted-foreground w-20 font-mono",children:Us(i.timestamp)}),e.jsx(w,{variant:"outline",className:D("w-20 justify-center text-[10px]",i.type==="click"&&"border-blue-500/50 text-blue-500",i.type==="navigation"&&"border-green-500/50 text-green-500",i.type==="input"&&"border-purple-500/50 text-purple-500",i.type==="api_error"&&"border-red-500/50 text-red-500",i.type==="error"&&"border-red-500/50 text-red-500"),children:i.type}),e.jsx("span",{className:"truncate flex-1",children:i.message||i.path})]},k))})})})})]})}),t.error_stack&&e.jsx(S,{children:e.jsxs(J,{open:q,onOpenChange:L,children:[e.jsx(R,{className:"cursor-pointer",onClick:()=>L(!q),children:e.jsx(Q,{asChild:!0,children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(z,{className:"text-base",children:"Stack Trace"}),e.jsx(U,{className:D("h-4 w-4 transition-transform",q&&"rotate-180")})]})})}),e.jsx(V,{children:e.jsx(_,{className:"pt-0",children:e.jsx(B,{className:"h-[200px]",children:e.jsx("pre",{className:"bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto",children:t.error_stack})})})})]})}),Object.keys(t.metadata||{}).length>0&&e.jsx(S,{children:e.jsxs(J,{open:H,onOpenChange:b,children:[e.jsx(R,{className:"cursor-pointer",onClick:()=>b(!H),children:e.jsx(Q,{asChild:!0,children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(z,{className:"text-base",children:"Metadata"}),e.jsx(U,{className:D("h-4 w-4 transition-transform",H&&"rotate-180")})]})})}),e.jsx(V,{children:e.jsx(_,{className:"pt-0",children:e.jsx("pre",{className:"bg-muted p-4 rounded-lg text-xs overflow-x-auto",children:JSON.stringify(t.metadata,null,2)})})})]})})]}),e.jsxs("div",{className:"space-y-6",children:[e.jsxs(S,{className:"sticky top-4",children:[e.jsx(R,{children:e.jsx(z,{className:"text-base",children:"Status & Resolution"})}),e.jsxs(_,{className:"space-y-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(G,{children:"Status"}),e.jsxs(rs,{value:a,onValueChange:i=>l(i),children:[e.jsx(as,{children:e.jsx(ns,{})}),e.jsxs(is,{children:[e.jsx(X,{value:"new",children:"New"}),e.jsx(X,{value:"investigating",children:"Investigating"}),e.jsx(X,{value:"resolved",children:"Resolved"}),e.jsx(X,{value:"ignored",children:"Ignored"})]})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(G,{children:"Resolution Notes"}),e.jsx(fe,{placeholder:"Add notes about the resolution or investigation...",value:n,onChange:i=>h(i.target.value),rows:6,className:"resize-none"})]}),t.resolved_at&&e.jsxs("div",{className:"flex items-center gap-2 text-sm text-muted-foreground",children:[e.jsx(os,{className:"h-4 w-4 text-green-500"}),"Resolved on ",y(new Date(t.resolved_at),"MMM d, yyyy HH:mm")]}),e.jsx(g,{onClick:T,disabled:u.isPending||!c,className:"w-full",children:u.isPending?e.jsxs(e.Fragment,{children:[e.jsx(A,{className:"h-4 w-4 mr-2 animate-spin"}),"Saving..."]}):e.jsxs(e.Fragment,{children:[e.jsx(gs,{className:"h-4 w-4 mr-2"}),"Save Changes"]})}),e.jsx(Me,{className:"my-4"}),e.jsxs(g,{variant:"outline",onClick:()=>O(!0),className:"w-full",children:[e.jsx(me,{className:"h-4 w-4 mr-2"}),"Test Error Scenario"]}),e.jsx("p",{className:"text-xs text-muted-foreground text-center mt-2",children:"Test will auto-resolve the error if passed"})]})]}),oe.length>0&&e.jsxs(S,{children:[e.jsx(R,{children:e.jsxs(z,{className:"text-base flex items-center gap-2",children:[e.jsx(Se,{className:"h-4 w-4"}),"Route History"]})}),e.jsx(_,{children:e.jsx("div",{className:"flex flex-wrap gap-1",children:oe.map((i,k)=>e.jsx(w,{variant:"secondary",className:"text-xs font-mono",children:i},k))})})]}),e.jsx(Rs,{errorLogId:t.id,onLinkClick:()=>W(!0)})]})]})]}),e.jsx(Ss,{log:t,open:v,onOpenChange:d,onApplyToNotes:K}),e.jsx(Is,{log:t,open:M,onOpenChange:W}),e.jsx(Hs,{log:t,open:te,onOpenChange:O,onVerificationComplete:ve})]})};export{ft as default};
