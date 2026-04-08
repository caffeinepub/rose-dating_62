/**
 * Utility for providing upload-time video format guidance.
 */

/**
 * Check if a video file is likely to be less compatible on mobile devices.
 * Returns a warning message if the format is not ideal, or null if it's fine.
 */
export function getVideoUploadWarning(file: File): string | null {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();

  // Check for less-compatible formats
  const incompatibleExtensions = [".webm", ".mkv", ".avi", ".wmv", ".flv"];
  const incompatibleMimeTypes = [
    "video/webm",
    "video/x-matroska",
    "video/x-msvideo",
    "video/x-ms-wmv",
    "video/x-flv",
  ];

  const hasIncompatibleExtension = incompatibleExtensions.some((ext) =>
    fileName.endsWith(ext),
  );
  const hasIncompatibleMimeType = incompatibleMimeTypes.some((mime) =>
    mimeType.includes(mime),
  );

  if (hasIncompatibleExtension || hasIncompatibleMimeType) {
    return "For best mobile playback, we recommend MP4 (H.264/AAC) format. Your video may not play on all devices.";
  }

  return null;
}
