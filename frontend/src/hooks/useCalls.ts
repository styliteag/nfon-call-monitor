import { useState, useEffect, useCallback } from "react";
import type { Call, CallsQuery } from "../../../shared/types";
import { fetchCalls } from "../lib/api";
import { useSocket } from "./useSocket";

// Sort calls by startTime descending (newest first) — returns a new array
function sortByTime(calls: Call[]): Call[] {
  return [...calls].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

export function useCalls() {
  const { on, isConnected, nfonConnected } = useSocket();
  const [calls, setCalls] = useState<Call[]>([]);
  const [activeCalls, setActiveCalls] = useState<Call[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<CallsQuery>({});
  const [loading, setLoading] = useState(true);

  const loadCalls = useCallback(async (query?: CallsQuery) => {
    setLoading(true);
    try {
      const q = query ?? { ...filters, page };
      const result = await fetchCalls(q);
      setCalls(result.calls);
      setTotal(result.total);
    } catch (err) {
      console.error("Fehler beim Laden der Calls:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  // Initial load + reload on filter/page change
  useEffect(() => {
    loadCalls({ ...filters, page });
  }, [filters, page, loadCalls]);

  // Socket.IO events. The server emits aggregated Call objects (one per
  // call.id) for both call:new and call:updated.
  useEffect(() => {
    const offNew = on("call:new", (call: unknown) => {
      const c = call as Call;
      if (c.status === "ringing" || c.status === "active") {
        setActiveCalls((prev) => [...prev.filter((p) => p.id !== c.id), c]);
      }
      if (page === 1) {
        let isNewCallId = false;
        setCalls((prev) => {
          isNewCallId = !prev.some((p) => p.id === c.id);
          const without = prev.filter((p) => p.id !== c.id);
          return sortByTime([c, ...without]).slice(0, filters.pageSize ?? 20);
        });
        if (isNewCallId) setTotal((t) => t + 1);
      }
    });

    const offUpdated = on("call:updated", (call: unknown) => {
      const c = call as Call;
      if (c.status === "ringing" || c.status === "active") {
        setActiveCalls((prev) => [...prev.filter((p) => p.id !== c.id), c]);
      } else {
        setActiveCalls((prev) => prev.filter((p) => p.id !== c.id));
      }
      setCalls((prev) => prev.map((existing) => (existing.id === c.id ? c : existing)));
    });

    const offActive = on("active-calls", (calls: unknown) => {
      setActiveCalls(sortByTime(calls as Call[]));
    });

    return () => {
      offNew();
      offUpdated();
      offActive();
    };
  }, [on, page, filters.pageSize]);

  const updateFilters = useCallback((newFilters: Partial<CallsQuery>) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  return {
    calls,
    activeCalls,
    total,
    page,
    setPage,
    filters,
    updateFilters,
    loading,
    reload: loadCalls,
    isConnected,
    nfonConnected,
  };
}
