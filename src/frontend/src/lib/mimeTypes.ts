/**
 * Shared MIME type utility for consistent media playback across the app.
 * Maps file URL extensions to correct MIME type strings for <source> elements.
 */

/**
 * Returns the MIME type for a given media URL based on its file extension.
 * Covers images, videos, and audio formats with sensible defaults.
 */
export function getMimeType(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  switch (ext) {
    // Video
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "ogg":
    case "ogv":
      return "video/ogg";
    case "mov":
      return "video/quicktime";
    case "avi":
      return "video/x-msvideo";
    case "mkv":
      return "video/x-matroska";
    // Audio
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "oga":
      return "audio/ogg";
    case "m4a":
      return "audio/mp4";
    case "aac":
      return "audio/aac";
    case "flac":
      return "audio/flac";
    // Image
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "svg":
      return "image/svg+xml";
    default:
      // If extension is ambiguous or missing, infer from path segments
      if (
        url.includes("/video/") ||
        url.includes("video") ||
        url.includes(".mp4") ||
        url.includes(".webm")
      ) {
        return "video/mp4";
      }
      if (
        url.includes("/audio/") ||
        url.includes("voice") ||
        url.includes("audio")
      ) {
        return "audio/mpeg";
      }
      return "video/mp4";
  }
}

/**
 * Returns the MIME type category: "video", "audio", or "image".
 */
export function getMimeCategory(url: string): "video" | "audio" | "image" {
  const mime = getMimeType(url);
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "image";
}
