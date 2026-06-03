import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  overallProgress as initialOverall,
  progressTasks as initialTasks,
  queueTotals,
  systemStatus,
  thumbnailSize,
  videoQueue,
} from "@/data/mockData";
import {
  getProgress,
  getSettings,
  processJob,
  processJobUpload,
  type AppSettings,
  type ProgressEvent,
} from "@/lib/api";
import { buildProgressTasks } from "@/lib/progress";
import type { FileHost, ProgressTask, QueueStatus, VideoQueueItem } from "@/types";

/** Maps a UI file-host id to the backend's file-host key. */
const BACKEND_FILE_HOST: Record<string, string> = {
  k2s: "keep2share",
  fileboom: "fileboom",
  filejoker: "filejoker",
  rapidgator: "rapidgator",
};

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

export interface DashboardProps {
  isLight: boolean;
  onToggleTheme: (light: boolean) => void;
}

export function Dashboard({ isLight, onToggleTheme }: DashboardProps) {
  const [queue, setQueue] = useState<VideoQueueItem[]>(videoQueue);
  const [selectedId, setSelectedId] = useState<string>("v3");
  const [title, setTitle] = useState<string>(defaultTitle);
  const [imageHost, setImageHost] = useState<string>("imagetwist");
  const [hosts, setHosts] = useState<FileHost[]>(initialFileHosts);

  // Backend-driven state (falls back to mock data when offline).
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [tasks, setTasks] = useState<ProgressTask[]>(initialTasks);
  const [overall, setOverall] = useState(initialOverall);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const selectedItem = useMemo(
    () => queue.find((v) => v.id === selectedId) ?? null,
    [queue, selectedId]
  );

  const selectedFileHostKeys = useMemo(
    () =>
      hosts
        .filter((h) => h.selected && BACKEND_FILE_HOST[h.id])
        .map((h) => BACKEND_FILE_HOST[h.id]),
    [hosts]
  );

  const totals = useMemo(() => {
    const uploaded = queue.filter((q) => q.file);
    if (uploaded.length === 0) {
      return { fileCount: queue.length, totalSize: queueTotals.totalSize };
    }
    const bytes = uploaded.reduce((sum, q) => sum + (q.file?.size ?? 0), 0);
    return { fileCount: queue.length, totalSize: formatBytes(bytes) };
  }, [queue]);

  // Probe the backend and hydrate saved settings (credentials, MTN config).
  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((res) => {
        if (cancelled) return;
        setSettings(res.settings ?? {});
        setBackendOnline(true);
      })
      .catch(() => {
        if (!cancelled) setBackendOnline(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stopTimers = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimers(), [stopTimers]);

  const setItemStatus = useCallback((id: string, status: QueueStatus, newFilename?: string) => {
    setQueue((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, status, newFilename: newFilename ?? q.newFilename } : q
      )
    );
  }, []);

  const applyEvents = useCallback(
    (events: ProgressEvent[]) => {
      const { tasks: next, overallPercent } = buildProgressTasks(
        events,
        imageHost,
        selectedFileHostKeys
      );
      setTasks(next);
      const elapsedSec = (Date.now() - startRef.current) / 1000;
      const remainingSec =
        overallPercent > 0 ? (elapsedSec / overallPercent) * (100 - overallPercent) : 0;
      setOverall({
        percent: overallPercent,
        elapsed: formatClock(elapsedSec),
        remaining: formatClock(remainingSec),
      });
    },
    [imageHost, selectedFileHostKeys]
  );

  const toggleHost = (id: string) =>
    setHosts((prev) =>
      prev.map((h) => (h.id === id ? { ...h, selected: !h.selected } : h))
    );

  const addFiles = useCallback((files: FileList) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;
    setQueue((prev) => {
      const base = prev.length;
      const next = incoming.map<VideoQueueItem>((file, i) => ({
        id: `up_${Date.now()}_${i}`,
        index: base + i + 1,
        originalFilename: file.name,
        newFilename: "—",
        size: formatBytes(file.size),
        duration: "—",
        status: "waiting",
        file,
      }));
      return [...prev, ...next];
    });
    setSelectedId((prev) => prev);
  }, []);

  const handleAddFiles = useCallback(() => fileInputRef.current?.click(), []);
  const handleRemove = useCallback(() => {
    setQueue((prev) => prev.filter((q) => q.id !== selectedId));
  }, [selectedId]);
  const handleClear = useCallback(() => {
    setQueue([]);
    setGeneratedPost(null);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setGeneratedPost(null);
    setJobError(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (isProcessing || !selectedItem) return;
    setJobError(null);
    setIsProcessing(true);
    setGeneratedPost(null);
    startRef.current = Date.now();
    stopTimers();
    setTasks(buildProgressTasks([], imageHost, selectedFileHostKeys).tasks);
    setItemStatus(selectedItem.id, "uploading");

    const jobId = `job_${Date.now()}`;
    pollRef.current = window.setInterval(async () => {
      try {
        const { progress } = await getProgress(jobId);
        applyEvents(progress);
      } catch {
        /* transient poll failure */
      }
    }, 350);
    timerRef.current = window.setInterval(() => {
      setOverall((o) => ({
        ...o,
        elapsed: formatClock((Date.now() - startRef.current) / 1000),
      }));
    }, 1000);

    try {
      const common = {
        title,
        imageHost,
        fileHosts: selectedFileHostKeys,
        credentials: settings?.credentials,
        jobId,
      };
      const res = selectedItem.file
        ? await processJobUpload({ video: selectedItem.file, ...common })
        : await processJob({ sourcePath: selectedItem.sourcePath ?? "", ...common });

      setBackendOnline(true);
      if (res.ok) {
        if (res.progress) applyEvents(res.progress);
        setGeneratedPost(res.post ?? "");
        const ext = selectedItem.originalFilename.match(/\.[^.]+$/)?.[0] ?? ".mp4";
        setItemStatus(selectedItem.id, "done", res.job ? `${res.job.id}${ext}` : undefined);
      } else {
        setJobError(res.error ?? "Job failed.");
        setItemStatus(selectedItem.id, "waiting");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // A 5xx with a message means the backend responded (online) but the job failed;
      // a network error means it is unreachable.
      if (/Failed to fetch|NetworkError|ECONNREFUSED/i.test(message)) {
        setBackendOnline(false);
        setJobError("Backend unreachable.");
      } else {
        setBackendOnline(true);
        setJobError(message);
      }
      setItemStatus(selectedItem.id, "waiting");
    } finally {
      stopTimers();
      setIsProcessing(false);
    }
  }, [
    applyEvents,
    imageHost,
    isProcessing,
    selectedFileHostKeys,
    selectedItem,
    setItemStatus,
    settings,
    stopTimers,
    title,
  ]);

  const handleCopyPost = useCallback(() => {
    const text =
      generatedPost ??
      (selectedItem?.preview
        ? [
            selectedItem.preview.title,
            selectedItem.preview.date,
            "",
            selectedItem.preview.imageTag,
            "",
            selectedItem.preview.mediaLine,
            "",
            ...selectedItem.preview.downloadLinks,
          ].join("\n")
        : "");
    if (text) navigator.clipboard.writeText(text).catch(() => undefined);
  }, [generatedPost, selectedItem]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <TopToolbar
        isLight={isLight}
        onToggleTheme={onToggleTheme}
        onGenerate={handleGenerate}
        onCopy={handleCopyPost}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto p-4 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
        <main className="scrollbar-thin min-w-0 space-y-4 overflow-auto pr-1">
          <VideoQueueTable
            items={queue}
            selectedId={selectedId}
            onSelect={handleSelect}
            fileCount={totals.fileCount}
          />

          <QueueActions
            fileCount={totals.fileCount}
            totalSize={totals.totalSize}
            onAddFiles={handleAddFiles}
            onRemove={handleRemove}
            onClear={handleClear}
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

          <PostPreview data={selectedItem?.preview ?? null} rawText={generatedPost} />
        </main>

        <div className="min-h-0 lg:h-full">
          <ProgressSidebar tasks={tasks} overall={overall} />
        </div>
      </div>

      <footer className="flex h-9 shrink-0 items-center justify-between border-t border-[rgba(0,191,255,0.14)] bg-[rgba(5,15,32,0.7)] px-5 text-xs text-muted-foreground backdrop-blur-md">
        <span className="flex items-center gap-1.5">
          <CircleDot
            className={
              isProcessing
                ? "h-3.5 w-3.5 text-cyber-orange animate-pulse-glow"
                : "h-3.5 w-3.5 text-emerald-400 animate-pulse-glow"
            }
          />
          <span className="text-foreground/80">
            {isProcessing ? "Processing…" : jobError ? "Error" : "Ready."}
          </span>
          {jobError ? (
            <span className="ml-2 max-w-[40ch] truncate text-red-400/90" title={jobError}>
              {jobError}
            </span>
          ) : (
            <span
              className={
                backendOnline
                  ? "ml-2 text-emerald-400/80"
                  : "ml-2 text-muted-foreground/70"
              }
            >
              {backendOnline ? "Backend connected" : "Backend offline (mock data)"}
            </span>
          )}
        </span>
        <span className="flex items-center gap-4">
          <span>{totals.fileCount} files in queue</span>
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
