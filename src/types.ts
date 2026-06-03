export type QueueStatus = "done" | "processing" | "uploading" | "waiting";

export interface VideoQueueItem {
  id: string;
  index: number;
  originalFilename: string;
  newFilename: string;
  size: string;
  duration: string;
  status: QueueStatus;
  /** Full preview post body, shown when the row is selected. */
  preview?: PostPreviewData;
}

export interface PostPreviewData {
  title: string;
  date: string;
  imageTag: string;
  mediaLine: string;
  downloadLinks: string[];
}

export type ProgressState = "done" | "uploading" | "waiting";

export interface ProgressTask {
  id: string;
  /** Lucide icon name resolved in the component, or a short host badge label. */
  icon: ProgressIcon;
  /** Optional 2-letter host label rendered as a badge instead of an icon. */
  badge?: string;
  title: string;
  subtitle?: string;
  percent: number;
  state: ProgressState;
}

export type ProgressIcon =
  | "prepare"
  | "mediainfo"
  | "thumbnail"
  | "imagehost"
  | "cloud";

export interface FileHost {
  id: string;
  code: string;
  name: string;
  selected: boolean;
}

export interface ImageHostOption {
  value: string;
  label: string;
}
