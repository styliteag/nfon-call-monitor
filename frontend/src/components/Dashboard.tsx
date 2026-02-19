import { Layout } from "./Layout";
import { ActiveCallBanner } from "./ActiveCallBanner";
import { ExtensionCards } from "./ExtensionCards";
import { Filters } from "./Filters";
import { CallHistoryTable } from "./CallHistoryTable";
import { useCalls } from "../hooks/useCalls";
import { useExtensions } from "../hooks/useExtensions";

interface Props {
  dark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
}

export function Dashboard({ dark, onToggleDark, onLogout }: Props) {
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

  return (
    <Layout isConnected={isConnected} nfonConnected={nfonConnected} dark={dark} onToggleDark={onToggleDark} onLogout={onLogout}>
      <ActiveCallBanner calls={activeCalls} />
      <ExtensionCards extensions={extensions} />
      <Filters filters={filters} extensions={extensions} onFilterChange={updateFilters} />
      <CallHistoryTable
        calls={calls}
        total={total}
        page={page}
        loading={loading}
        onPageChange={setPage}
      />
    </Layout>
  );
}
