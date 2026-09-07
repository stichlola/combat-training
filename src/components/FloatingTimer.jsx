import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Timer, TimerOff, Play, Pause } from "lucide-react";
import { tr } from "../lib/i18n";
import { Btn, Overlay } from "../ui";

/* ---------------- Timer interset ---------------- */
/* Il pulsante flottante ATTIVA/DISATTIVA il timer di recupero automatico:
   icona Timer (accesa) = al completamento di una serie il popup parte da solo;
   icona TimerOff (spenta) = nessun popup. Il cambio d'icona rende lo stato evidente.
   Espone una ref con .start(seconds) chiamata al completamento di una serie. */
export const FloatingTimer = forwardRef(function FloatingTimer({ inline }, ref) {
  const [open, setOpen] = useState(false);
  const [dur, setDur] = useState(90);
  const [left, setLeft] = useState(90);
  const [running, setRunning] = useState(false);
  const [autoOn, setAutoOn] = useState(true); // timer automatico attivo di default
  const autoRef = useRef(true);               // mirror leggibile dalla ref imperativa
  const endAtRef = useRef(null);            // timestamp di fine: il countdown NON dipende dai tick del browser

  const toggleAuto = () => {
    const n = !autoOn;
    setAutoOn(n);
    autoRef.current = n;
    setOpen(n);            // feedback immediato: attivando si vede il pannello, disattivando sparisce
    if (!n) { setRunning(false); endAtRef.current = null; }
  };

  useImperativeHandle(ref, () => ({
    start: (seconds) => {
      if (!autoRef.current) return; // timer disattivato dal pulsante: niente popup
      setDur(seconds);
      setLeft(seconds);
      endAtRef.current = Date.now() + seconds * 1000;
      setRunning(true);
      setOpen(true);
    },
    reset: () => {
      setRunning(false);
      endAtRef.current = null;
      setLeft(dur);
    },
  }));

  /* Countdown ancorato al timestamp reale: se la scheda va in background
     (Chrome sospende i timer), il tempo continua comunque a scendere e il
     display si riallinea al ritorno (visibilitychange / focus). */
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const l = Math.max(0, Math.ceil(((endAtRef.current || Date.now()) - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) { setRunning(false); endAtRef.current = null; }
    };
    tick();
    const iv = setInterval(tick, 250);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onVis); };
  }, [running]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  /* +/−15s: a timer in corso sposta il tempo rimanente SENZA fermarlo;
     a timer fermo e pieno (mai partito o resettato) riconfigura la durata */
  const bump = (d) => {
    const nDur = Math.max(15, dur + d);
    setDur(nDur);
    const nl = left === dur ? nDur : Math.max(0, Math.min(nDur, left + d));
    setLeft(nl);
    if (running) endAtRef.current = Date.now() + nl * 1000;
  };

  const panel = open && (
    <div className={inline ? "timer-pop cham-s fade-in" : "float-timer cham-s fade-in"}>
      <div className="row between" style={{ marginBottom: 2 }}>
        <span className="hud-label">{tr("RECUPERO")}</span>
        <span onClick={() => setOpen(false)} className="tap t-faint" style={{ cursor: "pointer", fontSize: 15, padding: 2 }}>✕</span>
      </div>
      <div className="row g8" style={{ alignItems: "center", justifyContent: "center" }}>
        <span onClick={() => bump(-15)} className="tap tiny t-faint" style={{ cursor: "pointer", padding: "6px 8px" }}>−15</span>
        <span className={`f-hud ${left === 0 ? "t-amber" : "t-bright"}`} style={{ fontSize: 24, fontWeight: 700, minWidth: 64, textAlign: "center" }}>
          {left === 0 ? "GO!" : fmt(left)}
        </span>
        <span onClick={() => bump(15)} className="tap tiny t-faint" style={{ cursor: "pointer", padding: "6px 8px" }}>+15</span>
      </div>
      <div className="cham-s" style={{ height: 4, background: "var(--soft)", margin: "6px 0" }}>
        <div style={{ height: "100%", width: `${(left / dur) * 100}%`, background: left === 0 ? "#ffd76a" : "var(--cyan)", transition: "width 1s linear" }} />
      </div>
      <div className="row g8">
        {running
          ? <Btn small onClick={() => { const l = Math.max(0, Math.ceil(((endAtRef.current || Date.now()) - Date.now()) / 1000)); setLeft(l); setRunning(false); endAtRef.current = null; }} style={{ flex: 1 }}><Pause size={11} style={{ display: "inline", verticalAlign: -1 }} />{tr("Pausa")}</Btn>
          : <Btn small primary onClick={() => { const secs = left === 0 ? dur : left; if (left === 0) setLeft(dur); endAtRef.current = Date.now() + secs * 1000; setRunning(true); }} style={{ flex: 1 }}><Play size={11} style={{ display: "inline", verticalAlign: -1 }} />{tr("Avvia")}</Btn>}
        <Btn small onClick={() => { setRunning(false); endAtRef.current = null; setLeft(dur); }} style={{ flex: 1 }}>{tr("↻ Reset")}</Btn>
      </div>
    </div>
  );

  /* inline: bottone normale nel flusso, pannello a comparsa sotto il bottone */
  if (inline) {
    return (
      <div className="timer-inline">
        <Btn small onClick={toggleAuto} style={{ flexShrink: 0 }}>
          {autoOn
            ? <Timer size={13} color={running && left > 0 ? "#ffd76a" : undefined}
                className={running && left > 0 ? "blink" : ""}
                style={{ display: "inline", verticalAlign: -2, marginRight: 4 }} />
            : <TimerOff size={13} style={{ display: "inline", verticalAlign: -2, marginRight: 4 }} />}
          {tr("Recupero")}
        </Btn>
        {panel}
      </div>
    );
  }

  return (
    <Overlay>
      <button onClick={toggleAuto} className="float-timer-btn cham-s tap"
        title={autoOn ? tr("Timer recupero ATTIVO — tocca per disattivare") : tr("Timer recupero DISATTIVATO — tocca per attivare")}
        style={!autoOn ? { borderColor: "var(--soft2)", boxShadow: "none", opacity: .75 } : undefined}>
        {autoOn
          ? <Timer size={20} color={running && left > 0 ? "#ffd76a" : "var(--cyan)"} className={running && left > 0 ? "blink" : ""} />
          : <TimerOff size={20} color="var(--dim)" />}
      </button>
      {panel}
    </Overlay>
  );
});
