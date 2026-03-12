import{j as e}from"./vendor-editor-CxdtVjO1.js";import{r as b}from"./vendor-charts-LTecantw.js";import{bD as ne,af as B,c1 as L,ab as v,aa as j,y as Ae,s as m,ad as he,bL as Te,c as F,p as K,F as J,cx as G,ag as A,bN as qe,b as Ee,ap as re,aq as ie,as as le,at as oe,au as de,aj as w,ah as Ne,ao as $e,av as i,a1 as ge,a8 as P,bc as te,ar as ae,bs as ze,cf as We,ak as Ie,ba as Fe,bE as Ge,aw as Oe,ex as Be,al as Ke,aD as ue,aE as fe,C as _e,aF as we,ck as ve,a9 as je,i as Le,d2 as ye,aP as Ue,aQ as Qe,aR as He}from"./index-ckjZnHAL.js";import{C as g,b as D,a as N,c as z,d as Y}from"./card-Cwp5NqTp.js";import{S as X}from"./skeleton-ChLbU7wt.js";import{f as Ye}from"./formatDistanceToNow-DkhSn6FA.js";import Ve from"./circle-help-CBShaV4_.js";import Je from"./download-Cj3Xv_Xt.js";import Xe from"./square-pen-CMIv6hCq.js";import"./vendor-radix-Dg-TEZCg.js";import"./vendor-supabase-BvfXSNuG.js";import"./constructNow-C5Rz-9C7.js";import"./endOfDay-CoJGqTrm.js";const Ze=({employeeId:s,reviewId:l,periodStart:h,periodEnd:u,onDraftApplied:T})=>{const S=ne(),[o,k]=b.useState(!1),[y,d]=b.useState(null),{data:C,isLoading:q}=B({queryKey:["performance-review",l],queryFn:async()=>{if(!l)return null;const{data:t,error:r}=await j.from("performance_reviews").select("*").eq("id",l).single();if(r)throw r;return t},enabled:!!l}),p=y||C?.ai_draft,M=C?.ai_draft_generated_at,E=L({mutationFn:async()=>{const{data:t,error:r}=await j.functions.invoke("generate-review-draft",{body:{employee_id:s,review_id:l,period_start:h,period_end:u}});if(r)throw r;if(t?.error)throw new Error(t.error);return t},onSuccess:t=>{t?.draft&&d(t.draft),l&&S.invalidateQueries({queryKey:["performance-review",l]}),v.success("AI review draft generated successfully")},onError:t=>{v.error(t.message||"Failed to generate review draft")}}),$=()=>{p&&T&&(T(p),v.success("Draft applied to review form"))};return q?e.jsxs(g,{children:[e.jsx(D,{className:"pb-3",children:e.jsx(X,{className:"h-6 w-40"})}),e.jsx(N,{children:e.jsx(X,{className:"h-48 w-full"})})]}):e.jsxs(g,{className:"overflow-hidden",children:[e.jsxs(D,{className:"bg-gradient-to-r from-ai/5 to-ai/10 border-b pb-3",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs(z,{className:"flex items-center gap-2 text-base",children:[e.jsx(Ae,{className:"h-4 w-4 text-ai"}),"AI Review Prep"]}),e.jsxs("div",{className:"flex items-center gap-2",children:[p&&T&&e.jsxs(m,{variant:"outline",size:"sm",onClick:$,className:"h-8",children:[e.jsx(he,{className:"h-3.5 w-3.5 mr-1"}),"Use Draft"]}),e.jsxs(m,{variant:"ghost",size:"sm",onClick:()=>E.mutate(),disabled:E.isPending,className:"h-8",children:[e.jsx(Te,{className:F("h-3.5 w-3.5 mr-1",E.isPending&&"animate-spin")}),p?"Regenerate":"Generate Draft"]})]})]}),M&&e.jsxs("p",{className:"text-xs text-muted-foreground flex items-center gap-1 mt-1",children:[e.jsx(K,{className:"h-3 w-3"}),"Generated ",Ye(new Date(M),{addSuffix:!0})]})]}),e.jsx(N,{className:"p-4 space-y-4",children:p?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"bg-muted/50 rounded-lg p-3",children:[e.jsx("h4",{className:"text-xs font-medium text-muted-foreground uppercase mb-1",children:"Summary"}),e.jsx("p",{className:"text-sm",children:p.summary})]}),p.key_highlights?.length>0&&e.jsxs("div",{children:[e.jsxs("h4",{className:"text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1",children:[e.jsx(G,{className:"h-3 w-3"}),"Key Highlights"]}),e.jsx("div",{className:"flex flex-wrap gap-2",children:p.key_highlights.map((t,r)=>e.jsx(A,{variant:"secondary",className:"text-xs",children:t},r))})]}),e.jsxs("div",{children:[e.jsxs("h4",{className:"text-xs font-medium text-green-600 dark:text-green-400 uppercase mb-2 flex items-center gap-1",children:[e.jsx(he,{className:"h-3 w-3"}),"What Went Well"]}),e.jsx("ul",{className:"space-y-1.5",children:p.what_went_well?.map((t,r)=>e.jsxs("li",{className:"flex items-start gap-2 text-sm",children:[e.jsx("span",{className:"text-green-500 mt-1",children:"•"}),e.jsx("span",{children:t})]},r))})]}),e.jsxs("div",{children:[e.jsxs("h4",{className:"text-xs font-medium text-amber-600 dark:text-amber-400 uppercase mb-2 flex items-center gap-1",children:[e.jsx(qe,{className:"h-3 w-3"}),"Areas for Growth"]}),e.jsx("ul",{className:"space-y-1.5",children:p.needs_improvement?.map((t,r)=>e.jsxs("li",{className:"flex items-start gap-2 text-sm",children:[e.jsx("span",{className:"text-amber-500 mt-1",children:"•"}),e.jsx("span",{children:t})]},r))})]}),e.jsxs("div",{children:[e.jsxs("h4",{className:"text-xs font-medium text-blue-600 dark:text-blue-400 uppercase mb-2 flex items-center gap-1",children:[e.jsx(Ee,{className:"h-3 w-3"}),"Suggested Goals for Next Period"]}),e.jsx("ul",{className:"space-y-1.5",children:p.goals_next_period?.map((t,r)=>e.jsxs("li",{className:"flex items-start gap-2 text-sm",children:[e.jsxs("span",{className:"text-blue-500 mt-1",children:[r+1,"."]}),e.jsx("span",{children:t})]},r))})]}),p.rating_suggestion&&e.jsxs("div",{className:"border-t pt-3",children:[e.jsx("h4",{className:"text-xs font-medium text-muted-foreground uppercase mb-1",children:"Suggested Rating"}),e.jsx("p",{className:"text-sm text-muted-foreground italic",children:p.rating_suggestion})]}),e.jsxs("div",{className:"bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-xs text-amber-700 dark:text-amber-300",children:[e.jsx("strong",{children:"Note:"})," This is an AI-generated draft for preparation purposes. Review and edit before finalizing."]})]}):e.jsxs("div",{className:"text-center py-8 text-muted-foreground",children:[e.jsx(J,{className:"h-10 w-10 mx-auto mb-3 opacity-50"}),e.jsx("p",{className:"text-sm font-medium",children:"No AI draft generated yet"}),e.jsx("p",{className:"text-xs mt-1",children:'Click "Generate Draft" to create an AI-powered review preparation.'}),e.jsx("p",{className:"text-xs mt-3 text-muted-foreground/70",children:"The AI will analyze achievements, KPIs, kudos, and other performance data."})]})})]})},U=[{rating:1,label:"Needs Improvement",description:"Performance consistently falls below expectations",examples:["Frequently misses deadlines","Requires constant supervision","Does not meet quality standards"]},{rating:2,label:"Below Expectations",description:"Performance occasionally falls below expectations",examples:["Sometimes misses targets","Needs guidance on routine tasks","Quality is inconsistent"]},{rating:3,label:"Meets Expectations",description:"Performance consistently meets role requirements",examples:["Delivers on commitments reliably","Works independently","Meets quality standards"]},{rating:4,label:"Exceeds Expectations",description:"Performance frequently surpasses expectations",examples:["Goes above and beyond","Mentors others","Delivers exceptional quality"]},{rating:5,label:"Outstanding",description:"Exceptional performance that sets the standard",examples:["Role model for the team","Drives significant impact","Consistently exceptional results"]}],es=()=>e.jsxs(re,{children:[e.jsx(ie,{asChild:!0,children:e.jsx(m,{variant:"ghost",size:"sm",className:"h-6 w-6 p-0 text-muted-foreground",children:e.jsx(Ve,{className:"h-4 w-4"})})}),e.jsxs(le,{className:"max-w-lg",children:[e.jsx(oe,{children:e.jsx(de,{children:"Rating Criteria Guide"})}),e.jsx("div",{className:"space-y-4 max-h-[60vh] overflow-y-auto",children:U.map(s=>e.jsxs("div",{className:"border rounded-lg p-4",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[e.jsxs("div",{className:"flex",children:[Array.from({length:s.rating}).map((l,h)=>e.jsx(G,{className:"h-4 w-4 text-amber-400 fill-amber-400"},h)),Array.from({length:5-s.rating}).map((l,h)=>e.jsx(G,{className:"h-4 w-4 text-muted"},h))]}),e.jsx("span",{className:"font-semibold",children:s.label})]}),e.jsx("p",{className:"text-sm text-muted-foreground mb-2",children:s.description}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("p",{className:"text-xs font-medium text-muted-foreground",children:"Examples:"}),e.jsx("ul",{className:"text-xs space-y-0.5",children:s.examples.map((l,h)=>e.jsxs("li",{className:"flex items-start gap-1.5",children:[e.jsx("span",{className:"text-muted-foreground",children:"•"}),e.jsx("span",{children:l})]},h))})]})]},s.rating))})]})]}),be=s=>U[s-1]?.label||"Not Rated",V=s=>Array.from({length:5}).map((l,h)=>h<s?"★":"☆").join(""),ss=({review:s,employeeName:l,employeePosition:h,employeeDepartment:u,reviewerName:T,organizationName:S,organizationLogo:o})=>{const k=()=>{const y=window.open("","_blank");if(!y){alert("Please allow popups to export PDF");return}const d=`${w(new Date(s.review_period_start),"MMM yyyy")} - ${w(new Date(s.review_period_end),"MMM yyyy")}`,C=s.self_submitted_at?`
        <div class="section">
          <h2>Employee Self-Assessment</h2>
          <p class="timestamp">Submitted: ${w(new Date(s.self_submitted_at),"d MMMM yyyy")}</p>
          
          <div class="subsection">
            <h3>What Went Well</h3>
            <p>${s.self_what_went_well?.replace(/\n/g,"<br>")||"Not provided"}</p>
          </div>
          
          <div class="subsection">
            <h3>Areas for Improvement</h3>
            <p>${s.self_needs_improvement?.replace(/\n/g,"<br>")||"Not provided"}</p>
          </div>
          
          <div class="subsection">
            <h3>Goals for Next Period</h3>
            <p>${s.self_goals_next_period?.replace(/\n/g,"<br>")||"Not provided"}</p>
          </div>
          
          <div class="rating-box">
            <span class="rating-label">Self Rating:</span>
            <span class="stars">${V(s.self_overall_rating||0)}</span>
            <span class="rating-text">(${s.self_overall_rating||0}/5 - ${be(s.self_overall_rating||0)})</span>
          </div>
        </div>
      `:"",q=`
      <div class="section">
        <h2>Manager Review</h2>
        <p class="reviewer">Reviewed by: ${T}</p>
        
        <div class="subsection">
          <h3>What Went Well</h3>
          <p>${s.what_went_well?.replace(/\n/g,"<br>")||"Not provided"}</p>
        </div>
        
        <div class="subsection">
          <h3>Areas for Improvement</h3>
          <p>${s.needs_improvement?.replace(/\n/g,"<br>")||"Not provided"}</p>
        </div>
        
        <div class="subsection">
          <h3>Goals for Next Period</h3>
          <p>${s.goals_next_period?.replace(/\n/g,"<br>")||"Not provided"}</p>
        </div>
        
        <div class="rating-box">
          <span class="rating-label">Manager Rating:</span>
          <span class="stars">${V(s.overall_rating||0)}</span>
          <span class="rating-text">(${s.overall_rating||0}/5 - ${be(s.overall_rating||0)})</span>
        </div>
      </div>
    `,p=s.self_overall_rating&&s.overall_rating?`
        <div class="section comparison">
          <h2>Ratings Comparison</h2>
          <div class="comparison-grid">
            <div class="comparison-item">
              <span class="label">Self Rating</span>
              <span class="stars">${V(s.self_overall_rating)}</span>
              <span class="value">${s.self_overall_rating}/5</span>
            </div>
            <div class="comparison-item">
              <span class="label">Manager Rating</span>
              <span class="stars">${V(s.overall_rating)}</span>
              <span class="value">${s.overall_rating}/5</span>
            </div>
          </div>
        </div>
      `:"",M=s.acknowledged_at?`
        <div class="section acknowledgment">
          <h2>Employee Acknowledgment</h2>
          <p>Acknowledged on: ${w(new Date(s.acknowledged_at),"d MMMM yyyy 'at' HH:mm")}</p>
          ${s.employee_comments?`<div class="comments"><h3>Employee Comments</h3><p>${s.employee_comments.replace(/\n/g,"<br>")}</p></div>`:""}
        </div>
      `:"",E=`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Performance Review - ${l}</title>
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
            <p>${d}</p>
          </div>
          ${o?`<img src="${o}" class="logo" alt="${S}" />`:`<div style="font-size: 14pt; font-weight: bold; color: #7c3aed;">${S}</div>`}
        </div>
        
        <div class="employee-info">
          <h2>${l}</h2>
          <p><strong>Position:</strong> ${h}</p>
          <p><strong>Department:</strong> ${u}</p>
        </div>
        
        ${C}
        ${q}
        ${p}
        ${M}
        
        <div class="footer">
          <p>Generated from GlobalyOS on ${w(new Date,"d MMMM yyyy 'at' HH:mm")}</p>
          <p>This document is confidential and intended for the employee and management only.</p>
        </div>
      </body>
      </html>
    `;y.document.write(E),y.document.close(),setTimeout(()=>{y.print()},250)};return e.jsxs(m,{variant:"outline",size:"sm",onClick:k,children:[e.jsx(Je,{className:"h-4 w-4 mr-1"}),"Export PDF"]})},se=({selfAssessment:s,employeeName:l})=>{if(!s.self_submitted_at)return null;const h=s.self_overall_rating?U[s.self_overall_rating-1]?.label:null;return e.jsxs(g,{className:"border-blue-200 bg-blue-50/50 dark:bg-blue-950/20",children:[e.jsxs(D,{className:"pb-3",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs(z,{className:"text-base flex items-center gap-2",children:[e.jsx(Ne,{className:"h-4 w-4 text-blue-600"}),"Employee Self-Assessment"]}),e.jsxs("div",{className:"flex items-center gap-1 text-xs text-muted-foreground",children:[e.jsx(K,{className:"h-3 w-3"}),w(new Date(s.self_submitted_at),"d MMM yyyy")]})]}),l&&e.jsxs("p",{className:"text-sm text-muted-foreground",children:["By ",l]})]}),e.jsxs(N,{className:"space-y-4",children:[s.self_what_went_well&&e.jsxs("div",{children:[e.jsx("p",{className:"text-xs font-medium text-green-600 dark:text-green-400 uppercase mb-1",children:"What Went Well"}),e.jsx("p",{className:"text-sm whitespace-pre-wrap",children:s.self_what_went_well})]}),s.self_needs_improvement&&e.jsxs("div",{children:[e.jsx("p",{className:"text-xs font-medium text-amber-600 dark:text-amber-400 uppercase mb-1",children:"Areas for Improvement"}),e.jsx("p",{className:"text-sm whitespace-pre-wrap",children:s.self_needs_improvement})]}),s.self_goals_next_period&&e.jsxs("div",{children:[e.jsx("p",{className:"text-xs font-medium text-blue-600 dark:text-blue-400 uppercase mb-1",children:"Goals for Next Period"}),e.jsx("p",{className:"text-sm whitespace-pre-wrap",children:s.self_goals_next_period})]}),s.self_overall_rating&&e.jsxs("div",{className:"pt-2 border-t",children:[e.jsx("p",{className:"text-xs font-medium text-muted-foreground uppercase mb-1",children:"Self Rating"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"flex items-center gap-0.5",children:[1,2,3,4,5].map(u=>e.jsx(G,{className:F("h-4 w-4",u<=s.self_overall_rating?"text-amber-400 fill-amber-400":"text-muted")},u))}),h&&e.jsxs("span",{className:"text-xs text-muted-foreground",children:["(",h,")"]})]})]})]})]})},ts=[{name:"Standard Review",description:"General-purpose performance review template",what_went_well_prompts:["Key achievements this period","Skills demonstrated","Positive team contributions"],needs_improvement_prompts:["Areas requiring development","Skills to improve","Communication or collaboration gaps"],goals_prompts:["Performance targets for next period","Professional development goals","Team contribution objectives"],competencies:[{name:"Job Knowledge",description:"Understanding of role requirements",weight:20},{name:"Quality of Work",description:"Accuracy and thoroughness",weight:25},{name:"Communication",description:"Clear and effective communication",weight:20},{name:"Teamwork",description:"Collaboration and support",weight:20},{name:"Initiative",description:"Proactive approach to work",weight:15}],is_default:!0},{name:"Leadership Review",description:"For managers and team leads",what_went_well_prompts:["Team achievements under leadership","Strategic decisions and outcomes","People development initiatives"],needs_improvement_prompts:["Leadership skill gaps","Delegation opportunities","Team feedback areas"],goals_prompts:["Team performance targets","Leadership development goals","Strategic objectives"],competencies:[{name:"Strategic Thinking",description:"Vision and planning",weight:20},{name:"People Management",description:"Team leadership and development",weight:25},{name:"Decision Making",description:"Timely and effective decisions",weight:20},{name:"Communication",description:"Clear direction and feedback",weight:20},{name:"Business Acumen",description:"Understanding of business impact",weight:15}],is_default:!1},{name:"Technical Review",description:"For technical and engineering roles",what_went_well_prompts:["Technical achievements and innovations","Code quality and best practices","Problem-solving examples"],needs_improvement_prompts:["Technical skill gaps","Documentation improvements","Collaboration with non-technical teams"],goals_prompts:["Technical certifications or learning","Architecture or system improvements","Mentoring junior team members"],competencies:[{name:"Technical Skills",description:"Core technical competencies",weight:30},{name:"Problem Solving",description:"Analytical and creative solutions",weight:25},{name:"Code Quality",description:"Clean, maintainable, tested code",weight:20},{name:"Learning",description:"Staying current with technology",weight:15},{name:"Collaboration",description:"Working with team and stakeholders",weight:10}],is_default:!1},{name:"Sales Performance",description:"For sales and business development roles",what_went_well_prompts:["Revenue achievements and key wins","Client relationship successes","Pipeline growth"],needs_improvement_prompts:["Lost opportunities analysis","Presentation or negotiation skills","CRM and process adherence"],goals_prompts:["Revenue and quota targets","New market or client segments","Sales skills development"],competencies:[{name:"Sales Results",description:"Achievement against targets",weight:35},{name:"Client Relationships",description:"Building lasting partnerships",weight:25},{name:"Product Knowledge",description:"Understanding offerings",weight:15},{name:"Negotiation",description:"Deal closing skills",weight:15},{name:"Process Adherence",description:"Following sales methodology",weight:10}],is_default:!1}],as=({onSelectTemplate:s,selectedTemplateId:l})=>{const[h,u]=b.useState(!1),[T,S]=b.useState(!1),[o,k]=b.useState({name:"",description:"",what_went_well_prompts:"",needs_improvement_prompts:"",goals_prompts:""}),y=ne(),{currentOrg:d}=$e(),{data:C,isLoading:q}=B({queryKey:["review-templates",d?.id],queryFn:async()=>{if(!d?.id)return[];const{data:t,error:r}=await j.from("review_templates").select("*").eq("organization_id",d.id).order("created_at",{ascending:!1});if(r)throw r;return(t||[]).map(f=>({...f,competencies:Array.isArray(f.competencies)?f.competencies:[]}))},enabled:!!d?.id}),p=L({mutationFn:async()=>{if(!d?.id)throw new Error("No organization");const{data:t,error:r}=await j.from("review_templates").insert({organization_id:d.id,name:o.name,description:o.description||null,what_went_well_prompts:o.what_went_well_prompts.split(`
`).filter(Boolean),needs_improvement_prompts:o.needs_improvement_prompts.split(`
`).filter(Boolean),goals_prompts:o.goals_prompts.split(`
`).filter(Boolean),competencies:[]}).select().single();if(r)throw r;return t},onSuccess:()=>{y.invalidateQueries({queryKey:["review-templates"]}),S(!1),k({name:"",description:"",what_went_well_prompts:"",needs_improvement_prompts:"",goals_prompts:""}),v.success("Template created")},onError:t=>{v.error(t.message)}}),M=L({mutationFn:async t=>{const{error:r}=await j.from("review_templates").delete().eq("id",t);if(r)throw r},onSuccess:()=>{y.invalidateQueries({queryKey:["review-templates"]}),v.success("Template deleted")},onError:t=>{v.error(t.message)}}),E=async t=>{if(!d?.id)return;const{data:r,error:f}=await j.from("review_templates").insert({organization_id:d.id,name:t.name,description:t.description,what_went_well_prompts:t.what_went_well_prompts,needs_improvement_prompts:t.needs_improvement_prompts,goals_prompts:t.goals_prompts,competencies:t.competencies,is_default:t.is_default}).select().single();if(f){v.error(f.message);return}y.invalidateQueries({queryKey:["review-templates"]});const _=Array.isArray(r.competencies)?r.competencies:[],I={...r,competencies:_};s(I),u(!1),v.success(`Using ${t.name} template`)},$=t=>{s(t),u(!1)};return e.jsxs(re,{open:h,onOpenChange:u,children:[e.jsx(ie,{asChild:!0,children:e.jsxs(m,{variant:"outline",size:"sm",children:[e.jsx(J,{className:"h-4 w-4 mr-1"}),l?"Change Template":"Use Template"]})}),e.jsxs(le,{className:"max-w-2xl max-h-[80vh] overflow-y-auto",children:[e.jsx(oe,{children:e.jsx(de,{children:"Review Templates"})}),T?e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(i,{children:"Template Name"}),e.jsx(ge,{value:o.name,onChange:t=>k({...o,name:t.target.value}),placeholder:"e.g., Quarterly Review"})]}),e.jsxs("div",{children:[e.jsx(i,{children:"Description"}),e.jsx(ge,{value:o.description,onChange:t=>k({...o,description:t.target.value}),placeholder:"Brief description"})]}),e.jsxs("div",{children:[e.jsx(i,{children:"What Went Well Prompts (one per line)"}),e.jsx(P,{value:o.what_went_well_prompts,onChange:t=>k({...o,what_went_well_prompts:t.target.value}),placeholder:`Key achievements
Skills demonstrated
Team contributions`,rows:3})]}),e.jsxs("div",{children:[e.jsx(i,{children:"Areas for Improvement Prompts (one per line)"}),e.jsx(P,{value:o.needs_improvement_prompts,onChange:t=>k({...o,needs_improvement_prompts:t.target.value}),placeholder:`Development areas
Skills to improve`,rows:3})]}),e.jsxs("div",{children:[e.jsx(i,{children:"Goals Prompts (one per line)"}),e.jsx(P,{value:o.goals_prompts,onChange:t=>k({...o,goals_prompts:t.target.value}),placeholder:`Performance targets
Professional development`,rows:3})]}),e.jsxs(te,{children:[e.jsx(m,{variant:"outline",onClick:()=>S(!1),children:"Cancel"}),e.jsx(m,{onClick:()=>p.mutate(),disabled:!o.name||p.isPending,children:"Create Template"})]})]}):e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("h3",{className:"font-medium text-sm",children:"Your Templates"}),e.jsxs(m,{size:"sm",variant:"ghost",onClick:()=>S(!0),children:[e.jsx(ae,{className:"h-4 w-4 mr-1"}),"Create"]})]}),q?e.jsx("div",{className:"space-y-2",children:[1,2].map(t=>e.jsx(X,{className:"h-16 w-full"},t))}):C&&C.length>0?e.jsx("div",{className:"space-y-2",children:C.map(t=>e.jsx(g,{className:F("cursor-pointer transition-all hover:shadow-md",l===t.id&&"ring-2 ring-primary"),onClick:()=>$(t),children:e.jsxs(N,{className:"p-3 flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsxs("p",{className:"font-medium text-sm flex items-center gap-2",children:[t.name,t.is_default&&e.jsx(A,{variant:"secondary",className:"text-xs",children:"Default"})]}),t.description&&e.jsx("p",{className:"text-xs text-muted-foreground",children:t.description})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(m,{variant:"ghost",size:"sm",className:"h-8 w-8 p-0 text-destructive",onClick:r=>{r.stopPropagation(),M.mutate(t.id)},children:e.jsx(ze,{className:"h-4 w-4"})}),e.jsx(We,{className:"h-4 w-4 text-muted-foreground"})]})]})},t.id))}):e.jsx("p",{className:"text-sm text-muted-foreground text-center py-4",children:"No custom templates yet. Create one or use a built-in template below."})]}),e.jsxs("div",{children:[e.jsx("h3",{className:"font-medium text-sm mb-2",children:"Built-in Templates"}),e.jsx("div",{className:"space-y-2",children:ts.map((t,r)=>e.jsx(g,{className:"cursor-pointer transition-all hover:shadow-md",onClick:()=>E(t),children:e.jsxs(N,{className:"p-3",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsxs("p",{className:"font-medium text-sm flex items-center gap-2",children:[t.name,t.is_default&&e.jsxs(A,{variant:"outline",className:"text-xs",children:[e.jsx(G,{className:"h-3 w-3 mr-1"}),"Recommended"]})]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:t.description})]}),e.jsxs(m,{size:"sm",variant:"ghost",children:[e.jsx(ae,{className:"h-4 w-4 mr-1"}),"Use"]})]}),t.competencies.length>0&&e.jsx("div",{className:"flex flex-wrap gap-1 mt-2",children:t.competencies.map((f,_)=>e.jsxs(A,{variant:"secondary",className:"text-xs",children:[f.name," (",f.weight,"%)"]},_))})]})},r))})]}),e.jsx(te,{children:e.jsx(m,{variant:"outline",onClick:()=>{s(null),u(!1)},children:"No Template"})})]})]})]})},fs=()=>{const{id:s}=Ie(),{navigateOrg:l}=Fe(),h=ne(),{user:u}=Ge(),{isAdmin:T,isHR:S}=Oe(),o=T||S,[k,y]=b.useState(!1),[d,C]=b.useState(null),[q,p]=b.useState(Be(new Date)),[M,E]=b.useState(new Date),[$,t]=b.useState(null),[r,f]=b.useState({what_went_well:"",needs_improvement:"",goals_next_period:"",overall_rating:0}),[_,I]=b.useState({self_what_went_well:"",self_needs_improvement:"",self_goals_next_period:"",self_overall_rating:0}),[ce,me]=b.useState(""),{data:R}=B({queryKey:["employee",s],queryFn:async()=>{const{data:a,error:c}=await j.from("employees").select("*, profiles(full_name, avatar_url), organization:organizations(name, logo_url)").eq("id",s).single();if(c)throw c;return a},enabled:!!s}),{data:Q}=B({queryKey:["current-employee",u?.id],queryFn:async()=>{if(!u?.id)return null;const{data:a,error:c}=await j.from("employees").select("id, user_id").eq("user_id",u.id).single();if(c)throw c;return a},enabled:!!u?.id}),{data:Z,isLoading:ke}=B({queryKey:["performance-reviews",s],queryFn:async()=>{const{data:a,error:c}=await j.from("performance_reviews").select("*, reviewer:employees!performance_reviews_reviewer_id_fkey(id, user_id, profiles(full_name))").eq("employee_id",s).order("created_at",{ascending:!1});if(c)throw c;return a},enabled:!!s}),n=Z?.find(a=>a.id===d),ee=Q?.id===s,Ce=n?.reviewer_id===Q?.id;b.useEffect(()=>{n&&(f({what_went_well:n.what_went_well||"",needs_improvement:n.needs_improvement||"",goals_next_period:n.goals_next_period||"",overall_rating:n.overall_rating||0}),I({self_what_went_well:n.self_what_went_well||"",self_needs_improvement:n.self_needs_improvement||"",self_goals_next_period:n.self_goals_next_period||"",self_overall_rating:n.self_overall_rating||0}),me(n.employee_comments||""))},[d,n?.id]);const pe=L({mutationFn:async()=>{if(!s||!Q?.id||!R?.organization_id)throw new Error("Missing required data");const{data:a,error:c}=await j.from("performance_reviews").insert({employee_id:s,reviewer_id:Q.id,organization_id:R.organization_id,review_period_start:w(q,"yyyy-MM-dd"),review_period_end:w(M,"yyyy-MM-dd"),status:"self_assessment_pending",template_id:$?.id||null,competencies:$?.competencies||null}).select().single();if(c)throw c;return a},onSuccess:async a=>{h.invalidateQueries({queryKey:["performance-reviews",s]}),y(!1),C(a.id),t(null);try{await j.functions.invoke("notify-review-stage",{body:{review_id:a.id,stage:"review_initiated"}})}catch{}v.success("Review created - employee notified to complete self-assessment")},onError:a=>{v.error(a.message||"Failed to create review")}}),W=L({mutationFn:async a=>{if(!d)throw new Error("No review selected");const{error:c}=await j.from("performance_reviews").update(a).eq("id",d);if(c)throw c;return a},onSuccess:()=>{h.invalidateQueries({queryKey:["performance-reviews",s]}),v.success("Review saved")},onError:a=>{v.error(a.message||"Failed to save review")}}),Se=async()=>{await W.mutateAsync({self_what_went_well:_.self_what_went_well,self_needs_improvement:_.self_needs_improvement,self_goals_next_period:_.self_goals_next_period,self_overall_rating:_.self_overall_rating||null,self_submitted_at:new Date().toISOString(),status:"in_progress"});try{await j.functions.invoke("notify-review-stage",{body:{review_id:d,stage:"self_assessment_submitted"}})}catch{}v.success("Self-assessment submitted")},Me=async()=>{await W.mutateAsync({what_went_well:r.what_went_well,needs_improvement:r.needs_improvement,goals_next_period:r.goals_next_period,overall_rating:r.overall_rating||null,manager_submitted_at:new Date().toISOString(),status:"pending_acknowledgment"});try{await j.functions.invoke("notify-review-stage",{body:{review_id:d,stage:"manager_review_ready"}})}catch{}v.success("Review submitted for acknowledgment")},Re=async()=>{await W.mutateAsync({employee_comments:ce||null,acknowledged_at:new Date().toISOString(),status:"completed"});try{await j.functions.invoke("notify-review-stage",{body:{review_id:d,stage:"review_acknowledged"}})}catch{}v.success("Review acknowledged and completed")},Pe=a=>{f({what_went_well:a.what_went_well?.join(`
• `)||"",needs_improvement:a.needs_improvement?.join(`
• `)||"",goals_next_period:a.goals_next_period?.join(`
• `)||"",overall_rating:parseInt(a.rating_suggestion?.charAt(0)||"3")||3})},xe=a=>{switch(a){case"completed":return e.jsx(A,{className:"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",children:"Completed"});case"pending_acknowledgment":return e.jsx(A,{className:"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",children:"Awaiting Acknowledgment"});case"in_progress":return e.jsx(A,{className:"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",children:"Manager Review"});case"self_assessment_pending":return e.jsx(A,{className:"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",children:"Self-Assessment"});default:return e.jsx(A,{variant:"secondary",children:"Draft"})}},H=(a,c,x)=>e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"flex items-center gap-1",children:[1,2,3,4,5].map(O=>e.jsxs(Ue,{children:[e.jsx(Qe,{asChild:!0,children:e.jsx("button",{type:"button",onClick:()=>c?.(O),disabled:x,className:F("transition-transform",!x&&"hover:scale-110"),children:e.jsx(G,{className:F("h-6 w-6 transition-colors",O<=a?"text-amber-400 fill-amber-400":"text-muted hover:text-amber-200")})})}),e.jsxs(He,{side:"top",className:"max-w-xs",children:[e.jsx("p",{className:"font-semibold",children:U[O-1].label}),e.jsx("p",{className:"text-xs text-muted-foreground",children:U[O-1].description})]})]},O))}),e.jsx(es,{})]}),De=()=>{if(!n)return null;const a=n.status,c=a==="completed";return a==="self_assessment_pending"||a==="draft"?ee?e.jsxs(g,{children:[e.jsxs(D,{children:[e.jsxs(z,{className:"text-lg flex items-center gap-2",children:[e.jsx(Ne,{className:"h-5 w-5"}),"Your Self-Assessment"]}),e.jsx(Y,{children:"Complete your self-assessment to share your perspective on your performance"})]}),e.jsxs(N,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(i,{children:"What Went Well"}),e.jsx(P,{value:_.self_what_went_well,onChange:x=>I({..._,self_what_went_well:x.target.value}),placeholder:"Describe your key achievements and strengths...",rows:4})]}),e.jsxs("div",{children:[e.jsx(i,{children:"Areas for Improvement"}),e.jsx(P,{value:_.self_needs_improvement,onChange:x=>I({..._,self_needs_improvement:x.target.value}),placeholder:"Identify areas where you'd like to grow...",rows:4})]}),e.jsxs("div",{children:[e.jsx(i,{children:"Goals for Next Period"}),e.jsx(P,{value:_.self_goals_next_period,onChange:x=>I({..._,self_goals_next_period:x.target.value}),placeholder:"What do you want to achieve next...",rows:4})]}),e.jsxs("div",{children:[e.jsx(i,{children:"Self Rating"}),H(_.self_overall_rating,x=>I({..._,self_overall_rating:x}))]}),e.jsxs(m,{onClick:Se,disabled:W.isPending,children:[e.jsx(je,{className:"h-4 w-4 mr-1"}),"Submit Self-Assessment"]})]})]}):e.jsxs(g,{className:"p-8 text-center",children:[e.jsx(K,{className:"h-12 w-12 mx-auto mb-4 text-muted-foreground"}),e.jsx("h3",{className:"font-medium mb-1",children:"Waiting for Self-Assessment"}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:[R?.profiles?.full_name||"The employee"," needs to complete their self-assessment first."]})]}):a==="in_progress"?Ce||o?e.jsxs("div",{className:"space-y-4",children:[n.self_submitted_at&&e.jsx(se,{selfAssessment:{self_what_went_well:n.self_what_went_well,self_needs_improvement:n.self_needs_improvement,self_goals_next_period:n.self_goals_next_period,self_overall_rating:n.self_overall_rating,self_submitted_at:n.self_submitted_at}}),e.jsxs(g,{children:[e.jsxs(D,{children:[e.jsx(z,{className:"text-lg",children:"Manager Review"}),e.jsx(Y,{children:"Provide your assessment based on the employee's performance and self-assessment"})]}),e.jsxs(N,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(i,{children:"What Went Well"}),e.jsx(P,{value:r.what_went_well,onChange:x=>f({...r,what_went_well:x.target.value}),placeholder:"Describe accomplishments and strengths...",rows:4})]}),e.jsxs("div",{children:[e.jsx(i,{children:"Areas for Improvement"}),e.jsx(P,{value:r.needs_improvement,onChange:x=>f({...r,needs_improvement:x.target.value}),placeholder:"Describe growth opportunities...",rows:4})]}),e.jsxs("div",{children:[e.jsx(i,{children:"Goals for Next Period"}),e.jsx(P,{value:r.goals_next_period,onChange:x=>f({...r,goals_next_period:x.target.value}),placeholder:"Define objectives for the next period...",rows:4})]}),e.jsxs("div",{children:[e.jsx(i,{children:"Overall Rating"}),H(r.overall_rating,x=>f({...r,overall_rating:x}))]}),e.jsxs("div",{className:"flex gap-2 pt-4",children:[e.jsxs(m,{variant:"outline",onClick:()=>W.mutate({what_went_well:r.what_went_well,needs_improvement:r.needs_improvement,goals_next_period:r.goals_next_period,overall_rating:r.overall_rating||null}),disabled:W.isPending,children:[e.jsx(Xe,{className:"h-4 w-4 mr-1"}),"Save Draft"]}),e.jsxs(m,{onClick:Me,disabled:W.isPending,children:[e.jsx(je,{className:"h-4 w-4 mr-1"}),"Submit for Acknowledgment"]})]})]})]}),e.jsx(Ze,{employeeId:s,reviewId:d,periodStart:n.review_period_start,periodEnd:n.review_period_end,onDraftApplied:Pe})]}):e.jsxs(g,{className:"p-8 text-center",children:[e.jsx(K,{className:"h-12 w-12 mx-auto mb-4 text-muted-foreground"}),e.jsx("h3",{className:"font-medium mb-1",children:"Manager Review in Progress"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Your manager is currently reviewing your self-assessment."})]}):a==="pending_acknowledgment"?ee?e.jsxs("div",{className:"space-y-4",children:[n.self_submitted_at&&e.jsx(se,{selfAssessment:{self_what_went_well:n.self_what_went_well,self_needs_improvement:n.self_needs_improvement,self_goals_next_period:n.self_goals_next_period,self_overall_rating:n.self_overall_rating,self_submitted_at:n.self_submitted_at}}),e.jsxs(g,{children:[e.jsx(D,{children:e.jsx(z,{className:"text-lg",children:"Manager's Review"})}),e.jsxs(N,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(i,{className:"text-muted-foreground",children:"What Went Well"}),e.jsx("p",{className:"mt-1 whitespace-pre-wrap",children:n.what_went_well||"—"})]}),e.jsxs("div",{children:[e.jsx(i,{className:"text-muted-foreground",children:"Areas for Improvement"}),e.jsx("p",{className:"mt-1 whitespace-pre-wrap",children:n.needs_improvement||"—"})]}),e.jsxs("div",{children:[e.jsx(i,{className:"text-muted-foreground",children:"Goals for Next Period"}),e.jsx("p",{className:"mt-1 whitespace-pre-wrap",children:n.goals_next_period||"—"})]}),e.jsxs("div",{children:[e.jsx(i,{className:"text-muted-foreground",children:"Manager's Rating"}),e.jsx("div",{className:"mt-1",children:H(n.overall_rating||0,void 0,!0)})]})]})]}),e.jsxs(g,{children:[e.jsx(D,{children:e.jsxs(z,{className:"text-lg flex items-center gap-2",children:[e.jsx(Le,{className:"h-5 w-5"}),"Acknowledge Review"]})}),e.jsxs(N,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(i,{children:"Your Comments (Optional)"}),e.jsx(P,{value:ce,onChange:x=>me(x.target.value),placeholder:"Add any comments, questions, or feedback...",rows:4})]}),e.jsxs(m,{onClick:Re,disabled:W.isPending,children:[e.jsx(ye,{className:"h-4 w-4 mr-1"}),"Acknowledge Review"]})]})]})]}):e.jsxs(g,{className:"p-8 text-center",children:[e.jsx(K,{className:"h-12 w-12 mx-auto mb-4 text-muted-foreground"}),e.jsx("h3",{className:"font-medium mb-1",children:"Awaiting Acknowledgment"}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:["Waiting for ",R?.profiles?.full_name||"the employee"," to acknowledge the review."]})]}):c?e.jsxs("div",{className:"space-y-4",children:[e.jsx("div",{className:"flex justify-end",children:e.jsx(ss,{review:n,employeeName:R?.profiles?.full_name||"Employee",employeePosition:R?.position||"Position",employeeDepartment:R?.department||"Department",reviewerName:n.reviewer?.profiles?.full_name||"Manager",organizationName:R?.organization?.name||"Organization",organizationLogo:R?.organization?.logo_url})}),n.self_submitted_at&&e.jsx(se,{selfAssessment:{self_what_went_well:n.self_what_went_well,self_needs_improvement:n.self_needs_improvement,self_goals_next_period:n.self_goals_next_period,self_overall_rating:n.self_overall_rating,self_submitted_at:n.self_submitted_at}}),e.jsxs(g,{children:[e.jsx(D,{children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(z,{className:"text-lg",children:"Manager's Review"}),e.jsx(A,{className:"bg-green-100 text-green-700",children:"Completed"})]})}),e.jsxs(N,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(i,{className:"text-muted-foreground",children:"What Went Well"}),e.jsx("p",{className:"mt-1 whitespace-pre-wrap",children:n.what_went_well||"—"})]}),e.jsxs("div",{children:[e.jsx(i,{className:"text-muted-foreground",children:"Areas for Improvement"}),e.jsx("p",{className:"mt-1 whitespace-pre-wrap",children:n.needs_improvement||"—"})]}),e.jsxs("div",{children:[e.jsx(i,{className:"text-muted-foreground",children:"Goals for Next Period"}),e.jsx("p",{className:"mt-1 whitespace-pre-wrap",children:n.goals_next_period||"—"})]}),e.jsxs("div",{children:[e.jsx(i,{className:"text-muted-foreground",children:"Manager's Rating"}),e.jsx("div",{className:"mt-1",children:H(n.overall_rating||0,void 0,!0)})]})]})]}),n.acknowledged_at&&e.jsxs(g,{className:"border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-900/20",children:[e.jsxs(D,{children:[e.jsxs(z,{className:"text-lg flex items-center gap-2 text-green-700 dark:text-green-400",children:[e.jsx(ye,{className:"h-5 w-5"}),"Employee Acknowledgment"]}),e.jsxs(Y,{children:["Acknowledged on ",w(new Date(n.acknowledged_at),"d MMM yyyy")]})]}),n.employee_comments&&e.jsx(N,{children:e.jsx("p",{className:"whitespace-pre-wrap",children:n.employee_comments})})]})]}):null};return e.jsxs("div",{className:"space-y-4 md:space-y-6",children:[e.jsxs(m,{variant:"ghost",size:"sm",className:"mb-4",onClick:()=>l(`/team/${s}`),children:[e.jsx(Ke,{className:"h-4 w-4 mr-1"}),"Back to Profile"]}),e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold",children:"Performance Reviews"}),e.jsx("p",{className:"text-muted-foreground",children:R?.profiles?.full_name||"Team Member"})]}),o&&!ee&&e.jsxs(re,{open:k,onOpenChange:y,children:[e.jsx(ie,{asChild:!0,children:e.jsxs(m,{children:[e.jsx(ae,{className:"h-4 w-4 mr-1"}),"New Review"]})}),e.jsxs(le,{children:[e.jsx(oe,{children:e.jsx(de,{children:"Create Performance Review"})}),e.jsxs("div",{className:"space-y-4 py-4",children:[e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(i,{children:"Period Start"}),e.jsxs(ue,{children:[e.jsx(fe,{asChild:!0,children:e.jsxs(m,{variant:"outline",className:"w-full justify-start text-left",children:[e.jsx(_e,{className:"h-4 w-4 mr-2"}),w(q,"d MMM yyyy")]})}),e.jsx(we,{className:"w-auto p-0",children:e.jsx(ve,{mode:"single",selected:q,onSelect:a=>a&&p(a)})})]})]}),e.jsxs("div",{children:[e.jsx(i,{children:"Period End"}),e.jsxs(ue,{children:[e.jsx(fe,{asChild:!0,children:e.jsxs(m,{variant:"outline",className:"w-full justify-start text-left",children:[e.jsx(_e,{className:"h-4 w-4 mr-2"}),w(M,"d MMM yyyy")]})}),e.jsx(we,{className:"w-auto p-0",children:e.jsx(ve,{mode:"single",selected:M,onSelect:a=>a&&E(a)})})]})]})]}),e.jsxs("div",{children:[e.jsx(i,{children:"Template (Optional)"}),e.jsxs("div",{className:"mt-2",children:[e.jsx(as,{onSelectTemplate:t,selectedTemplateId:$?.id}),$&&e.jsxs("p",{className:"text-sm text-muted-foreground mt-1",children:["Using: ",$.name]})]})]})]}),e.jsxs(te,{children:[e.jsx(m,{variant:"outline",onClick:()=>y(!1),children:"Cancel"}),e.jsx(m,{onClick:()=>pe.mutate(),disabled:pe.isPending,children:"Create Review"})]})]})]})]}),e.jsxs("div",{className:"grid lg:grid-cols-3 gap-6",children:[e.jsxs("div",{className:"lg:col-span-1 space-y-3",children:[e.jsx("h2",{className:"font-semibold text-sm text-muted-foreground uppercase",children:"Reviews"}),ke?e.jsx("div",{className:"space-y-2",children:[1,2,3].map(a=>e.jsx(X,{className:"h-20 w-full"},a))}):Z?.length===0?e.jsxs(g,{className:"p-6 text-center text-muted-foreground",children:[e.jsx(J,{className:"h-8 w-8 mx-auto mb-2 opacity-50"}),e.jsx("p",{className:"text-sm",children:"No performance reviews yet"})]}):Z?.map(a=>e.jsx(g,{className:F("cursor-pointer transition-all hover:shadow-md",d===a.id&&"ring-2 ring-primary"),onClick:()=>C(a.id),children:e.jsxs(N,{className:"p-4",children:[e.jsxs("div",{className:"flex items-start justify-between",children:[e.jsxs("div",{children:[e.jsxs("p",{className:"font-medium text-sm",children:[w(new Date(a.review_period_start),"MMM yyyy")," –"," ",w(new Date(a.review_period_end),"MMM yyyy")]}),e.jsxs("p",{className:"text-xs text-muted-foreground mt-1",children:["By ",a.reviewer?.profiles?.full_name||"Unknown"]})]}),xe(a.status)]}),a.overall_rating&&e.jsx("div",{className:"flex items-center gap-1 mt-2",children:[1,2,3,4,5].map(c=>e.jsx(G,{className:F("h-3 w-3",c<=a.overall_rating?"text-amber-400 fill-amber-400":"text-muted")},c))})]})},a.id))]}),e.jsx("div",{className:"lg:col-span-2 space-y-4",children:d&&n?e.jsxs(e.Fragment,{children:[e.jsx(g,{children:e.jsx(D,{className:"pb-3",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsxs(z,{className:"text-lg",children:["Review: ",w(new Date(n.review_period_start),"MMM yyyy")," –"," ",w(new Date(n.review_period_end),"MMM yyyy")]}),e.jsxs(Y,{children:["Created ",w(new Date(n.created_at),"d MMM yyyy")]})]}),xe(n.status)]})})}),De()]}):e.jsxs(g,{className:"p-8 text-center",children:[e.jsx(J,{className:"h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50"}),e.jsx("h3",{className:"font-medium mb-1",children:"Select a Review"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Choose a review from the list to view details"})]})})]})]})};export{fs as default};
