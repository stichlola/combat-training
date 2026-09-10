/* ---------------- Esportazione PDF di una scheda (lato PT) ----------------
   jsPDF viene importato dinamicamente dal chiamante (chunk caricato on-demand,
   non appesantisce il bundle iniziale). Layout pulito e stampabile: intestazione
   con scheda/cliente/PT, tabella serie per esercizio, settimane di progressione
   se attive, note PT e link video. */
import { exMode } from "./exercises";
import { progTotal, currentWeek } from "./progression";
import { tr } from "./i18n";

const M = 14;           // margine mm
const PAGE_W = 210;     // A4
const PAGE_H = 297;
const INK = [26, 32, 40];      // testo principale
const DIM = [110, 118, 128];   // testo secondario
const ACC = [180, 120, 40];    // accento ambra calda
const SOFT = [228, 230, 234];  // linee

const slug = (s) => String(s || "scheda").toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "scheda";

/* valori serie leggibili: forza (kg × reps, anche intervalli "8-10"),
   tenuta (sec), cardio/tempo (sec + dist) */
const setCells = (ex, st) => {
  const mode = exMode(ex);
  if (mode === "time") return [st.sec ?? "", st.dist ?? ""];
  if (mode === "hold") return [st.sec ?? ""];
  return [st.w ?? "", st.r ?? ""];
};
const setHead = (ex) => {
  const mode = exMode(ex);
  if (mode === "time") return [tr("SEC"), tr("DIST")];
  if (mode === "hold") return [tr("SEC")];
  return [tr("KG"), tr("REPS")];
};

export function exportRoutinePdf(doc, routine, { clientName = "", ptName = "" } = {}) {
  let y = M;

  const newPageIfNeeded = (need) => {
    if (y + need > PAGE_H - M - 8) { doc.addPage(); y = M; }
  };
  const line = (x1, x2, color = SOFT, w = 0.3) => {
    doc.setDrawColor(...color); doc.setLineWidth(w); doc.line(x1, y, x2, y);
  };
  const text = (t, x, size, color = INK, style = "normal") => {
    doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...color);
    doc.text(String(t ?? ""), x, y);
  };
  /* testo a capo automatico: ritorna l'altezza usata */
  const wrapped = (t, x, maxW, size, color = DIM, style = "normal", lh = 1.45) => {
    doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(t ?? ""), maxW);
    doc.text(lines, x, y);
    return lines.length * size * 0.3528 * lh * 0.82 + 1;
  };

  /* ── intestazione ── */
  doc.setFillColor(...INK); doc.rect(0, 0, PAGE_W, 2.2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...INK);
  doc.text("FIT//TRAINING", M, y + 5);
  doc.setFontSize(8); doc.setTextColor(...DIM); doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }), PAGE_W - M, y + 5, { align: "right" });
  y += 12;

  text(routine.name || tr("Scheda"), M, 19, ACC, "bold"); y += 8;
  const meta = [
    clientName ? `${tr("Cliente")}: ${clientName}` : null,
    ptName ? `${tr("Personal trainer")}: ${ptName}` : null,
    routine.progression?.enabled
      ? `${tr("Progressione")}: ${tr("SETTIMANA")} ${currentWeek(routine.progression, progTotal(routine))}/${progTotal(routine)}`
      : null,
  ].filter(Boolean).join("   ·   ");
  y += wrapped(meta, M, PAGE_W - 2 * M, 9.5, DIM) + 2;
  line(M, PAGE_W - M); y += 7;

  /* ── esercizi ── */
  (routine.exercises || []).forEach((ex, i) => {
    const weeks = ex.progression?.weeks?.length ? ex.progression.weeks : null;
    newPageIfNeeded(34);
    /* nome + gruppo */
    text(`${i + 1}. ${tr(ex.name)}`, M, 12, INK, "bold");
    const g = tr(ex.group || "").toUpperCase();
    if (g) { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...ACC); doc.text(g, PAGE_W - M, y, { align: "right" }); }
    y += 5.5;

    const head = setHead(ex);
    const colX = [M + 2, M + 22, M + 52, M + 82]; // #, col1, col2, note-recupero a destra
    const drawTable = (rows, label) => {
      const rowH = 6.2;
      const need = (rows.length + 1) * rowH + (label ? 5 : 0) + 4;
      newPageIfNeeded(need);
      if (label) { text(label, M, 9, ACC, "bold"); y += 4.6; }
      /* header tabella */
      doc.setFillColor(245, 244, 240);
      doc.rect(M, y - 4.2, PAGE_W - 2 * M, rowH, "F");
      const yy0 = y;
      text("#", colX[0], 8.5, DIM, "bold");
      head.forEach((h, k) => text(h, colX[k + 1], 8.5, DIM, "bold"));
      y += rowH - 4.2 + 3.4;
      rows.forEach((st, si) => {
        if (y + rowH > PAGE_H - M - 8) { doc.addPage(); y = M; }
        doc.setDrawColor(...SOFT); doc.setLineWidth(0.2);
        doc.line(M, y + 2.2, PAGE_W - M, y + 2.2);
        text(String(si + 1), colX[0], 9.5, DIM);
        setCells(ex, st).forEach((c, k) => text(c === "" || c == null ? "—" : c, colX[k + 1], 9.5, INK));
        y += rowH;
      });
      y += 1.5;
    };

    if (weeks) {
      /* progressione: una tabella per settimana */
      weeks.forEach((w, wi) => drawTable(w.sets || [], `${tr("SETTIMANA")} ${wi + 1}`));
    } else {
      drawTable(ex.sets || [], null);
    }

    /* recupero + note esercizio */
    const bits = [];
    if (ex.rest) bits.push(`${tr("RECUPERO")}: ${ex.rest}s`);
    if (ex.note) bits.push(`${tr("Note")}: ${tr(ex.note)}`);
    if (bits.length) { newPageIfNeeded(8); y += wrapped(bits.join("   ·   "), M, PAGE_W - 2 * M, 8.5, DIM) + 1; }

    /* box note PT */
    if (ex.ptNote || ex.ptVideo) {
      newPageIfNeeded(14);
      const boxY = y;
      doc.setFillColor(252, 248, 239); doc.setDrawColor(222, 200, 160);
      const inner = [];
      if (ex.ptNote) inner.push(ex.ptNote);
      if (ex.ptVideo) inner.push(`${tr("Video")}: ${ex.ptVideo}`);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(inner.join("\n"), PAGE_W - 2 * M - 8);
      const h = lines.length * 4.1 + 8;
      newPageIfNeeded(h + 4);
      doc.roundedRect(M, y, PAGE_W - 2 * M, h, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...ACC);
      doc.text(tr("NOTE DEL TUO PT"), M + 4, y + 4.6);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...INK);
      doc.text(lines, M + 4, y + 9);
      y += h + 3;
    }
    y += 4;
    line(M, PAGE_W - M); y += 5;
  });

  /* ── piè di pagina su ogni pagina ── */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...DIM);
    doc.text(tr("Generato con Fit Training"), M, PAGE_H - 7);
    doc.text(`${p}/${pages}`, PAGE_W - M, PAGE_H - 7, { align: "right" });
  }

  const fname = `${slug(routine.name)}${clientName ? "-" + slug(clientName) : ""}.pdf`;
  doc.save(fname);
  return fname;
}
