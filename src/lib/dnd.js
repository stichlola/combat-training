/* ---------------- Riordino trascinando (mouse + touch) ---------------- */
/* Il puntatore parte da un handle .drag-handle dentro un contenitore [data-dl];
   onMove(from, to) riordina lo stato mentre trascini. Funziona anche con
   contenitori annidati (serie dentro card): vale il [data-dl] più vicino. */
export function dlStart(ev, onMove) {
  if (ev.pointerType === "mouse" && ev.button !== 0) return;
  const handle = ev.currentTarget;
  const list = handle.closest("[data-dl]");
  if (!list) return;
  let row = handle.parentElement;
  while (row && row.parentElement !== list) row = row.parentElement;
  if (!row) return;
  ev.preventDefault();
  let idx = [...list.children].indexOf(row);
  if (idx < 0) return;
  /* pointer capture: su mobile garantisce che gli eventi seguano il dito
     anche se esce dall'handle; contextmenu: evita che la pressione lunga
     Android interrompa il trascinamento */
  try { handle.setPointerCapture(ev.pointerId); } catch (_) {}
  document.body.classList.add("dragging");
  /* feedback visivo: evidenzia la riga trascinata; dopo ogni riordino React
     ri-renderizza le righe, quindi la classe va riapplicata sulla posizione
     corrente (altrimenti resterebbe attaccata alla riga sbagliata) */
  const paint = () => requestAnimationFrame(() => {
    [...list.children].forEach((c, i) => c.classList.toggle("drag-live", i === idx));
  });
  paint();
  const noMenu = (e) => e.preventDefault();
  window.addEventListener("contextmenu", noMenu, true);

  let lastY = ev.clientY;
  /* Scambio col vicino: un solo spostamento quando il dito supera il punto
     medio della riga sopra/sotto. Stabile: niente oscillazioni né salti. */
  const check = () => {
    const rows = [...list.children];
    if (idx < 0 || idx >= rows.length) return;
    if (idx > 0) {
      const p = rows[idx - 1].getBoundingClientRect();
      if (lastY < p.top + p.height / 2) { onMove(idx, idx - 1); idx--; paint(); return; }
    }
    if (idx < rows.length - 1) {
      const n = rows[idx + 1].getBoundingClientRect();
      if (lastY > n.top + n.height / 2) { onMove(idx, idx + 1); idx++; paint(); }
    }
  };
  const move = (e) => { lastY = e.clientY; check(); };
  /* auto-scroll: trascinando vicino ai bordi la pagina scorre da sola,
     così si può spostare una riga anche oltre la parte visibile */
  const scrollIv = setInterval(() => {
    const M = 90;
    if (lastY < M) window.scrollBy(0, -14);
    else if (lastY > window.innerHeight - M) window.scrollBy(0, 14);
    else return;
    check();
  }, 40);
  const up = () => {
    clearInterval(scrollIv);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    window.removeEventListener("contextmenu", noMenu, true);
    [...list.children].forEach((c) => c.classList.remove("drag-live"));
    document.body.classList.remove("dragging");
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}
