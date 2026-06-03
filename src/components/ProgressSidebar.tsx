import { Clock, Hourglass } from "lucide-react";
import { ProgressCard } from "@/components/ProgressCard";
import { SegmentedProgress } from "@/components/SegmentedProgress";
import type { ProgressTask } from "@/types";

export interface ProgressSidebarProps {
  tasks: ProgressTask[];
  overall: {
    percent: number;
    elapsed: string;
    remaining: string;
  };
}

export function ProgressSidebar({ tasks, overall }: ProgressSidebarProps) {
  return (
    <aside className="glass-panel flex h-full flex-col">
      <div className="border-b border-[rgba(0,191,255,0.12)] px-5 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-cyber-cyan">
          Progress
        </h2>
      </div>

      <div className="scrollbar-thin flex-1 space-y-2.5 overflow-auto px-4 py-4">
        {tasks.map((task) => (
          <ProgressCard key={task.id} task={task} />
        ))}
      </div>

      <div className="border-t border-[rgba(0,191,255,0.12)] px-5 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            Overall progress
          </span>
          <span className="text-sm font-semibold tabular-nums text-cyber-cyan">
            {overall.percent}%
          </span>
        </div>
        <SegmentedProgress
          percent={overall.percent}
          state="uploading"
          segments={28}
          className="mb-3"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-cyber-cyan/70" />
            Elapsed: <span className="font-mono text-foreground/80">{overall.elapsed}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Hourglass className="h-3.5 w-3.5 text-cyber-orange/70" />
            Remaining:{" "}
            <span className="font-mono text-foreground/80">{overall.remaining}</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
