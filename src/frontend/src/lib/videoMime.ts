/**
 * Utility for selecting the most compatible MediaRecorder mimeType
 * and detecting mobile browser compatibility issues.
 */

/**
 * Probe MediaRecorder.isTypeSupported and return the most compatible mimeType.
 * Prefers MP4/H.264/AAC when supported; falls back to WebM.
 */
export function selectVideoMimeType(): string {
  // Preferred MP4 options (best mobile compatibility)
  const mp4Options = [
    "video/mp4;codecs=h264,aac",
    "video/mp4;codecs=avc1,mp4a",
    "video/mp4",
  ];

  // Fallback WebM options
  const webmOptions = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  // Try MP4 first
  for (const mimeType of mp4Options) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(mimeType)
    ) {
      return mimeType;
    }
  }

  // Fall back to WebM
  for (const mimeType of webmOptions) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(mimeType)
    ) {
      return mimeType;
    }
  }

  // Last resort fallback
  return "video/webm;codecs=vp8,opus";
}

/**
 * Check if the current browser is likely iOS Safari or in-app browser.
 */
export function isLikelyIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

/**
 * Check if the selected mimeType is WebM and the device is likely to have playback issues.
 */
export function shouldWarnWebMCompatibility(mimeType: string): boolean {
  return mimeType.includes("webm") && isLikelyIOS();
}
