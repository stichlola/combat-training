/* Contenuti del negozio a crediti: temi extra e piani prefatti.
   Gli ID devono corrispondere a SHOP_ITEMS in api/_premium.js. */
import { Leaf, Dumbbell, Flame, Sun, Zap, Utensils } from "lucide-react";
import { holdSets } from "./exercises";

export const SHOP_META = [
  /* sezione Nutrizione sbloccata per sempre (inclusa anche nell'abbonamento Premium);
     le generazioni con IA restano a consumo: Premium oppure 1 credito ciascuna */
  { id: "nutrition", credits: 100, kind: "feature", Icon: Utensils,
    title: "SEZIONE NUTRIZIONE",
    desc: "Sblocca per sempre piano alimentare, pasti e target. Le generazioni con IA usano 1 credito ciascuna (illimitate con Premium)." },
  { id: "theme-emerald", credits: 40, kind: "theme", Icon: Leaf,
    title: "TEMA SMERALDO",
    desc: "Una versione verde smeraldo dell'interfaccia: la attivi dal profilo quando vuoi." },
  /* l'ID resta "theme-crimson" (acquisti già registrati lato server): dal
     rosso cremisi diventato tema base, questo articolo ora sblocca l'arancio */
  { id: "theme-crimson", credits: 40, kind: "theme", Icon: Sun,
    title: "TEMA ARANCIO",
    desc: "La versione arancione e solare dell'interfaccia: la attivi dal profilo quando vuoi." },
  { id: "pack-strength", credits: 50, kind: "routines", Icon: Dumbbell,
    title: "PIANO FORZA 5×5",
    desc: "Due schede complete A/B per la forza massimale: squat, panca, stacco e militari." },
  { id: "pack-core", credits: 40, kind: "routines", Icon: Flame,
    title: "PIANO 30 GG CORE",
    desc: "Scheda core intensiva da 8 esercizi per addominali d'acciaio in 30 giorni." },
  { id: "pack-ppl", credits: 50, kind: "routines", Icon: Zap,
    title: "PIANO PUSH PULL LEGS",
    desc: "Tre schede complete Push/Pull/Legs: spinta, tirata e gambe, pronte da allenare." },
];

/* Voce extra del selettore tema, visibile solo a chi ha sbloccato "theme-emerald" */
export const EMERALD_MODE = { id: "emerald", label: "Smeraldo", flag: "❖", Icon: Leaf,
  desc: "La versione base in verde smeraldo — sbloccata con i crediti" };

/* Voce extra del selettore tema, visibile solo a chi ha sbloccato "theme-crimson" (Arancio) */
export const ORANGE_MODE = { id: "orange", label: "Arancio", flag: "◆", Icon: Sun,
  desc: "Toni arancio caldi e solari — sbloccato con i crediti" };

const rid = () => "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ex = (name, group, w, n, r = 5) => ({
  name, group, note: "", rest: 90,
  sets: Array.from({ length: n }, () => ({ w, r, done: false })),
});
const hold = (name, group, n) => ({ name, group, mode: "hold", note: "", sets: holdSets(n) });

/* Piani prefatti: vengono AGGIUNTI alle schede esistenti, mai sovrascritti */
export function buildPackRoutines(packId) {
  if (packId === "pack-strength") return [
    { id: rid(), name: "FORZA 5×5 — A", exercises: [
      ex("Squat Bilanciere", "Gambe", 60, 5),
      ex("Panca Piana Bilanciere", "Petto", 50, 5),
      ex("Rematore Bilanciere", "Dorso", 40, 5),
      hold("Plank", "Core", 3),
    ] },
    { id: rid(), name: "FORZA 5×5 — B", exercises: [
      ex("Squat Bilanciere", "Gambe", 60, 5),
      ex("Military Press", "Spalle", 30, 5),
      ex("Stacco da Terra", "Gambe", 90, 5, 3),
      hold("Hollow Hold", "Core", 3),
    ] },
  ];
  if (packId === "pack-core") return [
    { id: rid(), name: "30 GG CORE", exercises: [
      hold("Plank", "Core", 4),
      ex("Crunch", "Core", 0, 4, 20),
      ex("Russian Twist", "Core", 0, 4, 20),
      ex("Leg Raise", "Core", 0, 3, 15),
      hold("Side Plank", "Core", 3),
      ex("Dead Bug", "Core", 0, 3, 12),
      ex("Mountain Climbers", "Core", 0, 3, 30),
      ex("Ab Wheel", "Core", 0, 3, 10),
    ] },
  ];
  if (packId === "pack-ppl") return [
    { id: rid(), name: "PPL — PUSH", exercises: [
      ex("Panca Piana Bilanciere", "Petto", 40, 4, 8),
      ex("Panca Inclinata Manubri", "Petto", 16, 3, 10),
      ex("Military Press", "Spalle", 25, 4, 8),
      ex("Alzate Laterali", "Spalle", 8, 3, 15),
      ex("Pushdown Tricipiti", "Tricipiti", 20, 3, 12),
    ] },
    { id: rid(), name: "PPL — PULL", exercises: [
      ex("Trazioni", "Dorso", 0, 4, 6),
      ex("Rematore Bilanciere", "Dorso", 40, 4, 8),
      ex("Pulley Basso", "Dorso", 45, 3, 10),
      ex("Face Pull", "Spalle", 15, 3, 15),
      ex("Curl Bilanciere", "Bicipiti", 20, 3, 10),
    ] },
    { id: rid(), name: "PPL — LEGS", exercises: [
      ex("Squat Bilanciere", "Gambe", 60, 4, 6),
      ex("Leg Press", "Gambe", 120, 3, 10),
      ex("Stacco Rumeno", "Gambe", 50, 3, 10),
      ex("Leg Curl Sdraiato", "Gambe", 30, 3, 12),
      ex("Calf Raise in Piedi", "Gambe", 40, 4, 15),
    ] },
  ];
  return [];
}
