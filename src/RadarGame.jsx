/* ============================================================
   RADAR DEI TROFEI — minigioco stile Dragon Radar.
   I trofei ancora BLOCCATI sono nascosti nella mappa radar:
   trascini il tuo segnale e quando ti avvicini a un trofeo il
   telefono vibra (se la vibrazione non è supportata, il radar
   pulsa). Catturato il segnale, scopri l'INDIZIO per sbloccarlo:
   compare a schermo e resta registrato nella Sala Trofei
   al posto di "???". Posizioni deterministiche per id trofeo:
   niente da salvare, la mappa è uguale a ogni apertura.
   ============================================================ */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Radar, Lock } from "lucide-react";
import { TROPHIES, RARITY, unlockedTrophies } from "./trophies";

const G = "#39ff88";
const SIZE = 340;                    // lato logico del canvas (px)
const CATCH_D = 0.075;               // distanza di cattura (frazione del raggio)
const SENSE_D = 0.42;                // distanza a cui inizia il feedback

/* posizione pseudo-casuale ma stabile dal trofeo id */
function trophyPos(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  const a = ((h >>> 0) % 360) * (Math.PI / 180);
  const r = 0.3 + (((h >>> 9) % 58) / 100);      // 0.30 – 0.88
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

export default function RadarGame({ stats, prs, level, onFindHint, onClose }) {
  const canvasRef = useRef(null);
  const playerRef = useRef({ x: 0, y: 0 });       // posizione giocatore (-1..1)
  const dragRef = useRef(false);
  const buzzRef = useRef(0);                      // ultimo buzz (ms)
  const foundRef = useRef(null);                  // trofeo in cattura (per fermare il loop)
  const [found, setFound] = useState(null);       // trofeo catturato → overlay indizio

  const hints = (stats && stats.hints) || [];
  const got = unlockedTrophies(stats || {}, prs || {}, level || 1).map((t) => t.id);
  /* sul radar ci sono i trofei bloccati; quelli con indizio già
     trovato restano come blip fisso (mappa "completata") */
  const targets = TROPHIES.filter((t) => !got.includes(t.id)).map((t) => ({
    t, ...trophyPos(t.id), known: hints.includes(t.id),
  }));
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  const buzz = (pattern) => { try { navigator.vibrate && navigator.vibrate(pattern); } catch (_) {} };

  /* puntatore: muovi il tuo segnale trascinando sul radar */
  useEffect(() => {
    const cv = canvasRef.current;
    const toNorm = (e) => {
      const r = cv.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      const d = Math.hypot(x, y);
      return d > 0.97 ? { x: (x / d) * 0.97, y: (y / d) * 0.97 } : { x, y };
    };
    const down = (e) => { dragRef.current = true; playerRef.current = toNorm(e); e.preventDefault(); };
    const move = (e) => { if (dragRef.current) playerRef.current = toNorm(e); };
    const up = () => { dragRef.current = false; };
    cv.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      cv.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  /* loop di disegno + prossimità */
  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv.getContext("2d");
    let raf, t0 = performance.now();

    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      const el = (now - t0) / 1000;
      const half = SIZE / 2;
      ctx.clearRect(0, 0, SIZE, SIZE);

      /* sfondo */
      ctx.fillStyle = "#03130b";
      ctx.beginPath(); ctx.arc(half, half, half - 2, 0, Math.PI * 2); ctx.fill();
      /* anelli */
      ctx.strokeStyle = "rgba(57,255,136,.22)"; ctx.lineWidth = 1;
      [0.33, 0.66, 0.97].forEach((r) => { ctx.beginPath(); ctx.arc(half, half, (half - 2) * r, 0, Math.PI * 2); ctx.stroke(); });
      /* reticolo */
      ctx.strokeStyle = "rgba(57,255,136,.14)";
      ctx.beginPath(); ctx.moveTo(half, 4); ctx.lineTo(half, SIZE - 4); ctx.moveTo(4, half); ctx.lineTo(SIZE - 4, half); ctx.stroke();

      /* spazzata rotante */
      const sweep = (el * 0.9) % (Math.PI * 2);
      const grad = ctx.createConicGradient ? ctx.createConicGradient(sweep, half, half) : null;
      if (grad) {
        grad.addColorStop(0, "rgba(57,255,136,.30)");
        grad.addColorStop(0.12, "rgba(57,255,136,0)");
        grad.addColorStop(1, "rgba(57,255,136,0)");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.moveTo(half, half); ctx.arc(half, half, half - 2, 0, Math.PI * 2); ctx.fill();
      }

      const p = playerRef.current;
      let nearest = null, nearestD = Infinity;

      /* bersagli */
      for (const tg of targetsRef.current) {
        const dx = tg.x - p.x, dy = tg.y - p.y;
        const d = Math.hypot(dx, dy) / 2;              // normalizzata ~0..1
        if (d < nearestD) { nearestD = d; nearest = tg; }
        const px = half + tg.x * (half - 6), py = half + tg.y * (half - 6);
        /* il blip appare se: indizio già noto, giocatore vicino, o spazzata di passaggio */
        const ang = Math.atan2(tg.y, tg.x);
        let da = ((sweep - ang) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const sweepGlow = Math.max(0, 1 - da / 0.9);
        const nearGlow = d < SENSE_D ? 1 - d / SENSE_D : 0;
        const alpha = tg.known ? 0.85 : Math.max(sweepGlow * 0.8, nearGlow);
        if (alpha > 0.03) {
          const col = RARITY[tg.t.rarity].color;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = tg.known ? col : G;
          ctx.beginPath(); ctx.arc(px, py, tg.known ? 5 : 4 + nearGlow * 3, 0, Math.PI * 2); ctx.fill();
          if (nearGlow > 0.4 && !tg.known) {           // alone pulsante quando sei vicino
            ctx.strokeStyle = G; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(px, py, 8 + Math.sin(el * 6) * 3, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }

      /* vibrazione in base alla distanza del bersaglio più vicino */
      if (!foundRef.current && nearest && nearestD < SENSE_D) {
        const k = 1 - nearestD / SENSE_D;              // 0..1
        const interval = 850 - k * 700;                // 850ms → 150ms
        if (now - buzzRef.current > interval) {
          buzzRef.current = now;
          buzz(nearestD < CATCH_D * 1.6 ? [50, 40, 90] : [45]);
        }
        /* cattura! */
        if (nearestD < CATCH_D && !nearest.known) {
          foundRef.current = nearest.t;
          buzz([70, 50, 70, 50, 220]);
          setFound(nearest.t);
        }
      }

      /* giocatore */
      const px = half + p.x * (half - 6), py = half + p.y * (half - 6);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py, 9 + Math.sin(el * 4) * 1.5, 0, Math.PI * 2); ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const claim = () => {
    if (found) onFindHint(found.id);
    foundRef.current = null;
    setFound(null);
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(2,8,5,.96)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="row between" style={{ width: "100%", maxWidth: 420, marginBottom: 10 }}>
        <div className="f-hud row g8" style={{ color: G, fontWeight: 700, fontSize: 12, letterSpacing: ".2em", alignItems: "center" }}>
          <Radar size={16} /> RADAR DEI TROFEI
        </div>
        <span onClick={onClose} className="tap" style={{ color: "#5a7a6a", cursor: "pointer", padding: 6 }}><X size={20} /></span>
      </div>
      <div className="micro" style={{ color: "#4a7a5f", marginBottom: 12, letterSpacing: ".12em" }}>
        INDIZI TROVATI: {hints.length} / {Math.max(1, TROPHIES.length - got.length)}
      </div>

      <div className="cham-s" style={{ border: `1px solid ${G}55`, boxShadow: `0 0 30px ${G}22`, lineHeight: 0 }}>
        <canvas ref={canvasRef} width={SIZE} height={SIZE}
          style={{ width: "min(86vw, 400px)", height: "min(86vw, 400px)", touchAction: "none", cursor: "crosshair" }} />
      </div>
      <div className="micro" style={{ color: "#3a5a48", marginTop: 12, textAlign: "center", letterSpacing: ".1em", lineHeight: 1.8 }}>
        TRASCINA IL SEGNALE SUL RADAR · LA VIBRAZIONE GUIDA LA CACCIA
        <br />TROVA I TROFEI BLOCCATI PER SCOPRIRNE L'INDIZIO
      </div>

      {/* overlay indizio scoperto */}
      {found && (
        <div className="modal-back" style={{ zIndex: 90 }} onClick={claim}>
          <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 360, textAlign: "center", border: `1px solid ${RARITY[found.rarity].border}`, boxShadow: `0 0 34px ${RARITY[found.rarity].color}33` }}>
            <div className="f-hud" style={{ color: G, fontSize: 11, letterSpacing: ".3em", marginBottom: 10 }}>◈ SEGNALE CATTURATO</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <Lock size={30} color={RARITY[found.rarity].color} />
            </div>
            <div className="micro" style={{ color: RARITY[found.rarity].color, letterSpacing: ".2em", marginBottom: 10 }}>
              TROFEO {RARITY[found.rarity].label} · IDENTITÀ IGNOTA
            </div>
            <div className="hud-label" style={{ marginBottom: 6, color: "#8fb2c9" }}>INDIZIO DI SBLOCCO</div>
            <div className="t-bright" style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 18 }}>{found.how}</div>
            <button onClick={claim} className="btn btn-primary cham-s tap" style={{ width: "100%" }}>REGISTRA NELLA SALA TROFEI</button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
