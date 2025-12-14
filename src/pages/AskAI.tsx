import { GlobalAskAI } from '@/components/GlobalAskAI';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

const AskAI = () => {
  const { currentOrg } = useOrganization();
  const { navigateOrg } = useOrgNavigation();
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] bg-background">
      {/* Mobile header */}
      {isMobile && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigateOrg('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Ask AI</h1>
        </div>
      )}
      
      {/* AI Content */}
      <div className="flex-1 overflow-hidden">
        <GlobalAskAI 
          organizationId={currentOrg?.id} 
          isMobileFullscreen={false}
        />
      </div>
    </div>
  );
};

export default AskAI;
