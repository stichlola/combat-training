/* ---------------- Circuiti ----------------
   Un circuito è un gruppo di esercizi CONSECUTIVI con lo stesso ex.circuit (id).
   Impostazioni nella scheda/sessione: circuits = { [id]: { rounds, rest } }.
   Giro i = serie i di ogni esercizio del circuito: tutti hanno `rounds` serie.
   Durante l'allenamento le serie del circuito si fanno di fila senza recupero;
   a fine giro (serie i completata in tutti gli esercizi) parte il recupero `rest`. */

export const DEFAULT_CIRCUIT = { rounds: 3, rest: 90 };

export const newCircuitId = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/* posizione di un esercizio nel suo blocco: per la grafica "a catena" */
export function circuitPos(exercises, i) {
  const id = exercises[i]?.circuit;
  if (!id) return null;
  const first = i === 0 || exercises[i - 1]?.circuit !== id;
  const last = i === exercises.length - 1 || exercises[i + 1]?.circuit !== id;
  let start = i;
  while (start > 0 && exercises[start - 1]?.circuit === id) start--;
  let end = i;
  while (end < exercises.length - 1 && exercises[end + 1]?.circuit === id) end++;
  return { id, first, last, start, end, count: end - start + 1 };
}

/* adatta un elenco di serie al numero di giri: aggiunge copie dell'ultima, o taglia */
export function fitSets(sets, rounds) {
  const out = (sets || []).slice(0, rounds);
  const tpl = out[out.length - 1] || sets?.[sets.length - 1] || { w: "", r: "" };
  while (out.length < rounds) {
    const { done, elapsed, ...rest } = tpl;
    out.push({ ...rest, done: false, ...(elapsed !== undefined ? { elapsed: 0 } : {}) });
  }
  return out;
}

/* applica i giri a un esercizio: serie base + ogni settimana di progressione */
export function fitExercise(ex, rounds) {
  const out = { ...ex, sets: fitSets(ex.sets, rounds) };
  if (ex.progression?.weeks?.length) {
    out.progression = { ...ex.progression, weeks: ex.progression.weeks.map((w) => ({ ...w, sets: fitSets(w.sets, rounds) })) };
  }
  return out;
}

/* pulizia: un circuito con meno di 2 esercizi si scioglie; impostazioni orfane rimosse */
export function normalizeCircuits(exercises, circuits = {}) {
  const count = {};
  exercises.forEach((e) => { if (e.circuit) count[e.circuit] = (count[e.circuit] || 0) + 1; });
  const exs = exercises.map((e) => {
    if (!e.circuit) return e;
    if (count[e.circuit] >= 2 && circuits[e.circuit]) return e;
    const { circuit, ...rest } = e;
    return rest;
  });
  const used = new Set(exs.map((e) => e.circuit).filter(Boolean));
  const cs = {};
  Object.entries(circuits).forEach(([id, c]) => { if (used.has(id)) cs[id] = c; });
  return { exercises: exs, circuits: cs };
}

/* crea un circuito con gli esercizi indicati: li raggruppa (contigui) nella
   posizione del primo e allinea le serie al numero di giri */
export function makeCircuit(exercises, circuits, indices) {
  const sel = [...indices].sort((a, b) => a - b);
  if (sel.length < 2) return { exercises, circuits };
  const id = newCircuitId();
  const rounds = Math.max(...sel.map((i) => exercises[i].sets?.length || 0), 1) || DEFAULT_CIRCUIT.rounds;
  const members = sel.map((i) => fitExercise({ ...exercises[i], circuit: id }, rounds));
  const rest = exercises.filter((_, i) => !sel.includes(i));
  const at = sel[0] - sel.filter((i) => i < sel[0]).length; // indice del primo nell'elenco senza i selezionati
  rest.splice(at, 0, ...members);
  return normalizeCircuits(rest, { ...circuits, [id]: { ...DEFAULT_CIRCUIT, rounds } });
}

export function dissolveCircuit(exercises, circuits, id) {
  const { [id]: _, ...cs } = circuits || {};
  return normalizeCircuits(exercises.map((e) => (e.circuit === id ? (({ circuit, ...r }) => r)(e) : e)), cs);
}

export function setCircuitRounds(exercises, circuits, id, rounds) {
  const n = Math.max(1, Math.min(20, rounds));
  return {
    exercises: exercises.map((e) => (e.circuit === id ? fitExercise(e, n) : e)),
    circuits: { ...circuits, [id]: { ...(circuits?.[id] || DEFAULT_CIRCUIT), rounds: n } },
  };
}

/* giro completato? true se la serie si è completata in tutti gli esercizi del circuito */
export function roundDone(exercises, id, si) {
  const members = exercises.filter((e) => e.circuit === id);
  return members.length > 0 && members.every((e) => e.sets?.[si]?.done);
}

/* giro attuale (1-based) = primo giro non ancora completato */
export function currentRound(exercises, id, rounds) {
  for (let i = 0; i < rounds; i++) if (!roundDone(exercises, id, i)) return i + 1;
  return rounds;
}
