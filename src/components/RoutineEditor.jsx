import React, { useState } from "react";
import { Plus, Trash2, Info, GripVertical, ArrowLeftRight, TrendingUp } from "lucide-react";
import { ExerciseInfoModal } from "./ExerciseInfoModal";
import { ProgressionModal } from "./ProgressionModal";
import { ExercisePicker } from "./ExercisePicker";
import { MachineScan } from "./MachineScan";
import { SetMenu } from "./SetMenu";
import { dlStart } from "../lib/dnd";
import { todayISO } from "../lib/progression";
import { exMode, holdSets, isDumbbell, isHold } from "../lib/exercises";
import { tr } from "../lib/i18n";
import { Btn, Panel } from "../ui";

/* ---------------- Editor modello scheda (crea + modifica, senza timer né log) ---------------- */
export function RoutineEditor({ premium, fireToast, initial, onClose, onSave, showScan = true }) {
  const [draft, setDraft] = useState(() => initial
    ? JSON.parse(JSON.stringify(initial))
    : { id: Date.now(), name: "", exercises: [] });
  const [info, setInfo] = useState(null);
  const [setMenu, setSetMenu] = useState(null); // mini menu serie: { ei, si, x, y }
  const [replaceIdx, setReplaceIdx] = useState(null); // esercizio in fase di sostituzione
  const [showPicker, setShowPicker] = useState(true); // elenco esercizi: aperto di default in modifica
  const [progIdx, setProgIdx] = useState(null); // esercizio con modale progressione aperta

  const upd = (fn) => setDraft((d) => fn(d));
  const hasEx = (name) => draft.exercises.some((e) => e.name === name);

  /* Marca la serie come riscaldamento (W) o normale */
  const toggleWarmup = (ei, si) => upd((d) => ({
    ...d,
    exercises: d.exercises.map((e, i) => i !== ei ? e : {
      ...e, sets: e.sets.map((x, j) => j !== si ? x : { ...x, warmup: !x.warmup }),
    }),
  }));

  const toggleEx = (name, group) => upd((d) => hasEx(name)
    ? { ...d, exercises: d.exercises.filter((e) => e.name !== name) }
    : {
      ...d,
      exercises: [...d.exercises, group === "Cardio"
        ? { name, group, mode: "time", note: "", sets: [{ sec: 600, dist: "", elapsed: 0, done: false }] }
        : isHold(name)
          ? { name, group, mode: "hold", note: "", sets: holdSets() }
          : { name, group, note: "", sets: [{ w: 20, r: 10, done: false }, { w: 20, r: 10, done: false }, { w: 20, r: 10, done: false }] }],
    });

  /* Sostituisce l'esercizio ei con uno nuovo: conserva le serie se resta
     forza→forza, le converte se cambia modalità (forza↔cardio) */
  const replaceExercise = (ei, name, group) => {
    const target = group === "Cardio" ? "time" : isHold(name) ? "hold" : undefined;
    upd((d) => ({
      ...d,
      exercises: d.exercises.map((e, i) => {
        if (i !== ei) return e;
        const prevTimed = ["time", "hold"].includes(exMode(e));
        const sets = target === "time"
          ? e.sets.map(() => ({ sec: 600, dist: "", elapsed: 0, done: false }))
          : target === "hold"
            ? e.sets.map(() => ({ sec: 60, elapsed: 0, done: false }))
            : prevTimed
              ? e.sets.map(() => ({ w: 20, r: 10, done: false }))
              : e.sets;
        return { ...e, name, group, mode: target, sets };
      }),
    }));
    setReplaceIdx(null);
  };

  /* Tap su un chip dell'elenco: sostituisce se in modalità sostituzione, altrimenti aggiungi/togli */
  const pickEx = (name, group) => {
    if (replaceIdx != null) { replaceExercise(replaceIdx, name, group); return; }
    toggleEx(name, group);
  };

  const updateSet = (ei, si, field, val) => upd((d) => ({
    ...d,
    exercises: d.exercises.map((e, i) => i !== ei ? e : {
      ...e, sets: e.sets.map((s, j) => j !== si ? s : { ...s, [field]: val === "" ? "" : Number(val) }),
    }),
  }));

  const removeSet = (ei, si) => upd((d) => ({
    ...d,
    exercises: d.exercises.map((e, i) => i !== ei ? e : { ...e, sets: e.sets.filter((_, j) => j !== si) })
      .filter((e) => e.sets.length > 0),
  }));

  const addSet = (ei) => upd((d) => ({
    ...d,
    exercises: d.exercises.map((e, i) => i !== ei ? e : {
      ...e,
      sets: [...e.sets, exMode(e) === "time" ? { sec: 600, dist: "", elapsed: 0, done: false }
        : exMode(e) === "hold" ? { sec: e.sets[e.sets.length - 1]?.sec || 60, elapsed: 0, done: false }
        : { ...e.sets[e.sets.length - 1], done: false }],
    }),
  }));

  /* Riordino: card esercizi e serie trascinabili su/giù dalle maniglie */
  const moveEx = (from, to) => upd((d) => {
    const exs = [...d.exercises];
    const [m] = exs.splice(from, 1);
    exs.splice(to, 0, m);
    return { ...d, exercises: exs };
  });

  const moveSet = (ei, from, to) => upd((d) => ({
    ...d,
    exercises: d.exercises.map((e, i) => {
      if (i !== ei) return e;
      const sets = [...e.sets];
      const [m] = sets.splice(from, 1);
      sets.splice(to, 0, m);
      return { ...e, sets };
    }),
  }));

  return (
    <div className="fade-in stack" style={{ maxWidth: 640, paddingBottom: 70 }}>
      {info && <ExerciseInfoModal name={info.name} group={info.group} ex={info} onClose={() => setInfo(null)} />}
      {progIdx != null && draft.exercises[progIdx] && (
        <ProgressionModal ex={draft.exercises[progIdx]}
          onSave={(p) => { upd((d) => ({ ...d, exercises: d.exercises.map((e, i) => i !== progIdx ? e : { ...e, progression: p }) })); setProgIdx(null); }}
          onClose={() => setProgIdx(null)} />
      )}
      {setMenu && (
        <SetMenu pos={setMenu} isTime={draft.exercises[setMenu.ei].mode === "time"}
          warmup={!!draft.exercises[setMenu.ei].sets[setMenu.si].warmup}
          onToggleWarmup={() => toggleWarmup(setMenu.ei, setMenu.si)}
          onDelete={() => removeSet(setMenu.ei, setMenu.si)}
          onClose={() => setSetMenu(null)} />
      )}
      <div className="row between">
        <Btn small onClick={onClose}>{tr("‹ Annulla")}</Btn>
        <span className="hud-title">{initial ? "Modifica modello" : "Nuova scheda"}</span>
        <Btn small primary disabled={!draft.name || !draft.exercises.length}
          onClick={() => onSave({ ...draft, name: draft.name.toUpperCase() })}>{tr("Salva")}</Btn>
      </div>
      <input className="hud-input cham-s" value={draft.name}
        onChange={(e) => upd((d) => ({ ...d, name: e.target.value }))} placeholder={tr("Nome scheda (es. LEG DAY)")} />

      {/* Progressione settimanale: interruttore e inizio valgono per TUTTA la scheda;
          le settimane dei singoli esercizi si gestiscono dall'icona 📈 su ogni card */}
      <div className="cham-s" style={{
        padding: "10px 12px",
        background: draft.progression?.enabled ? "rgba(255,215,106,.08)" : "#060f18",
        border: `1px solid ${draft.progression?.enabled ? "#ffd76a" : "#0e2233"}`,
      }}>
        <button onClick={() => upd((d) => ({ ...d, progression: { enabled: !d.progression?.enabled, startDate: d.progression?.startDate || todayISO() } }))}
          className="tap" style={{ width: "100%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", padding: 0 }}>
          <span className={`f-hud ${draft.progression?.enabled ? "t-amber" : "t-dim"}`} style={{ fontWeight: 700, fontSize: 12, letterSpacing: ".12em" }}>
            <TrendingUp size={13} style={{ display: "inline", verticalAlign: -2 }} /> {draft.progression?.enabled ? tr("▸ PROGRESSIONE ATTIVA") : tr("▸ PROGRESSIONE DISATTIVATA")}
          </span>
          <span style={{
            width: 38, height: 20, borderRadius: 10, position: "relative", flexShrink: 0,
            background: draft.progression?.enabled ? "#ffd76a" : "#1b3a52", transition: "background .2s",
          }}>
            <span style={{
              position: "absolute", top: 2, left: draft.progression?.enabled ? 20 : 2, width: 16, height: 16,
              borderRadius: "50%", background: draft.progression?.enabled ? "#04090f" : "#5d87a3", transition: "left .2s",
            }} />
          </span>
        </button>
        {draft.progression?.enabled && (
          <div className="row g8" style={{ marginTop: 10, alignItems: "center" }}>
            <span className="micro" style={{ flexShrink: 0 }}>{tr("INIZIO SETTIMANA 1")}</span>
            <input type="date" className="hud-input cham-s" value={draft.progression.startDate}
              onChange={(e) => upd((d) => ({ ...d, progression: { ...d.progression, startDate: e.target.value } }))}
              style={{ padding: "6px 8px", fontSize: 12 }} />
          </div>
        )}
        <div className="micro t-faint" style={{ marginTop: 8, lineHeight: 1.5 }}>
          {tr("Se attiva, aggiungi le settimane dall'icona 📈 su ogni esercizio: la scheda userà i valori della settimana corrente.")}
        </div>
      </div>

      {/* Esercizi nel modello: card e serie trascinabili per riordinare, pulsante INFO visibile */}
      <div data-dl className="stack" style={{ marginTop: 0 }}>
      {draft.exercises.map((ex, ei) => (
        <Panel key={tr(ex.name)} accent style={{ padding: 12 }}>
          <div className="row between g8" style={{ marginBottom: 4 }}>
            <div className="row g6">
              <span className="drag-handle" title={tr("Trascina per riordinare")}
                onPointerDown={(e) => dlStart(e, moveEx)}><GripVertical size={15} /></span>
              <span className="t-bright" style={{ fontSize: 14, fontWeight: 700 }}>{tr(ex.name)}</span>
              <span className="micro t-cyan" style={{ alignSelf: "center" }}>{tr(ex.group || "").toUpperCase()}</span>
              <button onClick={() => setInfo(ex)} className="info-btn cham-s tap"><Info size={11} /> INFO</button>
              {ex.progression?.enabled && (
                <span className="chip cham-s" style={{ borderColor: "#ffd76a", color: "#ffd76a", alignSelf: "center" }}>PROG ×{ex.progression.weeks?.length || 1}</span>
              )}
            </div>
            <div className="row g8" style={{ flexShrink: 0 }}>
              <span onClick={() => setProgIdx(ei)} className="tap icon-tap"
                title={tr("Progressione settimanale")}
                style={{ cursor: "pointer", color: draft.progression?.enabled && ex.progression?.weeks?.length ? "#ffd76a" : "#5d87a3" }}>
                <TrendingUp size={14} /></span>
              <span onClick={() => setReplaceIdx(replaceIdx === ei ? null : ei)} className="tap icon-tap"
                title={tr("Sostituisci esercizio")} style={{ cursor: "pointer", color: replaceIdx === ei ? "#ffd76a" : "#5d87a3" }}>
                <ArrowLeftRight size={14} /></span>
              <span onClick={() => toggleEx(ex.name, ex.group)} className="tap icon-tap" title={tr("Elimina esercizio")}
                style={{ cursor: "pointer", color: "#6e3028" }}><Trash2 size={14} /></span>
            </div>
          </div>
          <input className="hud-input cham-s" value={ex.note || ""}
            onChange={(e) => upd((d) => ({ ...d, exercises: d.exercises.map((x, i) => i !== ei ? x : { ...x, note: e.target.value }) }))}
            placeholder={tr("Note esercizio...")} style={{ fontSize: 12, padding: "6px 8px", marginBottom: 8, color: "#8fb2c9" }} />
          {isDumbbell(ex.name) && !exMode(ex) && (
            <div className="micro t-faint" style={{ marginBottom: 8, lineHeight: 1.5 }}>ⓘ {tr("Inserisci il peso del singolo manubrio — il totale è calcolato da sé")}</div>
          )}
          <div data-dl>
          {ex.sets.map((s, si) => (
            <div key={si} className={`row g8 ${s.warmup ? "set-warmup cham-s" : ""}`}
              style={{ marginBottom: 5, alignItems: "center", ...(s.warmup ? { padding: "4px 6px" } : {}) }}>
              <span className="drag-handle" title={tr("Trascina per riordinare")}
                onPointerDown={(e) => dlStart(e, (f, t) => moveSet(ei, f, t))}><GripVertical size={13} /></span>
              <button className={`set-chip cham-s ${s.warmup ? "warmup" : ""}`} title={tr("Opzioni serie")}
                onClick={(e) => { e.stopPropagation(); setSetMenu({ ei, si, x: e.clientX, y: e.clientY }); }}>
                {ex.mode !== "time" && s.warmup ? "W" : ex.mode !== "time" ? ex.sets.slice(0, si + 1).filter((x) => !x.warmup).length : si + 1}
              </button>
              {exMode(ex) === "time" ? (
                <>
                  <input className="hud-input cham-s" type="number" inputMode="numeric" value={s.sec ? Math.round(s.sec / 60) : ""}
                    onChange={(e) => updateSet(ei, si, "sec", e.target.value === "" ? "" : Number(e.target.value) * 60)}
                    style={{ textAlign: "center", padding: "7px 4px", width: 70 }} />
                  <span className="micro">{tr("MIN")}</span>
                  <input className="hud-input cham-s" type="number" inputMode="decimal" value={s.dist}
                    onChange={(e) => updateSet(ei, si, "dist", e.target.value)} placeholder="—"
                    style={{ textAlign: "center", padding: "7px 4px", width: 70 }} />
                  <span className="micro">{tr("KM")}</span>
                </>
              ) : exMode(ex) === "hold" ? (
                <>
                  <input className="hud-input cham-s" type="number" inputMode="numeric" value={s.sec || ""}
                    onChange={(e) => updateSet(ei, si, "sec", e.target.value)} placeholder="60"
                    style={{ textAlign: "center", padding: "7px 4px", width: 70 }} />
                  <span className="micro">{tr("SEC")}</span>
                </>
              ) : (
                <>
                  <input className="hud-input cham-s" type="number" inputMode="decimal" value={s.w}
                    onChange={(e) => updateSet(ei, si, "w", e.target.value)}
                    style={{ textAlign: "center", padding: "7px 4px", width: 70 }} />
                  <span className="micro">{tr("KG")}</span>
                  <input className="hud-input cham-s" type="number" inputMode="numeric" value={s.r}
                    onChange={(e) => updateSet(ei, si, "r", e.target.value)}
                    style={{ textAlign: "center", padding: "7px 4px", width: 70 }} />
                  <span className="micro">{tr("REPS")}</span>
                </>
              )}
            </div>
          ))}
          </div>
          <button onClick={() => addSet(ei)} className="dash-btn cham-s tap" style={{ marginTop: 2 }}>{tr("+ SERIE")}</button>
        </Panel>
      ))}
      </div>

      {replaceIdx != null && draft.exercises[replaceIdx] && (
        <Panel accent style={{ borderColor: "#ffd76a", padding: 10 }}>
          <div className="row between g8">
            <div className="tiny t-amber" style={{ fontWeight: 700, lineHeight: 1.5 }}>
              {tr("SOSTITUZIONE ATTIVA")}: {tr(draft.exercises[replaceIdx].name)}<br />
              <span className="t-faint" style={{ fontWeight: 500 }}>{tr("scegli il nuovo esercizio dall'elenco")}</span>
            </div>
            <Btn small onClick={() => setReplaceIdx(null)} style={{ flexShrink: 0 }}>{tr("Annulla")}</Btn>
          </div>
        </Panel>
      )}
      <button onClick={() => setShowPicker(!showPicker)}
        className="dash-btn cham-s tap" style={{ padding: 13, fontWeight: 700, letterSpacing: ".15em" }}>
        {showPicker ? tr("‹ CHIUDI ELENCO") : <><Plus size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Aggiungi esercizio")}</>}
      </button>
      {showPicker && <ExercisePicker activeNames={draft.exercises.map((e) => e.name)} onPick={pickEx} />}
      {showScan && (
        <MachineScan premium={premium} variant="float" fabBottom={92} fireToast={fireToast}
          currentNames={draft.exercises.map((e) => e.name)}
          onAdd={(name, group) => pickEx(name, group)} />
      )}
    </div>
  );
}
