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
  presence: string;   // "available" | "offline"
  line: string;        // "idle" | "offline" | "busy" | "ringing"
  currentCallId?: string;
  currentCaller?: string;
  currentCallee?: string;
  currentCallDirection?: "inbound" | "outbound";
  currentCallStartTime?: string;  // ISO 8601
  currentCallStatus?: CallStatus;
  lastStateChange?: string;       // ISO 8601 - from NFON states updated field
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
  search?: string;
}

export interface PfContact {
  name: string;
  contactId: number;
  fuzzy?: number;      // number of digits removed for fuzzy match (1-3)
  city?: string;       // city name from area code lookup (fallback)
  formatted?: string;  // nicely formatted phone number e.g. "+49 6251 82755"
}
