import { ReactNode } from 'react';

interface LegalSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-xl font-semibold mb-4 text-foreground">{title}</h2>
      <div className="space-y-4 text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  );
}

interface LegalSubSectionProps {
  id?: string;
  title: string;
  children: ReactNode;
}

export function LegalSubSection({ id, title, children }: LegalSubSectionProps) {
  return (
    <div id={id} className="mt-6 scroll-mt-24">
      <h3 className="text-lg font-medium mb-3 text-foreground">{title}</h3>
      <div className="space-y-3 text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

interface LegalListProps {
  items: string[];
  ordered?: boolean;
}

export function LegalList({ items, ordered = false }: LegalListProps) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={`${ordered ? 'list-decimal' : 'list-disc'} pl-6 space-y-2`}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </Tag>
  );
}
