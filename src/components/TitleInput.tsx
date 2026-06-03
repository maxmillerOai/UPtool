import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface TitleInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function TitleInput({ value, onChange }: TitleInputProps) {
  return (
    <Card className="p-4">
      <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyber-cyan">
        Title
        <span className="font-normal normal-case tracking-normal text-muted-foreground">
          (will be used as post title)
        </span>
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter post title…"
      />
    </Card>
  );
}
