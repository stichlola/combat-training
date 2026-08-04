import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./lib/supabase";
import {
  Dumbbell, Flame, Plus, ChevronRight, ChevronDown, Play, Trash2, Bot, Upload, FileText, Trophy, Utensils, X, Loader2, Search, User, LogOut, Lock, Mail, Eye, EyeOff, Ruler, Save, Pencil, Info, Medal, Gamepad2, GripVertical, Target, Users, Swords, Square, CreditCard
} from "lucide-react";
import GameTab from "./GameTab";
import { TROPHIES, RARITY, unlockedTrophies } from "./trophies";
import { aiCall, featHeaders, parseLoose, resizeImage } from "./lib/ai";
import { DocImport } from "./components/DocImport";
import { ExerciseInfoModal } from "./components/ExerciseInfoModal";
import { RoutineEditor } from "./components/RoutineEditor";
import { SessionView } from "./components/SessionView";
import { TrainerView, TrainerProfile } from "./components/TrainerView";
import { PtRequestCard, PtRequestsAdmin } from "./components/PtRequest";
import { captureInviteHash, clearInvite, fetchMyRole, fetchMyTrainer, isAdminUser, linkToTrainer, pendingInvite, saveMyFullName, syncMyUsername, unlinkMyTrainer } from "./lib/trainer";
import { dlStart } from "./lib/dnd";
import { applyProgression, todayISO } from "./lib/progression";
import { ALL_EXERCISES, EXERCISE_DB, GROUPS, findGroup, matchToDb } from "./lib/exercises";
import { ACHIEVEMENTS, BASE_FACTS, DEFAULT_PRS, DEFAULT_ROUTINES, EMPTY_STATS, LEVEL_TITLES, QUEST_METRICS, QUEST_POOL_DAILY, QUEST_POOL_WEEKLY, dayKey, freshQuests, weekKey, xpForLevel } from "./lib/game";
import { LANG_OPTS, setLangGlobal, tr } from "./lib/i18n";

/* Le due "versioni" dell'app: stessa struttura, con o senza gamification */
const UI_MODES = [
  { id: "combat", label: "Combat Training", flag: "⚔", Icon: Swords,
    desc: "Esperienza gamificata: livelli, XP, sfide e ricompense — grafica HUD da gioco" },
  { id: "standard", label: "Standard", flag: "◻", Icon: Square,
    desc: "Interfaccia pulita e minimale, stessa struttura senza gamification — grafica chiara in toni neutri stile Material" },
];
import { Btn, CSS, HudToast, Overlay, Panel, QBar, ShieldBar } from "./ui";
const Trophy3D = React.lazy(() => import("./Trophy3D"));   // three.js caricato solo quando serve

/* ================================== APP ================================== */

function BootScreen({ progress, fact }) {
  return (
    <div className="hud-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="fade-in" style={{ width: "min(420px, 86vw)", textAlign: "center" }}>
        <Dumbbell size={34} color="var(--cyan)" style={{ margin: "0 auto 10px", filter: "drop-shadow(0 0 8px rgba(87,200,242,.6))" }} />
        <div className="f-hud t-cyan" style={{ fontSize: 24, fontWeight: 700, letterSpacing: ".35em" }}>COMBAT TRAINING</div>
        <div className="micro" style={{ marginTop: 4, marginBottom: 26 }}>{tr("INIZIALIZZAZIONE SISTEMA")}</div>

        {/* barra segmentata stile scudo */}
        <div className="row g6" style={{ justifyContent: "center" }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="seg" style={{
              width: 22, flex: "none",
              background: progress * 14 > i ? "linear-gradient(180deg,var(--cyan-hi),var(--cyan))" : "var(--soft)",
              boxShadow: progress * 14 > i ? "0 0 6px rgba(87,200,242,.6)" : "none",
              transition: "background .2s",
            }} />
          ))}
        </div>
        <div className="micro t-cyan" style={{ marginTop: 8 }}>{Math.round(progress * 100)}%</div>

        <div className="tiny t-dim" style={{ marginTop: 30, minHeight: 40, lineHeight: 1.6, padding: "0 10px" }}>
          <span className="t-amber f-hud" style={{ fontSize: 9, letterSpacing: ".25em" }}>{tr("INTEL ▸")} </span>
          {tr(fact)}
        </div>
      </div>
    </div>
  );
}

/* Fun fact mensili: rigenerati con l'AI (Haiku) una volta al mese e cachati in locale */
function useBootFacts() {
  const [facts, setFacts] = useState(BASE_FACTS);
  useEffect(() => {
    const key = "gq_facts_" + new Date().toISOString().slice(0, 7); // es. gq_facts_2026-07
    try {
      const cached = localStorage.getItem(key);
      if (cached) { setFacts(JSON.parse(cached)); return; }
    } catch {}
    (async () => {
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1200,
            messages: [{
              role: "user",
              content: `Genera 25 "fun fact" brevi e utili sull'allenamento in palestra, nutrizione sportiva e recupero, in italiano. Ognuno massimo 130 caratteri, basato su evidenze, tono diretto. Rispondi SOLO con un array JSON di stringhe, senza markdown né testo extra.`,
            }],
          }),
        });
        const data = await res.json();
        const txt = (data.content || []).map((c) => c.text || "").join("");
        const arr = JSON.parse(txt.replace(/```json|```/g, "").trim());
        if (Array.isArray(arr) && arr.length >= 10) {
          setFacts(arr);
          try { localStorage.setItem(key, JSON.stringify(arr)); } catch {}
        }
      } catch {} /* offline o errore: restano i fact di base */
    })();
  }, []);
  return facts;
}



/* ================================ STORE (premium + crediti) ================================ */

/* ---------------- Popup Quest + Achievements ---------------- */
/* Lore mostrata nel visore 3D delle medaglie (sezione MEDAGLIE) */
const MEDAL_3D_LORE = "Medaglia d'oro antico con il sigillo di COMBAT TRAINING inciso ad arco, corona d'alloro e stella centrale. Al cuore pulsa un frammento d'Eco verde: si dice si risvegli a ogni passo del portatore. Non è una ricompensa — è un giuramento.";

function QuestModal({ quests, stats, prs, level, streak, onClose }) {
  const [tab, setTab] = useState("daily");
  const [selTrophy, setSelTrophy] = useState(null);   // ricompensa o medaglia aperta nel visore 3D
  const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
  const hLeft = Math.max(0, Math.round((midnight - new Date()) / 3600000));
  const achieved = ACHIEVEMENTS.filter((a) => a.check(stats, prs, level));
  const list = tab === "daily" ? quests.daily : quests.weekly;
  return (
    <Overlay>
    <div className="modal-back" onClick={onClose}>
      <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <div className="f-hud t-amber" style={{ fontWeight: 700, letterSpacing: ".2em", fontSize: 14 }}>{tr("◈ SFIDE")}</div>
          <span onClick={onClose} className="tap t-faint" style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0" }}>✕</span>
        </div>
        <div className="row g6 tiny t-faint" style={{ marginTop: 2, marginBottom: 14, alignItems: "center" }}>
          <Flame size={12} color="#ffd76a" /> STREAK {streak} GIORNI
        </div>

        <div className="row g6" style={{ marginBottom: 14 }}>
          {[["daily", "GIORNALIERE"], ["weekly", "SETTIMANALI"], ["ach", "MEDAGLIE"], ["troph", "RICOMPENSE"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`tap cham-s chip ${tab === k ? "chip-on" : ""}`}
              style={{ cursor: "pointer", flex: 1, textAlign: "center", padding: "8px 0", fontSize: 10 }}>
              {l}
            </button>
          ))}
        </div>

        {tab !== "ach" && tab !== "troph" && (
          <>
            <div className="micro t-faint" style={{ marginBottom: 10 }}>
              {tab === "daily" ? `SI RINNOVANO TRA ~${hLeft}H` : "SI RINNOVANO OGNI SETTIMANA"}
            </div>
            <div className="stack-s">
              {list.map((q, i) => (
                <div key={i} className="cham-s" style={{ padding: "10px 12px", background: "var(--card2)", border: `1px solid ${q.done ? "#ffd76a" : "var(--soft)"}` }}>
                  <div className="row between g8">
                    <span className={q.done ? "t-amber" : "t-bright"} style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>
                      {q.done && "✓ "}{tr(q.text)}
                    </span>
                    <span className="f-hud t-amber" style={{ fontSize: 12, fontWeight: 700, flexShrink: 0 }}>+{q.xp} XP</span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <QBar pct={q.prog / q.target} done={q.done} />
                  </div>
                  <div className="micro t-faint" style={{ marginTop: 4, textAlign: "right" }}>
                    {q.metric === "volume" ? `${q.prog.toLocaleString()} / ${q.target.toLocaleString()} KG`
                      : q.metric === "cardio" ? `${q.prog} / ${q.target} MIN`
                      : `${q.prog} / ${q.target}`}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "ach" && (
          <>
            <div className="micro t-faint" style={{ marginBottom: 10 }}>{achieved.length} / {ACHIEVEMENTS.length} SBLOCCATE</div>
            <div className="stack-s">
              {ACHIEVEMENTS.map((a) => {
                const ok = achieved.includes(a);
                const view3d = ok && a.model; // medaglia ammirabile in 3D (per ora solo la più facile)
                return (
                  <div key={a.id} className="cham-s row g12"
                    onClick={() => view3d && setSelTrophy({ name: a.name, rarity: a.tier === "hard" ? "epico" : "comune", model: a.model, lore: MEDAL_3D_LORE, how: a.desc })}
                    style={{
                    padding: "10px 12px", background: "var(--card2)", alignItems: "center",
                    border: `1px solid ${ok ? "#ffd76a" : "var(--soft)"}`, opacity: ok ? 1 : 0.55,
                    cursor: view3d ? "pointer" : "default",
                  }}>
                    <Medal size={20} color={ok ? "#ffd76a" : "#2a4a63"} style={{ flexShrink: 0 }} />
                    <div className="grow">
                      <div className={ok ? "t-amber" : "t-dim"} style={{ fontSize: 13, fontWeight: 700 }}>{tr(a.name)}</div>
                      <div className="tiny t-faint">{tr(a.desc)}</div>
                    </div>
                    {view3d && (
                      <span className="micro cham-s" style={{ padding: "2px 7px", flexShrink: 0, border: "1px solid #b8860b", color: "#ffd76a" }}>3D</span>
                    )}
                    <span className="micro cham-s" style={{
                      padding: "2px 7px", flexShrink: 0,
                      border: `1px solid ${a.tier === "hard" ? "#c05a8e" : "#2a5f7d"}`,
                      color: a.tier === "hard" ? "#e58ab5" : "#6fb3d4",
                    }}>{a.tier === "hard" ? "DIFFICILE" : "FACILE"}</span>
                  </div>
                );
              })}
              {achieved.some((a) => a.model) && (
                <div className="micro t-faint" style={{ marginTop: 10, textAlign: "center" }}>
                  TOCCA LA MEDAGLIA PER AMMIRARLA IN 3D
                </div>
              )}
            </div>
          </>
        )}

        {tab === "troph" && (() => {
          const got = unlockedTrophies(stats, prs, level).map((t) => t.id);
          return (
            <>
              <div className="micro t-faint" style={{ marginBottom: 10 }}>
                {got.length} / {TROPHIES.length} NELLA SALA RICOMPENSE
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {TROPHIES.map((t) => {
                  const ok = got.includes(t.id);
                  const r = RARITY[t.rarity];
                  return (
                    <div key={t.id} className="tap cham-s"
                      onClick={() => ok && setSelTrophy(t)}
                      style={{
                        padding: "12px 6px", background: "var(--card2)", textAlign: "center",
                        border: `1px solid ${ok ? r.border : "var(--soft)"}`,
                        cursor: ok ? "pointer" : "default", opacity: ok ? 1 : 0.6,
                      }}>
                      <Trophy size={26} color={ok ? r.color : "#1d3448"}
                        style={{ filter: ok ? `drop-shadow(0 0 6px ${r.color}66)` : "none" }} />
                      <div className={ok || (stats.hints || []).includes(t.id) ? "t-bright" : "t-faint"}
                        style={{ fontSize: ok ? 10 : ((stats.hints || []).includes(t.id) ? 8.5 : 10), fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>
                        {/* sbloccato → nome; indizio trovato col radar → indizio al posto di "???" */}
                        {ok ? t.name : (stats.hints || []).includes(t.id) ? t.how : "???"}
                      </div>
                      <div className="micro" style={{ color: ok || (stats.hints || []).includes(t.id) ? r.color : "#1d3448", marginTop: 3, fontSize: 8 }}>
                        {ok ? r.label : (stats.hints || []).includes(t.id) ? "INDIZIO TROVATO" : "BLOCCATO"}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="micro t-faint" style={{ marginTop: 10, textAlign: "center" }}>
                TOCCA UNA RICOMPENSA PER AMMIRARLA IN 3D
              </div>
            </>
          );
        })()}

        {/* -------- Visore 3D della ricompensa -------- */}
        {selTrophy && (
          <div className="modal-back" onClick={() => setSelTrophy(null)} style={{ zIndex: 60 }}>
            <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "min(980px, 96vw)", width: "96vw", maxHeight: "96vh", overflow: "hidden", display: "flex", flexDirection: "column", padding: "22px 24px" }}>
              <div className="row between">
                <div className="f-hud" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 13, color: RARITY[selTrophy.rarity].color }}>
                  {selTrophy.name.toUpperCase()}
                </div>
                <span onClick={() => setSelTrophy(null)} className="tap t-faint"
                  style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0" }}>✕</span>
              </div>
              <span className="micro cham-s" style={{
                display: "inline-block", padding: "2px 8px", marginTop: 6,
                border: `1px solid ${RARITY[selTrophy.rarity].border}`, color: RARITY[selTrophy.rarity].color,
              }}>{RARITY[selTrophy.rarity].label}</span>

              <div className="cham-s" style={{ height: "min(400px, 42vh)", flexShrink: 0, marginTop: 12, background: "radial-gradient(ellipse at center, #0b1c2c 0%, var(--card2) 70%)", border: "1px solid var(--soft)", overflow: "hidden" }}>
                <React.Suspense fallback={<div className="row" style={{ justifyContent: "center", height: "100%", alignItems: "center" }}><Loader2 className="spin" size={22} color="var(--cyan)" /></div>}>
                  <Trophy3D model={selTrophy.model} glow={RARITY[selTrophy.rarity].color} />
                </React.Suspense>
              </div>
              <div className="micro t-faint" style={{ textAlign: "center", marginTop: 6, letterSpacing: ".15em" }}>
                ⟲ TRASCINA PER RUOTARE
              </div>

              <div className="cham-s" style={{ marginTop: 10, padding: "12px 14px", background: "var(--card2)", border: "1px solid var(--soft)", height: "min(200px, 26vh)", flexShrink: 0, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#1f6f9e transparent" }}>
                <div className="f-hud t-amber" style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".2em", marginBottom: 6 }}>◈ ARCHIVIO DEI PRECURSORI</div>
                <div className="t-dim" style={{ fontSize: 13, lineHeight: 1.7, fontStyle: "italic" }}>{selTrophy.lore}</div>
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed var(--soft)" }}>
                  <span className="micro t-faint">COME SI SBLOCCA · </span>
                  <span className="micro t-bright">{selTrophy.how}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </Overlay>
  );
}

function StoreModal({ premium, isGuest, onClose, onUnlocked, onCredits, fireToast, initialCode }) {
  const [code, setCode] = useState(initialCode || null); // codice emesso per acquisto senza account
  const [redeem, setRedeem] = useState("");
  const [redeemMsg, setRedeemMsg] = useState(null);
  const doRedeem = async () => {
    setRedeemMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ code: redeem }),
      });
      const d = await r.json();
      if (d.premium_until) { fireToast({ title: tr("◈ PREMIUM ATTIVO") }); onUnlocked(d.premium_until); }
      else if (d.credits != null) { fireToast({ title: tr("◈ CREDITI AGGIUNTI"), sub: `${d.credits}` }); onCredits && onCredits(d.credits); onClose(); }
      else setRedeemMsg(d.error === "code_not_found" ? tr("Codice non valido")
        : d.error === "code_already_used" ? tr("Codice già utilizzato") : (d.error || "Errore"));
    } catch (e) { setRedeemMsg(e.message || "Errore"); }
  };
  const [err, setErr] = useState(null);
  const [usage, setUsage] = useState(null);
  const [product, setProduct] = useState(premium.is ? "pack30" : "premium");
  const ppRef = useRef(null);
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  const [stripeLoading, setStripeLoading] = useState(false);

  /* Stripe Checkout: crea la sessione lato server e reindirizza alla pagina Stripe;
     al rientro (?stripe_session=...) la verifica/avvenuto accredito è gestito a livello App */
  const payStripe = async () => {
    setErr(null); setStripeLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch("/api/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ action: "checkout", product }),
      });
      const d = await r.json();
      if (d.url) { window.location.href = d.url; return; }
      setErr(d.detail ? `${d.error}: ${d.detail}` : (d.error || tr("Errore Stripe, riprova.")));
    } catch { setErr(tr("Errore Stripe, riprova.")); }
    setStripeLoading(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const r = await fetch("/api/usage", { headers: { Authorization: `Bearer ${session?.access_token || ""}` } });
        if (r.ok) setUsage(await r.json());
      } catch {}
    })();
  }, []);

  /* i bottoni PayPal vengono ri-renderizzati quando cambia il prodotto scelto */
  useEffect(() => {
    if (!clientId) return;
    const render = () => {
      if (!window.paypal || !ppRef.current) return;
      ppRef.current.innerHTML = "";
      window.paypal.Buttons({
        style: { layout: "horizontal", color: "blue", height: 42, tagline: false },
        createOrder: async () => {
          const r = await fetch("/api/paypal", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create", product }),
          });
          const d = await r.json();
          if (!d.id) throw new Error(d.error || "Errore creazione ordine");
          return d.id;
        },
        onApprove: async (data) => {
          const { data: { session } } = await supabase.auth.getSession();
          const r = await fetch("/api/paypal", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
            body: JSON.stringify({ action: "capture", orderID: data.orderID }),
          });
          const d = await r.json();
          if (d.premium_until) {
            fireToast({ title: tr("◈ PREMIUM ATTIVO"), sub: tr("Benvenuto tra gli Spartan") });
            onUnlocked(d.premium_until); onClose();
          } else if (d.code) {
            setCode(d.code);   // acquisto senza account: mostra il codice da riscattare
          } else if (d.credits != null) {
            fireToast({ title: tr("◈ CREDITI AGGIUNTI"), sub: `Saldo: ${d.credits} crediti` });
            if (onCredits) onCredits(d.credits);
            setUsage((u) => u ? { ...u, credits: d.credits } : u);
          } else setErr(d.error || "Pagamento non confermato");
        },
        onError: () => setErr("Errore PayPal, riprova."),
      }).render(ppRef.current);
    };
    if (window.paypal) { render(); return; }
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR&intent=capture`;
    s.onload = render;
    s.onerror = () => setErr("Impossibile caricare PayPal");
    document.body.appendChild(s);
  }, [clientId, product]);

  const Card = ({ id, title, price, lines, gold }) => (
    <button onClick={() => setProduct(id)} className="tap cham-s" style={{
      width: "100%", textAlign: "left", cursor: "pointer", padding: "12px 14px",
      background: product === id ? "var(--active)" : "var(--card2)",
      border: `1px solid ${product === id ? (gold ? "#ffd76a" : "var(--cyan)") : "var(--soft)"}`,
    }}>
      <div className="row between">
        <span className={gold ? "t-amber" : "t-cyan"} style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
        <span className="f-hud t-bright" style={{ fontSize: 16, fontWeight: 700 }}>{price}</span>
      </div>
      <div className="tiny t-dim" style={{ marginTop: 3, lineHeight: 1.5 }}>{lines}</div>
    </button>
  );

  return (
    <Overlay>
    <div className="modal-back" onClick={onClose}>
      <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <div className="f-hud t-amber" style={{ fontWeight: 700, letterSpacing: ".2em", fontSize: 14 }}>{tr("◈ STORE")}</div>
          <span onClick={onClose} className="tap t-faint" style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0" }}>✕</span>
        </div>

        {usage && (
          <div className="cham-s micro" style={{ margin: "12px 0", padding: "8px 10px", background: "var(--card)", border: "1px solid var(--soft)", lineHeight: 1.8 }}>
            {tr("QUESTA SETTIMANA")} — {tr("SCHEDA AI")}: {usage.used.workout}/{usage.limits.workout}
            {" · "}{tr("IMPORT PT")}: {usage.used.import}/{usage.limits.import}
            {" · "}{tr("NUTRIZIONE")}: {usage.used.nutrition}/{usage.limits.nutrition}
            {" · "}{tr("SCAN")}: {usage.used.scan}/{usage.limits.scan}
            <br />{tr("CREDITI EXTRA:")} <span className="t-amber">{usage.credits}</span>
            <span className="t-faint"> ({tr("1 credito = 1 generazione")})</span>
          </div>
        )}

        <div className="stack-s" style={{ margin: "12px 0 16px" }}>
          {!premium.is && (
            <Card id="premium" gold title={tr("◆ Premium — 12 mesi")} price="20€"
              lines="Import scheda PT, nutrizione AI e scan macchinari con limiti settimanali ampi" />
          )}
          <Card id="pack30" title={tr("Pacchetto 30 crediti")} price="3€"
            lines="Una tantum · generazioni extra oltre il limite settimanale" />
          <Card id="pack100" title={tr("Pacchetto 100 crediti")} price="8€"
            lines="Una tantum · il più conveniente per chi genera tanto" />
        </div>

        {clientId ? (
          <div ref={ppRef} style={{ minHeight: 46 }} />
        ) : (
          <div className="tiny t-red" style={{ textAlign: "center" }}>{tr("⚠ VITE_PAYPAL_CLIENT_ID non configurato")}</div>
        )}

        {/* Stripe Checkout: alternativa a PayPal (carta, Apple Pay, Google Pay) */}
        <div className="row" style={{ alignItems: "center", gap: 10, margin: "10px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--soft)" }} />
          <span className="micro t-faint">{tr("OPPURE")}</span>
          <div style={{ flex: 1, height: 1, background: "var(--soft)" }} />
        </div>
        <Btn full onClick={payStripe} disabled={stripeLoading}>
          {stripeLoading
            ? <Loader2 size={13} className="spin" style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />
            : <CreditCard size={13} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />}
          {tr("Paga con carta — Stripe")}
        </Btn>
        {code && (
          <Panel accent style={{ borderColor: "#ffd76a", marginTop: 12 }}>
            <div className="f-hud t-amber" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 12 }}>{tr("PAGAMENTO RICEVUTO")}</div>
            <div className="tiny t-dim" style={{ marginTop: 6, lineHeight: 1.6 }}>
              {tr("Conserva questo codice: crea un account quando vuoi e riscattalo dal profilo per attivare l'acquisto.")}
            </div>
            <div className="f-hud t-bright cham-s" style={{ marginTop: 10, padding: "12px 10px", background: "var(--card)",
              border: "1px solid #ffd76a", textAlign: "center", fontSize: 20, fontWeight: 700, letterSpacing: ".12em" }}>
              {code}
            </div>
            <Btn small full style={{ marginTop: 8 }}
              onClick={() => { try { navigator.clipboard.writeText(code); fireToast({ title: tr("◈ CODICE COPIATO") }); } catch {} }}>
              {tr("Copia codice")}
            </Btn>
          </Panel>
        )}

        {!isGuest && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--soft)" }}>
            <div className="hud-label" style={{ marginBottom: 6 }}>{tr("Hai un codice di riscatto?")}</div>
            <div className="row g8">
              <input className="hud-input cham-s" value={redeem} onChange={(e) => setRedeem(e.target.value)}
                placeholder="XXXX-XXXX-XXXX" style={{ flex: 1, textAlign: "center", letterSpacing: ".1em" }} />
              <Btn small primary onClick={doRedeem} disabled={!redeem.trim()}>{tr("Riscatta")}</Btn>
            </div>
            {redeemMsg && <div className="tiny t-red" style={{ marginTop: 6 }}>⚠ {redeemMsg}</div>}
          </div>
        )}

        {err && <div className="tiny t-red" style={{ marginTop: 8, textAlign: "center" }}>⚠ {err}</div>}
        <div className="micro t-faint" style={{ marginTop: 12, textAlign: "center", lineHeight: 1.6 }}>
          PAGAMENTI SICURI PAYPAL E STRIPE · I CREDITI NON SCADONO · I LIMITI SETTIMANALI SI AZZERANO OGNI LUNEDÌ
        </div>
      </div>
    </div>
    </Overlay>
  );
}

export default function App() {
  const [tab, setTab] = useState("training");
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak] = useState(0);
  const [toast, setToast] = useState(null);
  const tRef = useRef(null);

  /* --- auth & persistenza via Supabase --- */
  const [user, setUser] = useState(null);
  const [pendingPt, setPendingPt] = useState(null); // invito PT da confermare (id trainer)
  const [myTrainer, setMyTrainer] = useState(null); // PT attuale dell'utente: { id, name } | null (max uno)
  const GUEST_KEY = "gq_guest_v1";
  const isGuest = !!(user && user.guest);
  const isPT = !!(user && user.role === "pt");
  const [hydrated, setHydrated] = useState(false);
  const [booting, setBooting] = useState(true);      // splash finché il check sessione non è concluso
  const [bootProg, setBootProg] = useState(0);
  const authDone = useRef(false);
  const bootFacts = useBootFacts();
  const [factIdx] = useState(() => Math.floor(Math.random() * 1000));
  const [body, setBody] = useState({
    peso: "", altezza: "", eta: "", sesso: "M", bf: "",
    collo: "", petto: "", vita: "", braccio: "", coscia: "",
  });
  const [nutri, setNutri] = useState(null);
  const [routines, setRoutines] = useState(DEFAULT_ROUTINES);
  const [prs, setPrs] = useState(DEFAULT_PRS);
  const [premiumUntil, setPremiumUntil] = useState(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [stripeCode, setStripeCode] = useState(null); // codice di riscatto emesso al rientro da Stripe (ospite)
  const isPremium = !!premiumUntil && new Date(premiumUntil) > new Date();
  const premium = { is: isPremium, until: premiumUntil, guest: isGuest,
    open: () => setGateOpen(true),
    needAccount: () => { setGateOpen(true); } };
  const [session, setSession] = useState(null);   // sessione attiva: persiste su Supabase, si riprende al rientro
  const [history, setHistory] = useState([]);
  const [quests, setQuests] = useState(() => freshQuests(QUEST_POOL_DAILY, QUEST_POOL_WEEKLY));
  const [stats, setStats] = useState(EMPTY_STATS);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [questFlash, setQuestFlash] = useState(null);   // testo mostrato sotto la barra XP

  /* rollover: nuove quest a mezzanotte / cambio settimana */
  const rolledQuests = (q) => {
    if (!q || q.dayKey !== dayKey() || q.weekKey !== weekKey()) {
      const f = freshQuests(QUEST_POOL_DAILY, QUEST_POOL_WEEKLY);
      return {
        dayKey: f.dayKey, weekKey: f.weekKey,
        daily: q && q.dayKey === dayKey() ? q.daily : f.daily,
        weekly: q && q.weekKey === weekKey() ? q.weekly : f.weekly,
      };
    }
    return q;
  };
  useEffect(() => { setQuests((q) => rolledQuests(q)); }, []);

  /* pool quest rigenerato ogni mese con Haiku (globale per dispositivo, cache locale) */
  useEffect(() => {
    const key = "gq_qpool_" + new Date().toISOString().slice(0, 7);
    try {
      const c = localStorage.getItem(key);
      if (c) {
        const p = JSON.parse(c);
        QUEST_POOL_DAILY.splice(0, QUEST_POOL_DAILY.length, ...p.daily);
        QUEST_POOL_WEEKLY.splice(0, QUEST_POOL_WEEKLY.length, ...p.weekly);
        return;
      }
    } catch {}
    (async () => {
      try {
        const data = await aiCall({
          model: "claude-haiku-4-5-20251001", max_tokens: 1600,
          messages: [{ role: "user", content: `Genera quest per un'app fitness in stile Halo Reach (nomi militari/epici in italiano). Rispondi SOLO con JSON valido: {"daily":[14 oggetti],"weekly":[11 oggetti]}. Ogni oggetto: {"text": string (max 60 caratteri, include il numero target), "metric": uno tra "workouts"|"sets"|"volume"|"cardio"|"pr", "target": number (daily: workouts 1-2, sets 10-25, volume 1500-8000, cardio 10-20, pr 1; weekly: workouts 3-5, sets 50-90, volume 15000-30000, cardio 60-90, pr 2), "xp": number (30-100 daily, 120-220 weekly, proporzionato alla difficoltà)}` }],
        });
        const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
        const p = parseLoose(text);
        const valid = (a) => Array.isArray(a) && a.length >= 8 && a.every((q) => q.text && QUEST_METRICS.includes(q.metric) && q.target > 0 && q.xp > 0);
        if (valid(p.daily) && valid(p.weekly)) {
          QUEST_POOL_DAILY.splice(0, QUEST_POOL_DAILY.length, ...p.daily);
          QUEST_POOL_WEEKLY.splice(0, QUEST_POOL_WEEKLY.length, ...p.weekly);
          try { localStorage.setItem(key, JSON.stringify(p)); } catch {}
        }
      } catch {} /* fallback: pool base */
    })();
  }, []);

  /* applica i risultati di un allenamento alle quest: ritorna il resoconto per l'animazione */
  const applyWorkoutToQuests = (delta) => {
    let earned = 0, completed = 0;
    const out = [];
    setQuests((prev) => {
      const q = rolledQuests(prev);
      const upd = (list) => list.map((it) => {
        const before = it.prog;
        const after = Math.min(it.target, before + (delta[it.metric] || 0));
        const doneNow = !it.done && after >= it.target;
        if (doneNow) { earned += it.xp; completed += 1; }
        out.push({ ...it, before, after, done: it.done || doneNow, completedNow: doneNow });
        return { ...it, prog: after, done: it.done || doneNow };
      });
      return { ...q, daily: upd(q.daily), weekly: upd(q.weekly) };
    });
    setStats((s) => ({
      workouts: s.workouts + (delta.workouts || 0),
      setsDone: s.setsDone + (delta.sets || 0),
      volume: s.volume + (delta.volume || 0),
      cardioMin: s.cardioMin + (delta.cardio || 0),
      questsDone: s.questsDone + completed,
    }));
    if (earned > 0) {
      addXp(earned);
      setQuestFlash(`◈ QUEST COMPLETATA${completed > 1 ? ` ×${completed}` : ""} · +${earned} XP`);
      setTimeout(() => setQuestFlash(null), 5000);
    }
    return { quests: out, questXp: earned };
  };
     // mission log allenamenti completati

  /* Sessione: ascolta login/logout e idrata i dati utente dal DB */
  useEffect(() => {
    const hydrate = async (authUser) => {
      const { data } = await supabase.from("user_data").select("*")
        .eq("user_id", authUser.id).maybeSingle();
      if (data) {
        if (data.body) setBody(data.body);
        if (data.nutrition) setNutri(data.nutrition);
        if (data.routines) setRoutines(data.routines);
        if (data.prs) setPrs(data.prs);
        if (data.session) setSession(data.session);
        if (data.history) setHistory(data.history);
        if (data.quests) setQuests(rolledQuests(data.quests));
        if (data.stats) setStats({ ...EMPTY_STATS, ...data.stats });
        if (data.xp != null) setXp(data.xp);
        if (data.level != null) setLevel(data.level);
      }
      const { data: prem } = await supabase.from("premium")
        .select("premium_until").eq("user_id", authUser.id).maybeSingle();
      if (prem) setPremiumUntil(prem.premium_until);
      const role = await fetchMyRole(authUser); // "user" | "pt"
      const uname = (authUser.user_metadata && authUser.user_metadata.username) || authUser.email.split("@")[0];
      syncMyUsername(authUser.id, uname); // il PT vede lo username dei clienti
      setUser({
        id: authUser.id,
        email: authUser.email,
        username: uname,
        role,
      });
      if (role === "pt") setTab("clients");
      /* il PT attuale dell'utente (max uno): mostrato in header e profilo */
      if (role !== "pt") fetchMyTrainer(authUser.id).then(setMyTrainer);
      /* invito PT in sospeso (link #pt=...): chiedi conferma dopo il login */
      const pt = pendingInvite();
      if (pt && pt !== authUser.id && role !== "pt") setPendingPt(pt);
      else if (pt) clearInvite();
      setHydrated(true);
    };
    /* ospite: nessun account, dati solo su questo dispositivo */
    const hydrateGuest = () => {
      try {
        const raw = localStorage.getItem(GUEST_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d.body) setBody(d.body);
          if (d.nutrition) setNutri(d.nutrition);
          if (d.routines) setRoutines(d.routines);
          if (d.prs) setPrs(d.prs);
          if (d.session) setSession(d.session);
          if (d.history) setHistory(d.history);
          if (d.quests) setQuests(rolledQuests(d.quests));
          if (d.stats) setStats({ ...EMPTY_STATS, ...d.stats });
          if (d.xp != null) setXp(d.xp);
          if (d.level != null) setLevel(d.level);
        }
      } catch {}
      setUser({ guest: true, username: "Ospite" });
      setHydrated(true);
    };
    window.__gqHydrateGuest = hydrateGuest;

    captureInviteHash(); // link invito PT (#pt=...): parcheggia l'id per dopo il login

    (async () => {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) await hydrate(session.user);
        else if (localStorage.getItem(GUEST_KEY)) hydrateGuest(); // ospite già avviato: rientra diretto
        authDone.current = true; // splash: può chiudersi (utente ripristinato o assente)
      }).catch(() => { authDone.current = true; });
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) hydrate(session.user);
      else if (!window.__gqKeepGuest) { setUser(null); setHydrated(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  /* Splash: progress bar che si completa quando la sessione è verificata */
  useEffect(() => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      setBootProg((p) => {
        const elapsed = Date.now() - t0;
        const target = authDone.current || elapsed > 4000 ? 1 : Math.min(0.86, elapsed / 1400);
        const n = Math.min(target, p + 0.06);
        if (n >= 1) { clearInterval(iv); setTimeout(() => setBooting(false), 260); }
        return n;
      });
    }, 50);
    return () => clearInterval(iv);
  }, []);

  /* Autosave con debounce: ogni modifica viene scritta su Supabase */
  const saveRef2 = useRef(null);
  useEffect(() => {
    if (!user || !hydrated) return;
    clearTimeout(saveRef2.current);
    if (user.guest) {
      saveRef2.current = setTimeout(() => {
        try {
          localStorage.setItem(GUEST_KEY, JSON.stringify({
            body, nutrition: nutri, routines, prs, session, history, quests, stats, xp, level,
          }));
        } catch {}
      }, 800);
      return;
    }
    saveRef2.current = setTimeout(() => {
      supabase.from("user_data").upsert({
        user_id: user.id, body, nutrition: nutri, routines, prs,
        session, history, quests, stats,
        xp, level, streak, updated_at: new Date().toISOString(),
      }).then(({ error }) => error && console.error("Save error:", error.message));
    }, 800);
  }, [user, hydrated, body, nutri, routines, prs, session, history, quests, stats, xp, level]);

  const fireToast = (t) => {
    setToast(t);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(null), 2600);
  };

  /* Rientro da Stripe Checkout: la verifica del pagamento e l'accredito sono
     SOLO server-side (/api/stripe verify, idempotente); qui si aggiorna la UI */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const sid = q.get("stripe_session");
    const cancel = q.get("stripe_cancel");
    if (!sid && !cancel) return;
    window.history.replaceState({}, "", window.location.pathname);
    if (cancel) { fireToast({ title: tr("Pagamento annullato") }); return; }
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const r = await fetch("/api/stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
          body: JSON.stringify({ action: "verify", sessionId: sid }),
        });
        const d = await r.json();
        if (d.premium_until) {
          setPremiumUntil(d.premium_until);
          fireToast({ title: tr("◈ PREMIUM ATTIVO"), sub: tr("Benvenuto tra gli Spartan") });
        } else if (d.credits != null) {
          fireToast({ title: tr("◈ CREDITI AGGIUNTI"), sub: tr("Saldo crediti aggiornato") });
        } else if (d.code) {
          setStripeCode(d.code); setGateOpen(true); // ospite: mostra il codice nello Store
        } else {
          fireToast({ title: tr("Pagamento non confermato"), sub: d.error || "" });
        }
      } catch { fireToast({ title: tr("Pagamento non confermato"), sub: tr("Contatta il supporto") }); }
    })();
  }, []);

  const addXp = (amount) => {
    setXp((prev) => {
      let nxp = prev + amount, lvl = level, up = false;
      while (nxp >= xpForLevel(lvl)) { nxp -= xpForLevel(lvl); lvl++; up = true; }
      if (up) {
        setLevel(lvl);
        setTimeout(() => fireToast({ title: `▲ RANK UP — LV.${lvl}`, sub: LEVEL_TITLES[Math.min(4, Math.floor(lvl / 6))], color: "#ffd76a" }), 150);
      }
      return nxp;
    });
  };

  /* lingua: la chiave canonica resta l'italiano, tr() traduce a schermo */
  const [lang, setLang] = useState("it");
  useEffect(() => { if (body.lang && body.lang !== lang) setLang(body.lang); }, [body.lang]);
  setLangGlobal(lang);

  useEffect(() => { window.__gqXpSnap = { xp, level }; }, [xp, level]);

  /* ricompense: avvisa quando se ne sblocca una nuova (derivate da stats/prs/livello, niente DB) */
  const trophyRef = useRef(null);
  useEffect(() => {
    if (!hydrated) return;
    const ids = unlockedTrophies(stats, prs, level).map((t) => t.id);
    if (trophyRef.current === null) { trophyRef.current = ids; return; }   // baseline al primo caricamento
    const fresh = TROPHIES.filter((t) => ids.includes(t.id) && !trophyRef.current.includes(t.id));
    trophyRef.current = ids;
    fresh.forEach((t, i) =>
      setTimeout(() => fireToast({ title: tr("◈ RICOMPENSA SBLOCCATA"), sub: t.name, color: RARITY[t.rarity].color }), 900 * (i + 1)));
  }, [stats, prs, level, hydrated]);

  const need = xpForLevel(level);
  const rank = LEVEL_TITLES[Math.min(4, Math.floor(level / 6))];

  /* PT: interfaccia pulita e professionale — solo clienti e profilo, niente gamification */
  /* retrocompatibilità: i profili salvati col vecchio id "vanilla" valgono come "standard" */
  const standard = body.uiMode === "standard" || body.uiMode === "vanilla"; // interfaccia pulita: stessa struttura, zero gamification
  /* i portali (Overlay → document.body) ereditano il tema: la classe standard va anche su <body> */
  useEffect(() => {
    document.body.classList.toggle("standard", standard);
    return () => document.body.classList.remove("standard");
  }, [standard]);
  const navItems = isPT ? [
    { id: "clients", label: "Clienti", icon: Users },
    { id: "profile", label: "Profilo", icon: User },
  ] : [
    { id: "training", label: "Training", icon: Dumbbell },
    { id: "nutrition", label: "Nutrition", icon: Utensils },
    ...(standard ? [] : [{ id: "game", label: "Game", icon: Gamepad2 }]),
    { id: "profile", label: "Profilo", icon: User },
  ];

  const ip = useInstallPrompt();

  if (booting) {
    return (
      <>
        <style>{CSS}</style>
        <BootScreen progress={bootProg} fact={bootFacts[factIdx % bootFacts.length]} />
      </>
    );
  }

  if (!user) {
    return (
      <div className={"hud-root" + (standard ? " standard" : "")}>
        <style>{CSS}</style>
        <HudToast toast={toast} />
        <AuthScreen fireToast={fireToast} onGuest={() => { window.__gqKeepGuest = true; window.__gqHydrateGuest && window.__gqHydrateGuest(); }} />
      </div>
    );
  }

  if (!body.onboarded && !isPT) { // il PT non ha bisogno dei dati corporei: salta l'onboarding
    return (
      <div className={"hud-root" + (standard ? " standard" : "")}>
        <style>{CSS}</style>
        <HudToast toast={toast} />
        <OnboardingWizard body={body} setBody={setBody} username={user.username} fireToast={fireToast} />
      </div>
    );
  }

  return (
    <div className={"hud-root" + (standard ? " standard" : "")}>
      <style>{CSS}</style>
      <HudToast toast={toast} />

      {isGuest && (
        <div className="cham-s" style={{ margin: "0 14px 10px", padding: "8px 12px",
          background: "#0c2233", border: "1px solid #2f6786" }}>
          <div className="row between g8" style={{ alignItems: "center" }}>
            <div className="grow">
              <div className="f-hud t-cyan" style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".18em" }}>{tr("MODALITÀ OSPITE")}</div>
              <div className="micro t-faint" style={{ marginTop: 2 }}>{tr("Dati solo su questo dispositivo · funzioni AI disattivate")}</div>
            </div>
            <Btn small primary onClick={() => { window.__gqKeepGuest = false; setUser(null); setHydrated(false); }}>
              {tr("Crea account")}
            </Btn>
          </div>
        </div>
      )}
      <InstallBanner ip={ip} />

      {/* Invito PT aperto da link/QR: conferma del collegamento (o del CAMBIO PT) */}
      {pendingPt && !isPT && (
        <Overlay>
        <div className="modal-back">
          <div className="modal-box cham fade-in" style={{ textAlign: "center" }}>
            <Users size={26} color="var(--cyan)" style={{ margin: "0 auto 12px" }} />
            <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".18em", fontSize: 13 }}>
              {myTrainer && myTrainer.id !== pendingPt ? tr("CAMBIO PERSONAL TRAINER") : tr("INVITO PERSONAL TRAINER")}
            </div>
            <div className="tiny t-dim" style={{ margin: "10px 0 18px", lineHeight: 1.7 }}>
              {myTrainer && myTrainer.id !== pendingPt
                ? <>{tr("Attualmente sei seguito da")} <b className="t-amber">{myTrainer.name || tr("il tuo PT")}</b>. {tr("Confermando passerai al nuovo personal trainer: potrà vedere le tue schede e seguire i tuoi allenamenti.")}</>
                : tr("Un personal trainer ti ha invitato: confermando potrà vedere le tue schede e seguire i tuoi allenamenti. Potrai scollegarti quando vuoi.")}
            </div>
            <div className="row g8">
              <Btn onClick={() => { clearInvite(); setPendingPt(null); }} style={{ flex: 1 }}>{tr("Rifiuta")}</Btn>
              <Btn primary style={{ flex: 2 }} onClick={async () => {
                const changing = myTrainer && myTrainer.id !== pendingPt;
                const ok = await linkToTrainer(user.id, user.email, pendingPt);
                clearInvite(); setPendingPt(null);
                if (ok) setMyTrainer(await fetchMyTrainer(user.id)); // aggiorna chip header/profilo
                fireToast(ok
                  ? changing
                    ? { title: tr("◈ PT CAMBIATO"), sub: tr("Il nuovo PT ora segue i tuoi allenamenti") }
                    : { title: tr("◈ COLLEGAMENTO CONFERMATO"), sub: tr("Il tuo PT ora segue i tuoi allenamenti") }
                  : { title: tr("Collegamento non riuscito"), sub: tr("Riprova dal link invito") });
              }}>{myTrainer && myTrainer.id !== pendingPt ? tr("Conferma cambio PT") : tr("Conferma collegamento")}</Btn>
            </div>
          </div>
        </div>
        </Overlay>
      )}
      {questsOpen && <QuestModal quests={quests} stats={stats} prs={prs} level={level} streak={streak} onClose={() => setQuestsOpen(false)} />}
      {gateOpen && <StoreModal premium={premium} isGuest={isGuest} fireToast={fireToast} onClose={() => setGateOpen(false)}
        onUnlocked={(until) => setPremiumUntil(until)} initialCode={stripeCode} />}

      {/* TOP HUD BAR */}
      <header className="hud-header">
        <div className="hud-header-inner">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div className="brand">COMBAT<span className="t-faint">//</span>TRAINING</div>
            {myTrainer && !isPT && (
              <button onClick={() => setTab("profile")} className="tap row g6"
                title={tr("Il tuo personal trainer")}
                style={{ cursor: "pointer", alignItems: "center", padding: 0, background: "none", border: "none" }}>
                <Users size={10} color="var(--cyan)" />
                <span className="f-hud t-cyan" style={{ fontSize: 9, letterSpacing: ".18em", fontWeight: 700 }}>
                  PT · {(myTrainer.name || tr("ATTIVO")).toUpperCase()}
                </span>
              </button>
            )}
          </div>
          <button onClick={() => setTab("profile")} className="tap row g6"
            style={{ cursor: "pointer", color: isPremium ? "#ffd76a" : tab === "profile" ? "var(--cyan-hi)" : "var(--dim)", position: "relative", flexShrink: 0 }}>
            <span style={{ position: "relative", display: "inline-flex" }}>
              <User size={15} />
              {isPremium && <span className="f-hud" style={{
                position: "absolute", top: -6, right: -7, fontSize: 8, fontWeight: 700,
                color: "#ffd76a", textShadow: "0 0 6px rgba(255,215,106,.8)" }}>P</span>}
            </span>
            <span className="f-hud hide-sm" style={{ fontSize: 11, letterSpacing: ".1em" }}>{user.username}</span>
          </button>
          {isPT ? (
            <div className="xp-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="f-hud t-cyan" style={{ fontWeight: 700, fontSize: 11, letterSpacing: ".25em" }}>PERSONAL TRAINER</span>
            </div>
          ) : standard ? (
            <div className="xp-wrap" /> /* standard: niente barra XP/livello */
          ) : (
            <div className="xp-wrap">
              <div className="row between" style={{ marginBottom: 4 }}>
                <span className="micro">LV.{level} <span className="t-cyan">{rank}</span></span>
                <span className="micro">{xp}/{need} XP</span>
              </div>
              <ShieldBar pct={xp / need} />
              {questFlash && (
                <div className="f-hud t-amber blink" style={{ fontSize: 9, letterSpacing: ".2em", marginTop: 3, textAlign: "center" }}>
                  {questFlash}
                </div>
              )}
            </div>
          )}
          {!isPT && !standard && (
            <div className="row g8" style={{ flexShrink: 0 }}>
              <button onClick={() => setQuestsOpen(true)} className="streak-pill cham-s tap" title={tr("Sfide e medaglie")}
                style={{ cursor: "pointer", borderColor: "#8a6d1f", boxShadow: "0 0 10px rgba(255,215,106,.2)", padding: "8px 14px", gap: 8 }}>
                <Target size={18} color="#ffd76a" />
                <span className="f-hud t-amber hide-sm" style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".15em" }}>{tr("SFIDE")}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* LAYOUT */}
      <div className="layout z-app">
        <aside className="side-nav">
          <div className="panel cham" style={{ padding: "8px 0" }}>
            {navItems.map((t) => {
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className="snav-btn tap"
                  style={{
                    color: on ? "var(--cyan-hi)" : "var(--faint)",
                    background: on ? "var(--active2)" : "transparent",
                    boxShadow: on ? "inset 3px 0 0 var(--cyan)" : "none",
                  }}>
                  <t.icon size={17} style={on ? { filter: "drop-shadow(0 0 5px var(--cyan))" } : {}} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="main-area">
          {tab === "clients" && isPT && <TrainerView user={user} fireToast={fireToast} />}
          {tab === "training" && <Training standard={standard} onWorkoutDone={applyWorkoutToQuests} premium={premium} addXp={addXp} fireToast={fireToast} routines={routines} setRoutines={setRoutines} prs={prs} setPrs={setPrs} session={session} setSession={setSession} history={history} setHistory={setHistory} />}
          {tab === "nutrition" && (
            <NutritionTab premium={premium} body={body} nutri={nutri} setNutri={setNutri} fireToast={fireToast} goProfile={() => setTab("profile")} />
          )}
          {tab === "game" && (
            <GameTab level={level} stats={stats} prs={prs} premium={premium}
              /* radar delle ricompense: registra l'indizio trovato (persiste in stats, niente migrazioni DB) */
              onFindHint={(id) => setStats((s) => ({ ...s, hints: [...new Set([...(s.hints || []), id])] }))} />
          )}
          {tab === "profile" && (isPT ? (
            <TrainerProfile user={user} fireToast={fireToast}
              onLogout={async () => { await supabase.auth.signOut(); setTab("clients"); }} />
          ) : (
            <>
              {isAdminUser(user) && <div style={{ marginBottom: 16 }}><PtRequestsAdmin fireToast={fireToast} /></div>}
              <ProfileTab user={user} body={body} setBody={setBody}
                fireToast={fireToast} onLogout={async () => { await supabase.auth.signOut(); setTab("training"); }}
                onUserUpdate={setUser} level={level} rank={rank} streak={streak} premium={premium}
                onRedoSetup={() => setBody((b) => ({ ...b, onboarded: false }))}
                trainer={myTrainer}
                onUnlinkTrainer={async () => {
                  const ok = await unlinkMyTrainer(user.id);
                  if (ok) { setMyTrainer(null); fireToast({ title: tr("◈ PT SCOLLEGATO"), sub: tr("Nessun personal trainer ti segue ora") }); }
                  else fireToast({ title: tr("Operazione non riuscita"), sub: tr("Riprova tra poco") });
                }}
                ptCard={<PtRequestCard user={user} fireToast={fireToast} />} />
            </>
          ))}
        </main>
      </div>

      {/* BOTTOM NAV (mobile) */}
      <nav className="bottom-nav">
        {navItems.map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={"bnav-btn tap" + (on ? " on" : "")}
              style={{ color: on ? "var(--cyan-hi)" : "var(--faint)", alignItems: "center", textAlign: "center" }}>
              <span className="bnav-ico"><t.icon size={20} style={on ? { filter: "drop-shadow(0 0 5px var(--cyan))" } : {}} /></span>
              {t.label}
              <div style={{ height: 2, width: 32, background: on ? "var(--cyan)" : "transparent", boxShadow: on ? "0 0 6px var(--cyan)" : "none" }} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ================================ TRAINING ================================ */
function Training({ standard, onWorkoutDone, premium, addXp, fireToast, routines, setRoutines, prs, setPrs, session, setSession, history, setHistory }) {
  const [view, setView] = useState("home");
  const [editId, setEditId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [report, setReport] = useState(null);

  const deleteRoutine = (id) => {
    setRoutines((rs) => rs.filter((r) => r.id !== id));
    setConfirmDel(null);
    fireToast({ title: tr("◈ SCHEDA ELIMINATA") });
  };

  const saveRoutine = (r, msg) => {
    setRoutines((rs) => rs.find((x) => x.id === r.id) ? rs.map((x) => x.id === r.id ? r : x) : [...rs, r]);
    setView("home"); setEditId(null);
    fireToast({ title: msg || "◈ SCHEDA SALVATA", sub: r.name });
  };

  /* Riordino delle schede trascinando l'handle: stesso sistema drag (dlStart)
     usato per esercizi e serie in "allenamento in corso" e "modifica" */
  const moveRoutine = (from, to) => {
    setRoutines((rs) => {
      const arr = [...rs];
      const [m] = arr.splice(from, 1);
      arr.splice(to, 0, m);
      return arr;
    });
  };

  /* Inizia Allenamento: crea una sessione attiva e persistente (copia del modello).
     Se un esercizio ha la progressione settimanale attiva, usa le serie della
     settimana corrente al posto di quelle base della scheda. */
  const startSession = (r) => {
    setSession({
      routineId: r.id,
      name: r.name,
      startedAt: Date.now(),
      exercises: r.exercises.map((e) => {
        const prog = applyProgression(e, r.progression);
        return {
          ...e,
          sets: (prog ? prog.sets : e.sets.map((s) => ({ ...s }))).map((s) => ({ ...s, done: false, elapsed: 0 })),
          progWeek: prog ? prog.week : undefined,
          progTotal: prog ? prog.total : undefined,
        };
      }),
    });
    setView("session");
  };

  const abandonSession = () => {
    setSession(null); setConfirmAbandon(false);
    fireToast({ title: tr("◈ SESSIONE ABBANDONATA"), sub: tr("Nessun record salvato") });
  };

  if (view === "session" && session) {
    return <SessionView standard={standard} onWorkoutDone={onWorkoutDone} premium={premium} session={session} setSession={setSession} prs={prs} setPrs={setPrs}
      addXp={addXp} fireToast={fireToast}
      routines={routines} setRoutines={setRoutines} setHistory={setHistory}
      exitToHome={() => setView("home")} />;
  }
  if (view === "builder") {
    const initial = editId != null ? routines.find((r) => r.id === editId) : null;
    return <RoutineEditor premium={premium} fireToast={fireToast} initial={initial} onClose={() => { setView("home"); setEditId(null); }}
      onSave={(r) => saveRoutine(r, initial ? "◈ MODELLO AGGIORNATO" : "◈ SCHEDA SALVATA")} />;
  }
  /* Import e generazione AI AGGIUNGONO sempre una scheda nuova: mai
     sovrascrivere quelle esistenti. Se l'id arrivasse a collidere con una
     scheda già presente, se ne forza uno fresco prima del salvataggio. */
  if (view === "ai") return <AIWorkout premium={premium} onClose={() => setView("home")}
    onSave={(r) => saveRoutine({ ...r, id: routines.some((x) => x.id === r.id) ? Date.now() : r.id }, "◈ SCHEDA AI GENERATA")} />;
  /* nota: la conversione della scheda PT (import) resta gratuita per scelta */
  if (view === "import") return <DocImport premium={premium} onClose={() => setView("home")}
    onSave={(r) => saveRoutine({ ...r, id: routines.some((x) => x.id === r.id) ? Date.now() : r.id }, "◈ DOCUMENTO INTERPRETATO")} />;

  return (
    <div className="fade-in two-col">
      {report && <WorkoutReport rec={report} onClose={() => setReport(null)} />}
      {/* LEFT: routines */}
      <div className="col stack">

        {/* Sessione in corso: banner di ripresa */}
        {session && (
          <Panel accent style={{ borderColor: "#ffd76a" }}>
            <div className="f-hud t-amber blink" style={{ fontWeight: 700, letterSpacing: ".18em", fontSize: 12 }}>{tr("● SESSIONE IN CORSO")}</div>
            <div className="t-bright" style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{session.name}</div>
            <div className="tiny t-faint" style={{ marginTop: 2 }}>avviata alle {new Date(session.startedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="row g8" style={{ marginTop: 14 }}>
              {confirmAbandon ? (
                <>
                  <Btn onClick={abandonSession} style={{ flex: 1, borderColor: "#6e3028", color: "#ff8f7d" }}>{tr("Conferma abbandono")}</Btn>
                  <Btn onClick={() => setConfirmAbandon(false)} style={{ flex: 1 }}>{tr("Annulla")}</Btn>
                </>
              ) : (
                <>
                  <Btn primary onClick={() => setView("session")} style={{ flex: 2 }}>{tr("Riprendi ▶")}</Btn>
                  <Btn onClick={() => setConfirmAbandon(true)} style={{ flex: 1 }}>{tr("Abbandona")}</Btn>
                </>
              )}
            </div>
          </Panel>
        )}

        <div className="row between">
          <h2 className="hud-title">{tr("▸ Schede attive")}</h2>
          <Btn small onClick={() => setView("builder")}><Plus size={12} style={{ display: "inline", verticalAlign: -2 }} /> {tr("Nuova")}</Btn>
        </div>

        <div className="row g8">
          <Btn small onClick={() => setView("import")} style={{ flex: 1, opacity: .85 }} title={tr("Carica un documento (PDF, foto, testo) — l'AI lo converte in allenamento")}>
            <Upload size={12} style={{ display: "inline", verticalAlign: -2 }} /> {tr("IMPORTA SCHEDA PT")}
          </Btn>
          <Btn small onClick={() => setView("ai")} style={{ flex: 1, opacity: .85 }} title={tr("Crea un allenamento su misura per obiettivo, giorni e attrezzatura")}>
            <Bot size={12} style={{ display: "inline", verticalAlign: -2 }} /> {tr("GENERA SCHEDA CON AI")}
          </Btn>
        </div>

        {routines.length === 0 && (
          <Panel>
            <div className="tiny t-faint" style={{ textAlign: "center", padding: "12px 0" }}>
              {tr("Nessuna scheda. Creane una, importala da un documento PT o usa il generatore AI.")}
            </div>
          </Panel>
        )}
        <div data-dl className="stack">
        {routines.map((r) => (
          <Panel key={r.id} hover>
            <div className="row g8" style={{ alignItems: "flex-start" }}>
              <span className="drag-handle" title={tr("Trascina per riordinare")}
                onPointerDown={(e) => dlStart(e, moveRoutine)} style={{ marginTop: 2 }}><GripVertical size={15} /></span>
              <div className="grow">
                <div className="f-hud t-bright" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 15 }}>{r.name}</div>
                <div className="tiny t-dim" style={{ marginTop: 2 }}>
                  {r.exercises.length} ESERCIZI · {r.exercises.reduce((a, e) => a + e.sets.length, 0)} SERIE
                </div>
                <div className="row wrap g6" style={{ marginTop: 8 }}>
                  {[...new Set(r.exercises.map((e) => e.group))].map((g) => (
                    <span key={g} className="chip cham-s">{tr(g)}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="row between" style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--soft)" }}>
              {confirmDel === r.id ? (
                <div className="row g8" style={{ width: "100%" }}>
                  <Btn small onClick={() => deleteRoutine(r.id)} style={{ flex: 1, borderColor: "#6e3028", color: "#ff8f7d" }}>{tr("Elimina scheda")}</Btn>
                  <Btn small onClick={() => setConfirmDel(null)} style={{ flex: 1 }}>{tr("Annulla")}</Btn>
                </div>
              ) : (
                <>
                  <div className="row" style={{ gap: 18 }}>
                    <span onClick={() => { setEditId(r.id); setView("builder"); }} className="tap icon-tap" title={tr("Modifica modello")}
                      style={{ color: "#5d87a3" }}><Pencil size={17} /></span>
                    <span onClick={() => setConfirmDel(r.id)} className="tap icon-tap" title={tr("Elimina")}
                      style={{ color: "#5d87a3" }}><Trash2 size={17} /></span>
                  </div>
                  <Btn small primary disabled={!!session} onClick={() => startSession(r)}
                    style={{ padding: "9px 22px" }}
                    title={session ? "Chiudi prima la sessione attiva" : ""}>
                    <Play size={11} style={{ display: "inline", verticalAlign: -1 }} /> Inizia
                  </Btn>
                </>
              )}
            </div>
          </Panel>
        ))}
        </div>

      </div>

      {/* RIGHT: history + library + PR */}
      <div className="col stack">
        <CollapsiblePanel id="missionlog" label={tr("Mission log — ultimi allenamenti")}>
          {(!history || history.length === 0) && (
            <div className="tiny t-faint" style={{ padding: "8px 0" }}>
              {tr("Nessun allenamento registrato. Completa il primo workout per iniziare il log.")}
            </div>
          )}
          {(history || []).slice(0, 8).map((h, i) => (
            <button key={i} onClick={() => setReport(h)} className="tap divider-row g12"
              style={{ width: "100%", cursor: "pointer", textAlign: "left" }}>
              <div className="micro" style={{ width: 46, flexShrink: 0 }}>{h.date}</div>
              <div className="grow">
                <div className="row g6 t-bright" style={{ fontSize: 14 }}>
                  {h.name}{h.pr > 0 && <Trophy size={11} color="#ffd76a" />}
                </div>
                <div className="tiny t-faint">{h.sets} serie · {h.duration}</div>
              </div>
              <div className="row g6" style={{ alignItems: "center" }}>
                <span className="f-hud t-cyan" style={{ fontWeight: 700, fontSize: 13 }}>
                  {h.volume.toLocaleString()} <span className="t-faint" style={{ fontWeight: 500 }}>{tr("kg")}</span>
                </span>
                <ChevronRight size={13} color="var(--faint)" />
              </div>
            </button>
          ))}
        </CollapsiblePanel>

        <ExerciseLibrary />

        <CollapsiblePanel id="prs" label="Personal records" icon={<Trophy size={13} color="#ffd76a" />}>
          {Object.keys(prs).length === 0 && (
            <div className="tiny t-faint" style={{ padding: "6px 0" }}>
              {tr("Nessun record. Completa serie con carichi crescenti per registrare i PR.")}
            </div>
          )}
          {Object.entries(prs).map(([k, v]) => (
            <div key={k} className="divider-row">
              <span style={{ fontSize: 14 }}>{tr(k)}</span>
              <span className="f-hud t-amber" style={{ fontWeight: 700, fontSize: 13 }}>{v} KG</span>
            </div>
          ))}
        </CollapsiblePanel>
      </div>
    </div>
  );
}


/* ---------------- Report allenamento (dallo storico) ---------------- */
function WorkoutReport({ rec, onClose }) {
  const fmt = (sec) => `${Math.floor((sec || 0) / 60)}:${String((sec || 0) % 60).padStart(2, "0")}`;
  const bestOf = (ex) => {
    if (ex.mode === "time") return null;
    let best = -1, idx = -1;
    ex.sets.forEach((s, i) => { const v = (s.w || 0) * (s.r || 0); if (s.done && v > best) { best = v; idx = i; } });
    return idx;
  };
  return (
    <Overlay>
    <div className="modal-back" onClick={onClose}>
      <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 2 }}>
          <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".2em", fontSize: 14 }}>{tr("◈ MISSION REPORT")}</div>
          <span onClick={onClose} className="tap t-faint" style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0" }}>✕</span>
        </div>
        <div className="t-bright" style={{ fontSize: 16, fontWeight: 700 }}>{rec.name}</div>
        <div className="tiny t-faint" style={{ marginBottom: 14 }}>{rec.date} · {rec.duration}</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            ["VOLUME", `${(rec.volume || 0).toLocaleString()} kg`, "t-cyan"],
            ["SERIE", rec.sets, "t-bright"],
            ["CARDIO", rec.cardio ? `${rec.cardio} min` : "—", "t-cyan"],
            ["RECORD", rec.pr > 0 ? `🏆 ${rec.pr}` : "—", "t-amber"],
          ].map(([l, v, c]) => (
            <div key={l} className="cham-s" style={{ padding: "10px 12px", background: "var(--card)", border: "1px solid var(--soft)" }}>
              <div className="micro">{l}</div>
              <div className={`f-hud ${c}`} style={{ fontWeight: 700, fontSize: 17 }}>{v}</div>
            </div>
          ))}
        </div>

        {(rec.exercises || []).length > 0 ? (
          <>
            <div className="hud-label" style={{ marginBottom: 8 }}>{tr("▸ Dettaglio esercizi")}</div>
            <div className="stack-s">
              {rec.exercises.map((ex, i) => {
                const bi = bestOf(ex);
                return (
                  <div key={i} className="cham-s" style={{ padding: "10px 12px", background: "var(--card2)", border: "1px solid var(--soft)" }}>
                    <div className="row between">
                      <span className="t-bright" style={{ fontSize: 14, fontWeight: 700 }}>{tr(ex.name)}</span>
                      <span className="micro t-cyan">{tr(ex.group || "").toUpperCase()}</span>
                    </div>
                    {ex.note && <div className="tiny" style={{ color: "#8fb2c9", marginTop: 2 }}>{ex.note}</div>}
                    <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
                      {ex.sets.map((s, si) => (
                        <span key={si} className="cham-s tiny" style={{
                          padding: "4px 9px",
                          border: `1px solid ${si === bi ? "#ffd76a" : s.done ? "#1b4a63" : "#14202e"}`,
                          color: si === bi ? "#ffd76a" : s.done ? "#c9e8f7" : "var(--faint)",
                          background: s.done ? "#0a2333" : "var(--input)",
                          textDecoration: s.done ? "none" : "line-through",
                        }}>
                          {ex.mode === "time" ? `${fmt(s.elapsed)}${s.dist ? ` · ${s.dist}km` : ""}` : `${s.w || 0}kg × ${s.r || 0}`}
                          {si === bi && " ★"}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="micro t-faint" style={{ marginTop: 10, textAlign: "center" }}>{tr("★ MIGLIOR SERIE · LE SERIE BARRATE NON SONO STATE COMPLETATE")}</div>
          </>
        ) : (
          <div className="tiny t-faint">{tr("Nessun dettaglio disponibile per questo allenamento (registrato con una versione precedente).")}</div>
        )}
      </div>
    </div>
    </Overlay>
  );
}

/* ---------------- Collapsible Panel (aperto di default, stato salvato) ---------------- */
const PANELS_KEY = "gq_panels_v1";
const readPanels = () => { try { return JSON.parse(localStorage.getItem(PANELS_KEY)) || {}; } catch { return {}; } };

function CollapsiblePanel({ id, label, icon, children }) {
  const [open, setOpen] = useState(() => readPanels()[id] !== false); // default: aperto
  const toggle = () => {
    const next = !open;
    setOpen(next);
    const map = readPanels();
    map[id] = next;
    localStorage.setItem(PANELS_KEY, JSON.stringify(map));
  };
  return (
    <Panel>
      <button onClick={toggle} className="tap row between" style={{ width: "100%", cursor: "pointer", marginBottom: open ? 8 : 0 }}>
        <span className="hud-label row g6" style={{ marginBottom: 0 }}>{icon}{label}</span>
        {open ? <ChevronDown size={15} color="var(--faint)" /> : <ChevronRight size={15} color="var(--faint)" />}
      </button>
      {open && children}
    </Panel>
  );
}

/* ---------------- Exercise Library ---------------- */
function ExerciseLibrary() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null); // libreria: tutti i gruppi chiusi di default
  const [info, setInfo] = useState(null);
  const filtered = useMemo(() => {
    if (!q) return EXERCISE_DB;
    const out = {};
    for (const [g, list] of Object.entries(EXERCISE_DB)) {
      const m = list.filter((e) => e.toLowerCase().includes(q.toLowerCase()));
      if (m.length) out[g] = m;
    }
    return out;
  }, [q]);
  return (
    <CollapsiblePanel id="library" label={tr("Libreria esercizi")}>
      {info && <ExerciseInfoModal name={info.name} group={info.group} ex={info} onClose={() => setInfo(null)} />}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={14} color="var(--faint)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
        <input className="hud-input cham-s" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={tr("Cerca esercizio...")} style={{ paddingLeft: 32 }} />
      </div>
      <div className="scroll-y stack-s">
        {Object.entries(filtered).map(([g, list]) => (
          <div key={g}>
            <button onClick={() => setOpen(open === g ? null : g)} className="tap cham-s row between"
              style={{ width: "100%", padding: "8px 10px", cursor: "pointer", border: "1px solid var(--soft)", background: "var(--card2)" }}>
              <span className="f-hud t-cyan" style={{ fontSize: 11, letterSpacing: ".2em" }}>{tr(g).toUpperCase()}</span>
              <span className="tiny t-faint">{list.length} ▾</span>
            </button>
            {(open === g || q) && (
              <div className="fade-in" style={{ paddingLeft: 12, paddingTop: 4 }}>
                {list.map((e) => (
                  <div key={e} className="row between" style={{ fontSize: 14, padding: "5px 0", borderBottom: "1px solid var(--hairline)" }}>
                    <span>{tr(e)}</span>
                    <span onClick={() => setInfo({ name: e, group: g })} className="tap icon-tap" style={{ color: "var(--faint)" }}>
                      <Info size={13} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </CollapsiblePanel>
  );
}




/* ---------------- PT Document Import (AI) ---------------- */

/* ---------------- AI Workout Generator ---------------- */
function AIWorkout({ premium, onClose, onSave }) {
  const [goal, setGoal] = useState("Massa");
  const [days, setDays] = useState(3);
  const [equip, setEquip] = useState("Palestra completa");
  const [prefs, setPrefs] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [error, setError] = useState(null);

  /* parametri condivisi dal generatore locale e dalla generazione AI guidata */
  const scheme = goal === "Forza" ? { s: 5, r: 5 } : goal === "Massa" ? { s: 4, r: 10 } : { s: 3, r: 15 };
  /* divisioni per 1-7 giorni: full body → upper/lower → PPL → split classica */
  const daySplits =
    days === 1 ? [["Petto", "Dorso", "Gambe", "Spalle", "Core"]]  // full body
    : days === 2 ? [["Petto", "Dorso", "Gambe"], ["Spalle", "Bicipiti", "Tricipiti"]]
    : days === 3 ? [["Petto", "Spalle", "Tricipiti"], ["Dorso", "Bicipiti"], ["Gambe", "Core"]]
    : days === 4 ? [["Petto", "Tricipiti"], ["Dorso", "Bicipiti"], ["Gambe", "Core"], ["Spalle", "Core"]]
    : days === 5 ? [["Petto"], ["Dorso"], ["Gambe"], ["Spalle"], ["Bicipiti", "Tricipiti", "Core"]]  // split classica
    : days === 6 ? [["Petto", "Spalle", "Tricipiti"], ["Dorso", "Bicipiti"], ["Gambe", "Core"],
                    ["Petto", "Spalle", "Tricipiti"], ["Dorso", "Bicipiti"], ["Gambe", "Core"]]  // PPL ×2
    : [["Petto", "Spalle", "Tricipiti"], ["Dorso", "Bicipiti"], ["Gambe", "Core"],
       ["Petto", "Spalle", "Tricipiti"], ["Dorso", "Bicipiti"], ["Gambe"], ["Core", "Cardio"]];  // PPL ×2 + recupero attivo
  const bw = ["Push-Up", "Trazioni", "Plank", "Crunch", "Russian Twist", "Leg Raise", "Dip alle Parallele", "Dip tra Panche", "Affondi Bulgari", "Side Plank"];
  const db = [...bw, "Panca Piana Manubri", "Panca Inclinata Manubri", "Rematore Manubrio", "Curl Manubri Alternato", "Hammer Curl", "Shoulder Press Manubri", "Arnold Press", "Alzate Laterali", "Stacco Rumeno", "Affondi Manubri", "Kickback Manubrio"];
  const filter = (list) => equip === "Palestra completa" ? list : list.filter((e) => (equip === "Manubri" ? db : bw).includes(e));
  const plan = daySplits.map((g, i) => `Giorno ${i + 1}: ${g.join(" + ")}`);

  /* generatore locale: esercizi del giorno 1 presi dal database; quanti per
     gruppo dipende dalla divisione (un solo gruppo → giornata dedicata) */
  const perGroup = daySplits[0].length === 1 ? 5 : daySplits[0].length === 2 ? 3 : 2;
  const localResult = () => ({
    id: Date.now(),
    name: `AI ${goal.toUpperCase()} D1`,
    exercises: daySplits[0].flatMap((g) => filter(EXERCISE_DB[g]).slice(0, perGroup).map((name) => ({
      name, group: g,
      sets: Array.from({ length: scheme.s }, () => ({ w: equip === "Corpo libero" ? 0 : goal === "Forza" ? 60 : 30, r: scheme.r, done: false })),
    }))),
    plan,
  });

  /* Con le preferenze scritte la scheda la compone davvero l'AI: sceglie dal
     catalogo (già filtrato per attrezzatura) e adatta scelta, serie e note
     alle richieste. Restituisce "LIMIT" al limite settimanale, lancia errore
     negli altri casi (e il chiamante ripiega sul generatore locale). */
  const generateWithAI = async (text) => {
    const catalog = daySplits[0].map((g) => `${g}: ${filter(EXERCISE_DB[g]).join(" | ")}`).join("\n");
    const data = await aiCall({
      model: "claude-haiku-4-5-20251001", max_tokens: 2000,
      messages: [{ role: "user", content: `Sei un personal trainer esperto. Componi il GIORNO 1 di una scheda di allenamento.
OBIETTIVO: ${goal}. ATTREZZATURA: ${equip}. GIORNI/SETTIMANA: ${days} (divisione completa: ${plan.join(" · ")}).
ESERCIZI DISPONIBILI PER IL GIORNO 1 (usa SOLO questi nomi, circa ${perGroup} esercizi per gruppo — min 4 max 10 in totale — coprendo TUTTI i gruppi):
${catalog}
SCHEMA BASE: ${scheme.s} serie × ${scheme.r} ripetizioni.
PREFERENZE DELL'UTENTE (priorità massima: adatta scelta degli esercizi, serie, ripetizioni e note): "${text}"
Rispondi SOLO con JSON valido, senza markdown, senza backtick, senza testo extra.
Schema: {"exercises": [{"name": string (ESATTAMENTE uno dei nomi disponibili sopra), "sets": number (serie), "reps": number (ripetizioni), "note": string (adattamento legato alle preferenze, "" se nessuno)}]}` }],
    }, "workout");
    if (data && data.error === "limit_reached") return "LIMIT";
    if (data && data.error) throw new Error("API");
    const raw = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const parsed = parseLoose(raw);
    const seen = new Set();
    const exercises = (parsed.exercises || []).map((e) => {
      let name = e.name, note = e.note || "";
      if (!ALL_EXERCISES.includes(name)) {
        const m = matchToDb(name);
        if (ALL_EXERCISES.includes(m.name)) { name = m.name; note = [m.note, note].filter(Boolean).join(" · "); }
        else return null;  // fuori catalogo: si scarta, non si inventano esercizi
      }
      /* il filtro attrezzatura vale comunque: esercizio non ammesso →
         si sostituisce con il primo dello stesso gruppo consentito */
      const g = findGroup(name);
      const allowed = filter(EXERCISE_DB[g] || []);
      if (!allowed.includes(name)) {
        if (!allowed.length) return null;
        name = allowed[0];
      }
      if (seen.has(name)) return null;
      seen.add(name);
      const nSets = Math.min(6, Math.max(2, Number(e.sets) || scheme.s));
      const reps = Math.min(30, Math.max(3, Number(e.reps) || scheme.r));
      return {
        name, group: g, ...(note ? { note } : {}),
        sets: Array.from({ length: nSets }, () => ({ w: equip === "Corpo libero" ? 0 : goal === "Forza" ? 60 : 30, r: reps, done: false })),
      };
    }).filter(Boolean);
    if (exercises.length < 3) throw new Error("empty");
    return { id: Date.now(), name: `AI ${goal.toUpperCase()} D1`, exercises, plan };
  };

  /* La generazione passa dal server per applicare il limite settimanale;
     se la chiamata fallisce si usa comunque il generatore locale. */
  const generate = async () => {
    if (premium && premium.guest) return premium.open();  // ospite: nessuna funzione AI
    setLoading(true); setError(null);
    const p = prefs.trim();
    if (p) {
      /* preferenze presenti: generazione AI reale (il limite settimanale è
         controllato da questa stessa chiamata); in caso di errore si ripiega
         sul generatore locale avvisando che le preferenze non sono applicate */
      try {
        const r = await generateWithAI(p);
        if (r === "LIMIT") {
          setLoading(false);
          if (premium) premium.open();
          return setError(tr("Limite settimanale raggiunto"));
        }
        setResult(r); setLoading(false);
        return;
      } catch (e) {
        setError(tr("AI non disponibile: scheda generata senza applicare le preferenze"));
      }
    } else {
      /* senza preferenze resta il generatore locale: la chiamata minima serve
         solo al conteggio del limite settimanale lato server */
      try {
        const data = await aiCall({
          model: "claude-haiku-4-5-20251001", max_tokens: 60,
          messages: [{ role: "user", content: "ok" }],
        }, "workout");
        if (data && data.error === "limit_reached") {
          setLoading(false);
          if (premium) premium.open();
          return setError(tr("Limite settimanale raggiunto"));
        }
      } catch (e) { /* rete/API: si procede col generatore locale */ }
    }
    setTimeout(() => { setResult(localResult()); setLoading(false); }, 1000);
  };

  const Opt = ({ options, value, set }) => (
    <div className="row wrap g6">
      {options.map((o) => (
        <button key={o} onClick={() => set(o)}
          className={`tap cham-s chip ${value === o ? "chip-on" : ""}`}
          style={{ cursor: "pointer", fontSize: 12, padding: "6px 12px", fontFamily: "'Rajdhani',sans-serif", textTransform: "none", letterSpacing: ".02em" }}>
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fade-in stack" style={{ maxWidth: 560 }}>
      <div className="row between">
        <Btn small onClick={onClose}>{tr("‹ Indietro")}</Btn>
        <span className="hud-title">{tr("Generatore AI")}</span>
        <div style={{ width: 64 }} />
      </div>
      {!result ? (
        <Panel className="stack">
          <div><div className="hud-label" style={{ marginBottom: 6 }}>{tr("Obiettivo")}</div>
            <Opt options={["Massa", "Forza", "Dimagrimento"]} value={goal} set={setGoal} /></div>
          <div>
            <div className="hud-label" style={{ marginBottom: 6 }}>{tr("Giorni/settimana ·")} <span className="t-cyan">{days}</span></div>
            <input type="range" min="1" max="7" value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </div>
          <div><div className="hud-label" style={{ marginBottom: 6 }}>{tr("Attrezzatura")}</div>
            <Opt options={["Palestra completa", "Manubri", "Corpo libero"]} value={equip} set={setEquip} /></div>
          <div>
            <div className="hud-label" style={{ marginBottom: 6 }}>{tr("Preferenze di allenamento")} <span className="t-faint">({tr("opzionale")})</span></div>
            <textarea className="hud-input cham-s" value={prefs} onChange={(e) => setPrefs(e.target.value)} rows={2}
              placeholder={tr("Es. niente squat per il ginocchio, più enfasi sui dorsali, solo macchine guidate, circuito a tempo...")}
              style={{ resize: "none", fontSize: 13 }} />
            <div className="micro t-faint" style={{ marginTop: 6 }}>{tr("SE COMPILATE, LA SCHEDA VIENE COMPOSTA DALL'AI SEGUENDO LE TUE RICHIESTE")}</div>
          </div>
          {error && <div className="tiny t-red">⚠ {error}</div>}
          <Btn primary full disabled={loading} onClick={generate}>
            {loading ? "Generazione..." : "Genera scheda"}
          </Btn>
        </Panel>
      ) : (
        <>
          {error && <div className="tiny t-red">⚠ {error}</div>}
          <Panel accent>
            <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".2em", marginBottom: 4 }}>{result.name}</div>
            {result.plan.map((p) => <div key={p} className="tiny t-dim">{p}</div>)}
            <div style={{ marginTop: 12 }}>
              {result.exercises.map((e) => (
                <div key={tr(e.name)} className="divider-row">
                  <span className="t-bright" style={{ fontSize: 14 }}>{tr(e.name)}</span>
                  <span className="tiny t-dim">{e.sets.length} × {e.sets[0].r}{e.sets[0].w ? ` @ ${e.sets[0].w}kg` : ""}</span>
                </div>
              ))}
            </div>
          </Panel>
          <div className="row g8">
            <Btn onClick={() => setResult(null)} style={{ flex: 1 }}>{tr("↻ Rigenera")}</Btn>
            <Btn primary onClick={() => onSave(result)} style={{ flex: 1 }}>{tr("Salva ✓")}</Btn>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================ AUTH ================================ */
const AuthField = ({ icon: Icon, ...props }) => (
  <div style={{ position: "relative" }}>
    <Icon size={15} color="var(--faint)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
    <input {...props} className="hud-input cham-s" style={{ paddingLeft: 34, ...(props.style || {}) }} />
  </div>
);

function AuthScreen({ fireToast, onGuest }) {
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => { setError(null); setSent(false); setPw(""); setPw2(""); };

  const submit = async () => {
    setError(null); setLoading(true);
    const em = email.trim().toLowerCase();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
        if (error) throw new Error("Email o password non corretti");
        fireToast({ title: tr("◈ ACCESSO EFFETTUATO") });
      }
      if (mode === "register") {
        if (username.trim().length < 3) throw new Error("Username: minimo 3 caratteri");
        if (pw.length < 6) throw new Error("Password: minimo 6 caratteri");
        if (pw !== pw2) throw new Error("Le password non coincidono");
        const { error } = await supabase.auth.signUp({
          email: em, password: pw,
          options: { data: { username: username.trim() } },
        });
        if (error) throw new Error(error.message);
        setSent(true); // se la conferma email è attiva su Supabase
      }
      if (mode === "forgot") {
        if (!em.includes("@")) throw new Error("Inserisci un'email valida");
        await supabase.auth.resetPasswordForEmail(em, { redirectTo: window.location.origin });
        setSent(true);
      }
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-box fade-in">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="f-hud t-cyan" style={{ fontSize: 24, fontWeight: 700, letterSpacing: ".3em" }}>
            COMBAT<span className="t-faint">//</span>TRAINING
          </div>
          <div className="micro" style={{ marginTop: 6 }}>{tr("TRAINING HUD SYSTEM")}</div>
        </div>

        <div className="panel panel-accent cham stack" style={{ padding: 24 }}>
          <div className="hud-title" style={{ textAlign: "center", fontSize: 13 }}>
            {mode === "login" ? "Accedi" : mode === "register" ? "Crea account" : "Recupera password"}
          </div>

          {sent ? (
            <>
              <div className="tiny t-dim" style={{ textAlign: "center", lineHeight: 1.6 }}>
                {mode === "forgot"
                  ? <>{tr("Se")} <span className="t-cyan">{email}</span>{tr("è registrata, riceverai un link per reimpostare la password.")}</>
                  : <>{tr("Ti abbiamo inviato un'email di conferma a")} <span className="t-cyan">{email}</span>{tr(". Aprila per attivare l'account.")}</>}
              </div>
              <Btn full onClick={() => { setMode("login"); reset(); }}>{tr("‹ Torna al login")}</Btn>
            </>
          ) : (
            <>
              <AuthField icon={Mail} type="email" placeholder={tr("Email")} value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="email" />

              {mode === "register" && (
                <AuthField icon={User} type="text" placeholder={tr("Username")} value={username}
                  onChange={(e) => setUsername(e.target.value)} />
              )}

              {mode !== "forgot" && (
                <div style={{ position: "relative" }}>
                  <Lock size={15} color="var(--faint)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
                  <input type={showPw ? "text" : "password"} placeholder={tr("Password")} value={pw}
                    onChange={(e) => setPw(e.target.value)} className="hud-input cham-s"
                    style={{ paddingLeft: 34, paddingRight: 40 }}
                    autoComplete={mode === "login" ? "current-password" : "new-password"} />
                  <button onClick={() => setShowPw(!showPw)} className="tap"
                    style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "var(--faint)" }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              )}

              {mode === "register" && (
                <AuthField icon={Lock} type={showPw ? "text" : "password"} placeholder={tr("Conferma password")}
                  value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
              )}

              {error && <div className="tiny t-red">⚠ {error}</div>}

              <Btn primary full disabled={loading} onClick={submit}>
                {loading ? "..." : mode === "login" ? "Accedi" : mode === "register" ? "Registrati" : "Invia link di reset"}
              </Btn>

              <div className="row between">
                {mode === "login" ? (
                  <>
                    <button className="link-btn tap" onClick={() => { setMode("forgot"); reset(); }}>{tr("Password dimenticata?")}</button>
                    <button className="link-btn tap" onClick={() => { setMode("register"); reset(); }}>{tr("Crea account ›")}</button>
                  </>
                ) : (
                  <button className="link-btn tap" onClick={() => { setMode("login"); reset(); }}>{tr("‹ Torna al login")}</button>
                )}
              </div>
            </>
          )}
        </div>
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--soft)" }}>
          <Btn full onClick={onGuest}>{tr("Continua senza account ›")}</Btn>
          <div className="micro t-faint" style={{ textAlign: "center", marginTop: 8, lineHeight: 1.6 }}>
            {tr("PROVA SUBITO · I DATI RESTANO SU QUESTO DISPOSITIVO")}
          </div>
        </div>
      </div>
    </div>
  );
}

const BodyField = ({ draft, setD, label, k, unit, step }) => (
  <div>
    <div className="hud-label" style={{ marginBottom: 4, fontSize: 9 }}>{label} {unit && <span className="t-faint">({unit})</span>}</div>
    <input className="hud-input cham-s" type="number" inputMode="decimal" step={step || 1}
      value={draft[k]} onChange={(e) => setD(k, e.target.value)} style={{ textAlign: "center" }} />
  </div>
);

/* ================================ PROFILE ================================ */
function ProfileTab({ user, body, setBody, fireToast, onLogout, onUserUpdate, level, rank, streak, premium, onRedoSetup, ptCard, trainer, onUnlinkTrainer }) {
  const [ptUnlink, setPtUnlink] = useState(false); // conferma in due passi dello scollegamento dal PT
  const [usage, setUsage] = useState(null);
  const [usageErr, setUsageErr] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const r = await fetch("/api/usage", { headers: { Authorization: `Bearer ${session?.access_token || ""}` } });
        const d = await r.json();
        if (d.limits) setUsage(d);
        else setUsageErr(d.error || `Errore ${r.status}`);
      } catch (e) { setUsageErr(e.message || "Errore di rete"); }
    })();
  }, []);

  const [draft, setDraft] = useState(body);
  const [username, setUsername] = useState(user.username);
  const [fullName, setFullName] = useState("");
  useEffect(() => {
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data?.full_name) setFullName(data.full_name); });
  }, [user.id]);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState(null);

  const num = (v) => (v === "" ? "" : Number(v));
  const setD = (k, v) => setDraft((d) => ({ ...d, [k]: num(v) }));

  const bmi = draft.peso && draft.altezza ? (draft.peso / Math.pow(draft.altezza / 100, 2)).toFixed(1) : "—";
  const bmiLabel = bmi === "—" ? "" : bmi < 18.5 ? "SOTTOPESO" : bmi < 25 ? "NORMOPESO" : bmi < 30 ? "SOVRAPPESO" : "OBESITÀ";

  const saveBody = () => {
    setBody(draft);
    fireToast({ title: tr("◈ DATI SALVATI"), sub: tr("Profilo corporeo aggiornato") });
  };

  const saveAccount = async () => {
    setPwError(null);
    if (username.trim().length < 3) return setPwError("Username: minimo 3 caratteri");
    if (newPw && newPw.length < 6) return setPwError("Nuova password: minimo 6 caratteri");
    const payload = { data: { username: username.trim() } };
    if (newPw) payload.password = newPw;
    const { error } = await supabase.auth.updateUser(payload);
    if (error) return setPwError(error.message);
    await saveMyFullName(user.id, fullName);
    syncMyUsername(user.id, username.trim());
    onUserUpdate({ ...user, username: username.trim() });
    setOldPw(""); setNewPw("");
    fireToast({ title: tr("◈ ACCOUNT AGGIORNATO"), sub: username.trim() });
  };

  return (
    <div className="fade-in two-col">
      {/* LEFT: account */}
      <div className="col stack">
        <Panel accent>
          <div className="row g12" style={{ marginBottom: 12 }}>
            <div className="cham-s" style={{ width: 52, height: 52, background: "var(--active)", border: "1px solid var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={24} color="var(--cyan-hi)" />
            </div>
            <div>
              <div className="f-hud t-bright" style={{ fontWeight: 700, fontSize: 16, letterSpacing: ".1em" }}>{user.username}</div>
              {body.uiMode !== "standard" && <div className="micro">LV.{level} {rank} · STREAK {streak} GIORNI</div>}
              <div className="tiny t-faint">{user.email}</div>
            </div>
          </div>
          <div className="tiny" style={{ margin: "6px 0 10px" }}>
            {premium && premium.is ? (
              <span className="t-amber">◆ ACCOUNT PREMIUM — attivo fino al {new Date(premium.until).toLocaleDateString("it-IT")}</span>
            ) : (
              <span className="t-faint">{tr("Account gratuito ·")} <span onClick={() => premium && premium.open()} className="tap t-cyan" style={{ cursor: "pointer" }}>{tr("passa a Premium ›")}</span></span>
            )}
          </div>
          <div className="row g8" style={{ margin: "10px 0" }}>
            <span className="hud-label" style={{ alignSelf: "center" }}>{tr("Lingua")}</span>
            {LANG_OPTS.map((o) => (
              <button key={o.id} onClick={() => { setLangGlobal(o.id); setBody((b) => ({ ...b, lang: o.id })); }}
                className={"tap cham-s chip " + ((body.lang || "it") === o.id ? "chip-on" : "")}
                style={{ cursor: "pointer", padding: "6px 12px", fontSize: 12 }}>
                {o.flag} {o.label}
              </button>
            ))}
          </div>
          <div className="row g8" style={{ margin: "10px 0" }}>
            <span className="hud-label" style={{ alignSelf: "center" }}>{tr("Stile")}</span>
            {UI_MODES.map((o) => (
              <button key={o.id} onClick={() => setBody((b) => ({ ...b, uiMode: o.id }))}
                className={"tap cham-s chip " + ((body.uiMode || "combat") === o.id ? "chip-on" : "")}
                style={{ cursor: "pointer", padding: "6px 12px", fontSize: 12 }}
                title={tr(o.desc)}>
                <o.Icon size={12} style={{ display: "inline", verticalAlign: -2, marginRight: 4 }} />{tr(o.label)}
              </button>
            ))}
          </div>
          <div className="row g8 wrap">
            <Btn small onClick={onRedoSetup}>{tr("◈ Rifai setup profilo")}</Btn>
            <Btn small onClick={onLogout}><LogOut size={12} style={{ display: "inline", verticalAlign: -2 }} />{tr("Esci")}</Btn>
          </div>
        </Panel>

        {/* Il personal trainer che segue l'utente (max uno) */}
        {trainer && (
          <Panel>
            <div className="hud-label" style={{ marginBottom: 10 }}>{tr("▸ Il tuo personal trainer")}</div>
            <div className="row between g8" style={{ alignItems: "center" }}>
              <div className="row g12" style={{ alignItems: "center" }}>
                <div className="cham-s" style={{ width: 38, height: 38, background: "var(--active)", border: "1px solid var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users size={18} color="var(--cyan-hi)" />
                </div>
                <div>
                  <div className="f-hud t-bright" style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".08em" }}>
                    {(trainer.name || tr("PT ATTIVO")).toUpperCase()}
                  </div>
                  <div className="micro t-faint">{tr("Vede le tue schede e segue i tuoi allenamenti")}</div>
                </div>
              </div>
            </div>
            <div className="tiny t-faint" style={{ margin: "10px 0 8px", lineHeight: 1.6 }}>
              {tr("Per cambiare PT apri il link o il QR del nuovo trainer: sostituirà automaticamente quello attuale.")}
            </div>
            {ptUnlink ? (
              <div className="row g8">
                <Btn small primary onClick={onUnlinkTrainer} style={{ flex: 1 }}>{tr("Conferma scollegamento")}</Btn>
                <Btn small onClick={() => setPtUnlink(false)} style={{ flex: 1 }}>{tr("Annulla")}</Btn>
              </div>
            ) : (
              <Btn small onClick={() => setPtUnlink(true)}>{tr("Scollegati dal PT")}</Btn>
            )}
          </Panel>
        )}

        {ptCard}

        {/* Utilizzo AI settimanale + negozio */}
        <Panel>
          <div className="row between" style={{ marginBottom: 10 }}>
            <div className="hud-label">{tr("▸ Generazioni AI — questa settimana")}</div>
            {usage && <span className="f-hud t-amber" style={{ fontSize: 11, fontWeight: 700 }}>CREDITI: {usage.credits}</span>}
          </div>
          {!usage && !usageErr && <div className="tiny t-faint">{tr("Caricamento utilizzo…")}</div>}
          {usageErr && <div className="tiny t-red">⚠ Impossibile caricare l'utilizzo: {usageErr}</div>}
          {usage && [
            [tr("Generazione scheda AI"), "workout"],
            [tr("Import scheda PT"), "import"],
            [tr("Piano nutrizionale"), "nutrition"],
            [tr("Scan macchinari"), "scan"],
          ].map(([label, k]) => {
            const lim = usage.limits[k], used = usage.used[k];
            return (
              <div key={k} style={{ marginBottom: 10 }}>
                <div className="row between tiny" style={{ marginBottom: 4 }}>
                  <span className="t-dim">{label}</span>
                  <span className={lim === 0 ? "t-faint" : used >= lim ? "t-amber" : "t-bright"}>
                    {lim === 0 ? "PREMIUM" : `${used} / ${lim}`}
                  </span>
                </div>
                <div className="cham-s" style={{ height: 6, background: "var(--soft)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${lim ? Math.min(100, (used / lim) * 100) : 0}%`,
                    background: used >= lim && lim > 0 ? "linear-gradient(90deg,#ffd76a,#ffb84d)" : "linear-gradient(90deg,var(--cyan),var(--cyan-hi))" }} />
                </div>
              </div>
            );
          })}
          <div className="micro t-faint" style={{ margin: "2px 0 10px" }}>
            {tr("I LIMITI SI AZZERANO OGNI SETTIMANA · OLTRE IL LIMITE SI USANO I CREDITI EXTRA")}
          </div>
          <Btn primary full onClick={() => premium && premium.open()}>
            ◈ Negozio — crediti{premium && !premium.is ? " e Premium" : ""} ›
          </Btn>
        </Panel>


        <Panel>
          <div className="hud-label" style={{ marginBottom: 12 }}>{tr("▸ Impostazioni account")}</div>
          <div className="stack-s">
            <div>
              <div className="hud-label" style={{ marginBottom: 4, fontSize: 9 }}>{tr("Username")}</div>
              <input className="hud-input cham-s" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <div className="hud-label" style={{ marginBottom: 4, fontSize: 9 }}>{tr("Nome e cognome")} <span className="t-faint" style={{ textTransform: "none" }}>({tr("visibile al tuo PT")})</span></div>
              <input className="hud-input cham-s" value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder={tr("Es. Mario Rossi")} />
            </div>
            <div>
              <div className="hud-label" style={{ marginBottom: 4, fontSize: 9 }}>{tr("Nuova password")}</div>
              <input className="hud-input cham-s" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                placeholder={tr("Minimo 6 caratteri")} autoComplete="new-password" />
            </div>
            {pwError && <div className="tiny t-red">⚠ {pwError}</div>}
            <Btn primary full onClick={saveAccount}>{tr("Salva account")}</Btn>
          </div>
        </Panel>
      </div>

      {/* RIGHT: body data */}
      <div className="col stack">
        <Panel>
          <div className="hud-label row g6" style={{ marginBottom: 12 }}>
            <Ruler size={13} color="var(--cyan-hi)" /> Dati corporei
          </div>
          <div className="field-grid">
            <BodyField draft={draft} setD={setD} label="Peso" k="peso" unit="kg" step="0.1" />
            <BodyField draft={draft} setD={setD} label="Altezza" k="altezza" unit="cm" />
            <BodyField draft={draft} setD={setD} label="Età" k="eta" unit="anni" />
            <div>
              <div className="hud-label" style={{ marginBottom: 4, fontSize: 9 }}>{tr("Sesso")}</div>
              <div className="row g6">
                {["M", "F"].map((s) => (
                  <button key={s} onClick={() => setDraft((d) => ({ ...d, sesso: s }))}
                    className={`tap cham-s chip ${draft.sesso === s ? "chip-on" : ""}`}
                    style={{ cursor: "pointer", flex: 1, textAlign: "center", padding: "9px 0", fontSize: 13 }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <BodyField draft={draft} setD={setD} label="Massa grassa" k="bf" unit="%" step="0.5" />
          </div>

          <div className="hud-label" style={{ margin: "16px 0 8px", fontSize: 9 }}>{tr("Circonferenze (cm)")}</div>
          <div className="field-grid">
            <BodyField draft={draft} setD={setD} label="Collo" k="collo" step="0.5" />
            <BodyField draft={draft} setD={setD} label="Petto" k="petto" step="0.5" />
            <BodyField draft={draft} setD={setD} label="Vita" k="vita" step="0.5" />
            <BodyField draft={draft} setD={setD} label="Braccio" k="braccio" step="0.5" />
            <BodyField draft={draft} setD={setD} label="Coscia" k="coscia" step="0.5" />
          </div>

          <div className="row between cham-s" style={{ marginTop: 16, padding: "10px 14px", background: "var(--card2)", border: "1px solid var(--soft)" }}>
            <span className="hud-label" style={{ fontSize: 9 }}>{tr("BMI calcolato")}</span>
            <span>
              <span className="f-hud t-cyan" style={{ fontWeight: 700, fontSize: 16 }}>{bmi}</span>
              {bmiLabel && <span className="micro" style={{ marginLeft: 8 }}>{bmiLabel}</span>}
            </span>
          </div>

          <div style={{ marginTop: 12 }}>
            <Btn primary full onClick={saveBody}>
              <Save size={13} style={{ display: "inline", verticalAlign: -2 }} /> Salva dati corporei
            </Btn>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ================================ NUTRITION ================================ */
/* Calcoli standard da app fitness (MacroFactor/MyFitnessPal-style):
   BMR Mifflin-St Jeor · TDEE con fattore attività da giorni di allenamento
   Proteine 2.0-2.2 g/kg · Grassi 0.9 g/kg · Carboidrati = kcal rimanenti */
const calcTargets = (body, days, goal) => {
  const bmr = 10 * body.peso + 6.25 * body.altezza - 5 * body.eta + (body.sesso === "M" ? 5 : -161);
  const actBase = body.attivita === "Sedentaria" ? 1.22 : body.attivita === "Attiva" ? 1.5 : 1.36;
  const tdee = bmr * (actBase + 0.035 * days);
  const mult = goal === "Massa" ? 1.10 : goal === "Definizione" ? 0.82 : 1.0;
  const kcal = Math.round((tdee * mult) / 10) * 10;
  const p = Math.round(body.peso * (goal === "Definizione" ? 2.2 : 2.0));
  const f = Math.round(body.peso * 0.9);
  const c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4));
  return { kcal, p, c, f };
};

/* Percentuali macro che sommano SEMPRE a 100: arrotondamento per difetto
   e distribuzione del resto sulle frazioni più grandi (metodo dei resti). */
const macroPcts = (p, c, f) => {
  const tot = p * 4 + c * 4 + f * 9;
  if (tot <= 0) return [0, 0, 0];
  const raw = [p * 4, c * 4, f * 9].map((k) => (k / tot) * 100);
  const out = raw.map(Math.floor);
  let rem = 100 - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => { if (rem > 0) { out[i]++; rem--; } });
  return out;
};

/* Ricalcolo delle QUANTITÀ dopo la modifica manuale dei target: i tipi di
   cibo restano identici, cambiano solo grammi/ml. Ogni alimento è classificato
   per macro dominante e scalato col fattore del proprio macro (P, C o G). */
const VERDURA_RE = /verdur|insalat|spinaci|broccoli|zucchin|pomodor|cetriol|lattuga|fennel|finocch|peperon|melanzan|asparag|fagiolin|cavol/i;
const PROTEIN_RE = /poll|tacchin|tonno|pesce|salmon|merluzzo|gamber|sgombro|carne|manzo|bresaola|prosciutto|uov|album|whey|proteine|fiocchi di latte|yogurt greco|skyr|ricotta|lenticchie|ceci|fagioli|legumi|tofu|seitan|grana|parmigiano|mozzarella/i;
const FAT_RE = /olio|burro|noci|nocciole|mandorle|anacardi|arachidi|pistacch|avocado|semi|cioccolat|olive|frutta secca/i;
const CARB_RE = /riso|pasta|pane|avena|patat|polenta|cereal|farro|orzo|cous|quinoa|grano|muesli|fiocchi|gallette|cracker|fette|frutta|banana|mela|pera|aranci|kiwi|mirtill|uva|marmellata|miele|zucchero|datteri|fichi/i;

/* Scala la quantità in una stringa tipo "200g" / "250 ml"; pezzi e cucchiai
   restano invariati. Arrotonda a passi sensati (5 sotto i 100, 10 sopra). */
const scaleQ = (q, factor) => {
  const m = String(q).match(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);
  if (!m) return q;
  const v = parseFloat(m[1].replace(",", ".")) * factor;
  const step = v >= 100 ? 10 : 5;
  const nv = Math.max(step, Math.round(v / step) * step);
  return String(q).replace(m[0], `${nv}${m[2].toLowerCase()}`);
};

const rescaleMeals = (meals, oldT, newT) => {
  if (!meals || !oldT || !newT) return meals;
  const fk = newT.kcal / Math.max(1, oldT.kcal);
  const fp = newT.p / Math.max(1, oldT.p);
  const fc = newT.c / Math.max(1, oldT.c);
  const ff = newT.f / Math.max(1, oldT.f);
  const factorFor = (nome) => {
    if (VERDURA_RE.test(nome)) return 1;
    if (PROTEIN_RE.test(nome)) return fp;
    if (FAT_RE.test(nome)) return ff;
    if (CARB_RE.test(nome)) return fc;
    return fk;
  };
  const out = {};
  for (const [meal, opts] of Object.entries(meals))
    out[meal] = asOptions(opts).map((opt) =>
      opt.map((food) => ({ ...food, q: scaleQ(food.q, factorFor(food.nome || "")) })));
  return out;
};

/* Piano di fallback locale (se l'API non risponde): template scalato sulle kcal */
/* Piano template usato se l'AI non risponde: come la generazione AI,
   3 OPZIONI equivalenti per ogni pasto (ruotano da sole ogni giorno) */
const FALLBACK_PLAN = (t) => {
  const scale = t.kcal / 2400;
  const s = (g) => Math.round((g * scale) / 5) * 5;
  return {
    Colazione: [
      [
        { nome: "Avena", q: `${s(80)}g` }, { nome: "Yogurt greco 0%", q: `${s(200)}g` },
        { nome: "Banana", q: "1 media" }, { nome: "Mandorle", q: `${s(15)}g` },
      ],
      [
        { nome: "Uova", q: "3" }, { nome: "Pane integrale", q: `${s(80)}g` },
        { nome: "Marmellata", q: `${s(20)}g` }, { nome: "Spremuta d'arancia", q: "1" },
      ],
      [
        { nome: "Fiocchi di latte", q: `${s(250)}g` }, { nome: "Avena", q: `${s(70)}g` },
        { nome: "Miele", q: `${s(15)}g` }, { nome: "Frutta fresca", q: `${s(150)}g` },
      ],
    ],
    Pranzo: [
      [
        { nome: "Petto di pollo", q: `${s(180)}g` }, { nome: "Riso basmati", q: `${s(90)}g` },
        { nome: "Verdure miste", q: "a volontà" }, { nome: "Olio EVO", q: `${s(10)}g` },
      ],
      [
        { nome: "Pasta", q: `${s(100)}g` }, { nome: "Tonno al naturale", q: `${s(150)}g` },
        { nome: "Verdure miste", q: "a volontà" }, { nome: "Olio EVO", q: `${s(10)}g` },
      ],
      [
        { nome: "Manzo magro", q: `${s(170)}g` }, { nome: "Patate", q: `${s(400)}g` },
        { nome: "Verdure miste", q: "a volontà" }, { nome: "Olio EVO", q: `${s(10)}g` },
      ],
    ],
    "Spuntino pre-workout": [
      [
        { nome: "Pane integrale", q: `${s(60)}g` }, { nome: "Bresaola", q: `${s(60)}g` },
      ],
      [
        { nome: "Gallette di riso", q: "4" }, { nome: "Miele", q: `${s(15)}g` },
        { nome: "Yogurt greco 0%", q: `${s(170)}g` },
      ],
      [
        { nome: "Panino", q: `${s(70)}g` }, { nome: "Prosciutto cotto", q: `${s(60)}g` },
      ],
    ],
    "Post-workout": [
      [
        { nome: "Whey protein", q: "30g" }, { nome: "Banana", q: "1 media" },
      ],
      [
        { nome: "Whey protein", q: "30g" }, { nome: "Gallette di riso", q: "4" },
        { nome: "Miele", q: `${s(15)}g` },
      ],
      [
        { nome: "Latte scremato", q: `${s(400)}ml` }, { nome: "Whey protein", q: "20g" },
        { nome: "Datteri", q: `${s(30)}g` },
      ],
    ],
    Cena: [
      [
        { nome: "Salmone o pesce bianco", q: `${s(180)}g` }, { nome: "Patate", q: `${s(250)}g` },
        { nome: "Verdure", q: "a volontà" }, { nome: "Olio EVO", q: `${s(10)}g` },
      ],
      [
        { nome: "Uova", q: "3" }, { nome: "Pane integrale", q: `${s(70)}g` },
        { nome: "Verdure", q: "a volontà" }, { nome: "Olio EVO", q: `${s(10)}g` },
      ],
      [
        { nome: "Petto di tacchino", q: `${s(180)}g` }, { nome: "Cous cous", q: `${s(80)}g` },
        { nome: "Verdure", q: "a volontà" }, { nome: "Olio EVO", q: `${s(10)}g` },
      ],
    ],
  };
};

function MacroBar({ label, grams, kcalPerG, totalKcal, color, pct: pctProp }) {
  const pct = pctProp != null ? pctProp : Math.round(((grams * kcalPerG) / totalKcal) * 100);
  return (
    <div>
      <div className="row between" style={{ marginBottom: 3 }}>
        <span className="hud-label" style={{ fontSize: 9 }}>{label}</span>
        <span className="tiny"><span className="f-hud" style={{ color, fontWeight: 700 }}>{grams}g</span> <span className="t-faint">· {pct}%</span></span>
      </div>
      <div className="cham-s" style={{ height: 6, background: "var(--soft)" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}`, transition: "width .5s ease" }} />
      </div>
    </div>
  );
}





/* ordine cronologico dei pasti: usa la finestra alimentare se presente,
   altrimenti una classifica per nome (digiuno → colazione → ... → cena) */
const MEAL_RANK = [
  [/digiun|fasting/i, 0], [/colazione|breakfast/i, 10], [/spuntino.*mattin|mid.?morning/i, 20],
  [/pre.?workout|pre.?allenamento/i, 30], [/pranzo|lunch/i, 40],
  [/post.?workout|post.?allenamento/i, 50], [/merenda|spuntino.*pomeri/i, 60],
  [/snack|spuntino/i, 65], [/cena|dinner/i, 80], [/spuntino.*ser|prima di dormire|notte/i, 90],
];
const mealRank = (name, window) => {
  if (window && window.length) {
    const i = window.findIndex((w) => (w.label || "").toLowerCase() === (name || "").toLowerCase());
    if (i >= 0) return i;                       // rispetta l'ordine della finestra alimentare
    const j = window.findIndex((w) => (name || "").toLowerCase().includes((w.label || "").toLowerCase()));
    if (j >= 0) return j;
  }
  for (const [re, r] of MEAL_RANK) if (re.test(name || "")) return 100 + r;
  return 999;
};
const sortMeals = (entries, window) =>
  [...entries].sort((a, b) => mealRank(a[0], window) - mealRank(b[0], window));

/* ---------------- Parsing tollerante delle risposte AI ---------------- */
/* ---------------- Stima calorica live ---------------- */
/* Tabella generica per 100 g (o per pezzo dove indicato): serve solo a dare
   una stima immediata mentre componi, non è un database nutrizionale completo. */
const KCAL_DB = [
  { k: ["petto di pollo", "pollo", "tacchino", "fesa"], p: 23, c: 0, f: 2 },
  { k: ["manzo", "bovino", "vitello"], p: 21, c: 0, f: 6 },
  { k: ["merluzzo", "orata", "branzino", "pesce bianco", "platessa"], p: 18, c: 0, f: 1 },
  { k: ["salmone"], p: 20, c: 0, f: 13 },
  { k: ["tonno"], p: 25, c: 0, f: 1 },
  { k: ["gambero", "gamberetti", "seppia", "polpo"], p: 18, c: 1, f: 1 },
  { k: ["bresaola"], p: 32, c: 0, f: 2 },
  { k: ["prosciutto crudo"], p: 27, c: 0, f: 12 },
  { k: ["prosciutto cotto"], p: 20, c: 1, f: 8 },
  { k: ["uova intere", "uovo intero", "uova"], p: 13, c: 1, f: 11, unit: 55 },
  { k: ["albume", "albumi"], p: 11, c: 1, f: 0 },
  { k: ["yogurt greco", "skyr"], p: 10, c: 4, f: 0 },
  { k: ["fiocchi di latte", "ricotta"], p: 12, c: 3, f: 6 },
  { k: ["whey", "proteine in polvere", "proteine polvere"], p: 78, c: 8, f: 6 },
  { k: ["parmigiano", "grana"], p: 33, c: 0, f: 29 },
  { k: ["mozzarella"], p: 18, c: 1, f: 16 },
  { k: ["tofu"], p: 12, c: 2, f: 7 },
  { k: ["tempeh"], p: 19, c: 9, f: 11 },
  { k: ["seitan"], p: 24, c: 14, f: 2 },
  { k: ["lenticchie", "ceci", "fagioli"], p: 9, c: 20, f: 1 },
  { k: ["riso"], p: 7, c: 78, f: 1 },
  { k: ["pasta"], p: 12, c: 72, f: 2 },
  { k: ["polenta", "farina di mais"], p: 8, c: 76, f: 3 },
  { k: ["patate dolci"], p: 2, c: 20, f: 0 },
  { k: ["patate"], p: 2, c: 17, f: 0 },
  { k: ["pane"], p: 9, c: 48, f: 3 },
  { k: ["avena", "fiocchi d'avena"], p: 13, c: 62, f: 7 },
  { k: ["couscous", "bulgur"], p: 12, c: 72, f: 1 },
  { k: ["quinoa"], p: 14, c: 64, f: 6 },
  { k: ["gallette"], p: 8, c: 81, f: 3 },
  { k: ["banana"], p: 1, c: 23, f: 0, unit: 120 },
  { k: ["mela", "pera"], p: 0, c: 14, f: 0, unit: 180 },
  { k: ["frutti di bosco", "fragole"], p: 1, c: 8, f: 0 },
  { k: ["arancia", "agrumi"], p: 1, c: 12, f: 0, unit: 180 },
  { k: ["olio"], p: 0, c: 0, f: 100 },
  { k: ["burro d'arachidi", "burro di arachidi"], p: 25, c: 20, f: 50 },
  { k: ["mandorle", "noci", "nocciole", "frutta secca", "anacardi"], p: 18, c: 8, f: 55 },
  { k: ["avocado"], p: 2, c: 9, f: 15 },
  { k: ["semi di chia", "semi di lino", "semi"], p: 17, c: 42, f: 31 },
  { k: ["cioccolato fondente", "fondente"], p: 10, c: 22, f: 46 },
  { k: ["miele", "marmellata"], p: 0, c: 78, f: 0 },
  { k: ["maltodestrine"], p: 0, c: 95, f: 0 },
  { k: ["barretta"], p: 33, c: 40, f: 13 },
  { k: ["verdure", "verdura", "insalata", "broccoli", "spinaci", "zucchine", "pomodori", "peperoni", "melanzane", "funghi", "finocchi"], p: 2, c: 5, f: 0 },
  { k: ["carote"], p: 1, c: 10, f: 0 },
];
const norm = (s) => (s || "").toLowerCase().replace(/[^a-zà-ù0-9 ]/gi, " ").replace(/\s+/g, " ").trim();
const findKcalEntry = (name) => {
  const n = norm(name);
  let best = null, bestLen = 0;
  for (const e of KCAL_DB) for (const key of e.k) {
    if (n.includes(key) && key.length > bestLen) { best = e; bestLen = key.length; }
  }
  return best;
};
/* interpreta "200g", "1", "12-15g", "150 g", "A volontà" -> grammi (null se non stimabile) */
const parseQty = (q, entry) => {
  const s = norm(q);
  if (!s || /volont|libero|q b/.test(s)) return null;
  const range = s.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const g = s.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|grammi)\b/);
  if (g) return Number(g[1].replace(",", "."));
  const ml = s.match(/(\d+(?:[.,]\d+)?)\s*ml\b/);
  if (ml) return Number(ml[1].replace(",", "."));
  const cucch = s.match(/(\d+)?\s*cucchiai?o?/);
  if (cucch) return (Number(cucch[1]) || 1) * 12;
  const pcs = s.match(/^(\d+(?:[.,]\d+)?)/);
  if (pcs && entry && entry.unit) return Number(pcs[1].replace(",", ".")) * entry.unit;
  if (pcs) return Number(pcs[1].replace(",", ".")) * 100;
  return null;
};
/* stima macro di una voce {q, n}; null se non stimabile */
const estimateOne = (text) => {
  const e = findKcalEntry(text);
  if (!e) return null;
  const g = parseQty(text, e);
  if (g == null) return null;
  return { p: e.p * g / 100, c: e.c * g / 100, f: e.f * g / 100 };
};
/* gestisce anche le voci composte: "3 uova intere + 100g albumi" */
const estimate = (item) => {
  const parts = `${item.q || ""} ${item.n || ""}`.split("+");
  let tot = { p: 0, c: 0, f: 0 }, hit = false;
  for (const part of parts) {
    const m = estimateOne(part);
    if (m) { tot = { p: tot.p + m.p, c: tot.c + m.c, f: tot.f + m.f }; hit = true; }
  }
  if (!hit) return null;
  return { ...tot, kcal: Math.round(tot.p * 4 + tot.c * 4 + tot.f * 9) };
};
const sumEstimates = (items) => items.reduce((a, it) => {
  const e = estimate(it);
  return e ? { p: a.p + e.p, c: a.c + e.c, f: a.f + e.f, kcal: a.kcal + e.kcal, known: a.known + 1 }
           : { ...a, unknown: a.unknown + 1 };
}, { p: 0, c: 0, f: 0, kcal: 0, known: 0, unknown: 0 });

/* ============================ PIANO A FONTI (unificato) ============================ */
/* Un solo piano, due letture: la finestra alimentare (quando mangi) e le fonti
   intercambiabili divise per categoria (cosa scegli). Componi il pasto scegliendo
   un'opzione per categoria, come nelle schede dei nutrizionisti. */
const CAT_COLORS = {
  "Fonti proteiche": "var(--cyan)",
  "Fonti carboidrati": "#ffd76a",
  "Grassi e fibre": "#7ee0a8",
  "Snack / Post-workout": "var(--cyan-hi)",
};
const CAT_ORDER = ["Fonti proteiche", "Fonti carboidrati", "Grassi e fibre", "Snack / Post-workout"];

/* piano di esempio: usato finché non se ne genera o importa uno */
const DEFAULT_SOURCE_PLAN = {
  protocol: "PROTOCOLLO BASE",
  window: [
    { time: "07:30 - 08:30", label: "Colazione", note: "" },
    { time: "12:30 - 13:30", label: "Pranzo", note: "Pasto A — modello interscambiabile" },
    { time: "16:30 - 17:00", label: "Snack / Post-workout", note: "" },
    { time: "19:30 - 20:30", label: "Cena", note: "Pasto B — modello interscambiabile" },
  ],
  categories: [
    { name: "Fonti proteiche", rule: "SCEGLI 1", items: [
      { q: "200g", n: "Petto di pollo / tacchino" },
      { q: "3 uova intere + 100g", n: "albumi", alt: "o 3 uova + 30g parmigiano" },
      { q: "220g", n: "Pesce bianco (merluzzo, orata)" },
      { q: "180g", n: "Salmone" },
      { q: "160g", n: "Tonno al naturale" },
    ] },
    { name: "Fonti carboidrati", rule: "SCEGLI 1", items: [
      { q: "100g", n: "Riso (basmati, venere, integrale)" },
      { q: "100g", n: "Pasta (integrale o semola)" },
      { q: "100g", n: "Polenta (peso a secco)" },
      { q: "400g", n: "Patate dolci o bianche" },
    ] },
    { name: "Grassi e fibre", rule: "A PASTO", items: [
      { q: "A volontà", n: "Verdure a foglia verde o di stagione" },
      { q: "12-15g", n: "Olio EVO (1 cucchiaio abbondante)", alt: "1 cucchiaino se scegli 3 uova intere" },
    ] },
    { name: "Snack / Post-workout", rule: "SCEGLI QUANTI VUOI", items: [
      { q: "150g", n: "Yogurt greco 0%" },
      { q: "30g", n: "Proteine in polvere (whey)" },
      { q: "1", n: "Banana o mela grande (~180-200g)" },
      { q: "15g", n: "Frutta secca (mandorle / noci)" },
    ] },
  ],
  directives: "Pranzo e Cena sono totalmente interscambiabili. Mantenere l'idratazione a 2.5-3 litri d'acqua al giorno.",
};

/* opzioni generiche sempre disponibili in aggiunta a quelle del piano */
const GENERIC_EXTRA = {
  "Fonti proteiche": [
    { q: "150g", n: "Bresaola / affettato magro" }, { q: "200g", n: "Gamberi o seppie" },
    { q: "150g", n: "Ricotta o fiocchi di latte" }, { q: "200g", n: "Legumi cotti (lenticchie, ceci)" },
    { q: "150g", n: "Tofu o tempeh" },
  ],
  "Fonti carboidrati": [
    { q: "80g", n: "Avena o fiocchi d'avena" }, { q: "100g", n: "Couscous o bulgur" },
    { q: "80g", n: "Quinoa" }, { q: "120g", n: "Pane integrale" }, { q: "40g", n: "Gallette di riso" },
  ],
  "Grassi e fibre": [
    { q: "20g", n: "Mandorle o noci" }, { q: "15g", n: "Burro d'arachidi" },
    { q: "80g", n: "Avocado" }, { q: "20g", n: "Semi di chia o lino" }, { q: "30g", n: "Parmigiano" },
  ],
  "Snack / Post-workout": [
    { q: "1", n: "Frutto di stagione" }, { q: "25g", n: "Cioccolato fondente 85%" },
    { q: "40g", n: "Barretta proteica" }, { q: "30g", n: "Maltodestrine (post-workout)" },
    { q: "200g", n: "Yogurt greco 0%" },
  ],
};

function SourcePlanView({ plan, targets, body, picks, setPicks, onImport, onRegen, loading, onReorder }) {
  const cats = plan.categories || [];
  const [addFor, setAddFor] = useState(null);        // categoria in cui si sta aggiungendo a mano
  const [nf, setNf] = useState({ q: "", n: "" });

  /* normalizza: il vecchio formato salvava un solo indice per categoria */
  const sel = {}, custom = (picks && picks.__custom) || {};
  for (const c of cats) {
    const v = picks ? picks[c.name] : undefined;
    sel[c.name] = Array.isArray(v) ? v : (v == null ? [] : [v]);
  }
  const single = (c) => /scegli\s*1/i.test(c.rule || "");

  const toggle = (c, idx) => {
    const cur = sel[c.name];
    const next = single(c)
      ? (cur.includes(idx) ? [] : [idx])
      : (cur.includes(idx) ? cur.filter((x) => x !== idx) : [...cur, idx]);
    setPicks({ ...picks, __custom: custom, [c.name]: next });
  };
  const addCustom = (catName) => {
    if (!nf.n.trim()) return;
    const list = [...(custom[catName] || []), { q: nf.q.trim(), n: nf.n.trim() }];
    setPicks({ ...picks, __custom: { ...custom, [catName]: list } });
    setNf({ q: "", n: "" }); setAddFor(null);
  };
  const delCustom = (catName, i) => {
    const list = (custom[catName] || []).filter((_, j) => j !== i);
    setPicks({ ...picks, __custom: { ...custom, [catName]: list } });
  };

  /* voci scelte + totali stimati */
  const chosen = [];
  for (const c of cats) {
    for (const i of sel[c.name]) if (c.items && c.items[i]) chosen.push({ ...c.items[i], cat: c.name });
    for (const it of (custom[c.name] || [])) chosen.push({ ...it, cat: c.name, custom: true });
  }
  const tot = sumEstimates(chosen);
  const liveNf = nf.n.trim() ? estimate(nf) : null;

  const Est = ({ item, dim }) => {
    const e = estimate(item);
    if (!e) return <span className="micro t-faint">~</span>;
    return <span className={`micro ${dim ? "t-faint" : "t-cyan"}`}>{e.kcal} kcal</span>;
  };

  return (
    <div className="fade-in stack" style={{ maxWidth: 780 }}>
      <Panel accent style={{ borderColor: "#ffd76a" }}>
        <div className="f-hud t-amber" style={{ fontWeight: 700, letterSpacing: ".2em", fontSize: 15 }}>
          {tr("PIANO NUTRIZIONALE")}
        </div>
        <div className="micro t-cyan" style={{ marginTop: 3 }}>{plan.protocol || ""}</div>
        {targets && (
          <div className="micro t-faint" style={{ marginTop: 6 }}>
            TARGET {targets.kcal} KCAL · P{targets.p} C{targets.c} G{targets.f}
            {body && body.peso ? ` · ${body.peso} KG` : ""}
          </div>
        )}
      </Panel>

      {(plan.window || []).length > 0 && (
        <Panel>
          <div className="hud-label" style={{ marginBottom: 10 }}>{tr("▸ Finestra alimentare & tempistiche")}</div>
          {plan.window.map((w, i) => (
            <div key={i} className="row g12" style={{ padding: "8px 0", borderBottom: "1px solid var(--hairline)", alignItems: "flex-start" }}>
              <div className="f-hud t-cyan" style={{ fontSize: 12, fontWeight: 700, width: 106, flexShrink: 0,
                borderLeft: `2px solid ${w.fasting ? "var(--faint)" : "#ffd76a"}`, paddingLeft: 8 }}>{w.time}</div>
              <div className="grow">
                <div className={w.fasting ? "t-faint" : "t-bright"} style={{ fontSize: 14, fontWeight: 700 }}>{w.label}</div>
                {w.note && <div className="tiny t-faint">{w.note}</div>}
              </div>
            </div>
          ))}
        </Panel>
      )}

      <div className="two-col" data-dl>
        {cats.map((c) => {
          const color = CAT_COLORS[c.name] || "var(--cyan)";
          const extra = GENERIC_EXTRA[c.name] || [];
          const base = c.items || [];
          const all = [...base, ...extra];
          return (
            <Panel key={c.name} style={{ borderLeft: `3px solid ${color}` }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <span className="row g8" style={{ alignItems: "center" }}>
                  <span className="drag-handle" title={tr("Trascina per riordinare")}
                    onPointerDown={(e) => dlStart(e, onReorder || (() => {}))}><GripVertical size={14} /></span>
                  <span className="f-hud" style={{ color, fontSize: 12, fontWeight: 700, letterSpacing: ".15em" }}>
                    {c.name.toUpperCase()}
                  </span>
                </span>
                <span className="micro t-faint">{single(c) ? tr("(SCEGLI 1)") : tr("(SCELTA MULTIPLA)")}</span>
              </div>

              {all.map((it, i) => {
                const on = sel[c.name].includes(i);
                return (
                  <button key={i} onClick={() => toggle(c, i)} className="tap cham-s"
                    style={{ width: "100%", textAlign: "left", cursor: "pointer", padding: "9px 10px", marginBottom: 5,
                      border: `1px solid ${on ? color : "var(--soft)"}`, background: on ? "#0c2233" : "var(--card2)" }}>
                    <div className="row between g8">
                      <div style={{ fontSize: 14, lineHeight: 1.4 }}>
                        <span className="f-hud" style={{ color: on ? color : "#c9e8f7", fontWeight: 700 }}>{it.q}</span>
                        <span className={on ? "t-bright" : "t-dim"}> {it.n}</span>
                        {i >= base.length && <span className="micro t-faint"> · {tr("generico")}</span>}
                      </div>
                      <Est item={it} dim={!on} />
                    </div>
                    {it.alt && <div className="micro t-faint" style={{ marginTop: 2 }}>({it.alt})</div>}
                  </button>
                );
              })}

              {(custom[c.name] || []).map((it, i) => (
                <div key={"c" + i} className="cham-s row between g8"
                  style={{ padding: "9px 10px", marginBottom: 5, border: `1px solid ${color}`, background: "#0c2233" }}>
                  <div style={{ fontSize: 14 }}>
                    <span className="f-hud" style={{ color, fontWeight: 700 }}>{it.q}</span>
                    <span className="t-bright"> {it.n}</span>
                    <span className="micro t-faint"> · {tr("tuo")}</span>
                  </div>
                  <div className="row g8" style={{ alignItems: "center" }}>
                    <Est item={it} />
                    <span onClick={() => delCustom(c.name, i)} className="tap icon-tap" style={{ color: "#6e4038" }}><X size={13} /></span>
                  </div>
                </div>
              ))}

              {addFor === c.name ? (
                <div className="cham-s stack-s" style={{ padding: 10, background: "var(--card)", border: "1px solid var(--soft2)" }}>
                  <div className="row g6">
                    <input className="hud-input cham-s" value={nf.q} onChange={(e) => setNf({ ...nf, q: e.target.value })}
                      placeholder={tr("Quantità")} style={{ width: 88, textAlign: "center", fontSize: 13, padding: "7px 6px" }} />
                    <input className="hud-input cham-s" value={nf.n} onChange={(e) => setNf({ ...nf, n: e.target.value })}
                      placeholder={tr("Alimento")} style={{ flex: 1, fontSize: 13, padding: "7px 8px" }} />
                  </div>
                  <div className="row between" style={{ alignItems: "center" }}>
                    <span className="micro t-cyan">
                      {liveNf ? `≈ ${liveNf.kcal} kcal · P${Math.round(liveNf.p)} C${Math.round(liveNf.c)} G${Math.round(liveNf.f)}`
                              : tr("stima non disponibile")}
                    </span>
                    <div className="row g6">
                      <Btn small onClick={() => { setAddFor(null); setNf({ q: "", n: "" }); }}>{tr("Annulla")}</Btn>
                      <Btn small primary onClick={() => addCustom(c.name)} disabled={!nf.n.trim()}>{tr("Aggiungi")}</Btn>
                    </div>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAddFor(c.name); setNf({ q: "", n: "" }); }} className="dash-btn cham-s tap">
                  ＋ {tr("AGGIUNGI ALIMENTO")}
                </button>
              )}
            </Panel>
          );
        })}
      </div>

      <Panel accent>
        <div className="row between" style={{ marginBottom: 10 }}>
          <div>
            <div className="f-hud t-cyan" style={{ fontWeight: 700, fontSize: 24 }}>≈ {tot.kcal}</div>
            <div className="micro">{tr("KCAL STIMATE")}{targets ? ` / ${targets.kcal}` : ""}</div>
          </div>
          {chosen.length > 0 && <Btn small onClick={() => setPicks({})}>{tr("Svuota")}</Btn>}
        </div>
        {targets && chosen.length > 0 && (
          <div className="stack-s" style={{ marginBottom: 10 }}>
            {[["Proteine", tot.p, targets.p, "var(--cyan)"], ["Carboidrati", tot.c, targets.c, "var(--cyan-hi)"], ["Grassi", tot.f, targets.f, "#ffd76a"]].map(([l, cur, goal, col]) => (
              <div key={l}>
                <div className="row between tiny" style={{ marginBottom: 3 }}>
                  <span className="t-dim">{tr(l)}</span>
                  <span className={cur > goal * 1.05 ? "t-amber" : "t-bright"}>{Math.round(cur)} / {goal} g</span>
                </div>
                <div className="cham-s" style={{ height: 6, background: "var(--soft)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, goal ? (cur / goal) * 100 : 0)}%`,
                    background: cur > goal * 1.05 ? "#ffd76a" : col, transition: "width .3s" }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {chosen.length === 0 && <div className="tiny t-faint">{tr("Tocca le opzioni per comporre il pasto.")}</div>}
        {chosen.map((it, i) => (
          <div key={i} className="divider-row">
            <span style={{ fontSize: 14 }}>
              <span className="f-hud t-cyan" style={{ fontWeight: 700 }}>{it.q}</span> {it.n}
            </span>
            <Est item={it} />
          </div>
        ))}
        {tot.unknown > 0 && (
          <div className="micro t-faint" style={{ marginTop: 8 }}>
            {tot.unknown} {tr("VOCI NON STIMABILI NON INCLUSE NEL TOTALE")}
          </div>
        )}
      </Panel>

      {plan.directives && (
        <Panel>
          <div className="hud-label" style={{ marginBottom: 6 }}>{tr("▸ Direttive operative")}</div>
          <div className="tiny t-dim" style={{ lineHeight: 1.7 }}>{plan.directives}</div>
        </Panel>
      )}

      <div className="row g8">
        <Btn onClick={onImport} style={{ flex: 1 }}>{tr("⤓ Importa piano")}</Btn>
        <Btn primary onClick={onRegen} disabled={loading} style={{ flex: 1 }}>
          {loading ? tr("Generazione...") : tr("◈ Rigenera con AI")}
        </Btn>
      </div>
      <div className="micro">{tr("Stime indicative: consulta un professionista per esigenze specifiche.")}</div>
    </div>
  );
}

function NutriSubTabs({ value, onChange }) {
  return (
    <div className="row g6">
      {[["plan", tr("PASTI GIORNALIERI")], ["compose", tr("FONTI E COMPOSIZIONE")]].map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`tap cham-s chip ${value === k ? "chip-on" : ""}`}
          style={{ cursor: "pointer", flex: 1, textAlign: "center", padding: "8px 0", fontSize: 10 }}>
          {l}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Opzioni pasto: rotazione giornaliera + editor ---------------- */
/* Struttura: meals["Pranzo"] = [ [cibo,...], [cibo,...] ]  (una lista per opzione).
   I piani vecchi con una sola lista piatta vengono normalizzati automaticamente. */
const asOptions = (v) =>
  Array.isArray(v) && v.length && Array.isArray(v[0]) ? v : [Array.isArray(v) ? v : []];
/* indice del giorno: fa ruotare le opzioni senza salvare nulla */
const dayIndex = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
const optionForToday = (opts, offset = 0) => opts[(dayIndex() + offset) % opts.length] || [];

function MealEditor({ meal, options, todayIdx, onClose, onSave }) {
  const [opts, setOpts] = useState(() => JSON.parse(JSON.stringify(options)));
  const [sel, setSel] = useState(todayIdx);

  const upd = (oi, fi, field, val) => setOpts((o) =>
    o.map((opt, i) => i !== oi ? opt : opt.map((f, j) => j !== fi ? f : { ...f, [field]: val })));
  const addFood = (oi) => setOpts((o) => o.map((opt, i) => i !== oi ? opt : [...opt, { nome: "", q: "" }]));
  const delFood = (oi, fi) => setOpts((o) => o.map((opt, i) => i !== oi ? opt : opt.filter((_, j) => j !== fi)));
  const addOpt = () => { setOpts((o) => [...o, [{ nome: "", q: "" }]]); setSel(opts.length); };
  const delOpt = (oi) => {
    if (opts.length <= 1) return;
    setOpts((o) => o.filter((_, i) => i !== oi));
    setSel((s) => (s >= opts.length - 1 ? opts.length - 2 : s));
  };

  return (
    <Overlay>
    <div className="modal-back" onClick={onClose}>
      <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 2 }}>
          <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".18em", fontSize: 13 }}>◈ {meal.toUpperCase()}</div>
          <span onClick={onClose} className="tap t-faint" style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0" }}>✕</span>
        </div>
        <div className="tiny t-faint" style={{ marginBottom: 12 }}>
          {opts.length} {tr("OPZIONI · RUOTANO OGNI GIORNO")}
        </div>

        {/* selettore opzioni */}
        <div className="row wrap g6" style={{ marginBottom: 14 }}>
          {opts.map((_, i) => (
            <button key={i} onClick={() => setSel(i)}
              className={`tap cham-s chip ${sel === i ? "chip-on" : ""}`}
              style={{ cursor: "pointer", padding: "6px 12px", fontSize: 11 }}>
              {tr("OPZIONE")} {i + 1}{i === todayIdx ? " ★" : ""}
            </button>
          ))}
          <button onClick={addOpt} className="tap cham-s chip" style={{ cursor: "pointer", padding: "6px 12px", fontSize: 11 }}>＋</button>
        </div>

        {/* alimenti dell'opzione selezionata */}
        {(opts[sel] || []).map((f, fi) => (
          <div key={fi} className="row g6" style={{ marginBottom: 6, alignItems: "center" }}>
            <input className="hud-input cham-s" value={f.nome} onChange={(e) => upd(sel, fi, "nome", e.target.value)}
              placeholder={tr("Alimento")} style={{ flex: 2, fontSize: 13, padding: "7px 8px" }} />
            <input className="hud-input cham-s" value={f.q} onChange={(e) => upd(sel, fi, "q", e.target.value)}
              placeholder={tr("Quantità")} style={{ flex: 1, fontSize: 13, padding: "7px 8px", textAlign: "center" }} />
            <span onClick={() => delFood(sel, fi)} className="tap icon-tap" style={{ color: "#6e4038" }}><X size={14} /></span>
          </div>
        ))}
        <button onClick={() => addFood(sel)} className="dash-btn cham-s tap" style={{ marginTop: 4 }}>＋ {tr("ALIMENTO")}</button>

        <div className="row g8" style={{ marginTop: 16 }}>
          {opts.length > 1 && (
            <Btn small onClick={() => delOpt(sel)} style={{ flex: 1, borderColor: "#6e3028", color: "#ff8f7d" }}>
              {tr("Elimina opzione")}
            </Btn>
          )}
          <Btn small primary onClick={() => onSave(opts.map((o) => o.filter((f) => f.nome.trim())))} style={{ flex: 2 }}>
            {tr("Salva ✓")}
          </Btn>
        </div>
      </div>
    </div>
    </Overlay>
  );
}

/* ---------------- Import piano nutrizionale (AI) ---------------- */
function NutriImport({ premium, body, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [pasted, setPasted] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const interpret = async () => {
    if (premium && premium.guest) return premium.open();  // ospite: nessuna funzione AI
    setLoading(true); setError(null);
    try {
      let content;
      const prompt = `Il documento/testo sopra è un piano alimentare scritto da un nutrizionista o dall'utente (formato libero).
Interpretalo e convertilo in JSON. Rispondi SOLO con JSON valido, senza markdown né backtick.
Schema: {"targets":{"kcal":number,"p":number,"c":number,"f":number},
 "meals":{"NomePasto":[[{"nome":string,"q":string}]]},
 "sourcePlan":{"protocol":string,"window":[{"time":string,"label":string,"note":string,"fasting":boolean}],
   "categories":[{"name":string,"rule":string,"items":[{"q":string,"n":string,"alt":string}]}],"directives":string}}
IMPORTANTE: molte schede sono organizzate per FONTI INTERCAMBIABILI (es. "FONTI PROTEICHE — SCEGLI 1: 200g pollo / 220g pesce bianco / 160g tonno") con una finestra alimentare e gli orari dei pasti. In quel caso compila "sourcePlan" fedelmente: categorie con i loro nomi e regole ("SCEGLI 1", "A PASTO"), ogni opzione con quantità in "q" e alimento in "n", eventuali alternative fra parentesi in "alt", e la fascia di digiuno con "fasting":true.
Compila "meals" con 3 OPZIONI di pasto già composte per ciascun pasto della finestra (3 combinazioni valide e diverse delle fonti, ognuna come array di alimenti: "NomePasto":[[{...}],[{...}],[{...}]]). Se il documento elenca solo pasti fissi, restituisci una sola opzione per pasto e lascia "sourcePlan" a null.
REGOLE:
- Usa ESATTAMENTE i pasti presenti nel documento, con i loro nomi (es. "Colazione", "Pranzo", "Spuntino", "Cena"). Se il piano prevede il digiuno intermittente e ha solo 2 pasti, restituisci solo quei 2.
- Se i valori di kcal o macro non sono indicati, stimali dagli alimenti elencati.
- "q" è la quantità come scritta nel documento (es. "80g", "2 uova", "1 tazza").`;

      if (file) {
        const isPdf = file.type === "application/pdf";
        const isImg = (file.type || "").startsWith("image/");
        let block;
        if (isImg) {
          const r = await resizeImage(file, 1400);   // foto: ridimensionate prima dell'invio
          block = { type: "image", source: { type: "base64", media_type: r.type, data: r.b64 } };
        } else {
          if (isPdf && file.size > 3.5 * 1024 * 1024)
            throw new Error(tr("PDF troppo grande (max 3.5 MB): comprimilo o incolla il testo."));
          const b64 = await new Promise((ok, ko) => {
            const rd = new FileReader();
            rd.onload = () => ok(rd.result.split(",")[1]);
            rd.onerror = () => ko(new Error("Lettura file fallita"));
            rd.readAsDataURL(file);
          });
          block = isPdf
            ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
            : { type: "text", text: atob(b64) };
        }
        content = [block, { type: "text", text: prompt }];
      } else {
        content = [{ type: "text", text: pasted }, { type: "text", text: prompt }];
      }

      const data = await aiCall({
        model: "claude-haiku-4-5-20251001", max_tokens: 4000,
        messages: [{ role: "user", content }],
      }, "nutrition");

      if (data.error === "limit_reached") { if (premium) premium.open(); throw new Error(tr("Limite settimanale raggiunto")); }
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : (data.error.message || "Errore API"));

      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const parsed = parseLoose(text);
      const tg = parsed.targets || {};
      setResult({
        sourcePlan: parsed.sourcePlan || null,
        targets: {
          kcal: Number(tg.kcal) || 0, p: Number(tg.p) || 0,
          c: Number(tg.c) || 0, f: Number(tg.f) || 0,
        },
        meals: Object.fromEntries(Object.entries(parsed.meals && typeof parsed.meals === "object" ? parsed.meals : {}).map(([k, v]) => [k, asOptions(v)])),
      });
    } catch (e) {
      setError(e.message || "Errore");
    }
    setLoading(false);
  };

  return (
    <div className="fade-in stack" style={{ maxWidth: 560 }}>
      <div className="row between">
        <Btn small onClick={onClose}>{tr("‹ Annulla")}</Btn>
        <span className="hud-title">{tr("Importa piano nutrizionale")}</span>
        <span style={{ width: 60 }} />
      </div>

      {!result && (
        <>
          <Panel accent>
            <input ref={inputRef} type="file" accept=".pdf,image/*,.txt,.md,.csv" style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
            <button onClick={() => inputRef.current && inputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) setFile(f); }}
              className="tap cham"
              style={{ width: "100%", padding: "32px 16px", cursor: "pointer",
                border: `1px dashed ${drag ? "var(--cyan)" : "#2f6786"}`,
                background: drag ? "var(--active)" : "transparent", transition: "background .15s,border-color .15s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Utensils size={26} color="var(--cyan)" />
              <span className="f-hud t-cyan" style={{ fontSize: 12, letterSpacing: ".2em", fontWeight: 700 }}>
                {file ? file.name.slice(0, 34) : tr("CARICA PIANO ALIMENTARE")}
              </span>
              <span className="tiny t-dim">
                {file ? tr("TOCCA PER SOSTITUIRE") : tr("Trascina qui il file, oppure tocca — PDF · Foto · Testo")}
              </span>
            </button>
            <div className="micro" style={{ textAlign: "center", margin: "12px 0" }}>{tr("— OPPURE —")}</div>
            <textarea className="hud-input cham-s" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={4}
              placeholder={tr("Incolla qui il tuo piano alimentare...")}
              style={{ resize: "none" }} />
          </Panel>

          {error && (
            <Panel style={{ borderColor: "#6e3028", padding: 12 }}>
              <div className="tiny t-red">⚠ {error}</div>
            </Panel>
          )}

          <Btn primary full disabled={loading || (!file && !pasted.trim())} onClick={interpret}>
            {loading ? <span className="row center g8"><Loader2 size={14} className="spin" /> {tr("Analisi in corso...")}</span> : tr("◈ Interpreta con AI")}
          </Btn>
        </>
      )}

      {result && (
        <>
          <Panel accent>
            <div className="row between" style={{ marginBottom: 10 }}>
              <div>
                <div className="f-hud t-cyan" style={{ fontWeight: 700, fontSize: 22 }}>{result.targets.kcal}</div>
                <div className="micro">{tr("KCAL / GIORNO")}</div>
              </div>
              <div className="micro t-dim" style={{ textAlign: "right", lineHeight: 1.7 }}>
                P {result.targets.p}g<br />C {result.targets.c}g<br />G {result.targets.f}g
              </div>
            </div>
            <div className="micro t-faint">
              {Object.keys(result.meals).length} {tr("PASTI RILEVATI")}
              {result.sourcePlan ? ` · ${(result.sourcePlan.categories || []).length} ${tr("CATEGORIE DI FONTI")}` : ""}
            </div>
          </Panel>

          {result.sourcePlan && (
            <Panel accent style={{ borderColor: "#ffd76a" }}>
              <div className="f-hud t-amber" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 12 }}>
                {tr("PIANO A FONTI INTERCAMBIABILI RILEVATO")}
              </div>
              <div className="tiny t-dim" style={{ marginTop: 6, lineHeight: 1.6 }}>
                {result.sourcePlan.protocol || ""}
                {(result.sourcePlan.window || []).length > 0 && ` · ${result.sourcePlan.window.length} ${tr("fasce orarie")}`}
              </div>
              <div className="micro t-faint" style={{ marginTop: 6 }}>
                {(result.sourcePlan.categories || []).map((c) => c.name).join(" · ")}
              </div>
            </Panel>
          )}

          {sortMeals(Object.entries(result.meals), result.sourcePlan && result.sourcePlan.window).map(([meal, opts]) => (
            <Panel key={meal}>
              <div className="hud-label" style={{ marginBottom: 6 }}>▸ {meal} <span className="t-faint">({asOptions(opts).length} {tr("opzioni")})</span></div>
              {(asOptions(opts)[0] || []).map((f, i) => (
                <div key={i} className="divider-row">
                  <span style={{ fontSize: 14 }}>{f.nome}</span>
                  <span className="tiny t-dim">{f.q}</span>
                </div>
              ))}
            </Panel>
          ))}

          <div className="row g8">
            <Btn onClick={() => setResult(null)} style={{ flex: 1 }}>{tr("↻ Riprova")}</Btn>
            <Btn primary onClick={() => onSave(result)} style={{ flex: 2 }}>{tr("Salva piano ✓")}</Btn>
          </div>
        </>
      )}
    </div>
  );
}

function NutritionTab({ premium, body, nutri, setNutri, fireToast, goProfile }) {
  const [goal, setGoal] = useState(nutri ? nutri.goal : (body.obiettivo || "Massa"));
  const [days, setDays] = useState(nutri ? nutri.days : (body.giorniAllenamento || 3));
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [prefs, setPrefs] = useState(nutri && nutri.prefs ? nutri.prefs : "");  // preferenze / digiuno intermittente
  const [importing, setImporting] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false); // pagina rigenerazione: chiede le preferenze
  const [editMeal, setEditMeal] = useState(null);   // card pasto aperta per modifica
  const [subTab, setSubTab] = useState("plan");     // "plan" = pasti consigliati · "compose" = pick & place
  const [plate, setPlate] = useState(nutri && nutri.plate ? nutri.plate : []);
  const savePlate = (p) => { setPlate(p); if (nutri) setNutri({ ...nutri, plate: p }); };

  const generate = async (useCurrentTargets) => {
    if (premium && premium.guest) return premium.open();  // ospite: nessuna funzione AI
    setLoading(true);
    /* se i target sono stati modificati a mano, i pasti si rigenerano su QUELLI */
    const targets = useCurrentTargets && nutri ? nutri.targets : calcTargets(body, days, goal);
    let meals = null, sourcePlan = null;
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: await featHeaders("nutrition"),
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 4000,
          messages: [{
            role: "user",
            content: `Genera un piano alimentare giornaliero per palestra. Target: ${targets.kcal} kcal, ${targets.p}g proteine, ${targets.c}g carboidrati, ${targets.f}g grassi. Utente: ${body.sesso === "M" ? "uomo" : "donna"}, ${body.peso}kg, obiettivo ${goal.toLowerCase()}, si allena ${days} volte a settimana.
Alimenti semplici da palestra (pollo, riso, avena, uova, whey, pesce...).
${prefs.trim() ? `PREFERENZE E VINCOLI DELL'UTENTE (rispettali sempre): ${prefs.trim()}` : "Nessuna preferenza particolare."}
NUMERO PASTI: rispetta le preferenze. Se l'utente indica digiuno intermittente o una finestra alimentare, genera SOLO i pasti compatibili (anche 2 soli), distribuendo comunque tutti i macro nella finestra. Altrimenti usa 5 pasti: Colazione, Pranzo, Spuntino pre-workout, Post-workout, Cena.
VARIETÀ: per OGNI pasto genera ESATTAMENTE 3 OPZIONI alternative diverse tra loro (ingredienti diversi) ma equivalenti nei macro, così da poter ruotare i pasti nei vari giorni. Mai meno di 3 opzioni.
Rispondi SOLO con JSON valido senza markdown né backtick, con QUESTE DUE CHIAVI:
{"meals":{"NomePasto":[[{"nome":string,"q":string}],[...],[...]]},
 "sourcePlan":{
   "protocol": string (es. "RICOMPOSIZIONE | DIGIUNO INTERMITTENTE 16/8" oppure "PROTOCOLLO MASSA"),
   "window":[{"time":"12:00 - 13:00","label":"Pranzo","note":"Pasto A — modello interscambiabile","fasting":false}],
   "categories":[
     {"name":"Fonti proteiche","rule":"SCEGLI 1","items":[{"q":"200g","n":"Petto di pollo / tacchino","alt":""}]},
     {"name":"Fonti carboidrati","rule":"SCEGLI 1","items":[...]},
     {"name":"Grassi e fibre","rule":"A PASTO","items":[...]},
     {"name":"Snack / Post-workout","rule":"","items":[...]}
   ],
   "directives": string (1-2 frasi operative)
 }}
In "sourcePlan" le quantità ("q") devono essere già calcolate sui target dell'utente e le opzioni della stessa categoria equivalenti tra loro nei macro. Se c'è digiuno intermittente inserisci la fascia di digiuno in "window" con "fasting":true.`,
          }],
        }),
      });
      const _txt = await response.text();
      let data; try { data = JSON.parse(_txt); } catch { throw new Error(response.status === 413 ? tr("File troppo grande: usa una foto più piccola o incolla il testo.") : `Errore server (${response.status})`); }
      if (data.error === "limit_reached") { if (premium) premium.open(); throw new Error("Limite settimanale raggiunto"); }
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const parsed = parseLoose(text);
      if (parsed.meals || parsed.sourcePlan) {
        meals = parsed.meals || {};
        sourcePlan = parsed.sourcePlan || null;
      } else meals = parsed; // compatibilità con la vecchia risposta
    } catch (e) {
      meals = FALLBACK_PLAN(targets); // offline/errore: piano template scalato
    }
    const normMeals = {};
    for (const [k, v] of Object.entries(meals || {})) normMeals[k] = asOptions(v);
    setNutri({ goal, days, targets, meals: normMeals, prefs,
      sourcePlan: sourcePlan || (nutri && nutri.sourcePlan) || null });
    setLoading(false);
    fireToast({ title: tr("◈ PIANO GENERATO"), sub: `${targets.kcal} kcal · P${targets.p} C${targets.c} G${targets.f}` });
  };

  /* Ordine delle card pasto: se l'utente ha trascinato, vale nutri.mealOrder;
     altrimenti l'ordine standard (sortMeals per fascia oraria). */
  const orderedMealNames = (n) => {
    const entries = Object.entries(n.meals || {});
    const win = n.sourcePlan && n.sourcePlan.window;
    const base = (n.mealOrder && n.mealOrder.length)
      ? [...entries].sort((a, b) => {
          const ia = n.mealOrder.indexOf(a[0]), ib = n.mealOrder.indexOf(b[0]);
          return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
        })
      : sortMeals(entries, win);
    return base.map(([k]) => k);
  };
  /* Riordino trascinando l'handle: persiste in nutri.mealOrder */
  const moveMeal = (from, to) => {
    setNutri((n) => {
      if (!n) return n;
      const arr = orderedMealNames(n);
      const [m] = arr.splice(from, 1);
      arr.splice(to, 0, m);
      return { ...n, mealOrder: arr };
    });
  };

  const startEdit = () => { setDraft({ ...nutri.targets }); setEditing(true); };
  const saveEdit = () => {
    let kcal = Math.max(800, Math.round(Number(draft.kcal) || nutri.targets.kcal));
    let p = Math.max(0, Math.round(Number(draft.p) || 0));
    let c = Math.max(0, Math.round(Number(draft.c) || 0));
    let f = Math.max(0, Math.round(Number(draft.f) || 0));
    /* i grammi devono "valere" le kcal inserite: se non tornano si ricalcolano
       mantenendo le proporzioni scelte, così le % sommano sempre a 100 */
    const mk = p * 4 + c * 4 + f * 9;
    if (mk <= 0) ({ p, c, f } = nutri.targets);
    else if (Math.abs(mk - kcal) > 1) {
      const k = kcal / mk;
      p = Math.round(p * k); f = Math.round(f * k);
      /* i carboidrati bilanciano l'arrotondamento: totale kcal esatto */
      c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4));
    }
    const t = { kcal, p, c, f };
    /* ricalcola subito le quantità dei cibi (i tipi restano invariati) */
    const meals = rescaleMeals(nutri.meals, nutri.targets, t);
    setNutri({ ...nutri, targets: t, meals });
    setEditing(false);
    fireToast({ title: tr("◈ TARGET AGGIORNATI"), sub: `${t.kcal} kcal · ${tr("pasti riadattati")}` });
  };

  if (importing) return (
    <NutriImport premium={premium} body={body}
      onClose={() => setImporting(false)}
      onSave={(r) => {
        setNutri({ goal, days, targets: r.targets, meals: r.meals, prefs, imported: true, sourcePlan: r.sourcePlan || null });
        if (r.sourcePlan) setSubTab("compose");
        setImporting(false);
        fireToast({ title: tr("◈ PIANO IMPORTATO"), sub: `${r.targets.kcal} kcal` });
      }} />
  );

  /* ---- Rigenera con AI: pagina dedicata che chiede le preferenze ---- */
  if (regenOpen && nutri) return (
    <div className="fade-in stack" style={{ maxWidth: 560 }}>
      <div className="row between">
        <Btn small onClick={() => setRegenOpen(false)}>{tr("‹ Indietro")}</Btn>
        <span className="hud-title">{tr("Rigenera piano")}</span>
        <div style={{ width: 64 }} />
      </div>
      <Panel accent className="stack">
        <div className="tiny t-dim" style={{ lineHeight: 1.6 }}>
          {tr("L'AI genera un nuovo piano sui tuoi target attuali")}:
          <span className="t-cyan"> {nutri.targets.kcal} kcal · P{nutri.targets.p} C{nutri.targets.c} G{nutri.targets.f}</span>
        </div>
        <div>
          <div className="hud-label" style={{ marginBottom: 6 }}>{tr("Preferenze alimentari")} <span className="t-faint">({tr("opzionale")})</span></div>
          <textarea className="hud-input cham-s" value={prefs} onChange={(e) => setPrefs(e.target.value)} rows={3} autoFocus
            placeholder={tr("Es. vegetariano, niente lattosio, digiuno intermittente 16:8 con 2 pasti, allergia alle noci...")}
            style={{ resize: "none", fontSize: 13 }} />
        </div>
        <Btn primary full disabled={loading}
          onClick={async () => { await generate(true); setRegenOpen(false); }}>
          {loading
            ? <span className="row center g8"><Loader2 size={14} className="spin" /> {tr("Rigenerazione...")}</span>
            : tr("◈ Rigenera piano")}
        </Btn>
      </Panel>
    </div>
  );

  /* la modalità "componi" non richiede un piano: è indipendente */
  if (subTab === "compose") return (
    <div className="fade-in stack">
      {nutri && (
        <div className="row between">
          <h2 className="hud-title">▸ Piano — {nutri.goal}</h2>
          <Btn small onClick={() => setNutri(null)}>{tr("↻ Nuovo")}</Btn>
        </div>
      )}
      <div className="row g8">
        <Btn small onClick={() => (nutri ? setRegenOpen(true) : generate(false))} disabled={loading} style={{ flex: 1, opacity: .85 }}>
          {loading ? tr("Rigenerazione...") : tr("◈ Rigenera con AI")}
        </Btn>
        <Btn small onClick={() => setImporting(true)} style={{ flex: 1, opacity: .85 }}>{tr("⤓ Importa piano")}</Btn>
      </div>
      <NutriSubTabs value={subTab} onChange={setSubTab} />
      <SourcePlanView
        plan={(nutri && nutri.sourcePlan) || DEFAULT_SOURCE_PLAN}
        targets={nutri ? nutri.targets : null}
        body={body}
        picks={plate && !Array.isArray(plate) ? plate : {}}
        setPicks={savePlate}
        loading={loading}
        onImport={() => setImporting(true)}
        onRegen={() => (nutri ? setRegenOpen(true) : generate(false))}
        /* riordino delle categorie trascinando l'handle (persiste nel piano) */
        onReorder={(from, to) => setNutri((n) => {
          if (!n || !n.sourcePlan || !n.sourcePlan.categories) return n;
          const cats = [...n.sourcePlan.categories];
          const [m] = cats.splice(from, 1);
          cats.splice(to, 0, m);
          return { ...n, sourcePlan: { ...n.sourcePlan, categories: cats } };
        })} />
    </div>
  );

  /* ---- Dati corporei mancanti: blocca la generazione ---- */
  const missingData = !body.peso || !body.altezza || !body.eta;
  if (!nutri && missingData) return (
    <div className="fade-in stack" style={{ maxWidth: 560 }}>
      <h2 className="hud-title">{tr("▸ Piano nutrizionale")}</h2>
      <Panel accent style={{ textAlign: "center", padding: 32 }}>
        <Ruler size={26} color="#ffd76a" style={{ margin: "0 auto 12px" }} />
        <div className="f-hud t-amber" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 13 }}>{tr("DATI CORPOREI MANCANTI")}</div>
        <div className="tiny t-dim" style={{ marginTop: 8, lineHeight: 1.6 }}>
          Per calcolare il fabbisogno servono almeno <span className="t-cyan">{tr("peso, altezza ed età")}</span>.
          Inseriscili nel profilo, poi torna qui.
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn primary onClick={goProfile}>{tr("Vai al profilo ›")}</Btn>
        </div>
      </Panel>
    </div>
  );

  /* ---- Nessun piano: schermata di generazione ---- */
  if (!nutri) return (
    <div className="fade-in stack" style={{ maxWidth: 560 }}>
      <h2 className="hud-title">{tr("▸ Piano nutrizionale")}</h2>
      <NutriSubTabs value={subTab} onChange={setSubTab} />
      <Panel accent className="stack">
        <div className="tiny t-dim" style={{ lineHeight: 1.6 }}>
          L'AI calcola il tuo fabbisogno dai <span className="t-cyan">{tr("dati corporei del profilo")}</span> ({body.peso}kg · {body.altezza}cm · {body.eta} anni)
          e dal volume di allenamento, poi genera un piano giornaliero con macro da palestra
          (proteine 2g/kg, grassi 0.9g/kg, carboidrati a completamento).
        </div>
        <div>
          <div className="hud-label" style={{ marginBottom: 6 }}>{tr("Obiettivo")}</div>
          <div className="row wrap g6">
            {["Massa", "Mantenimento", "Definizione"].map((o) => (
              <button key={o} onClick={() => setGoal(o)}
                className={`tap cham-s chip ${goal === o ? "chip-on" : ""}`}
                style={{ cursor: "pointer", fontSize: 12, padding: "6px 12px", fontFamily: "'Rajdhani',sans-serif", textTransform: "none", letterSpacing: ".02em" }}>
                {o}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="hud-label" style={{ marginBottom: 6 }}>Allenamenti/settimana · <span className="t-cyan">{days}</span></div>
          <input type="range" min="2" max="6" value={days} onChange={(e) => setDays(Number(e.target.value))} />
        </div>
        <div>
          <div className="hud-label" style={{ marginBottom: 6 }}>{tr("Preferenze alimentari")} <span className="t-faint">({tr("opzionale")})</span></div>
          <textarea className="hud-input cham-s" value={prefs} onChange={(e) => setPrefs(e.target.value)} rows={3}
            placeholder={tr("Es. vegetariano, niente lattosio, digiuno intermittente 16:8 con 2 pasti, allergia alle noci...")}
            style={{ resize: "none", fontSize: 13 }} />
        </div>
        <Btn primary full disabled={loading} onClick={() => generate(false)}>
          {loading ? <span className="row center g8"><Loader2 size={14} className="spin" /> {tr("Generazione...")}</span> : tr("◈ Genera piano AI")}
        </Btn>
      </Panel>

      <button onClick={() => setImporting(true)} className="tap" style={{ width: "100%", cursor: "pointer" }}>
        <Panel accent hover>
          <div className="row g12">
            <Upload size={20} color="var(--cyan-hi)" />
            <div className="grow">
              <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 13 }}>{tr("IMPORTA PIANO NUTRIZIONALE")}</div>
              <div className="tiny t-dim">{tr("Carica il piano del tuo nutrizionista (PDF, foto, testo) — l'AI lo converte")}</div>
            </div>
            <ChevronRight size={16} color="var(--faint)" />
          </div>
        </Panel>
      </button>
    </div>
  );

  /* ---- Piano attivo ---- */
  const t = nutri.targets;
  return (
    <div className="fade-in two-col">
      <div className="col stack">
        <div className="row between">
          <h2 className="hud-title">▸ Piano — {nutri.goal}</h2>
          <Btn small onClick={() => setNutri(null)}>{tr("↻ Nuovo")}</Btn>
        </div>

        <div className="row g8">
          <Btn small onClick={() => setRegenOpen(true)} disabled={loading} style={{ flex: 1, opacity: .85 }}>
            {loading ? tr("Rigenerazione...") : tr("◈ Rigenera con AI")}
          </Btn>
          <Btn small onClick={() => setImporting(true)} style={{ flex: 1, opacity: .85 }}>{tr("⤓ Importa piano")}</Btn>
        </div>

        <NutriSubTabs value={subTab} onChange={setSubTab} />

        <Panel accent>
          <div className="row between" style={{ marginBottom: 12 }}>
            <div>
              <div className="f-hud t-cyan" style={{ fontWeight: 700, fontSize: 24 }}>{t.kcal}</div>
              <div className="micro">{tr("KCAL / GIORNO")}</div>
            </div>
            {!editing
              ? <Btn small onClick={startEdit}>{tr("Modifica target")}</Btn>
              : <Btn small primary onClick={saveEdit}>{tr("Salva ✓")}</Btn>}
          </div>

          {!editing ? (
            <div className="stack-s">
              {/* percentuali col metodo dei resti: la somma è SEMPRE 100% */}
              <MacroBar label="Proteine" grams={t.p} kcalPerG={4} totalKcal={t.kcal} color="var(--cyan)" pct={macroPcts(t.p, t.c, t.f)[0]} />
              <MacroBar label="Carboidrati" grams={t.c} kcalPerG={4} totalKcal={t.kcal} color="var(--cyan-hi)" pct={macroPcts(t.p, t.c, t.f)[1]} />
              <MacroBar label="Grassi" grams={t.f} kcalPerG={9} totalKcal={t.kcal} color="#ffd76a" pct={macroPcts(t.p, t.c, t.f)[2]} />
            </div>
          ) : (
            <>
              <div className="field-grid">
                {[["kcal", "Kcal"], ["p", "Proteine (g)"], ["c", "Carboidrati (g)"], ["f", "Grassi (g)"]].map(([k, label]) => (
                  <div key={k}>
                    <div className="hud-label" style={{ marginBottom: 4, fontSize: 9 }}>{label}</div>
                    <input className="hud-input cham-s" type="number" inputMode="numeric"
                      value={draft[k]} onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                      style={{ textAlign: "center" }} />
                  </div>
                ))}
              </div>
              <div className="micro t-faint" style={{ marginTop: 8, lineHeight: 1.5 }}>
                {tr("I grammi vengono bilanciati sulle kcal (totale sempre 100%) e le quantità dei pasti si riadattano in automatico.")}
              </div>
            </>
          )}

          <div className="micro" style={{ marginTop: 12 }}>
            P {(t.p / body.peso).toFixed(1)} g/kg · G {(t.f / body.peso).toFixed(1)} g/kg · {nutri.days} allenamenti/sett
          </div>
        </Panel>

      </div>

      <div className="col stack">
        {editMeal && (
          <MealEditor meal={editMeal} options={asOptions(nutri.meals[editMeal])}
            todayIdx={dayIndex() % Math.max(1, asOptions(nutri.meals[editMeal]).length)}
            onClose={() => setEditMeal(null)}
            onSave={(opts) => {
              setNutri({ ...nutri, meals: { ...nutri.meals, [editMeal]: opts } });
              setEditMeal(null);
              fireToast({ title: tr("◈ PASTO AGGIORNATO"), sub: editMeal });
            }} />
        )}
        <div data-dl className="stack">
        {orderedMealNames(nutri).map((meal) => {
          const raw = nutri.meals[meal];
          const opts = asOptions(raw);
          const idx = dayIndex() % Math.max(1, opts.length);
          const foods = opts[idx] || [];
          return (
            <button key={meal} onClick={() => setEditMeal(meal)} className="tap" style={{ width: "100%", cursor: "pointer", textAlign: "left" }}>
              <Panel hover>
                <div className="row between" style={{ marginBottom: 6 }}>
                  <div className="row g8" style={{ alignItems: "center" }}>
                    <span className="drag-handle" title={tr("Trascina per riordinare")}
                      onPointerDown={(e) => dlStart(e, moveMeal)}
                      onClick={(e) => e.stopPropagation()}><GripVertical size={14} /></span>
                    <div className="hud-label">▸ {meal}</div>
                  </div>
                  <span className="micro t-faint">
                    {opts.length > 1 ? `${tr("OPZIONE")} ${idx + 1}/${opts.length} · ` : ""}{tr("MODIFICA")} ›
                  </span>
                </div>
                {foods.map((f, i) => (
                  <div key={i} className="divider-row">
                    <span style={{ fontSize: 14 }}>{f.nome}</span>
                    <span className="tiny t-dim">{f.q}</span>
                  </div>
                ))}
                {foods.length === 0 && <div className="tiny t-faint">{tr("Nessun alimento — tocca per aggiungerne")}</div>}
              </Panel>
            </button>
          );
        })}
        </div>
        <div className="micro">{tr("Il piano è indicativo: consulta un professionista per esigenze specifiche.")}</div>
      </div>
    </div>
  );
}

/* ================================ ONBOARDING ================================ */
/* Primo accesso: raccolta dati base + stile di vita (come le app fitness) */
const ACTIVITY_OPTS = [
  { id: "Sedentaria", desc: "Lavoro da scrivania, poco movimento" },
  { id: "Moderata", desc: "In piedi o in movimento parte del giorno" },
  { id: "Attiva", desc: "Lavoro fisico o molto movimento quotidiano" },
];

const ObNumF = ({ d, set, label, k, unit, ph }) => (
  <div>
    <div className="hud-label" style={{ marginBottom: 4, fontSize: 9 }}>{label} {unit && <span className="t-faint">({unit})</span>}</div>
    <input className="hud-input cham-s" type="number" inputMode="decimal" placeholder={ph}
      value={d[k]} onChange={(e) => set(k, e.target.value)} style={{ textAlign: "center" }} />
  </div>
);

function OnboardingWizard({ body, setBody, username, fireToast }) {
  const [step, setStep] = useState(1);
  const [lang, setLang] = useState(body.lang || "it");
  const [d, setD] = useState({
    uiMode: body.uiMode || "combat",
    sesso: body.sesso || "M", eta: body.eta || "", altezza: body.altezza || "",
    peso: body.peso || "", bf: body.bf || "",
    attivita: body.attivita || "Moderata",
    giorniAllenamento: body.giorniAllenamento || 3,
    esperienza: body.esperienza || "Principiante",
    obiettivo: body.obiettivo || "Massa",
  });
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const [err, setErr] = useState(null);

  const next = () => {
    setErr(null);
    if (step === 3) {
      if (!d.eta || !d.altezza || !d.peso) return setErr("Compila età, altezza e peso");
      if (d.eta < 14 || d.eta > 100) return setErr("Età non valida");
      if (d.altezza < 120 || d.altezza > 230) return setErr("Altezza non valida (cm)");
      if (d.peso < 30 || d.peso > 250) return setErr("Peso non valido (kg)");
    }
    setStep(step + 1);
  };

  const finish = () => {
    setBody((b) => ({
      ...b,
      sesso: d.sesso, eta: Number(d.eta), altezza: Number(d.altezza),
      peso: Number(d.peso), bf: d.bf === "" ? "" : Number(d.bf),
      lang, uiMode: d.uiMode,
      attivita: d.attivita, giorniAllenamento: d.giorniAllenamento,
      esperienza: d.esperienza, obiettivo: d.obiettivo,
      onboarded: true,
    }));
    fireToast({ title: tr("◈ PROFILO CONFIGURATO"), sub: "Benvenuto a bordo, " + username });
  };

  const Chips = ({ k, options }) => (
    <div className="row wrap g6">
      {options.map((o) => (
        <button key={o} onClick={() => set(k, o)}
          className={"tap cham-s chip " + (d[k] === o ? "chip-on" : "")}
          style={{ cursor: "pointer", fontSize: 12, padding: "7px 14px", fontFamily: "'Rajdhani',sans-serif", textTransform: "none", letterSpacing: ".02em" }}>
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <div className="auth-wrap">
      <div className="auth-box fade-in" style={{ maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div className="f-hud t-cyan" style={{ fontSize: 18, fontWeight: 700, letterSpacing: ".25em" }}>{tr("SETUP PROFILO")}</div>
          <div className="row center g6" style={{ marginTop: 10 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="seg" style={{ width: 40, flex: "none",
                background: step >= s ? "linear-gradient(180deg,var(--cyan-hi),var(--cyan))" : "var(--soft)",
                boxShadow: step >= s ? "0 0 6px rgba(87,200,242,.6)" : "none" }} />
            ))}
          </div>
          <div className="micro" style={{ marginTop: 6 }}>{tr("PASSO")} {step} {tr("DI")} 5</div>
        </div>

        <div className="panel panel-accent cham stack" style={{ padding: 24 }}>
          {step === 1 && (
            <>
              <div className="hud-title" style={{ fontSize: 12 }}>{tr("Lingua")}</div>
              <div className="tiny t-faint">{tr("Scegli la lingua dell'app")}</div>
              <div className="stack-s">
                {LANG_OPTS.map((o) => (
                  <button key={o.id} onClick={() => { setLang(o.id); setLangGlobal(o.id); }}
                    className="tap cham-s" style={{ cursor: "pointer", width: "100%", padding: "12px 14px", textAlign: "left",
                      border: "1px solid " + (lang === o.id ? "var(--cyan)" : "var(--soft2)"),
                      background: lang === o.id ? "var(--active)" : "var(--card2)" }}>
                    <div className={lang === o.id ? "t-cyan" : "t-bright"} style={{ fontSize: 15, fontWeight: 700 }}>{o.flag} {o.label}</div>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="hud-title" style={{ fontSize: 12 }}>{tr("Stile dell'app")}</div>
              <div className="tiny t-faint">{tr("Potrai cambiarlo quando vuoi dal profilo")}</div>
              <div className="stack-s">
                {UI_MODES.map((o) => (
                  <button key={o.id} onClick={() => set("uiMode", o.id)}
                    className="tap cham-s" style={{ cursor: "pointer", width: "100%", padding: "12px 14px", textAlign: "left",
                      border: "1px solid " + (d.uiMode === o.id ? "var(--cyan)" : "var(--soft2)"),
                      background: d.uiMode === o.id ? "var(--active)" : "var(--card2)" }}>
                    <div className={d.uiMode === o.id ? "t-cyan" : "t-bright"} style={{ fontSize: 15, fontWeight: 700 }}><o.Icon size={14} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />{tr(o.label)}</div>
                    <div className="tiny t-faint" style={{ marginTop: 3, lineHeight: 1.5 }}>{tr(o.desc)}</div>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="hud-title" style={{ fontSize: 12 }}>{tr("Dati base")}</div>
              <div>
                <div className="hud-label" style={{ marginBottom: 4, fontSize: 9 }}>{tr("Sesso")}</div>
                <div className="row g6">
                  {["M", "F"].map((s) => (
                    <button key={s} onClick={() => set("sesso", s)}
                      className={"tap cham-s chip " + (d.sesso === s ? "chip-on" : "")}
                      style={{ cursor: "pointer", flex: 1, textAlign: "center", padding: "9px 0", fontSize: 13 }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field-grid">
                <ObNumF d={d} set={set} label="Età" k="eta" unit="anni" ph="es. 25" />
                <ObNumF d={d} set={set} label="Altezza" k="altezza" unit="cm" ph="es. 178" />
                <ObNumF d={d} set={set} label="Peso" k="peso" unit="kg" ph="es. 75" />
                <ObNumF d={d} set={set} label="Massa grassa" k="bf" unit="% · opzionale" ph="es. 15" />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="hud-title" style={{ fontSize: 12 }}>{tr("Stile di vita")}</div>
              <div>
                <div className="hud-label" style={{ marginBottom: 6, fontSize: 9 }}>{tr("Attività quotidiana (fuori palestra)")}</div>
                <div className="stack-s">
                  {ACTIVITY_OPTS.map((o) => (
                    <button key={o.id} onClick={() => set("attivita", o.id)}
                      className={"tap cham-s " + (d.attivita === o.id ? "" : "")}
                      style={{ cursor: "pointer", width: "100%", padding: "10px 12px", textAlign: "left",
                        border: "1px solid " + (d.attivita === o.id ? "var(--cyan)" : "var(--soft2)"),
                        background: d.attivita === o.id ? "var(--active)" : "var(--card2)" }}>
                      <div className={d.attivita === o.id ? "t-cyan" : "t-bright"} style={{ fontSize: 14, fontWeight: 700 }}>{o.id}</div>
                      <div className="tiny t-faint">{o.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="hud-label" style={{ marginBottom: 6, fontSize: 9 }}>{tr("Allenamenti a settimana ·")} <span className="t-cyan">{d.giorniAllenamento}</span></div>
                <input type="range" min="1" max="7" value={d.giorniAllenamento}
                  onChange={(e) => set("giorniAllenamento", Number(e.target.value))} />
              </div>
              <div>
                <div className="hud-label" style={{ marginBottom: 6, fontSize: 9 }}>{tr("Esperienza in palestra")}</div>
                <Chips k="esperienza" options={["Principiante", "Intermedio", "Avanzato"]} />
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div className="hud-title" style={{ fontSize: 12 }}>{tr("Obiettivo")}</div>
              <Chips k="obiettivo" options={["Massa", "Mantenimento", "Definizione"]} />
              <div className="cham-s stack-s" style={{ padding: "12px 14px", background: "var(--card2)", border: "1px solid var(--soft)" }}>
                <div className="hud-label" style={{ fontSize: 9 }}>{tr("Riepilogo")}</div>
                <div className="tiny t-dim" style={{ lineHeight: 1.7 }}>
                  {d.sesso === "M" ? "Uomo" : "Donna"} · {d.eta} anni · {d.altezza} cm · {d.peso} kg{d.bf ? " · " + d.bf + "% BF" : ""}<br />
                  Attività {d.attivita.toLowerCase()} · {d.giorniAllenamento} allenamenti/sett · {d.esperienza}<br />
                  Obiettivo: <span className="t-cyan">{d.obiettivo}</span>
                </div>
              </div>
            </>
          )}

          <div className="row g8">
            {step > 1 && <Btn onClick={() => setStep(step - 1)} style={{ flex: 1 }}>{tr("‹ Indietro")}</Btn>}
            {step < 5
              ? <Btn primary onClick={next} style={{ flex: 2 }}>{tr("Avanti ›")}</Btn>
              : <Btn primary onClick={finish} style={{ flex: 2 }}>{tr("◈ Inizia")}</Btn>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================ INSTALL PWA ================================ */
/* Chrome/Android non mostra più il prompt automatico in modo affidabile:
   va catturato l'evento beforeinstallprompt e offerto un pulsante custom.
   Su iOS il prompt non esiste proprio: si mostrano le istruzioni manuali. */
function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("gq_install_dismissed") === "1"; } catch { return false; }
  });
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true);
  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const h = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem("gq_install_dismissed", "1"); } catch {}
  };
  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };
  return { canInstall: !!deferred, isIOS, standalone, dismissed, dismiss, install };
}

function InstallBanner({ ip }) {
  if (ip.standalone || ip.dismissed) return null;
  if (!ip.canInstall && !ip.isIOS) return null;
  return (
    <div className="cham-s" style={{
      position: "fixed", bottom: 74, left: 12, right: 12, zIndex: 90,
      background: "var(--active)", border: "1px solid var(--cyan)", padding: "10px 14px",
      boxShadow: "0 4px 24px rgba(0,0,0,.6), 0 0 12px rgba(87,200,242,.25)",
    }}>
      <div className="row between g12">
        <div className="grow">
          <div className="f-hud t-cyan" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".12em" }}>{tr("◈ INSTALLA COMBAT TRAINING")}</div>
          <div className="tiny t-dim" style={{ marginTop: 2, lineHeight: 1.5 }}>
            {ip.canInstall
              ? "Aggiungila alla schermata home come app"
              : "Su iPhone: tocca Condividi (□↑) poi \u201CAggiungi alla schermata Home\u201D"}
          </div>
        </div>
        <div className="row g8" style={{ flexShrink: 0, alignItems: "center" }}>
          {ip.canInstall && <Btn small primary onClick={ip.install}>{tr("Installa")}</Btn>}
          <span onClick={ip.dismiss} className="tap t-faint" style={{ cursor: "pointer", fontSize: 16, padding: 4 }}>✕</span>
        </div>
      </div>
    </div>
  );
}
