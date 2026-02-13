/**
 * Generate a stable device fingerprint for device binding (max 64 chars).
 * Uses navigator and screen; hashed so it's not reversible.
 */
export async function getDeviceHash(): Promise<string> {
  if (typeof window === "undefined") return "";
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(navigator.hardwareConcurrency ?? ""),
    `${screen.width}x${screen.height}`,
    String((navigator as { deviceMemory?: number }).deviceMemory ?? ""),
    new Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].filter(Boolean);
  const str = parts.join("|");
  try {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    const hex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex.slice(0, 64);
  } catch {
    return str.slice(0, 64).replace(/[^a-zA-Z0-9_-]/g, "_");
  }
}
