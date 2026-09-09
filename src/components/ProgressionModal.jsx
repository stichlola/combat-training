import React, { useState } from "react";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { exMode } from "../lib/exercises";
import { tr } from "../lib/i18n";
import { currentWeek } from "../lib/progression";
import { Btn, Overlay } from "../ui";

/* ---------------- Modale settimane di un esercizio (solo editor scheda) ----------------
   Gestisce SOLO la tabella delle settimane (carichi/ripetizioni crescenti).
   Interruttore generale e data di inizio stanno a livello di scheda, nell'editor. */
export function ProgressionModal({ ex, routineProg, onSave, onClose }) {
  const mode = exMode(ex); // undefined = forza · "hold" = tenuta · "time" = cardio
  const baseSets = () => ex.sets.map((s) => ({ ...s, done: false, elapsed: 0 }));

  const [weeks, setWeeks] = useState(() => {
    const w = ex.progression?.weeks;
    return w && w.length ? JSON.parse(JSON.stringify(w)) : [{ sets: baseSets() }];
  });

  const curWeek = routineProg?.enabled ? Math.min(routineProg.week || 1, weeks.length) : null;

  const updateSet = (wi, si, field, val) => setWeeks((ws) =>
    ws.map((w, i) => i !== wi ? w : { sets: w.sets.map((s, j) => j !== si ? s : { ...s, [field]: val === "" ? "" : Number(val) }) }));
  const addWeek = () => setWeeks((ws) => [...ws, { sets: ws[ws.length - 1].sets.map((s) => ({ ...s })) }]);
  const removeWeek = (wi) => setWeeks((ws) => ws.length <= 1 ? ws : ws.filter((_, i) => i !== wi));
  /* singola serie dentro la settimana: si aggiunge clonando l'ultima,
     si può togliere finché ne resta almeno una */
  const addSet = (wi) => setWeeks((ws) => ws.map((w, i) => i !== wi ? w : {
    sets: [...w.sets, { ...w.sets[w.sets.length - 1], done: false }],
  }));
  const removeSet = (wi, si) => setWeeks((ws) => ws.map((w, i) =>
    i !== wi || w.sets.length <= 1 ? w : { sets: w.sets.filter((_, j) => j !== si) }));

  /* Incremento lineare automatico: prende la settimana 1 e genera le successive
     con +kg o +reps/+sec a ogni settimana (stile schede PT) */
  const [inc, setInc] = useState(""); // nessun default: lo decide l'utente
  const autoField = mode === undefined ? "w" : "sec"; // forza→kg, hold/time→sec (reps via pulsante dedicato)
  const autoFill = (field) => setWeeks((ws) => {
    const first = ws[0].sets;
    /* ogni settimana mantiene il proprio numero di serie: come base si usa la
       stessa serie della settimana 1 quando esiste, altrimenti il valore proprio */
    return ws.map((w, i) => ({
      sets: w.sets.map((s, j) => ({ ...s, [field]: (Number((first[j] || s)[field]) || 0) + (Number(inc) || 0) * i })),
    }));
  });

  return (
    <Overlay>
    <div className="modal-back" onClick={onClose}>
      <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="row between" style={{ marginBottom: 2 }}>
          <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".18em", fontSize: 13 }}>
            <TrendingUp size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("PROGRESSIONE SETTIMANALE")}
          </div>
          <span onClick={onClose} className="tap t-faint" style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0" }}>✕</span>
        </div>
        <div className="row between" style={{ alignItems: "baseline" }}>
          <div className="t-bright" style={{ fontSize: 15, fontWeight: 700 }}>{tr(ex.name)}</div>
          {curWeek && (
            <span className="chip cham-s" style={{ borderColor: "#ffd76a", color: "#ffd76a", flexShrink: 0 }}>
              {tr("ORA: SETTIMANA")} {curWeek}
            </span>
          )}
        </div>
        <div className="tiny t-faint" style={{ margin: "4px 0 12px", lineHeight: 1.5 }}>
          {tr("Programma carichi e ripetizioni settimana per settimana: a ogni nuova settimana la scheda userà automaticamente i valori successivi.")}
        </div>

        <div className="stack" style={{ maxHeight: "42vh", overflowY: "auto", paddingRight: 4 }}>
          {weeks.map((wk, wi) => (
            <div key={wi} className="cham-s" style={{ padding: "10px 12px", background: wi + 1 === curWeek ? "rgba(255,215,106,.06)" : "var(--card)", border: `1px solid ${wi + 1 === curWeek ? "#ffd76a" : "var(--soft)"}` }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <span className={`f-hud ${wi + 1 === curWeek ? "t-amber" : "t-cyan"}`} style={{ fontWeight: 700, fontSize: 12, letterSpacing: ".12em" }}>
                  {tr("SETTIMANA")} {wi + 1}{wi + 1 === curWeek ? " ●" : ""}
                </span>
                {wi > 0 && (
                  <span onClick={() => removeWeek(wi)} className="tap icon-tap" title={tr("Elimina settimana")}
                    style={{ cursor: "pointer", color: "var(--faint)" }}><Trash2 size={13} /></span>
                )}
              </div>
              {wk.sets.map((s, si) => (
                <div key={si} className="row g8" style={{ marginBottom: 5, alignItems: "center" }}>
                  <span className="micro t-faint" style={{ width: 18, textAlign: "center" }}>{si + 1}</span>
                  {wk.sets.length > 1 && (
                    <span onClick={() => removeSet(wi, si)} className="tap icon-tap" title={tr("Elimina serie")}
                      style={{ cursor: "pointer", color: "var(--faint)", order: 99, marginLeft: "auto" }}><Trash2 size={12} /></span>
                  )}
                  {mode === "time" ? (
                    <>
                      <input className="hud-input cham-s" type="number" inputMode="numeric" value={s.sec ? Math.round(s.sec / 60) : ""}
                        onChange={(e) => updateSet(wi, si, "sec", e.target.value === "" ? "" : Number(e.target.value) * 60)}
                        style={{ textAlign: "center", padding: "6px 4px", width: 64 }} />
                      <span className="micro">{tr("MIN")}</span>
                      <input className="hud-input cham-s" type="number" inputMode="decimal" value={s.dist}
                        onChange={(e) => updateSet(wi, si, "dist", e.target.value)} placeholder="—"
                        style={{ textAlign: "center", padding: "6px 4px", width: 64 }} />
                      <span className="micro">{tr("KM")}</span>
                    </>
                  ) : mode === "hold" ? (
                    <>
                      <input className="hud-input cham-s" type="number" inputMode="numeric" value={s.sec || ""}
                        onChange={(e) => updateSet(wi, si, "sec", e.target.value)} placeholder="60"
                        style={{ textAlign: "center", padding: "6px 4px", width: 64 }} />
                      <span className="micro">{tr("SEC")}</span>
                    </>
                  ) : (
                    <>
                      <input className="hud-input cham-s" type="number" inputMode="decimal" value={s.w}
                        onChange={(e) => updateSet(wi, si, "w", e.target.value)}
                        style={{ textAlign: "center", padding: "6px 4px", width: 64 }} />
                      <span className="micro">{tr("KG")}</span>
                      <input className="hud-input cham-s" type="number" inputMode="numeric" value={s.r}
                        onChange={(e) => updateSet(wi, si, "r", e.target.value)}
                        style={{ textAlign: "center", padding: "6px 4px", width: 64 }} />
                      <span className="micro">{tr("REPS")}</span>
                    </>
                  )}
                </div>
              ))}
              <button onClick={() => addSet(wi)} className="link-btn tap" style={{ fontSize: 10, marginTop: 2 }}>
                {tr("+ SERIE")}
              </button>
            </div>
          ))}
        </div>

        <Btn small onClick={addWeek} style={{ width: "100%", marginTop: 10 }}
          title={tr("Aggiunge una settimana identica all'ultima: poi modifichi solo carichi o ripetizioni")}>
          <Plus size={11} style={{ display: "inline", verticalAlign: -1 }} /> {tr("SETTIMANA")}
        </Btn>

        {/* Generatore lineare: +kg / +reps / +sec a settimana partendo dalla settimana 1 */}
        {weeks.length > 1 && (
          <div className="row g8" style={{ marginTop: 8, alignItems: "center" }}>
            <span className="micro t-faint" style={{ flexShrink: 0 }}>{tr("AUTO +")}</span>
            <input className="hud-input cham-s" type="number" inputMode="decimal" value={inc}
              onChange={(e) => setInc(e.target.value)}
              style={{ textAlign: "center", padding: "6px 4px", width: 64 }} />
            {mode === undefined ? (
              <>
                <Btn small onClick={() => autoFill("w")} disabled={!Number(inc)} style={{ flex: 1 }}>{tr("KG/SETT")}</Btn>
                <Btn small onClick={() => autoFill("r")} disabled={!Number(inc)} style={{ flex: 1 }}>{tr("REPS/SETT")}</Btn>
              </>
            ) : (
              <Btn small onClick={() => autoFill(autoField)} disabled={!Number(inc)} style={{ flex: 1 }}>{mode === "hold" ? tr("SEC/SETT") : tr("MIN/SETT")}</Btn>
            )}
          </div>
        )}

        <div className="row g8" style={{ marginTop: 14 }}>
          <Btn onClick={onClose} style={{ flex: 1 }}>{tr("Annulla")}</Btn>
          <Btn primary onClick={() => onSave({ weeks })} style={{ flex: 2 }}>{tr("Salva progressione")}</Btn>
        </div>
      </div>
    </div>
    </Overlay>
  );
}
