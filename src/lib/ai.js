import { supabase } from "./supabase";

export const featHeaders = async (feature) => {
  const h = { "Content-Type": "application/json" };
  if (feature) {
    const { data: { session } } = await supabase.auth.getSession();
    h["Authorization"] = `Bearer ${session?.access_token || ""}`;
    h["x-gq-feature"] = feature;
  }
  return h;
};
export const aiCall = async (payload, feature) => {
  const r = await fetch("/api/ai", {
    method: "POST", headers: await featHeaders(feature), body: JSON.stringify(payload),
  });
  const txt = await r.text();
  try { return JSON.parse(txt); }
  catch {
    /* il server ha risposto testo (crash/timeout): messaggio leggibile invece di "Unexpected token" */
    throw new Error(`Errore server (${r.status}) — se persiste, verifica il deploy delle API`);
  }
};


/* Ridimensiona la foto lato client prima dell'invio: le foto da smartphone
   (5-12 MB) superano i limiti del serverless ed erano la causa dei fallimenti */
export const resizeImage = (file, maxSide = 1024) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    try {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const dataUrl = c.toDataURL("image/jpeg", 0.85);
      resolve({ b64: dataUrl.split(",")[1], type: "image/jpeg" });
    } catch (e) { reject(e); }
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Immagine non leggibile")); };
  img.src = url;
});

/* I modelli possono troncare il JSON se lo spazio finisce: qui si recupera
   la parte valida chiudendo le parentesi rimaste aperte. */
export const repairJSON = (raw) => {
  const start = raw.indexOf("{");
  if (start < 0) return raw;
  const s = raw.slice(start);
  let inStr = false, esc = false, lastComplete = -1;
  const stack = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") { stack.pop(); lastComplete = i; }
    else if (ch === ",") lastComplete = i - 1;
  }
  if (!stack.length) return s;
  let out = s.slice(0, lastComplete + 1).replace(/,\s*$/, "");
  const st = [];
  let inS = false, es = false;
  for (let i = 0; i < out.length; i++) {
    const ch = out[i];
    if (es) { es = false; continue; }
    if (ch === "\\") { es = true; continue; }
    if (ch === '"') { inS = !inS; continue; }
    if (inS) continue;
    if (ch === "{" || ch === "[") st.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") st.pop();
  }
  while (st.length) out += st.pop();
  return out;
};
export const parseLoose = (text) => {
  const clean = (text || "").replace(/```json|```/g, "");
  const m = clean.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return JSON.parse(repairJSON(clean));
};
