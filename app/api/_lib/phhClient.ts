import crypto from "node:crypto";

const VPS_URL = process.env.PHH_VPS_URL ?? "http://89.167.75.216:5077";
const SECRET = process.env.PHH_SHARED_SECRET ?? "";

export type ForwardResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; error: string };

/**
 * Tekent de rauwe JSON-body en POST't naar de VPS-backend.
 * Canonieke string (identiek aan Flask verify_hmac):
 *   METHOD + "\n" + PATH + "\n" + timestamp + "\n" + nonce + "\n" + sha256hex(rawBody)
 */
export async function forwardSigned(
  path: string,
  payload: Record<string, unknown>,
  timeoutMs = 10000
): Promise<ForwardResult> {
  if (!SECRET) {
    return { ok: false, status: 500, error: "server misconfigured" };
  }
  const raw = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const bodyHash = crypto.createHash("sha256").update(raw, "utf8").digest("hex");
  const canonical = ["POST", path, ts, nonce, bodyHash].join("\n");
  const sig = crypto.createHmac("sha256", SECRET).update(canonical, "utf8").digest("hex");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${VPS_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PHH-Timestamp": ts,
        "X-PHH-Nonce": nonce,
        "X-PHH-Signature": sig,
      },
      body: raw,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const error =
        (data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : null) ?? `upstream ${res.status}`;
      return { ok: false, status: res.status, error };
    }
    return { ok: true, status: res.status, data };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { ok: false, status: 504, error: aborted ? "upstream timeout" : "upstream unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

/** Client-IP uit Vercel-headers (eerste in x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  return xff.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
}

/** Leest JSON-body veilig met een max-grootte. */
export async function readJsonBody(
  req: Request,
  maxBytes = 16 * 1024
): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
