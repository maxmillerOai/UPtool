import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FileHost } from "@/types";

export interface FileHostSelectorProps {
  hosts: FileHost[];
  onToggle: (id: string) => void;
}

export function FileHostSelector({ hosts, onToggle }: FileHostSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select File Hosts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {hosts.map((host) => (
            <button
              key={host.id}
              type="button"
              onClick={() => onToggle(host.id)}
              aria-pressed={host.selected}
              className={cn(
                "group flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-all",
                host.selected
                  ? "border-[rgba(0,191,255,0.5)] bg-[rgba(0,191,255,0.08)] shadow-[0_0_14px_-4px_rgba(0,212,255,0.6)]"
                  : "border-[rgba(148,163,184,0.18)] bg-[rgba(11,22,46,0.4)] hover:border-[rgba(0,191,255,0.3)]"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                  host.selected
                    ? "border-cyber-cyan bg-cyber-cyan text-[#021326]"
                    : "border-slate-500 bg-transparent"
                )}
              >
                {host.selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded text-[11px] font-bold",
                  hostBadgeColor(host.code)
                )}
              >
                {host.code}
              </span>
              <span className="truncate text-sm font-medium text-foreground/90">
                {host.name}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function hostBadgeColor(code: string): string {
  switch (code) {
    case "K2S":
      return "bg-[rgba(0,191,255,0.18)] text-cyan-300";
    case "FB":
      return "bg-[rgba(59,130,246,0.2)] text-blue-300";
    case "FJ":
      return "bg-[rgba(99,102,241,0.2)] text-indigo-300";
    case "RG":
      return "bg-[rgba(245,158,11,0.2)] text-amber-300";
    case "IT":
      return "bg-[rgba(20,184,166,0.2)] text-teal-300";
    case "PX":
      return "bg-[rgba(148,163,184,0.18)] text-slate-300";
    default:
      return "bg-[rgba(148,163,184,0.18)] text-slate-300";
  }
}
