import { Layout } from "./components/Layout";
import { ActiveCallBanner } from "./components/ActiveCallBanner";
import { ExtensionCards } from "./components/ExtensionCards";
import { Filters } from "./components/Filters";
import { CallHistoryTable } from "./components/CallHistoryTable";
import { useCalls } from "./hooks/useCalls";
import { useExtensions } from "./hooks/useExtensions";
import { useDarkMode } from "./hooks/useDarkMode";

export default function App() {
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
  const { dark, toggle } = useDarkMode();

  return (
    <Layout isConnected={isConnected} nfonConnected={nfonConnected} dark={dark} onToggleDark={toggle}>
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
