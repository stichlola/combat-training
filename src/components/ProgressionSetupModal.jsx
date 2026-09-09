import React, { useEffect, useState } from "react";
import { Bot, Lock, Minus, Plus, TrendingUp } from "lucide-react";
import { tr } from "../lib/i18n";
import { currentWeek, progTotal } from "../lib/progression";
import { supabase } from "../lib/supabase";
import { Btn, Overlay } from "../ui";

/* ---------------- Modale impostazioni progressione settimanale ----------------
   Si apre dal pulsante ↗ sulla scheda, sia per attivare sia per modificare.
   Base (gratis): numero di settimane → riempimento lineare automatico.
   Completamento AI: solo con Premium o crediti (1 credito oltre il limite
   settimanale); la strategia segue i metodi più usati in palestra:
   - doppia progressione: prima salgono le reps, poi il carico (la più comune)
   - solo carico:         +kg a parità di ripetizioni (stile schede forza 5×5)
   - solo ripetizioni:    +reps a parità di carico (tipica del corpo libero)
   Se la progressione è già attiva, lo stesso modale permette anche di disattivarla. */
export const PROG_STRATEGIES = [
  { id: "double", label: "Doppia progressione", desc: "Prima aumentano le ripetizioni, poi il carico — il metodo più usato" },
  { id: "weight", label: "Solo carico", desc: "Ogni settimana salgono i kg, le ripetizioni restano uguali" },
  { id: "reps",   label: "Solo ripetizioni", desc: "Ogni settimana salgono le reps, il carico resta uguale" },
];

export function ProgressionSetupModal({ routine, premium, busy, onConfirm, onDisable, onClose }) {
  const enabled = !!routine.progression?.enabled;
  const total = progTotal(routine);
  const curWeek = enabled ? currentWeek(routine.progression, total) : null;

  const [weeks, setWeeks] = useState(() => Math.max(2, Math.min(8, enabled ? total : 4)));
  const [useAI, setUseAI] = useState(false);
  const [aiMode, setAiMode] = useState("double");
  const [usage, setUsage] = useState(null);
  const [confirmOff, setConfirmOff] = useState(false);

  const isGuest = !!(premium && premium.guest);

  /* saldo crediti: il completamento AI si propone solo a chi può pagarlo
     (Premium → generazioni incluse; altrimenti 1 credito a generazione) */
  useEffect(() => {
    if (isGuest) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const r = await fetch("/api/usage", { headers: { Authorization: `Bearer ${session?.access_token || ""}` } });
        if (r.ok) setUsage(await r.json());
      } catch {}
    })();
  }, []);

  const credits = usage?.credits ?? 0;
  const aiOk = !!premium?.is || credits > 0;
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

        {/* ① Base: numero di settimane (gratis, riempimento lineare) */}
        <div className="hud-label" style={{ marginBottom: 8 }}>{tr("① NUMERO DI SETTIMANE")}</div>
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
          {tr("Di base le settimane sono riempite con un aumento lineare automatico (carichi, reps o secondi in salita).")}
        </div>

        {/* ② Completamento AI: solo Premium o crediti */}
        <div className="hud-label row g6" style={{ marginBottom: 8 }}>
          <Bot size={13} style={{ verticalAlign: -2 }} /> {tr("② COMPLETAMENTO AI")}
          {!premium?.is && <span className="chip cham-s" style={{ fontSize: 9 }}>⬡ 1 {tr("CREDITO")}</span>}
        </div>
        {isGuest ? (
          <div className="cham-s" style={{ padding: "10px 12px", background: "var(--card)", border: "1px solid var(--soft)", marginBottom: 16 }}>
            <div className="tiny t-dim row g6" style={{ lineHeight: 1.5 }}>
              <Lock size={12} style={{ flexShrink: 0, verticalAlign: -1 }} /> {tr("Le funzioni AI richiedono un account gratuito.")}
            </div>
            <Btn small style={{ marginTop: 8 }} onClick={() => { onClose(); premium.needAccount ? premium.needAccount() : premium.open(); }}>
              {tr("Crea account — è gratis")}
            </Btn>
          </div>
        ) : !aiOk ? (
          <div className="cham-s" style={{ padding: "10px 12px", background: "var(--card)", border: "1px solid var(--soft)", marginBottom: 16 }}>
            <div className="tiny t-dim row g6" style={{ lineHeight: 1.5 }}>
              <Lock size={12} style={{ flexShrink: 0, verticalAlign: -1 }} />
              {usage ? tr("Nessun credito disponibile: il completamento AI costa 1 credito.") : tr("Verifica crediti in corso...")}
            </div>
            {usage && (
              <Btn small style={{ marginTop: 8 }} onClick={() => { onClose(); premium.open(); }}>
                {tr("Prendi i crediti nello store ›")}
              </Btn>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <button onClick={() => setUseAI((v) => !v)} className="tap cham-s row between g8" style={{
              width: "100%", cursor: "pointer", padding: "10px 12px", alignItems: "center",
              background: useAI ? "var(--active)" : "var(--card2)",
              border: `1px solid ${useAI ? "var(--cyan)" : "var(--soft)"}`,
            }}>
              <span className={useAI ? "t-cyan" : "t-dim"} style={{ fontSize: 13, fontWeight: 700 }}>
                {tr("L'AI compila le settimane per te")}
              </span>
              <span className="micro t-faint" style={{ flexShrink: 0 }}>
                {premium?.is ? tr("INCLUSO ∞") : `⬡ 1 · ${tr("saldo")} ${credits}`}
              </span>
            </button>
            {useAI && (
              <div className="stack-s" style={{ marginTop: 8 }}>
                <div className="micro t-faint" style={{ marginBottom: 2 }}>{tr("COME DEVE AUMENTARE?")}</div>
                {PROG_STRATEGIES.map((s) => (
                  <button key={s.id} onClick={() => setAiMode(s.id)} className="tap cham-s" style={{
                    width: "100%", textAlign: "left", cursor: "pointer", padding: "9px 12px",
                    background: aiMode === s.id ? "var(--active)" : "var(--card)",
                    border: `1px solid ${aiMode === s.id ? "var(--cyan)" : "var(--soft)"}`,
                  }}>
                    <div className={aiMode === s.id ? "t-cyan" : "t-bright"} style={{ fontSize: 13, fontWeight: 700 }}>
                      {tr(s.label)}{s.id === "double" ? ` · ${tr("CONSIGLIATA")}` : ""}
                    </div>
                    <div className="tiny t-faint" style={{ marginTop: 2, lineHeight: 1.45 }}>{tr(s.desc)}</div>
                  </button>
                ))}
                <div className="tiny t-faint" style={{ lineHeight: 1.5 }}>
                  {tr("Tenute e cardio vengono adattati in automatico (secondi/minuti al posto di kg e reps).")}
                </div>
              </div>
            )}
          </div>
        )}

        {/* azioni: attiva/rigenera + (se già attiva) disattiva con doppio tocco */}
        <div className="row g8" style={{ marginTop: 4 }}>
          {enabled && (
            confirmOff ? (
              <Btn small onClick={onDisable} style={{ flex: 1.2, borderColor: "var(--line2)", color: "var(--dim)" }}>
                {tr("Conferma: disattiva")}
              </Btn>
            ) : (
              <Btn small onClick={() => setConfirmOff(true)} style={{ flex: 1.2 }}>{tr("Disattiva")}</Btn>
            )
          )}
          {!enabled && <Btn onClick={onClose} style={{ flex: 1 }}>{tr("Annulla")}</Btn>}
          <Btn primary={!useAI} ai={useAI} disabled={busy} style={{ flex: 2 }}
            onClick={() => onConfirm({ weeks, useAI: useAI && aiOk, aiMode })}>
            {busy ? tr("Generazione...") : useAI && aiOk
              ? (enabled ? tr("Rigenera con AI") : tr("Attiva con AI"))
              : (enabled ? tr("Rigenera (lineare)") : tr("Attiva progressione"))}
          </Btn>
        </div>
        {confirmOff && (
          <div className="tiny t-faint" style={{ marginTop: 8, lineHeight: 1.5 }}>
            {tr("Disattivando, la scheda torna ai carichi base e il conteggio delle settimane si ferma.")}
          </div>
        )}
      </div>
    </div>
    </Overlay>
  );
}
