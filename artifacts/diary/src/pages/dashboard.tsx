import { useMemo, useState, MouseEvent } from "react";
import { useGetInteractionStats, useGetChartData, useListInteractions, getListInteractionsQueryKey, getGetInteractionStatsQueryKey, getGetChartDataQueryKey, useDeleteInteraction, Interaction } from "@workspace/api-client-react";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2 } from "lucide-react";
import { AddInteractionSheet } from "@/components/add-interaction-sheet";
import { InteractionDetailSheet } from "@/components/interaction-detail-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useGetInteractionStats();
  const { data: chartData, isLoading: chartLoading, error: chartError } = useGetChartData();
  const { data: interactions, isLoading: interactionsLoading, error: interactionsError } = useListInteractions();

  const combinedError = (statsError || chartError || interactionsError) as any;
  
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const queryClient = useQueryClient();
  const deleteInteraction = useDeleteInteraction();

  const handleView = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setDetailOpen(true);
  };

  const handleDelete = (e: MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Delete this entry?")) {
      deleteInteraction.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInteractionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetInteractionStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetChartDataQueryKey() });
        }
      });
    }
  };

  return (
    <div className="min-h-[100dvh] w-full pb-24 flex justify-center">
      <div className="w-full max-w-md p-4 space-y-6">
        
        <header className="mb-8 mt-4">
          <h1 className="text-3xl font-bold tracking-tight">Diary</h1>
          <p className="text-muted-foreground text-sm font-mono mt-1">Field Journal</p>
        </header>

        {combinedError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {combinedError.message || "An unexpected error occurred."}
              {combinedError.data?.details && (
                <div className="mt-2 text-xs font-mono bg-destructive/10 p-2 rounded">
                  {combinedError.data.details}
                </div>
              )}
              {combinedError.status === 502 && (
                <div className="mt-2 text-xs italic">
                  Tip: A 502 error on Netlify often means the backend function crashed. Check Netlify function logs for details.
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-3">
          <StatCard title="Total interactions" value={stats?.totalInteractions} loading={statsLoading} />
          <StatCard title="Success rate" value={stats ? `${(stats.successRate * 100).toFixed(2)}%` : undefined} loading={statsLoading} />
          <StatCard title="Days active" value={stats?.totalDaysActive} loading={statsLoading} />
          <StatCard title="Avg interactions/day" value={stats?.totalDaysActive ? (stats.totalInteractions / stats.totalDaysActive).toFixed(2) : undefined} loading={statsLoading} />
          <StatCard title="First interaction" value={stats?.firstInteractionDate ? format(new Date(stats.firstInteractionDate), 'MMM d, yyyy') : undefined} loading={statsLoading} />
          <StatCard title="Last interaction" value={stats?.lastInteractionDate ? format(new Date(stats.lastInteractionDate), 'MMM d, yyyy') : undefined} loading={statsLoading} />
          <div className="col-span-full flex justify-center">
            <div className="w-full max-w-[200px]">
              <StatCard title="Days passed" value={stats?.totalDaysPassed} loading={statsLoading} centered />
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Interactions / Day</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] w-full">
              {chartLoading ? (
                <div className="h-full w-full animate-pulse bg-muted rounded-md" />
              ) : chartData?.points && chartData.points.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.points}>
                    <XAxis dataKey="label" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} width={30} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Line type="monotone" dataKey="interactions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] w-full">
              {chartLoading ? (
                <div className="h-full w-full animate-pulse bg-muted rounded-md" />
              ) : chartData?.points && chartData.points.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.points}>
                    <XAxis dataKey="label" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} width={40} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(val: number) => [`${(val * 100).toFixed(2)}%`, 'Rate']}
                    />
                    <Line type="monotone" dataKey="successRate" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* History */}
        <section className="space-y-3 pt-4">
          <h2 className="text-lg font-bold">Recent Encounters</h2>
          <div className="space-y-3">
            {interactionsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)
            ) : !Array.isArray(interactions) || interactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No encounters recorded yet.</p>
            ) : (
              interactions.map((interaction) => (
                <Card
                  key={interaction.id}
                  className="relative overflow-hidden group cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => handleView(interaction)}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${interaction.success ? 'bg-success' : 'bg-destructive'}`} />
                  <CardContent className="p-4 pl-5">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          {format(new Date(interaction.createdAt), 'MMM d, HH:mm')}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase">{interaction.space}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDelete(e, interaction.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-sm mt-3">
                      <Badge variant="secondary" className="bg-secondary/50 font-normal">
                        {interaction.age}y / {interaction.height}cm / {interaction.figure}
                      </Badge>
                      <Badge variant="secondary" className="bg-secondary/50 font-normal">
                        {interaction.attitude}
                      </Badge>
                      <Badge variant="secondary" className="bg-secondary/50 font-normal">
                        Perf: {interaction.myPerformance}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

      </div>
      
      <AddInteractionSheet />
      <InteractionDetailSheet
        interaction={selectedInteraction}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

function StatCard({ title, value, loading, centered }: { title: string, value?: string | number, loading: boolean, centered?: boolean }) {
  return (
    <div className={cn("bg-card border border-border p-4 rounded-xl flex flex-col justify-between h-full", centered && "items-center text-center")}>
      <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{title}</span>
      {loading ? (
        <div className="h-8 w-16 bg-muted animate-pulse rounded mt-2" />
      ) : (
        <span className="text-2xl font-bold mt-1 text-primary">{value ?? '-'}</span>
      )}
    </div>
  );
}
