const UPSTREAM = "https://hhgoa.com";

export async function fetchUpstreamJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${UPSTREAM}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as T;
    return data ?? fallback;
  } catch {
    return fallback;
  }
}
