/* ---------------- Progressione settimanale (progressive overload) ----------------
   Modello dati:
   - a livello di SCHEDA:  routine.progression = { enabled: bool, startDate: "YYYY-MM-DD",
                             week: number (1-based), doneKey: timestamp del lunedì in cui
                             la settimana corrente è stata completata }
   - a livello di ESERCIZIO: ex.progression = { weeks: [ { sets: [...] } ] }
   La settimana avanza di 1 non appena l'allenamento viene completato. */

/* chiave settimana: timestamp del lunedì 00:00 della settimana corrente */
export const weekKey = (d = new Date()) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.getTime();
};

/* settimana corrente della scheda (1-based), clampata alle settimane programmate */
export function currentWeek(routineProg, totalWeeks) {
  if (!routineProg || !routineProg.enabled) return null;
  const tot = totalWeeks || routineProg.week || 1;
  return Math.max(1, Math.min(routineProg.week || 1, tot));
}

/* legacy: indice settimana calcolato da data di inizio (solo fallback visivo) */
export function weekIndex(startDate, totalWeeks) {
  if (!totalWeeks) return 0;
  const t0 = new Date(startDate + "T00:00:00").getTime();
  if (isNaN(t0)) return 0;
  const days = Math.floor((Date.now() - t0) / 86400000);
  return Math.max(0, Math.min(totalWeeks - 1, Math.floor(days / 7)));
}

/* se la progressione di scheda è attiva e l'esercizio ha settimane programmate,
   restituisce { sets, week } per la settimana corrente */
export function applyProgression(ex, routineProg) {
  if (!routineProg || !routineProg.enabled) return null;
  const weeks = ex.progression?.weeks;
  if (!weeks || !weeks.length) return null;
  const wi = (currentWeek(routineProg, weeks.length) || 1) - 1;
  const wk = weeks[wi];
  if (!wk || !wk.sets || !wk.sets.length) return null;
  return { sets: wk.sets.map((s) => ({ ...s, done: false, elapsed: 0 })), week: wi + 1, total: weeks.length };
}

/* numero di settimane programmate nella scheda (max tra gli esercizi) */
export function progTotal(r) {
  return Math.max(1, ...(r.exercises || []).map((e) => e.progression?.weeks?.length || 1));
}

/* avanzamento: se la settimana corrente è stata completata e la settimana di
   calendario è cambiata → sale di 1 (mai oltre l'ultima programmata) */
export function syncProgression(r) {
  const p = r.progression;
  if (!p || !p.enabled || !p.doneKey) return null;
  if (weekKey() <= p.doneKey) return null;
  const total = progTotal(r);
  const wk = p.week || 1;
  if (wk >= total) return { ...r, progression: { ...p, doneKey: null } };
  return { ...r, progression: { ...p, week: wk + 1, doneKey: null } };
}

/* chiamata al completamento di una sessione: avanza immediatamente alla settimana successiva */
export function markProgDone(r) {
  const p = r.progression;
  if (!p || !p.enabled) return null;
  const total = progTotal(r);
  const wk = p.week || 1;
  const nextWk = wk >= total ? total : wk + 1;
  return { ...r, progression: { ...p, week: nextWk, doneKey: null } };
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ---------------- Ripetizioni a intervallo ("8-10" o "8/10") ----------------
   Le ripetizioni possono essere un intervallo (doppia progressione): restano
   stringhe nei dati; i calcoli numerici (volume, stime) usano la media. */
export const REP_RANGE = /^\s*(\d{1,3})\s*[-/]\s*(\d{1,3})\s*$/;
export const parseReps = (v) => {
  const m = REP_RANGE.exec(String(v ?? ""));
  if (m) return { lo: +m[1], hi: +m[2] };
  const n = Number(v);
  return String(v ?? "").trim() !== "" && Number.isFinite(n) ? { lo: n, hi: n } : null;
};
export const repsNum = (v) => { const p = parseReps(v); return p ? Math.round((p.lo + p.hi) / 2) : 0; };
/* valore da campo input: l'intervallo (anche mentre si digita, es. "8-") resta
   testo, il numero singolo diventa numero, vuoto resta vuoto */
export const repVal = (raw) => {
  if (raw === "" || raw == null) return "";
  const t = String(raw).trim();
  if (/[-/]/.test(t) && /^[\d\s\-/]+$/.test(t)) return t.replace(/\s+/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : "";
};
/* import esterno (foto/PDF/AI): intervallo normalizzato "8-10", altrimenti numero */
export const repImport = (v, fallback) => {
  const m = REP_RANGE.exec(String(v ?? ""));
  if (m) return `${m[1]}-${m[2]}`;
  const n = Number(v);
  return String(v ?? "").trim() !== "" && Number.isFinite(n) ? n : fallback;
};
