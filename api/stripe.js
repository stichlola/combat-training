// Pagamento premium/crediti via Stripe (Checkout Sessions — pagina ospitata Stripe).
// SICUREZZA: la sessione viene CREATA e VERIFICATA lato server; il premio viene
// concesso SOLO dopo che Stripe conferma payment_status "paid" con importo esatto
// dal catalogo condiviso (_premium.js). Il client non fissa prezzi né stato premium.
// IDEMPOTENZA: verify può essere chiamato più volte (refresh della pagina di ritorno)
// senza accreditare due volte — crediti e codici sono deduplicati su session.id.
import { getUserFromToken, grantPremium, addCredits, getUsage, createRedeemCode, findRedeemCodeByOrder, PRODUCTS } from "./_premium.js";

const SK = process.env.STRIPE_SECRET_KEY;
const STRIPE_API = "https://api.stripe.com/v1";

const cents = (amount) => Math.round(parseFloat(amount) * 100); // "20.00" -> 2000

async function stripeFetch(path, method, params) {
  const r = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SK}`,
      ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: params ? params.toString() : undefined,
  });
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!SK) return res.status(500).json({ error: "STRIPE_SECRET_KEY non configurata su Vercel" });
  const { action } = req.body || {};
  const jwt = (req.headers.authorization || "").replace("Bearer ", "");

  try {
    /* ---------- 1) crea la Checkout Session e rimanda alla pagina Stripe ---------- */
    if (action === "checkout") {
      const prodId = req.body.product in PRODUCTS ? req.body.product : "premium";
      const prod = PRODUCTS[prodId];
      const user = await getUserFromToken(jwt); // può essere null: acquisto da ospite
      const origin = req.headers.origin || `https://${req.headers.host}`;

      const p = new URLSearchParams();
      p.set("mode", "payment");
      p.set("success_url", `${origin}/?stripe_session={CHECKOUT_SESSION_ID}`);
      p.set("cancel_url", `${origin}/?stripe_cancel=1`);
      p.set("line_items[0][quantity]", "1");
      p.set("line_items[0][price_data][currency]", "eur");
      p.set("line_items[0][price_data][unit_amount]", String(cents(prod.amount)));
      p.set("line_items[0][price_data][product_data][name]", prod.desc);
      p.set("metadata[product]", prodId);
      if (user) p.set("client_reference_id", user.id);
      if (user && user.email) p.set("customer_email", user.email);

      const s = await stripeFetch("/checkout/sessions", "POST", p);
      if (!s.url) return res.status(500).json({ error: "Creazione sessione Stripe fallita", detail: s.error?.message });
      return res.status(200).json({ url: s.url });
    }

    /* ---------- 2) verifica al rientro: concedi il prodotto UNA sola volta ---------- */
    if (action === "verify") {
      const sessionId = req.body.sessionId;
      if (!sessionId) return res.status(400).json({ error: "sessionId mancante" });
      const s = await stripeFetch(`/checkout/sessions/${encodeURIComponent(sessionId)}`, "GET");
      if (s.error) return res.status(400).json({ error: "Sessione non trovata", detail: s.error.message });

      // prodotto e importo letti dalla RISPOSTA Stripe, mai dal client
      const prodId = s.metadata?.product || "premium";
      const prod = PRODUCTS[prodId];
      const ok = prod && s.payment_status === "paid" &&
        s.currency === "eur" && s.amount_total === cents(prod.amount);
      if (!ok) return res.status(400).json({ error: "Pagamento non completato", detail: s.payment_status });

      const user = await getUserFromToken(jwt);

      // senza account: codice di riscatto (deduplicato sull'id sessione)
      if (!user) {
        let code = await findRedeemCodeByOrder(s.id);
        if (!code) code = await createRedeemCode(prodId, s.id);
        return res.status(200).json({ code, product: prodId });
      }

      if (prod.credits) {
        // idempotenza: se questa sessione è già stata accreditata, non riaggiungere
        const u = await getUsage(user.id);
        if (u.last_order_id === s.id) return res.status(200).json({ credits: u.credits, already: true });
        const credits = await addCredits(user.id, prod.credits, s.id);
        return res.status(200).json({ credits });
      }
      const until = await grantPremium(user.id, s.id, prod.days || 365); // idempotente di natura
      return res.status(200).json({ premium_until: until });
    }

    return res.status(400).json({ error: "Azione sconosciuta" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
