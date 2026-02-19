import { login, startAutoRefresh, stopAutoRefresh } from "./auth.js";
import { getExtensions, getLineStates, getCallEventStream } from "./api.js";

async function showExtensions() {
  console.log("\n=== Konfigurierte Extensions ===");
  try {
    const extensions = await getExtensions();
    for (const ext of extensions) {
      console.log(`  ${ext.extension_number}\t${ext.name}`);
    }
    console.log(`\n  Gesamt: ${extensions.length} Extensions\n`);
  } catch (err) {
    console.error("  Fehler beim Abrufen der Extensions:", err);
  }
}

async function showLineStates() {
  console.log("=== Aktuelle Line-Status ===");
  try {
    const states = await getLineStates();
    for (const s of states) {
      const icon = s.presence === "online" ? "+" : "-";
      console.log(`  [${icon}] ${s.extension}\tLine: ${s.line}\tPresence: ${s.presence}`);
    }
    console.log();
  } catch (err) {
    console.error("  Fehler beim Abrufen der Line-Status:", err);
  }
}

async function streamCallEvents() {
  console.log("=== Call-Event Stream ===");
  console.log("Warte auf eingehende/ausgehende Anrufe... (Ctrl+C zum Beenden)\n");

  const res = await getCallEventStream();

  if (!res.body) {
    console.error("Kein Response-Body. Streaming nicht unterstützt.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log("[Stream] Verbindung geschlossen.");
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === ":") continue;

      // SSE format: "data: {...}" or "event: ..."
      if (trimmed.startsWith("event:")) {
        continue; // Event-Type, wird mit nächster data-Zeile verarbeitet
      }

      const jsonStr = trimmed.startsWith("data:")
        ? trimmed.slice(5).trim()
        : trimmed;

      try {
        const event = JSON.parse(jsonStr);
        const time = new Date().toLocaleTimeString("de-DE");
        console.log(`[${time}] ${JSON.stringify(event, null, 2)}`);
      } catch {
        console.log(`[Raw] ${trimmed}`);
      }
    }
  }
}

async function main() {
  console.log("NFON CTI API - Call Monitor");
  console.log("===========================\n");

  try {
    await login();
    startAutoRefresh();
    await showExtensions();
    await showLineStates();
    await streamCallEvents();
  } catch (err) {
    console.error("\nFehler:", err);
  } finally {
    stopAutoRefresh();
    process.exit(0);
  }
}

process.on("SIGINT", () => {
  console.log("\n\nMonitor wird beendet...");
  stopAutoRefresh();
  process.exit(0);
});

main();
