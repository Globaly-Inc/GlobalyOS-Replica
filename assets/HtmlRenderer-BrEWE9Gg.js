const s={linkedin:"in",twitter:"X",instagram:"IG",facebook:"f",youtube:"▶"},g=t=>{const{logoUrl:e,orgName:r,backgroundColor:o,textColor:n,paddingTop:l,paddingBottom:i}=t.props;return`
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="background-color:${o};padding:${l}px 24px ${i}px;">
        ${e?`<img src="${e}" alt="${r}" style="max-height:48px;display:block;margin:0 auto 8px;" />`:""}
        <p style="margin:0;font-size:20px;font-weight:700;color:${n};">${r}</p>
      </td>
    </tr>
  </table>`},h=t=>{const{content:e,backgroundColor:r,paddingTop:o,paddingBottom:n,paddingLeft:l,paddingRight:i,fontSize:a,textAlign:d}=t.props;return`
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="background-color:${r};padding:${o}px ${i}px ${n}px ${l}px;font-size:${a}px;line-height:1.6;text-align:${d};color:#111827;">
        ${e}
      </td>
    </tr>
  </table>`},x=t=>{const{src:e,alt:r,link:o,width:n,align:l,paddingTop:i,paddingBottom:a}=t.props,d=`<img src="${e}" alt="${r}" style="display:block;max-width:100%;width:${n}%;border:0;" />`,p=o?`<a href="${o}" style="display:block;">${d}</a>`:d;return`
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="${{left:"left",center:"center",right:"right"}[l]}" style="padding:${i}px 0 ${a}px;">
        ${p}
      </td>
    </tr>
  </table>`},b=t=>{const{label:e,href:r,backgroundColor:o,textColor:n,borderRadius:l,align:i,paddingTop:a,paddingBottom:d,fontSize:p}=t.props;return`
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="${{left:"left",center:"center",right:"right"}[i]}" style="padding:${a}px 24px ${d}px;">
        <a href="${r||"#"}" style="display:inline-block;background-color:${o};color:${n};font-size:${p}px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:${l}px;mso-padding-alt:0;text-align:center;">
          ${e}
        </a>
      </td>
    </tr>
  </table>`},$=t=>{const{color:e,height:r,paddingTop:o,paddingBottom:n}=t.props;return`
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding:${o}px 24px ${n}px;">
        <hr style="border:none;border-top:${r}px solid ${e};margin:0;" />
      </td>
    </tr>
  </table>`},u=t=>`
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="height:${t.props.height}px;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>`,m=t=>{const{backgroundColor:e,paddingTop:r,paddingBottom:o,column1:n,column2:l}=t.props;return`
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="background-color:${e};padding:${r}px 24px ${o}px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="48%" valign="top" style="text-align:${n.textAlign};padding-right:12px;font-size:15px;line-height:1.6;color:#111827;">
              ${n.content}
            </td>
            <td width="4%">&nbsp;</td>
            <td width="48%" valign="top" style="text-align:${l.textAlign};padding-left:12px;font-size:15px;line-height:1.6;color:#111827;">
              ${l.content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`},f=t=>{const{links:e,align:r,paddingTop:o,paddingBottom:n,backgroundColor:l}=t.props,i=e.filter(d=>d.url).map(d=>`<a href="${d.url}" style="display:inline-block;margin:0 6px;background:#374151;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;width:32px;height:32px;line-height:32px;text-align:center;border-radius:4px;">
          ${s[d.platform]||d.platform}
        </a>`).join("");return`
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="${{left:"left",center:"center",right:"right"}[r]}" style="background-color:${l};padding:${o}px 24px ${n}px;">
        ${i}
      </td>
    </tr>
  </table>`},y=t=>{const{companyName:e,address:r,unsubscribeText:o,backgroundColor:n,textColor:l,paddingTop:i,paddingBottom:a}=t.props;return`
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="background-color:${n};padding:${i}px 24px ${a}px;font-size:12px;color:${l};line-height:1.6;">
        <p style="margin:0 0 4px;">${e}</p>
        <p style="margin:0 0 8px;">${r}</p>
        <p style="margin:0;">
          <a href="{{unsubscribe_url}}" style="color:${l};text-decoration:underline;">${o}</a>
        </p>
      </td>
    </tr>
  </table>`},w=t=>{switch(t.type){case"header":return g(t);case"text":return h(t);case"image":return x(t);case"button":return b(t);case"divider":return $(t);case"spacer":return u(t);case"columns":return m(t);case"social":return f(t);case"footer":return y(t);default:return""}},k=(t,e=!1)=>{const{blocks:r,globalStyles:o}=t,{backgroundColor:n,fontFamily:l,maxWidth:i}=o,a=r.map(w).join(`
`);return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Email</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${n};font-family:${l};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${n};">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table width="${i}" cellpadding="0" cellspacing="0" border="0" style="max-width:${i}px;width:100%;">
          <tr>
            <td>
              ${a}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${e?"":"<!-- TRACKING_PIXEL_PLACEHOLDER -->"}
</body>
</html>`},C=t=>t.blocks.some(e=>e.type==="footer");export{C as h,k as r};
