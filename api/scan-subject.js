// Bio-scansione dello Scouter: riceve UN fermo-immagine dalla fotocamera,
// lo passa al modello Kimi (vision) e restituisce la stima tattica del
// soggetto: sesso, corporatura, massa grassa, forza/riflessi/tecnica e
// livello di potenza stile Dragon Ball. Stesso pattern di api/ai.js:
// auth Supabase + limiti settimanali (riusa la quota "scan").
// L'immagine NON viene salvata: vive solo per la durata della richiesta.
import { getUserFromToken, isPremium, consumeUsage } from "./_premium.js";

const PROMPT = `Sei il bio-scanner di un visore tattico da ricognizione spaziale. Analizza la persona nella foto e rispondi SOLO con JSON valido, nient'altro:
{
  "sesso": "M" oppure "F" (tua stima),
  "massa": "una parola sulla corporatura: esile | media | atletica | massiccia",
  "bf": numero (stima percentuale massa grassa, 5-45),
  "forza": numero 1-99 (stima da corporatura e muscolatura visibile),
  "riflessi": numero 1-99 (stima ludica da postura e prontezza),
  "tecnica": numero 1-99 (stima ludica da portamento e controllo),
  "power": numero intero (livello di potenza stile Dragon Ball, 400-30000, coerente con forza/riflessi/tecnica: circa media dei tre x 100, con bonus per bf bassa),
  "note": "una riga di valutazione tattica, max 80 caratteri, tono militare ironico"
}
Sii realistico ma ludico. Non identificare la persona: stima solo parametri fisici generici.`;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    // auth + limiti (quota "scan": 1/settimana free, 40 premium, poi crediti)
    const jwt = (req.headers.authorization || "").replace("Bearer ", "");
    const user = await getUserFromToken(jwt);
    if (!user) return res.status(401).json({ error: "Non autenticato" });
    const prem = await isPremium(user.id);
    const use = await consumeUsage(user.id, "scan", prem);
    if (!use.allowed) return res.status(429).json({ error: use.reason });

    const { image } = req.body || {};
    if (!image || typeof image !== "string" || image.length > 3_500_000)
      return res.status(400).json({ error: "Immagine mancante o troppo grande" });
    const b64 = image.replace(/^data:image\/\w+;base64,/, "");

    const MOONSHOT = process.env.MOONSHOT_API_KEY;
    const ANTHROPIC = process.env.ANTHROPIC_API_KEY;

    let text = null;

    if (MOONSHOT) {
      // ---- Kimi (Moonshot AI, API OpenAI-compatible) ----
      const model = process.env.KIMI_MODEL || "moonshot-v1-32k-vision-preview";
      const r = await fetch((process.env.KIMI_BASE_URL || "https://api.moonshot.ai/v1") + "/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${MOONSHOT}` },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          messages: [{
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } },
              { type: "text", text: PROMPT },
            ],
          }],
        }),
      });
      const data = await r.json();
      if (data && data.error) return res.status(r.status).json({ error: data.error.message || "Errore API Kimi" });
      text = data?.choices?.[0]?.message?.content;
    } else if (ANTHROPIC) {
      // ---- fallback: Anthropic (stessa chiave già configurata) ----
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": ANTHROPIC, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 400,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
              { type: "text", text: PROMPT },
            ],
          }],
        }),
      });
      const data = await r.json();
      if (data && data.error) return res.status(r.status).json({ error: data.error.message || "Errore API" });
      text = data?.content?.[0]?.text;
    } else {
      return res.status(500).json({ error: "Nessuna chiave AI configurata su Vercel (MOONSHOT_API_KEY o ANTHROPIC_API_KEY)" });
    }

    // parsing JSON tollerante
    const m = String(text || "").match(/\{[\s\S]*\}/);
    if (!m) return res.status(502).json({ error: "Risposta del modello non valida" });
    const out = JSON.parse(m[0]);
    const num = (v, d, min, max) => Math.max(min, Math.min(max, Math.round(Number(v)) || d));
    return res.status(200).json({
      sesso: out.sesso === "F" ? "F" : "M",
      massa: String(out.massa || "media").slice(0, 20),
      bf: num(out.bf, 18, 5, 45),
      forza: num(out.forza, 40, 1, 99),
      riflessi: num(out.riflessi, 40, 1, 99),
      tecnica: num(out.tecnica, 40, 1, 99),
      power: num(out.power, 1500, 400, 30000),
      note: String(out.note || "").slice(0, 120),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Errore interno" });
  }
}
