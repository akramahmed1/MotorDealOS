// On Vercel the platform overwrites x-real-ip with the connecting client.
// x-forwarded-for can start with an address the caller invented, so the
// limiter must not use the leftmost value. The rightmost hop is the one
// the trusted proxy appended, and only as a fallback when x-real-ip is absent.

export function clientIpFromHeaders(headers: Headers): string {
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }

  return 'unknown';
}
