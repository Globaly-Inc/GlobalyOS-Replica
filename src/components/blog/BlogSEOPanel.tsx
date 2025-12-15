import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Info, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fixBlogSEO } from "@/services/useBlog";
import { toast } from "sonner";

interface BlogSEOPanelProps {
  title: string;
  slug: string;
  content: string;
  focusKeyword: string;
  metaTitle: string;
  metaDescription: string;
  onFocusKeywordChange: (value: string) => void;
  onMetaTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
  onAIFix?: (result: {
    title: string;
    slug: string;
    metaDescription: string;
    content: string;
  }) => void;
}

interface SEOCheck {
  label: string;
  passed: boolean;
  info?: string;
}

export const BlogSEOPanel = ({
  title,
  slug,
  content,
  focusKeyword,
  metaTitle,
  metaDescription,
  onFocusKeywordChange,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onAIFix,
}: BlogSEOPanelProps) => {
  const [isFixing, setIsFixing] = useState(false);

  const seoAnalysis = useMemo(() => {
    const checks: SEOCheck[] = [];
    let score = 0;
    const maxScore = 100;

    // Strip HTML for text analysis
    const text = content.replace(/<[^>]*>/g, '');
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const effectiveTitle = metaTitle || title;

    // Focus keyword checks
    if (focusKeyword) {
      const keywordLower = focusKeyword.toLowerCase();
      
      // Keyword in title
      const keywordInTitle = effectiveTitle.toLowerCase().includes(keywordLower);
      checks.push({
        label: 'Focus keyword in title',
        passed: keywordInTitle,
        info: keywordInTitle ? 'Great!' : 'Add your focus keyword to the title',
      });
      if (keywordInTitle) score += 15;

      // Keyword in slug
      const keywordInSlug = slug.toLowerCase().includes(keywordLower.replace(/\s+/g, '-'));
      checks.push({
        label: 'Focus keyword in URL',
        passed: keywordInSlug,
        info: keywordInSlug ? 'Perfect!' : 'Include keyword in URL slug',
      });
      if (keywordInSlug) score += 10;

      // Keyword in first paragraph
      const firstPara = text.substring(0, 300).toLowerCase();
      const keywordInIntro = firstPara.includes(keywordLower);
      checks.push({
        label: 'Keyword in introduction',
        passed: keywordInIntro,
        info: keywordInIntro ? 'Good!' : 'Add keyword to first paragraph',
      });
      if (keywordInIntro) score += 10;

      // Keyword density
      const keywordCount = (text.toLowerCase().match(new RegExp(keywordLower, 'g')) || []).length;
      const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
      const goodDensity = density >= 0.5 && density <= 2.5;
      checks.push({
        label: 'Keyword density',
        passed: goodDensity,
        info: `${density.toFixed(1)}% (aim for 0.5-2.5%)`,
      });
      if (goodDensity) score += 10;
    } else {
      checks.push({
        label: 'Focus keyword set',
        passed: false,
        info: 'Enter a focus keyword to analyze',
      });
    }

    // Title length
    const titleLength = effectiveTitle.length;
    const goodTitleLength = titleLength >= 30 && titleLength <= 60;
    checks.push({
      label: 'Title length',
      passed: goodTitleLength,
      info: `${titleLength}/60 characters`,
    });
    if (goodTitleLength) score += 10;

    // Meta description
    const descLength = metaDescription.length;
    const goodDescLength = descLength >= 120 && descLength <= 160;
    checks.push({
      label: 'Meta description length',
      passed: goodDescLength,
      info: `${descLength}/160 characters`,
    });
    if (goodDescLength) score += 10;

    // Content length
    const goodContentLength = wordCount >= 600;
    checks.push({
      label: 'Content length',
      passed: goodContentLength,
      info: `${wordCount} words (min 600)`,
    });
    if (wordCount >= 1000) score += 15;
    else if (wordCount >= 600) score += 10;
    else if (wordCount >= 300) score += 5;

    // Headings
    const hasHeadings = /<h[2-4]/i.test(content);
    checks.push({
      label: 'Subheadings used',
      passed: hasHeadings,
      info: hasHeadings ? 'Structure is good' : 'Add H2/H3 headings',
    });
    if (hasHeadings) score += 10;

    // Images
    const hasImages = /<img/i.test(content);
    checks.push({
      label: 'Images included',
      passed: hasImages,
      info: hasImages ? 'Content has images' : 'Add relevant images',
    });
    if (hasImages) score += 10;

    return { checks, score: Math.min(score, maxScore), wordCount };
  }, [title, slug, content, focusKeyword, metaTitle, metaDescription]);

  const failedChecks = useMemo(() => {
    return seoAnalysis.checks.filter(check => !check.passed);
  }, [seoAnalysis.checks]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: 'Good', variant: 'default' as const };
    if (score >= 50) return { label: 'Needs Work', variant: 'secondary' as const };
    return { label: 'Poor', variant: 'destructive' as const };
  };

  const handleAIFix = async () => {
    if (!focusKeyword) {
      toast.error('Please enter a focus keyword first');
      return;
    }

    if (failedChecks.length === 0) {
      toast.info('All SEO checks are passing!');
      return;
    }

    setIsFixing(true);
    try {
      const result = await fixBlogSEO({
        title,
        slug,
        content,
        focusKeyword,
        metaDescription,
        failedChecks: failedChecks.map(c => ({ label: c.label, info: c.info || '' })),
      });

      if (onAIFix) {
        onAIFix(result);
        toast.success('SEO issues fixed by AI!');
      }
    } catch (error) {
      console.error('Failed to fix SEO:', error);
      toast.error('Failed to fix SEO issues. Please try again.');
    } finally {
      setIsFixing(false);
    }
  };

  const scoreBadge = getScoreBadge(seoAnalysis.score);

  return (
    <div className="space-y-6">
      {/* SEO Score */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">SEO Score</Label>
          <Badge variant={scoreBadge.variant}>{scoreBadge.label}</Badge>
        </div>
        <div className="space-y-2">
          <Progress value={seoAnalysis.score} className="h-2" />
          <p className={cn("text-2xl font-bold", getScoreColor(seoAnalysis.score))}>
            {seoAnalysis.score}/100
          </p>
        </div>

        {/* AI Fix Button */}
        {seoAnalysis.score < 80 && onAIFix && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full gap-2"
            onClick={handleAIFix}
            disabled={isFixing || !focusKeyword}
          >
            {isFixing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Fixing SEO Issues...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                AI Fix SEO Issues ({failedChecks.length})
              </>
            )}
          </Button>
        )}
      </div>

      {/* Focus Keyword */}
      <div className="space-y-2">
        <Label htmlFor="focusKeyword">Focus Keyword</Label>
        <Input
          id="focusKeyword"
          value={focusKeyword}
          onChange={(e) => onFocusKeywordChange(e.target.value)}
          placeholder="e.g., HR software"
        />
        <p className="text-xs text-muted-foreground">
          The main keyword you want this post to rank for
        </p>
      </div>

      {/* Meta Title */}
      <div className="space-y-2">
        <Label htmlFor="metaTitle">
          Meta Title
          <span className="ml-2 text-xs text-muted-foreground">
            ({(metaTitle || title).length}/60)
          </span>
        </Label>
        <Input
          id="metaTitle"
          value={metaTitle}
          onChange={(e) => onMetaTitleChange(e.target.value)}
          placeholder={title || "Enter meta title..."}
        />
      </div>

      {/* Meta Description */}
      <div className="space-y-2">
        <Label htmlFor="metaDescription">
          Meta Description
          <span className="ml-2 text-xs text-muted-foreground">
            ({metaDescription.length}/160)
          </span>
        </Label>
        <Textarea
          id="metaDescription"
          value={metaDescription}
          onChange={(e) => onMetaDescriptionChange(e.target.value)}
          placeholder="Write a compelling description for search results..."
          rows={3}
        />
      </div>

      {/* SEO Checklist */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">SEO Checklist</Label>
        <div className="space-y-2">
          {seoAnalysis.checks.map((check, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-2 p-2 rounded-md text-sm",
                check.passed ? "bg-green-50 dark:bg-green-900/20" : "bg-muted/50"
              )}
            >
              {check.passed ? (
                <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium",
                  check.passed ? "text-green-700 dark:text-green-400" : "text-foreground"
                )}>
                  {check.label}
                </p>
                {check.info && (
                  <p className="text-xs text-muted-foreground">{check.info}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Word Count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        <span>{seoAnalysis.wordCount} words</span>
      </div>
    </div>
  );
};
