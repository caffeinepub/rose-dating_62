/**
 * Check if media content has expired (72 hours after creation)
 * @param timestamp - Message timestamp in nanoseconds
 * @returns true if media has expired, false otherwise
 */
export function isMediaExpired(timestamp: bigint): boolean {
  const SEVENTY_TWO_HOURS_IN_NS = 72n * 60n * 60n * 1_000_000_000n;
  const now = BigInt(Date.now()) * 1_000_000n; // Convert milliseconds to nanoseconds
  const expirationTime = timestamp + SEVENTY_TWO_HOURS_IN_NS;

  return now > expirationTime;
}

/**
 * Get remaining time until media expires
 * @param timestamp - Message timestamp in nanoseconds
 * @returns Remaining time in hours, or 0 if expired
 */
export function getRemainingHours(timestamp: bigint): number {
  const SEVENTY_TWO_HOURS_IN_NS = 72n * 60n * 60n * 1_000_000_000n;
  const now = BigInt(Date.now()) * 1_000_000n;
  const expirationTime = timestamp + SEVENTY_TWO_HOURS_IN_NS;

  if (now > expirationTime) {
    return 0;
  }

  const remainingNs = expirationTime - now;
  const remainingHours = Number(remainingNs / (60n * 60n * 1_000_000_000n));

  return Math.max(0, remainingHours);
}
