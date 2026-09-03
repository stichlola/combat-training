// Referral: chi invita guadagna crediti quando un amico si registra col suo link.
// GET  → { count } referral completati dall'utente
// POST { ref: "<uuid referrer>" } → accredita i bonus a entrambi, UNA volta sola
//       per iscritto (la chiave primaria su referee_id rende il riscatto idempotente).
import { getUserFromToken, addCredits, REF_BONUS_NEW, REF_BONUS_REFERRER } from "./_premium.js";

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = () => ({ apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, "Content-Type": "application/json" });

export default async function handler(req, res) {
  try {
    const jwt = (req.headers.authorization || "").replace("Bearer ", "");
    const user = await getUserFromToken(jwt);
    if (!user) return res.status(401).json({ error: "Non autenticato" });

    if (req.method === "GET") {
      const r = await fetch(
        `${SB_URL}/rest/v1/referrals?referrer_id=eq.${user.id}&select=referee_id`,
        { headers: H() });
      if (!r.ok) throw new Error(`Lettura referral fallita (${r.status}) — la tabella "referrals" esiste su Supabase?`);
      const rows = await r.json();
      return res.status(200).json({ count: (rows || []).length });
    }

    if (req.method === "POST") {
      const ref = String((req.body || {}).ref || "");
      if (!/^[0-9a-f-]{36}$/i.test(ref)) return res.status(400).json({ error: "Codice referral non valido" });
      if (ref === user.id) return res.status(400).json({ error: "self_referral" });

      // il referrer deve esistere (ha un profilo)
      const pr = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${ref}&select=id`, { headers: H() });
      const prows = pr.ok ? await pr.json() : [];
      if (!prows || !prows[0]) return res.status(404).json({ error: "referrer_not_found" });

      // idempotenza: un iscritto può essere "girato" da una sola persona, una sola volta
      const ins = await fetch(`${SB_URL}/rest/v1/referrals`, {
        method: "POST", headers: { ...H(), Prefer: "return=minimal" },
        body: JSON.stringify({ referee_id: user.id, referrer_id: ref, created_at: new Date().toISOString() }),
      });
      if (!ins.ok) {
        const t = await ins.text();
        if (ins.status === 409 || /duplicate|23505/i.test(t))
          return res.status(200).json({ ok: true, already: true });
        throw new Error("Scrittura referral fallita");
      }

      const mine = await addCredits(user.id, REF_BONUS_NEW, `ref-by-${ref}`);
      await addCredits(ref, REF_BONUS_REFERRER, `ref-for-${user.id}`);
      return res.status(200).json({ ok: true, credits: mine, bonus: REF_BONUS_NEW });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
