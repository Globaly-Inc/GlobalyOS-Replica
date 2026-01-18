import { ReactNode, useEffect, useState } from 'react';
import { ArrowUp, Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface LegalDocumentLayoutProps {
  title: string;
  lastUpdated: string;
  effectiveDate: string;
  children: ReactNode;
  tableOfContents?: { id: string; title: string; level: number }[];
}

export function LegalDocumentLayout({
  title,
  lastUpdated,
  effectiveDate,
  children,
  tableOfContents = [],
}: LegalDocumentLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>('');
  const [showBackToTop, setShowBackToTop] = useState(false);

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to GlobalyOS</span>
            </Link>
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </header>

      <div className="container px-4 py-8 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Sidebar TOC - Desktop */}
          {tableOfContents.length > 0 && (
            <aside className="hidden lg:block w-64 shrink-0 print:hidden">
              <div className="sticky top-24">
                <h3 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wide">
                  Table of Contents
                </h3>
                <ScrollArea className="h-[calc(100vh-200px)]">
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
              </div>
            </aside>
          )}

          {/* Main Content */}
          <main className="flex-1 max-w-3xl">
            {/* Document Header */}
            <div className="mb-8 pb-8 border-b">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">{title}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Last Updated: {lastUpdated}</span>
                <span>•</span>
                <span>Effective: {effectiveDate}</span>
              </div>
            </div>

            {/* Document Content */}
            <div className="prose prose-gray dark:prose-invert max-w-none">
              {children}
            </div>

            {/* Related Documents */}
            <div className="mt-12 pt-8 border-t print:hidden">
              <h3 className="font-semibold mb-4">Related Documents</h3>
              <div className="flex flex-wrap gap-3">
                <Link to="/terms" className="text-sm text-primary hover:underline">
                  Terms of Service
                </Link>
                <Link to="/privacy" className="text-sm text-primary hover:underline">
                  Privacy Policy
                </Link>
                <Link to="/acceptable-use" className="text-sm text-primary hover:underline">
                  Acceptable Use Policy
                </Link>
                <Link to="/dpa" className="text-sm text-primary hover:underline">
                  Data Processing Agreement
                </Link>
              </div>
            </div>
          </main>
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
