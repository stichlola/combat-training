/* ============================================================
   GAME — la sezione "giocosa" dell'app.
   - SCOUTER: sbloccato all'iscrizione per TUTTI (anche non premium),
     non dipende da nessuna ricompensa. Visore AR stile Dragon Ball
     che legge i livelli di potenza.
   - RADAR DELLE RICOMPENSE (ricompensa del primo allenamento, solo
     premium): caccia agli indizi di sblocco sulla mappa radar.
   Le prossime funzioni game si aggiungono qui come nuove card.
   ============================================================ */
import React, { useState } from "react";
import { ScanLine, Radar, Lock, ChevronRight } from "lucide-react";
import Scouter from "./Scouter";
import RadarGame from "./RadarGame";
import { TROPHIES, RARITY, unlockedTrophies } from "./trophies";

/* Funzioni game collegate alle ricompense (id → card). Solo SCOUTER è per tutti: radar e successivi sono Premium */
const GAME_FEATURES = [
  {
    trophyId: "scouter",
    icon: ScanLine,
    title: "SCOUTER",
    sub: "Visore di potenza AR",
    desc: "Punta la fotocamera su un soggetto e leggi il suo livello di potenza in sovrimpressione, come un vero ricognitore spaziale.",
    premiumOnly: false, // unico gadget per gli utenti free
    always: true,       // attivo dall'iscrizione, senza ricompensa da sbloccare
  },
  {
    trophyId: "firstw",
    icon: Radar,
    title: "RADAR DELLE RICOMPENSE",
    sub: "Caccia agli indizi",
    desc: "Esplora la mappa radar: la vibrazione ti guida verso le ricompense bloccate. Catturale per scoprire l'indizio di sblocco — resterà visibile nella Sala Ricompense.",
    premiumOnly: true,
  },
  // prossime funzioni game qui (premiumOnly: true di default)
];

export default function GameTab({ level, stats, prs, onFindHint, premium }) {
  const [openGame, setOpenGame] = useState(null);   // "scouter" | "firstw" | null
  const got = unlockedTrophies(stats, prs, level).map((t) => t.id);
  const isPrem = !!(premium && premium.is);

  return (
    <div className="stack" style={{ padding: "4px 0 20px" }}>
      <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".2em", fontSize: 13, marginBottom: 4 }}>
        ◈ GAME
      </div>
      <div className="micro t-faint" style={{ marginBottom: 14 }}>
        GADGET E FUNZIONI SBLOCCATE CON LE RICOMPENSE
      </div>

      <div className="stack-s">
        {GAME_FEATURES.map((f) => {
          const trophy = TROPHIES.find((t) => t.id === f.trophyId);
          const ok = f.always || got.includes(f.trophyId);
          const needPrem = f.premiumOnly && !isPrem; // gadget riservato ai premium
          const usable = ok && !needPrem;
          const r = trophy ? RARITY[trophy.rarity] : RARITY.comune;
          const Icon = f.icon;
          return (
            <div key={f.trophyId} className="cham-s" style={{
              padding: "14px 16px", background: "var(--card2)",
              border: `1px solid ${usable ? r.border : "var(--soft)"}`,
              opacity: usable ? 1 : 0.55,
            }}>
              <div className="row between g8" style={{ alignItems: "center" }}>
                <div className="row g12" style={{ alignItems: "center" }}>
                  <Icon size={26} color={usable ? r.color : "#2a4a63"} />
                  <div>
                    <div className="f-hud" style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".15em", color: usable ? r.color : "var(--faint)" }}>
                      {f.title}
                    </div>
                    <div className="tiny t-faint">{f.sub}</div>
                  </div>
                </div>
                <span className="micro cham-s" style={{
                  padding: "2px 8px", flexShrink: 0,
                  border: `1px solid ${needPrem ? "#8a6d2f" : usable ? r.border : "#1d3448"}`,
                  color: needPrem ? "#ffd76a" : usable ? r.color : "var(--faint)",
                }}>
                  {needPrem
                    ? <span className="row g6" style={{ alignItems: "center" }}><Lock size={10} /> PREMIUM</span>
                    : usable ? "SBLOCCATO"
                    : <span className="row g6" style={{ alignItems: "center" }}><Lock size={10} /> BLOCCATO</span>}
                </span>
              </div>
              <div className="t-dim" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 10 }}>{f.desc}</div>
              {usable && (
                <button onClick={() => setOpenGame(f.trophyId)} className="tap cham-s row g8"
                  style={{
                    marginTop: 12, cursor: "pointer", alignItems: "center",
                    background: "rgba(57,255,136,.08)", border: "1px solid #1f7a4d",
                    color: "#39ff88", padding: "10px 16px", fontSize: 11,
                    fontWeight: 700, letterSpacing: ".2em", width: "100%", justifyContent: "center",
                  }}>
                  ATTIVA {f.title} <ChevronRight size={14} />
                </button>
              )}
              {needPrem && (
                <button onClick={() => premium && premium.open && premium.open()} className="tap cham-s row g8"
                  style={{
                    marginTop: 12, cursor: "pointer", alignItems: "center",
                    background: "rgba(255,215,106,.08)", border: "1px solid #8a6d2f",
                    color: "#ffd76a", padding: "10px 16px", fontSize: 11,
                    fontWeight: 700, letterSpacing: ".2em", width: "100%", justifyContent: "center",
                  }}>
                  SBLOCCA CON PREMIUM <ChevronRight size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="micro t-faint" style={{ marginTop: 16, textAlign: "center", letterSpacing: ".1em" }}>
        ALTRI GADGET ARRIVANO CON LE PROSSIME RICOMPENSE
      </div>

      {openGame === "scouter" && <Scouter level={level} onClose={() => setOpenGame(null)} />}
      {openGame === "firstw" && (
        <RadarGame level={level} stats={stats} prs={prs} onFindHint={onFindHint} onClose={() => setOpenGame(null)} />
      )}
    </div>
  );
}