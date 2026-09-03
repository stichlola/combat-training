// Shop a crediti: sblocca contenuti extra (temi, piani prefatti) spendendo
// i crediti accumulati/acquistati. Il costo è nel catalogo server (SHOP_ITEMS),
// lo sblocco è registrato nella tabella "unlocks" (idempotente per coppia user+item).
import { getUserFromToken, getUsage, spendCredits, listUnlocks, addUnlock, SHOP_ITEMS } from "./_premium.js";

export default async function handler(req, res) {
  try {
    const jwt = (req.headers.authorization || "").replace("Bearer ", "");
    const user = await getUserFromToken(jwt);
    if (!user) return res.status(401).json({ error: "Non autenticato" });

    if (req.method === "GET") {
      const u = await getUsage(user.id);
      const unlocks = await listUnlocks(user.id);
      return res.status(200).json({ credits: u.credits || 0, unlocks });
    }

    if (req.method === "POST") {
      const item = String((req.body || {}).item || "");
      const meta = SHOP_ITEMS[item];
      if (!meta) return res.status(400).json({ error: "Articolo sconosciuto" });

      const owned = await listUnlocks(user.id);
      if (owned.includes(item)) {
        const u = await getUsage(user.id);
        return res.status(200).json({ ok: true, already: true, credits: u.credits || 0, unlocks: owned });
      }

      const spent = await spendCredits(user.id, meta.credits);
      if (!spent.ok) return res.status(402).json({ error: "not_enough_credits", credits: spent.credits });

      await addUnlock(user.id, item);
      return res.status(200).json({ ok: true, credits: spent.credits, unlocks: [...owned, item] });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
