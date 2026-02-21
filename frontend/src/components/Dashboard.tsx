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
  useEffect(() => {
    fetchConfig().then((c) => {
      setKopfnummern(c.kopfnummern);
      setKopfnummernMap(c.kopfnummernMap || []);
      setSpecialNumbers(c.specialNumbers || {});
    }).catch(() => {});
  }, []);

  return (
    <Layout appTitle={appTitle} isConnected={isConnected} nfonConnected={nfonConnected} dark={dark} onToggleDark={onToggleDark} onLogout={onLogout} notifications={notifications} myExtension={{ value: myExtension, select: selectMyExtension }} extensions={extensions} userStatus={userStatus}>
      <ActiveCallBanner calls={activeCalls} kopfnummern={kopfnummern} kopfnummernMap={kopfnummernMap} pfContacts={pfContacts} />
      <ExtensionCards extensions={extensions} pfContacts={pfContacts} />
      <Filters filters={filters} extensions={extensions} onFilterChange={updateFilters} />
      <CallHistoryTable
        calls={calls}
        total={total}
        page={page}
        pageSize={filters.pageSize ?? 20}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={(size) => updateFilters({ pageSize: size })}
        kopfnummern={kopfnummern}
        kopfnummernMap={kopfnummernMap}
        pfContacts={pfContacts}
        extensions={extensions}
        specialNumbers={specialNumbers}
      />
    </Layout>
  );
}
