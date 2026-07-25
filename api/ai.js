// Proxy sicuro verso l'API Anthropic + gating premium server-side.
// Le funzionalità "nutrition" e "scan" richiedono un account premium VERIFICATO
// sul server: bypassare il controllo lato client non serve a nulla.
import { getUserFromToken, isPremium } from "./_premium.js";

const PREMIUM_FEATURES = ["nutrition", "scan"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({ error: "ANTHROPIC_API_KEY non configurata su Vercel" });

  const feature = req.headers["x-gq-feature"] || "";
  if (PREMIUM_FEATURES.includes(feature)) {
    const jwt = (req.headers.authorization || "").replace("Bearer ", "");
    const user = await getUserFromToken(jwt);
    if (!user) return res.status(401).json({ error: "Non autenticato" });
    if (!(await isPremium(user.id)))
      return res.status(402).json({ error: "premium_required" });
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
