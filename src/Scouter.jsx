/* ============================================================
   SCOUTER — visore AR stile Dragon Ball
   Apre la fotocamera e sovrappone un HUD da scouter: livello di
   potenza, statistiche e reticolo di aggancio, tutto animato.
   (Il reticolo è scenografico: la lettura è generata dal livello
   del giocatore, non da riconoscimento facciale.)
   ============================================================ */
import React, { useEffect, useRef, useState } from "react";
import { X, RefreshCw } from "lucide-react";

const G = "#39ff88";

function jitter(base, spread) {
  return Math.max(1, Math.round(base * (1 + (Math.random() - 0.5) * spread)));
}

export default function Scouter({ level = 1, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [err, setErr] = useState(null);
  const [phase, setPhase] = useState("scan");          // scan | lock
  const [power, setPower] = useState(0);
  const [stats, setStats] = useState({ for: 0, res: 0, vel: 0 });
  const [over9k, setOver9k] = useState(false);

  /* valori base derivati dal livello del giocatore */
  const base = {
    power: 900 + level * 260,
    for: Math.min(99, 30 + level * 2.4),
    res: Math.min(99, 28 + level * 2.2),
    vel: Math.min(99, 26 + level * 2.0),
  };

  /* fotocamera */
  useEffect(() => {
    let dead = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (dead) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => setErr("Fotocamera non disponibile. Controlla i permessi del browser."));
    return () => {
      dead = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* ciclo di scansione: numeri che "frullano" poi si agganciano */
  useEffect(() => {
    let iv;
    if (phase === "scan") {
      iv = setInterval(() => {
        setPower(jitter(base.power * 1.6, 0.9));
        setStats({ for: jitter(base.for, 0.8), res: jitter(base.res, 0.8), vel: jitter(base.vel, 0.8) });
      }, 90);
      const t = setTimeout(() => setPhase("lock"), 2200);
      return () => { clearInterval(iv); clearTimeout(t); };
    }
    // fase lock: valori stabili con micro-oscillazione
    setOver9k(level >= 25 && Math.random() < 0.35);
    iv = setInterval(() => {
      setPower(jitter(base.power, 0.06));
      setStats({ for: jitter(base.for, 0.05), res: jitter(base.res, 0.05), vel: jitter(base.vel, 0.05) });
    }, 400);
    return () => clearInterval(iv);
  }, [phase]);

  const rescan = () => setPhase("scan");

  const bar = (v) => (
    <div style={{ height: 6, background: "rgba(57,255,136,.15)", flex: 1 }}>
      <div style={{ height: "100%", width: `${Math.min(100, v)}%`, background: G, boxShadow: `0 0 6px ${G}`, transition: "width .3s" }} />
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#000", fontFamily: "monospace" }}>
      {/* feed fotocamera */}
      <video ref={videoRef} playsInline muted
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "saturate(.85) contrast(1.05)" }} />

      {/* tinta verde + scanline */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(20,80,40,.12)", pointerEvents: "none" }} />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg, rgba(0,0,0,.14) 0 1px, transparent 1px 3px)",
      }} />

      {/* cornice scouter */}
      <div style={{ position: "absolute", inset: 14, border: `2px solid ${G}`, boxShadow: `inset 0 0 40px rgba(57,255,136,.12)`, pointerEvents: "none" }}>
        {[["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]].map(([v, h]) => (
          <div key={v + h} style={{
            position: "absolute", [v]: -2, [h]: -2, width: 34, height: 34,
            borderTop: v === "top" ? `5px solid ${G}` : "none",
            borderBottom: v === "bottom" ? `5px solid ${G}` : "none",
            borderLeft: h === "left" ? `5px solid ${G}` : "none",
            borderRight: h === "right" ? `5px solid ${G}` : "none",
          }} />
        ))}
      </div>

      {/* reticolo centrale */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }}>
        <div style={{
          width: 180, height: 180, border: `2px ${phase === "scan" ? "dashed" : "solid"} ${G}`,
          borderRadius: "50%", opacity: .85,
          animation: phase === "scan" ? "scouterSpin 3s linear infinite" : "none",
          boxShadow: phase === "lock" ? `0 0 24px rgba(57,255,136,.35)` : "none",
        }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 10, height: 10, transform: "translate(-50%,-50%)", background: G, borderRadius: "50%", boxShadow: `0 0 10px ${G}` }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 240, height: 1, transform: "translate(-50%,-50%)", background: `linear-gradient(90deg, transparent, ${G}88, transparent)` }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 1, height: 240, transform: "translate(-50%,-50%)", background: `linear-gradient(180deg, transparent, ${G}88, transparent)` }} />
      </div>

      {/* etichetta stato */}
      <div style={{ position: "absolute", top: 26, left: 30, color: G, fontSize: 12, letterSpacing: ".25em", textShadow: `0 0 8px ${G}` }}>
        SCOUTER v2.7 — {phase === "scan" ? "ANALISI SOGGETTO…" : "◉ AGGANCIO"}
      </div>

      {/* pannello lettura */}
      <div style={{
        position: "absolute", top: "50%", right: 30, transform: "translateY(-50%)",
        color: G, textAlign: "right", textShadow: `0 0 8px ${G}`, minWidth: 190,
      }}>
        <div style={{ fontSize: 11, letterSpacing: ".2em", opacity: .9 }}>LIVELLO DI POTENZA</div>
        <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
          {power.toLocaleString()}
        </div>
        {over9k && phase === "lock" && (
          <div style={{ fontSize: 12, fontWeight: 700, color: "#ffd76a", textShadow: "0 0 8px #ffd76a", animation: "scouterBlink 1s steps(2) infinite" }}>
            ⚠ OLTRE 9000 ⚠
          </div>
        )}
        <div style={{ marginTop: 14, display: "grid", gap: 8, fontSize: 11, letterSpacing: ".15em" }}>
          {[["FOR", stats.for], ["RES", stats.res], ["VEL", stats.vel]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 30 }}>{l}</span>
              {bar(v)}
              <span style={{ width: 26, fontVariantNumeric: "tabular-nums" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 10, opacity: .75, letterSpacing: ".12em" }}>
          {phase === "scan" ? "CALIBRAZIONE LENTE…" : "SOGGETTO VALUTATO — MINACCIA: BASSA"}
        </div>
      </div>

      {/* errore fotocamera */}
      {err && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.85)", padding: 24 }}>
          <div style={{ color: G, textAlign: "center", fontSize: 14, lineHeight: 1.7, maxWidth: 320 }}>{err}</div>
        </div>
      )}

      {/* controlli */}
      <button onClick={rescan} style={{
        position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)",
        background: "rgba(0,40,20,.7)", border: `2px solid ${G}`, color: G,
        padding: "12px 26px", fontSize: 12, letterSpacing: ".25em", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace",
      }}>
        <RefreshCw size={14} /> RISCANSIONA
      </button>
      <button onClick={onClose} style={{
        position: "absolute", top: 24, right: 30, background: "rgba(0,40,20,.7)",
        border: `2px solid ${G}`, color: G, padding: 10, cursor: "pointer",
      }}>
        <X size={18} />
      </button>

      <style>{`
        @keyframes scouterSpin { to { transform: rotate(360deg); } }
        @keyframes scouterBlink { 50% { opacity: .2; } }
      `}</style>
    </div>
  );
}
