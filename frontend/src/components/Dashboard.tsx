import { useState, useEffect, useMemo } from "react";
import { Layout } from "./Layout";
import { ActiveCallBanner } from "./ActiveCallBanner";
import { ExtensionCards } from "./ExtensionCards";
import { Filters } from "./Filters";
import { CallHistoryTable } from "./CallHistoryTable";
import { useCalls } from "../hooks/useCalls";
import { useExtensions } from "../hooks/useExtensions";
import { usePfContacts } from "../hooks/usePfContacts";
import { useNotifications } from "../hooks/useNotifications";
import { useMyExtension } from "../hooks/useMyExtension";
import { useUserStatus } from "../hooks/useUserStatus";
import { fetchConfig, type KopfnummerEntry } from "../lib/api";
import type { LayoutMode } from "../hooks/useLayout";

interface Props {
  appTitle: string;
  dark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  layout: LayoutMode;
  onToggleLayout: () => void;
}

export function Dashboard({ appTitle, dark, onToggleDark, onLogout, layout, onToggleLayout }: Props) {
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

  const allPhoneNumbers = useMemo(() => {
    const nums = new Set<string>();
    for (const c of calls) {
      if (c.caller) nums.add(c.caller);
      if (c.callee) nums.add(c.callee);
    }
    for (const c of activeCalls) {
      if (c.caller) nums.add(c.caller);
      if (c.callee) nums.add(c.callee);
    }
    for (const e of extensions) {
      if (e.currentCaller) nums.add(e.currentCaller);
      if (e.currentCallee) nums.add(e.currentCallee);
    }
    return Array.from(nums);
  }, [calls, activeCalls, extensions]);

  const pfContacts = usePfContacts(allPhoneNumbers);
  const { myExtension, select: selectMyExtension } = useMyExtension();
  const userStatus = useUserStatus(myExtension, extensions);
  const notifications = useNotifications(myExtension);

  const [kopfnummern, setKopfnummern] = useState<string[]>([]);
  const [kopfnummernMap, setKopfnummernMap] = useState<KopfnummerEntry[]>([]);
  const [specialNumbers, setSpecialNumbers] = useState<Record<string, string>>({});
  const [pfActive, setPfActive] = useState(false);
  useEffect(() => {
    fetchConfig().then((c) => {
      setKopfnummern(c.kopfnummern);
      setKopfnummernMap(c.kopfnummernMap || []);
      setSpecialNumbers(c.specialNumbers || {});
      setPfActive(c.pfActive ?? false);
    }).catch(() => {});
  }, []);

  return (
    <Layout appTitle={appTitle} isConnected={isConnected} nfonConnected={nfonConnected} dark={dark} onToggleDark={onToggleDark} onLogout={onLogout} notifications={notifications} myExtension={{ value: myExtension, select: selectMyExtension }} extensions={extensions} userStatus={userStatus} pfActive={pfActive} layout={layout} onToggleLayout={onToggleLayout}>
      {layout === "split" ? (
        <div className="flex-1 hidden lg:flex flex-row overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Filters filters={filters} extensions={extensions} onFilterChange={updateFilters} total={total} page={page} pageSize={filters.pageSize ?? 20} onPageChange={setPage} onPageSizeChange={(size) => updateFilters({ pageSize: size })} />
            <CallHistoryTable
              calls={calls}
              loading={loading}
              kopfnummern={kopfnummern}
              kopfnummernMap={kopfnummernMap}
              pfContacts={pfContacts}
              extensions={extensions}
              specialNumbers={specialNumbers}
            />
          </div>
          <div className="w-80 xl:w-96 border-l border-gray-200 dark:border-gray-700 shrink-0 overflow-y-auto">
            <ExtensionCards extensions={extensions} pfContacts={pfContacts} variant="compact" />
          </div>
        </div>
      ) : null}
      {/* Stacked layout (also shown on small screens when split is selected) */}
      <ActiveCallBanner calls={activeCalls} kopfnummern={kopfnummern} kopfnummernMap={kopfnummernMap} pfContacts={pfContacts} />
      <div className={layout === "split" ? "flex-1 flex flex-col overflow-hidden lg:hidden" : "flex-1 flex flex-col overflow-hidden"}>
        <ExtensionCards extensions={extensions} pfContacts={pfContacts} />
        <Filters filters={filters} extensions={extensions} onFilterChange={updateFilters} total={total} page={page} pageSize={filters.pageSize ?? 20} onPageChange={setPage} onPageSizeChange={(size) => updateFilters({ pageSize: size })} />
        <CallHistoryTable
          calls={calls}
          loading={loading}
          kopfnummern={kopfnummern}
          kopfnummernMap={kopfnummernMap}
          pfContacts={pfContacts}
          extensions={extensions}
          specialNumbers={specialNumbers}
        />
      </div>
    </Layout>
  );
}
