import React, { useState, useEffect, useRef } from "react";
import { Plus, Check, Play, Trash2, Info, Pause, GripVertical, ArrowLeftRight, Lock, LockOpen, TrendingUp } from "lucide-react";
import { ExerciseInfoModal } from "./ExerciseInfoModal";
import { ProgressionModal } from "./ProgressionModal";
import { ExercisePickerModal } from "./ExercisePicker";
import { FloatingTimer } from "./FloatingTimer";
import { MachineScan } from "./MachineScan";
import { ResultsScreen } from "./ResultsScreen";
import { SetMenu } from "./SetMenu";
import { dlStart } from "../lib/dnd";
import { exMode, holdSets, isDumbbell, isHold } from "../lib/exercises";
import { markProgDone, repVal, repsNum } from "../lib/progression";
import { tr } from "../lib/i18n";
import { Btn, Overlay, Panel } from "../ui";

/* ---------------- Sessione di allenamento attiva ---------------- */
export function SessionView({ standard, onWorkoutDone, premium, session, setSession, prs, setPrs, addXp, fireToast, routines, setRoutines, setHistory, exitToHome, onResultsClose }) {
  const [info, setInfo] = useState(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [sessionPrCount, setSessionPrCount] = useState(0);
  const [results, setResults] = useState(null); // rapporto missione animato
  const [runKey, setRunKey] = useState(null); // cronometro attivo per esercizi a tempo: "ei-si"
  const [setMenu, setSetMenu] = useState(null); // mini menu serie: { ei, si, x, y }
  const [showPicker, setShowPicker] = useState(false); // elenco esercizi (aggiungi/sostituisci)
  const [replaceIdx, setReplaceIdx] = useState(null); // esercizio in fase di sostituzione
  const [progIdx, setProgIdx] = useState(null); // esercizio con piano settimanale aperto (📈)
  const [confirmExDel, setConfirmExDel] = useState(null); // eliminazione esercizio in attesa di conferma
  /* Blocco modifiche: solo spunta serie + timer. Parte ATTIVO di default e
     ricorda l'ultima scelta (globale, vale per ogni allenamento in corso). */
  const [locked, setLocked] = useState(() => {
    try { return localStorage.getItem("gq_session_lock") !== "0"; } catch { return true; }
  });
  const toggleLock = () => {
    setLocked((l) => {
      try { localStorage.setItem("gq_session_lock", l ? "0" : "1"); } catch { /* ignore */ }
      return !l;
    });
    setSetMenu(null); setConfirmExDel(null); setReplaceIdx(null); setShowPicker(false);
  };
  const timerRef = useRef(null); // ref per triggerare il timer di recupero programmaticamente
  const replaceRef = useRef(null); // card "SOSTITUZIONE ATTIVA": ci si scrolla appena si attiva

  /* clic sull'icona di sostituzione → la pagina scorre da sé fino alla card che spiega cosa fare */
  useEffect(() => {
    if (replaceIdx != null && replaceRef.current)
      replaceRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [replaceIdx]);

  /* Marca la serie come riscaldamento (W) o normale */
  const toggleWarmup = (ei, si) => upd((s) => ({
    ...s,
    exercises: s.exercises.map((e, i) => i !== ei ? e : {
      ...e, sets: e.sets.map((x, j) => j !== si ? x : { ...x, warmup: !x.warmup }),
    }),
  }));

  /* Gestione esercizi in sessione: aggiungi / elimina / sostituisci */
  const makeEx = (name, group) => group === "Cardio"
    ? { name, group, mode: "time", note: "", sets: [{ sec: 600, dist: "", elapsed: 0, done: false }] }
    : isHold(name)
      ? { name, group, mode: "hold", note: "", sets: holdSets() }
      : { name, group, note: "", rest: 90, sets: [{ w: 20, r: 10, done: false }, { w: 20, r: 10, done: false }, { w: 20, r: 10, done: false }] };

  /* Aggiunta multipla dal popup: una toast sola alla fine, niente duplicati */
  const addExercises = (list) => {
    const fresh = list.filter(({ name }) => !session.exercises.some((e) => e.name === name));
    setShowPicker(false);
    if (!fresh.length) return;
    upd((s) => ({ ...s, exercises: [...s.exercises, ...fresh.map(({ name, group }) => makeEx(name, group))] }));
    fireToast({ title: tr("◈ ESERCIZI AGGIUNTI"), sub: fresh.map((f) => tr(f.name)).join(", ") });
  };

  const removeExercise = (ei) => {
    if (runKey && Number(runKey.split("-")[0]) === ei) setRunKey(null);
    upd((s) => ({ ...s, exercises: s.exercises.filter((_, i) => i !== ei) }));
  };

  /* Sostituisce l'esercizio ei: conserva serie e flag done se resta forza→forza,
     converte le serie se cambia modalità (forza↔cardio) */
  const replaceExercise = (ei, name, group) => {
    const target = group === "Cardio" ? "time" : isHold(name) ? "hold" : undefined;
    if (runKey && Number(runKey.split("-")[0]) === ei) setRunKey(null);
    upd((s) => ({
      ...s,
      exercises: s.exercises.map((e, i) => {
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
    setShowPicker(false);
    fireToast({ title: tr("◈ ESERCIZIO SOSTITUITO"), sub: tr(name) });
  };

  /* Scelta dal popup in modalità sostituzione */
  const pickReplace = (name, group) => { if (replaceIdx != null) replaceExercise(replaceIdx, name, group); };

  /* Cronometro cardio/tenute: incrementa elapsed della riga attiva.
     Basato su timestamp con catch-up: in background i tick vengono sospesi,
     ma alla riattivazione vengono recuperati tutti i secondi realmente trascorsi. */
  useEffect(() => {
    if (!runKey) return;
    let last = Date.now();
    const step = () => {
      const now = Date.now();
      const delta = Math.floor((now - last) / 1000);
      if (delta <= 0) return;
      last += delta * 1000;
      const [ei, si] = runKey.split("-").map(Number);
      setSession((s) => ({
        ...s,
        exercises: s.exercises.map((e, i) => i !== ei ? e : {
          ...e, sets: e.sets.map((st, j) => j !== si ? st : { ...st, elapsed: (st.elapsed || 0) + delta }),
        }),
      }));
    };
    const t = setInterval(step, 1000);
    const onVis = () => { if (document.visibilityState === "visible") step(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onVis); };
  }, [runKey]);

  const upd = (fn) => setSession((s) => fn(s));

  const updateSet = (ei, si, field, val) => upd((s) => ({
    ...s,
    exercises: s.exercises.map((e, i) => i !== ei ? e : {
      ...e, sets: e.sets.map((st, j) => j !== si ? st : { ...st, [field]: field === "r" ? repVal(val) : (val === "" ? "" : Number(val)) }),
    }),
  }));

  const updateNote = (ei, val) => upd((s) => ({
    ...s, exercises: s.exercises.map((e, i) => i !== ei ? e : { ...e, note: val }),
  }));

  const toggleSet = (ei, si) => {
    const ex = session.exercises[ei];
    const st = ex.sets[si];
    if (st.done && runKey === `${ei}-${si}`) setRunKey(null);
    upd((s) => ({
      ...s,
      exercises: s.exercises.map((e, i) => i !== ei ? e : {
        ...e, sets: e.sets.map((x, j) => j !== si ? x : { ...x, done: !x.done }),
      }),
    }));
    if (!st.done) {
      addXp(10);
      if (runKey === `${ei}-${si}`) setRunKey(null);
      // Avvia automaticamente il timer di recupero con il rest time dell'esercizio
      const restSec = ex.rest || 90;
      timerRef.current?.start(restSec);
      if (ex.mode !== "time" && !st.warmup && (st.w || 0) > (prs[ex.name] || 0)) {
        setPrs((p) => ({ ...p, [ex.name]: st.w }));
        setSessionPrCount((c) => c + 1);
        fireToast({ title: tr("▲ NEW RECORD"), sub: `${tr(ex.name)} — ${st.w} KG`, color: "#ffd76a" });
      }
    }
  };

  const addSet = (ei) => upd((s) => ({
    ...s,
    exercises: s.exercises.map((e, i) => i !== ei ? e : {
      ...e,
      sets: [...e.sets, exMode(e) === "time"
        ? { sec: 600, dist: "", elapsed: 0, done: false }
        : exMode(e) === "hold"
          ? { sec: e.sets[e.sets.length - 1]?.sec || 60, elapsed: 0, done: false }
          : { ...e.sets[e.sets.length - 1], done: false }],
    }),
  }));

  const removeSet = (ei, si) => {
    if (runKey === `${ei}-${si}`) setRunKey(null);
    upd((s) => ({
      ...s,
      exercises: s.exercises.map((e, i) => i !== ei ? e : {
        ...e, sets: e.sets.filter((_, j) => j !== si),
      }).filter((e) => e.sets.length > 0),
    }));
  };

  /* Riordino trascinando: mette in pausa l'eventuale cronometro attivo */
  const moveEx = (from, to) => {
    if (runKey) setRunKey(null);
    upd((s) => {
      const exs = [...s.exercises];
      const [m] = exs.splice(from, 1);
      exs.splice(to, 0, m);
      return { ...s, exercises: exs };
    });
  };

  const moveSet = (ei, from, to) => {
    if (runKey) setRunKey(null);
    upd((s) => ({
      ...s,
      exercises: s.exercises.map((e, i) => {
        if (i !== ei) return e;
        const sets = [...e.sets];
        const [m] = sets.splice(from, 1);
        sets.splice(to, 0, m);
        return { ...e, sets };
      }),
    }));
  };

  const fmt = (sec) => `${Math.floor((sec || 0) / 60)}:${String((sec || 0) % 60).padStart(2, "0")}`;

  const volume = session.exercises.reduce((v, e) => e.mode === "time" ? v :
    v + e.sets.filter((s) => s.done && !s.warmup).reduce((a, s) => a + (Number(s.w) || 0) * repsNum(s.r), 0), 0);
  const cardioSec = session.exercises.reduce((v, e) => e.mode !== "time" ? v :
    v + e.sets.reduce((a, s) => a + (s.elapsed || 0), 0), 0);
  const totalSets = session.exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const durMin = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));

  /* Fine allenamento: record + eventuale aggiornamento del modello base */
  const complete = (alsoTemplate) => {
    if (alsoTemplate) {
      setRoutines((rs) => rs.map((r) => r.id !== session.routineId ? r : {
        ...r,
        name: session.name,
        exercises: session.exercises.map((e) => ({
          ...e, sets: e.sets.map((s) => ({ ...s, done: false, elapsed: 0 })),
        })),
      }));
    }
    /* progressione: segna la settimana corrente della scheda come completata
       (l'avanzamento avviene poi al cambio di settimana di calendario) */
    setRoutines((rs) => rs.map((r) => (r.id === session.routineId ? (markProgDone(r) || r) : r)));
    setHistory((h) => [{
      date: new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }),
      ts: Date.now(),
      routineId: session.routineId,
      name: session.name,
      sets: doneSets,
      duration: `${durMin}m`,
      volume,
      cardio: Math.round(cardioSec / 60),
      pr: sessionPrCount,
      exercises: session.exercises, // dettaglio completo per il report
    }, ...(h || [])].slice(0, 30));
    addXp(60);
    setRunKey(null);
    const bonusXp = 60; // i +10 a serie sono già stati accreditati in diretta
    const qr = onWorkoutDone ? onWorkoutDone({
      workouts: 1, sets: doneSets, volume, cardio: Math.round(cardioSec / 60), pr: sessionPrCount,
    }) : { quests: [], questXp: 0 };
    setFinishing(false);
    setResults({
      name: session.name,
      quests: qr.quests,
      xpGain: bonusXp + qr.questXp,
      xpBefore: window.__gqXpSnap ? window.__gqXpSnap.xp : 0,
      levelBefore: window.__gqXpSnap ? window.__gqXpSnap.level : 1,
    });
  };

  return (
    <div className="fade-in stack" style={{ maxWidth: 640, paddingBottom: 70 }}>
      {info && <ExerciseInfoModal name={info.name} group={info.group} ex={info} onClose={() => setInfo(null)} />}
      {/* 📈 piano settimanale del SOLO esercizio: si vede e si modifica anche
          durante la sessione; il salvataggio aggiorna subito la scheda (autosave
          cloud), le serie già caricate in questa sessione restano invariate */}
      {progIdx != null && session.exercises[progIdx] && (
        <ProgressionModal ex={session.exercises[progIdx]}
          routineProg={(routines || []).find((r) => r.id === session.routineId)?.progression}
          onClose={() => setProgIdx(null)}
          onSave={(p) => {
            const exName = session.exercises[progIdx].name;
            setRoutines((rs) => rs.map((r) => r.id !== session.routineId ? r : {
              ...r, exercises: r.exercises.map((x) => x.name === exName ? { ...x, progression: p } : x),
            }));
            upd((s) => ({ ...s, exercises: s.exercises.map((x, i) => i !== progIdx ? x : { ...x, progression: p, progTotal: p.weeks?.length || x.progTotal }) }));
            setProgIdx(null);
            fireToast({ title: tr("◈ PROGRESSIONE SALVATA"), sub: tr("Le serie di questa sessione non cambiano") });
          }} />
      )}
      {setMenu && (
        <SetMenu isTime={["time", "hold"].includes(exMode(session.exercises[setMenu.ei]))}
          warmup={!!session.exercises[setMenu.ei].sets[setMenu.si].warmup}
          onToggleWarmup={() => toggleWarmup(setMenu.ei, setMenu.si)}
          onDelete={() => removeSet(setMenu.ei, setMenu.si)}
          onClose={() => setSetMenu(null)} />
      )}
      {results && <ResultsScreen standard={standard} results={results} onClose={() => { if (onResultsClose) onResultsClose(); else { setSession(null); exitToHome(); } }} />}
      <FloatingTimer ref={timerRef} />
      {!locked && (
        <MachineScan premium={premium} variant="float" fireToast={fireToast}
          currentNames={session.exercises.map((e) => e.name)}
          onAdd={(name, group) => upd((s) => ({ ...s, exercises: [...s.exercises, makeEx(name, group)] }))} />
      )}


      {/* Conferma uscita: la sessione resta attiva */}
      {confirmExit && (
        <Overlay>
        <div className="modal-back" onClick={() => setConfirmExit(false)}>
          <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="f-hud t-amber" style={{ fontWeight: 700, letterSpacing: ".15em", marginBottom: 8 }}>{tr("SESSIONE ANCORA ATTIVA")}</div>
            <div className="tiny t-dim" style={{ lineHeight: 1.6, marginBottom: 16 }}>
              Uscendo la sessione resta in corso: la ritrovi in Training e ci rientri anche
              se chiudi l'app. Per registrare l'allenamento usa "Termina".
            </div>
            <div className="row g8">
              <Btn onClick={() => setConfirmExit(false)} style={{ flex: 1 }}>{tr("Resta")}</Btn>
              <Btn primary onClick={() => { setConfirmExit(false); exitToHome(); }} style={{ flex: 1 }}>{tr("Esci ›")}</Btn>
            </div>
          </div>
        </div>
        </Overlay>
      )}

      {/* Riepilogo finale + salvataggio nel modello */}
      {finishing && (
        <Overlay>
        <div className="modal-back">
          <div className="modal-box cham fade-in">
            <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".2em", fontSize: 15, marginBottom: 4 }}>{tr("◈ MISSION COMPLETE")}</div>
            <div className="tiny t-faint" style={{ marginBottom: 14 }}>{session.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                ["DURATA", `${durMin} min`, "t-bright"],
                ["SERIE", `${doneSets}/${totalSets}`, "t-bright"],
                ["VOLUME", `${volume.toLocaleString()} kg`, "t-cyan"],
                ["CARDIO", `${Math.round(cardioSec / 60)} min`, "t-cyan"],
                ["XP", "+" + (60 + doneSets * 10), "t-amber"],
                ["RECORD", sessionPrCount > 0 ? `🏆 ${sessionPrCount}` : "—", "t-amber"],
              ].map(([l, v, c]) => (
                <div key={l} className="cham-s" style={{ padding: "10px 12px", background: "var(--card)", border: "1px solid var(--soft)" }}>
                  <div className="micro">{l}</div>
                  <div className={`f-hud ${c}`} style={{ fontWeight: 700, fontSize: 17 }}>{v}</div>
                </div>
              ))}
            </div>
            <div className="tiny t-dim" style={{ lineHeight: 1.6, marginBottom: 12 }}>
              Vuoi salvare le modifiche fatte in sessione (pesi, serie, nome, note) anche nel <span className="t-cyan">{tr("modello base")}</span> della scheda?
            </div>
            <div className="stack-s">
              <Btn primary full onClick={() => complete(true)}>{tr("Sì, aggiorna il modello ✓")}</Btn>
              <Btn full onClick={() => complete(false)}>{tr("No, salva solo il record")}</Btn>
              <button onClick={() => setFinishing(false)} className="tap micro t-faint" style={{ cursor: "pointer", padding: 6 }}>{tr("‹ torna alla sessione")}</button>
            </div>
          </div>
        </div>
        </Overlay>
      )}

      <div className="sticky-hud stack">
      <div className="row between g8">
        <Btn small onClick={() => setConfirmExit(true)}>{tr("‹ Esci")}</Btn>
        <input className="hud-input cham-s f-hud" value={session.name} readOnly={locked}
          onChange={(e) => upd((s) => ({ ...s, name: e.target.value.toUpperCase() }))}
          style={{ textAlign: "center", fontWeight: 700, letterSpacing: ".12em", fontSize: 13, flex: 1, opacity: locked ? .6 : 1 }} />
        <button onClick={toggleLock} className="info-btn cham-s tap"
          title={tr(locked ? "Sblocca modifiche" : "Blocca modifiche")}
          style={{ padding: "7px 9px", ...(locked ? { color: "#ffd76a", borderColor: "#ffd76a" } : {}) }}>
          {locked ? <Lock size={12} /> : <LockOpen size={12} />}
        </button>
        <Btn small primary onClick={() => setFinishing(true)}>{tr("Termina ✓")}</Btn>
      </div>
      {locked && (
        <div className="micro" style={{ textAlign: "center", color: "#b8860b", letterSpacing: ".14em", marginTop: 6 }}>
          🔒 {tr("MODIFICHE BLOCCATE")} — {tr("solo spunta serie e timer")}
        </div>
      )}

      <Panel style={{ padding: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center" }}>
          <div>
            <div className="f-hud t-cyan" style={{ fontWeight: 700, fontSize: 16 }}>{volume.toLocaleString()}</div>
            <div className="micro">{tr("VOLUME KG")}</div>
          </div>
          <div>
            <div className="f-hud t-bright" style={{ fontWeight: 700, fontSize: 16 }}>{doneSets}<span className="t-faint">/{totalSets}</span></div>
            <div className="micro">{tr("SERIE")}</div>
          </div>
          <div>
            <div className="f-hud t-bright" style={{ fontWeight: 700, fontSize: 16 }}>{durMin}<span className="t-faint">m</span></div>
            <div className="micro">{tr("DURATA")}</div>
          </div>
        </div>
        {/* settimana di progressione in EVIDENZA nella parte alta */}
        {session.exercises.some((e) => e.progWeek) && (() => {
          const p = session.exercises.find((e) => e.progWeek);
          return (
            <div className="row" style={{ justifyContent: "center", marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,215,106,.25)" }}>
              <span className="chip cham-s" style={{ borderColor: "#ffd76a", color: "#ffd76a", fontWeight: 700, fontSize: 11, letterSpacing: ".12em", padding: "5px 12px" }}>
                <TrendingUp size={11} style={{ display: "inline", verticalAlign: -1, marginRight: 4 }} />
                {tr("SETTIMANA")} {p.progWeek}{p.progTotal ? `/${p.progTotal}` : ""} · {tr("PROGRESSIONE ATTIVA")}
              </span>
            </div>
          );
        })()}
      </Panel>
      </div>


      <div data-dl className="stack" style={{ marginTop: 0 }}>
      {session.exercises.map((ex, ei) => (
        <Panel key={ei}>
          {/* riga 0: gruppo · PR (sopra il nome) · riga 1: nome + azioni · riga 2: INFO · settimana · recupero */}
          <div className="micro t-dim" style={{ marginBottom: 3, marginLeft: locked ? 0 : 29 }}>
            {tr(ex.group || "").toUpperCase()}{!exMode(ex) && ` · PR ${prs[ex.name] || "—"} KG`}{exMode(ex) === "hold" && ` · ${tr("A TEMPO")}`}
          </div>
          <div className="row between g8" style={{ marginBottom: 6, alignItems: "flex-start" }}>
            {!locked && (
              <span className="drag-handle" title={tr("Trascina per riordinare")}
                onPointerDown={(e) => dlStart(e, moveEx)} style={{ marginTop: 4, flexShrink: 0 }}><GripVertical size={15} /></span>
            )}
            <div className="grow" style={{ marginRight: 14, minWidth: 0 }}>
              <span className="t-bright" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{tr(ex.name)}</span>
            </div>
            {confirmExDel === ei ? (
              <button onClick={() => { removeExercise(ei); setConfirmExDel(null); }}
                className="info-btn cham-s tap" style={{ color: "var(--cyan)", borderColor: "var(--cyan)", flexShrink: 0, marginTop: 2, marginLeft: "auto" }}>
                {tr("Conferma eliminazione")}</button>
            ) : (
              <div className="row" style={{ gap: 14, flexShrink: 0, paddingTop: 4, marginLeft: "auto" }}>
                {/* 📈 piano settimanale di QUESTO esercizio: in alto a destra,
                    accanto a cambio/elimina; accessibile anche a modifiche bloccate */}
                {ex.progression?.weeks?.length > 0 && (
                  <span onClick={() => setProgIdx(ei)} className="tap icon-tap"
                    title={tr("Vedi e modifica la progressione di questo esercizio")}
                    style={{ cursor: "pointer", color: "#ffd76a" }}>
                    <TrendingUp size={16} /></span>
                )}
                {!locked && (
                  <>
                    <span onClick={() => { setReplaceIdx(ei); setShowPicker(true); }}
                      className="tap icon-tap" title={tr("Sostituisci esercizio")}
                      style={{ cursor: "pointer", color: "var(--dim)" }}>
                      <ArrowLeftRight size={16} /></span>
                    <span onClick={() => setConfirmExDel(ei)} className="tap icon-tap" title={tr("Elimina esercizio")}
                      style={{ cursor: "pointer", color: "var(--faint)" }}><Trash2 size={16} /></span>
                  </>
                )}
              </div>
            )}
          </div>
          {/* seconda riga a tutta larghezza: non viene più schiacciata dalle icone azione;
              se proprio non ci sta scorre in orizzontale invece di tagliarsi */}
          <div className="micro ex-meta" style={{ marginBottom: 10, marginLeft: locked ? 0 : 29 }}>
            {/* un solo pulsante INFO: diventa ambra quando il PT ha aggiunto note/video
                e il popup incorpora esecuzione + note personalizzate */}
            <button onClick={() => setInfo(ex)}
              className={(ex.ptNote || ex.ptVideo) ? "pt-btn tap" : "info-btn cham-s tap"}
              title={(ex.ptNote || ex.ptVideo) ? tr("Note e video del tuo PT") : undefined}>
              <Info size={11} /> INFO
            </button>
            {ex.progWeek && (
              <span className="chip cham-s" style={{ borderColor: "#ffd76a", color: "#ffd76a" }}
                title={`${tr("SETTIMANA")} ${ex.progWeek}${ex.progTotal ? `/${ex.progTotal}` : ""} — ${tr("Progressione settimanale attiva")}`}>
                SETT. {ex.progWeek}{ex.progTotal ? `/${ex.progTotal}` : ""}
              </span>
            )}
            {/* recupero: sempre ancorato a destra nella riga */}
            <span className="row g4" style={{ alignItems: "center", marginLeft: "auto" }}>
              <span className="t-faint">REC</span>
              <input type="number" inputMode="numeric" readOnly={locked}
                value={ex.rest ?? 90}
                onChange={(e) => upd((s) => ({
                  ...s,
                  exercises: s.exercises.map((x, i) => i !== ei ? x : { ...x, rest: e.target.value === "" ? "" : Number(e.target.value) }),
                }))}
                className="hud-input cham-s"
                style={{ width: 42, textAlign: "center", padding: "4px 2px", fontSize: 11 }} />
              <span className="t-faint">s</span>
            </span>
          </div>
          <input className="hud-input cham-s" value={ex.note || ""} readOnly={locked} onChange={(e) => updateNote(ei, e.target.value)}
            placeholder={tr("Note esercizio...")} style={{ fontSize: 12, padding: "6px 8px", marginBottom: 10, color: "#8fb2c9", opacity: locked ? .6 : 1 }} />

          {exMode(ex) === "time" || exMode(ex) === "hold" ? (
            <>
              <div className="set-grid-t micro" style={{ marginBottom: 4, padding: "0 4px" }}>
                <span></span><span>{tr("SET")}</span><span>{tr("TEMPO")}</span><span>{exMode(ex) === "time" ? tr("KM") : tr("SEC")}</span><span></span>
              </div>
              <div data-dl>
              {ex.sets.map((s, si) => (
                <div key={si} className={`set-grid-t cham-s ${s.done ? "set-done" : ""}`} style={{ marginBottom: 6, padding: 4 }}>
                  {!locked ? (
                    <span className="drag-handle" title={tr("Trascina per riordinare")}
                      onPointerDown={(e) => dlStart(e, (f, t) => moveSet(ei, f, t))}><GripVertical size={12} /></span>
                  ) : <span />}
                  <button className="set-chip cham-s" title={tr("Opzioni serie")} disabled={locked}
                    onClick={(e) => { if (locked) return; e.stopPropagation(); setSetMenu({ ei, si, x: e.clientX, y: e.clientY }); }}>
                    {si + 1}
                  </button>
                  <div className="row g8" style={{ alignItems: "center" }}>
                    <button onClick={() => setRunKey(runKey === `${ei}-${si}` ? null : `${ei}-${si}`)}
                      className={`check-btn cham-s tap ${runKey === `${ei}-${si}` ? "check-on" : ""}`}
                      style={{ width: 34, height: 34 }} disabled={s.done}>
                      {runKey === `${ei}-${si}` ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                    <span className={`f-hud ${runKey === `${ei}-${si}` ? "t-amber" : "t-bright"}`} style={{ fontSize: 17, fontWeight: 700 }}>
                      {fmt(s.elapsed)}
                    </span>
                  </div>
                  {exMode(ex) === "time" ? (
                    <input className="hud-input cham-s" type="number" inputMode="decimal" value={s.dist} readOnly={locked}
                      placeholder="—" onChange={(e) => updateSet(ei, si, "dist", e.target.value)}
                      style={{ textAlign: "center", padding: "8px 4px" }} />
                  ) : (
                    <input className="hud-input cham-s" type="number" inputMode="numeric" value={s.sec || ""} readOnly={locked}
                      placeholder="60" title={tr("Obiettivo secondi")}
                      onChange={(e) => updateSet(ei, si, "sec", e.target.value)}
                      style={{ textAlign: "center", padding: "8px 4px" }} />
                  )}
                  <button onClick={() => toggleSet(ei, si)} className={`check-btn cham-s tap ${s.done ? "check-on" : ""}`}>
                    <Check size={15} strokeWidth={3} />
                  </button>
                </div>
              ))}
              </div>
            </>
          ) : (
            <>
              {isDumbbell(ex.name) && (
                <div className="micro t-faint" style={{ marginBottom: 6, lineHeight: 1.5 }}>ⓘ {tr("Inserisci il peso del singolo manubrio — il totale è calcolato da sé")}</div>
              )}
              <div className="set-grid micro" style={{ marginBottom: 4, padding: "0 4px" }}>
                <span></span><span>{tr("SET")}</span><span>{tr("KG")}</span><span>{tr("REPS")}</span><span></span>
              </div>
              <div data-dl>
              {ex.sets.map((s, si) => (
                <div key={si} className={`set-grid cham-s ${s.done ? "set-done" : ""} ${s.warmup ? "set-warmup" : ""}`} style={{ marginBottom: 6, padding: 4 }}>
                  {!locked ? (
                    <span className="drag-handle" title={tr("Trascina per riordinare")}
                      onPointerDown={(e) => dlStart(e, (f, t) => moveSet(ei, f, t))}><GripVertical size={12} /></span>
                  ) : <span />}
                  <button className={`set-chip cham-s ${s.warmup ? "warmup" : ""}`} title={tr("Opzioni serie")} disabled={locked}
                    onClick={(e) => { if (locked) return; e.stopPropagation(); setSetMenu({ ei, si, x: e.clientX, y: e.clientY }); }}>
                    {s.warmup ? "W" : ex.sets.slice(0, si + 1).filter((x) => !x.warmup).length}
                  </button>
                  <input className="hud-input cham-s" type="number" inputMode="decimal" value={s.w} readOnly={locked}
                    onChange={(e) => updateSet(ei, si, "w", e.target.value)} style={{ textAlign: "center", padding: "8px 4px", opacity: locked ? .6 : 1 }} />
                  <input className="hud-input cham-s" type="text" inputMode="decimal" value={s.r} readOnly={locked}
                    title={tr("Puoi usare un intervallo, es. 8-10")}
                    onChange={(e) => updateSet(ei, si, "r", e.target.value)} style={{ textAlign: "center", padding: "8px 4px", opacity: locked ? .6 : 1 }} />
                  <button onClick={() => toggleSet(ei, si)} className={`check-btn cham-s tap ${s.done ? "check-on" : ""}`}>
                    <Check size={15} strokeWidth={3} />
                  </button>
                </div>
              ))}
              </div>
            </>
          )}
          {!locked && <button onClick={() => addSet(ei)} className="dash-btn cham-s tap" style={{ marginTop: 4 }}>{tr("+ SERIE")}</button>}
        </Panel>
      ))}
      </div>

      {/* Gestione esercizi in sessione: l'elenco si apre in un popup (anche per la sostituzione) */}
      {!locked && (
        <button onClick={() => { setReplaceIdx(null); setShowPicker(true); }}
          className="dash-btn cham-s tap" style={{ padding: 13, fontWeight: 700, letterSpacing: ".15em" }}>
          <Plus size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Aggiungi esercizio")}
        </button>
      )}
      {showPicker && (
        <ExercisePickerModal
          activeNames={session.exercises.map((e) => e.name)}
          mode={replaceIdx != null ? "replace" : "add"}
          replacing={replaceIdx != null ? session.exercises[replaceIdx]?.name : null}
          onPick={pickReplace}
          onAdd={addExercises}
          onClose={() => { setShowPicker(false); setReplaceIdx(null); }} />
      )}

      {/* Termina anche in fondo: niente scroll fino in cima a fine allenamento */}
      <Btn primary full onClick={() => setFinishing(true)} style={{ padding: 14 }}>{tr("Termina ✓")}</Btn>
    </div>
  );
}
