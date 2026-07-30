import React from "react";
import { EXERCISE_INFO, EXERCISE_MEDIA, GROUP_ICONS, INFO_FALLBACK } from "../lib/exercises";
import { tr } from "../lib/i18n";
import { Overlay } from "../ui";

export function ExerciseInfoModal({ name, group, ex, onClose }) {
  const media = (ex && ex.img) || EXERCISE_MEDIA[name];
  const desc = (ex && ex.desc) || EXERCISE_INFO[name] || INFO_FALLBACK[group] || INFO_FALLBACK.Altro;
  return (
    <Overlay>
    <div className="modal-back" onClick={onClose}>
      <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div>
            <div className="t-bright" style={{ fontSize: 17, fontWeight: 700 }}>{tr(name)}</div>
            <div className="micro t-cyan">{tr(group || "").toUpperCase()}</div>
          </div>
          <span onClick={onClose} className="tap t-faint" style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0" }}>✕</span>
        </div>
        <div className="cham-s" style={{
          height: 210, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center",
          background: "#04101b", border: "1px solid #0e2233", overflow: "hidden",
        }}>
          {media
            ? <img src={media} alt={name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", background: "#eef2f5" }} />
            : <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 44, color: "#1b3a52", lineHeight: 1 }}>{GROUP_ICONS[group] || "◇"}</div>
                <div className="micro" style={{ marginTop: 8 }}>{tr("ANTEPRIMA NON DISPONIBILE")}</div>
              </div>}
        </div>
        <div className="hud-label" style={{ marginBottom: 6 }}>{tr("▸ Esecuzione")}</div>
        <div className="t-dim" style={{ fontSize: 14, lineHeight: 1.7 }}>{tr(desc)}</div>
      </div>
    </div>
    </Overlay>
  );
}


/* chiamata AI via proxy serverless (la chiave resta sul server).
   feature "nutrition"/"scan" allegano il JWT: il server verifica il premium */
/* le funzioni AI richiedono un account: senza sessione si segnala subito */
