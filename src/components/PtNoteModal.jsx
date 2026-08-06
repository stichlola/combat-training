import React from "react";
import { StickyNote, PlayCircle, ExternalLink } from "lucide-react";
import { tr } from "../lib/i18n";
import { Overlay } from "../ui";

/* Link video inserito dal PT → embed YouTube/Vimeo, player per mp4, altrimenti link esterno */
export const videoEmbed = (url) => {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return { type: "iframe", src: `https://player.vimeo.com/video/${vi[1]}` };
  if (/\.(mp4|webm|m4v|mov)(\?|#|$)/i.test(url)) return { type: "video", src: url };
  return { type: "link", src: url };
};

/* ---------------- Popup note PT (lato cliente) ----------------
   Si sblocca solo se il PT ha inserito dati sull'esercizio: note mirate
   (errori, miglioramenti, attenzioni) e/o un video di esecuzione personalizzato. */
export function PtNoteModal({ ex, onClose }) {
  const v = videoEmbed(ex.ptVideo);
  return (
    <Overlay>
    <div className="modal-back" onClick={onClose}>
      <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()} style={{ borderColor: "var(--pt)" }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div className="f-hud t-pt" style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".15em" }}>
              <StickyNote size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("NOTE DEL TUO PT")}
            </div>
            <div className="micro t-dim" style={{ marginTop: 2 }}>{tr(ex.name)}</div>
          </div>
          <span onClick={onClose} className="tap t-faint" style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0", flexShrink: 0 }}>✕</span>
        </div>

        {ex.ptNote && (
          <div className="pt-box" style={{ marginBottom: v ? 14 : 0 }}>
            <div className="t-dim" style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--text)" }}>{ex.ptNote}</div>
          </div>
        )}

        {v && (
          <>
            <div className="hud-label row g6" style={{ marginBottom: 6, color: "var(--pt)" }}>
              <PlayCircle size={13} color="var(--pt)" /> {tr("Video esecuzione")}
            </div>
            {v.type === "iframe" && (
              <div className="cham-s" style={{ overflow: "hidden", border: "1px solid var(--pt)" }}>
                <iframe src={v.src} title="Video PT" allowFullScreen
                  style={{ display: "block", width: "100%", aspectRatio: "16/9", border: "none" }} />
              </div>
            )}
            {v.type === "video" && (
              <video controls playsInline src={v.src} className="cham-s"
                style={{ display: "block", width: "100%", border: "1px solid var(--pt)", background: "#000" }} />
            )}
            {v.type === "link" && (
              <a href={v.src} target="_blank" rel="noreferrer" className="pt-btn tap" style={{ textDecoration: "none", padding: "9px 12px", fontSize: 10 }}>
                <ExternalLink size={12} /> {tr("APRI IL VIDEO")}
              </a>
            )}
          </>
        )}
      </div>
    </div>
    </Overlay>
  );
}
