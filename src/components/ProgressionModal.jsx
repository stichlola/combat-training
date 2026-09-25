import React, { useState } from "react";
import { Plus, Trash2, TrendingUp, Copy } from "lucide-react";
import { exMode } from "../lib/exercises";
import { tr } from "../lib/i18n";
import { currentWeek, repVal } from "../lib/progression";
import { Btn, Overlay } from "../ui";

/* ---------------- Modale settimane di un esercizio ----------------
   Gestisce la tabella delle settimane (carichi/ripetizioni per settimana).
   Usato sia nell'editor scheda che durante l'allenamento in corso. */
export function ProgressionModal({ ex, routineProg, onSave, onClose, fireToast }) {
  const mode = exMode(ex); // undefined = forza · "hold" = tenuta · "time" = cardio
  /* la prima settimana parte VUOTA: i carichi li inserisce a mano l'utente/PT */
  const baseSets = () => ex.sets.map((s) => {
    const base = { ...s, done: false, elapsed: 0 };
    if (mode === "time") return { ...base, sec: "", dist: "" };
    if (mode === "hold") return { ...base, sec: "" };
    return { ...base, w: "", r: "" };
  });

  const [weeks, setWeeks] = useState(() => {
    const w = ex.progression?.weeks;
    return w && w.length ? JSON.parse(JSON.stringify(w)) : [{ sets: baseSets() }];
  });

  const curWeek = ex?.progWeek || (routineProg?.enabled ? Math.min(routineProg.week || 1, weeks.length) : null);

  const updateSet = (wi, si, field, val) => setWeeks((ws) =>
    ws.map((w, i) => i !== wi ? w : { sets: w.sets.map((s, j) => j !== si ? s : { ...s, [field]: field === "r" ? repVal(val) : (val === "" ? "" : Number(val)) }) }));

  /* la settimana aggiunta parte VUOTA: i valori li inserisce a mano l'utente/PT */
  const addWeek = () => setWeeks((ws) => [...ws, { sets: baseSets() }]);
  const removeWeek = (wi) => setWeeks((ws) => ws.length <= 1 ? ws : ws.filter((_, i) => i !== wi));

  /* singola serie dentro la settimana: si aggiunge clonando l'ultima,
     si può togliere finché ne resta almeno una */
  const addSet = (wi) => setWeeks((ws) => ws.map((w, i) => i !== wi ? w : {
    sets: [...w.sets, { ...w.sets[w.sets.length - 1], done: false }],
  }));
  const removeSet = (wi, si) => setWeeks((ws) => ws.map((w, i) =>
    i !== wi || w.sets.length <= 1 ? w : { sets: w.sets.filter((_, j) => j !== si) }));

  const [copySourceMap, setCopySourceMap] = useState({});

  /* Copia i dati (serie, carichi, ripetizioni/tempi e note) da una settimana sorgente selezionata */
  const copyFromWeek = (targetWi, sourceWi) => {
    if (!weeks[sourceWi] || targetWi === sourceWi) return;
    const prevSets = weeks[sourceWi].sets;
    setWeeks((ws) =>
      ws.map((w, i) =>
        i !== targetWi
          ? w
          : {
              ...w,
              sets: prevSets.map((s) => ({
                ...s,
                done: false,
                elapsed: 0,
              })),
              ...(ws[sourceWi].note !== undefined ? { note: ws[sourceWi].note } : {}),
            }
      )
    );
    if (fireToast) {
      fireToast({
        title: tr("◈ DATI COPIATI"),
        sub: `${tr("Settimana")} ${sourceWi + 1} → ${tr("Settimana")} ${targetWi + 1}`,
      });
    }
  };

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
              <div className="row between" style={{ marginBottom: 8, alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <span className={`f-hud ${wi + 1 === curWeek ? "t-amber" : "t-cyan"}`} style={{ fontWeight: 700, fontSize: 12, letterSpacing: ".12em" }}>
                  {tr("SETTIMANA")} {wi + 1}{wi + 1 === curWeek ? " ●" : ""}
                </span>
                <div className="row g6" style={{ alignItems: "center", marginLeft: "auto" }}>
                  {weeks.length > 1 && (
                    <div className="row g4" style={{ alignItems: "center" }}>
                      <span className="micro t-dim" style={{ fontSize: 9, fontWeight: 700, whiteSpace: "nowrap" }}>
                        {tr("Copia da:")}
                      </span>
                      <select
                        className="hud-input cham-s"
                        value={copySourceMap[wi] ?? (wi > 0 ? wi : (weeks.length > 1 ? 2 : 1))}
                        onChange={(e) => setCopySourceMap((m) => ({ ...m, [wi]: Number(e.target.value) }))}
                        style={{
                          padding: "2px 4px",
                          fontSize: 10,
                          fontWeight: 700,
                          height: 24,
                          background: "var(--card)",
                          color: "var(--text)",
                          border: "1px solid var(--soft)",
                          borderRadius: 3,
                          cursor: "pointer",
                        }}
                      >
                        {weeks.map((_, srcIdx) => {
                          if (srcIdx === wi) return null;
                          return (
                            <option key={srcIdx} value={srcIdx + 1}>
                              W{srcIdx + 1}
                            </option>
                          );
                        })}
                      </select>
                      <Btn
                        small
                        onClick={() => {
                          const srcWeekNum = copySourceMap[wi] ?? (wi > 0 ? wi : (weeks.length > 1 ? 2 : 1));
                          copyFromWeek(wi, srcWeekNum - 1);
                        }}
                        style={{
                          padding: "3px 7px",
                          fontSize: 10,
                          fontWeight: 700,
                          height: 24,
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                        title={`${tr("Copia serie e carichi da W")}${copySourceMap[wi] ?? (wi > 0 ? wi : 2)}`}
                      >
                        <Copy size={10} style={{ display: "inline", verticalAlign: -1, marginRight: 3 }} />
                        {tr("Copia")}
                      </Btn>
                    </div>
                  )}
                  {wi > 0 && (
                    <span onClick={() => removeWeek(wi)} className="tap icon-tap" title={tr("Elimina settimana")}
                      style={{ cursor: "pointer", color: "var(--faint)", marginLeft: 2 }}><Trash2 size={13} /></span>
                  )}
                </div>
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
                      <input className="hud-input cham-s" type="number" inputMode="numeric" autoComplete="off" data-lpignore="true" data-form-type="other" value={s.sec ? Math.round(s.sec / 60) : ""}
                        onChange={(e) => updateSet(wi, si, "sec", e.target.value === "" ? "" : Number(e.target.value) * 60)}
                        style={{ textAlign: "center", padding: "6px 4px", width: 64 }} />
                      <span className="micro">{tr("MIN")}</span>
                      <input className="hud-input cham-s" type="number" inputMode="decimal" autoComplete="off" data-lpignore="true" data-form-type="other" value={s.dist}
                        onChange={(e) => updateSet(wi, si, "dist", e.target.value)} placeholder="—"
                        style={{ textAlign: "center", padding: "6px 4px", width: 64 }} />
                      <span className="micro">{tr("KM")}</span>
                    </>
                  ) : mode === "hold" ? (
                    <>
                      <input className="hud-input cham-s" type="number" inputMode="numeric" autoComplete="off" data-lpignore="true" data-form-type="other" value={s.sec || ""}
                        onChange={(e) => updateSet(wi, si, "sec", e.target.value)} placeholder="60"
                        style={{ textAlign: "center", padding: "6px 4px", width: 64 }} />
                      <span className="micro">{tr("SEC")}</span>
                    </>
                  ) : (
                    <>
                      <input className="hud-input cham-s" type="number" inputMode="decimal" autoComplete="off" data-lpignore="true" data-form-type="other" value={s.w}
                        onChange={(e) => updateSet(wi, si, "w", e.target.value)}
                        style={{ textAlign: "center", padding: "6px 4px", width: 64 }} />
                      <span className="micro">{tr("KG")}</span>
                      <input className="hud-input cham-s" type="text" inputMode="decimal" autoComplete="off" data-lpignore="true" data-form-type="other" value={s.r}
                        title={tr("Puoi usare un intervallo, es. 8-10")}
                        onChange={(e) => updateSet(wi, si, "r", e.target.value)}
                        placeholder="8-10"
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

        <button
          type="button"
          onClick={addWeek}
          className="dash-btn cham-s tap"
          style={{ width: "100%", marginTop: 10, padding: 12, fontWeight: 700, letterSpacing: ".15em" }}
          title={tr("Aggiunge una nuova settimana")}
        >
          <Plus size={13} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} /> {tr("Aggiungi settimana")}
        </button>

        <div className="row g8" style={{ marginTop: 14 }}>
          <Btn onClick={onClose} style={{ flex: 1 }}>{tr("Annulla")}</Btn>
          <Btn primary onClick={() => onSave({ weeks })} style={{ flex: 2 }}>{tr("Salva progressione")}</Btn>
        </div>
      </div>
    </div>
    </Overlay>
  );
}
