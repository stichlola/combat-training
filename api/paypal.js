// Pagamento premium via PayPal (Checkout Orders v2).
// SICUREZZA: l'ordine viene CREATO e CATTURATO lato server; il premium viene
// concesso SOLO dopo verifica che PayPal confermi COMPLETED con importo 20.00 EUR.
// Il client non può né fissare il prezzo né scrivere lo stato premium.
import { getUserFromToken, grantPremium, addCredits } from "./_premium.js";

const PP_BASE = process.env.PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";
/* Catalogo prodotti: il prezzo è deciso QUI, mai dal client.
   custom_id viaggia dentro l'ordine PayPal: alla cattura leggiamo il prodotto
   dalla risposta di PayPal, non da ciò che dichiara il client. */
const PRODUCTS = {
  premium: { amount: "20.00", desc: "GymQuest Premium — 12 mesi" },
  pack30:  { amount: "3.00",  desc: "GymQuest — 30 crediti extra", credits: 30 },
  pack100: { amount: "8.00",  desc: "GymQuest — 100 crediti extra", credits: 100 },
};

async function ppToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString("base64");
  const r = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const d = await r.json();
  if (!d.access_token) throw new Error("Credenziali PayPal non valide");
  return d.access_token;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { action, orderID } = req.body || {};
  try {
    const token = await ppToken();

    if (action === "create") {
      const prod = PRODUCTS[req.body.product] || PRODUCTS.premium;
      const r = await fetch(`${PP_BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            amount: { currency_code: "EUR", value: prod.amount },
            description: prod.desc,
            custom_id: req.body.product in PRODUCTS ? req.body.product : "premium",
          }],
        }),
      });
      const d = await r.json();
      if (!d.id) return res.status(500).json({ error: "Creazione ordine fallita", detail: d });
      return res.status(200).json({ id: d.id });
    }

    if (action === "capture") {
      // 1) chi sta pagando? (JWT Supabase verificato server-side)
      const jwt = (req.headers.authorization || "").replace("Bearer ", "");
      const user = await getUserFromToken(jwt);
      if (!user) return res.status(401).json({ error: "Non autenticato" });

      // 2) cattura su PayPal
      const r = await fetch(`${PP_BASE}/v2/checkout/orders/${orderID}/capture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const d = await r.json();

      // 3) prodotto e importo letti dalla RISPOSTA PayPal, mai dal client
      const pu = d?.purchase_units?.[0];
      const cap = pu?.payments?.captures?.[0];
      const prodId = pu?.custom_id || cap?.custom_id || "premium";
      const prod = PRODUCTS[prodId];
      const ok = prod && d.status === "COMPLETED" && cap?.status === "COMPLETED" &&
        cap?.amount?.currency_code === "EUR" && cap?.amount?.value === prod.amount;
      if (!ok) return res.status(400).json({ error: "Pagamento non completato", detail: d.status });

      // 4) concedi il prodotto (service role, unico punto di scrittura)
      if (prod.credits) {
        const credits = await addCredits(user.id, prod.credits, orderID);
        return res.status(200).json({ credits });
      }
      const until = await grantPremium(user.id, orderID);
      return res.status(200).json({ premium_until: until });
    }

    return res.status(400).json({ error: "Azione sconosciuta" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
