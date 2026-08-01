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
/* Free: una sola prova a settimana per funzione (assaggio che porta all'abbonamento).
   Premium: limiti ampi. Oltre il limite si usano i crediti extra acquistabili. */
export const WEEKLY_LIMITS = {
  free:    { import: 1,  nutrition: 1,  scan: 1,  workout: 1 },
  premium: { import: 20, nutrition: 25, scan: 40, workout: 25 },
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
  if (!u) u = { user_id: userId, week: wk(), import_n: 0, nutrition_n: 0, scan_n: 0, workout_n: 0, credits: 0 };
  if (u.week !== wk()) { u.week = wk(); u.import_n = 0; u.nutrition_n = 0; u.scan_n = 0; u.workout_n = 0; }
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

/* Catalogo prodotti condiviso (PayPal + Stripe): il prezzo è deciso QUI, mai dal client. */
export const PRODUCTS = {
  premium: { amount: "20.00", desc: "Combat Training Premium — 12 mesi" },
  pack30:  { amount: "3.00",  desc: "Combat Training — 30 crediti extra", credits: 30 },
  pack100: { amount: "8.00",  desc: "Combat Training — 100 crediti extra", credits: 100 },
};

/* ---------------- Acquisto senza account: codice di riscatto ---------------- */
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export async function createRedeemCode(product, orderId) {
  let code = "";
  for (let i = 0; i < 12; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  code = code.replace(/(.{4})(.{4})(.{4})/, "$1-$2-$3");
  const r = await fetch(`${SB_URL}/rest/v1/redeem_codes`, {
    method: "POST", headers: { ...H(), Prefer: "return=minimal" },
    body: JSON.stringify({ code, product, order_id: orderId, created_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error("Creazione codice fallita");
  return code;
}

/* Idempotenza Stripe: se per questo ordine esiste già un codice, restituiscilo */
export async function findRedeemCodeByOrder(orderId) {
  const r = await fetch(`${SB_URL}/rest/v1/redeem_codes?order_id=eq.${encodeURIComponent(orderId)}&select=code&limit=1`, { headers: H() });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows && rows[0] ? rows[0].code : null;
}

/* Riscatta un codice su un account: applica premium o crediti, poi lo marca usato */
export async function redeemCode(userId, rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  const r = await fetch(`${SB_URL}/rest/v1/redeem_codes?code=eq.${encodeURIComponent(code)}&select=*`, { headers: H() });
  const rows = await r.json();
  const row = rows && rows[0];
  if (!row) return { ok: false, error: "code_not_found" };
  if (row.used_by) return { ok: false, error: "code_already_used" };
  const out = {};
  if (row.product === "premium") out.premium_until = await grantPremium(userId, row.order_id);
  else {
    const n = row.product === "pack100" ? 100 : 30;
    out.credits = await addCredits(userId, n, row.order_id);
  }
  await fetch(`${SB_URL}/rest/v1/redeem_codes?code=eq.${encodeURIComponent(code)}`, {
    method: "PATCH", headers: { ...H(), Prefer: "return=minimal" },
    body: JSON.stringify({ used_by: userId, used_at: new Date().toISOString() }),
  });
  return { ok: true, ...out };
}
