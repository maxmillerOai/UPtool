import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ImageHostOption } from "@/types";

export interface ImageHostSelectProps {
  value: string;
  options: ImageHostOption[];
  thumbnailSize: string;
  onChange: (value: string) => void;
}

export function ImageHostSelect({
  value,
  options,
  thumbnailSize,
  onChange,
}: ImageHostSelectProps) {
  return (
    <Card className="p-4">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-cyber-cyan">
        Image Host
      </label>
      <div className="flex items-center gap-3">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select image host" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="shrink-0 text-sm text-muted-foreground">
          Thumbnails: <span className="text-cyan-200/90">{thumbnailSize}</span>
        </span>
      </div>
    </Card>
  );
}
