import { supabase } from "./supabase";

/* ---------------- Sistema Personal Trainer ----------------
   Ruoli in tabella profiles (role: "user" | "pt").
   Relazione PT↔cliente in trainer_clients (il cliente si collega via link/QR
   con l'id del PT; riga inserita dal cliente stesso dopo conferma). */

/* legge (e se manca crea) il profilo dell'utente loggato; ritorna il ruolo */
export async function fetchMyRole(authUser) {
  const { data } = await supabase.from("profiles").select("role")
    .eq("id", authUser.id).maybeSingle();
  if (data) return data.role;
  await supabase.from("profiles").insert({ id: authUser.id, role: "user" });
  return "user";
}

/* link di invito: il cliente lo apre, fa login e conferma il collegamento.
   Il nome del PT viaggia nel link (&n=...) così il cliente vede subito CHI lo
   seguirà, anche prima che la policy "cliente legge il profilo del PT" sia attiva. */
export const inviteLink = (trainerId, trainerName) =>
  `${location.origin}${location.pathname}#pt=${trainerId}` +
  (trainerName ? `&n=${encodeURIComponent(trainerName)}` : "");

/* hash #pt=<id>[&n=<nome>] catturato all'avvio (prima del login), poi ripulito */
export function captureInviteHash() {
  const m = location.hash.match(/^#pt=([0-9a-f-]{36})(?:&n=([^&]*))?$/i);
  if (!m) return null;
  localStorage.setItem("gq_pending_pt", m[1]);
  if (m[2]) {
    try { localStorage.setItem("gq_pending_pt_name", decodeURIComponent(m[2])); } catch {}
  }
  history.replaceState(null, "", location.pathname);
  return m[1];
}
export const pendingInvite = () => localStorage.getItem("gq_pending_pt");
export const pendingInviteName = () => localStorage.getItem("gq_pending_pt_name");
export const clearInvite = () => {
  localStorage.removeItem("gq_pending_pt");
  localStorage.removeItem("gq_pending_pt_name");
};

/* UN SOLO PT per utente: il collegamento sostituisce sempre quello attuale.
   (RLS: il cliente cancella/inserisce solo righe con client_id = se stesso) */
export async function linkToTrainer(clientId, clientEmail, trainerId) {
  await supabase.from("trainer_clients").delete().eq("client_id", clientId);
  const { error } = await supabase.from("trainer_clients")
    .insert({ trainer_id: trainerId, client_id: clientId, client_email: clientEmail });
  return !error;
}

/* Il PT attuale del cliente (al massimo uno). Ritorna null oppure
   { id, name } — name = full_name o username letto dal profilo del PT
   (richiede la policy "Il cliente legge il profilo del proprio PT");
   in mancanza, si usa il nome arrivato con il link invito (cache locale). */
export async function fetchMyTrainer(clientId) {
  const { data } = await supabase.from("trainer_clients")
    .select("trainer_id, created_at").eq("client_id", clientId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  const { data: prof } = await supabase.from("profiles")
    .select("username, full_name").eq("id", data.trainer_id).maybeSingle();
  /* fallback: nome arrivato col link invito (serve se la policy "Il cliente legge
     il profilo del proprio PT" non è ancora stata applicata sul database) */
  let cached = null;
  try { cached = localStorage.getItem("gq_my_pt_name"); } catch {}
  return { id: data.trainer_id, name: prof?.full_name || prof?.username || cached || null,
    username: prof?.username || null, fullName: prof?.full_name || null, since: data.created_at || null };
}

/* L'utente si scollega dal proprio PT (stop o preparazione al cambio) */
export async function unlinkMyTrainer(clientId) {
  const { error } = await supabase.from("trainer_clients").delete().eq("client_id", clientId);
  return !error;
}

/* lista clienti del PT (più recenti in fondo) */
export async function listClients(trainerId) {
  const { data, error } = await supabase.from("trainer_clients")
    .select("*").eq("trainer_id", trainerId).order("created_at");
  if (error || !data) return [];
  /* arricchisce con username e nome/cognome dal profilo (policy: il PT legge i profili dei clienti) */
  const ids = data.map((c) => c.client_id);
  if (ids.length) {
    const { data: profs } = await supabase.from("profiles")
      .select("id, username, full_name").in("id", ids);
    const byId = Object.fromEntries((profs || []).map((p) => [p.id, p]));
    return data.map((c) => ({ ...c, username: byId[c.client_id]?.username || null, full_name: byId[c.client_id]?.full_name || null }));
  }
  return data;
}

export async function saveClientNote(trainerId, clientId, note) {
  await supabase.from("trainer_clients").update({ note })
    .eq("trainer_id", trainerId).eq("client_id", clientId);
}

export async function removeClient(trainerId, clientId) {
  await supabase.from("trainer_clients").delete()
    .eq("trainer_id", trainerId).eq("client_id", clientId);
}

/* PREDISPOSIZIONE: il PT legge le schede del cliente (serve la policy
   "PT legge i dati dei clienti" su user_data — vedi schema.sql).
   La MODIFICA diretta arriverà in una prossima versione. */
export async function getClientRoutines(clientId) {
  const { data, error } = await supabase.from("user_data").select("routines")
    .eq("user_id", clientId).maybeSingle();
  return error ? null : (data?.routines || []);
}

/* Il PT sovrascrive le schede del cliente (upsert: solo la colonna routines,
   il resto dei dati del cliente resta intatto). Richiede le policy trainer
   di UPDATE/INSERT su user_data. */
export async function saveClientRoutines(clientId, routines) {
  const { error } = await supabase.from("user_data")
    .upsert({ user_id: clientId, routines }, { onConflict: "user_id" });
  return !error;
}

/* L'utente salva il proprio nome e cognome (visibile al PT). */
export async function saveMyFullName(userId, fullName) {
  const { error } = await supabase.from("profiles")
    .upsert({ id: userId, full_name: (fullName || "").trim() }, { onConflict: "id" });
  return !error;
}

/* Sincronizza lo username sul profilo (così il PT lo vede). Chiamata al login. */
export async function syncMyUsername(userId, username) {
  await supabase.from("profiles")
    .upsert({ id: userId, username }, { onConflict: "id" });
}

/* ── Richieste PT + admin ─────────────────────────────────── */

// L'admin (tu) sei riconosciuto via email dell'account.
export const ADMIN_EMAIL = "candotto.d@gmail.com";
export const isAdminUser = (u) => !!u && u.email === ADMIN_EMAIL;

// L'utente invia la richiesta di diventare PT (con motivazione).
// Ritorna true, oppure una stringa di errore da mostrare nel modale.
export async function submitPtRequest(userId, email, message) {
  const { error } = await supabase.from("pt_requests")
    .insert({ user_id: userId, email, message: (message || "").trim() });
  if (!error) return true;
  if (error.code === "42P01" || /does not exist|not find the table/i.test(error.message || ""))
    return "Servizio richieste non ancora attivo: riprova più tardi.";
  return error.message || "Errore sconosciuto";
}

// L'ultima richiesta dell'utente (per mostrare lo stato nel profilo).
export async function fetchMyPtRequest(userId) {
  const { data, error } = await supabase.from("pt_requests").select("*")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return error ? null : data;
}

// Admin: tutte le richieste in attesa.
export async function fetchPendingPtRequests() {
  const { data, error } = await supabase.from("pt_requests").select("*")
    .eq("status", "pending").order("created_at", { ascending: true });
  return error ? [] : (data || []);
}

// Admin: approva (promuove a PT) o rifiuta.
export async function decidePtRequest(req, approve) {
  const { error } = await supabase.from("pt_requests")
    .update({ status: approve ? "approved" : "rejected", decided_at: new Date().toISOString() })
    .eq("id", req.id);
  if (error) return false;
  if (approve) {
    // upsert: promuove anche se la riga profilo non esiste ancora
    const { error: e2 } = await supabase.from("profiles")
      .upsert({ id: req.user_id, role: "pt" }, { onConflict: "id" });
    if (e2) return false;
  }
  return true;
}

/* ── Soft lock import AI (lato PT) ──────────────────────────
   Limite settimanale alto, uguale per tutti: serve solo ad evitare
   abusi. È volutamente "soft" (contatore sul dispositivo del PT). */
export const PT_IMPORT_WEEK_LIMIT = 20;
const PT_IMPORT_KEY = "gq_pt_imports";

const ptWeekKey = () => {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // settimana che inizia di lunedì
  const mon = new Date(d); mon.setDate(d.getDate() - day);
  return mon.toISOString().slice(0, 10);
};

export function ptImportsLeft() {
  try {
    const raw = JSON.parse(localStorage.getItem(PT_IMPORT_KEY) || "{}");
    if (raw.week !== ptWeekKey()) return PT_IMPORT_WEEK_LIMIT;
    return Math.max(0, PT_IMPORT_WEEK_LIMIT - (raw.count || 0));
  } catch { return PT_IMPORT_WEEK_LIMIT; }
}

export function ptImportConsume() {
  try {
    const raw = JSON.parse(localStorage.getItem(PT_IMPORT_KEY) || "{}");
    const count = raw.week === ptWeekKey() ? (raw.count || 0) : 0;
    localStorage.setItem(PT_IMPORT_KEY, JSON.stringify({ week: ptWeekKey(), count: count + 1 }));
  } catch { /* ignore */ }
}
