import React, { useState } from "react";
import { Plus, Trash2, Info, GripVertical, ArrowLeftRight, TrendingUp, StickyNote, Sparkles, Loader2, Check } from "lucide-react";
import { ExerciseInfoModal } from "./ExerciseInfoModal";
import { PtNoteModal } from "./PtNoteModal";
import { ProgressionModal } from "./ProgressionModal";
import { ExercisePickerModal } from "./ExercisePicker";
import { MachineScan } from "./MachineScan";
import { SetMenu } from "./SetMenu";
import { dlStart } from "../lib/dnd";
import { todayISO } from "../lib/progression";
import { exMode, holdSets, isDumbbell, isHold, EXERCISE_DB, GROUPS, ALL_EXERCISES, findGroup, matchToDb } from "../lib/exercises";
import { aiCall, parseLoose } from "../lib/ai";
import { tr } from "../lib/i18n";
import { Btn, Overlay, Panel } from "../ui";

/* ---------------- Editor modello scheda (crea + modifica, senza timer né log) ----------------
   ptMode: lo usa il personal trainer sulle schede del cliente — sblocca per ogni
   esercizio la sezione arancione "note PT" (note mirate + video esecuzione). */
export function RoutineEditor({ premium, fireToast, initial, onClose, onSave, showScan = true, ptMode = false }) {
  const [draft, setDraft] = useState(() => initial
    ? JSON.parse(JSON.stringify(initial))
    : { id: Date.now(), name: "", exercises: [] });
  const [info, setInfo] = useState(null);
  const [ptInfo, setPtInfo] = useState(null); // esercizio con popup note PT aperto (lettura)
  const [ptEditIdx, setPtEditIdx] = useState(null); // esercizio con sezione note PT espansa
  const [setMenu, setSetMenu] = useState(null); // mini menu serie: { ei, si, x, y }
  const [replaceIdx, setReplaceIdx] = useState(null); // esercizio in fase di sostituzione
  const [showPicker, setShowPicker] = useState(false); // elenco esercizi: si apre in popup
  const [progIdx, setProgIdx] = useState(null); // esercizio con modale progressione aperta
  const [suggestOpen, setSuggestOpen] = useState(false); // popup suggerimenti AI
  const [sugPrefs, setSugPrefs] = useState("");   // preferenze opzionali per l'AI
  const [sugBusy, setSugBusy] = useState(false);
  const [sugList, setSugList] = useState(null);   // [{ name, group, why, on }]
  const [sugErr, setSugErr] = useState(null);

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
          : { name, group, note: "", rest: 90, sets: [{ w: 20, r: 10, done: false }, { w: 20, r: 10, done: false }, { w: 20, r: 10, done: false }] }],
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
    setShowPicker(false);
  };

  /* Scansione macchinario: aggiunge l'esercizio riconosciuto */
  const pickEx = (name, group) => {
    if (replaceIdx != null) { replaceExercise(replaceIdx, name, group); return; }
    toggleEx(name, group);
  };

  /* Scelta dal popup: sostituzione singola oppure aggiunta multipla con conferma */
  const pickReplace = (name, group) => { if (replaceIdx != null) replaceExercise(replaceIdx, name, group); };
  const addExercises = (list) => {
    list.forEach(({ name, group }) => { if (!hasEx(name)) toggleEx(name, group); });
    setShowPicker(false);
    if (list.length) fireToast({ title: tr("◈ ESERCIZI AGGIUNTI"), sub: list.map((f) => tr(f.name)).join(", ") });
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

  /* Suggerimenti AI: propone esercizi del catalogo coerenti con la scheda
     (funzione premium con quota settimanale "suggest" — 1 prova gratuita) */
  const askSuggest = async () => {
    if (premium && premium.guest) return premium.open();  // ospite: nessuna funzione AI
    setSugBusy(true); setSugErr(null); setSugList(null);
    try {
      const catalog = GROUPS.map((g) => `${g}: ${EXERCISE_DB[g].join(" | ")}`).join("\n");
      const present = draft.exercises.map((e) => e.name).join(", ") || "nessuno";
      const data = await aiCall({
        model: "claude-haiku-4-5-20251001", max_tokens: 1200,
        messages: [{ role: "user", content: `Sei un personal trainer esperto. Sto componendo la scheda "${draft.name || "NUOVA SCHEDA"}".
ESERCIZI GIÀ PRESENTI: ${present}
${sugPrefs.trim() ? `PREFERENZE DELL'UTENTE (priorità massima): "${sugPrefs.trim()}"` : "NESSUNA PREFERENZA PARTICOLARE."}
CATALOGO ESERCIZI DISPONIBILI (usa SOLO questi nomi, esattamente come scritti):
${catalog}
Suggerisci da 4 a 8 esercizi da AGGIUNGERE (mai quelli già presenti), coerenti fra loro e con lo scopo della scheda.
Rispondi SOLO con JSON valido, senza markdown, senza backtick, senza testo extra:
{"suggest":[{"name":"nome esatto dal catalogo","why":"motivazione in max 60 caratteri"}]}` }],
      }, "suggest");
      if (data && data.error === "limit_reached") { if (premium) premium.open(); setSugErr(tr("Limite settimanale raggiunto")); setSugBusy(false); return; }
      if (data && data.error) throw new Error("API");
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
      const p = parseLoose(text) || {};
      const seen = new Set();
      const list = (Array.isArray(p.suggest) ? p.suggest : [])
        .map((x) => {
          const m = matchToDb(String((x && x.name) || ""));
          return { name: m.name, why: String((x && x.why) || "").slice(0, 80) };
        })
        .filter((x) => ALL_EXERCISES.includes(x.name) && !hasEx(x.name))
        .filter((x) => !seen.has(x.name) && seen.add(x.name))
        .map((x) => ({ ...x, group: findGroup(x.name) || "Altro", on: true }));
      if (!list.length) setSugErr(tr("Nessun suggerimento valido: riprova"));
      else setSugList(list);
    } catch (e) {
      setSugErr(tr("AI non disponibile: riprova tra poco"));
    }
    setSugBusy(false);
  };

  const applySuggest = () => {
    const chosen = (sugList || []).filter((x) => x.on).map((x) => ({ name: x.name, group: x.group }));
    if (chosen.length) addExercises(chosen);
    setSuggestOpen(false); setSugList(null); setSugPrefs(""); setSugErr(null);
  };

  return (
    <div className="fade-in stack" style={{ maxWidth: 640, paddingBottom: 70 }}>
      {suggestOpen && (
        <Overlay>
        <div className="modal-back" onClick={() => setSuggestOpen(false)}>
          <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="f-hud" style={{ fontWeight: 700, letterSpacing: ".16em", fontSize: 14, marginBottom: 8, color: "#a78bfa" }}>
              <Sparkles size={15} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />
              {tr("SUGGERIMENTI AI")}
            </div>
            <div className="tiny t-dim" style={{ lineHeight: 1.65, marginBottom: 12 }}>
              {tr("L'AI guarda la scheda che stai componendo e ti propone gli esercizi giusti da aggiungere.")}
            </div>
            <textarea className="hud-input cham-s" value={sugPrefs} onChange={(e) => setSugPrefs(e.target.value)} rows={2}
              placeholder={tr("Preferenze (opzionale): es. enfasi sui dorsali, niente bilanciere, solo macchine...")}
              style={{ resize: "none", fontSize: 13, marginBottom: 10 }} />
            {sugErr && <div className="tiny t-red" style={{ marginBottom: 10 }}>⚠ {sugErr}</div>}
            {sugList && (
              <div className="stack-s" style={{ marginBottom: 12, maxHeight: 260, overflowY: "auto" }}>
                {sugList.map((x, i) => (
                  <button key={x.name} onClick={() => setSugList((l) => l.map((y, j) => j === i ? { ...y, on: !y.on } : y))}
                    className="cham-s tap" style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", cursor: "pointer", textAlign: "left",
                      background: "var(--card2)", border: `1px solid ${x.on ? "#a78bfa" : "var(--soft)"}`,
                    }}>
                    <span className="cham-s" style={{
                      width: 18, height: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: x.on ? "#7c3aed" : "transparent", border: `1.5px solid ${x.on ? "#a78bfa" : "var(--soft2)"}`,
                    }}>
                      {x.on && <Check size={11} color="#fff" strokeWidth={3.5} />}
                    </span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="t-bright" style={{ fontSize: 13, fontWeight: 700 }}>{tr(x.name)}</span>
                      <span className="micro t-dim" style={{ display: "block" }}>{tr(x.group || "").toUpperCase()}{x.why ? ` · ${x.why}` : ""}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="row g8">
              <Btn onClick={() => { setSuggestOpen(false); setSugList(null); setSugErr(null); }} style={{ flex: 1 }}>{tr("Annulla")}</Btn>
              {sugList ? (
                <Btn ai onClick={applySuggest} disabled={!sugList.some((x) => x.on)} style={{ flex: 1 }}>
                  {tr("Aggiungi selezionati")} ✓
                </Btn>
              ) : (
                <Btn ai onClick={askSuggest} disabled={sugBusy} style={{ flex: 1 }}>
                  {sugBusy
                    ? <span className="row center g8"><Loader2 size={13} className="spin" /> {tr("Analisi...")}</span>
                    : tr("Suggerisci ✦")}
                </Btn>
              )}
            </div>
          </div>
        </div>
        </Overlay>
      )}
      {info && <ExerciseInfoModal name={info.name} group={info.group} ex={info} onClose={() => setInfo(null)} />}
      {ptInfo && <PtNoteModal ex={ptInfo} onClose={() => setPtInfo(null)} />}
      {progIdx != null && draft.exercises[progIdx] && (
        <ProgressionModal ex={draft.exercises[progIdx]}
          onSave={(p) => { upd((d) => ({ ...d, exercises: d.exercises.map((e, i) => i !== progIdx ? e : { ...e, progression: p }) })); setProgIdx(null); }}
          onClose={() => setProgIdx(null)} />
      )}
      {setMenu && (
        <SetMenu isTime={draft.exercises[setMenu.ei].mode === "time"}
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
        padding: "10px 12px", marginBottom: 14,
        background: draft.progression?.enabled ? "rgba(255,215,106,.08)" : "var(--card2)",
        border: `1px solid ${draft.progression?.enabled ? "#ffd76a" : "var(--soft)"}`,
      }}>
        <button onClick={() => upd((d) => ({ ...d, progression: { enabled: !d.progression?.enabled, startDate: d.progression?.startDate || todayISO() } }))}
          className="tap" style={{ width: "100%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", padding: 0 }}>
          <span className={`f-hud ${draft.progression?.enabled ? "t-amber" : "t-dim"}`} style={{ fontWeight: 700, fontSize: 12, letterSpacing: ".12em" }}>
            <TrendingUp size={13} style={{ display: "inline", verticalAlign: -2 }} /> {draft.progression?.enabled ? tr("▸ PROGRESSIONE ATTIVA") : tr("▸ PROGRESSIONE DISATTIVATA")}
          </span>
          <span style={{
            width: 38, height: 20, borderRadius: 10, position: "relative", flexShrink: 0,
            background: draft.progression?.enabled ? "#ffd76a" : "var(--soft2)", transition: "background .2s",
          }}>
            <span style={{
              position: "absolute", top: 2, left: draft.progression?.enabled ? 20 : 2, width: 16, height: 16,
              borderRadius: "50%", background: draft.progression?.enabled ? "var(--bg)" : "#5d87a3", transition: "left .2s",
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
          {/* gruppo sopra il titolo, allineato come in allenamento */}
          <div className="micro t-dim" style={{ marginBottom: 3, marginLeft: 27 }}>{tr(ex.group || "").toUpperCase()}</div>
          <div className="row between g8" style={{ marginBottom: 4, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div className="row g6 grow wrap" style={{ marginRight: 14, minWidth: 0 }}>
              <span className="drag-handle" title={tr("Trascina per riordinare")}
                onPointerDown={(e) => dlStart(e, moveEx)} style={{ flexShrink: 0 }}><GripVertical size={15} /></span>
              <span className="t-bright" style={{ fontSize: 14, fontWeight: 700 }}>{tr(ex.name)}</span>
              <button onClick={() => setInfo(ex)} className="info-btn cham-s tap"><Info size={11} /> INFO</button>
              {!ptMode && (ex.ptNote || ex.ptVideo) && (
                <button onClick={() => setPtInfo(ex)} className="pt-btn tap" title={tr("Note e video del tuo PT")}>
                  <StickyNote size={11} /> INFO PT
                </button>
              )}
              {ex.progression?.enabled && (
                <span className="chip cham-s" style={{ borderColor: "#ffd76a", color: "#ffd76a", alignSelf: "center" }}>PROG ×{ex.progression.weeks?.length || 1}</span>
              )}
            </div>
            <div className="row g8" style={{ flexShrink: 0, marginLeft: "auto", paddingTop: 2 }}>
              <span onClick={() => setProgIdx(ei)} className="tap icon-tap"
                title={tr("Progressione settimanale")}
                style={{ cursor: "pointer", color: draft.progression?.enabled && ex.progression?.weeks?.length ? "#ffd76a" : "var(--dim)" }}>
                <TrendingUp size={14} /></span>
              <span onClick={() => { setReplaceIdx(ei); setShowPicker(true); }} className="tap icon-tap"
                title={tr("Sostituisci esercizio")} style={{ cursor: "pointer", color: "var(--dim)" }}>
                <ArrowLeftRight size={14} /></span>
              <span onClick={() => toggleEx(ex.name, ex.group)} className="tap icon-tap" title={tr("Elimina esercizio")}
                style={{ cursor: "pointer", color: "var(--faint)" }}><Trash2 size={14} /></span>
            </div>
          </div>
          <div className="row g8" style={{ marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input className="hud-input cham-s grow" value={ex.note || ""}
              onChange={(e) => upd((d) => ({ ...d, exercises: d.exercises.map((x, i) => i !== ei ? x : { ...x, note: e.target.value }) }))}
              placeholder={tr("Note esercizio...")} style={{ fontSize: 12, padding: "6px 8px", color: "#8fb2c9", minWidth: 0 }} />
            <div className="row g4" style={{ alignItems: "center", flexShrink: 0 }}>
              <span className="micro t-faint">REC</span>
              <input type="number" inputMode="numeric"
                value={ex.rest ?? 90}
                onChange={(e) => upd((d) => ({
                  ...d,
                  exercises: d.exercises.map((x, i) => i !== ei ? x : { ...x, rest: e.target.value === "" ? "" : Number(e.target.value) }),
                }))}
                className="hud-input cham-s"
                style={{ width: 50, textAlign: "center", padding: "6px 4px", fontSize: 12 }} />
              <span className="micro t-faint">s</span>
            </div>
          </div>
          {isDumbbell(ex.name) && !exMode(ex) && (
            <div className="micro t-faint" style={{ marginBottom: 8, lineHeight: 1.5 }}>ⓘ {tr("Inserisci il peso del singolo manubrio — il totale è calcolato da sé")}</div>
          )}
          {/* Note PT (solo lato personal trainer): mirate all'esercizio — il cliente
              le vedrà dal pulsante arancione INFO PT, insieme all'eventuale video */}
          {ptMode && (
            <div style={{ marginBottom: 10 }}>
              <button onClick={() => setPtEditIdx(ptEditIdx === ei ? null : ei)}
                className={ex.ptNote || ex.ptVideo ? "pt-btn tap" : "dash-btn cham-s tap"}
                style={ex.ptNote || ex.ptVideo ? { padding: "7px 10px", fontSize: 10 } : { borderColor: "var(--pt)", color: "var(--pt)", padding: 7 }}>
                <StickyNote size={11} style={{ display: "inline", verticalAlign: -1 }} /> {tr("NOTE PT")}{(ex.ptNote || ex.ptVideo) ? " ✓" : ""}
              </button>
              {ptEditIdx === ei && (
                <div className="pt-box fade-in" style={{ marginTop: 8 }}>
                  <div className="hud-label" style={{ marginBottom: 4, fontSize: 8, color: "var(--pt)" }}>
                    {tr("Note per il cliente — dove sbaglia, come migliorare, a cosa prestare attenzione")}
                  </div>
                  <textarea className="hud-input cham-s" rows={3} value={ex.ptNote || ""}
                    onChange={(e) => upd((d) => ({ ...d, exercises: d.exercises.map((x, i) => i !== ei ? x : { ...x, ptNote: e.target.value }) }))}
                    placeholder={tr("Es. tieni i gomiti a 45°, non rimbalzare il bilanciere, scendi lento 3s...")}
                    style={{ resize: "vertical", fontSize: 12, lineHeight: 1.6, marginBottom: 8 }} />
                  <div className="hud-label" style={{ marginBottom: 4, fontSize: 8, color: "var(--pt)" }}>
                    {tr("Video esecuzione personalizzato (link YouTube, Vimeo o mp4) — opzionale")}
                  </div>
                  <input className="hud-input cham-s" value={ex.ptVideo || ""}
                    onChange={(e) => upd((d) => ({ ...d, exercises: d.exercises.map((x, i) => i !== ei ? x : { ...x, ptVideo: e.target.value }) }))}
                    placeholder="https://youtube.com/watch?v=..." style={{ fontSize: 12, padding: "6px 8px" }} />
                </div>
              )}
            </div>
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

      {/* L'elenco esercizi si apre in un popup: aggiunta multipla con conferma,
          sostituzione con un tap (il popup si apre da sé cliccando l'icona) */}
      <button onClick={() => { setReplaceIdx(null); setShowPicker(true); }}
        className="dash-btn cham-s tap" style={{ padding: 13, fontWeight: 700, letterSpacing: ".15em" }}>
        <Plus size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Aggiungi esercizio")}
      </button>
      <Btn ai full onClick={() => { setSuggestOpen(true); setSugList(null); setSugErr(null); }}
        title={tr("L'AI propone esercizi da aggiungere in base alla scheda")}
        style={{ padding: 13, fontWeight: 700, letterSpacing: ".15em" }}>
        <Sparkles size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Suggerisci esercizi AI")}
      </Btn>
      {showPicker && (
        <ExercisePickerModal
          activeNames={draft.exercises.map((e) => e.name)}
          mode={replaceIdx != null ? "replace" : "add"}
          replacing={replaceIdx != null ? draft.exercises[replaceIdx]?.name : null}
          onPick={pickReplace}
          onAdd={addExercises}
          onClose={() => { setShowPicker(false); setReplaceIdx(null); }} />
      )}
      {showScan && (
        <MachineScan premium={premium} variant="float" fabBottom={88} fireToast={fireToast}
          currentNames={draft.exercises.map((e) => e.name)}
          onAdd={(name, group) => pickEx(name, group)} />
      )}

      {/* completa anche da fondo pagina: niente scroll fino in cima per salvare */}
      <Btn primary full disabled={!draft.name || !draft.exercises.length}
        onClick={() => onSave({ ...draft, name: draft.name.toUpperCase() })}
        style={{ padding: 14, marginTop: 6 }}>
        {tr("Completa e salva ✓")}
      </Btn>
    </div>
  );
}
