import React, { useState } from "react";
import { Loader2, Minus, Plus, Sparkles, TrendingUp } from "lucide-react";
import { tr } from "../lib/i18n";
import { currentWeek, progTotal } from "../lib/progression";
import { Btn, Overlay } from "../ui";

/* ---------------- Modale progressione settimanale ----------------
   Manuale: un'unica impostazione, il NUMERO DI SETTIMANE — le settimane partono
   TUTTE VUOTE e poi l'utente (o il PT) inserisce i carichi esercizio per
   esercizio dalla modifica scheda (📈); i valori li compila solo l'AI.
   AI: nessuna opzione — un pulsante solo, l'AI decide settimane e carichi da
   sola in base alla scheda e ai dati della persona (Premium o 1 credito).
   Se la progressione è già attiva, lo stesso modale permette di aggiungere o
   togliere settimane al volo (i carichi impostati si conservano) e di
   disattivarla. */
export function ProgressionSetupModal({ routine, busy, onConfirm, onDisable, onAI, onResize, onClose }) {
  const enabled = !!routine.progression?.enabled;
  const total = progTotal(routine);
  const curWeek = enabled ? currentWeek(routine.progression, total) : null;

  const [weeks, setWeeks] = useState(() => Math.max(2, Math.min(8, enabled ? total : 4)));
  const [confirmOff, setConfirmOff] = useState(false);
  const clamp = (n) => Math.max(2, Math.min(8, n));

  return (
    <Overlay>
    <div className="modal-back" onClick={onClose}>
      <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="row between" style={{ marginBottom: 2 }}>
          <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".18em", fontSize: 13 }}>
            <TrendingUp size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("PROGRESSIONE SETTIMANALE")}
          </div>
          <span onClick={onClose} className="tap t-faint" style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0" }}>✕</span>
        </div>
        <div className="row between" style={{ alignItems: "baseline" }}>
          <div className="t-bright" style={{ fontSize: 15, fontWeight: 700 }}>{routine.name}</div>
          {curWeek && (
            <span className="chip cham-s" style={{ borderColor: "#ffd76a", color: "#ffd76a", flexShrink: 0 }}>
              {tr("ORA: SETTIMANA")} {curWeek}/{total}
            </span>
          )}
        </div>
        <div className="tiny t-faint" style={{ margin: "4px 0 14px", lineHeight: 1.5 }}>
          {tr("La scheda passa da sola alla settimana successiva quando la completi e cambia la settimana di calendario.")}
        </div>

        {enabled ? (
          <>
            {/* aggiungi/togli settimane a ciclo attivo: i valori impostati si conservano */}
            <div className="hud-label" style={{ marginBottom: 8 }}>{tr("NUMERO DI SETTIMANE")}</div>
            <div className="row g8" style={{ alignItems: "center", marginBottom: 6 }}>
              <Btn small disabled={busy || weeks <= 2} style={{ padding: "8px 12px" }}
                onClick={() => { const n = clamp(weeks - 1); setWeeks(n); onResize && onResize(n); }}>
                <Minus size={13} style={{ display: "inline", verticalAlign: -2 }} />
              </Btn>
              <div className="f-hud t-bright cham-s" style={{ flex: 1, textAlign: "center", padding: "8px 0", fontSize: 18, fontWeight: 700, background: "var(--card)", border: "1px solid var(--soft)" }}>
                {weeks}
              </div>
              <Btn small disabled={busy || weeks >= 8} style={{ padding: "8px 12px" }}
                onClick={() => { const n = clamp(weeks + 1); setWeeks(n); onResize && onResize(n); }}>
                <Plus size={13} style={{ display: "inline", verticalAlign: -2 }} />
              </Btn>
            </div>
            <div className="tiny t-faint" style={{ marginBottom: 10, lineHeight: 1.5 }}>
              {tr("Aggiungi o togli settimane al volo: i carichi già impostati si conservano (allungando, la nuova settimana copia l'ultima).")}
            </div>
            <div className="tiny t-faint" style={{ marginBottom: 14, lineHeight: 1.5 }}>
              {tr("I carichi delle settimane si modificano dalla scheda (matita → 📈 su ogni esercizio).")}
            </div>
            <div className="row g8" style={{ marginTop: 4 }}>
              {confirmOff ? (
                <Btn small onClick={onDisable} style={{ flex: 1.2, borderColor: "var(--line2)", color: "var(--dim)" }}>
                  {tr("Conferma: disattiva")}
                </Btn>
              ) : (
                <Btn small onClick={() => setConfirmOff(true)} style={{ flex: 1.2 }}>{tr("Disattiva")}</Btn>
              )}
              <Btn primary onClick={onClose} style={{ flex: 2 }}>{tr("Chiudi")}</Btn>
            </div>
        {/* AI: fa tutto lei, nessuna opzione */}
        <div className="row" style={{ alignItems: "center", gap: 10, margin: "14px 0 10px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--soft)" }} />
          <span className="micro t-faint">{tr("OPPURE")}</span>
          <div style={{ flex: 1, height: 1, background: "var(--soft)" }} />
        </div>
        <Btn ai full onClick={onAI} disabled={busy}>
          {busy
            ? <><Loader2 size={13} className="spin" style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />{tr("Generazione...")}</>
            : <><Sparkles size={13} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />{tr("Ricalcola con l'AI")}</>}
        </Btn>
        <div className="tiny t-faint" style={{ marginTop: 6, lineHeight: 1.5, textAlign: "center" }}>
          {tr("L'AI decide da sola settimane e carichi in base alla scheda e ai tuoi dati. Richiede Premium o 1 credito.")}
        </div>
            {confirmOff && (
              <div className="tiny t-faint" style={{ marginTop: 8, lineHeight: 1.5 }}>
                {tr("Disattivando, la scheda torna ai carichi base e il conteggio delle settimane si ferma.")}
              </div>
            )}
          </>
        ) : (
          <>
            {/* unica impostazione: quante settimane compongono il ciclo */}
            <div className="hud-label" style={{ marginBottom: 8 }}>{tr("NUMERO DI SETTIMANE")}</div>
            <div className="row g8" style={{ alignItems: "center", marginBottom: 6 }}>
              <Btn small onClick={() => setWeeks((w) => clamp(w - 1))} disabled={weeks <= 2} style={{ padding: "8px 12px" }}>
                <Minus size={13} style={{ display: "inline", verticalAlign: -2 }} />
              </Btn>
              <div className="f-hud t-bright cham-s" style={{ flex: 1, textAlign: "center", padding: "8px 0", fontSize: 18, fontWeight: 700, background: "var(--card)", border: "1px solid var(--soft)" }}>
                {weeks}
              </div>
              <Btn small onClick={() => setWeeks((w) => clamp(w + 1))} disabled={weeks >= 8} style={{ padding: "8px 12px" }}>
                <Plus size={13} style={{ display: "inline", verticalAlign: -2 }} />
              </Btn>
            </div>
            <div className="tiny t-faint" style={{ marginBottom: 16, lineHeight: 1.5 }}>
              {tr("Le settimane partono vuote: poi tu o il PT inserite pesi e ripetizioni esercizio per esercizio (modifica scheda → 📈). Con l'AI i valori si compilano da soli.")}
            </div>
            <div className="row g8" style={{ marginTop: 4 }}>
              <Btn onClick={onClose} style={{ flex: 1 }}>{tr("Annulla")}</Btn>
              <Btn primary disabled={busy} style={{ flex: 2 }} onClick={() => onConfirm({ weeks })}>
                {tr("Attiva progressione")}
              </Btn>
            </div>
        {/* AI: fa tutto lei, nessuna opzione */}
        <div className="row" style={{ alignItems: "center", gap: 10, margin: "14px 0 10px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--soft)" }} />
          <span className="micro t-faint">{tr("OPPURE")}</span>
          <div style={{ flex: 1, height: 1, background: "var(--soft)" }} />
        </div>
        <Btn ai full onClick={onAI} disabled={busy}>
          {busy
            ? <><Loader2 size={13} className="spin" style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />{tr("Generazione...")}</>
            : <><Sparkles size={13} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />{tr("Calcola tutto con l'AI")}</>}
        </Btn>
        <div className="tiny t-faint" style={{ marginTop: 6, lineHeight: 1.5, textAlign: "center" }}>
          {tr("L'AI decide da sola settimane e carichi in base alla scheda e ai tuoi dati. Richiede Premium o 1 credito.")}
        </div>
          </>
        )}
      </div>
    </div>
    </Overlay>
  );
}
