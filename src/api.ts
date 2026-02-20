import { getAccessToken, getBaseUrl } from "./auth.js";

export async function apiGet(path: string, accept = "application/json"): Promise<Response> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${getAccessToken()}`,
      "Accept": accept,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API GET ${path} fehlgeschlagen (${res.status}): ${body}`);
  }

  return res;
}

export async function apiGetJson<T = unknown>(path: string): Promise<T> {
  const res = await apiGet(path);
  return res.json() as Promise<T>;
}

const apiDebug = () => (process.env.LOG || "").toLowerCase() === "debug";

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  if (apiDebug()) console.log(`[API] POST ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (apiDebug()) console.error(`[API] POST ${path} → ${res.status}:`, text);
    throw new Error(`API POST ${path} fehlgeschlagen (${res.status}): ${text}`);
  }

  const data = await res.json() as T;
  if (apiDebug()) console.log(`[API] POST ${path} → ${res.status}:`, JSON.stringify(data));
  return data;
}

export async function apiDelete(path: string): Promise<void> {
  const url = `${getBaseUrl()}${path}`;
  if (apiDebug()) console.log(`[API] DELETE ${url}`);

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${getAccessToken()}`,
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    if (apiDebug()) console.error(`[API] DELETE ${path} → ${res.status}:`, text);
    throw new Error(`API DELETE ${path} fehlgeschlagen (${res.status}): ${text}`);
  }

  if (apiDebug()) console.log(`[API] DELETE ${path} → ${res.status}`);
}

export interface Extension {
  uuid: string;
  extension_number: string;
  name: string;
}

export interface LineState {
  customer: string;
  extension: string;
  line: string;
  presence: string;
  updated: string;
}

export async function getExtensions(): Promise<Extension[]> {
  return apiGetJson<Extension[]>("/v1/extensions/phone/data");
}

export async function getLineStates(): Promise<LineState[]> {
  return apiGetJson<LineState[]>("/v1/extensions/phone/states");
}

export async function getCallEventStream(): Promise<Response> {
  return apiGet("/v1/extensions/phone/calls", "text/event-stream");
}
