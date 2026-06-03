import { FolderPlus, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface QueueActionsProps {
  fileCount: number;
  totalSize: string;
  onAddFiles?: () => void;
  onRemove?: () => void;
  onClear?: () => void;
}

export function QueueActions({
  fileCount,
  totalSize,
  onAddFiles,
  onRemove,
  onClear,
}: QueueActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <Button variant="outline" size="sm" onClick={onAddFiles}>
          <FolderPlus className="h-4 w-4 text-cyber-cyan/80" />
          Add Files
        </Button>
        <Button variant="danger" size="sm" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
          Remove
        </Button>
        <Button variant="outline" size="sm" onClick={onClear}>
          <XCircle className="h-4 w-4 text-cyber-cyan/80" />
          Clear List
        </Button>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-[rgba(0,191,255,0.15)] bg-[rgba(11,22,46,0.5)] px-3 py-1.5 text-sm">
        <span className="text-muted-foreground">Total: {fileCount} files</span>
        <span className="font-semibold text-cyber-cyan">{totalSize}</span>
      </div>
    </div>
  );
}
