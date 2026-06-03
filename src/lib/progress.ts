import type { ProgressEvent } from "@/lib/api";
import type { ProgressState, ProgressTask } from "@/types";

/** Backend file-host keys mapped to display metadata for the sidebar. */
const FILE_HOST_META: Record<
  string,
  { title: string; iconUrl: string; badge?: string }
> = {
  keep2share: { title: "Keep2Share", iconUrl: "/hosts/keep2share.png" },
  fileboom: { title: "FileBoom", iconUrl: "/hosts/fileboom.png", badge: "FB" },
  filejoker: { title: "FileJoker", iconUrl: "/hosts/filejoker.png", badge: "FJ" },
  rapidgator: { title: "Rapidgator", iconUrl: "/hosts/rapidgator.png", badge: "RG" },
};

const IMAGE_HOST_ICON: Record<string, string> = {
  imagetwist: "/hosts/imagetwist.png",
  pixhost: "/hosts/pixhost.png",
};

type RawStatus = "idle" | "running" | "done" | "error";
interface Accum {
  status: RawStatus;
  pct: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function normStatus(status?: string): RawStatus {
  if (status === "done") return "done";
  if (status === "error") return "error";
  return "running";
}

function toState(status: RawStatus): ProgressState {
  if (status === "done") return "done";
  if (status === "running") return "uploading";
  return "waiting";
}

/**
 * Folds the backend progress event stream into the sidebar's `ProgressTask[]`
 * and computes an overall percentage, mirroring the backend UI's logic.
 */
export function buildProgressTasks(
  events: ProgressEvent[],
  imageHost: string,
  fileHosts: string[]
): { tasks: ProgressTask[]; overallPercent: number } {
  const keys = ["prepare", "mediainfo", "thumbnail", "image", ...fileHosts];
  const acc: Record<string, Accum> = {};
  keys.forEach((k) => (acc[k] = { status: "idle", pct: 0 }));

  const stepKey: Record<string, string> = {
    prepared: "prepare",
    mediainfo: "mediainfo",
    thumbnail: "thumbnail",
  };

  for (const ev of events) {
    if (ev.type === "step") {
      const key = stepKey[ev.step];
      if (key && acc[key]) {
        acc[key] = {
          status: normStatus(ev.status),
          pct: ev.status === "done" ? 100 : clamp(ev.percent ?? 0),
        };
      }
    } else if (ev.type === "image") {
      acc.image = {
        status: normStatus(ev.status),
        pct: ev.status === "done" ? 100 : clamp(ev.percent ?? 0),
      };
    } else if (ev.type === "file" && acc[ev.host]) {
      acc[ev.host] = {
        status: normStatus(ev.status),
        pct: ev.status === "done" ? 100 : clamp(ev.percent ?? 0),
      };
    }
  }

  let total = 0;
  let sum = 0;
  for (const k of keys) {
    if (acc[k].status !== "idle") {
      total += 1;
      sum += acc[k].pct;
    }
  }
  const overallPercent = total > 0 ? clamp(sum / Math.max(total, 8)) : 0;

  const tasks: ProgressTask[] = [
    { id: "prepare", icon: "prepare", title: "Prepare", percent: acc.prepare.pct, state: toState(acc.prepare.status) },
    { id: "mediainfo", icon: "mediainfo", title: "MediaInfo", percent: acc.mediainfo.pct, state: toState(acc.mediainfo.status) },
    { id: "thumbnail", icon: "thumbnail", title: "MTN thumbnail", percent: acc.thumbnail.pct, state: toState(acc.thumbnail.status) },
    {
      id: "image",
      icon: "imagehost",
      title: "Image host",
      subtitle: imageHost,
      iconUrl: IMAGE_HOST_ICON[imageHost],
      percent: acc.image.pct,
      state: toState(acc.image.status),
    },
    ...fileHosts.map<ProgressTask>((host) => {
      const meta = FILE_HOST_META[host] ?? { title: host, iconUrl: undefined as unknown as string };
      return {
        id: host,
        icon: "cloud",
        title: meta.title,
        badge: meta.badge,
        iconUrl: meta.iconUrl,
        percent: acc[host].pct,
        state: toState(acc[host].status),
      };
    }),
  ];

  return { tasks, overallPercent };
}
