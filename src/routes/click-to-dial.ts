import { Router } from "express";
import { apiPost, apiDelete } from "../api.js";

const router = Router();
const debug = () => (process.env.LOG || "").toLowerCase() === "debug";

function getKAccount(): string {
  const username = process.env.CTI_API_USERNAME || "";
  if (!username) throw new Error("CTI_API_USERNAME ist nicht gesetzt");
  // Username may be just the K-Account (e.g. "KCR53") or "KCR53/user" format
  const slash = username.indexOf("/");
  const kAccount = slash > 0 ? username.substring(0, slash) : username;
  if (debug()) console.log("[Click-to-Dial] K-Account:", kAccount, "(aus Username:", username, ")");
  return kAccount;
}

interface InitiateCallBody {
  extension: string;
  target: string;
}

interface NfonCallResponse {
  uuid: string;
  state: string;
}

router.post("/", async (req, res) => {
  const { extension, target } = req.body as InitiateCallBody;

  if (debug()) console.log("[Click-to-Dial] POST erhalten:", { extension, target });

  if (!extension || !target) {
    return res.status(400).json({ error: "extension und target sind erforderlich" });
  }

  try {
    const kAccount = getKAccount();
    // Bereinigen: Leerzeichen, Bindestriche, Klammern, Schrägstriche entfernen
    const cleaned = target.replace(/[\s\-()\/]/g, "");
    if (debug()) console.log("[Click-to-Dial] Bereinigt:", JSON.stringify(target), "→", JSON.stringify(cleaned));

    // Nur Ziffern und optional führendes + erlaubt
    if (!/^\+?\d+$/.test(cleaned)) {
      console.warn("[Click-to-Dial] Ungültige Rufnummer:", JSON.stringify(target), "→", JSON.stringify(cleaned));
      return res.status(400).json({ error: `Ungültige Rufnummer: ${target}` });
    }
    // 0170xxx → 49170xxx, +49170xxx → 49170xxx
    const callee = cleaned.replace(/^\+/, "").replace(/^0/, "49");

    const payload = {
      caller: extension,
      caller_context: kAccount,
      callee,
      callee_context: "global",
      extension: extension,
    };

    if (debug()) console.log("[Click-to-Dial] NFON Request:", JSON.stringify(payload, null, 2));

    const result = await apiPost<NfonCallResponse>("/v1/extensions/phone/calls", payload);

    if (debug()) console.log("[Click-to-Dial] NFON Response:", JSON.stringify(result));

    res.status(202).json(result);
  } catch (err: any) {
    console.error("[Click-to-Dial] Anruf fehlgeschlagen:", err.message);
    if (debug()) console.error("[Click-to-Dial] Fehler-Details:", err.stack || err);
    res.status(502).json({ error: err.message });
  }
});

router.delete("/:uuid", async (req, res) => {
  if (debug()) console.log("[Click-to-Dial] DELETE:", req.params.uuid);
  try {
    await apiDelete(`/v1/extensions/phone/calls/${req.params.uuid}`);
    if (debug()) console.log("[Click-to-Dial] Abbruch erfolgreich:", req.params.uuid);
    res.status(204).end();
  } catch (err: any) {
    console.error("[Click-to-Dial] Abbruch fehlgeschlagen:", err.message);
    if (debug()) console.error("[Click-to-Dial] Fehler-Details:", err.stack || err);
    res.status(502).json({ error: err.message });
  }
});

export default router;
