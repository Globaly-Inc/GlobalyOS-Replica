import { ReactNode, useEffect, useState } from 'react';
import { ArrowUp, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { WebsiteHeader } from '@/components/website/WebsiteHeader';

interface LegalDocumentLayoutProps {
  title: string;
  lastUpdated: string;
  effectiveDate: string;
  children: ReactNode;
  tableOfContents?: { id: string; title: string; level: number }[];
}

const relatedDocuments = [
  { path: '/terms', title: 'Terms of Service' },
  { path: '/privacy', title: 'Privacy Policy' },
  { path: '/acceptable-use', title: 'Acceptable Use Policy' },
  { path: '/dpa', title: 'Data Processing Agreement' },
  { path: '/cookies', title: 'Cookie Policy' },
];

export function LegalDocumentLayout({
  title,
  lastUpdated,
  effectiveDate,
  children,
  tableOfContents = [],
}: LegalDocumentLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);

      // Find active section
      const sections = tableOfContents.map((item) => document.getElementById(item.id));
      const scrollPosition = window.scrollY + 100;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(tableOfContents[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tableOfContents]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  // Filter out current document from related documents
  const filteredRelatedDocs = relatedDocuments.filter(doc => doc.path !== location.pathname);

  return (
    <div className="min-h-screen bg-background">
      {/* Website Header */}
      <WebsiteHeader />

      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block w-64 shrink-0 print:hidden">
              <div className="sticky top-24">
              {/* Table of Contents */}
              {tableOfContents.length > 0 && (
                <>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wide">
                    Table of Contents
                  </h3>
                  <ScrollArea className="h-[calc(100vh-380px)]">
                    <nav className="space-y-1">
                      {tableOfContents.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => scrollToSection(item.id)}
                          className={cn(
                            'block w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors',
                            item.level === 1 ? 'font-medium' : 'pl-4 text-muted-foreground',
                            activeSection === item.id
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-muted'
                          )}
                        >
                          {item.title}
                        </button>
                      ))}
                    </nav>
                  </ScrollArea>
                </>
              )}

              {/* Related Documents */}
              <div className="mt-6">
                <Separator className="mb-6" />
                <h3 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wide">
                  Related Documents
                </h3>
                <nav className="space-y-1">
                  {filteredRelatedDocs.map((doc) => (
                    <Link
                      key={doc.path}
                      to={doc.path}
                      className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {doc.title}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-3xl">
            {/* Document Header */}
            <div className="mb-8 pb-8 border-b">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{title}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-4">
                <span>Last Updated: {lastUpdated}</span>
                <span>•</span>
                <span>Effective: {effectiveDate}</span>
              </div>
            </div>

            {/* Document Content */}
            <div className="prose prose-gray dark:prose-invert max-w-none">
              {children}
            </div>

            {/* Related Documents - Mobile only */}
            <div className="mt-12 pt-8 border-t lg:hidden print:hidden">
              <h3 className="font-semibold mb-4">Related Documents</h3>
              <div className="flex flex-wrap gap-3">
                {filteredRelatedDocs.map((doc) => (
                  <Link
                    key={doc.path}
                    to={doc.path}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {doc.title}
                  </Link>
                ))}
              </div>
            </div>
          </main>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all print:hidden"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
