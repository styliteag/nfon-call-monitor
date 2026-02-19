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
