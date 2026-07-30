import React, { useState, useEffect } from "react";
import { Timer, Play, Pause } from "lucide-react";
import { tr } from "../lib/i18n";
import { Btn, Overlay } from "../ui";

/* ---------------- Timer interset in sovraimpressione ---------------- */
/* Nascosto di default: si apre dal pulsante flottante, si chiude a piacere */
export function FloatingTimer() {
  const [open, setOpen] = useState(false);
  const [dur, setDur] = useState(90);
  const [left, setLeft] = useState(90);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (left <= 0) { setRunning(false); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const bump = (d) => { const n = Math.max(15, dur + d); setDur(n); setLeft(n); setRunning(false); };

  return (
    <Overlay>
      <button onClick={() => setOpen(!open)} className="float-timer-btn cham-s tap" title={tr("Timer di recupero")}>
        <Timer size={20} color={running && left > 0 ? "#ffd76a" : "#57c8f2"} className={running && left > 0 ? "blink" : ""} />
      </button>
      {open && (
        <div className="float-timer cham-s fade-in">
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
          <div className="cham-s" style={{ height: 5, background: "#0e2233", margin: "8px 0" }}>
            <div style={{ height: "100%", width: `${(left / dur) * 100}%`, background: left === 0 ? "#ffd76a" : "#57c8f2", transition: "width 1s linear" }} />
          </div>
          <div className="row g8">
            {running
              ? <Btn small onClick={() => setRunning(false)} style={{ flex: 1 }}><Pause size={11} style={{ display: "inline", verticalAlign: -1 }} />{tr("Pausa")}</Btn>
              : <Btn small primary onClick={() => { if (left === 0) setLeft(dur); setRunning(true); }} style={{ flex: 1 }}><Play size={11} style={{ display: "inline", verticalAlign: -1 }} />{tr("Avvia")}</Btn>}
            <Btn small onClick={() => { setLeft(dur); setRunning(false); }} style={{ flex: 1 }}>{tr("↻ Reset")}</Btn>
          </div>
        </div>
      )}
    </Overlay>
  );
}
