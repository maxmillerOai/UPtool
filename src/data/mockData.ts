import type {
  FileHost,
  ImageHostOption,
  PostPreviewData,
  ProgressTask,
  VideoQueueItem,
} from "@/types";

const inceptionPreview: PostPreviewData = {
  title: "Inception (2010) 1080p BluRay x264",
  date: "06/03/25",
  imageTag:
    "[URL=https://imagetwist.com/abc123xyz/060325_i9J0kL1M_thumb.jpg][IMG]https://img400.imagetwist.com/th/60193/abc123xyz.jpg[/IMG][/URL]",
  mediaLine: "mp4  -  2.10 GB  -  2 h 28 min 07 s  -  1920x1080",
  downloadLinks: [
    "[url]https://fileboom.me/file/abcd1234efgh[/url]",
    "[url]https://filejoker.net/ijk15678mnop[/url]",
    "[url]https://k2s.cc/file/qrst9012uvwx[/url]",
    "[url]https://rapidgator.net/file/yzab3456cdef[/url]",
  ],
};

export const videoQueue: VideoQueueItem[] = [
  {
    id: "v1",
    index: 1,
    originalFilename: "The.Matrix.1999.1080p.BluRay.x264.mkv",
    newFilename: "060325_a1B2c3D4.mp4",
    size: "1.64 GB",
    duration: "02:16:18",
    status: "done",
  },
  {
    id: "v2",
    index: 2,
    originalFilename: "Interstellar.2014.1080p.BluRay.x265.mkv",
    newFilename: "060325_e5F6g7H8.mp4",
    size: "2.45 GB",
    duration: "02:49:03",
    status: "processing",
  },
  {
    id: "v3",
    index: 3,
    originalFilename: "Inception.2010.1080p.BluRay.x264.mkv",
    newFilename: "060325_i9J0kL1M.mp4",
    size: "2.10 GB",
    duration: "02:28:07",
    status: "uploading",
    preview: inceptionPreview,
  },
  {
    id: "v4",
    index: 4,
    originalFilename: "The.Dark.Knight.2008.1080p.BluRay.x264.mkv",
    newFilename: "060325_n2O3p4Q5.mp4",
    size: "2.25 GB",
    duration: "02:32:13",
    status: "waiting",
  },
  {
    id: "v5",
    index: 5,
    originalFilename: "Gladiator.2000.1080p.BluRay.x264.mkv",
    newFilename: "060325_r6S7t8U9.mp4",
    size: "1.85 GB",
    duration: "02:34:56",
    status: "waiting",
  },
  {
    id: "v6",
    index: 6,
    originalFilename: "Avengers.Endgame.2019.1080p.BluRay.x265.mkv",
    newFilename: "060325_v0W1x2Y3.mp4",
    size: "3.12 GB",
    duration: "03:01:11",
    status: "waiting",
  },
];

export const queueTotals = {
  fileCount: 6,
  totalSize: "13.41 GB",
};

export const defaultTitle = "Inception (2010) 1080p BluRay x264";

export const imageHostOptions: ImageHostOption[] = [
  { value: "imagetwist", label: "imagetwist" },
  { value: "imagebam", label: "imagebam" },
  { value: "pixhost", label: "pixhost" },
  { value: "imgbox", label: "imgbox" },
];

export const thumbnailSize = "300x300";

export const fileHosts: FileHost[] = [
  { id: "k2s", code: "K2S", name: "Keep2Share", selected: true },
  { id: "fileboom", code: "FB", name: "FileBoom", selected: true },
  { id: "filejoker", code: "FJ", name: "FileJoker", selected: true },
  { id: "rapidgator", code: "RG", name: "Rapidgator", selected: true },
  { id: "imagetwist", code: "IT", name: "ImageTwist", selected: true },
  { id: "pixhost", code: "PX", name: "PixHost", selected: false },
];

export const progressTasks: ProgressTask[] = [
  { id: "prepare", icon: "prepare", title: "Prepare", percent: 100, state: "done" },
  { id: "mediainfo", icon: "mediainfo", title: "MediaInfo", percent: 100, state: "done" },
  { id: "thumbnail", icon: "thumbnail", title: "MTN thumbnail", percent: 100, state: "done" },
  {
    id: "imagehost",
    icon: "imagehost",
    title: "Image host",
    subtitle: "imagetwist",
    percent: 90,
    state: "uploading",
  },
  { id: "k2s", icon: "cloud", title: "Keep2Share", percent: 65, state: "uploading" },
  { id: "fileboom", icon: "cloud", badge: "FB", title: "FileBoom", percent: 50, state: "uploading" },
  { id: "filejoker", icon: "cloud", badge: "FJ", title: "FileJoker", percent: 40, state: "uploading" },
  { id: "rapidgator", icon: "cloud", badge: "RG", title: "Rapidgator", percent: 0, state: "waiting" },
];

export const overallProgress = {
  percent: 62,
  elapsed: "00:03:42",
  remaining: "00:02:18",
};

export const systemStatus = {
  ready: true,
  filesInQueue: 6,
  freeSpace: "1.28 TB",
};
