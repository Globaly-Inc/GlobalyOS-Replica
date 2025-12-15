import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  Eye, 
  Check, 
  X, 
  Layers, 
  Monitor, 
  Smartphone,
  SplitSquareHorizontal,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';

interface VisualSnapshot {
  id: string;
  test_run_id: string;
  page_name: string;
  page_path: string;
  baseline_image_path: string | null;
  current_image_path: string | null;
  diff_image_path: string | null;
  diff_percentage: number | null;
  status: 'new' | 'passed' | 'failed' | 'approved';
  viewport: string | null;
  browser: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
}

interface VisualRegressionViewProps {
  runId?: string;
}

const VisualRegressionView = ({ runId }: VisualRegressionViewProps) => {
  const queryClient = useQueryClient();
  const [selectedSnapshot, setSelectedSnapshot] = useState<VisualSnapshot | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'side-by-side' | 'slider' | 'diff'>('side-by-side');
  const [sliderValue, setSliderValue] = useState([50]);

  // Fetch visual snapshots
  const { data: snapshots, isLoading } = useQuery({
    queryKey: ['visual-snapshots', runId],
    queryFn: async () => {
      let query = supabase
        .from('visual_snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (runId) {
        query = query.eq('test_run_id', runId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VisualSnapshot[];
    },
  });

  // Approve snapshot mutation
  const approveSnapshotMutation = useMutation({
    mutationFn: async (snapshotId: string) => {
      const { error } = await supabase
        .from('visual_snapshots')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', snapshotId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Snapshot approved as new baseline');
      queryClient.invalidateQueries({ queryKey: ['visual-snapshots'] });
      setSelectedSnapshot(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to approve snapshot');
    },
  });

  const getStatusBadge = (status: string, diffPercentage: number | null) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-success/20 text-success border-success/30">Passed</Badge>;
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {diffPercentage?.toFixed(2)}% diff
          </Badge>
        );
      case 'approved':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Approved</Badge>;
      case 'new':
        return <Badge variant="outline">New Baseline</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'approved':
        return <Check className="h-4 w-4 text-primary" />;
      default:
        return <ImageIcon className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const failedSnapshots = snapshots?.filter(s => s.status === 'failed') ?? [];
  const passedSnapshots = snapshots?.filter(s => s.status === 'passed') ?? [];

  // Get actual Supabase storage URL for visual snapshots
  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    // Get public URL from Supabase storage
    const { data } = supabase.storage.from('visual-snapshots').getPublicUrl(path);
    return data?.publicUrl || null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Snapshot List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visual Snapshots
          </CardTitle>
          <CardDescription>
            {failedSnapshots.length > 0 
              ? `${failedSnapshots.length} visual regression${failedSnapshots.length > 1 ? 's' : ''} detected`
              : 'All visual tests passing'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {/* Failed Snapshots First */}
              {failedSnapshots.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-destructive mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Needs Review ({failedSnapshots.length})
                  </div>
                  {failedSnapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      onClick={() => setSelectedSnapshot(snapshot)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors border-l-4 border-destructive ${
                        selectedSnapshot?.id === snapshot.id
                          ? 'bg-destructive/10 border-destructive'
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{snapshot.page_name}</span>
                        {getStatusBadge(snapshot.status, snapshot.diff_percentage)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {snapshot.page_path}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {snapshot.viewport === 'mobile' ? (
                            <Smartphone className="h-3 w-3" />
                          ) : (
                            <Monitor className="h-3 w-3" />
                          )}
                          {snapshot.viewport || 'desktop'}
                        </span>
                        {snapshot.browser && <span>• {snapshot.browser}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Other Snapshots */}
              {passedSnapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  onClick={() => setSelectedSnapshot(snapshot)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedSnapshot?.id === snapshot.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate">{snapshot.page_name}</span>
                    {getStatusIcon(snapshot.status)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {snapshot.page_path}
                  </div>
                </div>
              ))}

              {(!snapshots || snapshots.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No visual snapshots yet</p>
                  <p className="text-xs mt-1">Run E2E tests to generate screenshots</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Comparison View */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {selectedSnapshot ? selectedSnapshot.page_name : 'Screenshot Comparison'}
              </CardTitle>
              <CardDescription>
                {selectedSnapshot 
                  ? `${selectedSnapshot.page_path} • ${selectedSnapshot.viewport || 'desktop'} viewport`
                  : 'Select a snapshot to compare'}
              </CardDescription>
            </div>
            {selectedSnapshot && (
              <div className="flex gap-2">
                {selectedSnapshot.status === 'failed' && (
                  <Button
                    size="sm"
                    onClick={() => approveSnapshotMutation.mutate(selectedSnapshot.id)}
                    disabled={approveSnapshotMutation.isPending}
                    className="gap-2"
                  >
                    {approveSnapshotMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Accept as Baseline
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedSnapshot ? (
            <div className="space-y-4">
              {/* Comparison Mode Tabs */}
              <Tabs value={comparisonMode} onValueChange={(v) => setComparisonMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="side-by-side" className="gap-2">
                    <SplitSquareHorizontal className="h-4 w-4" />
                    Side by Side
                  </TabsTrigger>
                  <TabsTrigger value="slider" className="gap-2">
                    <Layers className="h-4 w-4" />
                    Slider
                  </TabsTrigger>
                  <TabsTrigger value="diff" className="gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Diff Only
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="side-by-side" className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Baseline</div>
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                        {selectedSnapshot.baseline_image_path ? (
                          <img
                            src={getImageUrl(selectedSnapshot.baseline_image_path) || ''}
                            alt="Baseline"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <ImageIcon className="h-8 w-8 opacity-50" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Current</div>
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                        {selectedSnapshot.current_image_path ? (
                          <img
                            src={getImageUrl(selectedSnapshot.current_image_path) || ''}
                            alt="Current"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <ImageIcon className="h-8 w-8 opacity-50" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="slider" className="mt-4">
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
                    {/* Baseline (underneath) */}
                    <div className="absolute inset-0">
                      {selectedSnapshot.baseline_image_path ? (
                        <img
                          src={getImageUrl(selectedSnapshot.baseline_image_path) || ''}
                          alt="Baseline"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <ImageIcon className="h-8 w-8 opacity-50" />
                        </div>
                      )}
                    </div>
                    {/* Current (clipped overlay) */}
                    <div 
                      className="absolute inset-0 overflow-hidden"
                      style={{ clipPath: `inset(0 ${100 - sliderValue[0]}% 0 0)` }}
                    >
                      {selectedSnapshot.current_image_path ? (
                        <img
                          src={getImageUrl(selectedSnapshot.current_image_path) || ''}
                          alt="Current"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <ImageIcon className="h-8 w-8 opacity-50" />
                        </div>
                      )}
                    </div>
                    {/* Slider line */}
                    <div 
                      className="absolute top-0 bottom-0 w-1 bg-primary z-10"
                      style={{ left: `${sliderValue[0]}%` }}
                    />
                  </div>
                  <div className="mt-4 px-4">
                    <Slider
                      value={sliderValue}
                      onValueChange={setSliderValue}
                      min={0}
                      max={100}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>Baseline</span>
                      <span>Current</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="diff" className="mt-4">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                    {selectedSnapshot.diff_image_path ? (
                      <img
                        src={getImageUrl(selectedSnapshot.diff_image_path) || ''}
                        alt="Diff"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <ImageIcon className="h-8 w-8 opacity-50 mb-2" />
                        <span className="text-sm">No diff available</span>
                      </div>
                    )}
                  </div>
                  {selectedSnapshot.diff_percentage !== null && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">Pixel Difference: </span>
                        <span className={selectedSnapshot.diff_percentage > 0.5 ? 'text-destructive' : 'text-success'}>
                          {selectedSnapshot.diff_percentage.toFixed(4)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Threshold: 0.5% (differences above this trigger failure)
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <Eye className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">No Snapshot Selected</p>
              <p className="text-sm">Select a snapshot from the list to compare screenshots</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VisualRegressionView;
