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

  const toggleAuto = () => {
    const n = !autoOn;
    setAutoOn(n);
    autoRef.current = n;
    setOpen(n);            // feedback immediato: attivando si vede il pannello, disattivando sparisce
    if (!n) setRunning(false);
  };

  useImperativeHandle(ref, () => ({
    start: (seconds) => {
      if (!autoRef.current) return; // timer disattivato dal pulsante: niente popup
      setDur(seconds);
      setLeft(seconds);
      setRunning(true);
      setOpen(true);
    },
    reset: () => {
      setLeft(dur);
      setRunning(false);
    },
  }));

  useEffect(() => {
    if (!running) return;
    if (left <= 0) { setRunning(false); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  /* +/−15s: a timer in corso sposta il tempo rimanente SENZA fermarlo;
     a timer fermo e pieno (mai partito o resettato) riconfigura la durata */
  const bump = (d) => {
    const nDur = Math.max(15, dur + d);
    setDur(nDur);
    setLeft((l) => (l === dur ? nDur : Math.max(0, Math.min(nDur, l + d))));
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
          ? <Btn small onClick={() => setRunning(false)} style={{ flex: 1 }}><Pause size={11} style={{ display: "inline", verticalAlign: -1 }} />{tr("Pausa")}</Btn>
          : <Btn small primary onClick={() => { if (left === 0) setLeft(dur); setRunning(true); }} style={{ flex: 1 }}><Play size={11} style={{ display: "inline", verticalAlign: -1 }} />{tr("Avvia")}</Btn>}
        <Btn small onClick={() => { setLeft(dur); setRunning(false); }} style={{ flex: 1 }}>{tr("↻ Reset")}</Btn>
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
