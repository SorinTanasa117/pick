import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Interaction } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface InteractionDetailSheetProps {
  interaction: Interaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InteractionDetailSheet({ interaction, open, onOpenChange }: InteractionDetailSheetProps) {
  if (!interaction) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-xl px-0 pb-0 overflow-hidden flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <div className="flex justify-between items-center w-full pr-8">
            <SheetTitle>Encounter Details</SheetTitle>
            <span className="text-xs text-muted-foreground font-mono">
              {format(new Date(interaction.createdAt), 'MMMM d, yyyy HH:mm')}
            </span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <DetailItem label="Height" value={`${interaction.height} cm`} />
            <DetailItem label="Figure" value={interaction.figure} />
            <DetailItem label="Age" value={interaction.age.toString()} />
            <DetailItem label="Company" value={interaction.company} />
            <DetailItem label="Attitude" value={interaction.attitude} />
            <DetailItem label="Space" value={interaction.space} />
            <DetailItem label="My Mood" value={interaction.myMood} />
            <DetailItem label="Performance" value={interaction.myPerformance} />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-muted-foreground">Meeting Notes</Label>
            <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 p-4 rounded-lg border border-border/50">
              {interaction.notes || "No notes recorded."}
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground">Lesson Learned</Label>
            <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 p-4 rounded-lg border border-border/50">
              {interaction.lessonLearned || "No lessons recorded."}
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
              <Label className="text-base font-semibold">Outcome</Label>
              <Badge
                className={cn(
                  "px-4 py-1 text-sm font-bold uppercase",
                  interaction.success ? "bg-success hover:bg-success" : "bg-destructive hover:bg-destructive"
                )}
              >
                {interaction.success ? "Success" : "Fail"}
              </Badge>
            </div>
          </div>

          <div className="pb-10" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</Label>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
