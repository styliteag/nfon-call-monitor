import { Router } from "express";
import { apiPost, apiDelete } from "../api.js";
import * as log from "../log.js";

const router = Router();

function getKAccount(): string {
  const username = process.env.CTI_API_USERNAME || "";
  if (!username) throw new Error("CTI_API_USERNAME ist nicht gesetzt");
  // Username may be just the K-Account (e.g. "KCR53") or "KCR53/user" format
  const slash = username.indexOf("/");
  const kAccount = slash > 0 ? username.substring(0, slash) : username;
  log.debug("Click-to-Dial", `K-Account: ${kAccount} (aus Username: ${username})`);
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

  log.debug("Click-to-Dial", `POST: ext=${extension} target=${target}`);

  if (!extension || !target) {
    return res.status(400).json({ error: "extension und target sind erforderlich" });
  }

  try {
    const kAccount = getKAccount();
    // Bereinigen: Leerzeichen, Bindestriche, Klammern, Schrägstriche entfernen
    const cleaned = target.replace(/[\s\-()\/]/g, "");
    log.debug("Click-to-Dial", `Bereinigt: ${JSON.stringify(target)} → ${JSON.stringify(cleaned)}`);

    // Nur Ziffern und optional führendes + erlaubt
    if (!/^\+?\d+$/.test(cleaned)) {
      log.warn("Click-to-Dial", `Ungültige Rufnummer: ${JSON.stringify(target)} → ${JSON.stringify(cleaned)}`);
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

    log.debug("Click-to-Dial", `NFON Request: ${JSON.stringify(payload)}`);

    const result = await apiPost<NfonCallResponse>("/v1/extensions/phone/calls", payload);

    log.debug("Click-to-Dial", `NFON Response: ${JSON.stringify(result)}`);

    res.status(202).json(result);
  } catch (err: any) {
    log.error("Click-to-Dial", `Anruf fehlgeschlagen: ${err.message}`);
    log.debug("Click-to-Dial", "Stack:", err.stack || err);
    res.status(502).json({ error: err.message });
  }
});

router.delete("/:uuid", async (req, res) => {
  log.debug("Click-to-Dial", `DELETE: ${req.params.uuid}`);
  try {
    await apiDelete(`/v1/extensions/phone/calls/${req.params.uuid}`);
    log.debug("Click-to-Dial", `Abbruch erfolgreich: ${req.params.uuid}`);
    res.status(204).end();
  } catch (err: any) {
    log.error("Click-to-Dial", `Abbruch fehlgeschlagen: ${err.message}`);
    log.debug("Click-to-Dial", "Stack:", err.stack || err);
    res.status(502).json({ error: err.message });
  }
});

export default router;
