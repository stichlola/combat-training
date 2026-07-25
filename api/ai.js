// Proxy Anthropic + limiti d'uso verificati SERVER-SIDE.
// "nutrition" e "scan": solo premium, con limite settimanale alto + crediti extra.
// "import" (conversione scheda PT): libero ma con limite settimanale medio per i
// non abbonati, alto per gli abbonati; oltre il limite si consumano crediti extra.
import { getUserFromToken, isPremium, consumeUsage } from "./_premium.js";

const LIMITED = ["import", "nutrition", "scan"];
const PREMIUM_ONLY = ["nutrition", "scan"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({ error: "ANTHROPIC_API_KEY non configurata su Vercel" });

  const feature = req.headers["x-gq-feature"] || "";
  if (LIMITED.includes(feature)) {
    const jwt = (req.headers.authorization || "").replace("Bearer ", "");
    const user = await getUserFromToken(jwt);
    if (!user) return res.status(401).json({ error: "Non autenticato" });
    const prem = await isPremium(user.id);
    if (PREMIUM_ONLY.includes(feature) && !prem)
      return res.status(402).json({ error: "premium_required" });
    const use = await consumeUsage(user.id, feature, prem);
    if (!use.allowed)
      return res.status(429).json({ error: use.reason });
  }

  try {
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
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
