import {
  Cloud,
  Image as ImageIcon,
  LayoutGrid,
  ListChecks,
  Settings,
} from "lucide-react";
import { SegmentedProgress } from "@/components/SegmentedProgress";
import { HostIcon } from "@/components/HostIcon";
import { cn } from "@/lib/utils";
import type { ProgressIcon, ProgressState, ProgressTask } from "@/types";

const iconMap: Record<ProgressIcon, typeof Settings> = {
  prepare: Settings,
  mediainfo: ListChecks,
  thumbnail: LayoutGrid,
  imagehost: ImageIcon,
  cloud: Cloud,
};

const stateLabel: Record<ProgressState, string> = {
  done: "Done",
  uploading: "Uploading",
  waiting: "Waiting",
};

const stateTextColor: Record<ProgressState, string> = {
  done: "text-cyber-cyan",
  uploading: "text-cyber-orange",
  waiting: "text-muted-foreground",
};

export interface ProgressCardProps {
  task: ProgressTask;
}

export function ProgressCard({ task }: ProgressCardProps) {
  const Icon = iconMap[task.icon];
  const lucide = <Icon className="h-4 w-4 text-cyber-cyan" />;
  const badge = task.badge ? (
    <span className="text-[11px] font-bold text-cyan-300">{task.badge}</span>
  ) : (
    lucide
  );

  return (
    <div className="rounded-md border border-[rgba(0,191,255,0.1)] bg-[rgba(11,22,46,0.4)] p-3">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[rgba(0,191,255,0.18)] bg-[rgba(0,191,255,0.06)]">
          {task.iconUrl ? (
            <HostIcon
              iconUrl={task.iconUrl}
              code={task.badge ?? ""}
              name={task.title}
              className="h-5 w-5"
              fallback={badge}
            />
          ) : (
            badge
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="truncate text-sm font-medium text-foreground/90">
              {task.title}
            </span>
            {task.subtitle && (
              <span className="truncate text-xs text-muted-foreground">
                ({task.subtitle})
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
          {task.percent}%
        </span>
      </div>
      <SegmentedProgress percent={task.percent} state={task.state} segments={18} />
      <div
        className={cn(
          "mt-1.5 text-right text-xs font-medium",
          stateTextColor[task.state]
        )}
      >
        {stateLabel[task.state]}
      </div>
    </div>
  );
}
