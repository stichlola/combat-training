/* Contenuti del negozio a crediti: temi extra e piani prefatti.
   Gli ID devono corrispondere a SHOP_ITEMS in api/_premium.js. */
import { Leaf, Dumbbell, Flame } from "lucide-react";
import { holdSets } from "./exercises";

export const SHOP_META = [
  { id: "theme-emerald", credits: 40, kind: "theme", Icon: Leaf,
    title: "TEMA SMERALDO",
    desc: "Una versione verde smeraldo dell'interfaccia: la attivi dal profilo quando vuoi." },
  { id: "pack-strength", credits: 50, kind: "routines", Icon: Dumbbell,
    title: "PIANO FORZA 5×5",
    desc: "Due schede complete A/B per la forza massimale: squat, panca, stacco e militari." },
  { id: "pack-core", credits: 40, kind: "routines", Icon: Flame,
    title: "PIANO 30 GG CORE",
    desc: "Scheda core intensiva da 8 esercizi per addominali d'acciaio in 30 giorni." },
];

/* Voce extra del selettore tema, visibile solo a chi ha sbloccato "theme-emerald" */
export const EMERALD_MODE = { id: "emerald", label: "Smeraldo", flag: "❖", Icon: Leaf,
  desc: "La versione base in verde smeraldo — sbloccata con i crediti" };

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
  return [];
}
