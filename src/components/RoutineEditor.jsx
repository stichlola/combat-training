import React, { useState, useRef } from "react";
import { Plus, Minus, Trash2, Info, GripVertical, ArrowLeftRight, TrendingUp, StickyNote, Sparkles, Loader2, Check, Camera } from "lucide-react";
import { ExerciseInfoModal } from "./ExerciseInfoModal";
import { ProgressionModal } from "./ProgressionModal";
import { ExercisePickerModal } from "./ExercisePicker";
import { MachineScan } from "./MachineScan";
import { SetMenu } from "./SetMenu";
import { dlStart } from "../lib/dnd";
import { todayISO, repVal, progTotal, currentWeek } from "../lib/progression";
import { exMode, holdSets, isDumbbell, isHold, EXERCISE_DB, GROUPS, ALL_EXERCISES, findGroup, matchToDb } from "../lib/exercises";
import { aiCall, parseLoose, resizeImage } from "../lib/ai";
import { tr } from "../lib/i18n";
import { Btn, Overlay, Panel } from "../ui";

/* ---------------- Editor modello scheda (crea + modifica, senza timer né log) ----------------
   ptMode: lo usa il personal trainer sulle schede del cliente — sblocca per ogni
   esercizio la sezione arancione "note PT" (note mirate + video esecuzione). */
export function RoutineEditor({ premium, fireToast, initial, onClose, onSave, onSavePt = null, onQuickSave = null, onAIProgression = null, showScan = true, ptMode = false }) {
  const [draft, setDraft] = useState(() => initial
    ? JSON.parse(JSON.stringify(initial))
    : { id: Date.now(), name: "", exercises: [] });
  const [info, setInfo] = useState(null);
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
  const [ptBusy, setPtBusy] = useState(false);    // salvataggio immediato delle note PT in corso
  const [ptScanBusy, setPtScanBusy] = useState(null); // indice esercizio in analisi AI (foto)
  const [ptScanIdx, setPtScanIdx] = useState(null);   // esercizio a cui si riferisce la foto
  const ptCamRef = useRef(null);

  const upd = (fn) => setDraft((d) => fn(d));

  /* ── Progressione settimanale: TUTTA la gestione è qui dentro (prima era in
     un modale sulla scheda principale). I cambiamenti strutturali aggiornano la
     bozza e, per le schede esistenti, si salvano SUBITO via onQuickSave (che
     salva solo la progressione); per le schede nuove valgono al Salva globale ── */
  const [progWeeksN, setProgWeeksN] = useState(() =>
    Math.max(2, Math.min(8, initial?.progression?.enabled ? progTotal(initial) : 4)));
  const [selectedWeek, setSelectedWeek] = useState(() => initial?.progression?.week || 1);
  const [progBusy, setProgBusy] = useState(false);   // AI al lavoro
  const [confirmProgOff, setConfirmProgOff] = useState(false);
  const clampW = (n) => Math.max(2, Math.min(8, n));
  const emptySetsFor = (ex) => {
    const mode = exMode(ex);
    return ex.sets.map((st) => {
      const base = { ...st, done: false, elapsed: 0 };
      if (mode === "time") return { ...base, sec: "", dist: "" };
      if (mode === "hold") return { ...base, sec: "" };
      return { ...base, w: "", r: "" };
    });
  };
  const activeSelectedWeek = draft.progression?.enabled ? Math.max(1, Math.min(selectedWeek, progWeeksN)) : 1;
  const applyProg = (fn) => {
    const nd = fn(draft);
    upd(() => nd);
  };
  const activateProg = () => {
    const n = clampW(progWeeksN);
    applyProg((d) => ({
      ...d,
      progression: { enabled: true, startDate: todayISO(), week: 1, doneKey: null },
      exercises: d.exercises.map((e) => ({ ...e, progression: { weeks: Array.from({ length: n }, () => ({ sets: emptySetsFor(e) })) } })),
    }));
    fireToast({ title: tr("◈ PROGRESSIONE ATTIVA"), sub: `${tr("SETTIMANA")} 1/${n}` });
  };
  const disableProg = () => {
    applyProg((d) => ({ ...d, progression: { ...d.progression, enabled: false } }));
    setConfirmProgOff(false);
    fireToast({ title: tr("◈ PROGRESSIONE DISATTIVATA"), sub: draft.name });
  };
  /* cambio numero settimane (pulsante Salva): allungando o rifacendo il ciclo
     senza AI si riparte da zero con le settimane VUOTE; accorciando si
     conservano le prime n */
  const resizeProg = () => {
    const nn = clampW(progWeeksN);
    applyProg((d) => {
      const restart = nn >= progTotal(d);
      return {
        ...d,
        progression: { ...d.progression, week: restart ? 1 : Math.min(d.progression?.week || 1, nn) },
        exercises: d.exercises.map((e) => {
          const prev = e.progression?.weeks;
          if (!prev?.length) return e;
          const weeks = restart
            ? Array.from({ length: nn }, () => ({ sets: emptySetsFor(e) }))
            : prev.slice(0, nn).map((w) => ({ sets: w.sets.map((st) => ({ ...st, done: false, elapsed: 0 })) }));
          return { ...e, progression: { ...e.progression, weeks } };
        }),
      };
    });
    fireToast({ title: tr("◈ PROGRESSIONE SALVATA"), sub: `${tr("SETTIMANA")} 1/${nn}` });
  };
  /* AI: decide da sola settimane e carichi (Premium o 1 credito). La chiamata,
     i gate e i toast sono nel chiamante (App); qui si applica il risultato */
  const runProgAI = async () => {
    if (!onAIProgression || progBusy) return;
    setProgBusy(true);
    const res = await onAIProgression(draft);
    setProgBusy(false);
    if (!res || !res.exWeeks) return; // ospite/crediti: toast già mostrato
    applyProg((d) => ({
      ...d,
      progression: { enabled: true, startDate: todayISO(), week: 1, doneKey: null },
      exercises: d.exercises.map((e, i) => ({ ...e, progression: { weeks: res.exWeeks[i] || [] } })),
    }));
    fireToast({ title: res.aiDone ? tr("◈ PROGRESSIONE AI GENERATA") : tr("◈ PROGRESSIONE ATTIVA"), sub: `${tr("SETTIMANA")} 1/${res.total}` });
  };
  const hasEx = (name) => draft.exercises.some((e) => e.name === name);

  /* Fotocamera AI nelle note PT (tutti i PT: lato server i trainer hanno le
     funzioni premium sbloccate): il PT fotografa il cliente che esegue
     l'esercizio, l'AI scrive la nota tecnica (errori, attenzioni, consigli).
     La nota si AGGIUNGE a quella già presente: il PT rilegge e poi salva. */
  const analyzePtPhoto = async (f, ei) => {
    const ex = draft.exercises[ei];
    if (!ex) return;
    setPtScanBusy(ei);
    try {
      const { b64, type } = await resizeImage(f, 1024);
      const data = await aiCall({
        model: "claude-sonnet-5", max_tokens: 600,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: type, data: b64 } },
          { type: "text", text: `Sei un personal trainer esperto. Nella foto un cliente sta eseguendo (o si appresta a eseguire) l'esercizio "${ex.name}" (gruppo: ${ex.group || "—"}).
Osserva postura, assetto, presa e setup visibili. Scrivi una NOTA TECNICA BREVE per il cliente (3-5 punti secchi): cosa correggere, a cosa prestare attenzione, un consiglio di esecuzione. Tono diretto e pratico, in italiano, senza preamboli né titoli.
Se la foto NON mostra una persona che si allena in palestra o è inutilizzabile, rispondi SOLO: FOTO_NON_VALIDA` },
        ] }],
      }, "scan");
      if (data && (data.error === "limit_reached" || data.error === "premium_required")) {
        fireToast({ title: tr("Limite scansioni raggiunto"), sub: tr("Si azzera all'inizio della settimana") });
        return;
      }
      if (data && data.error) throw new Error("API");
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      if (!text || text.includes("FOTO_NON_VALIDA")) {
        fireToast({ title: tr("Foto non utilizzabile"), sub: tr("Inquadra il cliente mentre esegue l'esercizio") });
        return;
      }
      upd((d) => ({ ...d, exercises: d.exercises.map((x, i) => i !== ei ? x : { ...x, ptNote: x.ptNote ? `${x.ptNote}\n${text}` : text }) }));
      fireToast({ title: tr("◈ NOTA AI INSERITA"), sub: tr("Rileggila e premi «Salva note»") });
    } catch (e) {
      fireToast({ title: tr("Analisi non riuscita"), sub: tr("Riprova con una foto più chiara") });
    }
    setPtScanBusy(null);
  };

  /* Marca la serie come riscaldamento (W) o normale */
  const toggleWarmup = (ei, si) => upd((d) => {
    const isProg = d.progression?.enabled;
    return {
      ...d,
      exercises: d.exercises.map((e, i) => {
        if (i !== ei) return e;
        if (isProg && e.progression?.weeks?.[activeSelectedWeek - 1]) {
          const updatedWeeks = e.progression.weeks.map((wk, wi) => {
            if (wi !== activeSelectedWeek - 1) return wk;
            return {
              ...wk,
              sets: wk.sets.map((x, j) => j !== si ? x : { ...x, warmup: !x.warmup })
            };
          });
          const baseSets = activeSelectedWeek === 1
            ? e.sets.map((x, j) => j !== si ? x : { ...x, warmup: !x.warmup })
            : e.sets;
          return {
            ...e,
            sets: baseSets,
            progression: { ...e.progression, weeks: updatedWeeks }
          };
        } else {
          return {
            ...e,
            sets: e.sets.map((x, j) => j !== si ? x : { ...x, warmup: !x.warmup })
          };
        }
      })
    };
  });

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

  const updateSet = (ei, si, field, val) => upd((d) => {
    const isProg = d.progression?.enabled;
    const newVal = field === "r" ? repVal(val) : (val === "" ? "" : Number(val));
    return {
      ...d,
      exercises: d.exercises.map((e, i) => {
        if (i !== ei) return e;
        if (isProg && e.progression?.weeks?.[activeSelectedWeek - 1]) {
          const updatedWeeks = e.progression.weeks.map((wk, wi) => {
            if (wi !== activeSelectedWeek - 1) return wk;
            return {
              ...wk,
              sets: wk.sets.map((s, j) => j !== si ? s : { ...s, [field]: newVal })
            };
          });
          const baseSets = activeSelectedWeek === 1
            ? e.sets.map((s, j) => j !== si ? s : { ...s, [field]: newVal })
            : e.sets;
          return {
            ...e,
            sets: baseSets,
            progression: { ...e.progression, weeks: updatedWeeks }
          };
        } else {
          return {
            ...e,
            sets: e.sets.map((s, j) => j !== si ? s : { ...s, [field]: newVal })
          };
        }
      })
    };
  });

  const removeSet = (ei, si) => upd((d) => {
    const isProg = d.progression?.enabled;
    return {
      ...d,
      exercises: d.exercises.map((e, i) => {
        if (i !== ei) return e;
        if (isProg && e.progression?.weeks?.[activeSelectedWeek - 1]) {
          const updatedWeeks = e.progression.weeks.map((wk, wi) => {
            if (wi !== activeSelectedWeek - 1) return wk;
            return {
              ...wk,
              sets: wk.sets.filter((_, j) => j !== si)
            };
          });
          const baseSets = activeSelectedWeek === 1
            ? e.sets.filter((_, j) => j !== si)
            : e.sets;
          return {
            ...e,
            sets: baseSets,
            progression: { ...e.progression, weeks: updatedWeeks }
          };
        } else {
          return {
            ...e,
            sets: e.sets.filter((_, j) => j !== si)
          };
        }
      }).filter((e) => {
        if (isProg) {
          const wk = e.progression?.weeks?.[activeSelectedWeek - 1];
          return wk ? wk.sets.length > 0 : e.sets.length > 0;
        }
        return e.sets.length > 0;
      })
    };
  });

  const addSet = (ei) => upd((d) => {
    const isProg = d.progression?.enabled;
    return {
      ...d,
      exercises: d.exercises.map((e, i) => {
        if (i !== ei) return e;
        const newSet = exMode(e) === "time" ? { sec: 600, dist: "", elapsed: 0, done: false }
          : exMode(e) === "hold" ? { sec: e.sets[e.sets.length - 1]?.sec || 60, elapsed: 0, done: false }
          : { ...e.sets[e.sets.length - 1], done: false };

        if (isProg && e.progression?.weeks?.[activeSelectedWeek - 1]) {
          const updatedWeeks = e.progression.weeks.map((wk, wi) => {
            if (wi !== activeSelectedWeek - 1) return wk;
            const weekSets = wk.sets;
            const weekNewSet = exMode(e) === "time" ? { sec: 600, dist: "", elapsed: 0, done: false }
              : exMode(e) === "hold" ? { sec: weekSets[weekSets.length - 1]?.sec || 60, elapsed: 0, done: false }
              : { ...weekSets[weekSets.length - 1], done: false };
            return {
              ...wk,
              sets: [...weekSets, weekNewSet]
            };
          });
          const baseSets = activeSelectedWeek === 1 ? [...e.sets, newSet] : e.sets;
          return {
            ...e,
            sets: baseSets,
            progression: { ...e.progression, weeks: updatedWeeks }
          };
        } else {
          return {
            ...e,
            sets: [...e.sets, newSet]
          };
        }
      })
    };
  });

  /* Riordino: card esercizi e serie trascinabili su/giù dalle maniglie */
  const moveEx = (from, to) => upd((d) => {
    const exs = [...d.exercises];
    const [m] = exs.splice(from, 1);
    exs.splice(to, 0, m);
    return { ...d, exercises: exs };
  });

  const moveSet = (ei, from, to) => upd((d) => {
    const isProg = d.progression?.enabled;
    return {
      ...d,
      exercises: d.exercises.map((e, i) => {
        if (i !== ei) return e;
        if (isProg && e.progression?.weeks?.[activeSelectedWeek - 1]) {
          const updatedWeeks = e.progression.weeks.map((wk, wi) => {
            if (wi !== activeSelectedWeek - 1) return wk;
            const sets = [...wk.sets];
            const [m] = sets.splice(from, 1);
            sets.splice(to, 0, m);
            return { ...wk, sets };
          });
          let baseSets = e.sets;
          if (activeSelectedWeek === 1) {
            const bSets = [...e.sets];
            const [m] = bSets.splice(from, 1);
            bSets.splice(to, 0, m);
            baseSets = bSets;
          }
          return {
            ...e,
            sets: baseSets,
            progression: { ...e.progression, weeks: updatedWeeks }
          };
        } else {
          const sets = [...e.sets];
          const [m] = sets.splice(from, 1);
          sets.splice(to, 0, m);
          return { ...e, sets };
        }
      })
    };
  });

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
      {progIdx != null && draft.exercises[progIdx] && (
        <ProgressionModal ex={draft.exercises[progIdx]} routineProg={draft.progression}
          onSave={(p) => {
            /* Aggiorna la bozza locale inserendo la progressione e sincronizzando le serie
               dell'esercizio con la settimana 1 della progressione. Non esegue il salvataggio immediato (onQuickSave)
               in modo che premendo "Annulla" nell'editor si possano scartare tutte le modifiche. */
            const firstWeekSets = p.weeks?.[0]?.sets || [];
            const updatedSets = firstWeekSets.map((s) => ({ ...s, done: false, elapsed: 0 }));
            const newDraft = {
              ...draft,
              exercises: draft.exercises.map((e, i) => i !== progIdx ? e : {
                ...e,
                sets: updatedSets,
                progression: p
              })
            };
            setDraft(newDraft);
            setProgIdx(null);
          }}
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

      {/* Progressione settimanale: gestione completa dentro la modifica scheda
          (attivazione, numero settimane col Salva, AI, disattivazione). I valori
          delle settimane si compilano esercizio per esercizio dall'icona 📈 */}
      <div className="cham-s" style={{
        padding: "10px 12px", marginBottom: 14,
        background: draft.progression?.enabled ? "rgba(255,215,106,.08)" : "var(--card2)",
        border: `1px solid ${draft.progression?.enabled ? "#ffd76a" : "var(--soft)"}`,
      }}>
        {draft.progression?.enabled ? (
          <>
            <div className="row between" style={{ alignItems: "center" }}>
              <span className="f-hud t-amber" style={{ fontWeight: 700, fontSize: 12, letterSpacing: ".12em" }}>
                <TrendingUp size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("▸ PROGRESSIONE ATTIVA")}
              </span>
              <span className="chip cham-s" style={{ borderColor: "#ffd76a", color: "#ffd76a", flexShrink: 0 }}>
                {tr("SETTIMANA")} {currentWeek(draft.progression, progTotal(draft))}/{progTotal(draft)}
              </span>
            </div>
            <div className="hud-label" style={{ margin: "12px 0 6px" }}>{tr("VISUALIZZA E MODIFICA SETTIMANA")}:</div>
            <div className="row g4" style={{ marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
              {Array.from({ length: progWeeksN }).map((_, i) => {
                const wNum = i + 1;
                const isSel = activeSelectedWeek === wNum;
                const isCurrentActive = draft.progression?.week === wNum;
                return (
                  <button
                    key={wNum}
                    type="button"
                    className={`tap cham-s ${isSel ? "active" : ""}`}
                    onClick={() => setSelectedWeek(wNum)}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      fontSize: 11,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      background: isSel ? "#ffd76a" : "var(--card)",
                      color: isSel ? "#000" : (isCurrentActive ? "#ffd76a" : "var(--dim)"),
                      border: `1px solid ${isSel ? "#ffd76a" : (isCurrentActive ? "rgba(255, 215, 106, 0.4)" : "var(--soft)")}`,
                      fontWeight: 700,
                      cursor: "pointer",
                      minWidth: 50,
                    }}
                  >
                    W{wNum}
                  </button>
                );
              })}
            </div>
            <div className="row g8" style={{ marginTop: 10, alignItems: "center" }}>
              <span className="micro" style={{ flexShrink: 0 }}>{tr("INIZIO SETTIMANA 1")}</span>
              <input type="date" className="hud-input cham-s" value={draft.progression.startDate || todayISO()}
                onChange={(e) => applyProg((d) => ({ ...d, progression: { ...d.progression, startDate: e.target.value } }))}
                style={{ padding: "6px 8px", fontSize: 12 }} />
            </div>
            <div className="hud-label" style={{ margin: "12px 0 8px" }}>{tr("NUMERO DI SETTIMANE")}</div>
            <div className="row g8" style={{ alignItems: "center", marginBottom: 6 }}>
              <Btn small disabled={progBusy || progWeeksN <= 2} style={{ padding: "8px 12px" }}
                onClick={() => setProgWeeksN((w) => clampW(w - 1))}>
                <Minus size={13} style={{ display: "inline", verticalAlign: -2 }} />
              </Btn>
              <div className="f-hud t-bright cham-s" style={{ flex: 1, textAlign: "center", padding: "8px 0", fontSize: 18, fontWeight: 700, background: "var(--card)", border: "1px solid var(--soft)" }}>
                {progWeeksN}
              </div>
              <Btn small disabled={progBusy || progWeeksN >= 8} style={{ padding: "8px 12px" }}
                onClick={() => setProgWeeksN((w) => clampW(w + 1))}>
                <Plus size={13} style={{ display: "inline", verticalAlign: -2 }} />
              </Btn>
            </div>
            <div className="tiny t-faint" style={{ marginBottom: 10, lineHeight: 1.5 }}>
              {tr("Cambia il numero e premi Salva: il ciclo riparte dalla settimana 1 con le settimane vuote, da compilare a mano o con l'AI.")}
            </div>
            <div className="row g8" style={{ marginTop: 4 }}>
              {confirmProgOff ? (
                <Btn small onClick={disableProg} style={{ flex: 1.2, borderColor: "var(--line2)", color: "var(--dim)" }}>
                  {tr("Conferma: disattiva")}
                </Btn>
              ) : (
                <Btn small onClick={() => setConfirmProgOff(true)} style={{ flex: 1.2 }}>{tr("Disattiva")}</Btn>
              )}
              <Btn small primary disabled={progBusy} onClick={resizeProg} style={{ flex: 2 }}>{tr("Salva")}</Btn>
            </div>
            {onAIProgression && (
              <>
                <div className="row" style={{ alignItems: "center", gap: 10, margin: "14px 0 10px" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--soft)" }} />
                  <span className="micro t-faint">{tr("OPPURE")}</span>
                  <div style={{ flex: 1, height: 1, background: "var(--soft)" }} />
                </div>
                <Btn ai full onClick={runProgAI} disabled={progBusy}>
                  {progBusy
                    ? <><Loader2 size={13} className="spin" style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />{tr("Generazione...")}</>
                    : <><Sparkles size={13} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />{tr("Ricalcola con l'AI")}</>}
                </Btn>
                <div className="tiny t-faint" style={{ marginTop: 6, lineHeight: 1.5, textAlign: "center" }}>
                  {tr("L'AI decide da sola settimane e carichi in base alla scheda e ai tuoi dati. Richiede Premium o 1 credito.")}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="f-hud t-dim" style={{ fontWeight: 700, fontSize: 12, letterSpacing: ".12em", marginBottom: 10 }}>
              <TrendingUp size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("PROGRESSIONE SETTIMANALE")}
            </div>
            <div className="hud-label" style={{ marginBottom: 8 }}>{tr("NUMERO DI SETTIMANE")}</div>
            <div className="row g8" style={{ alignItems: "center", marginBottom: 6 }}>
              <Btn small onClick={() => setProgWeeksN((w) => clampW(w - 1))} disabled={progWeeksN <= 2} style={{ padding: "8px 12px" }}>
                <Minus size={13} style={{ display: "inline", verticalAlign: -2 }} />
              </Btn>
              <div className="f-hud t-bright cham-s" style={{ flex: 1, textAlign: "center", padding: "8px 0", fontSize: 18, fontWeight: 700, background: "var(--card)", border: "1px solid var(--soft)" }}>
                {progWeeksN}
              </div>
              <Btn small onClick={() => setProgWeeksN((w) => clampW(w + 1))} disabled={progWeeksN >= 8} style={{ padding: "8px 12px" }}>
                <Plus size={13} style={{ display: "inline", verticalAlign: -2 }} />
              </Btn>
            </div>
            <div className="tiny t-faint" style={{ marginBottom: 14, lineHeight: 1.5 }}>
              {tr("Le settimane partono vuote: poi tu o il PT inserite pesi e ripetizioni esercizio per esercizio (modifica scheda → 📈). Con l'AI i valori si compilano da soli.")}
            </div>
            <Btn primary full disabled={progBusy || !draft.exercises.length} onClick={activateProg}>
              {tr("Attiva progressione")}
            </Btn>
            {onAIProgression && (
              <>
                <div className="row" style={{ alignItems: "center", gap: 10, margin: "14px 0 10px" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--soft)" }} />
                  <span className="micro t-faint">{tr("OPPURE")}</span>
                  <div style={{ flex: 1, height: 1, background: "var(--soft)" }} />
                </div>
                <Btn ai full onClick={runProgAI} disabled={progBusy || !draft.exercises.length}>
                  {progBusy
                    ? <><Loader2 size={13} className="spin" style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />{tr("Generazione...")}</>
                    : <><Sparkles size={13} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />{tr("Calcola tutto con l'AI")}</>}
                </Btn>
                <div className="tiny t-faint" style={{ marginTop: 6, lineHeight: 1.5, textAlign: "center" }}>
                  {tr("L'AI decide da sola settimane e carichi in base alla scheda e ai tuoi dati. Richiede Premium o 1 credito.")}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="row g8" style={{ marginBottom: 14 }}>
        <Btn small ai onClick={() => { setSuggestOpen(true); setSugList(null); setSugErr(null); }} style={{ flex: 1 }}
          title={tr("L'AI propone esercizi da aggiungere in base alla scheda")}>
          <Sparkles size={12} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Suggerisci con AI")}
        </Btn>
        {showScan && (
          <MachineScan premium={premium} variant="small" fireToast={fireToast}
            currentNames={draft.exercises.map((e) => e.name)}
            onAdd={(name, group) => pickEx(name, group)} />
        )}
      </div>

      {/* Esercizi nel modello: card e serie trascinabili per riordinare, pulsante INFO visibile */}
      <div data-dl className="stack" style={{ marginTop: 0 }}>
      {draft.exercises.map((ex, ei) => {
        const isProgActive = draft.progression?.enabled && ex.progression?.weeks?.[activeSelectedWeek - 1];
        const displaySets = isProgActive ? ex.progression.weeks[activeSelectedWeek - 1].sets : ex.sets;
        const displayNote = isProgActive ? (ex.progression.weeks[activeSelectedWeek - 1].note ?? "") : (ex.note || "");
        return (
          <Panel key={tr(ex.name)} accent style={{ padding: 12 }}>
            {/* gruppo sopra il titolo, allineato come in allenamento */}
            <div className="micro t-dim" style={{ marginBottom: 3, marginLeft: 27 }}>{tr(ex.group || "").toUpperCase()}</div>
            <div className="row between g8" style={{ marginBottom: 4, alignItems: "flex-start" }}>
              <span className="drag-handle" title={tr("Trascina per riordinare")}
                onPointerDown={(e) => dlStart(e, moveEx)} style={{ flexShrink: 0, marginTop: 2 }}><GripVertical size={15} /></span>
              {/* INFO sta sempre alla destra del titolo; se va a capo resta
                  allineato col titolo (il wrap avviene dentro questa colonna) */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", flex: 1, minWidth: 0 }}>
                <span className="t-bright" style={{ fontSize: 14, fontWeight: 700, minWidth: 0 }}>{tr(ex.name)}</span>
                {/* un solo pulsante INFO: ambra quando il PT ha aggiunto note/video */}
                <button onClick={() => setInfo(ex)}
                  className={!ptMode && (ex.ptNote || ex.ptVideo) ? "pt-btn tap" : "info-btn cham-s tap"}
                  title={!ptMode && (ex.ptNote || ex.ptVideo) ? tr("Note e video del tuo PT") : undefined}
                  style={{ flexShrink: 0 }}>
                  <Info size={11} /> INFO
                </button>
                {ex.progression?.enabled && (
                  <span className="chip cham-s" style={{ borderColor: "#ffd76a", color: "#ffd76a", alignSelf: "center", flexShrink: 0 }}>PROG ×{ex.progression.weeks?.length || 1}</span>
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
              <input className="hud-input cham-s grow" value={displayNote} autoComplete="off" data-lpignore="true" data-form-type="other"
                onChange={(e) => {
                  const val = e.target.value;
                  upd((d) => {
                    const isProg = d.progression?.enabled;
                    return {
                      ...d,
                      exercises: d.exercises.map((x, i) => {
                        if (i !== ei) return x;
                        if (isProg && x.progression?.weeks?.[activeSelectedWeek - 1]) {
                          const updatedWeeks = x.progression.weeks.map((wk, wi) => {
                            if (wi !== activeSelectedWeek - 1) return wk;
                            return { ...wk, note: val };
                          });
                          const baseNote = activeSelectedWeek === 1 ? val : x.note;
                          return {
                            ...x,
                            note: baseNote,
                            progression: { ...x.progression, weeks: updatedWeeks }
                          };
                        } else {
                          return { ...x, note: val };
                        }
                      })
                    };
                  });
                }}
                placeholder={tr("Note esercizio...")} style={{ fontSize: 12, padding: "6px 8px", color: "#8fb2c9", minWidth: 0 }} />
              <div className="row g4" style={{ alignItems: "center", flexShrink: 0 }}>
                <span className="micro t-faint">REC</span>
                <input type="number" inputMode="numeric" autoComplete="off" data-lpignore="true" data-form-type="other"
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
                    <textarea className="hud-input cham-s" rows={3} value={ex.ptNote || ""} autoComplete="off" data-lpignore="true" data-form-type="other"
                      onChange={(e) => upd((d) => ({ ...d, exercises: d.exercises.map((x, i) => i !== ei ? x : { ...x, ptNote: e.target.value }) }))}
                      placeholder={tr("Es. tieni i gomiti a 45°, non rimbalzare il bilanciere, scendi lento 3s...")}
                      style={{ resize: "vertical", fontSize: 12, lineHeight: 1.6, marginBottom: 8 }} />
                    <div className="hud-label" style={{ marginBottom: 4, fontSize: 8, color: "var(--pt)" }}>
                      {tr("Video esecuzione personalizzato (link YouTube, Vimeo o mp4) — opzionale")}
                    </div>
                    <input className="hud-input cham-s" value={ex.ptVideo || ""} autoComplete="off" data-lpignore="true" data-form-type="other"
                      onChange={(e) => upd((d) => ({ ...d, exercises: d.exercises.map((x, i) => i !== ei ? x : { ...x, ptVideo: e.target.value }) }))}
                      placeholder="https://youtube.com/watch?v=..." style={{ fontSize: 12, padding: "6px 8px" }} />
                    <div className="row g8" style={{ marginTop: 10 }}>
                      {/* fotocamera AI: foto del cliente che esegue → nota tecnica bozza */}
                      <Btn small ai disabled={ptScanBusy === ei} style={{ flex: 1 }}
                        title={tr("Fotografa il cliente mentre esegue: l'AI scrive la nota tecnica")}
                        onClick={() => { setPtScanIdx(ei); ptCamRef.current && ptCamRef.current.click(); }}>
                        {ptScanBusy === ei
                          ? <Loader2 size={12} className="spin" />
                          : <Camera size={12} style={{ display: "inline", verticalAlign: -2 }} />} {ptScanBusy === ei ? tr("Analisi...") : tr("Foto AI")}
                      </Btn>
                      {/* Salva SUBITO solo note/video PT: niente "Salva" della scheda né
                          conferma di sovrascrittura — fonde i campi PT sulla copia fresca del cliente */}
                      {onSavePt && (
                        <Btn small pt disabled={ptBusy} style={{ flex: 1 }}
                          title={tr("Salva subito note e video sul profilo del cliente, senza chiudere la scheda")}
                          onClick={async () => {
                            setPtBusy(true);
                            const ok = await onSavePt(draft);
                            setPtBusy(false);
                            fireToast(ok
                              ? { title: tr("◈ NOTE PT SALVATE"), sub: tr("Il cliente le vede subito nella sua scheda") }
                              : { title: tr("Salvataggio non riuscito"), sub: tr("Riprova tra poco") });
                          }}>
                          {ptBusy
                            ? <Loader2 size={12} className="spin" />
                            : <StickyNote size={11} style={{ display: "inline", verticalAlign: -1 }} />} {ptBusy ? tr("Salvataggio...") : tr("Salva note")}
                        </Btn>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div data-dl>
            {displaySets.map((s, si) => (
              <div key={si} className={`row g8 ${s.warmup ? "set-warmup cham-s" : ""}`}
                style={{ marginBottom: 5, alignItems: "center", ...(s.warmup ? { padding: "4px 6px" } : {}) }}>
                {!ptMode ? (
                  <span className="drag-handle" title={tr("Trascina per riordinare")}
                    onPointerDown={(e) => dlStart(e, (f, t) => moveSet(ei, f, t))}><GripVertical size={13} /></span>
                ) : <span className="drag-handle" title={tr("Trascina per riordinare")}
                    onPointerDown={(e) => dlStart(e, (f, t) => moveSet(ei, f, t))}><GripVertical size={13} /></span>}
                <button className={`set-chip cham-s ${s.warmup ? "warmup" : ""}`} title={tr("Opzioni serie")}
                  onClick={(e) => { e.stopPropagation(); setSetMenu({ ei, si, x: e.clientX, y: e.clientY }); }}>
                  {ex.mode !== "time" && s.warmup ? "W" : ex.mode !== "time" ? displaySets.slice(0, si + 1).filter((x) => !x.warmup).length : si + 1}
                </button>
                {exMode(ex) === "time" ? (
                  <>
                    <input className="hud-input cham-s" type="number" inputMode="numeric" autoComplete="off" data-lpignore="true" data-form-type="other" value={s.sec ? Math.round(s.sec / 60) : ""}
                      onChange={(e) => updateSet(ei, si, "sec", e.target.value === "" ? "" : Number(e.target.value) * 60)}
                      style={{ textAlign: "center", padding: "7px 4px", width: 70 }} />
                    <span className="micro">{tr("MIN")}</span>
                    <input className="hud-input cham-s" type="number" inputMode="decimal" autoComplete="off" data-lpignore="true" data-form-type="other" value={s.dist}
                      onChange={(e) => updateSet(ei, si, "dist", e.target.value)} placeholder="—"
                      style={{ textAlign: "center", padding: "7px 4px", width: 70 }} />
                    <span className="micro">{tr("KM")}</span>
                  </>
                ) : exMode(ex) === "hold" ? (
                  <>
                    <input className="hud-input cham-s" type="number" inputMode="numeric" autoComplete="off" data-lpignore="true" data-form-type="other" value={s.sec || ""}
                      onChange={(e) => updateSet(ei, si, "sec", e.target.value)} placeholder="60"
                      style={{ textAlign: "center", padding: "7px 4px", width: 70 }} />
                    <span className="micro">{tr("SEC")}</span>
                  </>
                ) : (
                  <>
                    <input className="hud-input cham-s" type="number" inputMode="decimal" autoComplete="off" data-lpignore="true" data-form-type="other" value={s.w}
                      onChange={(e) => updateSet(ei, si, "w", e.target.value)}
                      style={{ textAlign: "center", padding: "7px 4px", width: 70 }} />
                    <span className="micro">{tr("KG")}</span>
                    <input className="hud-input cham-s" type="text" inputMode="decimal" autoComplete="off" data-lpignore="true" data-form-type="other" value={s.r}
                      title={tr("Puoi usare un intervallo, es. 8-10")}
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
        );
      })}
      </div>

      {/* L'elenco esercizi si apre in un popup: aggiunta multipla con conferma,
          sostituzione con un tap (il popup si apre da sé cliccando l'icona) */}
      <button onClick={() => { setReplaceIdx(null); setShowPicker(true); }}
        className="dash-btn cham-s tap" style={{ padding: 13, fontWeight: 700, letterSpacing: ".15em" }}>
        <Plus size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Aggiungi esercizio")}
      </button>
      {/* input fotocamera nascosto per l'analisi AI delle note PT */}
      <input ref={ptCamRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          const ei = ptScanIdx;
          e.target.value = "";
          if (f && ei != null) analyzePtPhoto(f, ei);
        }} />
      {showPicker && (
        <ExercisePickerModal
          activeNames={draft.exercises.map((e) => e.name)}
          mode={replaceIdx != null ? "replace" : "add"}
          replacing={replaceIdx != null ? draft.exercises[replaceIdx]?.name : null}
          onPick={pickReplace}
          onAdd={addExercises}
          onClose={() => { setShowPicker(false); setReplaceIdx(null); }} />
      )}

      {/* completa anche da fondo pagina: niente scroll fino in cima per salvare */}
      <Btn primary full disabled={!draft.name || !draft.exercises.length}
        onClick={() => onSave({ ...draft, name: draft.name.toUpperCase() })}
        style={{ padding: 14, marginTop: 6 }}>
        {tr("Salva")}
      </Btn>
    </div>
  );
}
