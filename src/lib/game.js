export const DEFAULT_ROUTINES = [];
export const DEFAULT_PRS = {};

export const LEVEL_TITLES = ["RECRUIT", "PRIVATE", "SERGEANT", "SPARTAN", "MASTER CHIEF"];
export const xpForLevel = (lvl) => 100 + (lvl - 1) * 60;

/* ================================ BOOT SCREEN ================================ */
/* Splash in stile Halo: copre il check della sessione (niente flash del login) */
export const BASE_FACTS = [
  "Il muscolo cresce durante il recupero, non durante l'allenamento: dormi 7-9 ore.",
  "Aumentare il carico anche solo di 1-2 kg a settimana è progressione reale.",
  "La fase eccentrica (discesa lenta) genera più adattamento muscolare di quella concentrica.",
  "2 g di proteine per kg di peso corporeo sono il riferimento per chi si allena coi pesi.",
  "Il riscaldamento ideale replica l'esercizio che stai per fare, a carico ridotto.",
  "I DOMS non misurano l'efficacia dell'allenamento: sono solo micro-danno da stimoli nuovi.",
  "La forza è anche neurale: le prime settimane migliori perché il cervello impara, non perché il muscolo cresce.",
  "Bere il 2% del peso corporeo in meno d'acqua riduce già la performance.",
  "Il range di movimento completo costruisce più muscolo dei mezzi movimenti col doppio del peso.",
  "Recuperi 2-3 min tra le serie pesanti aumentano forza e volume totale sollevato.",
  "La creatina monoidrato è l'integratore più studiato ed efficace: 3-5 g al giorno, sempre.",
  "Allenarsi a cedimento a ogni serie non serve: fermati a 1-3 ripetizioni dal limite.",
  "Il grasso non si trasforma in muscolo: sono tessuti diversi, si perde uno e si costruisce l'altro.",
  "La costanza batte l'intensità: 3 allenamenti a settimana per anni valgono più di 6 per un mese.",
  "Camminare 8-10 mila passi al giorno migliora il recupero e brucia più di quanto pensi.",
  "Il core lavora in quasi ogni esercizio in piedi: squat e stacco sono anche esercizi per l'addome.",
  "Dopo le 18 il corpo è mediamente più forte del 5-10% rispetto al mattino presto.",
  "La caffeina 30-60 minuti prima migliora forza e resistenza: 3-6 mg per kg di peso.",
  "Cambiare scheda ogni settimana impedisce la progressione: tieni gli stessi esercizi 6-10 settimane.",
  "Il pump post-allenamento è sangue nei muscoli, non crescita: sparisce in un paio d'ore.",
  "Le donne non diventano 'grosse' coi pesi: hanno 10-15 volte meno testosterone.",
  "Un chilo di muscolo consuma più calorie a riposo di un chilo di grasso: la massa è un investimento.",
  "L'ultimo pasto pre-workout ideale è 2-3 ore prima: carboidrati + proteine, pochi grassi.",
  "Il sovrallenamento vero è raro: quasi sempre è sotto-recupero (sonno, cibo, stress).",
  "Registrare i propri allenamenti aumenta i progressi: ciò che misuri, migliora.",
];

/* ================================ QUEST SYSTEM ================================ */
/* Sfide giornaliere e settimanali in stile Halo Reach: pool locale, rotazione
   automatica con seed sulla data, XP extra al completamento. */
export const QUEST_METRICS = ["workouts", "sets", "volume", "cardio", "pr"];
export const QUEST_POOL_DAILY = [
  { text: "Fuoco di Copertura: completa 1 allenamento oggi", metric: "workouts", target: 1, xp: 40 },
  { text: "Grilletto Facile: completa 15 serie oggi", metric: "sets", target: 15, xp: 45 },
  { text: "Colpo su Colpo: completa 20 serie oggi", metric: "sets", target: 20, xp: 60 },
  { text: "Ordigno Pesante: solleva 3.000 kg di volume oggi", metric: "volume", target: 3000, xp: 50 },
  { text: "Demolizione: solleva 5.000 kg di volume oggi", metric: "volume", target: 5000, xp: 70 },
  { text: "Supremazia: solleva 8.000 kg di volume oggi", metric: "volume", target: 8000, xp: 90 },
  { text: "Corridoio di Fuga: 10 minuti di cardio oggi", metric: "cardio", target: 10, xp: 40 },
  { text: "Marcia Forzata: 20 minuti di cardio oggi", metric: "cardio", target: 20, xp: 60 },
  { text: "Oltre il Limite: registra 1 nuovo record oggi", metric: "pr", target: 1, xp: 80 },
  { text: "Ricognizione Rapida: completa 10 serie oggi", metric: "sets", target: 10, xp: 30 },
  { text: "Assalto Frontale: completa 25 serie oggi", metric: "sets", target: 25, xp: 75 },
  { text: "Carico Bellico: solleva 1.500 kg di volume oggi", metric: "volume", target: 1500, xp: 30 },
  { text: "Sprint Finale: 15 minuti di cardio oggi", metric: "cardio", target: 15, xp: 50 },
  { text: "Doppio Turno: completa 2 allenamenti oggi", metric: "workouts", target: 2, xp: 100 },
];
export const QUEST_POOL_WEEKLY = [
  { text: "Operazione Settimanale: completa 3 allenamenti", metric: "workouts", target: 3, xp: 120 },
  { text: "Campagna Estesa: completa 4 allenamenti", metric: "workouts", target: 4, xp: 160 },
  { text: "Guerra Totale: completa 5 allenamenti", metric: "workouts", target: 5, xp: 220 },
  { text: "Arsenale Completo: completa 60 serie", metric: "sets", target: 60, xp: 140 },
  { text: "Fuoco Sostenuto: completa 80 serie", metric: "sets", target: 80, xp: 180 },
  { text: "Tonnellata Spartana: solleva 15.000 kg di volume", metric: "volume", target: 15000, xp: 150 },
  { text: "Titano d'Acciaio: solleva 25.000 kg di volume", metric: "volume", target: 25000, xp: 220 },
  { text: "Maratona del Soldato: 60 minuti di cardio", metric: "cardio", target: 60, xp: 150 },
  { text: "Resistenza Estrema: 90 minuti di cardio", metric: "cardio", target: 90, xp: 200 },
  { text: "Cacciatore di Record: registra 2 nuovi PR", metric: "pr", target: 2, xp: 180 },
  { text: "LASO Settimanale: 4 allenamenti e 50 serie", metric: "sets", target: 50, xp: 160 },
];

/* selezione deterministica: stesso giorno/settimana = stesse quest per tutti */
export const seededPick = (pool, seedStr, n) => {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
};
export const dayKey = () => new Date().toISOString().slice(0, 10);
export const weekKey = () => {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const wk = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${wk}`;
};
export const freshQuests = (dailyPool, weeklyPool) => ({
  dayKey: dayKey(),
  weekKey: weekKey(),
  daily: seededPick(dailyPool, "d" + dayKey(), 3).map((q) => ({ ...q, prog: 0, done: false })),
  weekly: seededPick(weeklyPool, "w" + weekKey(), 3).map((q) => ({ ...q, prog: 0, done: false })),
});

/* ---------------- Achievements (fissi) ---------------- */
export const ACHIEVEMENTS = [
  // model: la medaglia si può ammirare in 3D nella sezione MEDAGLIE (per ora solo la più facile da sbloccare)
  { id: "first", name: "Il Primo Passo", desc: "Completa il tuo primo allenamento", tier: "easy", model: "medal", check: (s) => s.workouts >= 1 },
  { id: "w10", name: "Recluta Promossa", desc: "Completa 10 allenamenti", tier: "easy", check: (s) => s.workouts >= 10 },
  { id: "w50", name: "Veterano del Ferro", desc: "Completa 50 allenamenti", tier: "hard", check: (s) => s.workouts >= 50 },
  { id: "w100", name: "Spartan-117", desc: "Completa 100 allenamenti", tier: "hard", check: (s) => s.workouts >= 100 },
  { id: "s100", name: "Grilletto Consumato", desc: "Completa 100 serie totali", tier: "easy", check: (s) => s.setsDone >= 100 },
  { id: "s1000", name: "Mitragliere", desc: "Completa 1.000 serie totali", tier: "hard", check: (s) => s.setsDone >= 1000 },
  { id: "v10k", name: "Diecimila", desc: "Solleva 10.000 kg di volume totale", tier: "easy", check: (s) => s.volume >= 10000 },
  { id: "v100k", name: "Centomila", desc: "Solleva 100.000 kg di volume totale", tier: "hard", check: (s) => s.volume >= 100000 },
  { id: "v500k", name: "Mjolnir", desc: "Solleva 500.000 kg di volume totale", tier: "hard", check: (s) => s.volume >= 500000 },
  { id: "c60", name: "Fiato da Marine", desc: "60 minuti di cardio totali", tier: "easy", check: (s) => s.cardioMin >= 60 },
  { id: "c600", name: "Maratoneta ODST", desc: "600 minuti di cardio totali", tier: "hard", check: (s) => s.cardioMin >= 600 },
  { id: "pr1", name: "Nuovo Massimale", desc: "Registra il tuo primo PR", tier: "easy", check: (s, prs) => Object.keys(prs || {}).length >= 1 },
  { id: "bench100", name: "Club dei 100", desc: "PR di 100 kg su Panca Piana Bilanciere", tier: "hard", check: (s, prs) => (prs?.["Panca Piana Bilanciere"] || 0) >= 100 },
  { id: "q10", name: "Cacciatore di Taglie", desc: "Completa 10 quest", tier: "easy", check: (s) => s.questsDone >= 10 },
  { id: "q50", name: "Leggenda delle Sfide", desc: "Completa 50 quest", tier: "hard", check: (s) => s.questsDone >= 50 },
  { id: "lv10", name: "Ufficiale di Grado", desc: "Raggiungi il livello 10", tier: "easy", check: (s, prs, lvl) => lvl >= 10 },
  { id: "lv25", name: "Hyper Lethal", desc: "Raggiungi il livello 25", tier: "hard", check: (s, prs, lvl) => lvl >= 25 },
];
export const EMPTY_STATS = { workouts: 0, setsDone: 0, volume: 0, cardioMin: 0, questsDone: 0, hints: [] };
