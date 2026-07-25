// Helper server-side: identità utente + stato/concessione premium + usage/crediti.
// Usa la SERVICE ROLE KEY (mai esposta al client): è l'unica via di scrittura
// delle tabelle "premium" e "usage", che lato client sono in sola lettura (RLS).
const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = () => ({ apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, "Content-Type": "application/json" });

export async function getUserFromToken(token) {
  if (!token) return null;
  if (!SB_URL || !SB_SERVICE) throw new Error("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti su Vercel");
  const r = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { apikey: SB_SERVICE, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}

export async function isPremium(userId) {
  const r = await fetch(
    `${SB_URL}/rest/v1/premium?user_id=eq.${userId}&select=premium_until`,
    { headers: H() }
  );
  if (!r.ok) throw new Error(`Lettura premium fallita (${r.status}) — la tabella "premium" esiste su Supabase?`);
  const rows = await r.json();
  const until = rows && rows[0] && rows[0].premium_until;
  return !!until && new Date(until) > new Date();
}

export async function grantPremium(userId, orderId) {
  const until = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  const r = await fetch(`${SB_URL}/rest/v1/premium`, {
    method: "POST",
    headers: { ...H(), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      user_id: userId, premium_until: until,
      last_order_id: orderId, updated_at: new Date().toISOString(),
    }),
  });
  if (!r.ok) throw new Error("Scrittura premium fallita");
  return until;
}

/* ---------------- Limiti settimanali + crediti extra ---------------- */
export const WEEKLY_LIMITS = {
  free:    { import: 3,  nutrition: 0,  scan: 0 },
  premium: { import: 20, nutrition: 25, scan: 40 },
};
const wk = () => {
  const d = new Date(), j = new Date(d.getFullYear(), 0, 1);
  return `${d.getFullYear()}-W${Math.ceil(((d - j) / 86400000 + j.getDay() + 1) / 7)}`;
};

export async function getUsage(userId) {
  const r = await fetch(`${SB_URL}/rest/v1/usage?user_id=eq.${userId}&select=*`, { headers: H() });
  if (!r.ok) throw new Error(`Lettura usage fallita (${r.status}) — la tabella "usage" esiste su Supabase?`);
  const rows = await r.json();
  let u = rows && rows[0];
  if (!u) u = { user_id: userId, week: wk(), import_n: 0, nutrition_n: 0, scan_n: 0, credits: 0 };
  if (u.week !== wk()) { u.week = wk(); u.import_n = 0; u.nutrition_n = 0; u.scan_n = 0; }
  return u;
}

async function saveUsage(u) {
  const r = await fetch(`${SB_URL}/rest/v1/usage`, {
    method: "POST",
    headers: { ...H(), Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ ...u, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error("Scrittura usage fallita");
}

/* Consuma un uso: prima il limite settimanale, poi i crediti extra.
   Ritorna { allowed, reason } */
export async function consumeUsage(userId, feature, premium) {
  const limits = premium ? WEEKLY_LIMITS.premium : WEEKLY_LIMITS.free;
  const limit = limits[feature] ?? 0;
  const field = feature + "_n";
  const u = await getUsage(userId);
  if ((u[field] || 0) < limit) {
    u[field] = (u[field] || 0) + 1;
    await saveUsage(u);
    return { allowed: true };
  }
  if ((u.credits || 0) > 0) {
    u.credits -= 1;
    u[field] = (u[field] || 0) + 1;
    await saveUsage(u);
    return { allowed: true, usedCredit: true };
  }
  return { allowed: false, reason: limit === 0 ? "premium_required" : "limit_reached" };
}

export async function addCredits(userId, n, orderId) {
  const u = await getUsage(userId);
  u.credits = (u.credits || 0) + n;
  u.last_order_id = orderId;
  await saveUsage(u);
  return u.credits;
}
