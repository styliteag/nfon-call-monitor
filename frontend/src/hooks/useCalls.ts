import { useState, useEffect, useCallback } from "react";
import type { CallRecord, CallsQuery } from "../../../shared/types";
import { fetchCalls } from "../lib/api";
import { useSocket } from "./useSocket";

export function useCalls() {
  const { on, isConnected, nfonConnected } = useSocket();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [activeCalls, setActiveCalls] = useState<CallRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<CallsQuery>({ pageSize: 50 });
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

  // Socket.IO events
  useEffect(() => {
    const offNew = on("call:new", (call: unknown) => {
      const c = call as CallRecord;
      if (c.status === "ringing" || c.status === "active") {
        setActiveCalls((prev) => [...prev.filter((p) => !(p.id === c.id && p.extension === c.extension)), c]);
      }
      // Add to top of calls list if on first page
      if (page === 1) {
        setCalls((prev) => [c, ...prev.slice(0, (filters.pageSize ?? 50) - 1)]);
        setTotal((t) => t + 1);
      }
    });

    const offUpdated = on("call:updated", (call: unknown) => {
      const c = call as CallRecord;
      if (c.status === "ringing" || c.status === "active") {
        setActiveCalls((prev) => [...prev.filter((p) => !(p.id === c.id && p.extension === c.extension)), c]);
      } else {
        setActiveCalls((prev) => prev.filter((p) => !(p.id === c.id && p.extension === c.extension)));
      }
      // Update in call list
      setCalls((prev) =>
        prev.map((existing) =>
          existing.id === c.id && existing.extension === c.extension ? c : existing
        )
      );
    });

    const offActive = on("active-calls", (calls: unknown) => {
      setActiveCalls(calls as CallRecord[]);
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
