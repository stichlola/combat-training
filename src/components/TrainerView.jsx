import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, Copy, Trash2, UserPlus, Users, Dumbbell, StickyNote, QrCode, LogOut, Pencil, Plus, Upload, AlertTriangle } from "lucide-react";
import { inviteLink, listClients, saveClientNote, removeClient, getClientRoutines, saveClientRoutines, ptImportsLeft, ptImportConsume, PT_IMPORT_WEEK_LIMIT } from "../lib/trainer";
import { exMode, isDumbbell } from "../lib/exercises";
import { tr } from "../lib/i18n";
import { Btn, Overlay, Panel } from "../ui";
import { RoutineEditor } from "./RoutineEditor";
import { DocImport } from "./DocImport";

/* ---------------- Vista Personal Trainer ----------------
   Interfaccia pulita e professionale: niente gamification.
   Focus sui clienti: invito via link/QR, lista, dettaglio con note private
   e (predisposto) visualizzazione delle schede del cliente. */

export function TrainerView({ user, fireToast }) {
  const [clients, setClients] = useState(null);
  const [sel, setSel] = useState(null);          // cliente aperto in dettaglio
  const [inviteOpen, setInviteOpen] = useState(false);

  const reload = () => listClients(user.id).then(setClients);
  useEffect(() => { reload(); }, []);

  if (sel) return (
    <ClientDetail user={user} client={sel} fireToast={fireToast}
      onBack={() => { setSel(null); reload(); }}
      onRemoved={() => { setSel(null); reload(); }} />
  );

  return (
    <div className="fade-in stack" style={{ maxWidth: 640 }}>
      {inviteOpen && <InviteModal user={user} fireToast={fireToast} onClose={() => setInviteOpen(false)} />}

      <div className="row between">
        <h2 className="hud-title">{tr("▸ I tuoi clienti")}</h2>
        <Btn small primary onClick={() => setInviteOpen(true)}>
          <UserPlus size={12} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Invita cliente")}
        </Btn>
      </div>

      {clients === null && <div className="tiny t-faint" style={{ textAlign: "center", padding: 20 }}>{tr("Caricamento...")}</div>}

      {clients !== null && clients.length === 0 && (
        <Panel accent style={{ textAlign: "center", padding: 28 }}>
          <Users size={26} color="var(--cyan)" style={{ margin: "0 auto 12px" }} />
          <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 13 }}>{tr("NESSUN CLIENTE COLLEGATO")}</div>
          <div className="tiny t-dim" style={{ marginTop: 8, lineHeight: 1.6 }}>
            {tr("Condividi il tuo link invito o il QR code: il cliente si registra (o accede) e conferma il collegamento.")}
          </div>
          <div style={{ marginTop: 16 }}>
            <Btn primary onClick={() => setInviteOpen(true)}>{tr("Invita il primo cliente")}</Btn>
          </div>
        </Panel>
      )}

      {(clients || []).map((c) => (
        <button key={c.client_id} onClick={() => setSel(c)} className="tap" style={{ width: "100%", cursor: "pointer", textAlign: "left" }}>
          <Panel hover>
            <div className="row g12" style={{ alignItems: "center" }}>
              <div className="cham-s" style={{ padding: 10, background: "var(--card)", border: "1px solid var(--soft)", flexShrink: 0 }}>
                <Users size={16} color="var(--cyan)" />
              </div>
              <div className="grow">
                <div className="t-bright" style={{ fontSize: 15, fontWeight: 700 }}>
                  {c.full_name || c.username || c.client_email || c.client_id.slice(0, 8)}
                </div>
                <div className="tiny t-faint">
                  {[c.full_name && c.username ? `@${c.username}` : null, c.client_email].filter(Boolean).join(" · ")}
                </div>
                <div className="tiny t-faint">
                  {tr("dal")} {new Date(c.created_at).toLocaleDateString("it-IT")}{c.note ? ` · 📝` : ""}
                </div>
              </div>
              <span className="t-faint" style={{ fontSize: 16 }}>›</span>
            </div>
          </Panel>
        </button>
      ))}
    </div>
  );
}

/* ---------------- Modale invito: link + QR code ---------------- */
function InviteModal({ user, fireToast, onClose }) {
  /* il nome viaggia nel link: il cliente vede subito chi lo seguirà */
  const link = inviteLink(user.id, user.full_name || user.username);
  const [qr, setQr] = useState(null);

  useEffect(() => {
    /* colori esadecimali fissi: il QR viene disegnato su canvas, var() non funzionerebbe */
    QRCode.toDataURL(link, { margin: 1, width: 220, color: { dark: "#9be8ff", light: "#04090f" } })
      .then(setQr).catch(() => {});
  }, []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); fireToast({ title: tr("◈ LINK COPIATO"), sub: tr("Incollalo al cliente") }); }
    catch { fireToast({ title: tr("Copia non riuscita"), sub: link }); }
  };

  return (
    <Overlay>
    <div className="modal-back" onClick={onClose}>
      <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 4 }}>
          <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".18em", fontSize: 13 }}>
            <QrCode size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("INVITA UN CLIENTE")}
          </div>
          <span onClick={onClose} className="tap t-faint" style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0" }}>✕</span>
        </div>
        <div className="tiny t-dim" style={{ lineHeight: 1.6, marginBottom: 14 }}>
          {tr("Il cliente apre il link (o inquadra il QR), accede al suo account e conferma il collegamento: apparirà nella tua lista.")}
        </div>
        {qr && <img src={qr} alt="QR invito" style={{ display: "block", margin: "0 auto 14px", width: 200, height: 200 }} />}
        <div className="cham-s" style={{ padding: "8px 10px", background: "var(--card)", border: "1px solid var(--soft)", wordBreak: "break-all", fontSize: 11, color: "var(--dim)", marginBottom: 12 }}>
          {link}
        </div>
        <Btn primary onClick={copy} style={{ width: "100%" }}>
          <Copy size={12} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Copia link invito")}
        </Btn>
      </div>
    </div>
    </Overlay>
  );
}

/* ---------------- Dettaglio cliente: note + schede (modifica diretta) ---------------- */
function ClientDetail({ user, client, fireToast, onBack, onRemoved }) {
  const [note, setNote] = useState(client.note || "");
  const [routines, setRoutines] = useState(null); // null = caricamento
  const [confirmRm, setConfirmRm] = useState(false);
  const [editIdx, setEditIdx] = useState(null);  // null=lista · -1=nuova · >=0 indice scheda
  const [importOpen, setImportOpen] = useState(false);
  const [pending, setPending] = useState(null);  // nuove routines in attesa di conferma sovrascrittura
  const [delId, setDelId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [importsLeft, setImportsLeft] = useState(() => ptImportsLeft()); // soft lock anti-abuso
  const dirty = note !== (client.note || "");

  const openImport = () => {
    if (importsLeft <= 0)
      return fireToast({ title: tr("Limite import raggiunto"), sub: `${tr("Max")} ${PT_IMPORT_WEEK_LIMIT}/${tr("settimana")} — ${tr("si azzera lunedì")}` });
    setImportOpen(true);
  };

  useEffect(() => { getClientRoutines(client.client_id).then((r) => setRoutines(r || [])); }, []);

  const save = async () => {
    await saveClientNote(user.id, client.client_id, note);
    client.note = note;
    fireToast({ title: tr("◈ NOTE SALVATE") });
  };

  const remove = async () => {
    await removeClient(user.id, client.client_id);
    fireToast({ title: tr("◈ CLIENTE RIMOSSO") });
    onRemoved();
  };

  /* persistenza effettiva dopo la conferma di sovrascrittura */
  const commit = async () => {
    setBusy(true);
    const ok = await saveClientRoutines(client.client_id, pending);
    setBusy(false);
    if (!ok) { setPending(null); return fireToast({ title: tr("Salvataggio non riuscito"), sub: tr("Riprova tra poco") }); }
    setRoutines(pending);
    setPending(null);
    fireToast({ title: tr("◈ SCHEDE AGGIORNATE"), sub: tr("Il cliente le vedrà al prossimo caricamento") });
  };

  /* --- editor scheda (nuova o esistente) --- */
  if (editIdx !== null) return (
    <RoutineEditor premium={null} fireToast={fireToast} showScan={false}
      initial={editIdx >= 0 ? routines[editIdx] : null}
      onClose={() => setEditIdx(null)}
      onSave={(draft) => {
        setPending(editIdx >= 0 ? routines.map((r, i) => (i === editIdx ? draft : r)) : [...(routines || []), draft]);
        setEditIdx(null);
      }} />
  );

  /* --- import AI (foto excel, PDF, testo → bozza scheda per il cliente) --- */
  if (importOpen) return (
    <DocImport premium={null}
      onClose={() => setImportOpen(false)}
      onSave={(r) => {
        ptImportConsume(); setImportsLeft(ptImportsLeft());
        setPending([...(routines || []), r]); setImportOpen(false);
      }} />
  );

  return (
    <div className="fade-in stack" style={{ maxWidth: 640 }}>
      {/* conferma sovrascrittura: le schede del cliente vengono sostituite */}
      {pending && (
        <Overlay>
        <div className="modal-back" onClick={() => !busy && setPending(null)}>
          <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="f-hud t-amber" style={{ fontWeight: 700, letterSpacing: ".18em", fontSize: 13, marginBottom: 8 }}>
              <AlertTriangle size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("ATTENZIONE — SOVRASCRITTURA")}
            </div>
            <div className="tiny t-dim" style={{ lineHeight: 1.7, marginBottom: 14 }}>
              {tr("Salvando, le schede che il cliente vede nella sua app verranno SOSTITUITE con le tue modifiche: le sue versioni (carichi, serie, note) andranno perse. Confermi?")}
            </div>
            <div className="row g8">
              <Btn primary disabled={busy} onClick={commit} style={{ flex: 1 }}>{tr("Sovrascrivi le schede")}</Btn>
              <Btn disabled={busy} onClick={() => setPending(null)} style={{ flex: 1 }}>{tr("Annulla")}</Btn>
            </div>
          </div>
        </div>
        </Overlay>
      )}

      <div className="row between">
        <Btn small onClick={onBack}><ArrowLeft size={12} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Clienti")}</Btn>
        {confirmRm ? (
          <div className="row g8">
            <Btn small onClick={remove} style={{ borderColor: "#6e3028", color: "#ff8f7d" }}>{tr("Conferma rimozione")}</Btn>
            <Btn small onClick={() => setConfirmRm(false)}>{tr("Annulla")}</Btn>
          </div>
        ) : (
          <Btn small onClick={() => setConfirmRm(true)} style={{ borderColor: "#6e3028", color: "#ff8f7d" }}>
            <Trash2 size={12} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Rimuovi")}
          </Btn>
        )}
      </div>

      <Panel accent>
        <div className="f-hud t-cyan" style={{ fontWeight: 700, fontSize: 16, letterSpacing: ".05em" }}>
          {client.full_name || client.username || client.client_email || client.client_id}
        </div>
        <div className="tiny t-faint" style={{ marginTop: 4 }}>
          {[client.full_name && client.username ? `@${client.username}` : null, client.client_email].filter(Boolean).join(" · ")}
        </div>
        <div className="tiny t-faint" style={{ marginTop: 2 }}>
          {tr("Cliente dal")} {new Date(client.created_at).toLocaleDateString("it-IT")}
        </div>
      </Panel>

      {/* Note private del PT */}
      <Panel>
        <div className="hud-label row g6" style={{ marginBottom: 6 }}>
          <StickyNote size={13} color="var(--cyan)" /> {tr("Note private (solo tu le vedi)")}
        </div>
        <textarea className="hud-input cham-s" value={note} onChange={(e) => setNote(e.target.value)} rows={4}
          placeholder={tr("Es. obiettivi, infortuni, preferenze, progressi osservati...")}
          style={{ resize: "vertical", fontSize: 13, lineHeight: 1.6 }} />
        {dirty && (
          <Btn small primary onClick={save} style={{ marginTop: 8 }}>{tr("Salva note")}</Btn>
        )}
      </Panel>

      {/* Schede del cliente: crea, modifica, importa — con avviso di sovrascrittura */}
      <Panel>
        <div className="row between" style={{ marginBottom: 8 }}>
          <div className="hud-label row g6" style={{ marginBottom: 0 }}>
            <Dumbbell size={13} color="var(--cyan)" /> {tr("Schede del cliente")}
          </div>
          <Btn small onClick={() => setEditIdx(-1)}><Plus size={12} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Nuova")}</Btn>
        </div>
        <Btn small onClick={openImport} style={{ width: "100%", marginBottom: 4, opacity: importsLeft <= 0 ? .4 : .85 }}
          title={tr("Fotografa la tua tabella (Excel, PDF, testo): l'AI la converte in scheda, progressioni settimanali incluse")}>
          <Upload size={12} style={{ display: "inline", verticalAlign: -2 }} /> {tr("◈ IMPORTA CON AI")}
        </Btn>
        <div className="micro t-faint" style={{ textAlign: "center", marginBottom: 10 }}>
          {tr("Import rimasti questa settimana")}: {importsLeft}/{PT_IMPORT_WEEK_LIMIT}
        </div>
        {routines === null && <div className="tiny t-faint" style={{ padding: "6px 0" }}>{tr("Caricamento...")}</div>}
        {routines !== null && routines.length === 0 && (
          <div className="tiny t-faint" style={{ padding: "6px 0" }}>{tr("Il cliente non ha ancora schede.")}</div>
        )}
        {(routines || []).map((r, ri) => (
          <div key={r.id} className="cham-s" style={{ padding: "10px 12px", background: "var(--card)", border: "1px solid var(--soft)", marginBottom: 8 }}>
            <div className="row between">
              <span className="f-hud t-bright" style={{ fontWeight: 700, letterSpacing: ".12em", fontSize: 13 }}>
                {r.name}
                {r.progression?.enabled && <span className="micro" style={{ marginLeft: 8, color: "#ffd76a" }}>PROG</span>}
              </span>
              <div className="row g8" style={{ flexShrink: 0 }}>
                <span className="micro t-dim">{r.exercises.length} {tr("ESERCIZI")}</span>
                <span onClick={() => setEditIdx(ri)} className="tap" style={{ cursor: "pointer", padding: "2px 6px", color: "var(--cyan-hi)" }} title={tr("Modifica scheda")}>
                  <Pencil size={14} />
                </span>
                {delId === r.id ? (
                  <span onClick={() => setPending(routines.filter((x) => x.id !== r.id))} className="tap"
                    style={{ cursor: "pointer", padding: "2px 6px", color: "#ff8f7d", fontSize: 11, fontWeight: 700 }}>
                    {tr("Conferma?")}
                  </span>
                ) : (
                  <span onClick={() => { setDelId(r.id); setTimeout(() => setDelId((d) => (d === r.id ? null : d)), 2500); }}
                    className="tap" style={{ cursor: "pointer", padding: "2px 6px", color: "var(--dim)" }} title={tr("Elimina scheda")}>
                    <Trash2 size={14} />
                  </span>
                )}
              </div>
            </div>
            <div className="tiny t-faint" style={{ marginTop: 6, lineHeight: 1.9 }}>
              {r.exercises.map((e, i) => (
                <div key={i} className="row between g8">
                  <span>{i + 1}. {tr(e.name)}</span>
                  <span className="t-cyan" style={{ flexShrink: 0 }}>
                    {exMode(e) === "time" ? `${e.sets.length}×${Math.round((e.sets[0]?.sec || 0) / 60)}min`
                      : exMode(e) === "hold" ? `${e.sets.length}×${e.sets[0]?.sec || 60}s`
                      : `${e.sets.length}×${e.sets[0]?.w || "—"}kg×${e.sets[0]?.r || "—"}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="micro t-faint" style={{ marginTop: 4, lineHeight: 1.6 }}>
          {tr("Le modifiche salvate qui sovrascrivono le schede del cliente: lui le vedrà aggiornate al prossimo caricamento dell'app.")}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Profilo PT: essenziale ---------------- */
export function TrainerProfile({ user, onLogout, fireToast }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  return (
    <div className="fade-in stack" style={{ maxWidth: 560 }}>
      {inviteOpen && <InviteModal user={user} fireToast={fireToast} onClose={() => setInviteOpen(false)} />}
      <h2 className="hud-title">{tr("▸ Profilo Personal Trainer")}</h2>
      <Panel accent>
        <div className="f-hud t-bright" style={{ fontWeight: 700, fontSize: 16, letterSpacing: ".1em" }}>{user.username}</div>
        <div className="tiny t-faint" style={{ marginTop: 2 }}>{user.email}</div>
        <span className="chip cham-s" style={{ marginTop: 10, display: "inline-block", borderColor: "var(--cyan)", color: "var(--cyan)" }}>PERSONAL TRAINER</span>
      </Panel>
      <Btn onClick={() => setInviteOpen(true)}>
        <QrCode size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Il mio link / QR invito")}
      </Btn>
      <Btn onClick={onLogout} style={{ borderColor: "#6e3028", color: "#ff8f7d" }}>
        <LogOut size={13} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Esci")}
      </Btn>
    </div>
  );
}
