import React, { useState, useEffect } from "react";
import { xpForLevel } from "../lib/game";
import { tr } from "../lib/i18n";
import { Btn, Overlay, QBar } from "../ui";

/* ---------------- Schermata risultati post-allenamento (stile Halo Reach) ---------------- */
export function ResultsScreen({ results, onClose, vanilla }) {
  const [go, setGo] = useState(false);            // avvia le animazioni delle barre
  const [shownXp, setShownXp] = useState(results.xpBefore);
  const [shownLvl, setShownLvl] = useState(results.levelBefore);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGo(true), 350);
    /* barra XP: conteggio animato con rollover di livello, come il post-partita di Reach */
    let xp = results.xpBefore, lvl = results.levelBefore, gain = results.xpGain;
    const step = Math.max(2, Math.round(gain / 60));
    const iv = setInterval(() => {
      if (gain <= 0) { clearInterval(iv); return; }
      const add = Math.min(step, gain);
      xp += add; gain -= add;
      while (xp >= xpForLevel(lvl)) { xp -= xpForLevel(lvl); lvl++; setFlash(true); setTimeout(() => setFlash(false), 900); }
      setShownXp(xp); setShownLvl(lvl);
    }, 30);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  const need = xpForLevel(shownLvl);
  return (
    <Overlay>
    <div className="modal-back">
      <div className="modal-box cham fade-in" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".25em", fontSize: 15, textAlign: "center" }}>{tr("◈ RAPPORTO MISSIONE")}</div>
        <div className="micro t-faint" style={{ textAlign: "center", marginBottom: 18 }}>{results.name}</div>

        {/* XP animato */}
        {!vanilla && (
        <div className="cham-s" style={{ padding: "12px 14px", background: "var(--card)", border: `1px solid ${flash ? "#ffd76a" : "var(--soft2)"}`, marginBottom: 16, transition: "border-color .3s" }}>
          <div className="row between" style={{ marginBottom: 6 }}>
            <span className={`f-hud ${flash ? "t-amber" : "t-cyan"}`} style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".15em" }}>
              {flash ? "▲ RANK UP!" : `LV.${shownLvl}`}
            </span>
            <span className="micro">{shownXp}/{need} XP <span className="t-amber">+{results.xpGain}</span></span>
          </div>
          <div className="row g6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="seg" style={{
                flex: 1,
                background: (shownXp / need) * 12 > i ? "linear-gradient(180deg,var(--cyan-hi),var(--cyan))" : "var(--soft)",
                boxShadow: (shownXp / need) * 12 > i ? "0 0 6px rgba(87,200,242,.6)" : "none",
              }} />
            ))}
          </div>
        </div>
        )}

        {/* progresso quest animato */}
        {!vanilla && (<>
        <div className="hud-label" style={{ marginBottom: 8 }}>{tr("▸ Avanzamento sfide")}</div>
        <div className="stack-s" style={{ marginBottom: 16 }}>
          {results.quests.map((q, i) => (
            <div key={i} className="cham-s" style={{ padding: "10px 12px", background: "var(--card2)", border: `1px solid ${q.completedNow ? "#ffd76a" : "var(--soft)"}` }}>
              <div className="row between g8">
                <span className={q.done ? "t-amber" : "t-bright"} style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.35 }}>
                  {q.completedNow && "◈ "}{tr(q.text)}
                </span>
                {q.completedNow && <span className="f-hud t-amber blink" style={{ fontSize: 11, fontWeight: 700, flexShrink: 0 }}>+{q.xp} XP</span>}
              </div>
              <div style={{ marginTop: 8 }}>
                <QBar pct={(go ? q.after : q.before) / q.target} done={q.done} animate />
              </div>
              <div className="micro t-faint" style={{ marginTop: 4, textAlign: "right" }}>
                {q.metric === "volume" ? `${(go ? q.after : q.before).toLocaleString()} / ${q.target.toLocaleString()} KG`
                  : `${go ? q.after : q.before} / ${q.target}${q.metric === "cardio" ? " MIN" : ""}`}
              </div>
            </div>
          ))}
          {results.quests.length === 0 && <div className="tiny t-faint">{tr("Nessuna sfida attiva oggi.")}</div>}
        </div>
        </>)}

        </div>
        <div style={{ paddingTop: 14, flexShrink: 0 }}>
          <Btn primary full onClick={onClose}>{tr("Continua ›")}</Btn>
        </div>
      </div>
    </div>
    </Overlay>
  );
}
