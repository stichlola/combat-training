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
