import React from "react";
import { StickyNote, PlayCircle, ExternalLink } from "lucide-react";
import { EXERCISE_INFO, EXERCISE_MEDIA, GROUP_ICONS, INFO_FALLBACK } from "../lib/exercises";
import { tr } from "../lib/i18n";
import { Overlay } from "../ui";
import { videoEmbed } from "./PtNoteModal";

export function ExerciseInfoModal({ name, group, ex, onClose }) {
  const media = (ex && ex.img) || EXERCISE_MEDIA[name];
  const desc = (ex && ex.desc) || EXERCISE_INFO[name] || INFO_FALLBACK[group] || INFO_FALLBACK.Altro;
  /* sezione PT incorporata: note mirate e video personalizzato sotto l'esecuzione */
  const ptVideo = ex ? videoEmbed(ex.ptVideo) : null;
  const hasPt = !!(ex && (ex.ptNote || ex.ptVideo));
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
          background: "var(--card)", border: "1px solid var(--soft)", overflow: "hidden",
        }}>
          {media
            ? <img src={media} alt={name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", background: "#eef2f5" }} />
            : <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 44, color: "var(--soft2)", lineHeight: 1 }}>{GROUP_ICONS[group] || "◇"}</div>
                <div className="micro" style={{ marginTop: 8 }}>{tr("ANTEPRIMA NON DISPONIBILE")}</div>
              </div>}
        </div>
        <div className="hud-label" style={{ marginBottom: 6 }}>{tr("▸ Esecuzione")}</div>
        <div className="t-dim" style={{ fontSize: 14, lineHeight: 1.7 }}>{tr(desc)}</div>

        {hasPt && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--soft)" }}>
            <div className="hud-label row g6" style={{ marginBottom: 8, color: "var(--pt)" }}>
              <StickyNote size={13} color="var(--pt)" /> {tr("NOTE DEL TUO PT")}
            </div>
            {ex.ptNote && (
              <div className="pt-box" style={{ marginBottom: ptVideo ? 12 : 0 }}>
                <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--text)" }}>{ex.ptNote}</div>
              </div>
            )}
            {ptVideo && (
              <>
                <div className="hud-label row g6" style={{ marginBottom: 6, color: "var(--pt)" }}>
                  <PlayCircle size={13} color="var(--pt)" /> {tr("Video esecuzione")}
                </div>
                {ptVideo.type === "iframe" && (
                  <div className="cham-s" style={{ overflow: "hidden", border: "1px solid var(--pt)" }}>
                    <iframe src={ptVideo.src} title="Video PT" allowFullScreen
                      style={{ display: "block", width: "100%", aspectRatio: "16/9", border: "none" }} />
                  </div>
                )}
                {ptVideo.type === "video" && (
                  <video controls playsInline src={ptVideo.src} className="cham-s"
                    style={{ display: "block", width: "100%", border: "1px solid var(--pt)", background: "#000" }} />
                )}
                {ptVideo.type === "link" && (
                  <a href={ptVideo.src} target="_blank" rel="noreferrer" className="pt-btn tap"
                    style={{ textDecoration: "none", padding: "9px 12px", fontSize: 10 }}>
                    <ExternalLink size={12} /> {tr("APRI IL VIDEO")}
                  </a>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
    </Overlay>
  );
}


/* chiamata AI via proxy serverless (la chiave resta sul server).
   feature "nutrition"/"scan" allegano il JWT: il server verifica il premium */
/* le funzioni AI richiedono un account: senza sessione si segnala subito */
