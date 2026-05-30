import { useMemo } from "react";
import { useGetInteractionStats, useGetChartData, useListInteractions, getListInteractionsQueryKey, getGetInteractionStatsQueryKey, getGetChartDataQueryKey, useDeleteInteraction } from "@workspace/api-client-react";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2 } from "lucide-react";
import { AddInteractionSheet } from "@/components/add-interaction-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetInteractionStats();
  const { data: chartData, isLoading: chartLoading } = useGetChartData();
  const { data: interactions, isLoading: interactionsLoading } = useListInteractions();
  
  const queryClient = useQueryClient();
  const deleteInteraction = useDeleteInteraction();

  const handleDelete = (id: number) => {
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

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-3">
          <StatCard title="Total interactions" value={stats?.totalInteractions} loading={statsLoading} />
          <StatCard title="Success rate" value={stats ? `${(stats.successRate * 100).toFixed(2)}%` : undefined} loading={statsLoading} />
          <StatCard title="Days active" value={stats?.totalDaysActive} loading={statsLoading} />
          <StatCard title="Days passed" value={stats?.totalDaysPassed} loading={statsLoading} />
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
              ) : chartData && chartData.points.length > 0 ? (
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
              ) : chartData && chartData.points.length > 0 ? (
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
            ) : interactions?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No encounters recorded yet.</p>
            ) : (
              interactions?.map((interaction) => (
                <Card key={interaction.id} className="relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-1 h-full ${interaction.success ? 'bg-success' : 'bg-destructive'}`} />
                  <CardContent className="p-4 pl-5">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          {format(new Date(interaction.createdAt), 'MMM d, HH:mm')}
                        </span>
                        <Badge variant="outline" className="text-[10px] uppercase">{interaction.space}</Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(interaction.id)}>
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
    </div>
  );
}

function StatCard({ title, value, loading }: { title: string, value?: string | number, loading: boolean }) {
  return (
    <div className="bg-card border border-border p-4 rounded-xl flex flex-col justify-between">
      <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{title}</span>
      {loading ? (
        <div className="h-8 w-16 bg-muted animate-pulse rounded mt-2" />
      ) : (
        <span className="text-2xl font-bold mt-1 text-primary">{value ?? '-'}</span>
      )}
    </div>
  );
}
