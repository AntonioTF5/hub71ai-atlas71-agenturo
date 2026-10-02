// A small in-memory, per-instance limiter. It won't stop a determined abuser across instances, but it
// keeps a runaway client or a casual script from burning the demo's AI budget. Server only.
const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** True when `key` is still under `limit` requests in the last `windowMs`; records this request. */
export function allow(key: string, limit: number, windowMs = 3_600_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return true;
}
