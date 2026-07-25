// Proxy Anthropic + limiti d'uso verificati SERVER-SIDE.
// "nutrition" e "scan": solo premium, con limite settimanale alto + crediti extra.
// "import" (conversione scheda PT): libero ma con limite settimanale medio per i
// non abbonati, alto per gli abbonati; oltre il limite si consumano crediti extra.
import { getUserFromToken, isPremium, consumeUsage } from "./_premium.js";

/* Tutte e tre sono funzioni premium: i non abbonati hanno 1 prova a settimana
   ciascuna, poi il limite li porta allo store (abbonamento o crediti). */
const LIMITED = ["import", "nutrition", "scan"];

export default async function handler(req, res) {
  // TUTTO dentro try/catch: un errore nei controlli non deve mai produrre
  // una risposta HTML/testo (il client non saprebbe cosa mostrare).
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (!process.env.ANTHROPIC_API_KEY)
      return res.status(500).json({ error: "ANTHROPIC_API_KEY non configurata su Vercel" });

    const feature = req.headers["x-gq-feature"] || "";
    if (LIMITED.includes(feature)) {
      const jwt = (req.headers.authorization || "").replace("Bearer ", "");
      const user = await getUserFromToken(jwt);
      if (!user) return res.status(401).json({ error: "Non autenticato" });
      const prem = await isPremium(user.id);
      const use = await consumeUsage(user.id, feature, prem);
      if (!use.allowed) return res.status(429).json({ error: use.reason });
    }

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    // errore dell'API Anthropic (es. modello inesistente): messaggio leggibile
    if (data && data.error)
      return res.status(r.status).json({ error: data.error.message || String(data.error.type || "Errore API") });
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Errore interno" });
  }
}
