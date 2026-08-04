import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Timer, Play, Pause } from "lucide-react";
import { tr } from "../lib/i18n";
import { Btn, Overlay } from "../ui";

/* ---------------- Timer interset ---------------- */
/* Di default nascosto: si apre dal pulsante (inline in sessione, flottante altrove).
   Espone una ref con .start(seconds) per avviarlo programmaticamente al completamento di una serie. */
export const FloatingTimer = forwardRef(function FloatingTimer({ inline }, ref) {
  const [open, setOpen] = useState(false);
  const [dur, setDur] = useState(90);
  const [left, setLeft] = useState(90);
  const [running, setRunning] = useState(false);

  useImperativeHandle(ref, () => ({
    start: (seconds) => {
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
  const bump = (d) => { const n = Math.max(15, dur + d); setDur(n); setLeft(n); setRunning(false); };

  const panel = open && (
    <div className={inline ? "timer-pop cham-s fade-in" : "float-timer cham-s fade-in"}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="hud-label">{tr("RECUPERO")}</span>
        <span onClick={() => setOpen(false)} className="tap t-faint" style={{ cursor: "pointer", fontSize: 15, padding: 2 }}>✕</span>
      </div>
      <div className="row g12" style={{ alignItems: "center" }}>
        <span onClick={() => bump(-15)} className="tap tiny t-faint" style={{ cursor: "pointer" }}>−15</span>
        <span className={`f-hud ${left === 0 ? "t-amber" : "t-bright"}`} style={{ fontSize: 30, fontWeight: 700, minWidth: 88, textAlign: "center" }}>
          {left === 0 ? "GO!" : fmt(left)}
        </span>
        <span onClick={() => bump(30)} className="tap tiny t-faint" style={{ cursor: "pointer" }}>+30</span>
      </div>
      <div className="cham-s" style={{ height: 5, background: "var(--soft)", margin: "8px 0" }}>
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
        <Btn small onClick={() => setOpen(!open)} style={{ flexShrink: 0 }}>
          <Timer size={13} color={running && left > 0 ? "#ffd76a" : undefined}
            className={running && left > 0 ? "blink" : ""}
            style={{ display: "inline", verticalAlign: -2, marginRight: 4 }} />
          {tr("Recupero")}
        </Btn>
        {panel}
      </div>
    );
  }

  return (
    <Overlay>
      <button onClick={() => setOpen(!open)} className="float-timer-btn cham-s tap" title={tr("Timer di recupero")}>
        <Timer size={20} color={running && left > 0 ? "#ffd76a" : "var(--cyan)"} className={running && left > 0 ? "blink" : ""} />
      </button>
      {panel}
    </Overlay>
  );
});
