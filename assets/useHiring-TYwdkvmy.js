import{ao as u,af as c,aa as n}from"./index-ckjZnHAL.js";function x(e){const{currentOrg:t}=u();return c({queryKey:["hiring","jobs",t?.id,e],queryFn:async()=>{if(!t?.id)return[];let i=n.from("jobs").select(`
          *,
          department:departments(id, name),
          office:offices(id, name, city),
          hiring_manager:employees!jobs_hiring_manager_id_fkey(
            id, user_id,
            profiles:profiles(full_name, avatar_url)
          ),
          recruiter:employees!jobs_recruiter_id_fkey(
            id, user_id,
            profiles:profiles(full_name, avatar_url)
          ),
          candidate_applications(count)
        `).eq("organization_id",t.id).order("created_at",{ascending:!1});e?.status&&(Array.isArray(e.status)?i=i.in("status",e.status):i=i.eq("status",e.status)),e?.department_id&&(i=i.eq("department_id",e.department_id)),e?.office_id&&(i=i.eq("office_id",e.office_id)),e?.hiring_manager_id&&(i=i.eq("hiring_manager_id",e.hiring_manager_id)),e?.search&&(i=i.ilike("title",`%${e.search}%`));const{data:a,error:r}=await i;if(r)throw r;return a||[]},enabled:!!t?.id})}function C(e){const{currentOrg:t}=u();return c({queryKey:["hiring","job",t?.id,e],queryFn:async()=>{if(!t?.id||!e)return null;const i=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e);let a=n.from("jobs").select(`
          *,
          department:departments(id, name),
          office:offices(id, name, city),
          hiring_manager:employees!jobs_hiring_manager_id_fkey(
            id, user_id,
            profiles:profiles(full_name, avatar_url)
          ),
          recruiter:employees!jobs_recruiter_id_fkey(
            id, user_id,
            profiles:profiles(full_name, avatar_url)
          ),
          creator:employees!jobs_created_by_fkey(
            id, user_id,
            profiles:profiles(full_name)
          )
        `).eq("organization_id",t.id);i?a=a.eq("id",e):a=a.eq("slug",e);const{data:r,error:l}=await a.single();if(l){if(l.code==="PGRST116")return null;throw l}return r},enabled:!!t?.id&&!!e})}function S(e){const{currentOrg:t}=u();return c({queryKey:["hiring","job-stages",t?.id,e],queryFn:async()=>{if(!t?.id||!e)return[];const{data:i,error:a}=await n.from("job_stages").select("*").eq("organization_id",t.id).eq("job_id",e).eq("is_active",!0).order("sort_order",{ascending:!0});if(a)throw a;return i||[]},enabled:!!t?.id&&!!e})}function B(e){const{currentOrg:t}=u();return c({queryKey:["hiring","candidates",t?.id,e],queryFn:async()=>{if(!t?.id)return[];let i=n.from("candidates").select(`
          *,
          employee:employees!candidates_employee_id_fkey(
            id, position, department, user_id,
            profiles:profiles(full_name, avatar_url)
          ),
          candidate_applications(
            id, job_id, stage, status, cv_file_path, created_at,
            job:jobs(id, title, slug)
          )
        `).eq("organization_id",t.id).order("created_at",{ascending:!1});e?.source&&(Array.isArray(e.source)?i=i.in("source",e.source):i=i.eq("source",e.source)),e?.tags?.length&&(i=i.overlaps("tags",e.tags)),e?.search&&(i=i.or(`name.ilike.%${e.search}%,email.ilike.%${e.search}%`));const{data:a,error:r}=await i;if(r)throw r;return a||[]},enabled:!!t?.id})}function M(e){const{currentOrg:t}=u();return c({queryKey:["hiring","candidate",t?.id,e],queryFn:async()=>{if(!t?.id||!e)return null;const{data:i,error:a}=await n.from("candidates").select(`
          *,
          employee:employees(
            id, position, department, user_id,
            profiles:profiles(full_name, avatar_url)
          ),
          candidate_applications(
            *,
            job:jobs(id, title, slug, status)
          )
        `).eq("organization_id",t.id).eq("id",e).maybeSingle();if(a)throw a;return i??null},enabled:!!t?.id&&!!e})}function G(e){const{currentOrg:t}=u();return c({queryKey:["hiring","applications",t?.id,e],queryFn:async()=>{if(!t?.id)return[];let i=n.from("candidate_applications").select(`
          *,
          candidate:candidates(id, name, email, phone, location, avatar_url, source, employee_id),
          job:jobs(id, title, slug, status)
        `).eq("organization_id",t.id).order("created_at",{ascending:!1});e?.job_id&&(i=i.eq("job_id",e.job_id)),e?.stage&&(Array.isArray(e.stage)?i=i.in("stage",e.stage):i=i.eq("stage",e.stage)),e?.status&&(Array.isArray(e.status)?i=i.in("status",e.status):i=i.eq("status",e.status)),e?.is_internal!==void 0&&(i=i.eq("is_internal",e.is_internal));const{data:a,error:r}=await i;if(r)throw r;return a||[]},enabled:!!t?.id})}function $(e){const{currentOrg:t}=u();return c({queryKey:["hiring","application",t?.id,e],queryFn:async()=>{if(!t?.id||!e)return null;const{data:i,error:a}=await n.from("candidate_applications").select(`
          *,
          candidate:candidates(*),
          job:jobs(*),
          assignment_instances(*),
          hiring_interviews(*),
          hiring_offers(*)
        `).eq("organization_id",t.id).eq("id",e).single();if(a){if(a.code==="PGRST116")return null;throw a}return i},enabled:!!t?.id&&!!e})}function R(e){const{currentOrg:t}=u();return c({queryKey:["hiring","candidate-applications",t?.id,e],queryFn:async()=>{if(!t?.id||!e)return[];const{data:i,error:a}=await n.from("candidate_applications").select(`
          id, stage, status, created_at, cv_file_path, cover_letter, rating, is_internal,
          job:jobs(id, title, slug, status)
        `).eq("organization_id",t.id).eq("candidate_id",e).order("created_at",{ascending:!0});if(a)throw a;return i||[]},enabled:!!t?.id&&!!e})}function E(){const{currentOrg:e}=u();return c({queryKey:["hiring","assignment-templates",e?.id],queryFn:async()=>{if(!e?.id)return[];const{data:t,error:i}=await n.from("assignment_templates").select("*").eq("organization_id",e.id).eq("is_active",!0).order("name",{ascending:!0});if(i)throw i;return t||[]},enabled:!!e?.id})}function H(e){const{currentOrg:t}=u();return c({queryKey:["hiring","assignment-instances",t?.id,e],queryFn:async()=>{if(!t?.id||!e)return[];const{data:i,error:a}=await n.from("assignment_instances").select(`
          *,
          template:assignment_templates(id, name, type, public_token),
          reviewer:employees!assignment_instances_reviewed_by_fkey(
            id,
            profiles:profiles(full_name, avatar_url)
          )
        `).eq("organization_id",t.id).eq("candidate_application_id",e).order("created_at",{ascending:!1});if(a)throw a;return i||[]},enabled:!!t?.id&&!!e})}function L(e){const{currentOrg:t}=u();return c({queryKey:["hiring","interviews",t?.id,e],queryFn:async()=>{if(!t?.id||!e)return[];const{data:i,error:a}=await n.from("hiring_interviews").select(`
          *,
          interview_scorecards(*)
        `).eq("organization_id",t.id).eq("application_id",e).order("scheduled_at",{ascending:!0});if(a)throw a;return i||[]},enabled:!!t?.id&&!!e})}function Q(e){const{currentOrg:t}=u();return c({queryKey:["hiring","offer",t?.id,e],queryFn:async()=>{if(!t?.id||!e)return null;const{data:i,error:a}=await n.from("hiring_offers").select("*").eq("organization_id",t.id).eq("application_id",e).order("created_at",{ascending:!1}).limit(1).maybeSingle();if(a)throw a;return i},enabled:!!t?.id&&!!e})}function U(e){const{currentOrg:t}=u(),{data:i}=R(e),a=(i||[]).map(r=>r.id);return c({queryKey:["hiring","candidate-activity-log",t?.id,e,a],queryFn:async()=>{if(!t?.id||a.length===0)return[];const{data:r,error:l}=await n.from("hiring_activity_logs").select(`
          *,
          actor:employees!hiring_activity_logs_actor_id_fkey(
            id, user_id,
            profiles:profiles(full_name, avatar_url)
          )
        `).eq("organization_id",t.id).eq("entity_type","application").in("entity_id",a).order("created_at",{ascending:!1});if(l)throw l;return r||[]},enabled:!!t?.id&&a.length>0})}function W(){const{currentOrg:e}=u();return c({queryKey:["hiring","email-templates",e?.id],queryFn:async()=>{if(!e?.id)return[];const{data:t,error:i}=await n.from("hiring_email_templates").select("*").eq("organization_id",e.id).eq("is_active",!0).order("name",{ascending:!0});if(i)throw i;return t||[]},enabled:!!e?.id})}function N(){const{currentOrg:e}=u();return c({queryKey:["hiring","metrics",e?.id],queryFn:async()=>{if(!e?.id)return{open_jobs:0,total_candidates:0,candidates_by_stage:{},hires_last_30_days:0,hires_last_90_days:0,avg_time_to_fill_days:null,source_of_hire:{},assignment_completion_rate:0,avg_assignment_rating:null,source_breakdown:[],applications_trend:[],applications_by_job:[],on_time_submission_rate:null,avg_review_time_days:null};const t=new Date(Date.now()-8*7*24*60*60*1e3).toISOString(),[i,a,r,l,y,g,h,w,D]=await Promise.all([n.from("jobs").select("id",{count:"exact",head:!0}).eq("organization_id",e.id).eq("status","open"),n.from("candidates").select("id",{count:"exact",head:!0}).eq("organization_id",e.id),n.from("candidate_applications").select("stage, status").eq("organization_id",e.id).eq("status","active"),n.from("candidate_applications").select("id",{count:"exact",head:!0}).eq("organization_id",e.id).eq("status","hired").gte("hired_at",new Date(Date.now()-30*24*60*60*1e3).toISOString()),n.from("candidate_applications").select("id",{count:"exact",head:!0}).eq("organization_id",e.id).eq("status","hired").gte("hired_at",new Date(Date.now()-90*24*60*60*1e3).toISOString()),n.from("assignment_instances").select("status, rating, submitted_at, deadline, reviewed_at").eq("organization_id",e.id),n.from("candidate_applications").select("source_of_application").eq("organization_id",e.id),n.from("candidate_applications").select("created_at").eq("organization_id",e.id).gte("created_at",t).order("created_at",{ascending:!0}),n.from("jobs").select("title, candidate_applications(count)").eq("organization_id",e.id).order("created_at",{ascending:!1}).limit(10)]),p={};if(r.data)for(const s of r.data)p[s.stage]=(p[s.stage]||0)+1;let v=0,j=null,z=null,A=null;if(g.data?.length){v=g.data.filter(d=>d.status==="submitted"||d.status==="reviewed").length/g.data.length*100;const o=g.data.filter(d=>d.rating!=null).map(d=>d.rating);o.length>0&&(j=o.reduce((d,_)=>d+_,0)/o.length);const f=g.data.filter(d=>d.submitted_at);f.length>0&&(z=f.filter(_=>new Date(_.submitted_at)<=new Date(_.deadline)).length/f.length*100);const m=g.data.filter(d=>d.reviewed_at&&d.submitted_at);m.length>0&&(A=m.reduce((_,k)=>_+(new Date(k.reviewed_at).getTime()-new Date(k.submitted_at).getTime()),0)/m.length/(1e3*60*60*24))}const b={};if(h.data)for(const s of h.data){const o=s.source_of_application||"Other";b[o]=(b[o]||0)+1}const F=Object.entries(b).map(([s,o])=>({name:s,value:o})).sort((s,o)=>o.value-s.value),q={};if(w.data)for(const s of w.data){const o=new Date(s.created_at),f=o.getDay(),m=o.getDate()-f+(f===0?-6:1),d=new Date(o);d.setDate(m);const _=d.toLocaleDateString("en-GB",{day:"2-digit",month:"short"});q[_]=(q[_]||0)+1}const K=Object.entries(q).map(([s,o])=>({week:s,count:o})),O=(D.data||[]).map(s=>({title:s.title,count:Array.isArray(s.candidate_applications)?s.candidate_applications[0]?.count??0:0})).filter(s=>s.count>0).sort((s,o)=>o.count-s.count).slice(0,8);return{open_jobs:i.count||0,total_candidates:a.count||0,candidates_by_stage:p,hires_last_30_days:l.count||0,hires_last_90_days:y.count||0,avg_time_to_fill_days:null,source_of_hire:{},assignment_completion_rate:v,avg_assignment_rating:j,source_breakdown:F,applications_trend:K,applications_by_job:O,on_time_submission_rate:z,avg_review_time_days:A}},enabled:!!e?.id})}async function T(e){const{data:t,error:i}=await n.from("organizations_public").select("id").eq("slug",e).single();if(i||!t)return[];const a=t,{data:r,error:l}=await n.from("jobs").select(`
      id, slug, title, location, work_model, employment_type,
      salary_min, salary_max, salary_currency, salary_visible,
      description, requirements, benefits, published_at,
      application_close_date,
      department:departments(id, name),
      office:offices(id, name, city, country)
    `).eq("organization_id",a.id).eq("status","open").eq("is_public_visible",!0).order("published_at",{ascending:!1});if(l)throw l;return r||[]}async function J(e,t){const{data:i,error:a}=await n.from("organizations_public").select("id, name, slug, logo_url, website").eq("slug",e).single();if(a||!i)return null;const r=i,{data:l,error:y}=await n.from("jobs").select(`
      *,
      department:departments(id, name),
      office:offices(id, name, city, country)
    `).eq("organization_id",r.id).eq("slug",t).eq("status","open").maybeSingle();if(y)throw y;return l?{...l,organization:{name:r.name,slug:r.slug,logo_url:r.logo_url,website:r.website}}:null}function V(e){return c({queryKey:["public","jobs",e],queryFn:()=>T(e),enabled:!!e})}function X(e,t){return c({queryKey:["public","job",e,t],queryFn:()=>J(e,t),enabled:!!e&&!!t})}function Y(e){return c({queryKey:["public","assignment",e],queryFn:async()=>{if(!e)return null;const{data:t,error:i}=await n.from("assignment_instances").select(`
          id, title, instructions, expected_deliverables, deadline, status, submitted_at,
          candidate_application:candidate_applications(
            id,
            candidate:candidates(name, email),
            job:jobs(
              title,
              organization:organizations(name, code)
            )
          )
        `).eq("secure_token",e).single();if(i){if(i.code==="PGRST116")return null;throw i}return t},enabled:!!e})}export{x as a,B as b,C as c,S as d,G as e,$ as f,H as g,L as h,Q as i,U as j,R as k,V as l,X as m,Y as n,W as o,E as p,M as q,N as u};
