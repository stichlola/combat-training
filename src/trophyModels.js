/* ============================================================
   GYMQUEST — SALA RICOMPENSE
   Trofei collezionabili in 3D (ispirazione: Super Smash Bros.
   Brawl per la trophy room, Jak and Daxter: The Precursor
   Legacy per la lore — leghe antiche, Eco, manufatti Precursor).
   Ogni trofeo è un modello procedurale three.js: nessun asset
   esterno, tutto generato a runtime.
   ============================================================ */
import * as THREE from "three";

/* ---------- helper: texture da canvas ---------- */
function canvasTexture(size, draw) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

/* Disegna testo lungo un arco (per incisioni circolari) */
function arcText(ctx, text, cx, cy, radius, startAngle, endAngle, font, color) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const span = endAngle - startAngle;
  const step = span / Math.max(1, text.length - 1);
  for (let i = 0; i < text.length; i++) {
    const a = startAngle + step * i;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/* Corona d'alloro stilizzata attorno al centro */
function laurel(ctx, cx, cy, radius, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 6;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.75 + side * (i * 0.22);
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + side * 0.9);
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

/* Stella a 5 punte */
function star(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.42;
    ctx[i === 0 ? "moveTo" : "lineTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ---------- materiali metallici riusabili ---------- */
const metal = (color, rough = 0.28, metalness = 0.95) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness });
const GOLD = 0xd4af37, BRONZE = 0xb07845, SILVER = 0xc8ccd4, DARKSTEEL = 0x5a6672;
const ECO_GREEN = 0x39ff88, ECO_CYAN = 0x35e0ff, ECO_AMBER = 0xffb347;

/* ============================================================
   BUILDER DEI MODELLI — ognuno restituisce un THREE.Group
   ============================================================ */

/* Medaglia con faccia incisa (canvas texture), bordo zigrinato,
   anello e nastro. `face` riceve (ctx,size) per il disegno. */
function buildMedal({ ribbon = ["#b03030", "#20385c"], face, metalColor = GOLD, coreGlow = null }) {
  const g = new THREE.Group();

  const faceTex = canvasTexture(1024, face);
  const edgeTex = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = "#8a6d1f";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#6e5514";
    for (let x = 0; x < s; x += 8) ctx.fillRect(x, 0, 3, s);
  });
  edgeTex.wrapS = THREE.RepeatWrapping;
  edgeTex.repeat.set(48, 1);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.16, 72),
    [
      metal(metalColor, 0.35),
      new THREE.MeshStandardMaterial({ map: faceTex, metalness: 0.85, roughness: 0.3 }),
      new THREE.MeshStandardMaterial({ map: faceTex, metalness: 0.85, roughness: 0.3 }),
    ]
  );
  body.material[0].map = edgeTex;
  body.rotation.x = Math.PI / 2; // facce verso ±Z
  g.add(body);

  // bordo in rilievo
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 20, 72), metal(metalColor, 0.22));
  g.add(rim);

  // anello superiore
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 14, 40), metal(metalColor, 0.22));
  loop.position.y = 1.16;
  g.add(loop);

  // nastro
  const ribbonTex = canvasTexture(128, (ctx, s) => {
    const w = s / ribbon.length;
    ribbon.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(i * w, 0, w, s); });
  });
  const rib = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.72, 0.05),
    new THREE.MeshStandardMaterial({ map: ribbonTex, roughness: 0.85, metalness: 0.05 })
  );
  rib.position.y = 1.75;
  g.add(rib);

  if (coreGlow) {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 24, 24),
      new THREE.MeshStandardMaterial({ color: coreGlow, emissive: coreGlow, emissiveIntensity: 2.2 })
    );
    core.position.z = 0.12;
    g.add(core);
    const l = new THREE.PointLight(coreGlow, 6, 3);
    l.position.z = 0.4;
    g.add(l);
  }
  return g;
}

/* Sfera del Precursore: globo scuro con venature d'Eco luminose */
function buildPrecursorOrb({ glow = ECO_GREEN } = {}) {
  const g = new THREE.Group();
  const veins = canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = "#1a1410";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#39ff88";
    ctx.shadowColor = "#39ff88";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 4;
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) {
      ctx.beginPath();
      let x = rnd() * s, y = rnd() * s;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) { x += (rnd() - 0.5) * 140; y += (rnd() - 0.5) * 140; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  });
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 48, 48),
    new THREE.MeshStandardMaterial({ map: veins, emissive: glow, emissiveMap: veins, emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.4 })
  );
  g.add(orb);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.05, 14, 72), metal(0x8a7b52, 0.3));
  ring.rotation.x = Math.PI / 2.4;
  g.add(ring);
  const l = new THREE.PointLight(glow, 8, 5);
  g.add(l);
  return g;
}

/* Cristallo d'Eco: ottaedro luminoso su base di pietra */
function buildEcoCrystal({ glow = ECO_GREEN } = {}) {
  const g = new THREE.Group();
  const cry = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.8, 0),
    new THREE.MeshStandardMaterial({
      color: glow, emissive: glow, emissiveIntensity: 1.4,
      roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.92,
    })
  );
  cry.scale.y = 1.5;
  cry.position.y = 0.7;
  g.add(cry);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.4, 6), metal(0x4a4038, 0.8, 0.2));
  base.position.y = -0.55;
  g.add(base);
  const l = new THREE.PointLight(glow, 10, 6);
  l.position.y = 0.7;
  g.add(l);
  return g;
}

/* Idolo Precursor: totem a sezioni con nucleo luminoso */
function buildPrecursorIdol({ glow = ECO_CYAN } = {}) {
  const g = new THREE.Group();
  const stone = metal(0x6b5d43, 0.55, 0.35);
  const parts = [
    new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.35, 8), stone),
    new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.62, 0.7, 8), stone),
    new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.45, 0.3, 8), stone),
    new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.7, 8), stone),
  ];
  let y = -0.9;
  for (const p of parts) { p.position.y = y + 0.2; y += p.geometry.parameters.height || 0.6; g.add(p); }
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 20, 20),
    new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 2.5 })
  );
  eye.position.y = 0.1;
  eye.position.z = 0.42;
  g.add(eye);
  const l = new THREE.PointLight(glow, 8, 5);
  l.position.set(0, 0.2, 0.8);
  g.add(l);
  return g;
}

/* Colonna Precursor con anello orbitante */
function buildPrecursorPillar({ glow = ECO_AMBER } = {}) {
  const g = new THREE.Group();
  const stone = metal(0x7a6a4a, 0.5, 0.4);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.8, 10), stone);
  g.add(col);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 0.25, 10), stone);
  cap.position.y = 1.0;
  g.add(cap);
  const rune = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.04, 12, 48),
    new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 2 })
  );
  rune.rotation.x = Math.PI / 2;
  rune.position.y = 0.35;
  g.add(rune);
  const top = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22),
    new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 2.2 })
  );
  top.position.y = 1.35;
  g.add(top);
  const l = new THREE.PointLight(glow, 9, 6);
  l.position.y = 1.2;
  g.add(l);
  return g;
}

/* Corona Hyper Lethal: cerchio dentato con gemma d'Eco */
function buildHyperCrown({ glow = 0xff4fd8 } = {}) {
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.35, 24, 1, true), metal(GOLD, 0.25));
  g.add(band);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), metal(GOLD, 0.25));
    spike.position.set(Math.cos(a) * 0.88, 0.4, Math.sin(a) * 0.88);
    g.add(spike);
  }
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22),
    new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 2.4 })
  );
  gem.position.set(0, 0.05, 0.95);
  g.add(gem);
  const l = new THREE.PointLight(glow, 8, 5);
  l.position.z = 1.2;
  g.add(l);
  return g;
}

/* Manubrio / kettlebell / martello / disco: trofei "palestra" */
function buildDumbbell({ color = BRONZE } = {}) {
  const g = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.9, 20), metal(DARKSTEEL, 0.35));
  bar.rotation.z = Math.PI / 2;
  g.add(bar);
  for (const sx of [-1, 1]) {
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.22, 28), metal(color, 0.35));
    p1.rotation.z = Math.PI / 2;
    p1.position.x = sx * 0.72;
    const p2 = p1.clone();
    p2.position.x = sx * 0.92;
    p2.scale.setScalar(0.78);
    g.add(p1, p2);
  }
  return g;
}
function buildKettlebell({ color = DARKSTEEL, glow = null } = {}) {
  const g = new THREE.Group();
  const bodyM = new THREE.Mesh(new THREE.SphereGeometry(0.72, 36, 36), metal(color, 0.4));
  bodyM.scale.y = 0.95;
  bodyM.position.y = -0.15;
  g.add(bodyM);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 14, 40, Math.PI), metal(color, 0.35));
  handle.position.y = 0.55;
  g.add(handle);
  if (glow) {
    const sig = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.035, 10, 40),
      new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 2 })
    );
    sig.position.set(0, -0.15, 0.62);
    g.add(sig);
    const l = new THREE.PointLight(glow, 6, 4);
    l.position.z = 1;
    g.add(l);
  }
  return g;
}
function buildHammer({ glow = ECO_CYAN } = {}) {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.5, 0.5), metal(SILVER, 0.3));
  head.position.y = 0.75;
  g.add(head);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.5, 16), metal(0x4a3826, 0.7, 0.1));
  g.add(handle);
  for (const sx of [-1, 1]) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.1, 20),
      new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 1.8 })
    );
    cap.rotation.z = Math.PI / 2;
    cap.position.set(sx * 0.6, 0.75, 0);
    g.add(cap);
  }
  const l = new THREE.PointLight(glow, 7, 5);
  l.position.y = 0.75;
  g.add(l);
  return g;
}
function buildPlate({ color = GOLD } = {}) {
  const g = new THREE.Group();
  const tex = canvasTexture(1024, (ctx, s) => {
    const c = s / 2;
    const grad = ctx.createRadialGradient(c, c, 60, c, c, c);
    grad.addColorStop(0, "#f5d676");
    grad.addColorStop(0.7, "#c39a2e");
    grad.addColorStop(1, "#8a6d1f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#6e5514";
    ctx.font = `900 ${s * 0.34}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("100", c, c - 20);
    ctx.font = `700 ${s * 0.07}px Arial`;
    ctx.fillText("KG", c, c + s * 0.18);
  });
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.14, 64),
    [metal(color, 0.35),
      new THREE.MeshStandardMaterial({ map: tex, metalness: 0.8, roughness: 0.32 }),
      new THREE.MeshStandardMaterial({ map: tex, metalness: 0.8, roughness: 0.32 })]
  );
  disc.rotation.x = Math.PI / 2;
  g.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 16, 64), metal(color, 0.25));
  g.add(rim);
  return g;
}
function buildODSTHelm({ glow = ECO_CYAN } = {}) {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.8, 36, 36, 0, Math.PI * 2, 0, Math.PI * 0.75), metal(0x39424c, 0.4));
  g.add(dome);
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 32, 32, -Math.PI / 4.5, Math.PI / 2.2, Math.PI * 0.22, Math.PI * 0.3),
    new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 1.2, roughness: 0.1, metalness: 0.6 })
  );
  g.add(visor);
  const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.4, 24), metal(0x39424c, 0.4));
  jaw.position.y = -0.35;
  g.add(jaw);
  const l = new THREE.PointLight(glow, 6, 4);
  l.position.z = 1.2;
  g.add(l);
  return g;
}
function buildStarBadge({ glow = ECO_AMBER } = {}) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 1 : 0.45;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  shape.closePath();
  const starM = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06 }),
    metal(GOLD, 0.25)
  );
  starM.position.z = -0.11;
  g.add(starM);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 20, 20),
    new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 2.2 })
  );
  core.position.z = 0.22;
  g.add(core);
  const l = new THREE.PointLight(glow, 6, 4);
  l.position.z = 0.8;
  g.add(l);
  return g;
}

/* ============================================================
   FACCIATA DELLA MEDAGLIA DEL RECLUTAMENTO (dettagliata)
   ============================================================ */
function drawRecruitFace(ctx, s) {
  const c = s / 2;
  // fondo oro con raggi
  const grad = ctx.createRadialGradient(c, c, 40, c, c, c);
  grad.addColorStop(0, "#f8e08a");
  grad.addColorStop(0.55, "#d9b345");
  grad.addColorStop(1, "#96751c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
  // raggi solari dal centro
  ctx.save();
  ctx.translate(c, c);
  ctx.fillStyle = "rgba(255,240,180,0.25)";
  for (let i = 0; i < 24; i++) {
    ctx.rotate(Math.PI / 12);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(c, -18);
    ctx.lineTo(c, 18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // anelli incisi
  ctx.strokeStyle = "rgba(110,85,20,0.9)";
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(c, c, c * 0.86, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(c, c, c * 0.62, 0, Math.PI * 2); ctx.stroke();
  // nome dell'app lungo l'arco superiore
  arcText(ctx, "COMBAT TRAINING", c, c, c * 0.74, -Math.PI * 0.82, -Math.PI * 0.18,
    `900 ${s * 0.048}px Arial`, "#5e4a10");
  // motto lungo l'arco inferiore
  arcText(ctx, "· PRECURSOR LEGACY ·", c, c, c * 0.74, Math.PI * 0.85, Math.PI * 0.15,
    `700 ${s * 0.052}px Arial`, "#5e4a10");
  // alloro
  laurel(ctx, c, c + 30, c * 0.5, "rgba(94,74,16,0.95)");
  // stella centrale
  star(ctx, c, c, c * 0.26, "#5e4a10");
  star(ctx, c, c, c * 0.19, "#f8e08a");
}


/* Scouter tattico (modello di riferimento del committente):
   unità auricolare massiccia verde militare con prese d'aria e viti,
   braccio snodato, grande lente rossa traslucida con HUD arancione. */
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/* Texture HUD arancione per la lente (stile display tattico) */
function scouterHudTexture() {
  return canvasTexture(1024, (ctx, s) => {
    const W = 1024, H = 620;
    ctx.clearRect(0, 0, W, H);
    const O = "#ff8a2a";
    ctx.strokeStyle = O;
    ctx.fillStyle = O;
    ctx.shadowColor = O;
    ctx.shadowBlur = 14;
    // staffe angolari
    ctx.lineWidth = 10;
    const B = 60, L = 90;
    for (const [cx, cy, sx, sy] of [[B, B, 1, 1], [W - B, B, -1, 1], [B, H - B, 1, -1], [W - B, H - B, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * L, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * L);
      ctx.stroke();
    }
    // reticolo centrale: cerchio + crociera
    const cx = 400, cy = 300;
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(cx, cy, 95, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 140, cy); ctx.lineTo(cx - 105, cy);
    ctx.moveTo(cx + 105, cy); ctx.lineTo(cx + 140, cy);
    ctx.moveTo(cx, cy - 140); ctx.lineTo(cx, cy - 105);
    ctx.moveTo(cx, cy + 105); ctx.lineTo(cx, cy + 140);
    ctx.stroke();
    // frecce che puntano al reticolo
    const tri = (x, y, a) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(20, 14); ctx.lineTo(-20, 14); ctx.closePath(); ctx.fill();
      ctx.restore();
    };
    tri(cx, cy - 165, 0); tri(cx, cy + 165, Math.PI);
    tri(cx - 165, cy, -Math.PI / 2); tri(cx + 165, cy, Math.PI / 2);
    // grafico a barre (destra)
    const bars = [70, 120, 95, 160, 135, 200, 110];
    bars.forEach((h, i) => ctx.fillRect(650 + i * 42, 420 - h, 30, h));
    ctx.lineWidth = 5;
    ctx.strokeRect(640, 190, 310, 240);
    // secondo grafico (basso-sinistra)
    [50, 90, 65, 110, 80].forEach((h, i) => ctx.fillRect(90 + i * 38, 560 - h, 26, h));
    // marcatori testo
    ctx.font = "700 30px monospace";
    ctx.fillText("PWR", 660, 160);
    ctx.font = "600 24px monospace";
    ctx.fillText("◈ COMBAT TRAINING · PROPERTY OF D.S.", 90, 80);
  });
}

function buildScouter() {
  const g = new THREE.Group();
  const olive = metal(0x4d5545, 0.5, 0.45);      // verde militare
  const dark = metal(0x23282c, 0.45, 0.6);       // parti scure

  // --- unità auricolare: blocco arrotondato massiccio ---
  const earGeo = new THREE.ExtrudeGeometry(roundedRectShape(1.05, 1.5, 0.3),
    { depth: 0.42, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 3 });
  const ear = new THREE.Mesh(earGeo, olive);
  ear.position.set(0.72, 0, -0.21);
  g.add(ear);
  // imbottitura interna
  const pad = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRectShape(0.8, 1.25, 0.28),
    { depth: 0.08, bevelEnabled: false }), dark);
  pad.position.set(0.72, 0, -0.28);
  g.add(pad);
  // prese d'aria sul fianco
  for (let i = 0; i < 5; i++) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.72, 0.06), dark);
    vent.position.set(0.44 + i * 0.14, -0.1, 0.27);
    g.add(vent);
  }
  // viti agli angoli
  for (const [vx, vy] of [[0.32, 0.58], [1.12, 0.58], [0.32, -0.58], [1.12, -0.58]]) {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12), dark);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(vx, vy, 0.28);
    g.add(screw);
  }
  // fascia sopra la testa (arco che parte dall'unità auricolare)
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.09, 14, 48, Math.PI), dark);
  band.position.set(0.42, 0.62, 0);
  g.add(band);
  // --- braccio snodato verso la lente ---
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 20), dark);
  hinge.rotation.x = Math.PI / 2;
  hinge.position.set(0.28, -0.45, 0.3);
  g.add(hinge);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.14), olive);
  arm.position.set(-0.05, -0.45, 0.32);
  g.add(arm);
  // --- grande lente rossa traslucida ---
  const lensGeo = new THREE.ExtrudeGeometry(roundedRectShape(1.85, 1.12, 0.18),
    { depth: 0.05, bevelEnabled: false });
  const glass = new THREE.Mesh(lensGeo, new THREE.MeshStandardMaterial({
    color: 0xff2a12, transparent: true, opacity: 0.32, roughness: 0.12, metalness: 0.1,
    emissive: 0xcc1800, emissiveIntensity: 0.35, side: THREE.DoubleSide,
  }));
  glass.position.set(-0.75, -0.42, 0.34);
  g.add(glass);
  // cornice inferiore della lente
  const lip = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.12, 0.14), olive);
  lip.position.set(-0.75, -1.04, 0.36);
  g.add(lip);
  // display HUD arancione sulla lente
  const hudMat = new THREE.MeshBasicMaterial({ map: scouterHudTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const hud = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.03), hudMat);
  hud.position.set(-0.75, -0.42, 0.42);
  g.add(hud);
  // luce arancione del display
  const l = new THREE.PointLight(0xff6a1a, 7, 4);
  l.position.set(-0.75, -0.4, 0.9);
  g.add(l);
  return g;
}

/* Mappa id modello → builder (importata dal visore lazy).
   "medal" è la medaglia d'oro mostrata nella sezione MEDAGLIE. */
export const MODEL_BUILDERS = {
  medal: () => buildMedal({ face: drawRecruitFace, metalColor: GOLD, coreGlow: ECO_GREEN }),
  scouter: () => buildScouter(),
  firstw: () => buildDumbbell({ color: BRONZE }),
  orb5: () => buildPrecursorOrb({ glow: ECO_GREEN }),
  crystal10: () => buildEcoCrystal({ glow: ECO_GREEN }),
  w50: () => buildKettlebell({ color: DARKSTEEL, glow: ECO_CYAN }),
  idol15: () => buildPrecursorIdol({ glow: ECO_CYAN }),
  bench100: () => buildPlate({ color: GOLD }),
  odst600: () => buildODSTHelm({ glow: ECO_CYAN }),
  pillar20: () => buildPrecursorPillar({ glow: ECO_AMBER }),
  q50: () => buildStarBadge({ glow: ECO_AMBER }),
  mjolnir: () => buildHammer({ glow: ECO_CYAN }),
  crown25: () => buildHyperCrown({ glow: 0xff4fd8 }),
};
