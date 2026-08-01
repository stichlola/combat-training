import React, { useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { featHeaders, parseLoose, resizeImage } from "../lib/ai";
import { ALL_EXERCISES, GROUPS, findGroup, matchToDb } from "../lib/exercises";
import { todayISO } from "../lib/progression";
import { tr } from "../lib/i18n";
import { Btn, Panel } from "../ui";

export function DocImport({ premium, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [pasted, setPasted] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const readBase64 = (f) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Lettura file fallita"));
    r.readAsDataURL(f);
  });

  const interpret = async () => {
    if (premium && premium.guest) return premium.open();  // ospite: nessuna funzione AI
    setLoading(true); setError(null);
    try {
      const content = [];
      if (file) {
        if (file.type === "application/pdf") {
          if (file.size > 3.5 * 1024 * 1024) throw new Error(tr("PDF troppo grande (max 3.5 MB): comprimilo o incolla il testo."));
          content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: await readBase64(file) } });
        } else if (file.type.startsWith("image/")) {
          /* le foto da smartphone superano il limite del serverless: si ridimensionano prima */
          const { b64, type } = await resizeImage(file, 1400);
          content.push({ type: "image", source: { type: "base64", media_type: type, data: b64 } });
        } else {
          content.push({ type: "text", text: decodeURIComponent(escape(atob(await readBase64(file)))) });
        }
      }
      if (pasted.trim()) content.push({ type: "text", text: pasted });
      content.push({
        type: "text",
        text: `Sei un assistente per un'app di fitness. Il documento/testo sopra è una scheda di allenamento scritta da un personal trainer (formato libero).
DATABASE ESERCIZI DELL'APP: ${ALL_EXERCISES.join(" | ")}
REGOLA FONDAMENTALE: riconduci OGNI esercizio del documento al nome PIÙ VICINO nel database, e sposta in "note" tutti i dettagli in eccesso (angolo, presa, tempo, recupero, tecnica). Esempi: "Panca piana a 30 gradi presa larga" -> name "Panca Inclinata Bilanciere", note "30°, presa larga"; "Squat fermo 2 secondi in buca" -> name "Squat Bilanciere", note "fermo 2s in buca". Imposta "matched": true.
SOLO se non esiste NESSUNA corrispondenza ragionevole nel database, mantieni il nome originale con "matched": false.
Rispondi SOLO con JSON valido, senza markdown, senza backtick, senza testo extra.
Schema: {"name": string (nome scheda breve maiuscolo), "exercises": [{"name": string, "matched": boolean, "note": string (dettagli extra, "" se nessuno), "group": string (uno tra: ${GROUPS.join(", ")}, oppure "Altro"), "sets": [{"w": number (kg, 0 se corpo libero o non indicato), "r": number (ripetizioni, stima se è un range es. "8-10" -> 9)}]}]}
Se un esercizio indica "3x10 60kg" genera 3 set identici. Se il documento contiene più giorni, unisci nel nome il giorno 1 e includi solo gli esercizi del giorno 1.
PROGRESSIONE SETTIMANALE: se il documento è una tabella programmata per settimane (colonne o blocchi tipo "SETTIMANA 1/2/3", "Week 1-4", "Sett.1 ... Sett.2", con carichi o ripetizioni che cambiano), aggiungi a OGNI esercizio coinvolto la chiave "weeks": un array con UN oggetto per settimana, nell'ordine, formato {"sets": [{"w": number, "r": number}]} (stessa struttura di "sets"). La settimana 1 deve coincidere con "sets". Se non c'è nessuna progressione, ometti "weeks".`,
      });

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: await featHeaders("import"),
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 2500, messages: [{ role: "user", content }] }),
      });
      const _txt = await response.text();
      let data; try { data = JSON.parse(_txt); } catch { throw new Error(response.status === 413 ? tr("File troppo grande: usa una foto più piccola o incolla il testo.") : `Errore server (${response.status})`); }
      if (data.error === "limit_reached") throw new Error("LIMIT");
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : "Errore API");
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const parsed = parseLoose(text);
      const routine = {
        id: Date.now(),
        name: (parsed.name || "SCHEDA PT").toUpperCase(),
        exercises: (parsed.exercises || []).map((e) => {
          /* 1° livello: mapping fatto dall'AI col database; 2° livello: matcher testuale; altrimenti esercizio nuovo */
          let name = e.name, note = e.note || "";
          let matched = e.matched !== false && ALL_EXERCISES.includes(e.name);
          if (!matched) {
            const m = matchToDb(e.name);
            if (ALL_EXERCISES.includes(m.name)) {
              name = m.name;
              note = [m.note, note].filter(Boolean).join(" · ");
              matched = true;
            }
          }
          const group = GROUPS.includes(e.group) ? e.group : findGroup(name);
          const base = matched
            ? { name, group, note }
            : { name, group, note, isCustom: true, desc: "", img: "" }; // nuovo: descrizione e immagine editabili
          /* progressione settimanale rilevata nel documento: precompilata, attivazione manuale */
          const weeks = Array.isArray(e.weeks) && e.weeks.length > 1
            ? e.weeks.map((w) => ({ sets: (w.sets || []).map((s) => ({ w: Number(s.w) || 0, r: Number(s.r) || 10 })) }))
                .filter((w) => w.sets.length)
            : null;
          if (weeks && weeks.length > 1) base.progression = { weeks };
          if (group === "Cardio") return {
            ...base, mode: "time",
            sets: (e.sets || [{}]).map(() => ({ sec: 600, dist: "", elapsed: 0, done: false })),
          };
          return {
            ...base,
            sets: (e.sets || []).map((s) => ({ w: Number(s.w) || 0, r: Number(s.r) || 10, done: false })),
          };
        }).filter((e) => e.sets.length),
      };
      if (!routine.exercises.length) throw new Error("Nessun esercizio riconosciuto nel documento");
      /* progressione precompilata dal documento: parte SPENTA, il PT l'attiva se vuole */
      if (routine.exercises.some((e) => e.progression?.weeks?.length > 1))
        routine.progression = { enabled: false, startDate: todayISO() };
      setResult(routine);
    } catch (err) {
      if (err.message === "LIMIT") {
        setError("Limite settimanale di import raggiunto — acquista crediti o attendi lunedì.");
        if (premium) premium.open();
      } else setError(err.message || "Interpretazione fallita. Riprova con un documento più leggibile.");
    }
    setLoading(false);
  };

  return (
    <div className="fade-in stack" style={{ maxWidth: 640 }}>
      <div className="row between">
        <Btn small onClick={onClose}>{tr("‹ Indietro")}</Btn>
        <span className="hud-title">{tr("Import scheda PT")}</span>
        <div style={{ width: 64 }} />
      </div>

      {!result ? (
        <>
          <Panel accent>
            <input ref={inputRef} type="file" accept=".pdf,image/*,.txt,.md,.csv" style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
            <button onClick={() => inputRef.current && inputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault(); setDrag(false);
                const f = e.dataTransfer.files && e.dataTransfer.files[0];
                if (f) setFile(f);
              }}
              className="tap cham"
              style={{ width: "100%", padding: "32px 16px", cursor: "pointer",
                border: `1px dashed ${drag ? "var(--cyan)" : "#2f6786"}`,
                background: drag ? "var(--active)" : "transparent", transition: "background .15s,border-color .15s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {file ? (
                <>
                  <FileText size={24} color="var(--cyan-hi)" />
                  <span className="t-bright" style={{ fontSize: 14, fontWeight: 700 }}>{file.name}</span>
                  <span className="micro">{tr("TOCCA PER SOSTITUIRE")}</span>
                </>
              ) : (
                <>
                  <Upload size={24} color="var(--cyan)" />
                  <span className="f-hud t-cyan" style={{ fontSize: 12, letterSpacing: ".2em" }}>{tr("CARICA DOCUMENTO")}</span>
                  <span className="tiny t-dim">{tr("Trascina qui il file, oppure tocca — PDF · Foto · Testo")}</span>
                </>
              )}
            </button>
            <div className="micro" style={{ textAlign: "center", margin: "12px 0" }}>{tr("— OPPURE —")}</div>
            <textarea className="hud-input cham-s" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={4}
              placeholder={"Incolla qui il testo della scheda...\nes. Panca piana 4x8 80kg\nRematore 3x10 60kg"}
              style={{ resize: "none" }} />
          </Panel>

          {error && (
            <Panel style={{ borderColor: "#6e3028", padding: 12 }}>
              <div className="tiny t-red">⚠ {error}</div>
            </Panel>
          )}

          <Btn primary full disabled={loading || (!file && !pasted.trim())} onClick={interpret}>
            {loading ? <span className="row center g8"><Loader2 size={14} className="spin" /> {tr("Analisi in corso...")}</span> : "◈ Interpreta con AI"}
          </Btn>
        </>
      ) : (
        <>
          <Panel accent>
            <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".2em", marginBottom: 12 }}>{result.name}</div>
            {result.exercises.map((e, i) => {
              const updEx = (field, val) => setResult((r) => ({
                ...r, exercises: r.exercises.map((x, j) => j !== i ? x : { ...x, [field]: val }),
              }));
              return (
                <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--hairline)" }}>
                  <div className="row between g8">
                    <div className="grow">
                      <span className="t-bright" style={{ fontSize: 14, fontWeight: 700 }}>{tr(e.name)}</span>
                      <span className="micro" style={{ marginLeft: 8 }}>{tr(e.group).toUpperCase()}</span>
                      {e.isCustom && <span className="micro cham-s" style={{ marginLeft: 8, padding: "2px 7px", border: "1px solid #ffd76a", color: "#ffd76a" }}>{tr("NUOVO")}</span>}
                      {e.progression?.weeks?.length > 1 && <span className="micro cham-s" style={{ marginLeft: 8, padding: "2px 7px", border: "1px solid var(--cyan)", color: "var(--cyan-hi)" }}>PROG ×{e.progression.weeks.length}</span>}
                    </div>
                    <span className="tiny t-dim" style={{ flexShrink: 0 }}>
                      {e.mode === "time" ? `${e.sets.length} × tempo` : `${e.sets.length} × ${e.sets[0].r}${e.sets[0].w ? ` @ ${e.sets[0].w}kg` : ""}`}
                    </span>
                  </div>
                  <input className="hud-input cham-s" value={e.note || ""} onChange={(ev) => updEx("note", ev.target.value)}
                    placeholder={tr("Note esercizio...")} style={{ fontSize: 12, padding: "6px 8px", marginTop: 6, color: "#8fb2c9" }} />
                  {e.isCustom && (
                    <div className="stack-s fade-in" style={{ marginTop: 6, paddingLeft: 10, borderLeft: "2px solid #ffd76a" }}>
                      <div className="micro t-amber">{tr("ESERCIZIO NON IN LIBRERIA — PERSONALIZZALO")}</div>
                      <textarea className="hud-input cham-s" value={e.desc} onChange={(ev) => updEx("desc", ev.target.value)} rows={2}
                        placeholder={tr("Descrizione esecuzione (mostrata nel pop-up info)...")} style={{ fontSize: 12, padding: "6px 8px", resize: "none" }} />
                      <input className="hud-input cham-s" value={e.img} onChange={(ev) => updEx("img", ev.target.value)}
                        placeholder={tr("URL immagine/GIF (opzionale)...")} style={{ fontSize: 12, padding: "6px 8px" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </Panel>
          <div className="row g8">
            <Btn onClick={() => setResult(null)} style={{ flex: 1 }}>{tr("↻ Riprova")}</Btn>
            <Btn primary onClick={() => onSave(result)} style={{ flex: 1 }}>{tr("Salva scheda ✓")}</Btn>
          </div>
        </>
      )}
    </div>
  );
}
