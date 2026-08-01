/* ============================================================
   SCOUTER — visore AR stile Dragon Ball
   Fotocamera + riconoscimento REALE del soggetto (lazy, solo
   all'apertura). Sensore primario: MoveNet MultiPose — lavora
   sui punti chiave del corpo, quindi aggancia bene anche i
   mezzi busti e i primi piani dove COCO-SSD fatica. Riserva:
   COCO-SSD (soglia bassa) se il primo non si carica. Offline:
   resta il reticolo scenografico.
   La lettura di potenza deriva dal livello del giocatore.
   ============================================================ */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, RefreshCw } from "lucide-react";
import { supabase } from "./lib/supabase";

const G = "#39ff88";

function jitter(base, spread) {
  return Math.max(1, Math.round(base * (1 + (Math.random() - 0.5) * spread)));
}

export default function Scouter({ level = 1, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const modelRef = useRef(null);
  const targetRef = useRef(null);      // ultimo box rilevato (coordinate display)
  const [err, setErr] = useState(null);
  const [sensor, setSensor] = useState("load");   // load | on | off
  const [locked, setLocked] = useState(false);
  const [box, setBox] = useState(null);           // {x,y,w,h} in px display
  const [power, setPower] = useState(0);
  const [stats, setStats] = useState({ for: 0, res: 0, vel: 0 });
  const [over9k, setOver9k] = useState(false);
  const [burst, setBurst] = useState(0);          // forza il rimescolamento letture
  const [bio, setBio] = useState(null);           // risultato bio-scansione AI
  const [bioState, setBioState] = useState("idle"); // idle | pending | done | error

  const base = {
    power: 900 + level * 260,
    for: Math.min(99, 30 + level * 2.4),
    res: Math.min(99, 28 + level * 2.2),
    vel: Math.min(99, 26 + level * 2.0),
  };

  /* ---------- fotocamera ---------- */
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

  /* ---------- modello di rilevamento persone (lazy) ----------
     Primario: MoveNet MultiPose (punti chiave → ottimo su mezzi
     busti e primi piani). Riserva: COCO-SSD a soglia bassa. */
  useEffect(() => {
    let dead = false, timer = null;

    // box del soggetto dai punti chiave: margine generoso e vincoli al frame
    const boxFromKeypoints = (kps, vw, vh) => {
      const good = kps.filter((k) => (k.score ?? 0) >= 0.3);
      if (good.length < 4) return null;   // troppo pochi punti: non è una persona affidabile
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      good.forEach((k) => {
        x0 = Math.min(x0, k.x); y0 = Math.min(y0, k.y);
        x1 = Math.max(x1, k.x); y1 = Math.max(y1, k.y);
      });
      let w = x1 - x0, h = y1 - y0;
      // i punti chiave coprono solo l'interno del corpo: allarga per testa/spalle/gambe
      const padX = w * 0.22, padTop = h * 0.28, padBottom = h * 0.12;
      x0 = Math.max(0, x0 - padX); y0 = Math.max(0, y0 - padTop);
      x1 = Math.min(vw, x1 + padX); y1 = Math.min(vh, y1 + padBottom);
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    };

    // da coordinate video → coordinate schermo (object-fit: cover)
    const toDisplay = (b, v) => {
      const vw = v.videoWidth, vh = v.videoHeight;
      const cw = v.clientWidth, ch = v.clientHeight;
      const s = Math.max(cw / vw, ch / vh);
      const ox = (vw * s - cw) / 2, oy = (vh * s - ch) / 2;
      return { x: b.x * s - ox, y: b.y * s - oy, w: b.w * s, h: b.h * s };
    };

    (async () => {
      let detectPerson = null;   // funzione unificata: video → box video | null
      try {
        const [pd, tf] = await Promise.all([
          import("@tensorflow-models/pose-detection"),
          import("@tensorflow/tfjs"),
          import("@tensorflow/tfjs-backend-webgl"),
        ]);
        if (dead) return;
        // pose-detection registra webgpu come backend prioritario: dove non
        // esiste romperebbe tutto → forza webgl (riserva: cpu) prima di usarlo
        try { if (!(await tf.setBackend("webgl"))) await tf.setBackend("cpu"); } catch { try { await tf.setBackend("cpu"); } catch {} }
        await tf.ready();
        const det = await pd.createDetector(pd.SupportedModels.MoveNet, {
          modelType: pd.movenet.modelType.MULTIPOSE_LIGHTNING,
          enableSmoothing: true,
        });
        modelRef.current = det;
        detectPerson = async (v) => {
          const poses = await det.estimatePoses(v, { maxPoses: 5, flipHorizontal: false });
          const boxes = poses
            .map((p) => boxFromKeypoints(p.keypoints, v.videoWidth, v.videoHeight))
            .filter(Boolean);
          if (!boxes.length) return null;
          // il soggetto più grande inquadrato
          return boxes.reduce((a, b) => (a.w * a.h > b.w * b.h ? a : b));
        };
      } catch (e1) {
        console.warn("scouter: MoveNet non disponibile, passo a COCO-SSD —", e1?.message || e1);
        // riserva: COCO-SSD con soglia più permissiva (mezzi busti hanno score basso)
        try {
          const coco = await import("@tensorflow-models/coco-ssd");
          if (dead) return;
          const m = await coco.load({ base: "lite_mobilenet_v2" });
          modelRef.current = m;
          detectPerson = async (v) => {
            const preds = await m.detect(v, 6, 0.28);
            const people = preds.filter((p) => p.class === "person");
            if (!people.length) return null;
            const p = people.reduce((a, b) => (a.bbox[2] * a.bbox[3] > b.bbox[2] * b.bbox[3] ? a : b));
            return { x: p.bbox[0], y: p.bbox[1], w: p.bbox[2], h: p.bbox[3] };
          };
        } catch (e2) {
          console.warn("scouter: nessun modello di rilevamento disponibile —", e2?.message || e2);
          if (!dead) setSensor("off");   // niente modello: reticolo scenografico
          return;
        }
      }
      if (dead) return;
      setSensor("on");
      const tick = async () => {
        const v = videoRef.current;
        if (!dead && detectPerson && v && v.readyState >= 2 && v.videoWidth) {
          try {
            const b = await detectPerson(v);
            targetRef.current = b ? toDisplay(b, v) : null;
          } catch {}
        }
        timer = setTimeout(tick, 220);
      };
      tick();
    })();
    return () => { dead = true; clearTimeout(timer); modelRef.current?.dispose?.(); modelRef.current = null; };
  }, []);

  /* ---------- smoothing del box + stato aggancio ---------- */
  useEffect(() => {
    let raf, cur = null;
    const loop = () => {
      const t = targetRef.current;
      if (t) {
        cur = cur
          ? { x: cur.x + (t.x - cur.x) * 0.3, y: cur.y + (t.y - cur.y) * 0.3,
              w: cur.w + (t.w - cur.w) * 0.3, h: cur.h + (t.h - cur.h) * 0.3 }
          : t;
        setBox({ ...cur });
        setLocked(true);
      } else {
        cur = null;
        setBox(null);
        setLocked(false);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------- bio-scansione AI al primo aggancio ---------- */
  const captureFrame = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const s = Math.min(1, 768 / v.videoWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * s);
    c.height = Math.round(v.videoHeight * s);
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.72);
  };

  useEffect(() => {
    if (!locked || bioState !== "idle") return;
    setBioState("pending");
    (async () => {
      try {
        const img = captureFrame();
        if (!img) throw new Error("frame");
        const { data: sess } = await supabase.auth.getSession();
        const token = sess?.session?.access_token;
        if (!token) throw new Error("auth");   // ospite: resta la lettura sintetica
        const r = await fetch("/api/scan-subject", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ image: img }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "scan");
        setBio(d);
        setBioState("done");
      } catch {
        setBioState("error");   // fallback silenzioso: valori sintetici
      }
    })();
  }, [locked, bioState]);

  /* ---------- letture di potenza ---------- */
  useEffect(() => {
    let iv;
    if (!locked) {
      iv = setInterval(() => {
        setPower(jitter(base.power * 1.6, 0.9));
        setStats({ for: jitter(base.for, 0.8), res: jitter(base.res, 0.8), vel: jitter(base.vel, 0.8) });
      }, 90);
      return () => clearInterval(iv);
    }
    if (bioState === "done" && bio) {
      // valori reali dal modello, con micro-vibrazione da strumento
      setOver9k(bio.power > 9000);
      iv = setInterval(() => {
        setPower(jitter(bio.power, 0.02));
        setStats({ for: jitter(bio.forza, 0.03), res: jitter(bio.riflessi, 0.03), vel: jitter(bio.tecnica, 0.03) });
      }, 500);
      return () => clearInterval(iv);
    }
    setOver9k(level >= 25 && Math.random() < 0.35);
    iv = setInterval(() => {
      setPower(jitter(base.power, 0.06));
      setStats({ for: jitter(base.for, 0.05), res: jitter(base.res, 0.05), vel: jitter(base.vel, 0.05) });
    }, 400);
    return () => clearInterval(iv);
  }, [locked, burst, bioState, bio]);

  const rescan = () => { targetRef.current = null; setBio(null); setBioState("idle"); setBurst((b) => b + 1); };

  const bar = (v) => (
    <div style={{ height: 6, background: "rgba(57,255,136,.15)", flex: 1 }}>
      <div style={{ height: "100%", width: `${Math.min(100, v)}%`, background: G, boxShadow: `0 0 6px ${G}`, transition: "width .3s" }} />
    </div>
  );

  const statusText =
    sensor === "load" ? "CARICAMENTO SENSORI…"
    : locked && bioState === "pending" ? "◉ BIO-SCANSIONE…"
    : locked ? "◉ AGGANCIO"
    : sensor === "on" ? "RICERCA SOGGETTO…"
    : "ANALISI SOGGETTO…";

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", fontFamily: "monospace", overflow: "hidden" }}>
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

      {/* reticolo di ricerca (quando nessun soggetto è agganciato) */}
      {!locked && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }}>
          <div className="sc-reticle" style={{
            border: `2px dashed ${G}`, borderRadius: "50%", opacity: .85,
            animation: "scouterSpin 3s linear infinite",
          }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", width: 10, height: 10, transform: "translate(-50%,-50%)", background: G, borderRadius: "50%", boxShadow: `0 0 10px ${G}` }} />
          <div className="sc-cross" style={{ position: "absolute", top: "50%", left: "50%", height: 1, transform: "translate(-50%,-50%)", background: `linear-gradient(90deg, transparent, ${G}88, transparent)` }} />
          <div className="sc-cross" style={{ position: "absolute", top: "50%", left: "50%", width: 1, transform: "translate(-50%,-50%)", background: `linear-gradient(180deg, transparent, ${G}88, transparent)` }} />
        </div>
      )}

      {/* staffe di mira sul soggetto tracciato */}
      {locked && box && (
        <>
        <div style={{
          position: "absolute", left: box.x - 8, top: box.y - 8, width: box.w + 16, height: box.h + 16,
          pointerEvents: "none", transition: "opacity .2s",
        }}>
          {[["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]].map(([v, h]) => (
            <div key={v + h} style={{
              position: "absolute", [v]: 0, [h]: 0, width: 26, height: 26,
              borderTop: v === "top" ? `4px solid ${G}` : "none",
              borderBottom: v === "bottom" ? `4px solid ${G}` : "none",
              borderLeft: h === "left" ? `4px solid ${G}` : "none",
              borderRight: h === "right" ? `4px solid ${G}` : "none",
              filter: `drop-shadow(0 0 6px ${G})`,
            }} />
          ))}
        </div>
        {/* etichetta soggetto: resta sempre dentro lo schermo anche se il box tocca i bordi */}
        <div style={{
          position: "absolute", pointerEvents: "none",
          left: Math.max(10, box.x - 8), top: box.y > 44 ? box.y - 30 : box.y + 10,
          color: G, fontSize: 10, letterSpacing: ".2em", textShadow: `0 0 8px ${G}`, whiteSpace: "nowrap",
        }}>
          ◉ SOGGETTO — PWR {power.toLocaleString()}
        </div>
        </>
      )}

      {/* etichetta stato */}
      <div className="sc-label" style={{ position: "absolute", color: G, letterSpacing: ".25em", textShadow: `0 0 8px ${G}` }}>
        SCOUTER v2.7 — {statusText}
      </div>

      {/* pannello lettura */}
      <div className="sc-panel" style={{
        position: "absolute", top: "50%", transform: "translateY(-50%)",
        color: G, textAlign: "right", textShadow: `0 0 8px ${G}`,
      }}>
        <div className="sc-panel-title" style={{ letterSpacing: ".2em", opacity: .9 }}>LIVELLO DI POTENZA</div>
        <div className="sc-power" style={{ fontWeight: 900, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
          {power.toLocaleString()}
        </div>
        {over9k && locked && (
          <div style={{ fontSize: 12, fontWeight: 700, color: "#ffd76a", textShadow: "0 0 8px #ffd76a", animation: "scouterBlink 1s steps(2) infinite" }}>
            ⚠ OLTRE 9000 ⚠
          </div>
        )}
        {/* parametri biometrici */}
        <div className="sc-stats" style={{ marginTop: 14, display: "grid", gap: 8, letterSpacing: ".15em" }}>
          {bioState === "done" && bio && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 30 }}>SEX</span>
              <span style={{ flex: 1, textAlign: "left", fontWeight: 700 }}>{bio.sesso}</span>
              <span style={{ opacity: .8 }}>{bio.massa.toUpperCase()} · BF {bio.bf}%</span>
            </div>
          )}
          {[["FOR", stats.for], ["RIF", stats.res], ["TEC", stats.vel]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 30 }}>{l}</span>
              {bar(v)}
              <span style={{ width: 26, fontVariantNumeric: "tabular-nums" }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="sc-sub" style={{ marginTop: 12, opacity: .75, letterSpacing: ".12em" }}>
          {bioState === "pending" && locked ? "BIO-SCANSIONE IN CORSO…"
            : bioState === "done" && bio ? (bio.note || "SOGGETTO VALUTATO").toUpperCase()
            : locked ? "SOGGETTO VALUTATO — MINACCIA: BASSA"
            : "CALIBRAZIONE LENTE…"}
        </div>
      </div>

      {/* errore fotocamera */}
      {err && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.85)", padding: 24 }}>
          <div style={{ color: G, textAlign: "center", fontSize: 14, lineHeight: 1.7, maxWidth: 320 }}>{err}</div>
        </div>
      )}

      {/* controlli */}
      <button onClick={rescan} className="sc-rescan" style={{
        position: "absolute", left: "50%", transform: "translateX(-50%)",
        background: "rgba(0,40,20,.7)", border: `2px solid ${G}`, color: G,
        letterSpacing: ".25em", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace",
      }}>
        <RefreshCw size={14} /> RISCANSIONA
      </button>
      <button onClick={onClose} className="sc-close" style={{
        position: "absolute", background: "rgba(0,40,20,.7)",
        border: `2px solid ${G}`, color: G, cursor: "pointer",
      }}>
        <X size={18} />
      </button>

      <style>{`
        @keyframes scouterSpin { to { transform: rotate(360deg); } }
        @keyframes scouterBlink { 50% { opacity: .2; } }
        .sc-reticle { width: 180px; height: 180px; }
        .sc-cross { width: 240px; }
        .sc-cross[style*="width: 1px"] { width: 1px; height: 240px; }
        .sc-label { top: 26px; left: 30px; font-size: 12px; }
        .sc-panel { right: 30px; min-width: 190px; }
        .sc-panel-title { font-size: 11px; }
        .sc-power { font-size: 44px; }
        .sc-stats { font-size: 11px; }
        .sc-sub { font-size: 10px; }
        .sc-rescan { bottom: 30px; padding: 12px 26px; font-size: 12px; }
        .sc-close { top: 24px; right: 30px; padding: 10px; }
        @media (max-width: 640px) {
          .sc-reticle { width: 26vmin; height: 26vmin; }
          .sc-cross { width: 40vmin; }
          .sc-cross[style*="width: 1px"] { width: 1px; height: 40vmin; }
          .sc-label { top: 20px; left: 50%; transform: translateX(-50%); font-size: 9px; white-space: nowrap; }
          .sc-panel { right: 20px; min-width: 0; }
          .sc-panel-title { font-size: 8px; }
          .sc-power { font-size: 24px; }
          .sc-stats { font-size: 8px; margin-top: 8px; gap: 4px; }
          .sc-sub { font-size: 7px; margin-top: 8px; max-width: 40vw; margin-left: auto; }
          .sc-rescan { bottom: 24px; padding: 8px 14px; font-size: 9px; }
          .sc-close { top: 18px; right: 20px; padding: 6px; }
        }
      `}</style>
    </div>,
    document.body
  );
}
