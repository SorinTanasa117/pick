import { useMemo, useState, MouseEvent } from "react";
import { useGetInteractionStats, useGetChartData, useListInteractions, getListInteractionsQueryKey, getGetInteractionStatsQueryKey, getGetChartDataQueryKey, useDeleteInteraction, Interaction, useGetCorrelations, getGetCorrelationsQueryKey } from "@workspace/api-client-react";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, TrendingUp } from "lucide-react";
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
  const { data: correlations, isLoading: correlationsLoading, error: correlationsError } = useGetCorrelations();

  const combinedError = (statsError || chartError || interactionsError || correlationsError) as any;
  
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

        {/* Correlations */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Success Correlations
          </h2>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 space-y-4">
              {correlationsLoading ? (
                Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />)
              ) : !correlations || correlations.length === 0 ? (
                <p className="text-muted-foreground text-sm">Not enough data to draw correlations.</p>
              ) : (
                correlations.map((corr) => (
                  <div key={corr.field} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {corr.description}
                          <span className="ml-1 opacity-60 text-[10px] font-normal">
                            ({corr.mostCommonValue})
                          </span>
                        </span>
                        {corr.bestSubValue && (
                          <Badge variant="secondary" className="px-1 py-0 h-4 text-[10px] font-bold bg-success/10 text-success border-success/20">
                            {corr.bestSubValue}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        r = {corr.correlation.toFixed(2)}
                      </span>
                    </div>
                    <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                      {/* Confidence Interval */}
                      <div
                        className="absolute h-full bg-primary/20"
                        style={{
                          left: `${((corr.confidenceInterval[0] + 1) / 2) * 100}%`,
                          right: `${100 - ((corr.confidenceInterval[1] + 1) / 2) * 100}%`
                        }}
                      />
                      {/* Correlation Point */}
                      <div
                        className={cn(
                          "absolute top-0 h-full w-1 rounded-full",
                          corr.correlation > 0.3 ? "bg-success" : corr.correlation < -0.3 ? "bg-destructive" : "bg-primary"
                        )}
                        style={{ left: `${((corr.correlation + 1) / 2) * 100}%` }}
                      />
                      {/* Zero line */}
                      <div className="absolute top-0 left-1/2 h-full w-px bg-border" />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
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
                    
                    <div className="space-y-2 mt-3">
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="text-muted-foreground uppercase font-bold tracking-tight">Her:</span>
                        <Badge variant="secondary" className="bg-secondary/40 font-normal py-0 px-1.5 h-5">
                          {interaction.age}y / {interaction.looks}L / {interaction.personality}P / {interaction.company} / {interaction.attitude}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="text-muted-foreground uppercase font-bold tracking-tight">Me:</span>
                        <Badge variant="secondary" className="bg-secondary/40 font-normal py-0 px-1.5 h-5">
                          {interaction.myMood} / {interaction.myPerformance}
                        </Badge>
                      </div>
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
