// Riscatto di un codice acquistato senza account.
import { getUserFromToken, redeemCode } from "./_premium.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const jwt = (req.headers.authorization || "").replace("Bearer ", "");
    const user = await getUserFromToken(jwt);
    if (!user) return res.status(401).json({ error: "Non autenticato" });
    const out = await redeemCode(user.id, (req.body || {}).code);
    if (!out.ok) return res.status(400).json({ error: out.error });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
