import React, { useState } from "react";
import { Info } from "lucide-react";
import { ExerciseInfoModal } from "./ExerciseInfoModal";
import { EXERCISE_DB } from "../lib/exercises";
import { tr } from "../lib/i18n";
import { Panel } from "../ui";

/* ---------------- Elenco esercizi condiviso (editor + sessione attiva) ----------------
   Filtro + chip per gruppo muscolare. onPick(name, group) decide l'azione del contesto
   (aggiungi / togli / sostituisci); activeNames evidenzia i già presenti. */
export function ExercisePicker({ activeNames = [], onPick }) {
  const [q, setQ] = useState("");
  const [info, setInfo] = useState(null);
  return (
    <>
      {info && <ExerciseInfoModal name={info.name} group={info.group} ex={info} onClose={() => setInfo(null)} />}
      <input className="hud-input cham-s" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Filtra esercizi...")} />
      {Object.entries(EXERCISE_DB).map(([group, list]) => {
        const shown = list.filter((e) => e.toLowerCase().includes(q.toLowerCase()));
        if (!shown.length) return null;
        return (
          <Panel key={group} style={{ padding: 12 }}>
            <div className="f-hud t-cyan" style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".25em", marginBottom: 8 }}>{tr(group).toUpperCase()}</div>
            <div className="row wrap g6">
              {shown.map((ex) => {
                const on = activeNames.includes(ex);
                return (
                  <button key={ex} onClick={() => onPick(ex, group)}
                    className={`tap cham-s chip ${on ? "chip-on" : ""}`}
                    style={{ cursor: "pointer", fontSize: 12, letterSpacing: ".02em", padding: "6px 12px", fontFamily: "'Rajdhani',sans-serif", textTransform: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {ex}
                    <span onClick={(e) => { e.stopPropagation(); setInfo({ name: ex, group }); }}
                      className="tap icon-tap" style={{ color: on ? "#04121d" : "#3f637c" }} title={tr("Info esercizio")}><Info size={12} /></span>
                  </button>
                );
              })}
            </div>
          </Panel>
        );
      })}
    </>
  );
}
