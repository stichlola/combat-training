import React, { useState, useEffect, useRef } from "react";
import { Plus, Minus, Trash2, Info, GripVertical, ArrowLeftRight, TrendingUp, StickyNote, Sparkles, Loader2, Check, Camera, Copy } from "lucide-react";
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
  const [progBusy, setProgBusy] = useState(false); // IA progressione al lavoro
  const [sugList, setSugList] = useState(null);   // [{ name, group, why, on }]
  const [sugErr, setSugErr] = useState(null);
  const [ptBusy, setPtBusy] = useState(false);    // salvataggio immediato delle note PT in corso
  const [ptScanBusy, setPtScanBusy] = useState(null); // indice esercizio in analisi AI (foto)
  const [ptScanIdx, setPtScanIdx] = useState(null);   // esercizio a cui si riferisce la foto
  const ptCamRef = useRef(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const ptSaveDebounceRef = useRef(null);
  const [ptSaveStatus, setPtSaveStatus] = useState({}); // { [ei]: "saving" | "saved" | "error" | "idle" }

  const triggerSavePtNotes = async (draftToSave, ei, showToast = false) => {
    if (!onSavePt) return;
    setPtSaveStatus((s) => ({ ...s, [ei]: "saving" }));
    setPtBusy(true);
    try {
      const ok = await onSavePt(draftToSave);
      setPtBusy(false);
      if (ok) {
        setPtSaveStatus((s) => ({ ...s, [ei]: "saved" }));
        if (showToast) {
          fireToast({ title: tr("◈ NOTE PT SALVATE"), sub: tr("Il cliente le vede subito nella sua scheda") });
        }
        setTimeout(() => {
          setPtSaveStatus((s) => (s[ei] === "saved" ? { ...s, [ei]: "idle" } : s));
        }, 3000);
      } else {
        setPtSaveStatus((s) => ({ ...s, [ei]: "error" }));
        if (showToast) {
          fireToast({ title: tr("Salvataggio non riuscito"), sub: tr("Riprova tra poco") });
        }
      }
    } catch {
      setPtBusy(false);
      setPtSaveStatus((s) => ({ ...s, [ei]: "error" }));
    }
  };

  const handlePtChange = (ei, field, val) => {
    const updated = {
      ...draftRef.current,
      exercises: draftRef.current.exercises.map((x, i) => i !== ei ? x : { ...x, [field]: val }),
    };
    draftRef.current = updated;
    upd(() => updated);
    if (!onSavePt) return;
    setPtSaveStatus((s) => ({ ...s, [ei]: "saving" }));
    if (ptSaveDebounceRef.current) clearTimeout(ptSaveDebounceRef.current);
    ptSaveDebounceRef.current = setTimeout(async () => {
      await triggerSavePtNotes(draftRef.current, ei);
    }, 700);
  };

  const flushPtSave = async (ei, showToast = false) => {
    if (!onSavePt) return;
    if (ptSaveDebounceRef.current) clearTimeout(ptSaveDebounceRef.current);
    await triggerSavePtNotes(draftRef.current, ei, showToast);
  };

  useEffect(() => {
    return () => {
      if (ptSaveDebounceRef.current) {
        clearTimeout(ptSaveDebounceRef.current);
        if (onSavePt && draftRef.current) {
          onSavePt(draftRef.current);
        }
      }
    };
  }, []);

  const upd = (fn) => setDraft((d) => fn(d));

  /* ── Progressione settimanale: TUTTA la gestione è qui dentro (prima era in
     un modale sulla scheda principale). I cambiamenti strutturali aggiornano la
     bozza e, per le schede esistenti, si salvano SUBITO via onQuickSave (che
     salva solo la progressione); per le schede nuove valgono al Salva globale ── */
  const [progWeeksN, setProgWeeksN] = useState(() =>
    Math.max(2, Math.min(8, initial?.progression?.enabled ? progTotal(initial) : 4)));
  const [selectedWeek, setSelectedWeek] = useState(() => initial?.progression?.week || 1);
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
  const maxProgWeeks = Math.max(progWeeksN, progTotal(draft));
  const activeSelectedWeek = draft.progression?.enabled ? Math.max(1, Math.min(selectedWeek, maxProgWeeks)) : 1;
  const applyProg = (fn) => {
    const nd = fn(draft);
    upd(() => nd);
  };
  const activateProg = () => {
    const n = clampW(progWeeksN);
    applyProg((d) => ({
      ...d,
      progression: { enabled: true, startDate: todayISO(), week: 1, doneKey: null },
      exercises: d.exercises.map((e) => {
        const prev = e.progression?.weeks;
        if (prev && prev.length) {
          // Conserva TUTTI i valori già presenti nelle settimane dell'esercizio
          const weeks = Array.from({ length: Math.max(n, prev.length) }, (_, i) => {
            if (i < prev.length && prev[i]) {
              return {
                ...prev[i],
                sets: (prev[i].sets || []).map((st) => ({ ...st, done: false, elapsed: 0 })),
              };
            }
            return { sets: emptySetsFor(e) };
          });
          return { ...e, progression: { ...(e.progression || {}), weeks } };
        }
        // Se non c'erano settimane create, la settimana 1 eredita i valori/carichi già inseriti nell'esercizio
        const baseWeek1 = {
          sets: (e.sets || []).map((s) => ({ ...s, done: false, elapsed: 0 })),
          note: e.note || "",
        };
        const weeks = [
          baseWeek1,
          ...Array.from({ length: Math.max(0, n - 1) }, () => ({ sets: emptySetsFor(e) })),
        ];
        return { ...e, progression: { weeks } };
      }),
    }));
    fireToast({ title: tr("◈ PROGRESSIONE ATTIVA"), sub: `${tr("SETTIMANA")} 1/${n}` });
  };
  const disableProg = () => {
    applyProg((d) => ({ ...d, progression: { ...d.progression, enabled: false } }));
    setConfirmProgOff(false);
    fireToast({ title: tr("◈ PROGRESSIONE DISATTIVATA"), sub: draft.name });
  };
  /* cambio numero settimane (pulsante Salva): allungando o accorciando si conservano
     SEMPRE i dati e le settimane già impostati in precedenza */
  const resizeProg = () => {
    const nn = clampW(progWeeksN);
    applyProg((d) => {
      const curW = Math.min(d.progression?.week || 1, nn);
      return {
        ...d,
        progression: { ...d.progression, week: curW },
        exercises: d.exercises.map((e) => {
          const prev = e.progression?.weeks || [];
          const weeks = Array.from({ length: nn }, (_, i) => {
            if (i < prev.length && prev[i]) {
              // Conserva i valori precedentemente inseriti per questa settimana
              return {
                ...prev[i],
                sets: (prev[i].sets || []).map((st) => ({ ...st, done: false, elapsed: 0 })),
              };
            }
            // Nuova settimana aggiunta oltre quelle esistenti: parte vuota
            return { sets: emptySetsFor(e) };
          });
          return { ...e, progression: { ...(e.progression || {}), weeks } };
        }),
      };
    });
    setSelectedWeek((w) => Math.min(w, nn));
    fireToast({ title: tr("◈ PROGRESSIONE SALVATA"), sub: `${tr("Settimane totali")}: ${nn}` });
  };

  const [copySourceWeek, setCopySourceWeek] = useState(null);
  const currentDefaultSource = activeSelectedWeek > 1 ? activeSelectedWeek - 1 : (maxProgWeeks > 1 ? 2 : 1);
  const effectiveSourceWeek = copySourceWeek && copySourceWeek !== activeSelectedWeek && copySourceWeek <= maxProgWeeks ? copySourceWeek : currentDefaultSource;

  /* Copia i dati (serie, carichi, ripetizioni/tempi e note) da una settimana sorgente selezionata
     per tutti gli esercizi della scheda che contengono la settimana target */
  const copyFromWeekGlobal = (srcWeek) => {
    if (!srcWeek || srcWeek === activeSelectedWeek) return;
    const srcIdx = srcWeek - 1;
    const targetIdx = activeSelectedWeek - 1;
    applyProg((d) => ({
      ...d,
      exercises: d.exercises.map((e) => {
        let weeks = e.progression?.weeks;
        if (!weeks || weeks.length <= targetIdx || weeks.length <= srcIdx) return e;
        const srcWk = weeks[srcIdx];
        if (!srcWk) return e;
        const updatedWeeks = weeks.map((wk, wi) => {
          if (wi !== targetIdx) return wk;
          return {
            ...wk,
            sets: srcWk.sets.map((s) => ({ ...s, done: false, elapsed: 0 })),
            note: srcWk.note !== undefined ? srcWk.note : wk.note,
          };
        });
        return {
          ...e,
          progression: { ...(e.progression || {}), weeks: updatedWeeks },
        };
      }),
    }));
    fireToast({
      title: tr("◈ DATI COPIATI"),
      sub: `${tr("Settimana")} ${srcWeek} → ${tr("Settimana")} ${activeSelectedWeek}`,
    });
  };

  /* IA: decide da sola settimane e carichi (Premium o 1 credito). La chiamata,
     i gate e i toast sono nel chiamante (App); qui si applica il risultato */
  const runProgAI = async () => {
    if (!onAIProgression || progBusy) return;
    setProgBusy(true);
    const res = await onAIProgression(draft);
    setProgBusy(false);
    if (!res || !res.exWeeks) return;
    applyProg((d) => ({
      ...d,
      progression: { enabled: true, startDate: todayISO(), week: 1, doneKey: null },
      exercises: d.exercises.map((e, i) => ({ ...e, progression: { weeks: res.exWeeks[i] || [] } })),
    }));
    fireToast({ title: res.aiDone ? tr("◈ PROGRESSIONE IA GENERATA") : tr("◈ PROGRESSIONE ATTIVA"), sub: `${tr("SETTIMANA")} 1/${res.total}` });
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
      const newDraft = {
        ...draftRef.current,
        exercises: draftRef.current.exercises.map((x, i) => i !== ei ? x : { ...x, ptNote: x.ptNote ? `${x.ptNote}\n${text}` : text }),
      };
      draftRef.current = newDraft;
      upd(() => newDraft);
      if (onSavePt) {
        triggerSavePtNotes(newDraft, ei);
      }
      fireToast({ title: tr("◈ NOTA AI INSERITA E SALVATA"), sub: tr("Il cliente la vede subito nella sua scheda") });
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
    const isProgFilter = d.progression?.enabled && activeSelectedWeek > 1;
    if (!isProgFilter) {
      const exs = [...d.exercises];
      const [m] = exs.splice(from, 1);
      exs.splice(to, 0, m);
      return { ...d, exercises: exs };
    }
    const visibleIndices = d.exercises
      .map((e, idx) => ({ e, idx }))
      .filter(({ e }) => !!e.progression?.weeks?.[activeSelectedWeek - 1])
      .map(({ idx }) => idx);
    const realFrom = visibleIndices[from];
    const realTo = visibleIndices[to];
    if (realFrom === undefined || realTo === undefined) return d;
    const exs = [...d.exercises];
    const [m] = exs.splice(realFrom, 1);
    exs.splice(realTo, 0, m);
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
          fireToast={fireToast}
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
            if (p.weeks?.length && p.weeks.length > progWeeksN) {
              setProgWeeksN(p.weeks.length);
            }
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
          (attivazione, numero settimane col Salva, disattivazione). I valori
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
                {tr("SETTIMANA")} {currentWeek(draft.progression, maxProgWeeks)}/{maxProgWeeks}
              </span>
            </div>
            <div className="hud-label" style={{ margin: "12px 0 6px" }}>{tr("VISUALIZZA E MODIFICA SETTIMANA")}:</div>
            <div className="row g4" style={{ marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
              {Array.from({ length: maxProgWeeks }).map((_, i) => {
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
            {maxProgWeeks > 1 && (
              <div className="row g6" style={{ marginBottom: 12, alignItems: "center" }}>
                <span className="micro t-dim" style={{ flexShrink: 0, fontWeight: 700 }}>
                  <Copy size={12} style={{ display: "inline", verticalAlign: -2, marginRight: 4 }} />
                  {tr("Copia da:")}
                </span>
                <select
                  className="hud-input cham-s"
                  value={effectiveSourceWeek}
                  onChange={(e) => setCopySourceWeek(Number(e.target.value))}
                  style={{
                    padding: "5px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    background: "var(--card)",
                    color: "var(--text)",
                    border: "1px solid var(--soft)",
                    flex: 1,
                    minWidth: 80,
                  }}
                >
                  {Array.from({ length: maxProgWeeks }).map((_, i) => {
                    const w = i + 1;
                    if (w === activeSelectedWeek) return null;
                    return (
                      <option key={w} value={w}>
                        {tr("Settimana")} {w} (W{w})
                      </option>
                    );
                  })}
                </select>
                <Btn
                  small
                  onClick={() => copyFromWeekGlobal(effectiveSourceWeek)}
                  disabled={effectiveSourceWeek === activeSelectedWeek}
                  style={{ flexShrink: 0, padding: "5px 14px", fontWeight: 700, fontSize: 11 }}
                  title={`${tr("Copia i dati dalla settimana")} ${effectiveSourceWeek} ${tr("alla settimana")} ${activeSelectedWeek}`}
                >
                  {tr("Copia")}
                </Btn>
              </div>
            )}
            <div className="row g8" style={{ marginTop: 10, alignItems: "center" }}>
              <span className="micro" style={{ flexShrink: 0 }}>{tr("INIZIO SETTIMANA 1")}</span>
              <input type="date" className="hud-input cham-s" value={draft.progression.startDate || todayISO()}
                onChange={(e) => applyProg((d) => ({ ...d, progression: { ...d.progression, startDate: e.target.value } }))}
                style={{ padding: "6px 8px", fontSize: 12 }} />
            </div>
            <div className="hud-label" style={{ margin: "12px 0 8px" }}>{tr("NUMERO DI SETTIMANE")}</div>
            <div className="row g8" style={{ alignItems: "center", marginBottom: 6 }}>
              <Btn small disabled={progWeeksN <= 2} style={{ padding: "8px 12px" }}
                onClick={() => setProgWeeksN((w) => clampW(w - 1))}>
                <Minus size={13} style={{ display: "inline", verticalAlign: -2 }} />
              </Btn>
              <div className="f-hud t-bright cham-s" style={{ flex: 1, textAlign: "center", padding: "8px 0", fontSize: 18, fontWeight: 700, background: "var(--card)", border: "1px solid var(--soft)" }}>
                {progWeeksN}
              </div>
              <Btn small disabled={progWeeksN >= 8} style={{ padding: "8px 12px" }}
                onClick={() => setProgWeeksN((w) => clampW(w + 1))}>
                <Plus size={13} style={{ display: "inline", verticalAlign: -2 }} />
              </Btn>
            </div>
            <div className="tiny t-faint" style={{ marginBottom: 10, lineHeight: 1.5 }}>
              {tr("Aggiungi o togli settimane e premi Salva: i carichi e le serie già impostati si conservano.")}
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
                    : <><Sparkles size={13} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />{tr("Ricalcola tutti gli esercizi con IA")}</>}
                </Btn>
                <div className="tiny t-faint" style={{ marginTop: 6, lineHeight: 1.5, textAlign: "center" }}>
                  {tr("L'IA decide da sola settimane e carichi in base alla scheda e ai tuoi dati. Richiede Premium o 1 credito.")}
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
              <Btn small onClick={() => setProgWeeksN((w) => clampW(w - 1))} disabled={progBusy || progWeeksN <= 2} style={{ padding: "8px 12px" }}>
                <Minus size={13} style={{ display: "inline", verticalAlign: -2 }} />
              </Btn>
              <div className="f-hud t-bright cham-s" style={{ flex: 1, textAlign: "center", padding: "8px 0", fontSize: 18, fontWeight: 700, background: "var(--card)", border: "1px solid var(--soft)" }}>
                {progWeeksN}
              </div>
              <Btn small onClick={() => setProgWeeksN((w) => clampW(w + 1))} disabled={progBusy || progWeeksN >= 8} style={{ padding: "8px 12px" }}>
                <Plus size={13} style={{ display: "inline", verticalAlign: -2 }} />
              </Btn>
            </div>
            <div className="tiny t-faint" style={{ marginBottom: 14, lineHeight: 1.5 }}>
              {tr("Le settimane partono vuote: poi tu o il PT inserite pesi e ripetizioni esercizio per esercizio (modifica scheda → 📈). Con l'IA i valori si compilano da soli.")}
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
                    : <><Sparkles size={13} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />{tr("Calcola tutti gli esercizi con IA")}</>}
                </Btn>
                <div className="tiny t-faint" style={{ marginTop: 6, lineHeight: 1.5, textAlign: "center" }}>
                  {tr("L'IA decide da sola settimane e carichi in base alla scheda e ai tuoi dati. Richiede Premium o 1 credito.")}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="row g8" style={{ marginBottom: 14 }}>
        <Btn small ai onClick={() => { setSuggestOpen(true); setSugList(null); setSugErr(null); }} style={{ flex: 1 }}
          title={tr("L'IA propone esercizi da aggiungere in base alla scheda")}>
          <Sparkles size={12} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Suggerisci con IA")}
        </Btn>
        {showScan && (
          <MachineScan premium={premium} variant="small" fireToast={fireToast}
            currentNames={draft.exercises.map((e) => e.name)}
            onAdd={(name, group) => pickEx(name, group)} />
        )}
      </div>

      {/* Esercizi nel modello: card e serie trascinabili per riordinare, pulsante INFO visibile */}
      <div data-dl className="stack" style={{ marginTop: 0 }}>
      {draft.exercises
        .map((ex, ei) => ({ ex, ei }))
        .filter(({ ex }) => !draft.progression?.enabled || activeSelectedWeek === 1 || !!ex.progression?.weeks?.[activeSelectedWeek - 1])
        .map(({ ex, ei }) => {
          const isProgActive = draft.progression?.enabled && ex.progression?.weeks?.[activeSelectedWeek - 1];
          const displaySets = (isProgActive ? ex.progression.weeks[activeSelectedWeek - 1]?.sets : ex.sets) || [];
          const displayNote = isProgActive ? (ex.progression.weeks[activeSelectedWeek - 1]?.note || ex.note || "") : (ex.note || "");
          return (
            <Panel key={tr(ex.name) + "_" + ei} accent style={{ padding: 12 }}>
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
                          const baseNote = activeSelectedWeek === 1 ? val : (x.note || val);
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
                      onChange={(e) => handlePtChange(ei, "ptNote", e.target.value)}
                      onBlur={() => flushPtSave(ei)}
                      placeholder={tr("Es. tieni i gomiti a 45°, non rimbalzare il bilanciere, scendi lento 3s...")}
                      style={{ resize: "vertical", fontSize: 12, lineHeight: 1.6, marginBottom: 8 }} />
                    <div className="hud-label" style={{ marginBottom: 4, fontSize: 8, color: "var(--pt)" }}>
                      {tr("Video esecuzione personalizzato (link YouTube, Vimeo o mp4) — opzionale")}
                    </div>
                    <input className="hud-input cham-s" value={ex.ptVideo || ""} autoComplete="off" data-lpignore="true" data-form-type="other"
                      onChange={(e) => handlePtChange(ei, "ptVideo", e.target.value)}
                      onBlur={() => flushPtSave(ei)}
                      placeholder="https://youtube.com/watch?v=..." style={{ fontSize: 12, padding: "6px 8px" }} />
                    <div className="row between" style={{ marginTop: 10, alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div className="micro" style={{ color: ptSaveStatus[ei] === "saving" ? "var(--cyan)" : ptSaveStatus[ei] === "saved" ? "var(--green)" : ptSaveStatus[ei] === "error" ? "var(--red)" : "var(--faint)" }}>
                        {ptSaveStatus[ei] === "saving" ? (
                          <><Loader2 size={11} className="spin" style={{ display: "inline", verticalAlign: -1, marginRight: 4 }} />{tr("Salvataggio...")}</>
                        ) : ptSaveStatus[ei] === "saved" ? (
                          <><Check size={11} style={{ display: "inline", verticalAlign: -1, marginRight: 4 }} />{tr("Salvato subito ✓")}</>
                        ) : ptSaveStatus[ei] === "error" ? (
                          tr("Errore salvataggio")
                        ) : (
                          tr("Salvataggio immediato attivo")
                        )}
                      </div>
                      <div className="row g8">
                        {/* fotocamera IA: foto del cliente che esegue → nota tecnica bozza */}
                        <Btn small ai disabled={ptScanBusy === ei}
                          title={tr("Fotografa il cliente mentre esegue: l'IA scrive la nota tecnica")}
                          onClick={() => { setPtScanIdx(ei); ptCamRef.current && ptCamRef.current.click(); }}>
                          {ptScanBusy === ei
                            ? <Loader2 size={12} className="spin" />
                            : <Camera size={12} style={{ display: "inline", verticalAlign: -2 }} />} {ptScanBusy === ei ? tr("Analisi...") : tr("Foto IA")}
                        </Btn>
                        {onSavePt && (
                          <Btn small pt disabled={ptSaveStatus[ei] === "saving"}
                            title={tr("Salva subito note e video sul profilo del cliente, senza chiudere la scheda")}
                            onClick={() => flushPtSave(ei, true)}>
                            {ptSaveStatus[ei] === "saving"
                              ? <Loader2 size={12} className="spin" />
                              : <StickyNote size={11} style={{ display: "inline", verticalAlign: -1 }} />} {tr("Salva subito")}
                          </Btn>
                        )}
                      </div>
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

      {draft.progression?.enabled && activeSelectedWeek > 1 && draft.exercises.some((e) => !e.progression?.weeks?.[activeSelectedWeek - 1]) && (
        <div className="tiny t-faint" style={{ marginTop: 4, marginBottom: 8, textAlign: "center", lineHeight: 1.5 }}>
          {tr("Solo gli esercizi con la Settimana")} {activeSelectedWeek} {tr("programmata compaiono in questa vista.")}
        </div>
      )}

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
