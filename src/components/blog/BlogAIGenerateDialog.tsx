import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, FileText, X } from "lucide-react";
import { useBlogKeywords, generateBlogPosts, BlogKeyword } from "@/services/useBlog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface BlogAIGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AUDIENCES = [
  { value: 'hr_professionals', label: 'HR Professionals' },
  { value: 'startup_founders', label: 'Startup Founders' },
  { value: 'team_leads', label: 'Team Leads & Managers' },
  { value: 'small_business', label: 'Small Business Owners' },
  { value: 'remote_teams', label: 'Remote Team Managers' },
];

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'educational', label: 'Educational' },
  { value: 'inspiring', label: 'Inspiring' },
];

const WORD_COUNTS = [
  { value: '500-800', label: 'Short (500-800 words)' },
  { value: '800-1200', label: 'Medium (800-1200 words)' },
  { value: '1200-1500', label: 'Long (1200-1500 words)' },
];

export const BlogAIGenerateDialog = ({ open, onOpenChange }: BlogAIGenerateDialogProps) => {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [audience, setAudience] = useState("hr_professionals");
  const [tone, setTone] = useState("professional");
  const [wordCount, setWordCount] = useState("800-1200");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: keywords = [] } = useBlogKeywords('active');
  const queryClient = useQueryClient();

  const activeKeywords = keywords.filter(k => k.is_active);

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keyword) 
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    );
  };

  const handleGenerate = async () => {
    if (selectedKeywords.length === 0) {
      toast.error('Please select at least one keyword');
      return;
    }

    setIsGenerating(true);
    try {
      await generateBlogPosts({
        keywords: selectedKeywords,
        audience,
        tone,
        wordCount,
      });
      toast.success('5 blog posts generated! Review them in the Pending Review tab.');
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      onOpenChange(false);
      setSelectedKeywords([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate blog posts');
    } finally {
      setIsGenerating(false);
    }
  };

  // Group keywords by category
  const groupedKeywords = activeKeywords.reduce((acc, keyword) => {
    const cat = keyword.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(keyword);
    return acc;
  }, {} as Record<string, BlogKeyword[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Blog Posts with AI
          </DialogTitle>
          <DialogDescription>
            Select keywords and preferences to generate 5 unique blog posts. All posts will need your approval before publishing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Keyword Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Select Keywords</Label>
              <Badge variant="secondary">
                {selectedKeywords.length} selected
              </Badge>
            </div>
            
            {selectedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                {selectedKeywords.map(keyword => (
                  <Badge 
                    key={keyword} 
                    variant="default"
                    className="cursor-pointer"
                    onClick={() => toggleKeyword(keyword)}
                  >
                    {keyword}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}

            <ScrollArea className="h-[200px] border rounded-lg p-3">
              <div className="space-y-4">
                {Object.entries(groupedKeywords).map(([category, keywords]) => (
                  <div key={category} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map(keyword => (
                        <label
                          key={keyword.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedKeywords.includes(keyword.keyword)}
                            onCheckedChange={() => toggleKeyword(keyword.keyword)}
                          />
                          <span className="text-sm">{keyword.keyword}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCES.map(a => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label>Writing Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Word Count */}
          <div className="space-y-2">
            <Label>Article Length</Label>
            <Select value={wordCount} onValueChange={setWordCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORD_COUNTS.map(w => (
                  <SelectItem key={w.value} value={w.value}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || selectedKeywords.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating 5 Posts...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate 5 Posts
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
