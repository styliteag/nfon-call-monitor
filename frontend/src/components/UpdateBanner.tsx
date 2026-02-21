export function UpdateBanner() {
  return (
    <div className="bg-indigo-600 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-3">
      <span>Eine neue Version ist verfügbar.</span>
      <button
        onClick={() => window.location.reload()}
        className="bg-white text-indigo-600 px-3 py-0.5 rounded font-medium hover:bg-indigo-50 transition-colors"
      >
        Jetzt aktualisieren
      </button>
    </div>
  );
}
