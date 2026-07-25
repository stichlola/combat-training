// Ritorna al client il proprio stato d'uso (sola lettura, identità dal JWT)
import { getUserFromToken, isPremium, getUsage, WEEKLY_LIMITS } from "./_premium.js";

export default async function handler(req, res) {
  const jwt = (req.headers.authorization || "").replace("Bearer ", "");
  const user = await getUserFromToken(jwt);
  if (!user) return res.status(401).json({ error: "Non autenticato" });
  const prem = await isPremium(user.id);
  const u = await getUsage(user.id);
  res.status(200).json({
    premium: prem,
    limits: prem ? WEEKLY_LIMITS.premium : WEEKLY_LIMITS.free,
    used: { import: u.import_n || 0, nutrition: u.nutrition_n || 0, scan: u.scan_n || 0 },
    credits: u.credits || 0,
  });
}
