import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  X, 
  Sparkles, 
  RefreshCw, 
  Search,
  TrendingUp,
  Target,
  Loader2
} from "lucide-react";
import { useBlogKeywords, useCreateBlogKeyword, useDeleteBlogKeyword, useUpdateBlogKeyword, researchKeywords, BlogKeyword } from "@/services/useBlog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = ['HRMS', 'Leave', 'Attendance', 'Performance', 'Collaboration', 'Wiki', 'Onboarding', 'Remote', 'Other'];

export const BlogKeywordsManager = () => {
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState<string>("HRMS");
  const [searchQuery, setSearchQuery] = useState("");
  const [isResearching, setIsResearching] = useState(false);

  const { data: keywords = [], isLoading } = useBlogKeywords('all');
  const { data: aiKeywords = [] } = useBlogKeywords('ai_suggested');
  const createKeyword = useCreateBlogKeyword();
  const deleteKeyword = useDeleteBlogKeyword();
  const updateKeyword = useUpdateBlogKeyword();

  const activeKeywords = keywords.filter(k => k.is_active && !k.suggested_by_ai);
  const pendingAIKeywords = aiKeywords.filter(k => k.suggested_by_ai && k.is_active);

  const filteredKeywords = activeKeywords.filter(k => 
    k.keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    
    createKeyword.mutate({
      keyword: newKeyword.trim(),
      category: newCategory,
      difficulty: 'medium',
    }, {
      onSuccess: () => {
        setNewKeyword("");
      }
    });
  };

  const handleAcceptAIKeyword = (keyword: BlogKeyword) => {
    updateKeyword.mutate({
      id: keyword.id,
      suggested_by_ai: false,
    });
  };

  const handleResearchKeywords = async () => {
    setIsResearching(true);
    try {
      await researchKeywords();
      toast.success('New keyword suggestions generated!');
    } catch (error) {
      toast.error('Failed to research keywords');
    } finally {
      setIsResearching(false);
    }
  };

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="gap-2">
            <Target className="h-4 w-4" />
            Active Keywords ({activeKeywords.length})
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Suggestions ({pendingAIKeywords.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-4">
          {/* Add Keyword Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add New Keyword</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                placeholder="Enter keyword..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                className="flex-1"
              />
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddKeyword} disabled={createKeyword.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Keywords List */}
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredKeywords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Target className="h-8 w-8 mb-2" />
                <p>No keywords found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredKeywords.map((keyword) => (
                  <div
                    key={keyword.id}
                    className="flex items-center justify-between p-3 bg-card border rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{keyword.keyword}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {keyword.category && (
                            <Badge variant="outline" className="text-xs">
                              {keyword.category}
                            </Badge>
                          )}
                          {keyword.difficulty && (
                            <span className={cn("text-xs px-2 py-0.5 rounded-full", getDifficultyColor(keyword.difficulty))}>
                              {keyword.difficulty}
                            </span>
                          )}
                          {keyword.relevance_score && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {keyword.relevance_score}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteKeyword.mutate(keyword.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="ai" className="mt-4 space-y-4">
          {/* Research Button */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Keyword Research
              </CardTitle>
              <CardDescription>
                Let AI analyze trends and suggest relevant keywords for your blog
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleResearchKeywords} 
                disabled={isResearching}
                className="w-full ai-gradient-border"
              >
                {isResearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Researching...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 ai-gradient-icon" />
                    Research New Keywords
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <ScrollArea className="h-[400px]">
            {pendingAIKeywords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Sparkles className="h-8 w-8 mb-2" />
                <p>No AI suggestions yet</p>
                <p className="text-xs">Click "Research New Keywords" to generate</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingAIKeywords.map((keyword) => (
                  <div
                    key={keyword.id}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-transparent border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="font-medium">{keyword.keyword}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {keyword.category && (
                            <Badge variant="outline" className="text-xs">
                              {keyword.category}
                            </Badge>
                          )}
                          {keyword.difficulty && (
                            <span className={cn("text-xs px-2 py-0.5 rounded-full", getDifficultyColor(keyword.difficulty))}>
                              {keyword.difficulty}
                            </span>
                          )}
                          {keyword.relevance_score && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {keyword.relevance_score}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAcceptAIKeyword(keyword)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteKeyword.mutate(keyword.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
