import { cn } from "@/lib/utils";
import type { ProgressState } from "@/types";

export interface SegmentedProgressProps {
  percent: number;
  state: ProgressState;
  segments?: number;
  className?: string;
}

const fillColor: Record<ProgressState, string> = {
  done: "bg-cyber-cyan shadow-[0_0_6px_-1px_rgba(0,212,255,0.8)]",
  uploading: "bg-cyber-orange shadow-[0_0_6px_-1px_rgba(245,158,11,0.8)]",
  waiting: "bg-slate-600",
};

export function SegmentedProgress({
  percent,
  state,
  segments = 20,
  className,
}: SegmentedProgressProps) {
  const filled = Math.round((percent / 100) * segments);

  return (
    <div className={cn("flex w-full gap-[3px]", className)}>
      {Array.from({ length: segments }).map((_, i) => {
        const isFilled = i < filled;
        return (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 rounded-[2px] transition-colors",
              isFilled ? fillColor[state] : "bg-[rgba(148,163,184,0.14)]"
            )}
          />
        );
      })}
    </div>
  );
}
