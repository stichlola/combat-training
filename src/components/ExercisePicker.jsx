import React, { useMemo, useState } from "react";
import { Check, Info, Search } from "lucide-react";
import { ExerciseInfoModal } from "./ExerciseInfoModal";
import { EXERCISE_DB } from "../lib/exercises";
import { tr } from "../lib/i18n";
import { Btn, Overlay } from "../ui";

/* ---------------- Popup selezione esercizi (editor + sessione attiva) ----------------
   Stessa grafica della Libreria esercizi: card per categoria apribili/chiudibili,
   dentro una lista verticale (nome a sinistra, pulsante info a destra).
   mode "add": selezione multipla, si conferma con "Aggiungi (N)".
   mode "replace": un tap sull'esercizio lo sceglie come sostituto e chiude il popup. */
export function ExercisePickerModal({ activeNames = [], mode = "add", replacing = null, onAdd, onPick, onClose }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null); // categorie chiuse di default, come in libreria
  const [sel, setSel] = useState([]);     // { name, group } selezionati in modalità aggiungi
  const [info, setInfo] = useState(null);

  const filtered = useMemo(() => {
    if (!q) return EXERCISE_DB;
    const out = {};
    for (const [g, list] of Object.entries(EXERCISE_DB)) {
      const m = list.filter((e) => e.toLowerCase().includes(q.toLowerCase()));
      if (m.length) out[g] = m;
    }
    return out;
  }, [q]);

  const isSel = (name) => sel.some((s) => s.name === name);
  const pickRow = (name, group) => {
    if (mode === "replace") { onPick(name, group); return; }
    if (activeNames.includes(name)) return; // già presente: niente duplicati
    setSel((s) => isSel(name) ? s.filter((x) => x.name !== name) : [...s, { name, group }]);
  };
  const confirm = () => { if (sel.length) onAdd(sel); };

  return (
    <Overlay>
      {info && <ExerciseInfoModal name={info.name} group={info.group} ex={info} onClose={() => setInfo(null)} />}
      <div className="modal-back" onClick={onClose}>
        <div className="modal-box cham fade-in picker-modal" onClick={(e) => e.stopPropagation()}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div className="t-bright" style={{ fontSize: 16, fontWeight: 700 }}>
                {mode === "replace" ? tr("Sostituisci esercizio") : tr("Aggiungi esercizio")}
              </div>
              <div className="micro t-dim" style={{ marginTop: 2 }}>
                {mode === "replace"
                  ? <>{replacing && <span className="t-amber">{tr(replacing)} · </span>}{tr("scegli il nuovo esercizio dall'elenco")}</>
                  : tr("Seleziona gli esercizi e conferma")}
              </div>
            </div>
            <span onClick={onClose} className="tap t-faint" style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0", flexShrink: 0 }}>✕</span>
          </div>

          <div style={{ position: "relative", marginBottom: 10 }}>
            <Search size={14} color="var(--faint)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input className="hud-input cham-s" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={tr("Cerca esercizio...")} style={{ paddingLeft: 32 }} autoFocus />
          </div>

          <div className="picker-list stack-s">
            {Object.entries(filtered).map(([g, list]) => (
              <div key={g}>
                <button onClick={() => setOpen(open === g ? null : g)} className="tap cham-s row between"
                  style={{ width: "100%", padding: "8px 10px", cursor: "pointer", border: "1px solid var(--soft)", background: "var(--card2)" }}>
                  <span className="f-hud t-cyan" style={{ fontSize: 11, letterSpacing: ".2em" }}>{tr(g).toUpperCase()}</span>
                  <span className="tiny t-faint">{list.length} ▾</span>
                </button>
                {(open === g || q) && (
                  <div className="fade-in" style={{ paddingLeft: 4, paddingTop: 2 }}>
                    {list.map((e) => {
                      const active = activeNames.includes(e);
                      const on = isSel(e);
                      return (
                        <div key={e} onClick={() => pickRow(e, g)}
                          className={`row between tap picker-row ${on ? "picker-row-on" : ""}`}
                          style={active && mode === "add" ? { opacity: .5, cursor: "default" } : {}}>
                          <span className="row g8" style={{ minWidth: 0 }}>
                            {mode === "add" && (
                              <span className={`picker-check ${on ? "on" : ""}`}>
                                {on && <Check size={11} strokeWidth={3.5} />}
                              </span>
                            )}
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr(e)}</span>
                          </span>
                          <span className="row g6" style={{ flexShrink: 0, alignItems: "center" }}>
                            {active && mode === "add" && <Check size={13} color="var(--green)" />}
                            <span onClick={(ev) => { ev.stopPropagation(); setInfo({ name: e, group: g }); }}
                              className="tap icon-tap" style={{ color: "var(--faint)" }} title={tr("Info esercizio")}>
                              <Info size={13} />
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {mode === "add" && (
            <div className="row g8" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--hairline)" }}>
              <Btn onClick={onClose} style={{ flex: 1 }}>{tr("Annulla")}</Btn>
              <Btn primary onClick={confirm} disabled={!sel.length} style={{ flex: 2 }}>
                {tr("Aggiungi")}{sel.length ? ` (${sel.length})` : ""}
              </Btn>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}
