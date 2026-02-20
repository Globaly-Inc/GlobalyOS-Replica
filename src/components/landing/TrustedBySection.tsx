const LogoIcons = {
  Stripe: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/></svg>,
  Notion: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.934-.56.934-1.166V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.746.327-.746.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/></svg>,
  Slack: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>,
  Figma: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117V7.51zM8.148 24c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v4.441c0 2.503-2.047 4.539-4.588 4.539zm-.001-7.509c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.02 3.019 3.02c1.705 0 3.117-1.414 3.117-3.071v-2.968H8.147zM8.148 8.981c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981H8.148zm0-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h3.117V1.471H8.148zM15.852 15.019h-4.588v-6.038h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.49-4.49 4.49v-2.942zm0-4.566h-3.117v3.095h3.117c.854 0 1.548-.693 1.548-1.548 0-.854-.694-1.547-1.548-1.547z"/></svg>,
  Linear: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M2.886 10.47a10.013 10.013 0 0 0 10.644 10.644l-10.644-10.644zm-.65 2.462 8.832 8.832a10.053 10.053 0 0 1-8.832-8.832z"/></svg>,
  Vercel: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg>,
  Supabase: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.203 12.424l-.401.562a1.04 1.04 0 0 0 .836 1.659H12v8.959a.396.396 0 0 0 .716.233l9.081-12.261.401-.562a1.04 1.04 0 0 0-.836-1.66z"/></svg>,
  Raycast: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6.044 6.044v5.478l-2.61 2.61V6.044H0v17.912h3.434v-3.434H0v-2.608l6.044-6.044v11.086h5.478L8.912 20.348v-5.478l6.044-6.044v-5.478l2.608-2.608h-5.478L9.348 3.478V0H0v3.478h5.478l.566.566v2.044-.044z"/></svg>,
  Loom: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 18.75a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5z"/></svg>,
  Miro: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.392 0H13.9L17 4.808 10.444 0H6.949l3.102 6.3L3.494 0H0l3.05 8.131L0 24h3.494L10.05 9.181 6.949 24h3.495L17 7.543 13.9 24h3.492L24 5.348V0h-3.05L17.392 0z"/></svg>,
  Airtable: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M11.992 0L1.2 4.268v8.873l10.792 4.318V8.59L22.8 4.268 11.992 0zM1.2 14.75v4.182l10.792 4.318V14.75L1.2 10.432v4.318zm11.992.05l10.608-4.318v8.436L13.192 23.25V14.8z"/></svg>,
  Webflow: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.803 6.015c-1.122 0-2.048.532-2.811 1.5.007-.007 1.012-1.5-1.03-1.5-2.015 0-4.206 1.538-5.305 3.877 0 0 .702-2.377-2.496-2.377C3.187 7.515 0 11.377 0 15.39c0 2.154 1.287 4.1 4.105 4.1 3.923 0 5.733-3.162 5.733-3.162s-.666 2.492 2.02 2.492c2.122 0 3.48-1.785 3.942-2.631v2.354h3.79v-6.69c0-3.446-1.787-5.838-1.787-5.838z"/></svg>,
  Framer: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M4 0h16v8h-8zM4 8h8l8 8H4zM4 16h8v8z"/></svg>,
  Descript: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-2 17H8V7h2v10zm6 0h-4V7h4a5 5 0 0 1 0 10z"/></svg>,
};

const trustedLogos = [
  { name: "Stripe", Icon: LogoIcons.Stripe },
  { name: "Notion", Icon: LogoIcons.Notion },
  { name: "Slack", Icon: LogoIcons.Slack },
  { name: "Figma", Icon: LogoIcons.Figma },
  { name: "Linear", Icon: LogoIcons.Linear },
  { name: "Vercel", Icon: LogoIcons.Vercel },
  { name: "Supabase", Icon: LogoIcons.Supabase },
  { name: "Raycast", Icon: LogoIcons.Raycast },
];

const trustedLogosRow2 = [
  { name: "Loom", Icon: LogoIcons.Loom },
  { name: "Miro", Icon: LogoIcons.Miro },
  { name: "Airtable", Icon: LogoIcons.Airtable },
  { name: "Webflow", Icon: LogoIcons.Webflow },
  { name: "Framer", Icon: LogoIcons.Framer },
  { name: "Descript", Icon: LogoIcons.Descript },
];

export const TrustedBySection = () => (
  <section className="py-16 overflow-hidden">
    <div className="text-center mb-10">
      <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
        Trusted by 120,000+ businesses worldwide
      </p>
    </div>
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="flex animate-marquee whitespace-nowrap">
          {[...trustedLogos, ...trustedLogos, ...trustedLogos, ...trustedLogos].map((logo, i) => (
            <div key={i} className="flex items-center gap-3 px-10 py-5 mx-3 rounded-lg bg-card border border-border shadow-sm shrink-0 min-w-[180px]">
              <logo.Icon />
              <span className="font-semibold text-base text-foreground tracking-tight">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="flex animate-marquee-reverse whitespace-nowrap">
          {[...trustedLogosRow2, ...trustedLogosRow2, ...trustedLogosRow2, ...trustedLogosRow2].map((logo, i) => (
            <div key={i} className="flex items-center gap-3 px-10 py-5 mx-3 rounded-lg bg-card border border-border shadow-sm shrink-0 min-w-[180px]">
              <logo.Icon />
              <span className="font-semibold text-base text-foreground tracking-tight">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
