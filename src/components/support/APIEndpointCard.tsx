/**
 * API Endpoint Card Component
 * Displays API endpoint documentation with request/response examples
 */

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Lock, Globe, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiDocumentation } from '@/services/useSupportArticles';
import { toast } from 'sonner';

interface APIEndpointCardProps {
  endpoint: ApiDocumentation;
  className?: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500/10 text-green-600 border-green-200',
  POST: 'bg-blue-500/10 text-blue-600 border-blue-200',
  PUT: 'bg-orange-500/10 text-orange-600 border-orange-200',
  PATCH: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  DELETE: 'bg-red-500/10 text-red-600 border-red-200',
};

export const APIEndpointCard = ({ endpoint, className }: APIEndpointCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const functionUrl = `https://rygowmzkvxgnxagqlyxf.functions.supabase.co/${endpoint.function_name}`;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={cn("font-mono text-xs", METHOD_COLORS[endpoint.method])}
            >
              {endpoint.method}
            </Badge>
            <CardTitle className="text-base font-mono">{endpoint.function_name}</CardTitle>
            {endpoint.is_public ? (
              <Badge variant="secondary" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Public
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Authenticated
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        {endpoint.description && (
          <p className="text-sm text-muted-foreground mt-2">{endpoint.description}</p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {/* Endpoint URL */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground">Endpoint URL</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
                {functionUrl}
              </code>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleCopy(functionUrl)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Tags */}
          {endpoint.tags && endpoint.tags.length > 0 && (
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground">Tags</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {endpoint.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Request Schema */}
          {endpoint.request_schema && (
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground">Request Body</label>
              <pre className="bg-muted p-3 rounded-lg mt-1 text-xs font-mono overflow-x-auto">
                {JSON.stringify(endpoint.request_schema, null, 2)}
              </pre>
            </div>
          )}

          {/* Response Schema */}
          {endpoint.response_schema && (
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground">Response</label>
              <pre className="bg-muted p-3 rounded-lg mt-1 text-xs font-mono overflow-x-auto">
                {JSON.stringify(endpoint.response_schema, null, 2)}
              </pre>
            </div>
          )}

          {/* Example Request */}
          {endpoint.example_request && (
            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground">Example Request</label>
              <pre className="bg-muted p-3 rounded-lg mt-1 text-xs font-mono overflow-x-auto">
                {JSON.stringify(endpoint.example_request, null, 2)}
              </pre>
            </div>
          )}

          {/* Example Response */}
          {endpoint.example_response && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Example Response</label>
              <pre className="bg-muted p-3 rounded-lg mt-1 text-xs font-mono overflow-x-auto">
                {JSON.stringify(endpoint.example_response, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
