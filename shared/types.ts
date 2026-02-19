// Raw SSE event from NFON CTI API
export interface NfonCallEvent {
  uuid: string;
  caller: string;
  callee: string;
  state: string;
  direction: "inbound" | "outbound";
  extension: string;
  error?: string;
}

export type CallStatus = "ringing" | "active" | "answered" | "missed" | "busy" | "rejected";

// Aggregated call record (stored in SQLite)
export interface CallRecord {
  id: string;           // NFON call UUID
  caller: string;
  callee: string;
  extension: string;
  extensionName: string;
  direction: "inbound" | "outbound";
  startTime: string;    // ISO 8601
  answerTime?: string;  // ISO 8601
  endTime?: string;     // ISO 8601
  duration?: number;    // seconds (answer → end)
  status: CallStatus;
  endReason?: string;
}

export interface ExtensionInfo {
  uuid: string;
  extensionNumber: string;
  name: string;
  presence: string;
  currentCallId?: string;
}

export interface CallsResponse {
  calls: CallRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CallsQuery {
  page?: number;
  pageSize?: number;
  extension?: string;
  status?: string;
  direction?: string;
  dateFrom?: string;
  dateTo?: string;
}
