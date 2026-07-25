// Helper server-side: identità utente + stato/concessione premium.
// Usa la SERVICE ROLE KEY (mai esposta al client): è l'unica via di scrittura
// della tabella premium, che lato client è in sola lettura (RLS).
const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function getUserFromToken(token) {
  if (!token) return null;
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
    { headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` } }
  );
  const rows = await r.json();
  const until = rows && rows[0] && rows[0].premium_until;
  return !!until && new Date(until) > new Date();
}

export async function grantPremium(userId, orderId) {
  const until = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  const r = await fetch(`${SB_URL}/rest/v1/premium`, {
    method: "POST",
    headers: {
      apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      user_id: userId, premium_until: until,
      last_order_id: orderId, updated_at: new Date().toISOString(),
    }),
  });
  if (!r.ok) throw new Error("Scrittura premium fallita");
  return until;
}

/* ---------------- Limiti settimanali + crediti ---------------- */
// Tarati sui costi API reali: lo scan usa Sonnet con immagine (~2-3 cent/chiamata),
// nutrition e import usano Haiku (frazioni di centesimo).
export const WEEKLY_LIMITS = {
  free:    { import: 3,  nutrition: 0,  scan: 0 },
  premium: { import: 15, nutrition: 12, scan: 15 },
};
export const CREDIT_COSTS = { import: 1, nutrition: 1, scan: 3 };

const isoWeek = () => {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return `${d.getFullYear()}-W${Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)}`;
};

async function sbFetch(path, opts = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
      ...(opts.headers || {}),
    },
  });
}

export async function getUsage(userId) {
  const r = await sbFetch(`usage?user_id=eq.${userId}&select=*`);
  const rows = await r.json();
  let u = rows && rows[0];
  const wk = isoWeek();
  if (!u) u = { user_id: userId, week: wk, import_n: 0, nutrition_n: 0, scan_n: 0, credits: 0 };
  if (u.week !== wk) { u = { ...u, week: wk, import_n: 0, nutrition_n: 0, scan_n: 0 }; } // reset settimanale
  return u;
}

export async function saveUsage(u) {
  const r = await sbFetch("usage", { method: "POST", body: JSON.stringify({ ...u, updated_at: new Date().toISOString() }) });
  if (!r.ok) throw new Error("Scrittura usage fallita");
}

/* Consuma un uso: prima dal limite settimanale, poi dai crediti extra.
   Ritorna { ok, usage } — se ok=false il client mostra lo store. */
export async function consumeFeature(userId, feature, premium) {
  const u = await getUsage(userId);
  const limits = premium ? WEEKLY_LIMITS.premium : WEEKLY_LIMITS.free;
  const col = feature + "_n";
  if ((u[col] || 0) < (limits[feature] || 0)) {
    u[col] = (u[col] || 0) + 1;
    await saveUsage(u);
    return { ok: true, usage: u };
  }
  const cost = CREDIT_COSTS[feature];
  if ((u.credits || 0) >= cost) {
    u.credits -= cost;
    u[col] = (u[col] || 0) + 1;
    await saveUsage(u);
    return { ok: true, usage: u };
  }
  return { ok: false, usage: u };
}

export async function addCredits(userId, n, orderId) {
  const u = await getUsage(userId);
  u.credits = (u.credits || 0) + n;
  u.last_order_id = orderId;
  await saveUsage(u);
  return u.credits;
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
const H = () => ({ apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, "Content-Type": "application/json" });

export async function getUsage(userId) {
  const r = await fetch(`${SB_URL}/rest/v1/usage?user_id=eq.${userId}&select=*`, { headers: H() });
  const rows = await r.json();
  let u = rows && rows[0];
  if (!u) u = { user_id: userId, week_key: wk(), import_n: 0, nutrition_n: 0, scan_n: 0, credits: 0 };
  if (u.week_key !== wk()) { u.week_key = wk(); u.import_n = 0; u.nutrition_n = 0; u.scan_n = 0; }
  return u;
}

async function saveUsage(u) {
  await fetch(`${SB_URL}/rest/v1/usage`, {
    method: "POST",
    headers: { ...H(), Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ ...u, updated_at: new Date().toISOString() }),
  });
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
