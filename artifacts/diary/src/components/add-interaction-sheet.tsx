import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useForm } from "react-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCreateInteraction, getListInteractionsQueryKey, getGetInteractionStatsQueryKey, getGetChartDataQueryKey, InteractionInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function AddInteractionSheet() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<InteractionInput>({
    height: 160,
    figure: "Normal",
    age: 18,
    company: "Alone",
    attitude: "Neutral", // Wait, options are: Suspicious, Open, Friendly, Flirt
    myMood: "Neutral",
    myPerformance: "OK",
    space: "On street",
    notes: "",
    lessonLearned: "",
    success: false,
  });

  const queryClient = useQueryClient();
  const createInteraction = useCreateInteraction();

  // Correct defaults based on spec
  const handleOpenChange = (o: boolean) => {
    if (o) {
      setFormData({
        height: 160,
        figure: "Normal",
        age: 18,
        company: "Alone",
        attitude: "Open",
        myMood: "Neutral",
        myPerformance: "OK",
        space: "On street",
        notes: "",
        lessonLearned: "",
        success: false,
      });
    }
    setOpen(o);
  };

  const handleSubmit = () => {
    createInteraction.mutate({ data: formData }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInteractionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetInteractionStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetChartDataQueryKey() });
        setOpen(false);
      }
    });
  };

  const updateField = (field: keyof InteractionInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button 
          size="icon" 
          className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg shadow-primary/20"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-xl px-0 pb-0 overflow-hidden flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle>Log Encounter</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          
          <div className="space-y-3">
            <Label>Her Height</Label>
            <Select value={formData.height.toString()} onValueChange={(val) => updateField('height', parseInt(val, 10))}>
              <SelectTrigger>
                <SelectValue placeholder="Height" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="140">140 cm</SelectItem>
                <SelectItem value="150">150 cm</SelectItem>
                <SelectItem value="160">160 cm</SelectItem>
                <SelectItem value="170">170 cm</SelectItem>
                <SelectItem value="180">180 cm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Her Figure</Label>
            <SegmentedPicker 
              options={["Super thin", "Slim", "Normal", "Slightly chubby"]} 
              value={formData.figure} 
              onChange={(val) => updateField('figure', val)} 
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Her Age</Label>
              <span className="text-xl font-bold font-mono text-primary">{formData.age}</span>
            </div>
            <div className="pt-2 h-40 flex justify-center">
              <Slider 
                orientation="vertical"
                min={14} 
                max={80} 
                step={1}
                value={[formData.age]} 
                onValueChange={(val) => updateField('age', val[0])}
                className="h-full"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Her Company</Label>
            <SegmentedPicker 
              options={["Alone", "Waiting for friend", "Waiting for boyfriend", "With female friend"]} 
              value={formData.company} 
              onChange={(val) => updateField('company', val)} 
            />
          </div>

          <div className="space-y-3">
            <Label>Her Attitude</Label>
            <SegmentedPicker 
              options={["Suspicious", "Open", "Friendly", "Flirt"]} 
              value={formData.attitude} 
              onChange={(val) => updateField('attitude', val)} 
            />
          </div>

          <div className="space-y-3">
            <Label>My Mood</Label>
            <SegmentedPicker 
              options={["Not feeling it", "Neutral", "Excited"]} 
              value={formData.myMood} 
              onChange={(val) => updateField('myMood', val)} 
            />
          </div>

          <div className="space-y-3">
            <Label>My Performance</Label>
            <SegmentedPicker 
              options={["Total wreck", "Fumbling", "OK", "Good", "Excellent"]} 
              value={formData.myPerformance} 
              onChange={(val) => updateField('myPerformance', val)} 
            />
          </div>

          <div className="space-y-3">
            <Label>Space</Label>
            <SegmentedPicker 
              options={["On street", "In park", "Metro station", "Meetup", "Club", "Naplavka", "Václavská"]} 
              value={formData.space} 
              onChange={(val) => updateField('space', val)} 
            />
          </div>

          <div className="space-y-3">
            <Label>Meeting Notes</Label>
            <Textarea 
              className="resize-none min-h-[100px]" 
              placeholder="What happened?"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Lesson Learned</Label>
            <Textarea 
              className="resize-none min-h-[80px]" 
              placeholder="Key takeaway..."
              value={formData.lessonLearned}
              onChange={(e) => updateField('lessonLearned', e.target.value)}
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
              <Label className="text-base font-semibold">Outcome</Label>
              <div className="flex items-center gap-3">
                <span className={cn("text-sm font-medium", !formData.success ? "text-destructive" : "text-muted-foreground")}>Fail</span>
                <Switch 
                  checked={formData.success} 
                  onCheckedChange={(val) => updateField('success', val)}
                  className={cn("data-[state=checked]:bg-success")}
                />
                <span className={cn("text-sm font-medium", formData.success ? "text-success" : "text-muted-foreground")}>Success</span>
              </div>
            </div>
          </div>
          
          <div className="pb-10 pt-4">
            <Button 
              className="w-full h-12 text-lg font-bold" 
              onClick={handleSubmit}
              disabled={createInteraction.isPending}
            >
              {createInteraction.isPending ? "Saving..." : "Save Record"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SegmentedPicker({ options, value, onChange }: { options: string[], value: string, onChange: (val: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-4 py-2 text-sm rounded-md transition-colors border",
            value === opt 
              ? "bg-primary text-primary-foreground border-primary font-medium" 
              : "bg-secondary text-secondary-foreground border-transparent hover:border-border"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
