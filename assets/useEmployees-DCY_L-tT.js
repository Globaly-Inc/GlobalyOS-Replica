import{ao as n,af as o,aa as u}from"./index-ckjZnHAL.js";import"./vendor-charts-LTecantw.js";const m=(t={})=>{const{currentOrg:e}=n(),{status:i="all",includeOffice:r=!0}=t;return o({queryKey:["employees",e?.id,i,r],queryFn:async()=>{if(!e?.id)return[];const l=r?`id, position, department, status, join_date, office_id,
           profiles!inner(full_name, avatar_url, email),
           office:offices(id, name, city, country)`:`id, position, department, status, join_date, office_id,
           profiles!inner(full_name, avatar_url, email)`;let a=u.from("employees").select(l).eq("organization_id",e.id);i!=="all"&&(a=a.eq("status",i));const{data:c,error:s}=await a;if(s)throw s;return c||[]},staleTime:2*60*1e3,gcTime:10*60*1e3,enabled:!!e?.id})},p=t=>{const{currentOrg:e}=n();return o({queryKey:["direct-reports",t,e?.id],queryFn:async()=>{if(!t||!e?.id)return[];const{data:i,error:r}=await u.from("employees").select(`
          id,
          position,
          department,
          status,
          profiles!inner(
            full_name,
            avatar_url,
            email
          )
        `).eq("organization_id",e.id).eq("manager_id",t).eq("status","active");if(r)throw r;return i||[]},staleTime:2*60*1e3,enabled:!!t&&!!e?.id})};export{p as a,m as u};
