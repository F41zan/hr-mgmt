/**
 * lib/apiClient.ts
 * Small fetch wrapper for client components: parses JSON and throws an Error
 * carrying the API's `error` message on non-2xx responses.
 */

export async function apiFetch<T = unknown>(
  url: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = (data as { details?: Record<string, string[]> }).details;
    const firstDetail = details ? Object.values(details).flat()[0] : undefined;
    throw new Error(firstDetail ?? (data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

/** Format a number as Indian Rupees. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateShort(iso: string | Date | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function formatDateTime(iso: string | Date | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}
