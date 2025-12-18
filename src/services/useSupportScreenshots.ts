/**
 * Support Screenshots Hooks
 * Provides AI smart capture and bulk capture functionality
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ScreenshotSession {
  accessToken: string;
  refreshToken: string;
}

export interface PrivacyOptions {
  maskNames: boolean;
  blurAvatars: boolean;
  hideEmails: boolean;
}

export interface ScreenshotSuggestion {
  route: string;
  description: string;
  highlight_selector?: string;
  annotation?: string;
  privacy_masks?: {
    type: 'blur' | 'replace' | 'hide';
    selector: string;
    replacement?: string;
  }[];
}

export interface SmartCaptureResult {
  success: boolean;
  suggestions?: ScreenshotSuggestion[];
  articleTitle?: string;
  module?: string;
  error?: string;
}

export interface CaptureResult {
  success: boolean;
  articleId?: string;
  captured?: number;
  failed?: number;
  results?: { screenshotId: string; status: string; error?: string }[];
  error?: string;
}

/**
 * Hook for AI-powered smart screenshot capture
 * Analyzes article content and suggests optimal screenshots with privacy masking
 */
export const useAISmartCapture = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<ScreenshotSuggestion[]>([]);
  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: async ({
      articleId,
      articleContent,
      articleTitle,
      module,
      orgSlug = 'globalyhub',
      privacyOptions = { maskNames: true, blurAvatars: true, hideEmails: true }
    }: {
      articleId: string;
      articleContent: string;
      articleTitle: string;
      module: string;
      orgSlug?: string;
      privacyOptions?: PrivacyOptions;
    }): Promise<SmartCaptureResult> => {
      setIsAnalyzing(true);
      
      // Step 1: Get AI suggestions
      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-suggest-screenshots', {
        body: {
          articleContent,
          articleTitle,
          module,
          orgSlug,
          privacyOptions,
        },
      });

      if (aiError) {
        throw new Error(aiError.message || 'Failed to get AI suggestions');
      }

      if (!aiData?.success || !aiData?.suggestions?.length) {
        throw new Error(aiData?.error || 'No screenshot suggestions generated');
      }

      setSuggestions(aiData.suggestions);
      return aiData;
    },
    onError: (error) => {
      setIsAnalyzing(false);
      toast.error(`AI analysis failed: ${error.message}`);
    },
    onSuccess: () => {
      setIsAnalyzing(false);
    },
  });

  const captureMutation = useMutation({
    mutationFn: async ({
      articleId,
      suggestions,
      module,
    }: {
      articleId: string;
      suggestions: ScreenshotSuggestion[];
      module: string;
    }): Promise<CaptureResult> => {
      // Trigger auto-capture with the suggestions
      const { data, error } = await supabase.functions.invoke('auto-capture-screenshots', {
        body: {
          articleId,
          screenshots: suggestions,
          module,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to capture screenshots');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['support-screenshots'] });
      toast.success(`Captured ${data.captured} screenshots, ${data.failed} failed`);
    },
    onError: (error) => {
      toast.error(`Capture failed: ${error.message}`);
    },
  });

  const smartCapture = async (params: {
    articleId: string;
    articleContent: string;
    articleTitle: string;
    module: string;
    orgSlug?: string;
    privacyOptions?: PrivacyOptions;
  }) => {
    const result = await analyzeMutation.mutateAsync(params);
    
    if (result.success && result.suggestions?.length) {
      return captureMutation.mutateAsync({
        articleId: params.articleId,
        suggestions: result.suggestions,
        module: params.module,
      });
    }
    
    return result;
  };

  return {
    smartCapture,
    analyze: analyzeMutation.mutate,
    capture: captureMutation.mutate,
    isAnalyzing,
    isCapturing: captureMutation.isPending,
    suggestions,
    clearSuggestions: () => setSuggestions([]),
  };
};

/**
 * Hook for bulk capturing all pending screenshots
 * Accepts optional session tokens for authenticated capture
 */
export const useCaptureAllPending = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session?: ScreenshotSession) => {
      // Fetch all pending screenshots
      const { data: pendingScreenshots, error: fetchError } = await supabase
        .from('support_screenshots')
        .select('id')
        .eq('status', 'pending');

      if (fetchError) {
        throw new Error(`Failed to fetch pending screenshots: ${fetchError.message}`);
      }

      if (!pendingScreenshots?.length) {
        return { captured: 0, failed: 0, message: 'No pending screenshots to capture' };
      }

      let captured = 0;
      let failed = 0;

      // Capture each screenshot sequentially to avoid rate limits
      for (const screenshot of pendingScreenshots) {
        try {
          const { error } = await supabase.functions.invoke('capture-doc-screenshot', {
            body: { 
              screenshotId: screenshot.id,
              // Pass session tokens if provided
              accessToken: session?.accessToken,
              refreshToken: session?.refreshToken,
            },
          });

          if (error) {
            failed++;
            console.error(`Failed to capture ${screenshot.id}:`, error);
          } else {
            captured++;
          }

          // Small delay between captures
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch {
          failed++;
        }
      }

      return { captured, failed, total: pendingScreenshots.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['support-screenshots'] });
      if (data.captured > 0 || data.failed > 0) {
        toast.success(`Captured ${data.captured}/${data.total} screenshots`);
      } else {
        toast.info('No pending screenshots to capture');
      }
    },
    onError: (error) => {
      toast.error(`Bulk capture failed: ${error.message}`);
    },
  });
};
