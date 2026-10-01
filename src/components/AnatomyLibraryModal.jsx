import React, { Suspense, useMemo, useState } from "react";
import { Info, Search, X, Plus, Check, Loader2, RotateCw, MousePointerClick } from "lucide-react";
import { ExerciseInfoModal } from "./ExerciseInfoModal";
import { MuscleIcon } from "./MuscleIcon";
import { EXERCISE_DB } from "../lib/exercises";
import { tr } from "../lib/i18n";
import { Overlay } from "../ui";

const Body3D = React.lazy(() => import("./Body3D")); // three.js caricato solo all'apertura

/* ---------------- Libreria esercizi 3D ----------------
   Modello umano ruotabile: clic su un gruppo muscolare → si illumina di rosso
   e a fianco compare l'elenco degli esercizi. I chip sotto il modello fanno lo
   stesso (e coprono il Cardio, che non è un muscolo sul modello).
   Con onAdd (sessione attiva) ogni esercizio si può aggiungere all'allenamento. */
export function AnatomyLibraryModal({ onClose, onAdd, activeNames = [] }) {
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState("");
  const [info, setInfo] = useState(null);
  const [added, setAdded] = useState([]);
  const [modelKind, setModelKind] = useState(null); // "custom" | "atlas" | "basic"

  const groups = Object.keys(EXERCISE_DB);
  const list = useMemo(() => {
    if (q) {
      const out = [];
      for (const [g, l] of Object.entries(EXERCISE_DB))
        for (const e of l) if (tr(e).toLowerCase().includes(q.toLowerCase())) out.push({ name: e, group: g });
      return out;
    }
    return sel ? (EXERCISE_DB[sel] || []).map((e) => ({ name: e, group: sel })) : [];
  }, [q, sel]);

  const isIn = (n) => activeNames.includes(n) || added.includes(n);
  const addOne = (it) => {
    if (!onAdd || isIn(it.name)) return;
    onAdd([it]);
    setAdded((a) => [...a, it.name]);
  };

  return (
    <Overlay>
      {info && <ExerciseInfoModal name={info.name} group={info.group} ex={info} onClose={() => setInfo(null)} />}
      <div className="modal-back" onClick={onClose}>
        <div className="modal-box cham fade-in anat-box" onClick={(e) => e.stopPropagation()}>
          <div className="row between" style={{ alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div className="rep-kicker">{tr("Libreria esercizi")}</div>
              <div className="t-bright" style={{ fontSize: 18, fontWeight: 800 }}>{tr("Scegli un gruppo muscolare")}</div>
            </div>
            <span onClick={onClose} className="tap icon-tap t-faint" title={tr("Chiudi")}><X size={18} /></span>
          </div>

          <div className="anat-grid">
            {/* modello 3D */}
            <div>
              <div className="anat-stage">
                <Suspense fallback={<div className="anat-loading"><Loader2 size={22} className="spin" /></div>}>
                  <Body3D selected={sel} onSelect={(g) => { setSel(g); setQ(""); }} onModel={setModelKind} />
                </Suspense>
                {/* crediti dell'atlante (licenza CC BY-SA 4.0): solo quando è in uso */}
                {modelKind === "atlas" && <a className="anat-credits" href="/models/ANATOMY-ATTRIBUTION.txt" target="_blank" rel="noreferrer"
                  title={tr("Modello 3D: Z-Anatomy / BodyParts3D, © The Database Center for Life Science · CC BY-SA 4.0")}>
                  <Info size={13} />
                </a>}
                <div className="anat-hint">
                  <span><RotateCw size={11} /> {tr("Trascina per ruotare")}</span>
                  <span><MousePointerClick size={11} /> {tr("Tocca un muscolo")}</span>
                </div>
              </div>
              <div className="anat-chips">
                {groups.map((g) => (
                  <button key={g} type="button" onClick={() => { setSel(g); setQ(""); }}
                    className={`tap anat-chip${sel === g && !q ? " on" : ""}`} title={tr(g)} aria-label={tr(g)}>
                    <MuscleIcon group={g} size={14} /><span className="anat-chip-label">{tr(g)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* elenco esercizi */}
            <div className="anat-side">
              <div style={{ position: "relative", marginBottom: 10 }}>
                <Search size={14} color="var(--faint)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                <input className="hud-input cham-s" value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder={tr("Cerca esercizio...")} style={{ paddingLeft: 32 }} />
              </div>

              {!sel && !q ? (
                <div className="anat-empty">
                  <MousePointerClick size={26} />
                  <div className="t-bright" style={{ fontWeight: 700, marginTop: 8 }}>{tr("Nessun gruppo selezionato")}</div>
                  <div className="tiny t-faint" style={{ marginTop: 4, lineHeight: 1.5 }}>
                    {tr("Tocca un muscolo sul modello o scegli un gruppo qui sotto per vedere gli esercizi.")}
                  </div>
                </div>
              ) : (
                <>
                  <div className="row between" style={{ alignItems: "center", marginBottom: 8 }}>
                    <span className="row g6" style={{ alignItems: "center" }}>
                      {!q && <span className="lib-badge anat-badge"><MuscleIcon group={sel} /></span>}
                      <span className="t-bright" style={{ fontWeight: 800, fontSize: 15 }}>
                        {q ? tr("Risultati ricerca") : tr(sel)}
                      </span>
                    </span>
                    <span className="lib-count">{list.length}</span>
                  </div>
                  <div className="anat-list">
                    {list.map((it) => (
                      <div key={it.group + it.name} className="lib-item anat-item">
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "block" }}>{tr(it.name)}</span>
                          {q && <span className="micro t-faint">{tr(it.group)}</span>}
                        </span>
                        <span className="row g6" style={{ flexShrink: 0, alignItems: "center" }}>
                          <span onClick={() => setInfo(it)} className="tap icon-tap" style={{ color: "var(--faint)" }} title={tr("Info esercizio")}>
                            <Info size={14} />
                          </span>
                          {onAdd && (isIn(it.name)
                            ? <span className="anat-add done" title={tr("Già nell'allenamento")}><Check size={13} strokeWidth={3} /></span>
                            : <span onClick={() => addOne(it)} className="tap anat-add" title={tr("Aggiungi all'allenamento")}><Plus size={14} /></span>)}
                        </span>
                      </div>
                    ))}
                    {list.length === 0 && <div className="tiny t-faint" style={{ padding: 8 }}>{tr("Nessun esercizio trovato.")}</div>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
