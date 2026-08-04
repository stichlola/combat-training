import React, { useEffect, useState } from "react";
import { ShieldCheck, Send, Check, X, Loader2 } from "lucide-react";
import { submitPtRequest, fetchMyPtRequest, fetchPendingPtRequests, decidePtRequest } from "../lib/trainer";
import { tr } from "../lib/i18n";
import { Btn, Overlay, Panel } from "../ui";

/* ---------------- Richiesta PT (lato utente) ----------------
   Nel profilo utente: pulsante "Diventa Personal Trainer" → modale con
   motivazione. Stato visibile: in valutazione / approvata / rifiutata. */

export function PtRequestCard({ user, fireToast }) {
  const [req, setReq] = useState(undefined); // undefined = loading, null = nessuna
  const [open, setOpen] = useState(false);

  useEffect(() => { fetchMyPtRequest(user.id).then((r) => setReq(r || null)); }, [user.id]);

  const onSent = (r) => { setReq(r); setOpen(false); };

  return (
    <Panel>
      <div className="row between">
        <div className="row g8">
          <ShieldCheck size={15} color="var(--cyan)" />
          <span className="hud-label" style={{ marginBottom: 0 }}>{tr("AREA PERSONAL TRAINER")}</span>
        </div>
        {req?.status === "pending" && <span className="chip cham-s" style={{ fontSize: 9 }}>{tr("IN VALUTAZIONE")}</span>}
        {req?.status === "rejected" && <span className="chip cham-s" style={{ fontSize: 9, color: "#ff8a8a", borderColor: "#5a2a2a" }}>{tr("RIFIUTATA")}</span>}
      </div>
      <div className="tiny t-dim" style={{ lineHeight: 1.6, margin: "8px 0 10px" }}>
        {req?.status === "pending"
          ? tr("La tua richiesta è in valutazione: riceverai l'esito al prossimo accesso.")
          : req?.status === "rejected"
            ? tr("La richiesta precedente è stata rifiutata. Puoi inviarne una nuova.")
            : tr("Sei un personal trainer? Invia la richiesta: verrà valutata dall'amministratore prima dell'attivazione.")}
      </div>
      {req?.status !== "pending" && (
        <Btn small onClick={() => setOpen(true)}>
          <ShieldCheck size={12} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Diventa Personal Trainer")}
        </Btn>
      )}
      {open && <PtRequestModal user={user} fireToast={fireToast} onClose={() => setOpen(false)} onSent={onSent} />}
    </Panel>
  );
}

function PtRequestModal({ user, fireToast, onClose, onSent }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const send = async () => {
    setBusy(true); setErr(null);
    const res = await submitPtRequest(user.id, user.email, msg);
    setBusy(false);
    if (res !== true) {
      setErr(typeof res === "string" ? res : tr("Invio non riuscito: riprova tra poco."));
      return;
    }
    fireToast({ title: tr("◈ RICHIESTA INVIATA"), sub: tr("Verrà valutata dall'amministratore") });
    onSent({ status: "pending" });
  };

  return (
    <Overlay>
    <div className="modal-back" onClick={onClose}>
      <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 4 }}>
          <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".18em", fontSize: 13 }}>
            <ShieldCheck size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("RICHIESTA PERSONAL TRAINER")}
          </div>
          <span onClick={onClose} className="tap t-faint" style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0" }}>✕</span>
        </div>
        <div className="tiny t-dim" style={{ lineHeight: 1.6, marginBottom: 12 }}>
          {tr("Puoi presentarti brevemente: esperienza, certificazioni, dove alleni.")} <span className="t-faint">{tr("(facoltativo)")}</span> {tr("L'amministratore valuterà la richiesta.")}
        </div>
        <textarea className="hud-input" rows={4} value={msg} onChange={(e) => setMsg(e.target.value)}
          placeholder={tr("Es. PT certificato ISSA, alleno presso ... (opzionale)")}
          style={{ width: "100%", resize: "vertical", marginBottom: 12 }} />
        {err && <div className="tiny" style={{ color: "#ff8a8a", marginBottom: 10, lineHeight: 1.5 }}>⚠ {err}</div>}
        <Btn primary onClick={send} disabled={busy} style={{ width: "100%" }}>
          {busy ? <Loader2 size={12} className="spin" style={{ display: "inline", verticalAlign: -2 }} />
                : <Send size={12} style={{ display: "inline", verticalAlign: -2 }} />} {tr("Invia richiesta")}
        </Btn>
      </div>
    </div>
    </Overlay>
  );
}

/* ---------------- Pannello admin (solo il tuo account) ----------------
   Lista delle richieste in attesa con Approva / Rifiuta. */

export function PtRequestsAdmin({ fireToast }) {
  const [list, setList] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const reload = () => fetchPendingPtRequests().then(setList);
  useEffect(() => { reload(); }, []);

  const decide = async (req, approve) => {
    setBusyId(req.id);
    const ok = await decidePtRequest(req, approve);
    setBusyId(null);
    if (!ok) return fireToast({ title: tr("Operazione non riuscita"), sub: req.email });
    fireToast(approve
      ? { title: tr("◈ PT APPROVATO"), sub: req.email }
      : { title: tr("Richiesta rifiutata"), sub: req.email });
    reload();
  };

  return (
    <Panel accent>
      <div className="row g8" style={{ marginBottom: 10 }}>
        <ShieldCheck size={15} color="#ffd76a" />
        <span className="hud-label" style={{ marginBottom: 0 }}>{tr("RICHIESTE PT")}</span>
        <span className="chip cham-s" style={{ fontSize: 9, color: "#ffd76a", borderColor: "#5a4a1f" }}>ADMIN</span>
      </div>
      {!list ? (
        <div className="tiny t-faint">{tr("Caricamento...")}</div>
      ) : list.length === 0 ? (
        <div className="tiny t-faint">{tr("Nessuna richiesta in attesa.")}</div>
      ) : (
        <div className="stack">
          {list.map((r) => (
            <div key={r.id} className="cham-s" style={{ padding: 12, background: "var(--card)", border: "1px solid var(--soft)" }}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span className="tiny t-bright" style={{ fontWeight: 700 }}>{r.email}</span>
                <span className="micro t-faint">{new Date(r.created_at).toLocaleDateString("it-IT")}</span>
              </div>
              <div className="tiny t-dim" style={{ lineHeight: 1.6, marginBottom: 10, whiteSpace: "pre-wrap" }}>{r.message?.trim() ? r.message : <span className="t-faint">{tr("(nessuna presentazione)")}</span>}</div>
              <div className="row g8">
                <Btn small primary disabled={busyId === r.id} onClick={() => decide(r, true)} style={{ flex: 1 }}>
                  {busyId === r.id ? <Loader2 size={12} className="spin" style={{ display: "inline", verticalAlign: -2 }} />
                    : <Check size={12} style={{ display: "inline", verticalAlign: -2 }} />} {tr("Approva")}
                </Btn>
                <Btn small disabled={busyId === r.id} onClick={() => decide(r, false)} style={{ flex: 1 }}>
                  <X size={12} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Rifiuta")}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
