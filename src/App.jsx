import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "./lib/supabase";
import {
  Dumbbell, Flame, Timer, Plus, Check, ChevronRight, Play, Square,
  Trash2, Bot, Upload, FileText, Trophy, Utensils, X, Loader2, Search,
  User, LogOut, Lock, Mail, Eye, EyeOff, Ruler, Save
} from "lucide-react";

/* ====================== EXERCISE LIBRARY (pre-loaded) ====================== */
const EXERCISE_DB = {
  Petto: ["Panca Piana Bilanciere", "Panca Piana Manubri", "Panca Inclinata Bilanciere", "Panca Inclinata Manubri", "Panca Declinata", "Chest Press", "Croci Manubri", "Croci ai Cavi", "Pectoral Machine", "Push-Up", "Dip alle Parallele"],
  Dorso: ["Trazioni", "Trazioni Presa Inversa", "Lat Machine Avanti", "Lat Machine Presa Stretta", "Rematore Bilanciere", "Rematore Manubrio", "Rematore T-Bar", "Pulley Basso", "Pull-Down Braccia Tese", "Hyperextension", "Stacco da Terra"],
  Gambe: ["Squat Bilanciere", "Front Squat", "Leg Press", "Hack Squat", "Affondi Manubri", "Affondi Bulgari", "Stacco Rumeno", "Leg Extension", "Leg Curl Sdraiato", "Leg Curl Seduto", "Hip Thrust", "Calf Raise in Piedi", "Calf Raise Seduto"],
  Spalle: ["Military Press", "Shoulder Press Manubri", "Arnold Press", "Alzate Laterali", "Alzate Laterali ai Cavi", "Alzate Frontali", "Alzate Posteriori", "Face Pull", "Shrug Bilanciere"],
  Bicipiti: ["Curl Bilanciere", "Curl Manubri Alternato", "Curl Panca Scott", "Hammer Curl", "Curl ai Cavi", "Curl Concentrato", "Spider Curl"],
  Tricipiti: ["Pushdown Tricipiti", "Pushdown Corda", "French Press", "Estensioni Sopra la Testa", "Panca Presa Stretta", "Dip tra Panche", "Kickback Manubrio"],
  Core: ["Plank", "Crunch", "Crunch ai Cavi", "Russian Twist", "Leg Raise", "Hanging Leg Raise", "Ab Wheel", "Side Plank"],
};
const GROUPS = Object.keys(EXERCISE_DB);
const findGroup = (name) => {
  const n = name.toLowerCase();
  for (const [g, list] of Object.entries(EXERCISE_DB))
    if (list.some((e) => e.toLowerCase() === n)) return g;
  return "Altro";
};

const MOCK_HISTORY = []; // lo storico si popola completando i workout

const DEFAULT_ROUTINES = [];
const DEFAULT_PRS = {};

const LEVEL_TITLES = ["RECRUIT", "PRIVATE", "SERGEANT", "SPARTAN", "MASTER CHIEF"];
const xpForLevel = (lvl) => 100 + (lvl - 1) * 60;

/* ============================== STYLES ============================== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Rajdhani:wght@500;600;700&display=swap');

:root{color-scheme:dark;
  --bg:#04090f; --panel:#081420; --panel2:#0a1a2a; --line:#1b3a52; --line2:#2f6786;
  --cyan:#57c8f2; --cyan-hi:#9be8ff; --bright:#e6f6ff; --text:#cfe8f5;
  --dim:#7fa8bf; --faint:#3f637c; --amber:#ffd76a; --green:#2fbf71; --red:#ff8f7a;
}
*{box-sizing:border-box}
.hud-root{min-height:100vh;background:var(--bg);color:var(--text);
  font-family:'Rajdhani',sans-serif;font-weight:600;padding-bottom:80px;position:relative}
.hud-root::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:5;
  background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(87,200,242,.025) 3px 4px)}
.hud-root::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(900px 400px at 50% -5%,#0a2035 0%,transparent 60%)}
.z-app{position:relative;z-index:10}

.f-hud{font-family:'Chakra Petch',sans-serif}
.t-bright{color:var(--bright)} .t-cyan{color:var(--cyan-hi)} .t-dim{color:var(--dim)}
.t-faint{color:var(--faint)} .t-amber{color:var(--amber)} .t-red{color:var(--red)}
.hud-label{font-family:'Chakra Petch',sans-serif;font-size:10px;letter-spacing:.25em;
  text-transform:uppercase;color:var(--dim);font-weight:600}
.hud-title{font-family:'Chakra Petch',sans-serif;font-size:14px;letter-spacing:.2em;
  text-transform:uppercase;color:var(--cyan-hi);font-weight:700}
.tiny{font-size:11px;letter-spacing:.04em}
.micro{font-size:9px;font-family:'Chakra Petch',sans-serif;letter-spacing:.2em;color:var(--faint)}

.cham{clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)}
.cham-s{clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)}

.panel{background:rgba(8,20,32,.92);border:1px solid var(--line);position:relative;padding:16px}
.panel-accent{background:rgba(10,26,42,.92);border:1px solid var(--line2)}
.panel::before{content:'';position:absolute;top:0;left:10px;right:0;height:1px;
  background:linear-gradient(90deg,rgba(87,200,242,.4),transparent 60%)}
.panel-hover{transition:border-color .15s ease}
.panel-hover:hover{border-color:var(--cyan)}

.btn{font-family:'Chakra Petch',sans-serif;font-weight:600;letter-spacing:.15em;
  text-transform:uppercase;cursor:pointer;font-size:12px;padding:10px 16px;border:1px solid var(--line)}
.btn-sm{font-size:11px;padding:6px 12px}
.btn-primary{background:linear-gradient(180deg,#57c8f2,#2f8fbf);color:#04121d;border-color:var(--cyan-hi)}
.btn-primary:hover{box-shadow:0 0 14px rgba(87,200,242,.45)}
.btn-ghost{background:#0c1c2b;color:var(--cyan-hi)}
.btn-ghost:hover{border-color:var(--cyan)}
.btn:disabled{opacity:.3;cursor:default}
.btn-full{width:100%}

.hud-input{background:#050d15;border:1px solid var(--line);color:var(--bright)!important;
  -webkit-text-fill-color:var(--bright);caret-color:var(--cyan);
  padding:10px 12px;font-size:15px;width:100%;outline:none;
  font-family:'Rajdhani',sans-serif;font-weight:600}
.hud-input:focus{border-color:var(--cyan);box-shadow:0 0 0 1px rgba(87,200,242,.25)}
.hud-input::placeholder{color:var(--faint);-webkit-text-fill-color:var(--faint)}
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active{
  -webkit-box-shadow:0 0 0 1000px #050d15 inset !important;
  box-shadow:0 0 0 1000px #050d15 inset !important;
  -webkit-text-fill-color:var(--bright) !important;
  caret-color:var(--cyan);
  transition:background-color 99999s ease-in-out 0s}
input,textarea,select{background-color:#050d15;color:var(--bright)}
input[type=number]{appearance:textfield;-moz-appearance:textfield}
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
input[type=range]{accent-color:var(--cyan);width:100%}

.tap{transition:transform .1s ease}
.tap:active{transform:scale(.97)}
button{background:none;border:none;color:inherit;font-family:inherit;text-align:left;padding:0}
button.btn{text-align:center}

.fade-in{animation:fi .3s ease both}
@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.toast-in{animation:ti .35s cubic-bezier(.34,1.4,.64,1)}
@keyframes ti{from{transform:translate(-50%,-16px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
.blink{animation:bl 1s steps(2) infinite}
@keyframes bl{50%{opacity:.35}}
.spin{animation:sp 1s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}

/* --- header --- */
.hud-header{position:sticky;top:0;z-index:40;border-bottom:1px solid var(--line);
  background:rgba(4,9,15,.88);backdrop-filter:blur(10px)}
.hud-header-inner{max-width:1100px;margin:0 auto;padding:10px 16px;
  display:flex;align-items:center;gap:16px}
.brand{font-family:'Chakra Petch',sans-serif;font-weight:700;letter-spacing:.3em;
  font-size:14px;color:var(--cyan-hi);display:none}
.xp-wrap{flex:1;max-width:420px}
.streak-pill{display:flex;align-items:center;gap:6px;padding:5px 10px;
  border:1px solid #5a4a1f;background:#1a1408}
.seg-row{display:flex;gap:3px}
.seg{height:8px;flex:1;clip-path:polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%);
  transition:all .3s ease}

/* --- layout --- */
.layout{max-width:1100px;margin:0 auto;padding:16px}
.side-nav{display:none}
.main-area{min-width:0}
.bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:40;display:flex;
  border-top:1px solid var(--line);background:rgba(4,9,15,.95);backdrop-filter:blur(10px)}
.bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;
  padding:10px 0 8px;cursor:pointer;font-family:'Chakra Petch',sans-serif;
  font-size:9px;letter-spacing:.2em;text-transform:uppercase;font-weight:600}
.snav-btn{width:100%;display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;
  font-family:'Chakra Petch',sans-serif;font-size:12px;letter-spacing:.2em;
  text-transform:uppercase;font-weight:600}
.two-col{display:block}
.two-col>*+*{margin-top:16px}

@media(min-width:768px){
  .hud-root{padding-bottom:32px}
  .brand{display:block}
  .layout{display:grid;grid-template-columns:190px 1fr;gap:24px;padding-top:24px}
  .side-nav{display:block}
  .bottom-nav{display:none}
}
@media(min-width:1024px){
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}
  .two-col>*+*{margin-top:0}
  .col>*+*{margin-top:16px}
}
.stack>*+*{margin-top:16px}
.stack-s>*+*{margin-top:8px}

/* utility flex */
.row{display:flex;align-items:center}
.between{justify-content:space-between}
.center{justify-content:center}
.g4{gap:4px}.g6{gap:6px}.g8{gap:8px}.g12{gap:12px}
.grow{flex:1;min-width:0}
.wrap{flex-wrap:wrap}

.set-grid{display:grid;grid-template-columns:32px 1fr 1fr 48px;gap:8px;align-items:center}
.divider-row{display:flex;justify-content:space-between;align-items:center;
  padding:7px 0;border-bottom:1px solid #0e2233}
.divider-row:last-child{border-bottom:none}
.chip{font-family:'Chakra Petch',sans-serif;font-size:9px;letter-spacing:.15em;
  padding:3px 8px;border:1px solid var(--line);color:var(--dim);text-transform:uppercase}
.chip-on{background:var(--cyan);color:#04121d;border-color:var(--cyan-hi);font-weight:600}
.check-btn{height:36px;display:flex;align-items:center;justify-content:center;
  border:1px solid var(--line);color:var(--faint);cursor:pointer}
.check-btn:hover{border-color:var(--cyan)}
.check-on{background:var(--green);border-color:#7cffb5;color:#04121d;
  box-shadow:0 0 10px rgba(47,191,113,.4)}
.set-done{background:#0a2418}
.dash-btn{width:100%;padding:7px;border:1px dashed var(--line);color:var(--faint);
  font-family:'Chakra Petch',sans-serif;font-size:10px;letter-spacing:.2em;cursor:pointer;text-align:center}
.dash-btn:hover{border-color:var(--cyan);color:var(--cyan-hi)}
.scroll-y{max-height:300px;overflow-y:auto;padding-right:4px}
.scroll-y::-webkit-scrollbar{width:4px}
.scroll-y::-webkit-scrollbar-thumb{background:var(--line)}

.hide-sm{display:none}
@media(min-width:480px){.hide-sm{display:inline}}
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;position:relative;z-index:10}
.auth-box{width:100%;max-width:400px}
.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:end}
.field-grid>div{display:flex;flex-direction:column;justify-content:flex-end}
.field-grid .hud-label{min-height:24px;display:flex;align-items:flex-end;gap:3px}
.field-grid .hud-input{height:42px}
@media(max-width:400px){.field-grid{grid-template-columns:1fr}}
.link-btn{cursor:pointer;color:var(--faint);font-size:12px;letter-spacing:.05em}
.link-btn:hover{color:var(--cyan-hi)}

@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

/* ============================== PRIMITIVES ============================== */
const Panel = ({ children, accent, hover, className = "", style }) => (
  <div className={`panel cham ${accent ? "panel-accent" : ""} ${hover ? "panel-hover" : ""} ${className}`} style={style}>
    {children}
  </div>
);

const Btn = ({ children, onClick, primary, small, full, disabled, style }) => (
  <button onClick={onClick} disabled={disabled}
    className={`btn cham-s tap ${primary ? "btn-primary" : "btn-ghost"} ${small ? "btn-sm" : ""} ${full ? "btn-full" : ""}`}
    style={style}>
    {children}
  </button>
);

function ShieldBar({ pct }) {
  return (
    <div className="seg-row">
      {Array.from({ length: 12 }, (_, i) => {
        const filled = pct * 12 > i;
        return <div key={i} className="seg" style={{
          background: filled ? "linear-gradient(180deg,#9be8ff,#3fa9d9)" : "#0e2233",
          boxShadow: filled ? "0 0 6px rgba(87,200,242,.6)" : "none",
        }} />;
      })}
    </div>
  );
}

function HudToast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast-in" style={{ position: "fixed", top: 64, left: "50%", transform: "translateX(-50%)", zIndex: 110 }}>
      <div className="panel panel-accent cham" style={{ padding: "12px 24px", textAlign: "center", boxShadow: "0 0 30px rgba(87,200,242,.3)" }}>
        <div className="f-hud" style={{ fontWeight: 700, letterSpacing: ".25em", fontSize: 13, color: toast.color || "#9be8ff" }}>{toast.title}</div>
        {toast.sub && <div className="tiny t-dim" style={{ marginTop: 2, letterSpacing: ".08em" }}>{toast.sub}</div>}
      </div>
    </div>
  );
}

/* ================================== APP ================================== */
export default function App() {
  const [tab, setTab] = useState("training");
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak] = useState(0);
  const [toast, setToast] = useState(null);
  const tRef = useRef(null);

  /* --- auth & persistenza via Supabase --- */
  const [user, setUser] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [body, setBody] = useState({
    peso: "", altezza: "", eta: "", sesso: "M", bf: "",
    collo: "", petto: "", vita: "", braccio: "", coscia: "",
  });
  const [nutri, setNutri] = useState(null);
  const [routines, setRoutines] = useState(DEFAULT_ROUTINES);
  const [prs, setPrs] = useState(DEFAULT_PRS);

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
        if (data.xp != null) setXp(data.xp);
        if (data.level != null) setLevel(data.level);
      }
      setUser({
        id: authUser.id,
        email: authUser.email,
        username: (authUser.user_metadata && authUser.user_metadata.username) || authUser.email.split("@")[0],
      });
      setHydrated(true);
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) hydrate(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) hydrate(session.user);
      else { setUser(null); setHydrated(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  /* Autosave con debounce: ogni modifica viene scritta su Supabase */
  const saveRef2 = useRef(null);
  useEffect(() => {
    if (!user || !hydrated) return;
    clearTimeout(saveRef2.current);
    saveRef2.current = setTimeout(() => {
      supabase.from("user_data").upsert({
        user_id: user.id, body, nutrition: nutri, routines, prs,
        xp, level, streak, updated_at: new Date().toISOString(),
      }).then(({ error }) => error && console.error("Save error:", error.message));
    }, 800);
  }, [user, hydrated, body, nutri, routines, prs, xp, level]);

  const fireToast = (t) => {
    setToast(t);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(null), 2600);
  };

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

  const need = xpForLevel(level);
  const rank = LEVEL_TITLES[Math.min(4, Math.floor(level / 6))];

  const navItems = [
    { id: "training", label: "Training", icon: Dumbbell },
    { id: "nutrition", label: "Nutrition", icon: Utensils },
    { id: "profile", label: "Profilo", icon: User },
  ];

  if (!user) {
    return (
      <div className="hud-root">
        <style>{CSS}</style>
        <HudToast toast={toast} />
        <AuthScreen fireToast={fireToast} />
      </div>
    );
  }

  const ip = useInstallPrompt();

  if (!body.onboarded) {
    return (
      <div className="hud-root">
        <style>{CSS}</style>
        <HudToast toast={toast} />
        <OnboardingWizard body={body} setBody={setBody} username={user.username} fireToast={fireToast} />
      </div>
    );
  }

  return (
    <div className="hud-root">
      <style>{CSS}</style>
      <HudToast toast={toast} />

      <InstallBanner ip={ip} />

      {/* TOP HUD BAR */}
      <header className="hud-header">
        <div className="hud-header-inner">
          <div className="brand">GYM<span className="t-faint">//</span>QUEST</div>
          <div className="xp-wrap">
            <div className="row between" style={{ marginBottom: 4 }}>
              <span className="micro">LV.{level} <span className="t-cyan">{rank}</span></span>
              <span className="micro">{xp}/{need} XP</span>
            </div>
            <ShieldBar pct={xp / need} />
          </div>
          <div className="row g8" style={{ flexShrink: 0 }}>
            <button onClick={() => setTab("profile")} className="tap row g6" style={{ cursor: "pointer", color: tab === "profile" ? "#9be8ff" : "#7fa8bf" }}>
              <User size={15} />
              <span className="f-hud hide-sm" style={{ fontSize: 11, letterSpacing: ".1em" }}>{user.username}</span>
            </button>
            <div className="streak-pill cham-s">
              <Flame size={14} color="#ffd76a" />
              <span className="f-hud t-amber" style={{ fontWeight: 700, fontSize: 14 }}>{streak}</span>
            </div>
          </div>
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
                    color: on ? "#9be8ff" : "#3f637c",
                    background: on ? "#0c1c2b" : "transparent",
                    boxShadow: on ? "inset 3px 0 0 #57c8f2" : "none",
                  }}>
                  <t.icon size={17} style={on ? { filter: "drop-shadow(0 0 5px #57c8f2)" } : {}} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="main-area">
          {tab === "training" && <Training addXp={addXp} fireToast={fireToast} routines={routines} setRoutines={setRoutines} prs={prs} setPrs={setPrs} />}
          {tab === "nutrition" && (
            <NutritionTab body={body} nutri={nutri} setNutri={setNutri} fireToast={fireToast} goProfile={() => setTab("profile")} />
          )}
          {tab === "profile" && (
            <ProfileTab user={user} body={body} setBody={setBody}
              fireToast={fireToast} onLogout={async () => { await supabase.auth.signOut(); setTab("training"); }}
              onUserUpdate={setUser} level={level} rank={rank} streak={streak}
              onRedoSetup={() => setBody((b) => ({ ...b, onboarded: false }))} />
          )}
        </main>
      </div>

      {/* BOTTOM NAV (mobile) */}
      <nav className="bottom-nav">
        {navItems.map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className="bnav-btn tap"
              style={{ color: on ? "#9be8ff" : "#3f637c", alignItems: "center", textAlign: "center" }}>
              <t.icon size={20} style={on ? { filter: "drop-shadow(0 0 5px #57c8f2)" } : {}} />
              {t.label}
              <div style={{ height: 2, width: 32, background: on ? "#57c8f2" : "transparent", boxShadow: on ? "0 0 6px #57c8f2" : "none" }} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ================================ TRAINING ================================ */
function Training({ addXp, fireToast, routines, setRoutines, prs, setPrs }) {
  const [view, setView] = useState("home");
  const [activeId, setActiveId] = useState(null);

  const [confirmDel, setConfirmDel] = useState(null);
  const deleteRoutine = (id) => {
    setRoutines((rs) => rs.filter((r) => r.id !== id));
    setConfirmDel(null);
    fireToast({ title: "◈ SCHEDA ELIMINATA" });
  };

  const saveRoutine = (r, msg) => {
    setRoutines((rs) => [...rs, r]);
    setView("home");
    fireToast({ title: msg || "◈ SCHEDA SALVATA", sub: r.name });
  };

  if (activeId != null) {
    const active = routines.find((r) => r.id === activeId);
    return <WorkoutLog routine={active} prs={prs} setPrs={setPrs} addXp={addXp} fireToast={fireToast}
      update={(fn) => setRoutines((rs) => rs.map((r) => r.id === activeId ? fn(r) : r))}
      exit={() => setActiveId(null)} />;
  }
  if (view === "builder") return <RoutineBuilder onClose={() => setView("home")} onSave={(r) => saveRoutine(r)} />;
  if (view === "ai") return <AIWorkout onClose={() => setView("home")} onSave={(r) => saveRoutine(r, "◈ SCHEDA AI GENERATA")} />;
  if (view === "import") return <DocImport onClose={() => setView("home")} onSave={(r) => saveRoutine(r, "◈ DOCUMENTO INTERPRETATO")} />;

  return (
    <div className="fade-in two-col">
      {/* LEFT: routines */}
      <div className="col stack">
        <div className="row between">
          <h2 className="hud-title">▸ Schede attive</h2>
          <Btn small onClick={() => setView("builder")}><Plus size={12} style={{ display: "inline", verticalAlign: -2 }} /> Nuova</Btn>
        </div>

        {routines.length === 0 && (
          <Panel>
            <div className="tiny t-faint" style={{ textAlign: "center", padding: "12px 0" }}>
              Nessuna scheda. Creane una, importala da un documento PT o usa il generatore AI.
            </div>
          </Panel>
        )}
        {routines.map((r) => (
          <button key={r.id} onClick={() => setActiveId(r.id)} className="tap" style={{ width: "100%", cursor: "pointer" }}>
            <Panel hover>
              <div className="row between g12">
                <div className="grow">
                  <div className="f-hud t-bright" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 15 }}>{r.name}</div>
                  <div className="tiny t-dim" style={{ marginTop: 2 }}>
                    {r.exercises.length} ESERCIZI · {r.exercises.reduce((a, e) => a + e.sets.length, 0)} SERIE
                  </div>
                  <div className="row wrap g6" style={{ marginTop: 8 }}>
                    {[...new Set(r.exercises.map((e) => e.group))].map((g) => (
                      <span key={g} className="chip cham-s">{g}</span>
                    ))}
                  </div>
                </div>
                <div className="row g8" style={{ flexShrink: 0 }}>
                  {confirmDel === r.id ? (
                    <>
                      <span onClick={(e) => { e.stopPropagation(); deleteRoutine(r.id); }}
                        className="tap tiny t-red" style={{ cursor: "pointer", fontWeight: 700 }}>ELIMINA</span>
                      <span onClick={(e) => { e.stopPropagation(); setConfirmDel(null); }}
                        className="tap tiny t-faint" style={{ cursor: "pointer" }}>annulla</span>
                    </>
                  ) : (
                    <>
                      <span onClick={(e) => { e.stopPropagation(); setConfirmDel(r.id); }}
                        className="tap" style={{ cursor: "pointer", color: "#3f637c" }}>
                        <Trash2 size={15} />
                      </span>
                      <Play size={18} color="#57c8f2" />
                    </>
                  )}
                </div>
              </div>
            </Panel>
          </button>
        ))}

        <button onClick={() => setView("import")} className="tap" style={{ width: "100%", cursor: "pointer" }}>
          <Panel accent hover>
            <div className="row g12">
              <Upload size={20} color="#9be8ff" />
              <div className="grow">
                <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 13 }}>IMPORTA SCHEDA PT</div>
                <div className="tiny t-dim">Carica un documento (PDF, foto, testo) — l'AI lo converte in allenamento</div>
              </div>
              <ChevronRight size={16} color="#3f637c" />
            </div>
          </Panel>
        </button>

        <button onClick={() => setView("ai")} className="tap row g6"
          style={{ cursor: "pointer", color: "#3f637c", fontFamily: "'Chakra Petch',sans-serif", fontSize: 11, letterSpacing: ".2em" }}>
          <Bot size={13} /> GENERATORE AI ›
        </button>
      </div>

      {/* RIGHT: history + library + PR */}
      <div className="col stack">
        <Panel>
          <div className="hud-label" style={{ marginBottom: 8 }}>▸ Mission log — ultimi allenamenti</div>
          {MOCK_HISTORY.length === 0 && (
            <div className="tiny t-faint" style={{ padding: "8px 0" }}>
              Nessun allenamento registrato. Completa il primo workout per iniziare il log.
            </div>
          )}
          {MOCK_HISTORY.map((h, i) => (
            <div key={i} className="divider-row g12">
              <div className="micro" style={{ width: 46, flexShrink: 0 }}>{h.date}</div>
              <div className="grow">
                <div className="row g6 t-bright" style={{ fontSize: 14 }}>
                  {h.name}{h.pr && <Trophy size={11} color="#ffd76a" />}
                </div>
                <div className="tiny t-faint">{h.sets} serie · {h.duration}</div>
              </div>
              <div className="f-hud t-cyan" style={{ fontWeight: 700, fontSize: 13 }}>
                {h.volume.toLocaleString()} <span className="t-faint" style={{ fontWeight: 500 }}>kg</span>
              </div>
            </div>
          ))}
        </Panel>

        <ExerciseLibrary />

        <Panel>
          <div className="hud-label row g6" style={{ marginBottom: 8 }}>
            <Trophy size={13} color="#ffd76a" /> Personal records
          </div>
          {Object.keys(prs).length === 0 && (
            <div className="tiny t-faint" style={{ padding: "6px 0" }}>
              Nessun record. Completa serie con carichi crescenti per registrare i PR.
            </div>
          )}
          {Object.entries(prs).map(([k, v]) => (
            <div key={k} className="divider-row">
              <span style={{ fontSize: 14 }}>{k}</span>
              <span className="f-hud t-amber" style={{ fontWeight: 700, fontSize: 13 }}>{v} KG</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Exercise Library ---------------- */
function ExerciseLibrary() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState("Petto");
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
    <Panel>
      <div className="hud-label" style={{ marginBottom: 8 }}>▸ Libreria esercizi</div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={14} color="#3f637c" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
        <input className="hud-input cham-s" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca esercizio..." style={{ paddingLeft: 32 }} />
      </div>
      <div className="scroll-y stack-s">
        {Object.entries(filtered).map(([g, list]) => (
          <div key={g}>
            <button onClick={() => setOpen(open === g ? null : g)} className="tap cham-s row between"
              style={{ width: "100%", padding: "8px 10px", cursor: "pointer", border: "1px solid #0e2233", background: "#060f18" }}>
              <span className="f-hud t-cyan" style={{ fontSize: 11, letterSpacing: ".2em" }}>{g.toUpperCase()}</span>
              <span className="tiny t-faint">{list.length} ▾</span>
            </button>
            {(open === g || q) && (
              <div className="fade-in" style={{ paddingLeft: 12, paddingTop: 4 }}>
                {list.map((e) => (
                  <div key={e} style={{ fontSize: 14, padding: "5px 0", borderBottom: "1px solid #0a1826" }}>{e}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------- Workout Log ---------------- */
function WorkoutLog({ routine, prs, setPrs, addXp, fireToast, update, exit }) {
  const [restTime, setRestTime] = useState(0);
  const [restRunning, setRestRunning] = useState(false);

  useEffect(() => {
    if (!restRunning) return;
    if (restTime <= 0) {
      setRestRunning(false);
      fireToast({ title: "◈ REST COMPLETE", sub: "Prossima serie", color: "#ffd76a" });
      return;
    }
    const t = setTimeout(() => setRestTime((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [restRunning, restTime]);

  const toggleSet = (ei, si) => {
    const s = routine.exercises[ei].sets[si];
    const ex = routine.exercises[ei];
    update((r) => ({
      ...r,
      exercises: r.exercises.map((e, i) => i !== ei ? e : {
        ...e, sets: e.sets.map((st, j) => j !== si ? st : { ...st, done: !st.done }),
      }),
    }));
    if (!s.done) {
      addXp(10);
      setRestTime(90); setRestRunning(true);
      if ((s.w || 0) > (prs[ex.name] || 0)) {
        setPrs((p) => ({ ...p, [ex.name]: s.w }));
        fireToast({ title: "▲ NEW RECORD", sub: `${ex.name} — ${s.w} KG`, color: "#ffd76a" });
      }
    }
  };

  const updateSet = (ei, si, field, val) => update((r) => ({
    ...r,
    exercises: r.exercises.map((e, i) => i !== ei ? e : {
      ...e, sets: e.sets.map((st, j) => j !== si ? st : { ...st, [field]: val === "" ? "" : Number(val) }),
    }),
  }));

  const addSet = (ei) => update((r) => ({
    ...r,
    exercises: r.exercises.map((e, i) => i !== ei ? e : { ...e, sets: [...e.sets, { ...e.sets[e.sets.length - 1], done: false }] }),
  }));

  const volume = routine.exercises.reduce((v, e) => v + e.sets.filter((s) => s.done).reduce((a, s) => a + (s.w || 0) * (s.r || 0), 0), 0);
  const totalSets = routine.exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = routine.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);

  const finish = () => {
    addXp(60);
    fireToast({ title: "◈ MISSION COMPLETE", sub: `+60 XP · VOLUME ${volume.toLocaleString()} KG` });
    setRestRunning(false);
    exit();
  };

  return (
    <div className="fade-in stack" style={{ maxWidth: 640 }}>
      <div className="row between">
        <Btn small onClick={exit}>‹ Esci</Btn>
        <span className="hud-title">{routine.name}</span>
        <Btn small primary onClick={finish}>Fine ✓</Btn>
      </div>

      <Panel style={{ padding: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center" }}>
          <div>
            <div className="f-hud t-cyan" style={{ fontWeight: 700, fontSize: 16 }}>{volume.toLocaleString()}</div>
            <div className="micro">VOLUME KG</div>
          </div>
          <div>
            <div className="f-hud t-bright" style={{ fontWeight: 700, fontSize: 16 }}>{doneSets}<span className="t-faint">/{totalSets}</span></div>
            <div className="micro">SERIE</div>
          </div>
          <div>
            <div className={`f-hud ${restRunning ? "t-amber blink" : "t-faint"}`} style={{ fontWeight: 700, fontSize: 16 }}>
              {restRunning ? `${Math.floor(restTime / 60)}:${String(restTime % 60).padStart(2, "0")}` : "--:--"}
            </div>
            <div className="micro">REST</div>
          </div>
        </div>
      </Panel>

      {restRunning && (
        <Panel accent style={{ padding: 12 }}>
          <div className="row g12">
            <Timer size={16} color="#ffd76a" />
            <div className="grow cham-s" style={{ height: 6, background: "#0e2233" }}>
              <div style={{ height: "100%", width: `${(restTime / 90) * 100}%`, background: "#ffd76a", transition: "width 1s linear", boxShadow: "0 0 8px rgba(255,215,106,.5)" }} />
            </div>
            <button onClick={() => setRestRunning(false)} className="tap" style={{ cursor: "pointer", color: "#3f637c" }}><Square size={14} /></button>
          </div>
        </Panel>
      )}

      {routine.exercises.map((ex, ei) => (
        <Panel key={ei}>
          <div className="row between" style={{ marginBottom: 12 }}>
            <div>
              <div className="t-bright" style={{ fontSize: 15, fontWeight: 700 }}>{ex.name}</div>
              <div className="micro">{ex.group.toUpperCase()} · PR {prs[ex.name] || "—"} KG</div>
            </div>
            {prs[ex.name] && <Trophy size={15} color="#ffd76a" />}
          </div>
          <div className="set-grid micro" style={{ marginBottom: 4, padding: "0 4px" }}>
            <span>SET</span><span>KG</span><span>REPS</span><span></span>
          </div>
          {ex.sets.map((s, si) => (
            <div key={si} className={`set-grid cham-s ${s.done ? "set-done" : ""}`} style={{ marginBottom: 6, padding: 4 }}>
              <span className="f-hud t-faint" style={{ fontSize: 12, textAlign: "center" }}>{si + 1}</span>
              <input className="hud-input cham-s" type="number" inputMode="decimal" value={s.w}
                onChange={(e) => updateSet(ei, si, "w", e.target.value)} style={{ textAlign: "center", padding: "8px 4px" }} />
              <input className="hud-input cham-s" type="number" inputMode="numeric" value={s.r}
                onChange={(e) => updateSet(ei, si, "r", e.target.value)} style={{ textAlign: "center", padding: "8px 4px" }} />
              <button onClick={() => toggleSet(ei, si)} className={`check-btn cham-s tap ${s.done ? "check-on" : ""}`}>
                <Check size={15} strokeWidth={3} />
              </button>
            </div>
          ))}
          <button onClick={() => addSet(ei)} className="dash-btn cham-s tap" style={{ marginTop: 4 }}>+ SERIE</button>
        </Panel>
      ))}
    </div>
  );
}

/* ---------------- Routine Builder ---------------- */
function RoutineBuilder({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState([]);
  const toggle = (ex, group) => setSelected((s) =>
    s.find((e) => e.name === ex) ? s.filter((e) => e.name !== ex)
      : [...s, { name: ex, group, sets: [{ w: 20, r: 10, done: false }, { w: 20, r: 10, done: false }, { w: 20, r: 10, done: false }] }]);
  return (
    <div className="fade-in stack" style={{ maxWidth: 640 }}>
      <div className="row between">
        <Btn small onClick={onClose}>‹ Annulla</Btn>
        <span className="hud-title">Nuova scheda</span>
        <Btn small primary disabled={!name || !selected.length}
          onClick={() => onSave({ id: Date.now(), name: name.toUpperCase(), exercises: selected })}>Salva</Btn>
      </div>
      <input className="hud-input cham-s" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome scheda (es. LEG DAY)" />
      {selected.length > 0 && (
        <Panel accent style={{ padding: 12 }}>
          <div className="hud-label" style={{ marginBottom: 6 }}>Selezionati · {selected.length}</div>
          <div className="row wrap g6">
            {selected.map((e) => (
              <button key={e.name} onClick={() => toggle(e.name, e.group)} className="tap cham-s row g4"
                style={{ cursor: "pointer", fontSize: 12, padding: "5px 10px", background: "#0c2a3d", border: "1px solid #57c8f2", color: "#9be8ff" }}>
                {e.name} <X size={11} />
              </button>
            ))}
          </div>
        </Panel>
      )}
      <input className="hud-input cham-s" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtra esercizi..." />
      {Object.entries(EXERCISE_DB).map(([group, list]) => {
        const shown = list.filter((e) => e.toLowerCase().includes(q.toLowerCase()));
        if (!shown.length) return null;
        return (
          <Panel key={group} style={{ padding: 12 }}>
            <div className="f-hud t-cyan" style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".25em", marginBottom: 8 }}>{group.toUpperCase()}</div>
            <div className="row wrap g6">
              {shown.map((ex) => {
                const on = selected.find((e) => e.name === ex);
                return (
                  <button key={ex} onClick={() => toggle(ex, group)}
                    className={`tap cham-s chip ${on ? "chip-on" : ""}`}
                    style={{ cursor: "pointer", fontSize: 12, letterSpacing: ".02em", padding: "6px 12px", fontFamily: "'Rajdhani',sans-serif", textTransform: "none" }}>
                    {ex}
                  </button>
                );
              })}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

/* ---------------- PT Document Import (AI) ---------------- */
function DocImport({ onClose, onSave }) {
  const [file, setFile] = useState(null);
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
    setLoading(true); setError(null);
    try {
      const content = [];
      if (file) {
        const b64 = await readBase64(file);
        if (file.type === "application/pdf") {
          content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } });
        } else if (file.type.startsWith("image/")) {
          content.push({ type: "image", source: { type: "base64", media_type: file.type, data: b64 } });
        } else {
          content.push({ type: "text", text: decodeURIComponent(escape(atob(b64))) });
        }
      }
      if (pasted.trim()) content.push({ type: "text", text: pasted });
      content.push({
        type: "text",
        text: `Sei un assistente per un'app di fitness. Il documento/testo sopra è una scheda di allenamento scritta da un personal trainer (formato libero).
Interpretala e convertila in JSON. Rispondi SOLO con JSON valido, senza markdown, senza backtick, senza testo extra.
Schema: {"name": string (nome scheda breve maiuscolo), "exercises": [{"name": string (nome esercizio in italiano), "group": string (uno tra: ${GROUPS.join(", ")}, oppure "Altro"), "sets": [{"w": number (kg, 0 se corpo libero o non indicato), "r": number (ripetizioni, stima se è un range es. "8-10" -> 9)}]}]}
Se un esercizio indica "3x10 60kg" genera 3 set identici. Se il documento contiene più giorni, unisci nel nome il giorno 1 e includi solo gli esercizi del giorno 1.`,
      });

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1000, messages: [{ role: "user", content }] }),
      });
      const data = await response.json();
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const routine = {
        id: Date.now(),
        name: (parsed.name || "SCHEDA PT").toUpperCase(),
        exercises: (parsed.exercises || []).map((e) => ({
          name: e.name,
          group: GROUPS.includes(e.group) ? e.group : findGroup(e.name),
          sets: (e.sets || []).map((s) => ({ w: Number(s.w) || 0, r: Number(s.r) || 10, done: false })),
        })).filter((e) => e.sets.length),
      };
      if (!routine.exercises.length) throw new Error("Nessun esercizio riconosciuto nel documento");
      setResult(routine);
    } catch (err) {
      setError(err.message || "Interpretazione fallita. Riprova con un documento più leggibile.");
    }
    setLoading(false);
  };

  return (
    <div className="fade-in stack" style={{ maxWidth: 640 }}>
      <div className="row between">
        <Btn small onClick={onClose}>‹ Indietro</Btn>
        <span className="hud-title">Import scheda PT</span>
        <div style={{ width: 64 }} />
      </div>

      {!result ? (
        <>
          <Panel accent>
            <input ref={inputRef} type="file" accept=".pdf,image/*,.txt,.md,.csv" style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
            <button onClick={() => inputRef.current && inputRef.current.click()} className="tap cham"
              style={{ width: "100%", padding: "32px 16px", cursor: "pointer", border: "1px dashed #2f6786", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {file ? (
                <>
                  <FileText size={24} color="#9be8ff" />
                  <span className="t-bright" style={{ fontSize: 14, fontWeight: 700 }}>{file.name}</span>
                  <span className="micro">TOCCA PER SOSTITUIRE</span>
                </>
              ) : (
                <>
                  <Upload size={24} color="#57c8f2" />
                  <span className="f-hud t-cyan" style={{ fontSize: 12, letterSpacing: ".2em" }}>CARICA DOCUMENTO</span>
                  <span className="tiny t-dim">PDF · Foto della scheda · File di testo</span>
                </>
              )}
            </button>
            <div className="micro" style={{ textAlign: "center", margin: "12px 0" }}>— OPPURE —</div>
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
            {loading ? <span className="row center g8"><Loader2 size={14} className="spin" /> Analisi in corso...</span> : "◈ Interpreta con AI"}
          </Btn>
        </>
      ) : (
        <>
          <Panel accent>
            <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".2em", marginBottom: 12 }}>{result.name}</div>
            {result.exercises.map((e, i) => (
              <div key={i} className="divider-row">
                <div>
                  <span className="t-bright" style={{ fontSize: 14 }}>{e.name}</span>
                  <span className="micro" style={{ marginLeft: 8 }}>{e.group.toUpperCase()}</span>
                </div>
                <span className="tiny t-dim">{e.sets.length} × {e.sets[0].r}{e.sets[0].w ? ` @ ${e.sets[0].w}kg` : ""}</span>
              </div>
            ))}
          </Panel>
          <div className="row g8">
            <Btn onClick={() => setResult(null)} style={{ flex: 1 }}>↻ Riprova</Btn>
            <Btn primary onClick={() => onSave(result)} style={{ flex: 1 }}>Salva scheda ✓</Btn>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- AI Workout Generator ---------------- */
function AIWorkout({ onClose, onSave }) {
  const [goal, setGoal] = useState("Massa");
  const [days, setDays] = useState(3);
  const [equip, setEquip] = useState("Palestra completa");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const generate = () => {
    setLoading(true);
    setTimeout(() => {
      const scheme = goal === "Forza" ? { s: 5, r: 5 } : goal === "Massa" ? { s: 4, r: 10 } : { s: 3, r: 15 };
      const daySplits = days >= 4
        ? [["Petto", "Tricipiti"], ["Dorso", "Bicipiti"], ["Gambe", "Core"], ["Spalle", "Core"]].slice(0, days)
        : days === 3 ? [["Petto", "Spalle", "Tricipiti"], ["Dorso", "Bicipiti"], ["Gambe", "Core"]]
        : [["Petto", "Dorso", "Gambe"], ["Spalle", "Bicipiti", "Tricipiti"]];
      const bw = ["Push-Up", "Trazioni", "Plank", "Crunch", "Russian Twist", "Leg Raise", "Dip alle Parallele", "Dip tra Panche", "Affondi Bulgari", "Side Plank"];
      const db = [...bw, "Panca Piana Manubri", "Panca Inclinata Manubri", "Rematore Manubrio", "Curl Manubri Alternato", "Hammer Curl", "Shoulder Press Manubri", "Arnold Press", "Alzate Laterali", "Stacco Rumeno", "Affondi Manubri", "Kickback Manubrio"];
      const filter = (list) => equip === "Palestra completa" ? list : list.filter((e) => (equip === "Manubri" ? db : bw).includes(e));
      const exercises = daySplits[0].flatMap((g) => filter(EXERCISE_DB[g]).slice(0, 2).map((name) => ({
        name, group: g,
        sets: Array.from({ length: scheme.s }, () => ({ w: equip === "Corpo libero" ? 0 : goal === "Forza" ? 60 : 30, r: scheme.r, done: false })),
      })));
      setResult({
        id: Date.now(),
        name: `AI ${goal.toUpperCase()} D1`,
        exercises,
        plan: daySplits.map((g, i) => `Giorno ${i + 1}: ${g.join(" + ")}`),
      });
      setLoading(false);
    }, 1000);
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
        <Btn small onClick={onClose}>‹ Indietro</Btn>
        <span className="hud-title">Generatore AI</span>
        <div style={{ width: 64 }} />
      </div>
      {!result ? (
        <Panel className="stack">
          <div><div className="hud-label" style={{ marginBottom: 6 }}>Obiettivo</div>
            <Opt options={["Massa", "Forza", "Dimagrimento"]} value={goal} set={setGoal} /></div>
          <div>
            <div className="hud-label" style={{ marginBottom: 6 }}>Giorni/settimana · <span className="t-cyan">{days}</span></div>
            <input type="range" min="2" max="4" value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </div>
          <div><div className="hud-label" style={{ marginBottom: 6 }}>Attrezzatura</div>
            <Opt options={["Palestra completa", "Manubri", "Corpo libero"]} value={equip} set={setEquip} /></div>
          <Btn primary full disabled={loading} onClick={generate}>
            {loading ? "Generazione..." : "Genera scheda"}
          </Btn>
        </Panel>
      ) : (
        <>
          <Panel accent>
            <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".2em", marginBottom: 4 }}>{result.name}</div>
            {result.plan.map((p) => <div key={p} className="tiny t-dim">{p}</div>)}
            <div style={{ marginTop: 12 }}>
              {result.exercises.map((e) => (
                <div key={e.name} className="divider-row">
                  <span className="t-bright" style={{ fontSize: 14 }}>{e.name}</span>
                  <span className="tiny t-dim">{e.sets.length} × {e.sets[0].r}{e.sets[0].w ? ` @ ${e.sets[0].w}kg` : ""}</span>
                </div>
              ))}
            </div>
          </Panel>
          <div className="row g8">
            <Btn onClick={() => setResult(null)} style={{ flex: 1 }}>↻ Rigenera</Btn>
            <Btn primary onClick={() => onSave(result)} style={{ flex: 1 }}>Salva ✓</Btn>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================ AUTH ================================ */
const AuthField = ({ icon: Icon, ...props }) => (
  <div style={{ position: "relative" }}>
    <Icon size={15} color="#3f637c" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
    <input {...props} className="hud-input cham-s" style={{ paddingLeft: 34, ...(props.style || {}) }} />
  </div>
);

function AuthScreen({ fireToast }) {
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
        fireToast({ title: "◈ ACCESSO EFFETTUATO" });
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
            GYM<span className="t-faint">//</span>QUEST
          </div>
          <div className="micro" style={{ marginTop: 6 }}>TRAINING HUD SYSTEM</div>
        </div>

        <div className="panel panel-accent cham stack" style={{ padding: 24 }}>
          <div className="hud-title" style={{ textAlign: "center", fontSize: 13 }}>
            {mode === "login" ? "Accedi" : mode === "register" ? "Crea account" : "Recupera password"}
          </div>

          {sent ? (
            <>
              <div className="tiny t-dim" style={{ textAlign: "center", lineHeight: 1.6 }}>
                {mode === "forgot"
                  ? <>Se <span className="t-cyan">{email}</span> è registrata, riceverai un link per reimpostare la password.</>
                  : <>Ti abbiamo inviato un'email di conferma a <span className="t-cyan">{email}</span>. Aprila per attivare l'account.</>}
              </div>
              <Btn full onClick={() => { setMode("login"); reset(); }}>‹ Torna al login</Btn>
            </>
          ) : (
            <>
              <AuthField icon={Mail} type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="email" />

              {mode === "register" && (
                <AuthField icon={User} type="text" placeholder="Username" value={username}
                  onChange={(e) => setUsername(e.target.value)} />
              )}

              {mode !== "forgot" && (
                <div style={{ position: "relative" }}>
                  <Lock size={15} color="#3f637c" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
                  <input type={showPw ? "text" : "password"} placeholder="Password" value={pw}
                    onChange={(e) => setPw(e.target.value)} className="hud-input cham-s"
                    style={{ paddingLeft: 34, paddingRight: 40 }}
                    autoComplete={mode === "login" ? "current-password" : "new-password"} />
                  <button onClick={() => setShowPw(!showPw)} className="tap"
                    style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#3f637c" }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              )}

              {mode === "register" && (
                <AuthField icon={Lock} type={showPw ? "text" : "password"} placeholder="Conferma password"
                  value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
              )}

              {error && <div className="tiny t-red">⚠ {error}</div>}

              <Btn primary full disabled={loading} onClick={submit}>
                {loading ? "..." : mode === "login" ? "Accedi" : mode === "register" ? "Registrati" : "Invia link di reset"}
              </Btn>

              <div className="row between">
                {mode === "login" ? (
                  <>
                    <button className="link-btn tap" onClick={() => { setMode("forgot"); reset(); }}>Password dimenticata?</button>
                    <button className="link-btn tap" onClick={() => { setMode("register"); reset(); }}>Crea account ›</button>
                  </>
                ) : (
                  <button className="link-btn tap" onClick={() => { setMode("login"); reset(); }}>‹ Torna al login</button>
                )}
              </div>
            </>
          )}
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
function ProfileTab({ user, body, setBody, fireToast, onLogout, onUserUpdate, level, rank, streak, onRedoSetup }) {
  const [draft, setDraft] = useState(body);
  const [username, setUsername] = useState(user.username);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState(null);

  const num = (v) => (v === "" ? "" : Number(v));
  const setD = (k, v) => setDraft((d) => ({ ...d, [k]: num(v) }));

  const bmi = draft.peso && draft.altezza ? (draft.peso / Math.pow(draft.altezza / 100, 2)).toFixed(1) : "—";
  const bmiLabel = bmi === "—" ? "" : bmi < 18.5 ? "SOTTOPESO" : bmi < 25 ? "NORMOPESO" : bmi < 30 ? "SOVRAPPESO" : "OBESITÀ";

  const saveBody = () => {
    setBody(draft);
    fireToast({ title: "◈ DATI SALVATI", sub: "Profilo corporeo aggiornato" });
  };

  const saveAccount = async () => {
    setPwError(null);
    if (username.trim().length < 3) return setPwError("Username: minimo 3 caratteri");
    if (newPw && newPw.length < 6) return setPwError("Nuova password: minimo 6 caratteri");
    const payload = { data: { username: username.trim() } };
    if (newPw) payload.password = newPw;
    const { error } = await supabase.auth.updateUser(payload);
    if (error) return setPwError(error.message);
    onUserUpdate({ ...user, username: username.trim() });
    setOldPw(""); setNewPw("");
    fireToast({ title: "◈ ACCOUNT AGGIORNATO", sub: username.trim() });
  };

  return (
    <div className="fade-in two-col">
      {/* LEFT: account */}
      <div className="col stack">
        <Panel accent>
          <div className="row g12" style={{ marginBottom: 12 }}>
            <div className="cham-s" style={{ width: 52, height: 52, background: "#0c2a3d", border: "1px solid #57c8f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={24} color="#9be8ff" />
            </div>
            <div>
              <div className="f-hud t-bright" style={{ fontWeight: 700, fontSize: 16, letterSpacing: ".1em" }}>{user.username}</div>
              <div className="micro">LV.{level} {rank} · STREAK {streak} GIORNI</div>
              <div className="tiny t-faint">{user.email}</div>
            </div>
          </div>
          <div className="row g8 wrap">
            <Btn small onClick={onRedoSetup}>◈ Rifai setup profilo</Btn>
            <Btn small onClick={onLogout}><LogOut size={12} style={{ display: "inline", verticalAlign: -2 }} /> Esci</Btn>
          </div>
        </Panel>

        <Panel>
          <div className="hud-label" style={{ marginBottom: 12 }}>▸ Impostazioni account</div>
          <div className="stack-s">
            <div>
              <div className="hud-label" style={{ marginBottom: 4, fontSize: 9 }}>Username</div>
              <input className="hud-input cham-s" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <div className="hud-label" style={{ marginBottom: 4, fontSize: 9 }}>Nuova password</div>
              <input className="hud-input cham-s" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                placeholder="Minimo 6 caratteri" autoComplete="new-password" />
            </div>
            {pwError && <div className="tiny t-red">⚠ {pwError}</div>}
            <Btn primary full onClick={saveAccount}>Salva account</Btn>
          </div>
        </Panel>
      </div>

      {/* RIGHT: body data */}
      <div className="col stack">
        <Panel>
          <div className="hud-label row g6" style={{ marginBottom: 12 }}>
            <Ruler size={13} color="#9be8ff" /> Dati corporei
          </div>
          <div className="field-grid">
            <BodyField draft={draft} setD={setD} label="Peso" k="peso" unit="kg" step="0.1" />
            <BodyField draft={draft} setD={setD} label="Altezza" k="altezza" unit="cm" />
            <BodyField draft={draft} setD={setD} label="Età" k="eta" unit="anni" />
            <div>
              <div className="hud-label" style={{ marginBottom: 4, fontSize: 9 }}>Sesso</div>
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

          <div className="hud-label" style={{ margin: "16px 0 8px", fontSize: 9 }}>Circonferenze (cm)</div>
          <div className="field-grid">
            <BodyField draft={draft} setD={setD} label="Collo" k="collo" step="0.5" />
            <BodyField draft={draft} setD={setD} label="Petto" k="petto" step="0.5" />
            <BodyField draft={draft} setD={setD} label="Vita" k="vita" step="0.5" />
            <BodyField draft={draft} setD={setD} label="Braccio" k="braccio" step="0.5" />
            <BodyField draft={draft} setD={setD} label="Coscia" k="coscia" step="0.5" />
          </div>

          <div className="row between cham-s" style={{ marginTop: 16, padding: "10px 14px", background: "#060f18", border: "1px solid #0e2233" }}>
            <span className="hud-label" style={{ fontSize: 9 }}>BMI calcolato</span>
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

/* Piano di fallback locale (se l'API non risponde): template scalato sulle kcal */
const FALLBACK_PLAN = (t) => {
  const scale = t.kcal / 2400;
  const s = (g) => Math.round((g * scale) / 5) * 5;
  return {
    Colazione: [
      { nome: "Avena", q: `${s(80)}g` }, { nome: "Yogurt greco 0%", q: `${s(200)}g` },
      { nome: "Banana", q: "1 media" }, { nome: "Mandorle", q: `${s(15)}g` },
    ],
    Pranzo: [
      { nome: "Petto di pollo", q: `${s(180)}g` }, { nome: "Riso basmati", q: `${s(90)}g` },
      { nome: "Verdure miste", q: "a volontà" }, { nome: "Olio EVO", q: `${s(10)}g` },
    ],
    "Spuntino pre-workout": [
      { nome: "Pane integrale", q: `${s(60)}g` }, { nome: "Bresaola", q: `${s(60)}g` },
    ],
    "Post-workout": [
      { nome: "Whey protein", q: "30g" }, { nome: "Banana", q: "1 media" },
    ],
    Cena: [
      { nome: "Salmone o pesce bianco", q: `${s(180)}g` }, { nome: "Patate", q: `${s(250)}g` },
      { nome: "Verdure", q: "a volontà" }, { nome: "Olio EVO", q: `${s(10)}g` },
    ],
  };
};

function MacroBar({ label, grams, kcalPerG, totalKcal, color }) {
  const pct = Math.round(((grams * kcalPerG) / totalKcal) * 100);
  return (
    <div>
      <div className="row between" style={{ marginBottom: 3 }}>
        <span className="hud-label" style={{ fontSize: 9 }}>{label}</span>
        <span className="tiny"><span className="f-hud" style={{ color, fontWeight: 700 }}>{grams}g</span> <span className="t-faint">· {pct}%</span></span>
      </div>
      <div className="cham-s" style={{ height: 6, background: "#0e2233" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}`, transition: "width .5s ease" }} />
      </div>
    </div>
  );
}

function NutritionTab({ body, nutri, setNutri, fireToast, goProfile }) {
  const [goal, setGoal] = useState(nutri ? nutri.goal : (body.obiettivo || "Massa"));
  const [days, setDays] = useState(nutri ? nutri.days : (body.giorniAllenamento || 3));
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);

  const generate = async () => {
    setLoading(true);
    const targets = calcTargets(body, days, goal);
    let meals = null;
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Genera un piano alimentare giornaliero per palestra. Target: ${targets.kcal} kcal, ${targets.p}g proteine, ${targets.c}g carboidrati, ${targets.f}g grassi. Utente: ${body.sesso === "M" ? "uomo" : "donna"}, ${body.peso}kg, obiettivo ${goal.toLowerCase()}, si allena ${days} volte a settimana.
Alimenti semplici da palestra (pollo, riso, avena, uova, whey, pesce...). 5 pasti: Colazione, Pranzo, Spuntino pre-workout, Post-workout, Cena.
Rispondi SOLO con JSON valido senza markdown né backtick: {"Colazione":[{"nome":string,"q":string (quantità es. "80g" o "2 uova")}],...stessa struttura per gli altri 4 pasti}`,
          }],
        }),
      });
      const data = await response.json();
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      meals = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch (e) {
      meals = FALLBACK_PLAN(targets); // offline/errore: piano template scalato
    }
    setNutri({ goal, days, targets, meals });
    setLoading(false);
    fireToast({ title: "◈ PIANO GENERATO", sub: `${targets.kcal} kcal · P${targets.p} C${targets.c} G${targets.f}` });
  };

  const startEdit = () => { setDraft({ ...nutri.targets }); setEditing(true); };
  const saveEdit = () => {
    const t = {
      kcal: Number(draft.kcal) || nutri.targets.kcal,
      p: Number(draft.p) || 0, c: Number(draft.c) || 0, f: Number(draft.f) || 0,
    };
    setNutri({ ...nutri, targets: t });
    setEditing(false);
    fireToast({ title: "◈ TARGET AGGIORNATI", sub: `${t.kcal} kcal` });
  };

  /* ---- Dati corporei mancanti: blocca la generazione ---- */
  const missingData = !body.peso || !body.altezza || !body.eta;
  if (!nutri && missingData) return (
    <div className="fade-in stack" style={{ maxWidth: 560 }}>
      <h2 className="hud-title">▸ Piano nutrizionale</h2>
      <Panel accent style={{ textAlign: "center", padding: 32 }}>
        <Ruler size={26} color="#ffd76a" style={{ margin: "0 auto 12px" }} />
        <div className="f-hud t-amber" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 13 }}>DATI CORPOREI MANCANTI</div>
        <div className="tiny t-dim" style={{ marginTop: 8, lineHeight: 1.6 }}>
          Per calcolare il fabbisogno servono almeno <span className="t-cyan">peso, altezza ed età</span>.
          Inseriscili nel profilo, poi torna qui.
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn primary onClick={goProfile}>Vai al profilo ›</Btn>
        </div>
      </Panel>
    </div>
  );

  /* ---- Nessun piano: schermata di generazione ---- */
  if (!nutri) return (
    <div className="fade-in stack" style={{ maxWidth: 560 }}>
      <h2 className="hud-title">▸ Piano nutrizionale</h2>
      <Panel accent className="stack">
        <div className="tiny t-dim" style={{ lineHeight: 1.6 }}>
          L'AI calcola il tuo fabbisogno dai <span className="t-cyan">dati corporei del profilo</span> ({body.peso}kg · {body.altezza}cm · {body.eta} anni)
          e dal volume di allenamento, poi genera un piano giornaliero con macro da palestra
          (proteine 2g/kg, grassi 0.9g/kg, carboidrati a completamento).
        </div>
        <div>
          <div className="hud-label" style={{ marginBottom: 6 }}>Obiettivo</div>
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
        <Btn primary full disabled={loading} onClick={generate}>
          {loading ? <span className="row center g8"><Loader2 size={14} className="spin" /> Generazione...</span> : "◈ Genera piano AI"}
        </Btn>
      </Panel>
    </div>
  );

  /* ---- Piano attivo ---- */
  const t = nutri.targets;
  return (
    <div className="fade-in two-col">
      <div className="col stack">
        <div className="row between">
          <h2 className="hud-title">▸ Piano — {nutri.goal}</h2>
          <Btn small onClick={() => setNutri(null)}>↻ Nuovo</Btn>
        </div>

        <Panel accent>
          <div className="row between" style={{ marginBottom: 12 }}>
            <div>
              <div className="f-hud t-cyan" style={{ fontWeight: 700, fontSize: 24 }}>{t.kcal}</div>
              <div className="micro">KCAL / GIORNO</div>
            </div>
            {!editing
              ? <Btn small onClick={startEdit}>Modifica target</Btn>
              : <Btn small primary onClick={saveEdit}>Salva ✓</Btn>}
          </div>

          {!editing ? (
            <div className="stack-s">
              <MacroBar label="Proteine" grams={t.p} kcalPerG={4} totalKcal={t.kcal} color="#57c8f2" />
              <MacroBar label="Carboidrati" grams={t.c} kcalPerG={4} totalKcal={t.kcal} color="#9be8ff" />
              <MacroBar label="Grassi" grams={t.f} kcalPerG={9} totalKcal={t.kcal} color="#ffd76a" />
            </div>
          ) : (
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
          )}

          <div className="micro" style={{ marginTop: 12 }}>
            P {(t.p / body.peso).toFixed(1)} g/kg · G {(t.f / body.peso).toFixed(1)} g/kg · {nutri.days} allenamenti/sett
          </div>
        </Panel>

        <Btn full onClick={generate} disabled={loading}>
          {loading ? "Rigenerazione..." : "↻ Rigenera pasti (stessi target)"}
        </Btn>
      </div>

      <div className="col stack">
        {Object.entries(nutri.meals).map(([meal, foods]) => (
          <Panel key={meal}>
            <div className="hud-label" style={{ marginBottom: 6 }}>
              {meal === "Colazione" ? "▸" : meal === "Cena" ? "▸" : "▸"} {meal}
            </div>
            {(Array.isArray(foods) ? foods : []).map((f, i) => (
              <div key={i} className="divider-row">
                <span style={{ fontSize: 14 }}>{f.nome}</span>
                <span className="tiny t-dim">{f.q}</span>
              </div>
            ))}
          </Panel>
        ))}
        <div className="micro">Il piano è indicativo: consulta un professionista per esigenze specifiche.</div>
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
  const [d, setD] = useState({
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
    if (step === 1) {
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
      attivita: d.attivita, giorniAllenamento: d.giorniAllenamento,
      esperienza: d.esperienza, obiettivo: d.obiettivo,
      onboarded: true,
    }));
    fireToast({ title: "◈ PROFILO CONFIGURATO", sub: "Benvenuto a bordo, " + username });
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
          <div className="f-hud t-cyan" style={{ fontSize: 18, fontWeight: 700, letterSpacing: ".25em" }}>SETUP PROFILO</div>
          <div className="row center g6" style={{ marginTop: 10 }}>
            {[1, 2, 3].map((s) => (
              <div key={s} className="seg" style={{ width: 40, flex: "none",
                background: step >= s ? "linear-gradient(180deg,#9be8ff,#3fa9d9)" : "#0e2233",
                boxShadow: step >= s ? "0 0 6px rgba(87,200,242,.6)" : "none" }} />
            ))}
          </div>
          <div className="micro" style={{ marginTop: 6 }}>PASSO {step} DI 3</div>
        </div>

        <div className="panel panel-accent cham stack" style={{ padding: 24 }}>
          {step === 1 && (
            <>
              <div className="hud-title" style={{ fontSize: 12 }}>Dati base</div>
              <div>
                <div className="hud-label" style={{ marginBottom: 4, fontSize: 9 }}>Sesso</div>
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

          {step === 2 && (
            <>
              <div className="hud-title" style={{ fontSize: 12 }}>Stile di vita</div>
              <div>
                <div className="hud-label" style={{ marginBottom: 6, fontSize: 9 }}>Attività quotidiana (fuori palestra)</div>
                <div className="stack-s">
                  {ACTIVITY_OPTS.map((o) => (
                    <button key={o.id} onClick={() => set("attivita", o.id)}
                      className={"tap cham-s " + (d.attivita === o.id ? "" : "")}
                      style={{ cursor: "pointer", width: "100%", padding: "10px 12px", textAlign: "left",
                        border: "1px solid " + (d.attivita === o.id ? "#57c8f2" : "#1b3a52"),
                        background: d.attivita === o.id ? "#0c2a3d" : "#060f18" }}>
                      <div className={d.attivita === o.id ? "t-cyan" : "t-bright"} style={{ fontSize: 14, fontWeight: 700 }}>{o.id}</div>
                      <div className="tiny t-faint">{o.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="hud-label" style={{ marginBottom: 6, fontSize: 9 }}>Allenamenti a settimana · <span className="t-cyan">{d.giorniAllenamento}</span></div>
                <input type="range" min="1" max="7" value={d.giorniAllenamento}
                  onChange={(e) => set("giorniAllenamento", Number(e.target.value))} />
              </div>
              <div>
                <div className="hud-label" style={{ marginBottom: 6, fontSize: 9 }}>Esperienza in palestra</div>
                <Chips k="esperienza" options={["Principiante", "Intermedio", "Avanzato"]} />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="hud-title" style={{ fontSize: 12 }}>Obiettivo</div>
              <Chips k="obiettivo" options={["Massa", "Mantenimento", "Definizione"]} />
              <div className="cham-s stack-s" style={{ padding: "12px 14px", background: "#060f18", border: "1px solid #0e2233" }}>
                <div className="hud-label" style={{ fontSize: 9 }}>Riepilogo</div>
                <div className="tiny t-dim" style={{ lineHeight: 1.7 }}>
                  {d.sesso === "M" ? "Uomo" : "Donna"} · {d.eta} anni · {d.altezza} cm · {d.peso} kg{d.bf ? " · " + d.bf + "% BF" : ""}<br />
                  Attività {d.attivita.toLowerCase()} · {d.giorniAllenamento} allenamenti/sett · {d.esperienza}<br />
                  Obiettivo: <span className="t-cyan">{d.obiettivo}</span>
                </div>
              </div>
            </>
          )}

          {err && <div className="tiny t-red">⚠ {err}</div>}

          <div className="row g8">
            {step > 1 && <Btn onClick={() => setStep(step - 1)} style={{ flex: 1 }}>‹ Indietro</Btn>}
            {step < 3
              ? <Btn primary onClick={next} style={{ flex: 2 }}>Avanti ›</Btn>
              : <Btn primary onClick={finish} style={{ flex: 2 }}>◈ Inizia</Btn>}
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
      background: "#0c2a3d", border: "1px solid #57c8f2", padding: "10px 14px",
      boxShadow: "0 4px 24px rgba(0,0,0,.6), 0 0 12px rgba(87,200,242,.25)",
    }}>
      <div className="row between g12">
        <div className="grow">
          <div className="f-hud t-cyan" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".12em" }}>◈ INSTALLA GYMQUEST</div>
          <div className="tiny t-dim" style={{ marginTop: 2, lineHeight: 1.5 }}>
            {ip.canInstall
              ? "Aggiungila alla schermata home come app"
              : "Su iPhone: tocca Condividi (□↑) poi \u201CAggiungi alla schermata Home\u201D"}
          </div>
        </div>
        <div className="row g8" style={{ flexShrink: 0, alignItems: "center" }}>
          {ip.canInstall && <Btn small primary onClick={ip.install}>Installa</Btn>}
          <span onClick={ip.dismiss} className="tap t-faint" style={{ cursor: "pointer", fontSize: 16, padding: 4 }}>✕</span>
        </div>
      </div>
    </div>
  );
}
