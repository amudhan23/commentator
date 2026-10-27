import ffmpegStatic from "ffmpeg-static";

// Use the ffmpeg binary bundled by `ffmpeg-static` (installed via npm), so no
// one has to install ffmpeg system-wide or fight PATH — works the same on
// macOS, Linux, and Windows. Falls back to a PATH "ffmpeg" if the bundle is
// somehow unavailable.
export const FFMPEG: string = ffmpegStatic || "ffmpeg";
