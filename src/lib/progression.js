/* ---------------- Progressione settimanale (progressive overload) ----------------
   Modello dati:
   - a livello di SCHEDA:  routine.progression = { enabled: bool, startDate: "YYYY-MM-DD" }
     (interruttore generale + inizio settimana 1 — di default OFF, tutto resta com'è)
   - a livello di ESERCIZIO: ex.progression = { weeks: [ { sets: [...] } ] }
     (solo la tabella delle settimane; esercizi senza weeks usano le serie base)
   Allo start della sessione, se la scheda ha la progressione attiva, gli esercizi
   con weeks usano le serie della settimana corrente (calcolata da startDate). */

/* indice settimana corrente: 0 = prima settimana; clampato all'ultima disponibile */
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
  const wi = weekIndex(routineProg.startDate, weeks.length);
  const wk = weeks[wi];
  if (!wk || !wk.sets || !wk.sets.length) return null;
  return { sets: wk.sets.map((s) => ({ ...s, done: false, elapsed: 0 })), week: wi + 1, total: weeks.length };
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
