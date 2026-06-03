import { useMemo, useState } from "react";
import { CircleDot } from "lucide-react";
import { TopToolbar } from "@/components/TopToolbar";
import { VideoQueueTable } from "@/components/VideoQueueTable";
import { QueueActions } from "@/components/QueueActions";
import { TitleInput } from "@/components/TitleInput";
import { ImageHostSelect } from "@/components/ImageHostSelect";
import { FileHostSelector } from "@/components/FileHostSelector";
import { PostPreview } from "@/components/PostPreview";
import { ProgressSidebar } from "@/components/ProgressSidebar";
import {
  defaultTitle,
  fileHosts as initialFileHosts,
  imageHostOptions,
  overallProgress,
  progressTasks,
  queueTotals,
  systemStatus,
  thumbnailSize,
  videoQueue,
} from "@/data/mockData";
import type { FileHost } from "@/types";

/**
 * NOTE: This dashboard currently renders mock data. Replace the local state
 * initializers and the handler stubs below with calls to the real backend
 * once the API layer is available (see the `// API:` markers).
 */
export interface DashboardProps {
  isLight: boolean;
  onToggleTheme: (light: boolean) => void;
}

export function Dashboard({ isLight, onToggleTheme }: DashboardProps) {
  const [selectedId, setSelectedId] = useState<string>("v3");
  const [title, setTitle] = useState<string>(defaultTitle);
  const [imageHost, setImageHost] = useState<string>("imagetwist");
  const [hosts, setHosts] = useState<FileHost[]>(initialFileHosts);

  const selectedItem = useMemo(
    () => videoQueue.find((v) => v.id === selectedId) ?? null,
    [selectedId]
  );

  const toggleHost = (id: string) =>
    setHosts((prev) =>
      prev.map((h) => (h.id === id ? { ...h, selected: !h.selected } : h))
    );

  // API: POST /api/posts/generate { title, imageHost, hosts, queue }
  const handleGenerate = () => {};
  // API: navigator.clipboard / GET /api/posts/:id
  const handleCopyPost = () => {};

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopToolbar
        isLight={isLight}
        onToggleTheme={onToggleTheme}
        onGenerate={handleGenerate}
        onCopy={handleCopyPost}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto p-4 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
        <main className="scrollbar-thin min-w-0 space-y-4 overflow-auto pr-1">
          <VideoQueueTable
            items={videoQueue}
            selectedId={selectedId}
            onSelect={setSelectedId}
            fileCount={queueTotals.fileCount}
          />

          <QueueActions
            fileCount={queueTotals.fileCount}
            totalSize={queueTotals.totalSize}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TitleInput value={title} onChange={setTitle} />
            <ImageHostSelect
              value={imageHost}
              options={imageHostOptions}
              thumbnailSize={thumbnailSize}
              onChange={setImageHost}
            />
          </div>

          <FileHostSelector hosts={hosts} onToggle={toggleHost} />

          <PostPreview data={selectedItem?.preview ?? null} />
        </main>

        <div className="min-h-0 lg:h-full">
          <ProgressSidebar tasks={progressTasks} overall={overallProgress} />
        </div>
      </div>

      <footer className="flex h-9 shrink-0 items-center justify-between border-t border-[rgba(0,191,255,0.14)] bg-[rgba(5,15,32,0.7)] px-5 text-xs text-muted-foreground backdrop-blur-md">
        <span className="flex items-center gap-1.5">
          <CircleDot className="h-3.5 w-3.5 text-emerald-400 animate-pulse-glow" />
          <span className="text-foreground/80">
            {systemStatus.ready ? "Ready." : "Working…"}
          </span>
        </span>
        <span className="flex items-center gap-4">
          <span>{systemStatus.filesInQueue} files in queue</span>
          <span className="text-[rgba(0,191,255,0.3)]">|</span>
          <span>
            Free space:{" "}
            <span className="text-cyan-200/90">{systemStatus.freeSpace}</span>
          </span>
        </span>
      </footer>
    </div>
  );
}

export default Dashboard;
