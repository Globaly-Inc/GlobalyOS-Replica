import { BookOpen, FolderOpen, FileText, Paperclip, Lock, Brain } from "lucide-react";

export const WikiSection = () => (
  <section id="section-wiki" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-32">
    <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
      <div>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          Knowledge Base
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
          Your Team's Single Source of Truth
        </h2>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          Rich text wiki with folders, pages, file attachments, granular permissions, and AI-powered search & Q&A.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: FileText, text: "Rich Text Editor" },
            { icon: FolderOpen, text: "Folders & Pages" },
            { icon: Paperclip, text: "File Attachments" },
            { icon: Lock, text: "Granular Permissions" },
            { icon: Brain, text: "AI-Powered Q&A" },
            { icon: BookOpen, text: "Embeds & Integrations" },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-foreground">{f.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border shadow-xl p-6">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <span className="font-semibold text-foreground">Knowledge Base</span>
        </div>
        <div className="space-y-2">
          {[
            { icon: "📁", name: "Getting Started", meta: "5 pages" },
            { icon: "📁", name: "Company Policies", meta: "12 pages" },
            { icon: "📁", name: "Engineering Wiki", meta: "24 pages" },
            { icon: "📄", name: "Employee Handbook", meta: "Updated 2d ago" },
            { icon: "📄", name: "Leave Policy 2026", meta: "Updated 1w ago" },
            { icon: "📄", name: "Remote Work Guidelines", meta: "Updated 3d ago" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium text-foreground">{item.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{item.meta}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
