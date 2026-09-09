/* ---------------- Progressione settimanale (progressive overload) ----------------
   Modello dati:
   - a livello di SCHEDA:  routine.progression = { enabled: bool, startDate: "YYYY-MM-DD",
                             week: number (1-based), doneKey: timestamp del lunedì in cui
                             la settimana corrente è stata completata }
   - a livello di ESERCIZIO: ex.progression = { weeks: [ { sets: [...] } ] }
   La settimana NON avanza col semplice passare dei giorni: sale di 1 solo quando la
   scheda è stata completata E la settimana di calendario è cambiata. */

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

/* chiamata al completamento di una sessione: segna la settimana come completata */
export function markProgDone(r) {
  const p = r.progression;
  if (!p || !p.enabled) return null;
  return { ...r, progression: { ...p, week: p.week || 1, doneKey: weekKey() } };
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
