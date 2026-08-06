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
  /* arancione personal trainer: tutte le parti PT usano questo colore */
  --pt:#f97316; --pt-hi:#fb923c; --pt-deep:#ea580c; --pt-soft:rgba(249,115,22,.13);
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
.btn-pt{background:linear-gradient(135deg,var(--pt-hi),var(--pt));color:#fff;border-color:transparent;box-shadow:0 2px 6px rgba(234,88,12,.35)}
.btn-pt:hover{background:linear-gradient(135deg,var(--pt),var(--pt-deep))}
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
.modal-box{width:100%;max-width:430px;background:var(--modal);border:1px solid var(--cyan);box-shadow:0 0 30px rgba(87,200,242,.22);padding:20px;max-height:85vh;overflow-y:auto;color:var(--text)}
.float-cam-btn{position:fixed;right:16px;bottom:142px;z-index:95;width:48px;height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;background:var(--active);border:1px solid var(--cyan);cursor:pointer;box-shadow:0 0 14px rgba(87,200,242,.35)}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.float-timer-btn{position:fixed;right:16px;bottom:86px;z-index:95;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:var(--active);border:1px solid var(--cyan);cursor:pointer;box-shadow:0 0 14px rgba(87,200,242,.35)}
.float-timer{position:fixed;left:12px;right:12px;margin:0 auto;bottom:86px;z-index:96;background:var(--modal);border:1px solid var(--amber);box-shadow:0 0 24px rgba(255,215,106,.22);padding:14px 16px;max-width:340px;box-sizing:border-box}
/* timer in linea (sessione): bottone normale, pannello a comparsa sotto */
.timer-inline{position:relative;display:inline-block}
.timer-pop{position:absolute;top:calc(100% + 8px);left:0;z-index:60;background:var(--modal);
  border:1px solid var(--amber);box-shadow:0 0 24px rgba(255,215,106,.22);padding:14px 16px;
  min-width:290px;box-sizing:border-box}
.set-grid-t{display:grid;grid-template-columns:18px 42px 1fr 64px 48px;gap:8px;align-items:center}
.icon-tap{display:inline-flex;align-items:center;justify-content:center;padding:7px;margin:-5px;cursor:pointer;min-width:36px;min-height:36px}

/* --- info esercizio: pulsante ben visibile --- */
.info-btn{display:inline-flex;align-items:center;gap:4px;padding:4px 9px;border:1px solid var(--line);
  background:var(--active2);color:var(--cyan-hi);font-family:'Chakra Petch',sans-serif;
  font-size:9px;letter-spacing:.18em;cursor:pointer;flex-shrink:0}
.info-btn:hover{border-color:var(--cyan);box-shadow:0 0 8px rgba(87,200,242,.25)}

/* --- riga meta esercizio in sessione: tutto su una riga, scorre in orizzontale se serve --- */
.ex-meta{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;overflow-x:auto;
  scrollbar-width:none;-webkit-overflow-scrolling:touch;padding-bottom:2px}
.ex-meta::-webkit-scrollbar{display:none}
.ex-meta>*{flex-shrink:0}
.ex-meta .ex-meta-grow{flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ex-meta .info-btn{padding:3px 7px}
.ex-meta .chip{padding:2px 6px;letter-spacing:.08em}

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
.setmenu button.danger{color:var(--dim)}
/* testata sessione sticky: comandi (Esci/nome/Termina) e statistiche sempre visibili nello scroll */
.sticky-hud{padding:8px 0}

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

/* popup selezione esercizi: lista stile libreria dentro una modale a colonna */
.picker-modal{display:flex;flex-direction:column;overflow:hidden;max-height:85vh}
.picker-list{flex:1;overflow-y:auto;margin:0 -4px;padding:0 4px;min-height:120px}
.picker-list::-webkit-scrollbar{width:4px}
.picker-list::-webkit-scrollbar-thumb{background:var(--line)}
.picker-row{padding:7px 8px;border-bottom:1px solid var(--hairline);cursor:pointer;font-size:14px;border-radius:8px}
.picker-row:active{background:var(--soft)}
.picker-row-on{background:var(--active)}
.picker-check{width:16px;height:16px;border-radius:50%;border:1.5px solid var(--line2);flex-shrink:0;
  display:inline-flex;align-items:center;justify-content:center;color:#fff;transition:all .15s}
.picker-check.on{background:var(--cyan);border-color:var(--cyan)}

.hide-sm{display:none}
@media(min-width:480px){.hide-sm{display:inline}}
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;position:relative;z-index:10}
.auth-box{width:100%;max-width:400px}
/* dati corporei & co.: compatti, 4 per riga (3 su schermi minuscoli) */
.field-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;align-items:end}
.field-grid>div{display:flex;flex-direction:column;justify-content:flex-end;min-width:0}
.field-grid .hud-label{min-height:22px;display:flex;align-items:flex-end;gap:2px;font-size:8px !important;letter-spacing:.1em}
.field-grid .hud-input{height:38px;padding:4px 2px;font-size:13px}
@media(max-width:359px){.field-grid{grid-template-columns:repeat(3,1fr)}}

/* arancione PT: pulsante pieno (note PT) e box con bordo arancione */
.t-pt{color:var(--pt)}
.pt-btn{display:inline-flex;align-items:center;gap:4px;border:none;border-radius:8px;cursor:pointer;
  background:linear-gradient(135deg,var(--pt-hi),var(--pt));color:#fff;
  font-family:'Chakra Petch',sans-serif;font-size:9px;font-weight:700;letter-spacing:.12em;
  padding:5px 8px;box-shadow:0 1px 4px rgba(234,88,12,.4)}
.pt-btn:active{transform:scale(.95)}
.pt-box{background:var(--pt-soft);border:1px solid var(--pt);border-radius:10px;padding:10px 12px}
.link-btn{cursor:pointer;color:var(--faint);font-size:12px;letter-spacing:.05em}
.link-btn:hover{color:var(--cyan-hi)}

@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

/* ============================== VANILLA ==============================
   Tema CHIARO stile Material con colore NEUTRO: grigi grafite al posto
   del colore d'accento, elevazioni al posto dei bordi, bottoni a pillola,
   card 16px, dialoghi 28px, tipografia Roboto. */
/* ============================== FIT TRAINING (base) ==============================
   Tema CHIARO moderno: neutri freddi slate + accento azzurro primario dell'app,
   input bianchi con anello di focus, bottoni primari in gradiente azzurro,
   card bianche con ombre morbide, tipografia Roboto. */
.standard{color-scheme:light;
  --bg:#f4f7fa;--panel:#ffffff;--panel2:#edf2f7;--line:#e2e9f0;--line2:#c3d0dd;
  --cyan:#0284c7;--cyan-hi:#0369a1;--bright:#0f172a;--text:#3f4c5e;
  --dim:#5b6b80;--faint:#8b98a9;--amber:#b45309;--green:#15803d;--red:#dc2626;
  --card:#eef3f7;--card2:#e4ebf2;--active:#e0f1fc;--active2:#eef7fd;
  --soft:#ebf1f6;--soft2:#dde6ee;--hairline:#ebf1f6;--input:#ffffff;
  --modal:#f7fafc;--done:#dcf2e3;--warm-bg:#fdf2d9;--warm-line:#eab308;
  --pt:#ea580c;--pt-hi:#f97316;--pt-deep:#c2410c;--pt-soft:#ffeadb;
  font-family:'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:400}
.standard::before,.standard::after{display:none}
.standard .f-hud,.standard .hud-label,.standard .hud-title,.standard .micro,.standard .btn,.standard .brand,
.standard .bnav-btn,.standard .snav-btn,.standard .hud-input,.standard .chip{
  font-family:'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.standard .hud-label,.standard .hud-title,.standard .micro,.standard .btn,.standard .brand,
.standard .bnav-btn,.standard .snav-btn{letter-spacing:.04em}
.standard .hud-label,.standard .hud-title,.standard .btn,.standard .bnav-btn,.standard .snav-btn{text-transform:none}
.standard .hud-label{font-weight:700}
.standard .cham{clip-path:none;border-radius:16px}
.standard .cham-s{clip-path:none;border-radius:12px}
.standard .seg{clip-path:none;border-radius:4px}
.standard .panel{background:#ffffff;border:1px solid #eef2f6;border-radius:16px;
  box-shadow:0 1px 2px rgba(15,23,42,.06),0 4px 14px rgba(15,23,42,.06)}
.standard .panel-accent{background:#f0f8fd;border-color:#d8ecfa}
.standard .panel::before{display:none}
/* bottoni: primario in gradiente azzurro, ghost in slate chiaro */
.standard .btn{border-radius:999px;letter-spacing:.01em;font-weight:600;transition:all .15s ease}
.standard .btn-primary{background:linear-gradient(135deg,#0ea5e9,#0284c7);border-color:transparent;color:#fff;
  box-shadow:0 2px 6px rgba(2,132,199,.32),0 1px 2px rgba(2,132,199,.2)}
.standard .btn-primary:hover{background:linear-gradient(135deg,#0284c7,#0369a1);
  box-shadow:0 4px 12px rgba(2,132,199,.38),0 1px 3px rgba(2,132,199,.22)}
.standard .btn-ghost{background:#e8eef4;color:#1d2935;border-color:transparent}
.standard .btn-ghost:hover{background:#dbe6f0;color:#0369a1}
.standard .link-btn{color:var(--cyan)}
.standard .link-btn:hover{color:var(--cyan-hi)}
/* input moderni: bianchi, bordo sottile, anello azzurro al focus */
.standard .hud-input{background:#ffffff;border:1px solid #d5dfe9;border-radius:12px;font-weight:500;color:#0f172a;
  transition:border-color .15s ease,box-shadow .15s ease}
.standard .hud-input::placeholder{color:#9aa7b8}
.standard .hud-input:hover{border-color:#b7c8d8}
.standard .hud-input:focus{border-color:#0284c7;box-shadow:0 0 0 3px rgba(2,132,199,.16);background:#ffffff;outline:none}
.standard select.hud-input,.standard textarea.hud-input{appearance:auto}
.standard .hud-header{background:rgba(255,255,255,.86);border-bottom-color:var(--line)}
.standard .bottom-nav{background:rgba(255,255,255,.94);border-top:1px solid var(--line)}
.standard .brand{letter-spacing:.06em;font-weight:700;color:#0369a1}
.standard .streak-pill{border-radius:999px}
.standard .modal-box{border:none;border-radius:28px;background:#ffffff;box-shadow:0 8px 20px rgba(15,23,42,.14),0 2px 6px rgba(15,23,42,.1)}
.standard .float-timer{border:none;border-radius:20px;background:#ffffff;box-shadow:0 6px 16px rgba(15,23,42,.12),0 1px 3px rgba(15,23,42,.1)}
.standard .timer-pop{border:none;border-radius:20px;background:#ffffff;box-shadow:0 6px 16px rgba(15,23,42,.12),0 1px 3px rgba(15,23,42,.1)}
.standard .setmenu{border:none;border-radius:16px;background:#ffffff;box-shadow:0 4px 12px rgba(15,23,42,.12),0 1px 2px rgba(15,23,42,.1)}
.standard .float-cam-btn,.standard .float-timer-btn{border:1px solid #e2e9f0;border-radius:16px;background:#ffffff;
  color:#1d2935;box-shadow:0 4px 10px rgba(15,23,42,.1),0 1px 3px rgba(15,23,42,.08)}
.standard .set-chip{border:none;border-radius:8px}
.standard .chip{border-radius:8px}
/* selezioni tonali azzurre (chip attivi, voci scelte) */
.standard .chip-on{background:#e0f1fc;color:#0369a1;border-color:transparent;font-weight:600}
.standard .dash-btn{color:var(--cyan);border-color:rgba(2,132,199,.35);background:#f6fbfe}
.standard .dash-btn:hover{color:var(--cyan-hi);border-color:rgba(2,132,199,.6);background:#eef7fd}
.standard .set-warmup{background:var(--warm-bg)}
.standard .info-btn{background:#eef7fd;color:#0369a1;border-color:#cde7f7}
.bnav-ico{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:28px;
  margin:-4px 0;border-radius:999px}
/* voce attiva del menu: pill tonale azzurra col colore primario dell'app */
.standard .bnav-btn.on .bnav-ico{background:#d9edfb;color:#0369a1}
.standard .bnav-btn.on{color:#0369a1 !important}
.standard .bnav-btn div:last-child{display:none}
/* portali (Overlay → document.body): il tema chiaro arriva anche agli overlay */
body.standard{background:#f4f7fa}

`;

/* ============================== PRIMITIVES ============================== */
export const Panel = ({ children, accent, hover, className = "", style }) => (
  <div className={`panel cham ${accent ? "panel-accent" : ""} ${hover ? "panel-hover" : ""} ${className}`} style={style}>
    {children}
  </div>
);

export const Btn = ({ children, onClick, primary, pt, small, full, disabled, style }) => (
  <button onClick={onClick} disabled={disabled}
    className={`btn cham-s tap ${pt ? "btn-pt" : primary ? "btn-primary" : "btn-ghost"} ${small ? "btn-sm" : ""} ${full ? "btn-full" : ""}`}
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
