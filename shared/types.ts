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

export type CallStatus = "ringing" | "active" | "answered" | "missed" | "busy" | "rejected" | "system";

// One leg of a call: a single ringing/answered extension. Stored 1:1 in
// SQLite. The DB primary key is (id, extension) — a call may have multiple
// legs when several extensions ring (hunt-group, *0 / Zentrale).
export interface CallLeg {
  id: string;           // NFON call UUID — shared by all legs of a call
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
  transferredFrom?: string;      // extension number that transferred the call
  transferredFromName?: string;   // name of that extension
  originalCaller?: string;        // original external caller (set on transfer legs)
}

// Backwards-compat alias for the leg-level DB record.
export type CallRecord = CallLeg;

// Aggregated call across all its legs. This is what API endpoints return
// and what the UI renders. Status/duration/answerTime are derived from the
// answering leg (if any) or the most relevant leg.
export interface Call {
  id: string;
  caller: string;
  callee: string;
  direction: "inbound" | "outbound";
  startTime: string;        // earliest leg startTime
  answerTime?: string;      // from answering leg
  endTime?: string;         // latest leg endTime
  duration?: number;        // from answering leg
  status: CallStatus;       // aggregated across legs
  endReason?: string;       // from answering leg, else first leg
  transferredFrom?: string;
  transferredFromName?: string;
  transferredTo?: string;         // same-uuid transfer target extension (transferrer view)
  transferredToName?: string;
  originalCaller?: string;
  legs: CallLeg[];
  answeredBy?: string;      // extension number of leg that answered, if any
  answeredByName?: string;
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
  currentCallPartnerExt?: string;   // extension number of call partner (internal calls)
  currentCallPartnerName?: string;  // name of call partner (internal calls)
  lastStateChange?: string;       // ISO 8601 - from NFON states updated field
  agentLoggedIn?: boolean;         // tracked via *87/*87 SSE events
  userStatus?: string;             // "online" | "offline" | "mittagspause" | "homeoffice" | "office"
  userMessage?: string;            // free text status message
  userStatusUpdated?: string;      // ISO 8601 - when status was last changed
}

export interface CallsResponse {
  calls: Call[];
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

export interface CrmContactResult {
  contactId: number;
  name: string;
  phones: { raw: string; formatted?: string; city?: string; label?: string }[];
}
