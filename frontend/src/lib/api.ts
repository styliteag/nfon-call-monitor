import type { CallsResponse, CallsQuery, ExtensionInfo } from "../../../shared/types";

const BASE = "/api";

export async function fetchCalls(query: CallsQuery = {}): Promise<CallsResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.extension) params.set("extension", query.extension);
  if (query.status) params.set("status", query.status);
  if (query.direction) params.set("direction", query.direction);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);

  const res = await fetch(`${BASE}/calls?${params}`);
  if (!res.ok) throw new Error(`Fehler: ${res.status}`);
  return res.json();
}

export async function fetchExtensions(): Promise<ExtensionInfo[]> {
  const res = await fetch(`${BASE}/extensions`);
  if (!res.ok) throw new Error(`Fehler: ${res.status}`);
  return res.json();
}
