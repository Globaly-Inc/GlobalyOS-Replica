import { Shield, Users, Zap, Lock, Eye, Server } from "lucide-react";

const securityFeatures = [
  { icon: Shield, title: "Enterprise Security", description: "Role-based access control, data encryption at rest and in transit, full audit logs" },
  { icon: Users, title: "Multi-Tenancy", description: "Complete data isolation between organizations with zero cross-tenant leakage" },
  { icon: Lock, title: "GDPR Compliant", description: "Full compliance with data privacy regulations and right to be forgotten" },
  { icon: Eye, title: "SOC 2 Ready", description: "Security controls designed for SOC 2 Type II certification standards" },
  { icon: Server, title: "99.9% Uptime", description: "Reliable infrastructure with automatic backups and disaster recovery" },
  { icon: Zap, title: "Data Encryption", description: "AES-256 encryption for data at rest and TLS 1.3 for data in transit" },
];

export const SecuritySection = () => (
  <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 bg-muted text-muted-foreground">
          Security & Trust
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
          Enterprise-Grade Security
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Your data is protected with the highest standards of security, compliance, and reliability.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {securityFeatures.map((feature, i) => (
          <div key={i} className="p-6 rounded-2xl bg-card border border-border text-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <feature.icon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
            <p className="text-muted-foreground text-sm">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
