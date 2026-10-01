// Operazioni admin — SOLO l'account admin (riconosciuto via email d'ambiente).
// Per ora: assegnazione manuale di crediti a un utente dato il suo username.
import { getUserFromToken, addCredits } from "./_premium.js";

const adminEmailsStr = process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || "super.pippo.candy@gmail.com";
const ADMIN_EMAILS = adminEmailsStr.split(",").map(e => e.trim().toLowerCase());
const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const jwt = (req.headers.authorization || "").replace("Bearer ", "");
    const user = await getUserFromToken(jwt);
    if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) return res.status(403).json({ error: "Solo admin" });

    const { username, credits } = req.body || {};
    const n = Math.floor(Number(credits) || 0);
    if (!username || !/^[a-zA-Z0-9_.-]{2,40}$/.test(String(username).trim()))
      return res.status(400).json({ error: "username non valido" });
    if (!Number.isFinite(n) || n === 0 || Math.abs(n) > 100000)
      return res.status(400).json({ error: "credits non valido" });

    const pr = await fetch(
      `${SB_URL}/rest/v1/profiles?username=eq.${encodeURIComponent(String(username).trim())}&select=id,username`,
      { headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` } }
    );
    const rows = pr.ok ? await pr.json() : [];
    const target = rows && rows[0];
    if (!target) return res.status(404).json({ error: "user_not_found" });

    const total = await addCredits(target.id, n, "admin-grant");
    return res.status(200).json({ ok: true, username: target.username, added: n, credits: total });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
