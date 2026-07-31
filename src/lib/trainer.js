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

/* link di invito: il cliente lo apre, fa login e conferma il collegamento */
export const inviteLink = (trainerId) => `${location.origin}${location.pathname}#pt=${trainerId}`;

/* hash #pt=<id> catturato all'avvio (prima del login), poi ripulito */
export function captureInviteHash() {
  const m = location.hash.match(/^#pt=([0-9a-f-]{36})$/i);
  if (!m) return null;
  localStorage.setItem("gq_pending_pt", m[1]);
  history.replaceState(null, "", location.pathname);
  return m[1];
}
export const pendingInvite = () => localStorage.getItem("gq_pending_pt");
export const clearInvite = () => localStorage.removeItem("gq_pending_pt");

/* il cliente conferma il collegamento al PT (RLS: insert solo client_id = se stesso) */
export async function linkToTrainer(clientId, clientEmail, trainerId) {
  const { error } = await supabase.from("trainer_clients")
    .upsert({ trainer_id: trainerId, client_id: clientId, client_email: clientEmail });
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
