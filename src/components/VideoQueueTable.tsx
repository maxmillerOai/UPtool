import { CheckCircle2, Clock, Loader2, UploadCloud, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { QueueStatus, VideoQueueItem } from "@/types";

const statusConfig: Record<
  QueueStatus,
  { label: string; variant: "done" | "processing" | "uploading" | "waiting"; Icon: typeof CheckCircle2 }
> = {
  done: { label: "Done", variant: "done", Icon: CheckCircle2 },
  processing: { label: "Processing", variant: "processing", Icon: Loader2 },
  uploading: { label: "Uploading", variant: "uploading", Icon: UploadCloud },
  waiting: { label: "Waiting", variant: "waiting", Icon: Clock },
};

export interface VideoQueueTableProps {
  items: VideoQueueItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  fileCount: number;
}

export function VideoQueueTable({
  items,
  selectedId,
  onSelect,
  fileCount,
}: VideoQueueTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Video Queue</CardTitle>
        <span className="text-xs font-medium text-muted-foreground">
          ({fileCount} files)
        </span>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="overflow-hidden rounded-md border border-[rgba(0,191,255,0.1)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[rgba(0,191,255,0.12)] text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-3 py-2.5 font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">Original filename</th>
                <th className="px-3 py-2.5 font-medium">New filename</th>
                <th className="px-3 py-2.5 font-medium">Size</th>
                <th className="px-3 py-2.5 font-medium">Duration</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const { label, variant, Icon } = statusConfig[item.status];
                const selected = item.id === selectedId;
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      "group cursor-pointer border-b border-[rgba(0,191,255,0.06)] transition-colors last:border-0",
                      selected
                        ? "bg-[rgba(0,191,255,0.1)] shadow-[inset_2px_0_0_0_#00d4ff]"
                        : "hover:bg-[rgba(0,191,255,0.05)]"
                    )}
                  >
                    <td className="px-3 py-2.5 text-muted-foreground">{item.index}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        <Video className="h-3.5 w-3.5 shrink-0 text-cyber-cyan/70" />
                        <span className="truncate text-foreground/90">
                          {item.originalFilename}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-cyan-200/80">
                      {item.newFilename}
                    </td>
                    <td className="px-3 py-2.5 text-foreground/80">{item.size}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-foreground/80">
                      {item.duration}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={variant}>
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5",
                            item.status === "processing" && "animate-spin",
                            item.status === "uploading" && "animate-pulse-glow"
                          )}
                        />
                        {label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
