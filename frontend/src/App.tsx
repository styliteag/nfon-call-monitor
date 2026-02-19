import { Layout } from "./components/Layout";
import { ActiveCallBanner } from "./components/ActiveCallBanner";
import { ExtensionCards } from "./components/ExtensionCards";
import { Filters } from "./components/Filters";
import { CallHistoryTable } from "./components/CallHistoryTable";
import { useCalls } from "./hooks/useCalls";
import { useExtensions } from "./hooks/useExtensions";

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

  return (
    <Layout isConnected={isConnected} nfonConnected={nfonConnected}>
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
