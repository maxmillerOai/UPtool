import { cn } from "@/lib/utils";
import type { ProgressState } from "@/types";

export interface SegmentedProgressProps {
  percent: number;
  state: ProgressState;
  segments?: number;
  className?: string;
  /** Enables the flowing wave / sheen animation for in-progress bars. */
  animated?: boolean;
}

interface StateStyle {
  fill: string;
  glow: string;
  sheen: string;
  orb: string;
}

const styleByState: Record<ProgressState, StateStyle> = {
  done: {
    fill: "bg-gradient-to-t from-[#0090d4] via-[#00bfff] to-[#8af0ff]",
    glow: "shadow-[0_0_8px_-1px_rgba(0,212,255,0.85)]",
    sheen: "via-cyan-100/70",
    orb: "bg-cyan-200 shadow-[0_0_12px_3px_rgba(0,212,255,0.9)]",
  },
  uploading: {
    fill: "bg-gradient-to-t from-[#d97706] via-[#f59e0b] to-[#fcd34d]",
    glow: "shadow-[0_0_8px_-1px_rgba(245,158,11,0.9)]",
    sheen: "via-amber-100/70",
    orb: "bg-amber-200 shadow-[0_0_12px_3px_rgba(245,158,11,0.95)]",
  },
  waiting: {
    fill: "bg-slate-600/40",
    glow: "",
    sheen: "",
    orb: "",
  },
};

export function SegmentedProgress({
  percent,
  state,
  segments = 20,
  className,
  animated = true,
}: SegmentedProgressProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * segments);
  const s = styleByState[state];
  const active = state === "uploading" && animated;
  const boundary = (filled / segments) * 100;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex w-full items-stretch gap-[3px]">
        {Array.from({ length: segments }).map((_, i) => {
          const isFilled = i < filled;
          const isLeading = isFilled && i === filled - 1;
          return (
            <span
              key={i}
              className="relative h-2.5 flex-1 overflow-hidden rounded-[2px] bg-[rgba(148,163,184,0.1)] ring-1 ring-inset ring-white/[0.04]"
            >
              {isFilled && (
                <span
                  className={cn(
                    "absolute inset-0 rounded-[2px] transition-all duration-500",
                    s.fill,
                    s.glow,
                    active && "animate-segment-wave"
                  )}
                  style={active ? { animationDelay: `${i * 65}ms` } : undefined}
                />
              )}
              {isFilled && (
                <span className="absolute inset-x-0 top-0 h-1/3 rounded-t-[2px] bg-white/25" />
              )}
              {isLeading && active && (
                <span className="absolute inset-0 rounded-[2px] bg-white/35 animate-pulse-glow" />
              )}
            </span>
          );
        })}
      </div>

      {active && filled > 0 && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden rounded-[3px]"
          style={{ width: `${boundary}%` }}
        >
          <div
            className={cn(
              "absolute inset-y-0 -inset-x-6 animate-shimmer bg-gradient-to-r from-transparent to-transparent",
              s.sheen
            )}
          />
        </div>
      )}

      {active && filled > 0 && filled < segments && (
        <span
          className={cn(
            "pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full animate-edge-pulse",
            s.orb
          )}
          style={{ left: `${boundary}%` }}
        />
      )}
    </div>
  );
}
