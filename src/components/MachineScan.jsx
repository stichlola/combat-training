import React, { useState, useRef } from "react";
import { Loader2, Camera } from "lucide-react";
import { aiCall, parseLoose, resizeImage } from "../lib/ai";
import { EXERCISE_DB, EXERCISE_INFO, EXERCISE_MEDIA, INFO_FALLBACK } from "../lib/exercises";
import { tr } from "../lib/i18n";
import { Btn, Overlay } from "../ui";

/* ================================ MACHINE SCAN ================================ */
/* Mappa leggera macchinario -> esercizi (1 a N) sopra il database esistente:
   gli esercizi restano l'unità base (immagini, descrizioni, PR), i macchinari li indicizzano */
const MACHINE_DB = {
  "Panca Piana": ["Panca Piana Bilanciere", "Panca Piana Manubri", "Panca Presa Stretta", "Croci Manubri"],
  "Panca Inclinata": ["Panca Inclinata Bilanciere", "Panca Inclinata Manubri"],
  "Panca Declinata": ["Panca Declinata"],
  "Power Rack / Rastrelliera Squat": ["Squat Bilanciere", "Front Squat", "Military Press", "Stacco da Terra", "Rematore Bilanciere", "Shrug Bilanciere"],
  "Smith Machine (Multipower)": ["Squat Bilanciere", "Panca Piana Bilanciere", "Military Press", "Hip Thrust", "Calf Raise in Piedi"],
  "Lat Machine": ["Lat Machine Avanti", "Lat Machine Presa Stretta", "Pull-Down Braccia Tese"],
  "Pulley Basso": ["Pulley Basso"],
  "Stazione ai Cavi": ["Croci ai Cavi", "Curl ai Cavi", "Pushdown Tricipiti", "Pushdown Corda", "Face Pull", "Crunch ai Cavi", "Alzate Laterali ai Cavi", "Pull-Down Braccia Tese"],
  "Chest Press": ["Chest Press"],
  "Pectoral Machine": ["Pectoral Machine"],
  "Leg Press": ["Leg Press"],
  "Hack Squat Machine": ["Hack Squat"],
  "Leg Extension Machine": ["Leg Extension"],
  "Leg Curl Machine": ["Leg Curl Sdraiato", "Leg Curl Seduto"],
  "Calf Machine": ["Calf Raise in Piedi", "Calf Raise Seduto"],
  "Shoulder Press Machine": ["Shoulder Press Manubri", "Military Press"],
  "Panca Scott": ["Curl Panca Scott", "Spider Curl"],
  "Parallele / Dip Station": ["Dip alle Parallele"],
  "Sbarra Trazioni": ["Trazioni", "Trazioni Presa Inversa", "Hanging Leg Raise"],
  "Panca Hyperextension": ["Hyperextension"],
  "Rastrelliera Manubri": ["Panca Piana Manubri", "Croci Manubri", "Curl Manubri Alternato", "Hammer Curl", "Alzate Laterali", "Alzate Frontali", "Shoulder Press Manubri", "Affondi Manubri", "Rematore Manubrio", "Kickback Manubrio"],
  "T-Bar Row": ["Rematore T-Bar"],
  "Tapis Roulant": ["Tapis Roulant", "Corsa", "Camminata Veloce"],
  "Cyclette": ["Cyclette"],
  "Ellittica": ["Ellittica"],
  "Vogatore": ["Vogatore"],
  "Stepper / Stairmaster": ["Stepper"],
};
const findExGroup = (name) => {
  for (const [g, list] of Object.entries(EXERCISE_DB)) if (list.includes(name)) return g;
  return "Altro";
};

export function MachineScan({ premium, variant, currentNames, onAdd, fireToast, fabBottom = 121 }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);   // { machine, exercises } | { unknown, guess } | { error }
  const [openEx, setOpenEx] = useState(null);
  const camRef = useRef(null);

  const analyze = async (f) => {
    if (premium && premium.guest) return premium.open();  // ospite: nessuna funzione AI
    setBusy(true); setRes(null); setOpenEx(null);
    try {
      const { b64, type } = await resizeImage(f, 1024);
      const content = [
        { type: "image", source: { type: "base64", media_type: type, data: b64 } },
        { type: "text", text: `Questa è la foto di un macchinario o attrezzo da palestra. Riconoscilo e scegli ESATTAMENTE uno di questi nomi: ${Object.keys(MACHINE_DB).join(" | ")}.
Rispondi SOLO con JSON valido senza markdown: {"machine": string (nome esatto dalla lista, oppure null se non riconoscibile), "guess": string (breve descrizione di cosa vedi, in italiano)}` },
      ];
      const data = await aiCall({ model: "claude-sonnet-5", max_tokens: 300, messages: [{ role: "user", content }] }, "scan");
      if (data.error === "limit_reached") { if (premium) premium.open(); throw new Error(tr("Limite settimanale scan raggiunto")); }
      if (data.error === "premium_required") { if (premium) premium.open(); throw new Error("Premium"); }
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : (data.error.message || "Errore API"));
      if (data.error) throw new Error(data.error === "premium_required" ? "Funzione riservata a Premium" : data.error);
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const parsed = parseLoose(text);
      if (parsed.machine && MACHINE_DB[parsed.machine]) {
        /* esercizi già nella scheda in cima e aperti; gli altri collassati sotto */
        const inWo = MACHINE_DB[parsed.machine].filter((e) => currentNames.includes(e));
        const rest = MACHINE_DB[parsed.machine].filter((e) => !currentNames.includes(e));
        setRes({ machine: parsed.machine, exercises: [...inWo, ...rest] });
        setOpenEx(inWo[0] || null);
      } else {
        setRes({ unknown: true, guess: parsed.guess || "" });
      }
    } catch (e) {
      setRes({ error: e.message || "Errore sconosciuto" });
    }
    setBusy(false);
  };

  /* il FAB mostra fotocamera + "AI" ed è grande esattamente come il pulsante del timer;
     rispetta l'altezza richiesta (fabBottom): in modifica scheda sta più in basso */
  const trigger = variant === "float" ? (
    <button onClick={() => camRef.current && camRef.current.click()} className="float-cam-btn cham-s tap" title={tr("Scansiona macchinario")}
      style={{ bottom: fabBottom }}>
      {busy
        ? <Loader2 size={18} color="#ffd76a" className="spin" />
        : <>
            <Camera size={15} color="#fff" />
            <span className="f-hud" style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".06em", lineHeight: 1, color: "#fff" }}>AI</span>
          </>}
    </button>
  ) : variant === "small" ? (
    <Btn small ai onClick={() => camRef.current && camRef.current.click()} style={{ flex: 1 }} title={tr("Fotografa un attrezzo in palestra: l'AI lo riconoscerà e aggiungerà gli esercizi corretti.")}>
      {busy ? <Loader2 size={12} className="spin" style={{ display: "inline", verticalAlign: -2 }} /> : <Camera size={12} style={{ display: "inline", verticalAlign: -2 }} />} {tr("Scansiona con AI")}
    </Btn>
  ) : (
    <Btn ai full onClick={() => camRef.current && camRef.current.click()} style={{ padding: 13, fontWeight: 700, letterSpacing: ".15em", marginTop: 10 }}>
      <div className="row center g8">
        {busy ? <Loader2 size={13} className="spin" /> : <Camera size={13} />}
        {tr("SCANSIONE MACCHINARIO AI")}
      </div>
    </Btn>
  );

  return (
    <>
      <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) analyze(f); e.target.value = ""; }} />
      {variant === "float" ? <Overlay>{trigger}</Overlay> : trigger}

      {(res || busy) && (
        <Overlay>
        <div className="modal-back" onClick={() => !busy && setRes(null)}>
          <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}>
            {busy && (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <Loader2 size={26} color="var(--cyan)" className="spin" style={{ margin: "0 auto 10px" }} />
                <div className="f-hud t-cyan" style={{ letterSpacing: ".2em", fontSize: 12 }}>{tr("ANALISI MACCHINARIO...")}</div>
              </div>
            )}
            {res && res.error && (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div className="tiny t-red">⚠ Analisi fallita: {typeof res.error === "string" ? res.error : "riprova con una foto più chiara"}</div>
                <Btn small onClick={() => setRes(null)} style={{ marginTop: 12 }}>{tr("Chiudi")}</Btn>
              </div>
            )}
            {res && res.unknown && (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div className="f-hud t-amber" style={{ letterSpacing: ".15em", fontSize: 13, fontWeight: 700 }}>{tr("MACCHINARIO NON RICONOSCIUTO")}</div>
                {res.guess && <div className="tiny t-dim" style={{ marginTop: 8, lineHeight: 1.6 }}>Sembra: {res.guess}</div>}
                <div className="tiny t-faint" style={{ marginTop: 6 }}>{tr("Prova a inquadrare il macchinario per intero, da davanti.")}</div>
                <Btn small onClick={() => setRes(null)} style={{ marginTop: 12 }}>{tr("Chiudi")}</Btn>
              </div>
            )}
            {res && res.machine && (
              <>
                <div className="row between" style={{ marginBottom: 2 }}>
                  <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".18em", fontSize: 13 }}>{tr("◈ MACCHINARIO")}</div>
                  <span onClick={() => setRes(null)} className="tap t-faint" style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0" }}>✕</span>
                </div>
                <div className="t-bright" style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>{tr(res.machine)}</div>
                <div className="tiny t-faint" style={{ marginBottom: 14 }}>{res.exercises.length} ESERCIZI POSSIBILI</div>

                <div className="stack-s">
                  {res.exercises.map((name) => {
                    const g = findExGroup(name);
                    const inWo = currentNames.includes(name);
                    const open = openEx === name;
                    return (
                      <div key={name} className="cham-s" style={{ border: `1px solid ${inWo ? "var(--cyan)" : "var(--soft)"}`, background: "var(--card2)" }}>
                        <button onClick={() => setOpenEx(open ? null : name)} className="tap row between"
                          style={{ width: "100%", padding: "10px 12px", cursor: "pointer" }}>
                          <span className="row g8">
                            <span className="t-bright" style={{ fontSize: 14, fontWeight: 700, textAlign: "left" }}>{tr(name)}</span>
                            {inWo && <span className="micro cham-s" style={{ padding: "2px 7px", border: "1px solid var(--cyan)", color: "var(--cyan)" }}>{tr("IN SCHEDA")}</span>}
                          </span>
                          <span className="row g8" style={{ alignItems: "center" }}>
                            <span className="micro t-cyan">{tr(g).toUpperCase()}</span>
                            <span className="t-faint">{open ? "▾" : "▸"}</span>
                          </span>
                        </button>
                        {open && (
                          <div className="fade-in" style={{ padding: "0 12px 12px" }}>
                            {EXERCISE_MEDIA[name] && (
                              <div className="cham-s" style={{ height: 150, marginBottom: 10, background: "#eef2f5", overflow: "hidden" }}>
                                <img src={EXERCISE_MEDIA[name]} alt={name} loading="lazy"
                                  style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                              </div>
                            )}
                            <div className="tiny t-dim" style={{ lineHeight: 1.65 }}>
                              {tr(EXERCISE_INFO[name] || INFO_FALLBACK[g] || INFO_FALLBACK.Altro)}
                            </div>
                            {!inWo && (
                              <Btn small primary full style={{ marginTop: 10 }}
                                onClick={() => { onAdd(name, g); fireToast({ title: tr("◈ ESERCIZIO AGGIUNTO"), sub: name }); setRes(null); }}>
                                {tr("＋ Aggiungi all'allenamento")}
                              </Btn>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
        </Overlay>
      )}
    </>
  );
}
