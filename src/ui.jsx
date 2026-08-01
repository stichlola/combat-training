import React from "react";
import { createPortal } from "react-dom";

/* ============================== STYLES ============================== */
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Rajdhani:wght@500;600;700&family=Roboto:wght@400;500;700&display=swap');

:root{color-scheme:dark;
  --bg:#04090f; --panel:#081420; --panel2:#0a1a2a; --line:#1b3a52; --line2:#2f6786;
  --cyan:#57c8f2; --cyan-hi:#9be8ff; --bright:#e6f6ff; --text:#cfe8f5;
  --dim:#7fa8bf; --faint:#3f637c; --amber:#ffd76a; --green:#2fbf71; --red:#ff8f7a;
  /* superfici secondarie (sostituiscono gli hex hardcoded: il tema chiaro le sovrascrive) */
  --card:#04101b; --card2:#060f18; --active:#0c2a3d; --active2:#0c1c2b;
  --soft:#0e2233; --soft2:#1b3a52; --hairline:#0a1826; --input:#050d15;
  --modal:#071523; --done:#0a2418; --warm-bg:#241c0a; --warm-line:#8a6d2f;
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
.btn-ghost{background:var(--active2);color:var(--cyan-hi)}
.btn-ghost:hover{border-color:var(--cyan)}
.btn:disabled{opacity:.3;cursor:default}
.btn-full{width:100%}

.hud-input{background:var(--input);border:1px solid var(--line);color:var(--bright)!important;
  -webkit-text-fill-color:var(--bright);caret-color:var(--cyan);
  padding:10px 12px;font-size:15px;width:100%;outline:none;
  font-family:'Rajdhani',sans-serif;font-weight:600}
.hud-input:focus{border-color:var(--cyan);box-shadow:0 0 0 1px rgba(87,200,242,.25)}
.hud-input::placeholder{color:var(--faint);-webkit-text-fill-color:var(--faint)}
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active{
  -webkit-box-shadow:0 0 0 1000px var(--input) inset !important;
  box-shadow:0 0 0 1000px var(--input) inset !important;
  -webkit-text-fill-color:var(--bright) !important;
  caret-color:var(--cyan);
  transition:background-color 99999s ease-in-out 0s}
input,textarea,select{background-color:var(--input);color:var(--bright)}
input[type=number]{appearance:textfield;-moz-appearance:textfield}
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
input[type=range]{accent-color:var(--cyan);width:100%}

.tap{transition:transform .1s ease}
.tap:active{transform:scale(.97)}
button{background:none;border:none;color:inherit;font-family:inherit;text-align:left;padding:0}
button.btn{text-align:center}

.fade-in{animation:fi .3s ease both}
/* --- modali e overlay --- */
.modal-back{position:fixed;inset:0;background:rgba(2,6,10,.82);backdrop-filter:blur(3px);z-index:120;display:flex;align-items:center;justify-content:center;padding:16px}
.modal-box{width:100%;max-width:430px;background:var(--modal);border:1px solid var(--cyan);box-shadow:0 0 30px rgba(87,200,242,.22);padding:20px;max-height:85vh;overflow-y:auto}
.float-cam-btn{position:fixed;right:16px;bottom:142px;z-index:95;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:var(--active);border:1px solid var(--cyan);cursor:pointer;box-shadow:0 0 14px rgba(87,200,242,.35)}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.float-timer-btn{position:fixed;right:16px;bottom:86px;z-index:95;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:var(--active);border:1px solid var(--cyan);cursor:pointer;box-shadow:0 0 14px rgba(87,200,242,.35)}
.float-timer{position:fixed;left:12px;right:12px;margin:0 auto;bottom:86px;z-index:96;background:var(--modal);border:1px solid var(--amber);box-shadow:0 0 24px rgba(255,215,106,.22);padding:14px 16px;max-width:340px;box-sizing:border-box}
.set-grid-t{display:grid;grid-template-columns:18px 42px 1fr 64px 48px;gap:8px;align-items:center}
.icon-tap{display:inline-flex;align-items:center;justify-content:center;padding:7px;margin:-5px;cursor:pointer}

/* --- info esercizio: pulsante ben visibile --- */
.info-btn{display:inline-flex;align-items:center;gap:4px;padding:4px 9px;border:1px solid var(--line);
  background:var(--active2);color:var(--cyan-hi);font-family:'Chakra Petch',sans-serif;
  font-size:9px;letter-spacing:.18em;cursor:pointer;flex-shrink:0}
.info-btn:hover{border-color:var(--cyan);box-shadow:0 0 8px rgba(87,200,242,.25)}

/* --- riordino trascinando (card e serie) --- */
.drag-handle{display:inline-flex;align-items:center;justify-content:center;padding:6px 3px;
  margin:-2px 0;color:var(--faint);cursor:grab;touch-action:none;flex-shrink:0;
  user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.drag-handle, .drag-handle *{touch-action:none}
.drag-handle:active{cursor:grabbing;color:var(--cyan)}
.drag-live{opacity:.55;position:relative;z-index:3;outline:1px solid var(--cyan);
  box-shadow:0 0 18px rgba(87,200,242,.4);transform:scale(1.02)}
body.dragging [data-dl] > *{transition:opacity .12s}
body.dragging [data-dl] > *:not(.drag-live){opacity:.75}
body.dragging{user-select:none;-webkit-user-select:none}
body.dragging *{cursor:grabbing!important}
/* chip serie: numero progressivo o "W" (riscaldamento); il tap apre il menu azioni */
.set-chip{display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:34px;
  padding:0 5px;border:1px solid var(--line);background:var(--active2);color:var(--faint);
  font-family:'Chakra Petch',sans-serif;font-size:12px;font-weight:700;cursor:pointer;
  user-select:none;-webkit-user-select:none;flex-shrink:0}
.set-chip:active{border-color:var(--cyan);color:var(--cyan-hi)}
.set-chip.warmup{color:var(--amber);border-color:var(--warm-line);background:var(--warm-bg)}
.set-warmup{background:rgba(255,215,106,.05);box-shadow:inset 2px 0 0 var(--warm-line)}
/* mini menu azioni della serie (riscaldamento / elimina) */
.setmenu-back{position:fixed;inset:0;z-index:120;background:rgba(2,8,14,.45)}
.setmenu{position:fixed;min-width:190px;background:var(--modal);border:1px solid var(--cyan);
  box-shadow:0 0 24px rgba(87,200,242,.25);padding:6px;z-index:121}
.setmenu button{display:flex;align-items:center;gap:9px;width:100%;padding:11px 10px;
  background:none;border:none;color:var(--dim);font-family:'Rajdhani',sans-serif;font-size:13px;
  font-weight:700;letter-spacing:.08em;text-align:left;cursor:pointer}
.setmenu button:hover{background:var(--active);color:var(--bright)}
.setmenu button.danger{color:#ff8f7d}
/* testata sessione sticky: comandi (Esci/nome/Termina) e statistiche sempre visibili nello scroll */
.sticky-hud{position:sticky;top:0;z-index:60;background:var(--bg);padding:8px 0;
  box-shadow:0 16px 16px -12px rgba(4,9,15,.95)}

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
  border:1px solid var(--warm-line);background:var(--warm-bg)}
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

.set-grid{display:grid;grid-template-columns:18px 42px 1fr 1fr 48px;gap:8px;align-items:center}
.divider-row{display:flex;justify-content:space-between;align-items:center;
  padding:7px 0;border-bottom:1px solid var(--hairline)}
.divider-row:last-child{border-bottom:none}
.chip{font-family:'Chakra Petch',sans-serif;font-size:9px;letter-spacing:.15em;
  padding:3px 8px;border:1px solid var(--line);color:var(--dim);text-transform:uppercase}
.chip-on{background:var(--cyan);color:#04121d;border-color:var(--cyan-hi);font-weight:600}
.check-btn{height:36px;display:flex;align-items:center;justify-content:center;
  border:1px solid var(--line);color:var(--faint);cursor:pointer}
.check-btn:hover{border-color:var(--cyan)}
.check-on{background:var(--green);border-color:#7cffb5;color:#04121d;
  box-shadow:0 0 10px rgba(47,191,113,.4)}
.set-done{background:var(--done)}
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

/* ============================== VANILLA ==============================
   Tema CHIARO stile Material con colore NEUTRO: grigi grafite al posto
   del colore d'accento, elevazioni al posto dei bordi, bottoni a pillola,
   card 16px, dialoghi 28px, tipografia Roboto. */
.vanilla{color-scheme:light;
  --bg:#f7f7f8;--panel:#ffffff;--panel2:#f1eff2;--line:#e5e3e6;--line2:#c9c7cb;
  --cyan:#333136;--cyan-hi:#333136;--bright:#1d1b20;--text:#49454f;
  --dim:#625b71;--faint:#938f99;--amber:#7a5901;--green:#146c2e;--red:#b3261e;
  --card:#f1eff2;--card2:#ebe9ec;--active:#e4e2e6;--active2:#efecef;
  --soft:#efecef;--soft2:#e3e1e4;--hairline:#efecef;--input:#eae8eb;
  --modal:#f3f2f4;--done:#d9f0dc;--warm-bg:#fff3d6;--warm-line:#e8c766;
  font-family:'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:400}
.vanilla::before,.vanilla::after{display:none}
.vanilla .f-hud,.vanilla .hud-label,.vanilla .hud-title,.vanilla .micro,.vanilla .btn,.vanilla .brand,
.vanilla .bnav-btn,.vanilla .snav-btn,.vanilla .hud-input,.vanilla .chip{
  font-family:'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.vanilla .hud-label,.vanilla .hud-title,.vanilla .micro,.vanilla .btn,.vanilla .brand,
.vanilla .bnav-btn,.vanilla .snav-btn{letter-spacing:.04em}
.vanilla .hud-label,.vanilla .hud-title,.vanilla .btn,.vanilla .bnav-btn,.vanilla .snav-btn{text-transform:none}
.vanilla .hud-label{font-weight:700}
.vanilla .cham{clip-path:none;border-radius:16px}
.vanilla .cham-s{clip-path:none;border-radius:12px}
.vanilla .seg{clip-path:none;border-radius:4px}
.vanilla .panel{background:#ffffff;border:none;border-radius:16px;
  box-shadow:0 1px 2px rgba(0,0,0,.14),0 1px 3px 1px rgba(0,0,0,.08)}
.vanilla .panel-accent{background:#f1eff2;border-color:transparent}
.vanilla .panel::before{display:none}
.vanilla .btn{border-radius:999px;letter-spacing:.01em;font-weight:600}
.vanilla .btn-primary{background:#333136;border-color:transparent;color:#fff;
  box-shadow:0 1px 2px rgba(0,0,0,.2),0 1px 3px 1px rgba(0,0,0,.1)}
.vanilla .btn-primary:hover{box-shadow:0 1px 3px rgba(0,0,0,.2),0 4px 8px 3px rgba(0,0,0,.1)}
.vanilla .btn-ghost{background:#e9e7ea;color:#1d1b20;border-color:transparent}
.vanilla .btn-ghost:hover{background:#dfdde0}
.vanilla .hud-input{background:var(--input);border:1px solid transparent;border-radius:12px;font-weight:500;color:#1d1b20}
.vanilla .hud-input:focus{border-color:transparent;box-shadow:inset 0 -2px 0 var(--cyan);background:#eae8eb}
.vanilla .hud-header{background:rgba(247,247,248,.88);border-bottom-color:var(--soft)}
.vanilla .bottom-nav{background:#efecef;border-top:none}
.vanilla .brand{letter-spacing:.06em;font-weight:700}
.vanilla .streak-pill{border-radius:999px}
.vanilla .modal-box{border:none;border-radius:28px;box-shadow:0 4px 8px 3px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.2)}
.vanilla .float-timer{border:none;border-radius:20px;box-shadow:0 4px 8px 3px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.2)}
.vanilla .setmenu{border:none;border-radius:16px;box-shadow:0 2px 6px 2px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.2)}
.vanilla .float-cam-btn,.vanilla .float-timer-btn{border:none;border-radius:16px;background:#e4e2e6;
  color:#1d1b20;box-shadow:0 4px 8px 3px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.15)}
.vanilla .set-chip{border:none;border-radius:8px}
.vanilla .chip{border-radius:8px}
.vanilla .set-warmup{background:var(--warm-bg)}
.vanilla .bnav-btn.on svg{background:#e4e2e6;border-radius:999px;padding:4px 16px;box-sizing:content-box;margin:-4px -16px}
.vanilla .bnav-btn div:last-child{display:none}
/* portali (Overlay → document.body): il tema chiaro arriva anche agli overlay */
body.vanilla{background:#f7f7f8}

`;

/* ============================== PRIMITIVES ============================== */
export const Panel = ({ children, accent, hover, className = "", style }) => (
  <div className={`panel cham ${accent ? "panel-accent" : ""} ${hover ? "panel-hover" : ""} ${className}`} style={style}>
    {children}
  </div>
);

export const Btn = ({ children, onClick, primary, small, full, disabled, style }) => (
  <button onClick={onClick} disabled={disabled}
    className={`btn cham-s tap ${primary ? "btn-primary" : "btn-ghost"} ${small ? "btn-sm" : ""} ${full ? "btn-full" : ""}`}
    style={style}>
    {children}
  </button>
);

export function ShieldBar({ pct }) {
  return (
    <div className="seg-row">
      {Array.from({ length: 12 }, (_, i) => {
        const filled = pct * 12 > i;
        return <div key={i} className="seg" style={{
          background: filled ? "linear-gradient(180deg,#9be8ff,#3fa9d9)" : "var(--soft)",
          boxShadow: filled ? "0 0 6px rgba(87,200,242,.6)" : "none",
        }} />;
      })}
    </div>
  );
}

export function HudToast({ toast }) {
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

/* ---------------- Barra di avanzamento quest ---------------- */
export function QBar({ pct, done, animate }) {
  return (
    <div className="cham-s" style={{ height: 7, background: "var(--soft)", overflow: "hidden" }}>
      <div style={{
        height: "100%",
        width: `${Math.min(100, pct * 100)}%`,
        background: done ? "linear-gradient(90deg,#ffd76a,#ffb84d)" : "linear-gradient(90deg,#3fa9d9,#9be8ff)",
        boxShadow: done ? "0 0 8px rgba(255,215,106,.6)" : "0 0 6px rgba(87,200,242,.4)",
        transition: animate ? "width 1.1s cubic-bezier(.2,.8,.2,1)" : "none",
      }} />
    </div>
  );
}

export const Overlay = ({ children }) => createPortal(children, document.body);
