/* ============================================================
   GAME — la sezione "giocosa" dell'app.
   Prima funzione: lo SCOUTER (trofeo sbloccato all'iscrizione),
   visore AR stile Dragon Ball che legge i livelli di potenza.
   Le prossime funzioni game si aggiungono qui come nuove card.
   ============================================================ */
import React, { useState } from "react";
import { ScanLine, Lock, ChevronRight } from "lucide-react";
import Scouter from "./Scouter";
import { TROPHIES, RARITY, unlockedTrophies } from "./trophies";

/* Funzioni game collegate ai trofei (id trofeo → card) */
const GAME_FEATURES = [
  {
    trophyId: "scouter",
    title: "SCOUTER",
    sub: "Visore di potenza AR",
    desc: "Punta la fotocamera su un soggetto e leggi il suo livello di potenza in sovrimpressione, come un vero ricognitore spaziale.",
  },
  // prossime funzioni game qui
];

export default function GameTab({ level, stats, prs }) {
  const [scouterOn, setScouterOn] = useState(false);
  const got = unlockedTrophies(stats, prs, level).map((t) => t.id);

  return (
    <div className="stack" style={{ padding: "4px 0 20px" }}>
      <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".2em", fontSize: 13, marginBottom: 4 }}>
        ◈ GAME
      </div>
      <div className="micro t-faint" style={{ marginBottom: 14 }}>
        GADGET E FUNZIONI SBLOCCATE CON I TROFEI
      </div>

      <div className="stack-s">
        {GAME_FEATURES.map((f) => {
          const trophy = TROPHIES.find((t) => t.id === f.trophyId);
          const ok = got.includes(f.trophyId);
          const r = trophy ? RARITY[trophy.rarity] : RARITY.comune;
          return (
            <div key={f.trophyId} className="cham-s" style={{
              padding: "14px 16px", background: "#060f18",
              border: `1px solid ${ok ? r.border : "#0e2233"}`,
              opacity: ok ? 1 : 0.55,
            }}>
              <div className="row between g8" style={{ alignItems: "center" }}>
                <div className="row g12" style={{ alignItems: "center" }}>
                  <ScanLine size={26} color={ok ? r.color : "#2a4a63"} />
                  <div>
                    <div className="f-hud" style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".15em", color: ok ? r.color : "#3f637c" }}>
                      {f.title}
                    </div>
                    <div className="tiny t-faint">{f.sub}</div>
                  </div>
                </div>
                <span className="micro cham-s" style={{
                  padding: "2px 8px", flexShrink: 0,
                  border: `1px solid ${ok ? r.border : "#1d3448"}`,
                  color: ok ? r.color : "#3f637c",
                }}>
                  {ok ? "SBLOCCATO" : <span className="row g6" style={{ alignItems: "center" }}><Lock size={10} /> BLOCCATO</span>}
                </span>
              </div>
              <div className="t-dim" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 10 }}>{f.desc}</div>
              {ok && (
                <button onClick={() => setScouterOn(true)} className="tap cham-s row g8"
                  style={{
                    marginTop: 12, cursor: "pointer", alignItems: "center",
                    background: "rgba(57,255,136,.08)", border: "1px solid #1f7a4d",
                    color: "#39ff88", padding: "10px 16px", fontSize: 11,
                    fontWeight: 700, letterSpacing: ".2em", width: "100%", justifyContent: "center",
                  }}>
                  ATTIVA SCOUTER <ChevronRight size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="micro t-faint" style={{ marginTop: 16, textAlign: "center", letterSpacing: ".1em" }}>
        ALTRI GADGET ARRIVANO CON I PROSSIMI TROFEI
      </div>

      {scouterOn && <Scouter level={level} onClose={() => setScouterOn(false)} />}
    </div>
  );
}
