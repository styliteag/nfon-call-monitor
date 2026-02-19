import { useState, useEffect } from "react";
import { Layout } from "./Layout";
import { ActiveCallBanner } from "./ActiveCallBanner";
import { ExtensionCards } from "./ExtensionCards";
import { Filters } from "./Filters";
import { CallHistoryTable } from "./CallHistoryTable";
import { useCalls } from "../hooks/useCalls";
import { useExtensions } from "../hooks/useExtensions";
import { fetchConfig, type KopfnummerEntry } from "../lib/api";

interface Props {
  appTitle: string;
  dark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
}

export function Dashboard({ appTitle, dark, onToggleDark, onLogout }: Props) {
  const {
    calls,
    activeCalls,
    total,
    page,
    setPage,
    filters,
    updateFilters,
    loading,
    isConnected,
    nfonConnected,
  } = useCalls();

  const { extensions } = useExtensions();

  const [kopfnummern, setKopfnummern] = useState<string[]>([]);
  const [kopfnummernMap, setKopfnummernMap] = useState<KopfnummerEntry[]>([]);
  useEffect(() => {
    fetchConfig().then((c) => {
      setKopfnummern(c.kopfnummern);
      setKopfnummernMap(c.kopfnummernMap || []);
    }).catch(() => {});
  }, []);

  return (
    <Layout appTitle={appTitle} isConnected={isConnected} nfonConnected={nfonConnected} dark={dark} onToggleDark={onToggleDark} onLogout={onLogout}>
      <ActiveCallBanner calls={activeCalls} kopfnummern={kopfnummern} kopfnummernMap={kopfnummernMap} />
      <ExtensionCards extensions={extensions} />
      <Filters filters={filters} extensions={extensions} onFilterChange={updateFilters} />
      <CallHistoryTable
        calls={calls}
        total={total}
        page={page}
        loading={loading}
        onPageChange={setPage}
        kopfnummern={kopfnummern}
        kopfnummernMap={kopfnummernMap}
      />
    </Layout>
  );
}
