import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PostPreviewData } from "@/types";

export interface PostPreviewProps {
  data: PostPreviewData | null;
}

interface PreviewLine {
  text: string;
  kind: "title" | "date" | "tag" | "media" | "link" | "blank";
}

function buildLines(data: PostPreviewData): PreviewLine[] {
  return [
    { text: data.title, kind: "title" },
    { text: data.date, kind: "date" },
    { text: "", kind: "blank" },
    { text: data.imageTag, kind: "tag" },
    { text: "", kind: "blank" },
    { text: data.mediaLine, kind: "media" },
    { text: "", kind: "blank" },
    ...data.downloadLinks.map<PreviewLine>((link) => ({ text: link, kind: "link" })),
  ];
}

function plainText(lines: PreviewLine[]): string {
  return lines.map((l) => l.text).join("\n");
}

const kindClass: Record<PreviewLine["kind"], string> = {
  title: "text-cyan-200 font-semibold",
  date: "text-amber-400/90",
  tag: "text-emerald-300/90",
  media: "text-foreground/80",
  link: "text-cyber-cyan",
  blank: "",
};

export function PostPreview({ data }: PostPreviewProps) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => (data ? buildLines(data) : []), [data]);

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(plainText(lines));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Card>
      <CardHeader className="justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Post Preview</CardTitle>
          <span className="text-xs font-normal normal-case tracking-normal text-muted-foreground">
            (click a file in the queue to preview its post)
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy} disabled={!data}>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </CardHeader>
      <div className="px-5 pb-5">
        <div className="scrollbar-thin max-h-72 overflow-auto rounded-md border border-[rgba(0,191,255,0.12)] bg-[rgba(2,8,23,0.7)]">
          {data ? (
            <pre className="min-w-full font-mono text-[13px] leading-6">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="flex hover:bg-[rgba(0,191,255,0.04)]"
                >
                  <span className="sticky left-0 w-10 shrink-0 select-none border-r border-[rgba(0,191,255,0.12)] bg-[rgba(2,8,23,0.9)] px-2 text-right text-muted-foreground/60">
                    {i + 1}
                  </span>
                  <code className={cn("whitespace-pre px-3", kindClass[line.kind])}>
                    {line.text || " "}
                  </code>
                </div>
              ))}
            </pre>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Select a file from the queue to preview its post.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
