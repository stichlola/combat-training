import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./lib/supabase";
import {
  Dumbbell, Flame, Timer, Plus, Check, ChevronRight, Play, Square,
  Trash2, Bot, Upload, FileText, Trophy, Utensils, X, Loader2, Search,
  User, LogOut, Lock, Mail, Eye, EyeOff, Ruler, Save,
  Pencil, Info, Pause, Camera, Medal
} from "lucide-react";
import { TROPHIES, RARITY, unlockedTrophies } from "./trophies";
const Trophy3D = React.lazy(() => import("./Trophy3D"));   // three.js caricato solo quando serve

/* ================================ I18N ================================ */
/* Le stringhe italiane restano le chiavi canoniche (anche nel database:
   nomi esercizi, PR, quest salvate); tr() traduce solo ciò che si vede. */
let CURRENT_LANG = "it";
const setLangGlobal = (l) => { CURRENT_LANG = l; };
const LANG_OPTS = [{ id: "it", label: "Italiano", flag: "🇮🇹" }, { id: "en", label: "English", flag: "🇬🇧" }];
const tr = (s) => (CURRENT_LANG === "en" && s && s in EN_UI ? EN_UI[s] : s);

const EN_UI = {
  "PDF troppo grande (max 3.5 MB): comprimilo o incolla il testo.": "PDF too large (max 3.5 MB): compress it or paste the text.",
  "File troppo grande: usa una foto più piccola o incolla il testo.": "File too large: use a smaller photo or paste the text.",
  "SERVE UN ACCOUNT": "AN ACCOUNT IS REQUIRED",
  "In modalità ospite puoi allenarti e comporre i pasti a mano. Le funzioni AI richiedono un account gratuito; con Premium hai limiti ampi su tutto.": "In guest mode you can train and build meals by hand. AI features require a free account; Premium gives you generous limits on everything.",
  "(SCEGLI 1)": "(PICK 1)", "(SCELTA MULTIPLA)": "(MULTIPLE CHOICE)",
  "SCEGLI QUANTI VUOI": "PICK AS MANY AS YOU LIKE",
  "AGGIUNGI ALIMENTO": "ADD FOOD", "Aggiungi": "Add",
  "generico": "generic", "tuo": "yours",
  "stima non disponibile": "estimate unavailable",
  "KCAL STIMATE": "ESTIMATED KCAL",
  "Tocca le opzioni per comporre il pasto.": "Tap the options to build your meal.",
  "VOCI NON STIMABILI NON INCLUSE NEL TOTALE": "NON-ESTIMABLE ITEMS ARE NOT IN THE TOTAL",
  "Stime indicative: consulta un professionista per esigenze specifiche.": "Indicative estimates: consult a professional for specific needs.",
  "Bresaola / affettato magro": "Bresaola / lean cold cuts", "Gamberi o seppie": "Prawns or cuttlefish",
  "Ricotta o fiocchi di latte": "Ricotta or cottage cheese", "Legumi cotti (lenticchie, ceci)": "Cooked legumes (lentils, chickpeas)",
  "Tofu o tempeh": "Tofu or tempeh", "Avena o fiocchi d'avena": "Oats", "Couscous o bulgur": "Couscous or bulgur",
  "Mandorle o noci": "Almonds or walnuts", "Semi di chia o lino": "Chia or flax seeds",
  "Frutto di stagione": "Seasonal fruit", "Maltodestrine (post-workout)": "Maltodextrin (post-workout)",
  "Continua senza account ›": "Continue without an account ›",
  "PROVA SUBITO · I DATI RESTANO SU QUESTO DISPOSITIVO": "TRY IT NOW · DATA STAYS ON THIS DEVICE",
  "MODALITÀ OSPITE": "GUEST MODE",
  "Dati solo su questo dispositivo · funzioni AI disattivate": "Data on this device only · AI features disabled",
  "Crea account": "Create account",
  "PAGAMENTO RICEVUTO": "PAYMENT RECEIVED",
  "Conserva questo codice: crea un account quando vuoi e riscattalo dal profilo per attivare l'acquisto.": "Keep this code: create an account whenever you like and redeem it from your profile to activate your purchase.",
  "Copia codice": "Copy code", "◈ CODICE COPIATO": "◈ CODE COPIED",
  "Hai un codice di riscatto?": "Have a redeem code?", "Riscatta": "Redeem",
  "Codice non valido": "Invalid code", "Codice già utilizzato": "Code already used",
  "PIANO NUTRIZIONALE": "NUTRITION PLAN",
  "▸ Finestra alimentare & tempistiche": "▸ Eating window & timing",
  "▸ Il pasto che hai composto": "▸ The meal you built",
  "Tocca un'opzione per categoria per comporre il pasto.": "Tap one option per category to build your meal.",
  "▸ Direttive operative": "▸ Operating directives",
  "⤓ Importa piano": "⤓ Import plan", "◈ Rigenera con AI": "◈ Regenerate with AI",
  "PASTI GIORNALIERI": "DAILY MEALS", "FONTI E COMPOSIZIONE": "SOURCES & BUILDER",
  "Fonti proteiche": "Protein sources", "Fonti carboidrati": "Carb sources",
  "Grassi e fibre": "Fats and fibre", "Snack / Post-workout": "Snack / Post-workout",
  "CATEGORIE DI FONTI": "SOURCE CATEGORIES",
  "PIANO A FONTI INTERCAMBIABILI RILEVATO": "INTERCHANGEABLE SOURCE PLAN DETECTED",
  "fasce orarie": "time slots",
  "▸ Componi il pasto": "▸ Build your meal",
  "PASTI CONSIGLIATI": "SUGGESTED MEALS", "COMPONI TU": "BUILD YOUR OWN",
  "KCAL SELEZIONATE": "KCAL SELECTED", "Svuota": "Clear",
  "▸ Il tuo piatto": "▸ Your plate",
  "Nessun alimento. Scegli dalle categorie e compone il pasto come preferisci.": "No food yet. Pick from the categories and build your meal however you like.",
  "Genera o importa un piano per vedere i target di riferimento.": "Generate or import a plan to see your reference targets.",
  "PORZIONE STANDARD": "STANDARD PORTION",
  "proteine": "protein", "carboidrati": "carbs", "grassi": "fat",
  "Valori medi indicativi per 100 g di prodotto crudo.": "Average indicative values per 100 g of raw product.",
  "Fibre e verdure": "Fibre and vegetables", "Snack e post-workout": "Snacks and post-workout",
  "Petto di pollo": "Chicken breast", "Tacchino (fesa)": "Turkey breast", "Manzo magro": "Lean beef",
  "Merluzzo": "Cod", "Salmone": "Salmon", "Tonno al naturale": "Tuna in water",
  "Uova intere": "Whole eggs", "Albume": "Egg white", "Skyr / Greco 0%": "Skyr / Greek 0%",
  "Fiocchi di latte": "Cottage cheese", "Whey in polvere": "Whey powder", "Tofu": "Tofu",
  "Tempeh": "Tempeh", "Lenticchie secche": "Dry lentils", "Seitan": "Seitan",
  "Riso bianco": "White rice", "Riso basmati": "Basmati rice", "Pasta di semola": "Durum wheat pasta",
  "Patate": "Potatoes", "Patate dolci": "Sweet potatoes", "Avena": "Oats",
  "Pane integrale": "Wholemeal bread", "Couscous": "Couscous", "Quinoa": "Quinoa",
  "Gallette di riso": "Rice cakes", "Banana": "Banana", "Mela": "Apple", "Frutti di bosco": "Berries",
  "Olio EVO": "Olive oil", "Mandorle": "Almonds", "Noci": "Walnuts", "Arachidi": "Peanuts",
  "Burro d'arachidi": "Peanut butter", "Avocado": "Avocado", "Semi di chia": "Chia seeds",
  "Parmigiano": "Parmesan", "Cioccolato fondente 85%": "Dark chocolate 85%",
  "Broccoli": "Broccoli", "Spinaci": "Spinach", "Zucchine": "Courgettes",
  "Insalata mista": "Mixed salad", "Pomodori": "Tomatoes", "Peperoni": "Peppers",
  "Carote": "Carrots", "Melanzane": "Aubergines", "Funghi": "Mushrooms",
  "Barretta proteica": "Protein bar", "Whey + acqua": "Whey + water",
  "Yogurt greco + miele": "Greek yogurt + honey", "Gallette + bresaola": "Rice cakes + bresaola",
  "Frullato banana + whey": "Banana + whey shake", "Maltodestrine": "Maltodextrin",
  "Riso + tonno": "Rice + tuna", "Toast integrale + albumi": "Wholemeal toast + egg whites",
  "OPZIONI · RUOTANO OGNI GIORNO": "OPTIONS · THEY ROTATE DAILY",
  "OPZIONE": "OPTION", "opzioni": "options", "MODIFICA": "EDIT",
  "Alimento": "Food", "Quantità": "Amount", "ALIMENTO": "FOOD",
  "Elimina opzione": "Delete option",
  "Nessun alimento — tocca per aggiungerne": "No food yet — tap to add some",
  "◈ PASTO AGGIORNATO": "◈ MEAL UPDATED",
  "VERRANNO APPLICATE ALLA PROSSIMA RIGENERAZIONE": "APPLIED ON THE NEXT REGENERATION",
  "Importa piano nutrizionale": "Import nutrition plan",
  "IMPORTA PIANO NUTRIZIONALE": "IMPORT NUTRITION PLAN",
  "Carica il piano del tuo nutrizionista (PDF, foto, testo) — l'AI lo converte": "Upload your nutritionist's plan (PDF, photo, text) — AI converts it",
  "CARICA PIANO ALIMENTARE": "UPLOAD MEAL PLAN",
  "Incolla qui il tuo piano alimentare...": "Paste your meal plan here...",
  "PASTI RILEVATI": "MEALS DETECTED",
  "Salva piano ✓": "Save plan ✓",
  "◈ PIANO IMPORTATO": "◈ PLAN IMPORTED",
  "Preferenze alimentari": "Dietary preferences",
  "opzionale": "optional",
  "Es. vegetariano, niente lattosio, digiuno intermittente 16:8 con 2 pasti, allergia alle noci...": "E.g. vegetarian, lactose-free, 16:8 intermittent fasting with 2 meals, nut allergy...",
  "TARGET MODIFICATI": "TARGETS CHANGED",
  "I pasti mostrati sono ancora quelli dei target precedenti. Rigenerali per allinearli ai nuovi valori.": "The meals shown still match the previous targets. Regenerate them to align with the new values.",
  "↻ Rigenera pasti sui nuovi target": "↻ Regenerate meals on new targets",
  "↻ Rigenera pasti (stessi target)": "↻ Regenerate meals (same targets)",
  "Rigenerazione...": "Regenerating...",
  "⤓ Importa un altro piano": "⤓ Import another plan",
  "GENERA SCHEDA CON AI": "GENERATE ROUTINE WITH AI",
  "Crea un allenamento su misura per obiettivo, giorni e attrezzatura": "Build a workout tailored to your goal, days and equipment",
  "Generazione scheda AI": "AI routine generation",
  "SCHEDA AI": "AI ROUTINE",
  "Limite settimanale raggiunto": "Weekly limit reached",
  "1 credito = 1 generazione": "1 credit = 1 generation",
  "PIANO GRATUITO: 1 GENERAZIONE A SETTIMANA PER FUNZIONE": "FREE PLAN: 1 GENERATION PER WEEK PER FEATURE",
  "📄 Import scheda PT": "📄 PT routine import",
  "Converti la scheda del tuo trainer in allenamento": "Turn your trainer's routine into a workout",
  "Import scheda PT, nutrizione AI e scan macchinari con limiti settimanali ampi": "PT routine import, AI nutrition and machine scan with generous weekly limits",
  "Chiudi": "Close",
  "Allenamenti/settimana ·": "Workouts/week ·",
  "(import/nutrizione 1 · scan 3)": "(import/nutrition 1 · scan 3)",
  /* --- interfaccia --- */
  "TRAINING HUD SYSTEM": "TRAINING HUD SYSTEM",
  "INIZIALIZZAZIONE SISTEMA": "SYSTEM INITIALIZING",
  "INTEL ▸": "INTEL ▸",
  "Email": "Email", "Password": "Password", "Username": "Username",
  "Conferma password": "Confirm password", "Nuova password": "New password",
  "Minimo 6 caratteri": "Minimum 6 characters",
  "Password dimenticata?": "Forgot password?",
  "Crea account ›": "Create account ›",
  "‹ Torna al login": "‹ Back to login",
  "Ti abbiamo inviato un'email di conferma a": "We sent a confirmation email to",
  ". Aprila per attivare l'account.": ". Open it to activate your account.",
  "Se": "If", "è registrata, riceverai un link per reimpostare la password.": "is registered, you'll receive a password reset link.",
  "◈ ACCESSO EFFETTUATO": "◈ SIGNED IN",

  /* --- setup profilo --- */
  "SETUP PROFILO": "PROFILE SETUP",
  "PASSO": "STEP", "DI": "OF",
  "Dati base": "Basic data", "Sesso": "Sex",
  "Età": "Age", "Altezza": "Height", "Peso": "Weight", "Massa grassa": "Body fat",
  "anni": "years", "cm": "cm", "kg": "kg", "% · opzionale": "% · optional",
  "es. 25": "e.g. 25", "es. 178": "e.g. 178", "es. 75": "e.g. 75", "es. 15": "e.g. 15",
  "Compila età, altezza e peso": "Fill in age, height and weight",
  "Età non valida": "Invalid age",
  "Altezza non valida (cm)": "Invalid height (cm)",
  "Peso non valido (kg)": "Invalid weight (kg)",
  "Stile di vita": "Lifestyle",
  "Attività quotidiana (fuori palestra)": "Daily activity (outside the gym)",
  "Sedentaria": "Sedentary", "Moderata": "Moderate", "Attiva": "Active",
  "Lavoro da scrivania, poco movimento": "Desk job, little movement",
  "In piedi o in movimento parte del giorno": "Standing or moving part of the day",
  "Lavoro fisico o molto movimento quotidiano": "Physical job or lots of daily movement",
  "Allenamenti a settimana ·": "Workouts per week ·",
  "Esperienza in palestra": "Gym experience",
  "Principiante": "Beginner", "Intermedio": "Intermediate", "Avanzato": "Advanced",
  "Obiettivo": "Goal", "Massa": "Bulking", "Mantenimento": "Maintenance", "Definizione": "Cutting",
  "Riepilogo": "Summary", "Uomo": "Man", "Donna": "Woman",
  "Attività": "Activity", "allenamenti/sett": "workouts/week",
  "Avanti ›": "Next ›", "‹ Indietro": "‹ Back", "◈ Inizia": "◈ Start",
  "◈ PROFILO CONFIGURATO": "◈ PROFILE CONFIGURED",
  "Benvenuto a bordo,": "Welcome aboard,",
  "Lingua": "Language", "Scegli la lingua dell'app": "Choose the app language",
  "Italiano": "Italian", "Inglese": "English",

  /* --- training --- */
  "▸ Schede attive": "▸ Active routines",
  "Nuova": "New", "Modifica modello": "Edit template", "Elimina": "Delete",
  "Elimina scheda": "Delete routine", "Annulla": "Cancel",
  "Nessuna scheda. Creane una, importala da un documento PT o usa il generatore AI.":
    "No routines yet. Create one, import a PT document or use the AI generator.",
  "ESERCIZI": "EXERCISES", "SERIE": "SETS", "SET": "SET", "REPS": "REPS",
  "+ SERIE": "+ SET", "KG": "KG", "KM": "KM", "MIN": "MIN", "TEMPO": "TIME",
  "IMPORTA SCHEDA PT": "IMPORT PT ROUTINE",
  "Carica un documento (PDF, foto, testo) — l'AI lo converte in allenamento":
    "Upload a document (PDF, photo, text) — AI turns it into a workout",
  "Generatore AI": "AI generator",
  "▸ Mission log — ultimi allenamenti": "▸ Mission log — recent workouts",
  "Nessun allenamento registrato. Completa il primo workout per iniziare il log.":
    "No workouts recorded. Complete your first workout to start the log.",
  "▸ Libreria esercizi": "▸ Exercise library",
  "Cerca esercizio...": "Search exercise...",
  "Personal records": "Personal records",
  "Nessun record. Completa serie con carichi crescenti per registrare i PR.":
    "No records yet. Complete sets with increasing loads to set PRs.",
  "● SESSIONE IN CORSO": "● SESSION IN PROGRESS",
  "avviata alle": "started at",
  "Riprendi ▶": "Resume ▶", "Abbandona": "Discard", "Conferma abbandono": "Confirm discard",
  "◈ SESSIONE ABBANDONATA": "◈ SESSION DISCARDED",
  "Nessun record salvato": "No record saved",
  "◈ SCHEDA ELIMINATA": "◈ ROUTINE DELETED",
  "◈ SCHEDA SALVATA": "◈ ROUTINE SAVED",
  "◈ MODELLO AGGIORNATO": "◈ TEMPLATE UPDATED",
  "◈ SCHEDA AI GENERATA": "◈ AI ROUTINE GENERATED",
  "◈ DOCUMENTO INTERPRETATO": "◈ DOCUMENT PARSED",
  "Chiudi prima la sessione attiva": "Close the active session first",

  /* --- sessione --- */
  "‹ Esci": "‹ Exit", "Termina ✓": "Finish ✓", "Resta": "Stay", "Esci ›": "Exit ›",
  "SESSIONE ANCORA ATTIVA": "SESSION STILL ACTIVE",
  "VOLUME KG": "VOLUME KG", "DURATA": "DURATION", "VOLUME": "VOLUME",
  "CARDIO": "CARDIO", "RECORD": "RECORD", "XP": "XP",
  "Note esercizio...": "Exercise notes...",
  "▲ NEW RECORD": "▲ NEW RECORD",
  "◈ MISSION COMPLETE": "◈ MISSION COMPLETE",
  "Sì, aggiorna il modello ✓": "Yes, update the template ✓",
  "No, salva solo il record": "No, save the record only",
  "‹ torna alla sessione": "‹ back to session",
  "modello base": "base template",
  "RECUPERO": "REST", "Avvia": "Start", "Pausa": "Pause", "↻ Reset": "↻ Reset",
  "Timer di recupero": "Rest timer",
  "▸ Esecuzione": "▸ How to perform",
  "ANTEPRIMA NON DISPONIBILE": "PREVIEW NOT AVAILABLE",

  /* --- editor --- */
  "Nuova scheda": "New routine", "Salva": "Save", "‹ Annulla": "‹ Cancel",
  "Nome scheda (es. LEG DAY)": "Routine name (e.g. LEG DAY)",
  "Filtra esercizi...": "Filter exercises...",
  "Scansiona macchinario": "Scan machine",

  /* --- import --- */
  "SCHEDA PT": "PT ROUTINE", "CARICA DOCUMENTO": "UPLOAD DOCUMENT",
  "Trascina qui il file, oppure tocca — PDF · Foto · Testo":
    "Drag your file here, or tap — PDF · Photo · Text",
  "TOCCA PER SOSTITUIRE": "TAP TO REPLACE",
  "— OPPURE —": "— OR —",
  "Incolla qui il testo della scheda...\\nes. Panca piana 4x8 80kg\\nRematore 3x10 60kg":
    "Paste your routine text here...\\ne.g. Bench press 4x8 80kg\\nBarbell row 3x10 60kg",
  "◈ Interpreta con AI": "◈ Parse with AI",
  "Analisi in corso...": "Analyzing...",
  "NUOVO": "NEW",
  "ESERCIZIO NON IN LIBRERIA — PERSONALIZZALO": "EXERCISE NOT IN LIBRARY — CUSTOMIZE IT",
  "Descrizione esecuzione (mostrata nel pop-up info)...": "How to perform (shown in the info popup)...",
  "URL immagine/GIF (opzionale)...": "Image/GIF URL (optional)...",
  "Salva scheda ✓": "Save routine ✓", "↻ Riprova": "↻ Retry",
  "LIMITE SETTIMANALE RAGGIUNTO": "WEEKLY LIMIT REACHED",
  "Crediti / Premium ›": "Credits / Premium ›",

  /* --- scan macchinari --- */
  "ANALISI MACCHINARIO...": "ANALYZING MACHINE...",
  "◈ MACCHINARIO": "◈ MACHINE",
  "ESERCIZI POSSIBILI": "POSSIBLE EXERCISES",
  "IN SCHEDA": "IN ROUTINE",
  "＋ Aggiungi all'allenamento": "＋ Add to workout",
  "◈ ESERCIZIO AGGIUNTO": "◈ EXERCISE ADDED",
  "MACCHINARIO NON RICONOSCIUTO": "MACHINE NOT RECOGNIZED",
  "Sembra:": "Looks like:",
  "Prova a inquadrare il macchinario per intero, da davanti.":
    "Try framing the whole machine, from the front.",
  "Analisi fallita": "Analysis failed",
  "Limite settimanale scan raggiunto": "Weekly scan limit reached",
  "Aggiungi crediti ›": "Add credits ›",

  /* --- nutrizione --- */
  "▸ Piano nutrizionale": "▸ Nutrition plan",
  "DATI CORPOREI MANCANTI": "BODY DATA MISSING",
  "peso, altezza ed età": "weight, height and age",
  "Vai al profilo ›": "Go to profile ›",
  "◈ Genera piano AI": "◈ Generate AI plan",
  "Generazione...": "Generating...",
  "Giorni/settimana ·": "Days/week ·", "Attrezzatura": "Equipment",
  "KCAL / GIORNO": "KCAL / DAY",
  "Modifica target": "Edit targets", "Salva ✓": "Save ✓",
  "↻ Rigenera": "↻ Regenerate", "↻ Nuovo": "↻ New",
  "◈ PIANO GENERATO": "◈ PLAN GENERATED",
  "◈ TARGET AGGIORNATI": "◈ TARGETS UPDATED",
  "Il piano è indicativo: consulta un professionista per esigenze specifiche.":
    "This plan is indicative: consult a professional for specific needs.",
  "Colazione": "Breakfast", "Pranzo": "Lunch", "Cena": "Dinner",
  "Spuntino pre-workout": "Pre-workout snack", "Post-workout": "Post-workout",
  "Proteine": "Protein", "Carboidrati": "Carbs", "Grassi": "Fat",

  /* --- profilo --- */
  "▸ Impostazioni account": "▸ Account settings",
  "Salva account": "Save account", "Esci": "Sign out",
  "◈ Rifai setup profilo": "◈ Redo profile setup",
  "◈ ACCOUNT AGGIORNATO": "◈ ACCOUNT UPDATED",
  "◈ DATI SALVATI": "◈ DATA SAVED",
  "Profilo corporeo aggiornato": "Body profile updated",
  "dati corporei del profilo": "profile body data",
  "Circonferenze (cm)": "Measurements (cm)",
  "BMI calcolato": "Calculated BMI",
  "SOTTOPESO": "UNDERWEIGHT", "NORMOPESO": "NORMAL", "SOVRAPPESO": "OVERWEIGHT", "OBESITÀ": "OBESE",
  "Collo": "Neck", "Petto": "Chest", "Vita": "Waist", "Braccio": "Arm", "Coscia": "Thigh",
  "Account gratuito ·": "Free account ·",
  "passa a Premium ›": "upgrade to Premium ›",
  "◆ ACCOUNT PREMIUM — attivo fino al": "◆ PREMIUM ACCOUNT — active until",
  "Account Premium attivo": "Premium account active",

  /* --- store / crediti --- */
  "◈ STORE": "◈ STORE",
  "◈ GYMQUEST PREMIUM": "◈ GYMQUEST PREMIUM",
  "SBLOCCA LE FUNZIONI AI AVANZATE": "UNLOCK ADVANCED AI FEATURES",
  "◆ Premium — 12 mesi": "◆ Premium — 12 months",
  "Pacchetto 30 crediti": "30 credits pack",
  "Pacchetto 100 crediti": "100 credits pack",
  "Una tantum · generazioni extra oltre il limite settimanale":
    "One-off · extra generations beyond the weekly limit",
  "Una tantum · il più conveniente per chi genera tanto":
    "One-off · best value for heavy users",
  "◈ PREMIUM ATTIVO": "◈ PREMIUM ACTIVE",
  "Benvenuto tra gli Spartan": "Welcome among the Spartans",
  "◈ CREDITI AGGIUNTI": "◈ CREDITS ADDED",
  "Saldo:": "Balance:", "crediti": "credits",
  "▸ Generazioni AI — questa settimana": "▸ AI generations — this week",
  "CREDITI EXTRA:": "EXTRA CREDITS:", "CREDITI:": "CREDITS:",
  "Caricamento utilizzo…": "Loading usage…",
  "Import scheda PT": "PT routine import",
  "Piano nutrizionale": "Nutrition plan",
  "Scan macchinari": "Machine scan",
  "I LIMITI SI AZZERANO OGNI SETTIMANA · OLTRE IL LIMITE SI USANO I CREDITI EXTRA":
    "LIMITS RESET EVERY WEEK · BEYOND THE LIMIT EXTRA CREDITS ARE USED",
  "QUESTA SETTIMANA": "THIS WEEK",
  "NUTRIZIONE": "NUTRITION", "SCAN": "SCAN", "IMPORT PT": "PT IMPORT",
  "PAGAMENTO SICURO VIA PAYPAL · ATTIVAZIONE IMMEDIATA · 12 MESI, NESSUN RINNOVO AUTOMATICO":
    "SECURE PAYPAL PAYMENT · INSTANT ACTIVATION · 12 MONTHS, NO AUTO-RENEWAL",
  "⚠ VITE_PAYPAL_CLIENT_ID non configurato": "⚠ VITE_PAYPAL_CLIENT_ID not configured",
  "Errore PayPal, riprova.": "PayPal error, please try again.",
  "Pagamento non confermato": "Payment not confirmed",

  /* --- sfide / medaglie --- */
  "◈ SFIDE": "◈ CHALLENGES", "SFIDE": "CHALLENGES", "Sfide e medaglie": "Challenges and medals",
  "GIORNALIERE": "DAILY", "SETTIMANALI": "WEEKLY", "MEDAGLIE": "MEDALS",
  "STREAK": "STREAK", "GIORNI": "DAYS",
  "SI RINNOVANO OGNI SETTIMANA": "THEY RESET EVERY WEEK",
  "SBLOCCATE": "UNLOCKED", "FACILE": "EASY", "DIFFICILE": "HARD",
  "Nessuna sfida attiva oggi.": "No active challenges today.",
  "◈ RAPPORTO MISSIONE": "◈ MISSION DEBRIEF",
  "▸ Avanzamento sfide": "▸ Challenge progress",
  "Continua ›": "Continue ›",
  "▲ RANK UP!": "▲ RANK UP!",
  "◈ QUEST COMPLETATA": "◈ CHALLENGE COMPLETE",
  "◈ MISSION REPORT": "◈ MISSION REPORT",
  "▸ Dettaglio esercizi": "▸ Exercise breakdown",
  "★ MIGLIOR SERIE · LE SERIE BARRATE NON SONO STATE COMPLETATE":
    "★ BEST SET · CROSSED-OUT SETS WERE NOT COMPLETED",
  "Nessun dettaglio disponibile per questo allenamento (registrato con una versione precedente).":
    "No details available for this workout (recorded with an earlier version).",

  /* --- PWA --- */
  "◈ INSTALLA GYMQUEST": "◈ INSTALL GYMQUEST",
  "Aggiungila alla schermata home come app": "Add it to your home screen as an app",
  "Installa": "Install",

  /* --- gruppi muscolari --- */
  "Dorso": "Back", "Gambe": "Legs", "Spalle": "Shoulders",
  "Bicipiti": "Biceps", "Tricipiti": "Triceps", "Core": "Core", "Altro": "Other",
  "PETTO": "CHEST", "DORSO": "BACK", "GAMBE": "LEGS", "SPALLE": "SHOULDERS",
  "BICIPITI": "BICEPS", "TRICIPITI": "TRICEPS", "CARDIO ": "CARDIO ", "ALTRO": "OTHER",

  /* --- nomi esercizi --- */
  "Panca Piana Bilanciere": "Barbell Bench Press", "Panca Piana Manubri": "Dumbbell Bench Press",
  "Panca Inclinata Bilanciere": "Incline Barbell Press", "Panca Inclinata Manubri": "Incline Dumbbell Press",
  "Panca Declinata": "Decline Bench Press", "Chest Press": "Chest Press",
  "Croci Manubri": "Dumbbell Flyes", "Croci ai Cavi": "Cable Crossover",
  "Pectoral Machine": "Pec Deck", "Push-Up": "Push-Up", "Dip alle Parallele": "Parallel Bar Dips",
  "Trazioni": "Pull-Ups", "Trazioni Presa Inversa": "Chin-Ups",
  "Lat Machine Avanti": "Wide-Grip Lat Pulldown", "Lat Machine Presa Stretta": "Close-Grip Lat Pulldown",
  "Rematore Bilanciere": "Barbell Row", "Rematore Manubrio": "One-Arm Dumbbell Row",
  "Rematore T-Bar": "T-Bar Row", "Pulley Basso": "Seated Cable Row",
  "Pull-Down Braccia Tese": "Straight-Arm Pulldown", "Hyperextension": "Back Extension",
  "Stacco da Terra": "Deadlift", "Squat Bilanciere": "Barbell Squat", "Front Squat": "Front Squat",
  "Leg Press": "Leg Press", "Hack Squat": "Hack Squat", "Affondi Manubri": "Dumbbell Lunges",
  "Affondi Bulgari": "Bulgarian Split Squat", "Stacco Rumeno": "Romanian Deadlift",
  "Leg Extension": "Leg Extension", "Leg Curl Sdraiato": "Lying Leg Curl",
  "Leg Curl Seduto": "Seated Leg Curl", "Hip Thrust": "Hip Thrust",
  "Calf Raise in Piedi": "Standing Calf Raise", "Calf Raise Seduto": "Seated Calf Raise",
  "Military Press": "Military Press", "Shoulder Press Manubri": "Dumbbell Shoulder Press",
  "Arnold Press": "Arnold Press", "Alzate Laterali": "Lateral Raises",
  "Alzate Laterali ai Cavi": "Cable Lateral Raises", "Alzate Frontali": "Front Raises",
  "Alzate Posteriori": "Rear Delt Raises", "Face Pull": "Face Pull", "Shrug Bilanciere": "Barbell Shrug",
  "Curl Bilanciere": "Barbell Curl", "Curl Manubri Alternato": "Alternating Dumbbell Curl",
  "Curl Panca Scott": "Preacher Curl", "Hammer Curl": "Hammer Curl", "Curl ai Cavi": "Cable Curl",
  "Curl Concentrato": "Concentration Curl", "Spider Curl": "Spider Curl",
  "Pushdown Tricipiti": "Triceps Pushdown", "Pushdown Corda": "Rope Pushdown",
  "French Press": "Skull Crusher", "Estensioni Sopra la Testa": "Overhead Triceps Extension",
  "Panca Presa Stretta": "Close-Grip Bench Press", "Dip tra Panche": "Bench Dips",
  "Kickback Manubrio": "Dumbbell Kickback", "Plank": "Plank", "Crunch": "Crunch",
  "Crunch ai Cavi": "Cable Crunch", "Russian Twist": "Russian Twist", "Leg Raise": "Leg Raise",
  "Hanging Leg Raise": "Hanging Leg Raise", "Ab Wheel": "Ab Wheel", "Side Plank": "Side Plank",
  "Corsa": "Running", "Camminata Veloce": "Brisk Walking", "Tapis Roulant": "Treadmill",
  "Cyclette": "Stationary Bike", "Ellittica": "Elliptical", "Vogatore": "Rowing Machine",
  "Salto della Corda": "Jump Rope", "Stepper": "Stair Stepper",

  /* --- macchinari --- */
  "Panca Piana": "Flat Bench", "Panca Inclinata": "Incline Bench",
  "Power Rack / Rastrelliera Squat": "Power Rack / Squat Rack",
  "Smith Machine (Multipower)": "Smith Machine",
  "Lat Machine": "Lat Pulldown Machine", "Stazione ai Cavi": "Cable Station",
  "Hack Squat Machine": "Hack Squat Machine", "Leg Extension Machine": "Leg Extension Machine",
  "Leg Curl Machine": "Leg Curl Machine", "Calf Machine": "Calf Machine",
  "Shoulder Press Machine": "Shoulder Press Machine", "Panca Scott": "Preacher Bench",
  "Parallele / Dip Station": "Dip Station", "Sbarra Trazioni": "Pull-Up Bar",
  "Panca Hyperextension": "Back Extension Bench", "Rastrelliera Manubri": "Dumbbell Rack",
  "T-Bar Row": "T-Bar Row", "Stepper / Stairmaster": "Stair Stepper",
};

/* --- contenuti: quest, medaglie, fun fact, descrizioni esercizi --- */
const EN_CONTENT = {
  /* quest giornaliere */
  "Fuoco di Copertura: completa 1 allenamento oggi": "Covering Fire: complete 1 workout today",
  "Grilletto Facile: completa 15 serie oggi": "Trigger Happy: complete 15 sets today",
  "Colpo su Colpo: completa 20 serie oggi": "Shot for Shot: complete 20 sets today",
  "Ordigno Pesante: solleva 3.000 kg di volume oggi": "Heavy Ordnance: lift 3,000 kg of volume today",
  "Demolizione: solleva 5.000 kg di volume oggi": "Demolition: lift 5,000 kg of volume today",
  "Supremazia: solleva 8.000 kg di volume oggi": "Supremacy: lift 8,000 kg of volume today",
  "Corridoio di Fuga: 10 minuti di cardio oggi": "Escape Route: 10 minutes of cardio today",
  "Marcia Forzata: 20 minuti di cardio oggi": "Forced March: 20 minutes of cardio today",
  "Oltre il Limite: registra 1 nuovo record oggi": "Beyond the Limit: set 1 new record today",
  "Ricognizione Rapida: completa 10 serie oggi": "Quick Recon: complete 10 sets today",
  "Assalto Frontale: completa 25 serie oggi": "Frontal Assault: complete 25 sets today",
  "Carico Bellico: solleva 1.500 kg di volume oggi": "Combat Load: lift 1,500 kg of volume today",
  "Sprint Finale: 15 minuti di cardio oggi": "Final Sprint: 15 minutes of cardio today",
  "Doppio Turno: completa 2 allenamenti oggi": "Double Shift: complete 2 workouts today",
  /* quest settimanali */
  "Operazione Settimanale: completa 3 allenamenti": "Weekly Operation: complete 3 workouts",
  "Campagna Estesa: completa 4 allenamenti": "Extended Campaign: complete 4 workouts",
  "Guerra Totale: completa 5 allenamenti": "Total War: complete 5 workouts",
  "Arsenale Completo: completa 60 serie": "Full Arsenal: complete 60 sets",
  "Fuoco Sostenuto: completa 80 serie": "Sustained Fire: complete 80 sets",
  "Tonnellata Spartana: solleva 15.000 kg di volume": "Spartan Tonnage: lift 15,000 kg of volume",
  "Titano d'Acciaio: solleva 25.000 kg di volume": "Steel Titan: lift 25,000 kg of volume",
  "Maratona del Soldato: 60 minuti di cardio": "Soldier's Marathon: 60 minutes of cardio",
  "Resistenza Estrema: 90 minuti di cardio": "Extreme Endurance: 90 minutes of cardio",
  "Cacciatore di Record: registra 2 nuovi PR": "Record Hunter: set 2 new PRs",
  "LASO Settimanale: 4 allenamenti e 50 serie": "Weekly LASO: 4 workouts and 50 sets",

  /* medaglie */
  "Il Primo Passo": "The First Step", "Completa il tuo primo allenamento": "Complete your first workout",
  "Recluta Promossa": "Promoted Recruit", "Completa 10 allenamenti": "Complete 10 workouts",
  "Veterano del Ferro": "Iron Veteran", "Completa 50 allenamenti": "Complete 50 workouts",
  "Spartan-117": "Spartan-117", "Completa 100 allenamenti": "Complete 100 workouts",
  "Grilletto Consumato": "Worn Trigger", "Completa 100 serie totali": "Complete 100 total sets",
  "Mitragliere": "Machine Gunner", "Completa 1.000 serie totali": "Complete 1,000 total sets",
  "Diecimila": "Ten Thousand", "Solleva 10.000 kg di volume totale": "Lift 10,000 kg of total volume",
  "Centomila": "Hundred Thousand", "Solleva 100.000 kg di volume totale": "Lift 100,000 kg of total volume",
  "Mjolnir": "Mjolnir", "Solleva 500.000 kg di volume totale": "Lift 500,000 kg of total volume",
  "Fiato da Marine": "Marine Lungs", "60 minuti di cardio totali": "60 total minutes of cardio",
  "Maratoneta ODST": "ODST Marathoner", "600 minuti di cardio totali": "600 total minutes of cardio",
  "Nuovo Massimale": "New Max", "Registra il tuo primo PR": "Set your first PR",
  "Club dei 100": "The 100 Club", "PR di 100 kg su Panca Piana Bilanciere": "100 kg PR on Barbell Bench Press",
  "Cacciatore di Taglie": "Bounty Hunter", "Completa 10 quest": "Complete 10 challenges",
  "Leggenda delle Sfide": "Challenge Legend", "Completa 50 quest": "Complete 50 challenges",
  "Ufficiale di Grado": "Ranking Officer", "Raggiungi il livello 10": "Reach level 10",
  "Hyper Lethal": "Hyper Lethal", "Raggiungi il livello 25": "Reach level 25",

  /* fun fact */
  "Il muscolo cresce durante il recupero, non durante l'allenamento: dormi 7-9 ore.":
    "Muscle grows during recovery, not during training: sleep 7-9 hours.",
  "Aumentare il carico anche solo di 1-2 kg a settimana è progressione reale.":
    "Adding even just 1-2 kg per week is real progression.",
  "La fase eccentrica (discesa lenta) genera più adattamento muscolare di quella concentrica.":
    "The eccentric phase (slow lowering) drives more muscle adaptation than the concentric one.",
  "2 g di proteine per kg di peso corporeo sono il riferimento per chi si allena coi pesi.":
    "2 g of protein per kg of bodyweight is the benchmark for lifters.",
  "Il riscaldamento ideale replica l'esercizio che stai per fare, a carico ridotto.":
    "The ideal warm-up mirrors the exercise you're about to do, with lighter loads.",
  "I DOMS non misurano l'efficacia dell'allenamento: sono solo micro-danno da stimoli nuovi.":
    "Soreness doesn't measure training quality: it's just micro-damage from novel stimuli.",
  "La forza è anche neurale: le prime settimane migliori perché il cervello impara, non perché il muscolo cresce.":
    "Strength is partly neural: early gains come from your brain learning, not muscle growth.",
  "Bere il 2% del peso corporeo in meno d'acqua riduce già la performance.":
    "Being just 2% of bodyweight dehydrated already hurts performance.",
  "Il range di movimento completo costruisce più muscolo dei mezzi movimenti col doppio del peso.":
    "Full range of motion builds more muscle than half reps with twice the weight.",
  "Recuperi 2-3 min tra le serie pesanti aumentano forza e volume totale sollevato.":
    "Resting 2-3 min between heavy sets increases strength and total volume lifted.",
  "La creatina monoidrato è l'integratore più studiato ed efficace: 3-5 g al giorno, sempre.":
    "Creatine monohydrate is the most studied, most effective supplement: 3-5 g daily, consistently.",
  "Allenarsi a cedimento a ogni serie non serve: fermati a 1-3 ripetizioni dal limite.":
    "Training to failure every set isn't needed: stop 1-3 reps short.",
  "Il grasso non si trasforma in muscolo: sono tessuti diversi, si perde uno e si costruisce l'altro.":
    "Fat doesn't turn into muscle: they're different tissues — you lose one and build the other.",
  "La costanza batte l'intensità: 3 allenamenti a settimana per anni valgono più di 6 per un mese.":
    "Consistency beats intensity: 3 workouts a week for years beat 6 a week for a month.",
  "Camminare 8-10 mila passi al giorno migliora il recupero e brucia più di quanto pensi.":
    "Walking 8-10 thousand steps a day improves recovery and burns more than you think.",
  "Il core lavora in quasi ogni esercizio in piedi: squat e stacco sono anche esercizi per l'addome.":
    "Your core works in almost every standing lift: squats and deadlifts are ab exercises too.",
  "Dopo le 18 il corpo è mediamente più forte del 5-10% rispetto al mattino presto.":
    "After 6pm the body is on average 5-10% stronger than in the early morning.",
  "La caffeina 30-60 minuti prima migliora forza e resistenza: 3-6 mg per kg di peso.":
    "Caffeine 30-60 minutes before improves strength and endurance: 3-6 mg per kg of bodyweight.",
  "Cambiare scheda ogni settimana impedisce la progressione: tieni gli stessi esercizi 6-10 settimane.":
    "Changing your routine weekly blocks progression: keep the same exercises for 6-10 weeks.",
  "Il pump post-allenamento è sangue nei muscoli, non crescita: sparisce in un paio d'ore.":
    "The post-workout pump is blood in the muscle, not growth: it fades within a couple of hours.",
  "Le donne non diventano 'grosse' coi pesi: hanno 10-15 volte meno testosterone.":
    "Women don't get 'bulky' from lifting: they have 10-15 times less testosterone.",
  "Un chilo di muscolo consuma più calorie a riposo di un chilo di grasso: la massa è un investimento.":
    "A kilo of muscle burns more calories at rest than a kilo of fat: muscle is an investment.",
  "L'ultimo pasto pre-workout ideale è 2-3 ore prima: carboidrati + proteine, pochi grassi.":
    "The ideal pre-workout meal is 2-3 hours before: carbs + protein, low fat.",
  "Il sovrallenamento vero è raro: quasi sempre è sotto-recupero (sonno, cibo, stress).":
    "True overtraining is rare: it's almost always under-recovery (sleep, food, stress).",
  "Registrare i propri allenamenti aumenta i progressi: ciò che misuri, migliora.":
    "Logging your workouts improves progress: what gets measured, improves.",
};

/* --- descrizioni esecuzione esercizi --- */
const EN_DESC = {
  "Sdraiati sulla panca con scapole addotte e piedi a terra. Impugna il bilanciere poco oltre le spalle, scendi controllato fino a sfiorare il petto e spingi verso l'alto senza bloccare i gomiti. Mantieni i glutei sulla panca.": "Lie on the bench with shoulder blades retracted and feet planted. Grip the bar just outside shoulder width, lower under control until it grazes your chest, then press up without locking the elbows. Keep your glutes on the bench.",
  "Panca a 30-45°. Scendi con il bilanciere verso la parte alta del petto e spingi in verticale. Enfatizza la porzione clavicolare del pettorale.": "Bench at 30-45°. Lower the bar toward your upper chest and press vertically. Emphasizes the clavicular head of the pecs.",
  "Regola il sedile con le maniglie all'altezza del petto. Spingi in avanti senza estendere completamente i gomiti e torna lento in apertura mantenendo tensione.": "Set the seat so the handles sit at chest height. Press forward without fully locking the elbows and return slowly, keeping tension.",
  "Sdraiato, braccia semiflesse e fisse. Apri i manubri ad arco fino ad avvertire allungamento sul petto, poi richiudi come per abbracciare. Movimento ampio, carichi moderati.": "Lying down, arms slightly bent and fixed. Open the dumbbells in an arc until you feel a stretch across the chest, then close as if hugging. Wide movement, moderate loads.",
  "Mani poco oltre le spalle, corpo in linea dalla testa ai talloni. Scendi con il petto verso terra tenendo i gomiti a ~45° e spingi su senza inarcare la schiena.": "Hands just outside shoulder width, body in a straight line from head to heels. Lower your chest toward the floor with elbows at ~45° and push up without arching your back.",
  "Sospeso alle parallele, busto leggermente inclinato avanti per il petto. Scendi finché le spalle sono poco sotto i gomiti e risali spingendo. Fermati prima se avverti fastidio alle spalle.": "Suspended on the bars, torso leaning slightly forward for chest emphasis. Lower until your shoulders are just below your elbows, then press back up. Stop earlier if you feel shoulder discomfort.",
  "Presa prona poco oltre le spalle. Parti da braccia distese, tira il petto verso la sbarra portando i gomiti in basso e indietro, scendi controllato senza slanci.": "Overhand grip just outside shoulder width. Start from a full hang, pull your chest toward the bar driving the elbows down and back, then lower under control with no swinging.",
  "Impugna larga la sbarra, busto leggermente indietro. Tira verso l'alto del petto pensando a spingere i gomiti in basso, risali frenando il carico.": "Take a wide grip, torso leaning slightly back. Pull toward your upper chest thinking about driving the elbows down, then return resisting the load.",
  "Busto inclinato ~45° con schiena neutra e core attivo. Tira il bilanciere verso l'ombelico tenendo i gomiti vicini al corpo, scendi controllato.": "Torso at ~45° with a neutral spine and braced core. Pull the bar toward your navel keeping the elbows close to your body, then lower under control.",
  "Seduto, gambe semiflesse e schiena dritta. Tira la maniglia verso l'addome stringendo le scapole, torna avanti allungando senza incurvare la schiena.": "Seated, knees slightly bent and back straight. Pull the handle to your abdomen squeezing the shoulder blades, then return forward into a stretch without rounding your back.",
  "Piedi sotto il bilanciere, schiena neutra, petto in fuori. Spingi il pavimento con le gambe e sali estendendo anche e ginocchia insieme, bilanciere aderente al corpo. Tecnica prima del carico.": "Feet under the bar, neutral spine, chest up. Push the floor away with your legs and rise extending hips and knees together, keeping the bar against your body. Technique before load.",
  "Bilanciere sui trapezi, piedi poco oltre le spalle. Scendi spingendo le anche indietro e le ginocchia in linea con le punte fino a cosce parallele (o sotto), risali spingendo con tutto il piede.": "Bar on your traps, feet just outside shoulder width. Descend pushing the hips back with knees tracking over the toes until the thighs are parallel (or below), then drive up through the whole foot.",
  "Piedi al centro della pedana alla larghezza spalle. Scendi controllato fino a ~90° senza staccare il bacino dallo schienale, spingi senza bloccare le ginocchia.": "Feet centred on the platform at shoulder width. Lower under control to ~90° without letting your hips leave the backrest, then press without locking the knees.",
  "Passo avanti ampio, scendi in verticale finché il ginocchio posteriore sfiora terra. Il ginocchio anteriore resta in linea con il piede. Spingi con il tallone per risalire.": "Take a long step forward and descend vertically until the rear knee grazes the floor. The front knee stays in line with the foot. Push through the heel to stand.",
  "Gambe quasi tese, scendi facendo scivolare il bilanciere lungo le cosce spingendo le anche indietro, schiena neutra. Risali contraendo glutei e femorali.": "Legs almost straight, lower the bar sliding along your thighs while pushing the hips back, spine neutral. Rise by squeezing glutes and hamstrings.",
  "Regola il cuscinetto sopra le caviglie. Estendi le gambe con controllo fino a contrarre il quadricipite, scendi frenando senza far cadere il pacco pesi.": "Set the pad just above the ankles. Extend the legs under control until the quads contract, then lower resisting without letting the stack drop.",
  "Cuscinetto sopra i talloni. Fletti le gambe portando i talloni verso i glutei senza sollevare il bacino, torna lento in allungamento.": "Pad just above the heels. Curl the legs bringing your heels toward your glutes without lifting the hips, then return slowly into a stretch.",
  "Scapole appoggiate alla panca, bilanciere sul bacino. Spingi con i talloni ed estendi le anche fino ad allineare busto e cosce, contraendo forte i glutei in alto.": "Shoulder blades on the bench, bar across your hips. Drive through the heels and extend the hips until torso and thighs align, squeezing the glutes hard at the top.",
  "Avampiedi sul rialzo, talloni liberi. Sali il più in alto possibile sulle punte, pausa, scendi in massimo allungamento. Movimento lento e completo.": "Balls of the feet on the step, heels free. Rise as high as possible onto your toes, pause, then lower into a full stretch. Slow and complete movement.",
  "In piedi, bilanciere alle clavicole, core e glutei contratti. Spingi in verticale portando la testa leggermente avanti a fine spinta. Non inarcare la zona lombare.": "Standing, bar at the collarbones, core and glutes braced. Press vertically, moving your head slightly forward at lockout. Don't arch the lower back.",
  "Manubri ai fianchi, gomiti semiflessi. Solleva lateralmente fino all'altezza delle spalle guidando con i gomiti, scendi lento. Carichi leggeri, zero slanci.": "Dumbbells at your sides, elbows slightly bent. Raise laterally to shoulder height leading with the elbows, then lower slowly. Light loads, no swinging.",
  "Parti con i manubri davanti alle spalle e palmi verso di te; spingendo in alto ruota i polsi fino ad avere i palmi in avanti. Torna ruotando in senso inverso.": "Start with the dumbbells in front of your shoulders, palms facing you; as you press up rotate the wrists until the palms face forward. Reverse the rotation on the way down.",
  "Corda all'altezza del viso. Tira verso la fronte aprendo i gomiti in fuori e ruotando esternamente le spalle. Ottimo per la salute della cuffia.": "Rope set at face height. Pull toward your forehead flaring the elbows out and externally rotating the shoulders. Great for rotator cuff health.",
  "In piedi, gomiti fermi ai fianchi. Fletti gli avambracci portando il bilanciere alle spalle senza oscillare il busto, scendi in 2-3 secondi.": "Standing, elbows pinned at your sides. Curl the bar up to your shoulders without swinging the torso, then lower over 2-3 seconds.",
  "Come il curl ma con presa neutra (palmi che si guardano). Colpisce brachiale e avambraccio. Gomiti fissi, discesa controllata.": "Like a curl but with a neutral grip (palms facing each other). Targets the brachialis and forearm. Elbows fixed, controlled descent.",
  "Braccia appoggiate sul cuscino inclinato. Fletti fino in alto e scendi quasi a braccia distese senza mai perdere tensione. Isola il bicipite eliminando lo slancio.": "Arms resting on the angled pad. Curl all the way up and lower to almost straight arms without losing tension. Isolates the biceps by removing momentum.",
  "Alla poulie alta, gomiti bloccati ai fianchi. Estendi gli avambracci fino in basso contraendo il tricipite, risali frenando fino ai 90°.": "At the high pulley, elbows locked at your sides. Extend the forearms all the way down squeezing the triceps, then return resisting to 90°.",
  "Sdraiato, bilanciere EZ sopra la fronte. Piega solo i gomiti scendendo verso la testa e riestendi. Gomiti stretti e fermi per tutto il movimento.": "Lying down, EZ bar above your forehead. Bend only at the elbows lowering toward your head, then extend. Elbows tucked and still throughout.",
  "Come la panca piana ma con presa alla larghezza spalle e gomiti vicini al corpo. Il carico si sposta sui tricipiti.": "Like the flat bench press but with a shoulder-width grip and elbows tucked. The load shifts onto the triceps.",
  "Avambracci a terra, corpo in linea, addome e glutei contratti. Non far cadere il bacino né alzarlo. Respira e mantieni la posizione per il tempo previsto.": "Forearms on the floor, body in a straight line, abs and glutes braced. Don't let the hips sag or pike. Breathe and hold for the prescribed time.",
  "Sdraiato, gambe piegate, mani alle tempie. Solleva le scapole arrotondando la parte alta della schiena, espira contraendo l'addome, scendi lento.": "Lying down, knees bent, hands at your temples. Lift the shoulder blades rounding the upper back, exhale as the abs contract, then lower slowly.",
  "Sdraiato, mani sotto i glutei. Solleva le gambe tese fino alla verticale e scendile lente senza toccare terra, schiena lombare sempre aderente.": "Lying down, hands under your glutes. Raise straight legs to vertical and lower them slowly without touching the floor, keeping the lower back flat.",
  "Seduto con busto inclinato indietro e gambe sollevate. Ruota il busto da un lato all'altro toccando terra accanto al fianco, con o senza peso.": "Seated with torso leaning back and legs lifted. Rotate side to side touching the floor beside your hip, with or without weight.",
  "Postura eretta, sguardo avanti, appoggio sotto il baricentro. Mantieni un ritmo in cui riesci a parlare a frasi corte (fondo lento) o spingi a intervalli per l'alta intensità. Aumenta il volume gradualmente.": "Upright posture, eyes forward, foot landing under your centre of mass. Hold a pace where you can speak in short sentences (easy runs) or push intervals for high intensity. Build volume gradually.",
  "Imposta velocità o pendenza adatte al tuo livello, non aggrapparti ai corrimano. Camminata in salita (5-10%) è un'ottima alternativa a basso impatto.": "Set a speed or incline suited to your level and don't hold the handrails. Incline walking (5-10%) is an excellent low-impact alternative.",
  "Regola la sella all'altezza dell'anca: gamba quasi distesa nel punto più basso. Cadenza fluida 70-90 rpm, resistenza tale da mantenere lo sforzo costante.": "Set the saddle at hip height: leg almost straight at the bottom. Smooth cadence of 70-90 rpm, resistance that keeps the effort steady.",
  "Sequenza: spinta gambe → apertura busto → tirata braccia; ritorno in ordine inverso. La forza viene per il 60% dalle gambe. Schiena neutra sempre.": "Sequence: leg drive → torso opens → arm pull; reverse on the recovery. About 60% of the power comes from the legs. Keep a neutral spine throughout.",
  "Salta basso sull'avampiede, polsi che ruotano la corda, gomiti vicini al corpo. Ottimo per condizionamento: alterna round da 1-3 minuti a pause brevi.": "Jump low on the balls of your feet, wrists turning the rope, elbows close to your body. Great conditioning: alternate 1-3 minute rounds with short rests.",
  /* fallback per gruppo */
  "Esercizio per il pettorale: scapole addotte, movimento controllato in discesa e spinta senza bloccare i gomiti. Concentrati sul sentire lavorare il petto, non solo braccia e spalle.": "Chest exercise: shoulder blades retracted, controlled descent and press without locking the elbows. Focus on feeling the chest work, not just arms and shoulders.",
  "Esercizio di tirata per il dorso: parti da braccia distese, tira guidando con i gomiti (non con le mani) e stringi le scapole a fine movimento. Torna in allungamento frenando il carico.": "Back pulling exercise: start from straight arms, pull leading with the elbows (not the hands) and squeeze the shoulder blades at the end. Return into a stretch resisting the load.",
  "Esercizio per la parte inferiore: schiena neutra, ginocchia in linea con le punte dei piedi, scendi controllato e spingi con tutto il piede. La profondità corretta vale più del carico.": "Lower body exercise: neutral spine, knees tracking over the toes, descend under control and drive through the whole foot. Proper depth matters more than load.",
  "Esercizio per i deltoidi: carichi moderati, niente slanci, movimento guidato dai gomiti. Ferma l'alzata all'altezza delle spalle e scendi lentamente.": "Deltoid exercise: moderate loads, no swinging, movement led by the elbows. Stop the raise at shoulder height and lower slowly.",
  "Esercizio di flessione per i bicipiti: gomiti fermi vicino al busto, sali contraendo e scendi in 2-3 secondi senza oscillare il corpo.": "Biceps curling exercise: elbows fixed close to the torso, curl up squeezing and lower over 2-3 seconds without swinging.",
  "Esercizio di estensione per i tricipiti: gomiti bloccati e vicini al corpo, estendi completamente contraendo e risali frenando il carico.": "Triceps extension exercise: elbows locked and close to the body, extend fully squeezing and return resisting the load.",
  "Esercizio per il core: bacino stabile, zona lombare protetta, movimento lento guidato dall'addome con espirazione nella fase di contrazione.": "Core exercise: stable pelvis, protected lower back, slow movement led by the abs with an exhale during the contraction.",
  "Attività aerobica: mantieni un ritmo sostenibile e costante, monitora respiro o frequenza cardiaca, e incrementa durata o intensità in modo graduale settimana dopo settimana.": "Aerobic activity: hold a sustainable, steady pace, monitor breathing or heart rate, and increase duration or intensity gradually week after week.",
  "Esegui il movimento in modo lento e controllato, con postura corretta e senza compensi. Se non conosci la tecnica, chiedi una dimostrazione al trainer della tua palestra.": "Perform the movement slowly and under control, with good posture and no compensations. If you don't know the technique, ask a trainer at your gym for a demonstration.",
};

Object.assign(EN_UI, EN_CONTENT, EN_DESC);

/* ====================== EXERCISE LIBRARY (pre-loaded) ====================== */
const EXERCISE_DB = {
  Petto: ["Panca Piana Bilanciere", "Panca Piana Manubri", "Panca Inclinata Bilanciere", "Panca Inclinata Manubri", "Panca Declinata", "Chest Press", "Croci Manubri", "Croci ai Cavi", "Pectoral Machine", "Push-Up", "Dip alle Parallele"],
  Dorso: ["Trazioni", "Trazioni Presa Inversa", "Lat Machine Avanti", "Lat Machine Presa Stretta", "Rematore Bilanciere", "Rematore Manubrio", "Rematore T-Bar", "Pulley Basso", "Pull-Down Braccia Tese", "Hyperextension", "Stacco da Terra"],
  Gambe: ["Squat Bilanciere", "Front Squat", "Leg Press", "Hack Squat", "Affondi Manubri", "Affondi Bulgari", "Stacco Rumeno", "Leg Extension", "Leg Curl Sdraiato", "Leg Curl Seduto", "Hip Thrust", "Calf Raise in Piedi", "Calf Raise Seduto"],
  Spalle: ["Military Press", "Shoulder Press Manubri", "Arnold Press", "Alzate Laterali", "Alzate Laterali ai Cavi", "Alzate Frontali", "Alzate Posteriori", "Face Pull", "Shrug Bilanciere"],
  Bicipiti: ["Curl Bilanciere", "Curl Manubri Alternato", "Curl Panca Scott", "Hammer Curl", "Curl ai Cavi", "Curl Concentrato", "Spider Curl"],
  Tricipiti: ["Pushdown Tricipiti", "Pushdown Corda", "French Press", "Estensioni Sopra la Testa", "Panca Presa Stretta", "Dip tra Panche", "Kickback Manubrio"],
  Core: ["Plank", "Crunch", "Crunch ai Cavi", "Russian Twist", "Leg Raise", "Hanging Leg Raise", "Ab Wheel", "Side Plank"],
  Cardio: ["Corsa", "Camminata Veloce", "Tapis Roulant", "Cyclette", "Ellittica", "Vogatore", "Salto della Corda", "Stepper"],
};
const GROUPS = Object.keys(EXERCISE_DB);
const findGroup = (name) => {
  const n = name.toLowerCase();
  for (const [g, list] of Object.entries(EXERCISE_DB))
    if (list.some((e) => e.toLowerCase() === n)) return g;
  return "Altro";
};


/* ---------------- Descrizioni esecuzione esercizi ---------------- */
const EXERCISE_INFO = {
  "Panca Piana Bilanciere": "Sdraiati sulla panca con scapole addotte e piedi a terra. Impugna il bilanciere poco oltre le spalle, scendi controllato fino a sfiorare il petto e spingi verso l'alto senza bloccare i gomiti. Mantieni i glutei sulla panca.",
  "Panca Inclinata Bilanciere": "Panca a 30-45°. Scendi con il bilanciere verso la parte alta del petto e spingi in verticale. Enfatizza la porzione clavicolare del pettorale.",
  "Chest Press": "Regola il sedile con le maniglie all'altezza del petto. Spingi in avanti senza estendere completamente i gomiti e torna lento in apertura mantenendo tensione.",
  "Croci Manubri": "Sdraiato, braccia semiflesse e fisse. Apri i manubri ad arco fino ad avvertire allungamento sul petto, poi richiudi come per abbracciare. Movimento ampio, carichi moderati.",
  "Push-Up": "Mani poco oltre le spalle, corpo in linea dalla testa ai talloni. Scendi con il petto verso terra tenendo i gomiti a ~45° e spingi su senza inarcare la schiena.",
  "Dip alle Parallele": "Sospeso alle parallele, busto leggermente inclinato avanti per il petto. Scendi finché le spalle sono poco sotto i gomiti e risali spingendo. Fermati prima se avverti fastidio alle spalle.",
  "Trazioni": "Presa prona poco oltre le spalle. Parti da braccia distese, tira il petto verso la sbarra portando i gomiti in basso e indietro, scendi controllato senza slanci.",
  "Lat Machine Avanti": "Impugna larga la sbarra, busto leggermente indietro. Tira verso l'alto del petto pensando a spingere i gomiti in basso, risali frenando il carico.",
  "Rematore Bilanciere": "Busto inclinato ~45° con schiena neutra e core attivo. Tira il bilanciere verso l'ombelico tenendo i gomiti vicini al corpo, scendi controllato.",
  "Pulley Basso": "Seduto, gambe semiflesse e schiena dritta. Tira la maniglia verso l'addome stringendo le scapole, torna avanti allungando senza incurvare la schiena.",
  "Stacco da Terra": "Piedi sotto il bilanciere, schiena neutra, petto in fuori. Spingi il pavimento con le gambe e sali estendendo anche e ginocchia insieme, bilanciere aderente al corpo. Tecnica prima del carico.",
  "Squat Bilanciere": "Bilanciere sui trapezi, piedi poco oltre le spalle. Scendi spingendo le anche indietro e le ginocchia in linea con le punte fino a cosce parallele (o sotto), risali spingendo con tutto il piede.",
  "Leg Press": "Piedi al centro della pedana alla larghezza spalle. Scendi controllato fino a ~90° senza staccare il bacino dallo schienale, spingi senza bloccare le ginocchia.",
  "Affondi Manubri": "Passo avanti ampio, scendi in verticale finché il ginocchio posteriore sfiora terra. Il ginocchio anteriore resta in linea con il piede. Spingi con il tallone per risalire.",
  "Stacco Rumeno": "Gambe quasi tese, scendi facendo scivolare il bilanciere lungo le cosce spingendo le anche indietro, schiena neutra. Risali contraendo glutei e femorali.",
  "Leg Extension": "Regola il cuscinetto sopra le caviglie. Estendi le gambe con controllo fino a contrarre il quadricipite, scendi frenando senza far cadere il pacco pesi.",
  "Leg Curl Sdraiato": "Cuscinetto sopra i talloni. Fletti le gambe portando i talloni verso i glutei senza sollevare il bacino, torna lento in allungamento.",
  "Hip Thrust": "Scapole appoggiate alla panca, bilanciere sul bacino. Spingi con i talloni ed estendi le anche fino ad allineare busto e cosce, contraendo forte i glutei in alto.",
  "Calf Raise in Piedi": "Avampiedi sul rialzo, talloni liberi. Sali il più in alto possibile sulle punte, pausa, scendi in massimo allungamento. Movimento lento e completo.",
  "Military Press": "In piedi, bilanciere alle clavicole, core e glutei contratti. Spingi in verticale portando la testa leggermente avanti a fine spinta. Non inarcare la zona lombare.",
  "Alzate Laterali": "Manubri ai fianchi, gomiti semiflessi. Solleva lateralmente fino all'altezza delle spalle guidando con i gomiti, scendi lento. Carichi leggeri, zero slanci.",
  "Arnold Press": "Parti con i manubri davanti alle spalle e palmi verso di te; spingendo in alto ruota i polsi fino ad avere i palmi in avanti. Torna ruotando in senso inverso.",
  "Face Pull": "Corda all'altezza del viso. Tira verso la fronte aprendo i gomiti in fuori e ruotando esternamente le spalle. Ottimo per la salute della cuffia.",
  "Curl Bilanciere": "In piedi, gomiti fermi ai fianchi. Fletti gli avambracci portando il bilanciere alle spalle senza oscillare il busto, scendi in 2-3 secondi.",
  "Hammer Curl": "Come il curl ma con presa neutra (palmi che si guardano). Colpisce brachiale e avambraccio. Gomiti fissi, discesa controllata.",
  "Curl Panca Scott": "Braccia appoggiate sul cuscino inclinato. Fletti fino in alto e scendi quasi a braccia distese senza mai perdere tensione. Isola il bicipite eliminando lo slancio.",
  "Pushdown Tricipiti": "Alla poulie alta, gomiti bloccati ai fianchi. Estendi gli avambracci fino in basso contraendo il tricipite, risali frenando fino ai 90°.",
  "French Press": "Sdraiato, bilanciere EZ sopra la fronte. Piega solo i gomiti scendendo verso la testa e riestendi. Gomiti stretti e fermi per tutto il movimento.",
  "Panca Presa Stretta": "Come la panca piana ma con presa alla larghezza spalle e gomiti vicini al corpo. Il carico si sposta sui tricipiti.",
  "Plank": "Avambracci a terra, corpo in linea, addome e glutei contratti. Non far cadere il bacino né alzarlo. Respira e mantieni la posizione per il tempo previsto.",
  "Crunch": "Sdraiato, gambe piegate, mani alle tempie. Solleva le scapole arrotondando la parte alta della schiena, espira contraendo l'addome, scendi lento.",
  "Leg Raise": "Sdraiato, mani sotto i glutei. Solleva le gambe tese fino alla verticale e scendile lente senza toccare terra, schiena lombare sempre aderente.",
  "Russian Twist": "Seduto con busto inclinato indietro e gambe sollevate. Ruota il busto da un lato all'altro toccando terra accanto al fianco, con o senza peso.",
  "Corsa": "Postura eretta, sguardo avanti, appoggio sotto il baricentro. Mantieni un ritmo in cui riesci a parlare a frasi corte (fondo lento) o spingi a intervalli per l'alta intensità. Aumenta il volume gradualmente.",
  "Tapis Roulant": "Imposta velocità o pendenza adatte al tuo livello, non aggrapparti ai corrimano. Camminata in salita (5-10%) è un'ottima alternativa a basso impatto.",
  "Cyclette": "Regola la sella all'altezza dell'anca: gamba quasi distesa nel punto più basso. Cadenza fluida 70-90 rpm, resistenza tale da mantenere lo sforzo costante.",
  "Vogatore": "Sequenza: spinta gambe → apertura busto → tirata braccia; ritorno in ordine inverso. La forza viene per il 60% dalle gambe. Schiena neutra sempre.",
  "Salto della Corda": "Salta basso sull'avampiede, polsi che ruotano la corda, gomiti vicini al corpo. Ottimo per condizionamento: alterna round da 1-3 minuti a pause brevi.",
};
const INFO_FALLBACK = {
  Petto: "Esercizio per il pettorale: scapole addotte, movimento controllato in discesa e spinta senza bloccare i gomiti. Concentrati sul sentire lavorare il petto, non solo braccia e spalle.",
  Dorso: "Esercizio di tirata per il dorso: parti da braccia distese, tira guidando con i gomiti (non con le mani) e stringi le scapole a fine movimento. Torna in allungamento frenando il carico.",
  Gambe: "Esercizio per la parte inferiore: schiena neutra, ginocchia in linea con le punte dei piedi, scendi controllato e spingi con tutto il piede. La profondità corretta vale più del carico.",
  Spalle: "Esercizio per i deltoidi: carichi moderati, niente slanci, movimento guidato dai gomiti. Ferma l'alzata all'altezza delle spalle e scendi lentamente.",
  Bicipiti: "Esercizio di flessione per i bicipiti: gomiti fermi vicino al busto, sali contraendo e scendi in 2-3 secondi senza oscillare il corpo.",
  Tricipiti: "Esercizio di estensione per i tricipiti: gomiti bloccati e vicini al corpo, estendi completamente contraendo e risali frenando il carico.",
  Core: "Esercizio per il core: bacino stabile, zona lombare protetta, movimento lento guidato dall'addome con espirazione nella fase di contrazione.",
  Cardio: "Attività aerobica: mantieni un ritmo sostenibile e costante, monitora respiro o frequenza cardiaca, e incrementa durata o intensità in modo graduale settimana dopo settimana.",
  Altro: "Esegui il movimento in modo lento e controllato, con postura corretta e senza compensi. Se non conosci la tecnica, chiedi una dimostrazione al trainer della tua palestra.",
};

/* ---------------- Mapping import → database esercizi ---------------- */
/* Cerca la corrispondenza migliore col DB; il testo in eccesso del titolo finisce nelle note */
const ALL_EXERCISES = Object.values(EXERCISE_DB).flat();
const normalizeEx = (s) => s.toLowerCase().replace(/[^a-zà-ù0-9 ]/gi, " ").replace(/\s+/g, " ").trim();
const matchToDb = (title) => {
  const t = normalizeEx(title);
  let best = null;
  for (const list of Object.values(EXERCISE_DB)) {
    for (const dbEx of list) {
      const d = normalizeEx(dbEx);
      if (t === d) return { name: dbEx, note: "" };
      if ((t.startsWith(d + " ") || t.includes(" " + d + " ") || t.endsWith(" " + d)) &&
          (!best || d.length > normalizeEx(best).length)) best = dbEx;
    }
  }
  if (best) {
    const note = title.replace(new RegExp(best.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "")
      .replace(/^[\s\-–—·,:]+|[\s\-–—·,:]+$/g, "");
    return { name: best, note };
  }
  return { name: title, note: "" };
};



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
/* --- modali e overlay --- */
.modal-back{position:fixed;inset:0;background:rgba(2,6,10,.82);backdrop-filter:blur(3px);z-index:120;display:flex;align-items:center;justify-content:center;padding:16px}
.modal-box{width:100%;max-width:430px;background:#071523;border:1px solid #57c8f2;box-shadow:0 0 30px rgba(87,200,242,.22);padding:20px;max-height:85vh;overflow-y:auto}
.float-cam-btn{position:fixed;right:16px;bottom:142px;z-index:95;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#0c2a3d;border:1px solid #57c8f2;cursor:pointer;box-shadow:0 0 14px rgba(87,200,242,.35)}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.float-timer-btn{position:fixed;right:16px;bottom:86px;z-index:95;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#0c2a3d;border:1px solid #57c8f2;cursor:pointer;box-shadow:0 0 14px rgba(87,200,242,.35)}
.float-timer{position:fixed;left:12px;right:12px;margin:0 auto;bottom:86px;z-index:96;background:#071523;border:1px solid #ffd76a;box-shadow:0 0 24px rgba(255,215,106,.22);padding:14px 16px;max-width:340px;box-sizing:border-box}
.set-grid-t{display:grid;grid-template-columns:42px 1fr 64px 48px;gap:10px;align-items:center}
.icon-tap{display:inline-flex;align-items:center;justify-content:center;padding:7px;margin:-5px;cursor:pointer}

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

.set-grid{display:grid;grid-template-columns:42px 1fr 1fr 48px;gap:10px;align-items:center}
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

/* ================================ BOOT SCREEN ================================ */
/* Splash in stile Halo: copre il check della sessione (niente flash del login) */
const BASE_FACTS = [
  "Il muscolo cresce durante il recupero, non durante l'allenamento: dormi 7-9 ore.",
  "Aumentare il carico anche solo di 1-2 kg a settimana è progressione reale.",
  "La fase eccentrica (discesa lenta) genera più adattamento muscolare di quella concentrica.",
  "2 g di proteine per kg di peso corporeo sono il riferimento per chi si allena coi pesi.",
  "Il riscaldamento ideale replica l'esercizio che stai per fare, a carico ridotto.",
  "I DOMS non misurano l'efficacia dell'allenamento: sono solo micro-danno da stimoli nuovi.",
  "La forza è anche neurale: le prime settimane migliori perché il cervello impara, non perché il muscolo cresce.",
  "Bere il 2% del peso corporeo in meno d'acqua riduce già la performance.",
  "Il range di movimento completo costruisce più muscolo dei mezzi movimenti col doppio del peso.",
  "Recuperi 2-3 min tra le serie pesanti aumentano forza e volume totale sollevato.",
  "La creatina monoidrato è l'integratore più studiato ed efficace: 3-5 g al giorno, sempre.",
  "Allenarsi a cedimento a ogni serie non serve: fermati a 1-3 ripetizioni dal limite.",
  "Il grasso non si trasforma in muscolo: sono tessuti diversi, si perde uno e si costruisce l'altro.",
  "La costanza batte l'intensità: 3 allenamenti a settimana per anni valgono più di 6 per un mese.",
  "Camminare 8-10 mila passi al giorno migliora il recupero e brucia più di quanto pensi.",
  "Il core lavora in quasi ogni esercizio in piedi: squat e stacco sono anche esercizi per l'addome.",
  "Dopo le 18 il corpo è mediamente più forte del 5-10% rispetto al mattino presto.",
  "La caffeina 30-60 minuti prima migliora forza e resistenza: 3-6 mg per kg di peso.",
  "Cambiare scheda ogni settimana impedisce la progressione: tieni gli stessi esercizi 6-10 settimane.",
  "Il pump post-allenamento è sangue nei muscoli, non crescita: sparisce in un paio d'ore.",
  "Le donne non diventano 'grosse' coi pesi: hanno 10-15 volte meno testosterone.",
  "Un chilo di muscolo consuma più calorie a riposo di un chilo di grasso: la massa è un investimento.",
  "L'ultimo pasto pre-workout ideale è 2-3 ore prima: carboidrati + proteine, pochi grassi.",
  "Il sovrallenamento vero è raro: quasi sempre è sotto-recupero (sonno, cibo, stress).",
  "Registrare i propri allenamenti aumenta i progressi: ciò che misuri, migliora.",
];

function BootScreen({ progress, fact }) {
  return (
    <div className="hud-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="fade-in" style={{ width: "min(420px, 86vw)", textAlign: "center" }}>
        <Dumbbell size={34} color="#57c8f2" style={{ margin: "0 auto 10px", filter: "drop-shadow(0 0 8px rgba(87,200,242,.6))" }} />
        <div className="f-hud t-cyan" style={{ fontSize: 24, fontWeight: 700, letterSpacing: ".35em" }}>GYMQUEST</div>
        <div className="micro" style={{ marginTop: 4, marginBottom: 26 }}>{tr("INIZIALIZZAZIONE SISTEMA")}</div>

        {/* barra segmentata stile scudo */}
        <div className="row g6" style={{ justifyContent: "center" }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="seg" style={{
              width: 22, flex: "none",
              background: progress * 14 > i ? "linear-gradient(180deg,#9be8ff,#3fa9d9)" : "#0e2233",
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

/* ================================ QUEST SYSTEM ================================ */
/* Sfide giornaliere e settimanali in stile Halo Reach: pool locale, rotazione
   automatica con seed sulla data, XP extra al completamento. */
const QUEST_METRICS = ["workouts", "sets", "volume", "cardio", "pr"];
const QUEST_POOL_DAILY = [
  { text: "Fuoco di Copertura: completa 1 allenamento oggi", metric: "workouts", target: 1, xp: 40 },
  { text: "Grilletto Facile: completa 15 serie oggi", metric: "sets", target: 15, xp: 45 },
  { text: "Colpo su Colpo: completa 20 serie oggi", metric: "sets", target: 20, xp: 60 },
  { text: "Ordigno Pesante: solleva 3.000 kg di volume oggi", metric: "volume", target: 3000, xp: 50 },
  { text: "Demolizione: solleva 5.000 kg di volume oggi", metric: "volume", target: 5000, xp: 70 },
  { text: "Supremazia: solleva 8.000 kg di volume oggi", metric: "volume", target: 8000, xp: 90 },
  { text: "Corridoio di Fuga: 10 minuti di cardio oggi", metric: "cardio", target: 10, xp: 40 },
  { text: "Marcia Forzata: 20 minuti di cardio oggi", metric: "cardio", target: 20, xp: 60 },
  { text: "Oltre il Limite: registra 1 nuovo record oggi", metric: "pr", target: 1, xp: 80 },
  { text: "Ricognizione Rapida: completa 10 serie oggi", metric: "sets", target: 10, xp: 30 },
  { text: "Assalto Frontale: completa 25 serie oggi", metric: "sets", target: 25, xp: 75 },
  { text: "Carico Bellico: solleva 1.500 kg di volume oggi", metric: "volume", target: 1500, xp: 30 },
  { text: "Sprint Finale: 15 minuti di cardio oggi", metric: "cardio", target: 15, xp: 50 },
  { text: "Doppio Turno: completa 2 allenamenti oggi", metric: "workouts", target: 2, xp: 100 },
];
const QUEST_POOL_WEEKLY = [
  { text: "Operazione Settimanale: completa 3 allenamenti", metric: "workouts", target: 3, xp: 120 },
  { text: "Campagna Estesa: completa 4 allenamenti", metric: "workouts", target: 4, xp: 160 },
  { text: "Guerra Totale: completa 5 allenamenti", metric: "workouts", target: 5, xp: 220 },
  { text: "Arsenale Completo: completa 60 serie", metric: "sets", target: 60, xp: 140 },
  { text: "Fuoco Sostenuto: completa 80 serie", metric: "sets", target: 80, xp: 180 },
  { text: "Tonnellata Spartana: solleva 15.000 kg di volume", metric: "volume", target: 15000, xp: 150 },
  { text: "Titano d'Acciaio: solleva 25.000 kg di volume", metric: "volume", target: 25000, xp: 220 },
  { text: "Maratona del Soldato: 60 minuti di cardio", metric: "cardio", target: 60, xp: 150 },
  { text: "Resistenza Estrema: 90 minuti di cardio", metric: "cardio", target: 90, xp: 200 },
  { text: "Cacciatore di Record: registra 2 nuovi PR", metric: "pr", target: 2, xp: 180 },
  { text: "LASO Settimanale: 4 allenamenti e 50 serie", metric: "sets", target: 50, xp: 160 },
];

/* selezione deterministica: stesso giorno/settimana = stesse quest per tutti */
const seededPick = (pool, seedStr, n) => {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
};
const dayKey = () => new Date().toISOString().slice(0, 10);
const weekKey = () => {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const wk = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${wk}`;
};
const freshQuests = (dailyPool, weeklyPool) => ({
  dayKey: dayKey(),
  weekKey: weekKey(),
  daily: seededPick(dailyPool, "d" + dayKey(), 3).map((q) => ({ ...q, prog: 0, done: false })),
  weekly: seededPick(weeklyPool, "w" + weekKey(), 3).map((q) => ({ ...q, prog: 0, done: false })),
});

/* ---------------- Achievements (fissi) ---------------- */
const ACHIEVEMENTS = [
  { id: "first", name: "Il Primo Passo", desc: "Completa il tuo primo allenamento", tier: "easy", check: (s) => s.workouts >= 1 },
  { id: "w10", name: "Recluta Promossa", desc: "Completa 10 allenamenti", tier: "easy", check: (s) => s.workouts >= 10 },
  { id: "w50", name: "Veterano del Ferro", desc: "Completa 50 allenamenti", tier: "hard", check: (s) => s.workouts >= 50 },
  { id: "w100", name: "Spartan-117", desc: "Completa 100 allenamenti", tier: "hard", check: (s) => s.workouts >= 100 },
  { id: "s100", name: "Grilletto Consumato", desc: "Completa 100 serie totali", tier: "easy", check: (s) => s.setsDone >= 100 },
  { id: "s1000", name: "Mitragliere", desc: "Completa 1.000 serie totali", tier: "hard", check: (s) => s.setsDone >= 1000 },
  { id: "v10k", name: "Diecimila", desc: "Solleva 10.000 kg di volume totale", tier: "easy", check: (s) => s.volume >= 10000 },
  { id: "v100k", name: "Centomila", desc: "Solleva 100.000 kg di volume totale", tier: "hard", check: (s) => s.volume >= 100000 },
  { id: "v500k", name: "Mjolnir", desc: "Solleva 500.000 kg di volume totale", tier: "hard", check: (s) => s.volume >= 500000 },
  { id: "c60", name: "Fiato da Marine", desc: "60 minuti di cardio totali", tier: "easy", check: (s) => s.cardioMin >= 60 },
  { id: "c600", name: "Maratoneta ODST", desc: "600 minuti di cardio totali", tier: "hard", check: (s) => s.cardioMin >= 600 },
  { id: "pr1", name: "Nuovo Massimale", desc: "Registra il tuo primo PR", tier: "easy", check: (s, prs) => Object.keys(prs || {}).length >= 1 },
  { id: "bench100", name: "Club dei 100", desc: "PR di 100 kg su Panca Piana Bilanciere", tier: "hard", check: (s, prs) => (prs?.["Panca Piana Bilanciere"] || 0) >= 100 },
  { id: "q10", name: "Cacciatore di Taglie", desc: "Completa 10 quest", tier: "easy", check: (s) => s.questsDone >= 10 },
  { id: "q50", name: "Leggenda delle Sfide", desc: "Completa 50 quest", tier: "hard", check: (s) => s.questsDone >= 50 },
  { id: "lv10", name: "Ufficiale di Grado", desc: "Raggiungi il livello 10", tier: "easy", check: (s, prs, lvl) => lvl >= 10 },
  { id: "lv25", name: "Hyper Lethal", desc: "Raggiungi il livello 25", tier: "hard", check: (s, prs, lvl) => lvl >= 25 },
];
const EMPTY_STATS = { workouts: 0, setsDone: 0, volume: 0, cardioMin: 0, questsDone: 0 };

/* ---------------- Barra di avanzamento quest ---------------- */
function QBar({ pct, done, animate }) {
  return (
    <div className="cham-s" style={{ height: 7, background: "#0e2233", overflow: "hidden" }}>
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

/* ---------------- Popup Quest + Achievements ---------------- */
function QuestModal({ quests, stats, prs, level, streak, onClose }) {
  const [tab, setTab] = useState("daily");
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
          {[["daily", "GIORNALIERE"], ["weekly", "SETTIMANALI"], ["ach", "MEDAGLIE"], ["troph", "TROFEI"]].map(([k, l]) => (
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
                <div key={i} className="cham-s" style={{ padding: "10px 12px", background: "#060f18", border: `1px solid ${q.done ? "#ffd76a" : "#0e2233"}` }}>
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
                return (
                  <div key={a.id} className="cham-s row g12" style={{
                    padding: "10px 12px", background: "#060f18", alignItems: "center",
                    border: `1px solid ${ok ? "#ffd76a" : "#0e2233"}`, opacity: ok ? 1 : 0.55,
                  }}>
                    <Medal size={20} color={ok ? "#ffd76a" : "#2a4a63"} style={{ flexShrink: 0 }} />
                    <div className="grow">
                      <div className={ok ? "t-amber" : "t-dim"} style={{ fontSize: 13, fontWeight: 700 }}>{tr(a.name)}</div>
                      <div className="tiny t-faint">{tr(a.desc)}</div>
                    </div>
                    <span className="micro cham-s" style={{
                      padding: "2px 7px", flexShrink: 0,
                      border: `1px solid ${a.tier === "hard" ? "#c05a8e" : "#2a5f7d"}`,
                      color: a.tier === "hard" ? "#e58ab5" : "#6fb3d4",
                    }}>{a.tier === "hard" ? "DIFFICILE" : "FACILE"}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "troph" && (() => {
          const got = unlockedTrophies(stats, prs, level).map((t) => t.id);
          return (
            <>
              <div className="micro t-faint" style={{ marginBottom: 10 }}>
                {got.length} / {TROPHIES.length} NELLA SALA TROFEI
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {TROPHIES.map((t) => {
                  const ok = got.includes(t.id);
                  const r = RARITY[t.rarity];
                  return (
                    <div key={t.id} className="tap cham-s"
                      onClick={() => ok && setSelTrophy(t)}
                      style={{
                        padding: "12px 6px", background: "#060f18", textAlign: "center",
                        border: `1px solid ${ok ? r.border : "#0e2233"}`,
                        cursor: ok ? "pointer" : "default", opacity: ok ? 1 : 0.6,
                      }}>
                      <Trophy size={26} color={ok ? r.color : "#1d3448"}
                        style={{ filter: ok ? `drop-shadow(0 0 6px ${r.color}66)` : "none" }} />
                      <div className={ok ? "t-bright" : "t-faint"}
                        style={{ fontSize: 10, fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>
                        {ok ? t.name : "???"}
                      </div>
                      <div className="micro" style={{ color: ok ? r.color : "#1d3448", marginTop: 3, fontSize: 8 }}>
                        {ok ? r.label : "BLOCCATO"}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="micro t-faint" style={{ marginTop: 10, textAlign: "center" }}>
                TOCCA UN TROFEO PER AMMIRARLO IN 3D
              </div>
            </>
          );
        })()}

        {/* -------- Visore 3D del trofeo -------- */}
        {selTrophy && (
          <div className="modal-back" onClick={() => setSelTrophy(null)} style={{ zIndex: 60 }}>
            <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
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

              <div className="cham-s" style={{ height: 300, marginTop: 12, background: "radial-gradient(ellipse at center, #0b1c2c 0%, #060f18 70%)", border: "1px solid #0e2233", overflow: "hidden" }}>
                <Trophy3D build={selTrophy.build} glow={RARITY[selTrophy.rarity].color} />
              </div>
              <div className="micro t-faint" style={{ textAlign: "center", marginTop: 6, letterSpacing: ".15em" }}>
                ⟲ TRASCINA PER RUOTARE
              </div>

              <div className="cham-s" style={{ marginTop: 10, padding: "12px 14px", background: "#060f18", border: "1px solid #0e2233" }}>
                <div className="f-hud t-amber" style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".2em", marginBottom: 6 }}>◈ ARCHIVIO DEI PRECURSORI</div>
                <div className="t-dim" style={{ fontSize: 12.5, lineHeight: 1.65, fontStyle: "italic" }}>{selTrophy.lore}</div>
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed #0e2233" }}>
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

/* ---------------- Schermata risultati post-allenamento (stile Halo Reach) ---------------- */
function ResultsScreen({ results, onClose }) {
  const [go, setGo] = useState(false);            // avvia le animazioni delle barre
  const [shownXp, setShownXp] = useState(results.xpBefore);
  const [shownLvl, setShownLvl] = useState(results.levelBefore);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGo(true), 350);
    /* barra XP: conteggio animato con rollover di livello, come il post-partita di Reach */
    let xp = results.xpBefore, lvl = results.levelBefore, gain = results.xpGain;
    const step = Math.max(2, Math.round(gain / 60));
    const iv = setInterval(() => {
      if (gain <= 0) { clearInterval(iv); return; }
      const add = Math.min(step, gain);
      xp += add; gain -= add;
      while (xp >= xpForLevel(lvl)) { xp -= xpForLevel(lvl); lvl++; setFlash(true); setTimeout(() => setFlash(false), 900); }
      setShownXp(xp); setShownLvl(lvl);
    }, 30);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);

  const need = xpForLevel(shownLvl);
  return (
    <Overlay>
    <div className="modal-back">
      <div className="modal-box cham fade-in">
        <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".25em", fontSize: 15, textAlign: "center" }}>{tr("◈ RAPPORTO MISSIONE")}</div>
        <div className="micro t-faint" style={{ textAlign: "center", marginBottom: 18 }}>{results.name}</div>

        {/* XP animato */}
        <div className="cham-s" style={{ padding: "12px 14px", background: "#04101b", border: `1px solid ${flash ? "#ffd76a" : "#1b3a52"}`, marginBottom: 16, transition: "border-color .3s" }}>
          <div className="row between" style={{ marginBottom: 6 }}>
            <span className={`f-hud ${flash ? "t-amber" : "t-cyan"}`} style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".15em" }}>
              {flash ? "▲ RANK UP!" : `LV.${shownLvl}`}
            </span>
            <span className="micro">{shownXp}/{need} XP <span className="t-amber">+{results.xpGain}</span></span>
          </div>
          <div className="row g6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="seg" style={{
                flex: 1,
                background: (shownXp / need) * 12 > i ? "linear-gradient(180deg,#9be8ff,#3fa9d9)" : "#0e2233",
                boxShadow: (shownXp / need) * 12 > i ? "0 0 6px rgba(87,200,242,.6)" : "none",
              }} />
            ))}
          </div>
        </div>

        {/* progresso quest animato */}
        <div className="hud-label" style={{ marginBottom: 8 }}>{tr("▸ Avanzamento sfide")}</div>
        <div className="stack-s" style={{ marginBottom: 16 }}>
          {results.quests.map((q, i) => (
            <div key={i} className="cham-s" style={{ padding: "10px 12px", background: "#060f18", border: `1px solid ${q.completedNow ? "#ffd76a" : "#0e2233"}` }}>
              <div className="row between g8">
                <span className={q.done ? "t-amber" : "t-bright"} style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.35 }}>
                  {q.completedNow && "◈ "}{tr(q.text)}
                </span>
                {q.completedNow && <span className="f-hud t-amber blink" style={{ fontSize: 11, fontWeight: 700, flexShrink: 0 }}>+{q.xp} XP</span>}
              </div>
              <div style={{ marginTop: 8 }}>
                <QBar pct={(go ? q.after : q.before) / q.target} done={q.done} animate />
              </div>
              <div className="micro t-faint" style={{ marginTop: 4, textAlign: "right" }}>
                {q.metric === "volume" ? `${(go ? q.after : q.before).toLocaleString()} / ${q.target.toLocaleString()} KG`
                  : `${go ? q.after : q.before} / ${q.target}${q.metric === "cardio" ? " MIN" : ""}`}
              </div>
            </div>
          ))}
          {results.quests.length === 0 && <div className="tiny t-faint">{tr("Nessuna sfida attiva oggi.")}</div>}
        </div>

        <Btn primary full onClick={onClose}>{tr("Continua ›")}</Btn>
      </div>
    </div>
    </Overlay>
  );
}

function StoreModal({ premium, isGuest, onClose, onUnlocked, onCredits, fireToast }) {
  const [code, setCode] = useState(null);        // codice emesso per acquisto senza account
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
      background: product === id ? "#0c2a3d" : "#060f18",
      border: `1px solid ${product === id ? (gold ? "#ffd76a" : "#57c8f2") : "#0e2233"}`,
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
          <div className="cham-s micro" style={{ margin: "12px 0", padding: "8px 10px", background: "#04101b", border: "1px solid #0e2233", lineHeight: 1.8 }}>
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
        {code && (
          <Panel accent style={{ borderColor: "#ffd76a", marginTop: 12 }}>
            <div className="f-hud t-amber" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 12 }}>{tr("PAGAMENTO RICEVUTO")}</div>
            <div className="tiny t-dim" style={{ marginTop: 6, lineHeight: 1.6 }}>
              {tr("Conserva questo codice: crea un account quando vuoi e riscattalo dal profilo per attivare l'acquisto.")}
            </div>
            <div className="f-hud t-bright cham-s" style={{ marginTop: 10, padding: "12px 10px", background: "#04101b",
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
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #0e2233" }}>
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
          PAGAMENTI SICURI PAYPAL · I CREDITI NON SCADONO · I LIMITI SETTIMANALI SI AZZERANO OGNI LUNEDÌ
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
  const GUEST_KEY = "gq_guest_v1";
  const isGuest = !!(user && user.guest);
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
      setUser({
        id: authUser.id,
        email: authUser.email,
        username: (authUser.user_metadata && authUser.user_metadata.username) || authUser.email.split("@")[0],
      });
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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) await hydrate(session.user);
      else if (localStorage.getItem(GUEST_KEY)) hydrateGuest(); // ospite già avviato: rientra diretto
      authDone.current = true; // splash: può chiudersi (utente ripristinato o assente)
    }).catch(() => { authDone.current = true; });
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

  /* trofei: avvisa quando se ne sblocca uno nuovo (derivati da stats/prs/livello, niente DB) */
  const trophyRef = useRef(null);
  useEffect(() => {
    if (!hydrated) return;
    const ids = unlockedTrophies(stats, prs, level).map((t) => t.id);
    if (trophyRef.current === null) { trophyRef.current = ids; return; }   // baseline al primo caricamento
    const fresh = TROPHIES.filter((t) => ids.includes(t.id) && !trophyRef.current.includes(t.id));
    trophyRef.current = ids;
    fresh.forEach((t, i) =>
      setTimeout(() => fireToast({ title: tr("◈ TROFEO SBLOCCATO"), sub: t.name, color: RARITY[t.rarity].color }), 900 * (i + 1)));
  }, [stats, prs, level, hydrated]);

  const need = xpForLevel(level);
  const rank = LEVEL_TITLES[Math.min(4, Math.floor(level / 6))];

  const navItems = [
    { id: "training", label: "Training", icon: Dumbbell },
    { id: "nutrition", label: "Nutrition", icon: Utensils },
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
      <div className="hud-root">
        <style>{CSS}</style>
        <HudToast toast={toast} />
        <AuthScreen fireToast={fireToast} onGuest={() => { window.__gqKeepGuest = true; window.__gqHydrateGuest && window.__gqHydrateGuest(); }} />
      </div>
    );
  }

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
      {questsOpen && <QuestModal quests={quests} stats={stats} prs={prs} level={level} streak={streak} onClose={() => setQuestsOpen(false)} />}
      {gateOpen && <StoreModal premium={premium} isGuest={isGuest} fireToast={fireToast} onClose={() => setGateOpen(false)}
        onUnlocked={(until) => setPremiumUntil(until)} />}

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
            {questFlash && (
              <div className="f-hud t-amber blink" style={{ fontSize: 9, letterSpacing: ".2em", marginTop: 3, textAlign: "center" }}>
                {questFlash}
              </div>
            )}
          </div>
          <div className="row g8" style={{ flexShrink: 0 }}>
            <button onClick={() => setTab("profile")} className="tap row g6"
              style={{ cursor: "pointer", color: isPremium ? "#ffd76a" : tab === "profile" ? "#9be8ff" : "#7fa8bf", position: "relative" }}>
              <span style={{ position: "relative", display: "inline-flex" }}>
                <User size={15} />
                {isPremium && <span className="f-hud" style={{
                  position: "absolute", top: -6, right: -7, fontSize: 8, fontWeight: 700,
                  color: "#ffd76a", textShadow: "0 0 6px rgba(255,215,106,.8)" }}>P</span>}
              </span>
              <span className="f-hud hide-sm" style={{ fontSize: 11, letterSpacing: ".1em" }}>{user.username}</span>
            </button>
            <button onClick={() => setQuestsOpen(true)} className="streak-pill cham-s tap" title={tr("Sfide e medaglie")}
              style={{ cursor: "pointer", borderColor: "#8a6d1f", boxShadow: "0 0 10px rgba(255,215,106,.2)" }}>
              <Medal size={14} color="#ffd76a" />
              <span className="f-hud t-amber hide-sm" style={{ fontWeight: 700, fontSize: 11, letterSpacing: ".15em" }}>{tr("SFIDE")}</span>
            </button>
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
          {tab === "training" && <Training onWorkoutDone={applyWorkoutToQuests} premium={premium} addXp={addXp} fireToast={fireToast} routines={routines} setRoutines={setRoutines} prs={prs} setPrs={setPrs} session={session} setSession={setSession} history={history} setHistory={setHistory} />}
          {tab === "nutrition" && (
            <NutritionTab premium={premium} body={body} nutri={nutri} setNutri={setNutri} fireToast={fireToast} goProfile={() => setTab("profile")} />
          )}
          {tab === "profile" && (
            <ProfileTab user={user} body={body} setBody={setBody}
              fireToast={fireToast} onLogout={async () => { await supabase.auth.signOut(); setTab("training"); }}
              onUserUpdate={setUser} level={level} rank={rank} streak={streak} premium={premium}
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
function Training({ onWorkoutDone, premium, addXp, fireToast, routines, setRoutines, prs, setPrs, session, setSession, history, setHistory }) {
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

  /* Inizia Allenamento: crea una sessione attiva e persistente (copia del modello) */
  const startSession = (r) => {
    setSession({
      routineId: r.id,
      name: r.name,
      startedAt: Date.now(),
      exercises: r.exercises.map((e) => ({
        ...e,
        sets: e.sets.map((s) => ({ ...s, done: false, elapsed: 0 })),
      })),
    });
    setView("session");
  };

  const abandonSession = () => {
    setSession(null); setConfirmAbandon(false);
    fireToast({ title: tr("◈ SESSIONE ABBANDONATA"), sub: tr("Nessun record salvato") });
  };

  if (view === "session" && session) {
    return <SessionView onWorkoutDone={onWorkoutDone} premium={premium} session={session} setSession={setSession} prs={prs} setPrs={setPrs}
      addXp={addXp} fireToast={fireToast}
      routines={routines} setRoutines={setRoutines} setHistory={setHistory}
      exitToHome={() => setView("home")} />;
  }
  if (view === "builder") {
    const initial = editId != null ? routines.find((r) => r.id === editId) : null;
    return <RoutineEditor premium={premium} fireToast={fireToast} initial={initial} onClose={() => { setView("home"); setEditId(null); }}
      onSave={(r) => saveRoutine(r, initial ? "◈ MODELLO AGGIORNATO" : "◈ SCHEDA SALVATA")} />;
  }
  if (view === "ai") return <AIWorkout premium={premium} onClose={() => setView("home")} onSave={(r) => saveRoutine(r, "◈ SCHEDA AI GENERATA")} />;
  /* nota: la conversione della scheda PT (import) resta gratuita per scelta */
  if (view === "import") return <DocImport premium={premium} onClose={() => setView("home")} onSave={(r) => saveRoutine(r, "◈ DOCUMENTO INTERPRETATO")} />;

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

        {routines.length === 0 && (
          <Panel>
            <div className="tiny t-faint" style={{ textAlign: "center", padding: "12px 0" }}>
              {tr("Nessuna scheda. Creane una, importala da un documento PT o usa il generatore AI.")}
            </div>
          </Panel>
        )}
        {routines.map((r) => (
          <Panel key={r.id} hover>
            <div>
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
            <div className="row between" style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #0e2233" }}>
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

        <button onClick={() => setView("import")} className="tap" style={{ width: "100%", cursor: "pointer" }}>
          <Panel accent hover>
            <div className="row g12">
              <Upload size={20} color="#9be8ff" />
              <div className="grow">
                <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 13 }}>{tr("IMPORTA SCHEDA PT")}</div>
                <div className="tiny t-dim">{tr("Carica un documento (PDF, foto, testo) — l'AI lo converte in allenamento")}</div>
              </div>
              <ChevronRight size={16} color="#3f637c" />
            </div>
          </Panel>
        </button>

        <button onClick={() => setView("ai")} className="tap" style={{ width: "100%", cursor: "pointer" }}>
          <Panel accent hover>
            <div className="row g12">
              <Bot size={20} color="#9be8ff" />
              <div className="grow">
                <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 13 }}>{tr("GENERA SCHEDA CON AI")}</div>
                <div className="tiny t-dim">{tr("Crea un allenamento su misura per obiettivo, giorni e attrezzatura")}</div>
              </div>
              <ChevronRight size={16} color="#3f637c" />
            </div>
          </Panel>
        </button>
      </div>

      {/* RIGHT: history + library + PR */}
      <div className="col stack">
        <Panel>
          <div className="hud-label" style={{ marginBottom: 8 }}>{tr("▸ Mission log — ultimi allenamenti")}</div>
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
                <ChevronRight size={13} color="#3f637c" />
              </div>
            </button>
          ))}
        </Panel>

        <ExerciseLibrary />

        <Panel>
          <div className="hud-label row g6" style={{ marginBottom: 8 }}>
            <Trophy size={13} color="#ffd76a" /> Personal records
          </div>
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
        </Panel>
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
            <div key={l} className="cham-s" style={{ padding: "10px 12px", background: "#04101b", border: "1px solid #0e2233" }}>
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
                  <div key={i} className="cham-s" style={{ padding: "10px 12px", background: "#060f18", border: "1px solid #0e2233" }}>
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
                          color: si === bi ? "#ffd76a" : s.done ? "#c9e8f7" : "#3f637c",
                          background: s.done ? "#0a2333" : "#050d15",
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

/* ---------------- Exercise Library ---------------- */
function ExerciseLibrary() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState("Petto");
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
    <Panel>
      {info && <ExerciseInfoModal name={info.name} group={info.group} ex={info} onClose={() => setInfo(null)} />}
      <div className="hud-label" style={{ marginBottom: 8 }}>{tr("▸ Libreria esercizi")}</div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={14} color="#3f637c" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
        <input className="hud-input cham-s" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={tr("Cerca esercizio...")} style={{ paddingLeft: 32 }} />
      </div>
      <div className="scroll-y stack-s">
        {Object.entries(filtered).map(([g, list]) => (
          <div key={g}>
            <button onClick={() => setOpen(open === g ? null : g)} className="tap cham-s row between"
              style={{ width: "100%", padding: "8px 10px", cursor: "pointer", border: "1px solid #0e2233", background: "#060f18" }}>
              <span className="f-hud t-cyan" style={{ fontSize: 11, letterSpacing: ".2em" }}>{tr(g).toUpperCase()}</span>
              <span className="tiny t-faint">{list.length} ▾</span>
            </button>
            {(open === g || q) && (
              <div className="fade-in" style={{ paddingLeft: 12, paddingTop: 4 }}>
                {list.map((e) => (
                  <div key={e} className="row between" style={{ fontSize: 14, padding: "5px 0", borderBottom: "1px solid #0a1826" }}>
                    <span>{tr(e)}</span>
                    <span onClick={() => setInfo({ name: e, group: g })} className="tap icon-tap" style={{ color: "#3f637c" }}>
                      <Info size={13} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------- Modale info esercizio (anteprima + esecuzione) ---------------- */
/* Le immagini/GIF si aggiungono in EXERCISE_MEDIA: { "Nome Esercizio": "https://..." } */
const EXERCISE_MEDIA = {
  "Ab Wheel": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Ab_Roller/0.jpg",
  "Affondi Bulgari": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One_Leg_Barbell_Squat/0.jpg",
  "Affondi Manubri": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunges/0.jpg",
  "Alzate Frontali": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Dumbbell_Raise/0.jpg",
  "Alzate Laterali": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg",
  "Alzate Laterali ai Cavi": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Seated_Lateral_Raise/0.jpg",
  "Alzate Posteriori": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Bent-Over_Rear_Delt_Raise/0.jpg",
  "Arnold Press": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Arnold_Dumbbell_Press/0.jpg",
  "Calf Raise Seduto": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Calf_Raise/0.jpg",
  "Calf Raise in Piedi": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Calf_Raises/0.jpg",
  "Camminata Veloce": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Walking_Treadmill/0.jpg",
  "Chest Press": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Machine_Bench_Press/0.jpg",
  "Corsa": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Running_Treadmill/0.jpg",
  "Croci Manubri": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Flyes/0.jpg",
  "Croci ai Cavi": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crossover/0.jpg",
  "Crunch": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunches/0.jpg",
  "Crunch ai Cavi": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crunch/0.jpg",
  "Curl Bilanciere": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/0.jpg",
  "Curl Concentrato": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Concentration_Curls/0.jpg",
  "Curl Manubri Alternato": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Alternate_Bicep_Curl/0.jpg",
  "Curl Panca Scott": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Preacher_Curl/0.jpg",
  "Curl ai Cavi": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Biceps_Cable_Curl/0.jpg",
  "Cyclette": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bicycling_Stationary/0.jpg",
  "Dip alle Parallele": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Chest_Version/0.jpg",
  "Dip tra Panche": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bench_Dips/0.jpg",
  "Ellittica": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Elliptical_Trainer/0.jpg",
  "Estensioni Sopra la Testa": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Dumbbell_Triceps_Extension/0.jpg",
  "Face Pull": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Face_Pull/0.jpg",
  "French Press": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Triceps_Press/0.jpg",
  "Front Squat": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Barbell_Squat/0.jpg",
  "Hack Squat": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hack_Squat/0.jpg",
  "Hammer Curl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hammer_Curls/0.jpg",
  "Hanging Leg Raise": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hanging_Leg_Raise/0.jpg",
  "Hip Thrust": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/0.jpg",
  "Hyperextension": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hyperextensions_Back_Extensions/0.jpg",
  "Kickback Manubrio": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Tricep_Dumbbell_Kickback/0.jpg",
  "Lat Machine Avanti": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg",
  "Lat Machine Presa Stretta": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Front_Lat_Pulldown/0.jpg",
  "Leg Curl Sdraiato": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Leg_Curls/0.jpg",
  "Leg Curl Seduto": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Leg_Curl/0.jpg",
  "Leg Extension": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Extensions/0.jpg",
  "Leg Press": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg",
  "Leg Raise": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Flat_Bench_Lying_Leg_Raise/0.jpg",
  "Military Press": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Military_Press/0.jpg",
  "Panca Declinata": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Barbell_Bench_Press/0.jpg",
  "Panca Inclinata Bilanciere": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg",
  "Panca Inclinata Manubri": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg",
  "Panca Piana Bilanciere": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg",
  "Panca Piana Manubri": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bench_Press/0.jpg",
  "Panca Presa Stretta": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Barbell_Bench_Press/0.jpg",
  "Pectoral Machine": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Butterfly/0.jpg",
  "Plank": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg",
  "Pull-Down Braccia Tese": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Straight-Arm_Pulldown/0.jpg",
  "Pulley Basso": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Cable_Rows/0.jpg",
  "Push-Up": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/0.jpg",
  "Pushdown Corda": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_Rope_Attachment/0.jpg",
  "Pushdown Tricipiti": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown/0.jpg",
  "Rematore Bilanciere": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg",
  "Rematore Manubrio": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Dumbbell_Row/0.jpg",
  "Rematore T-Bar": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/T-Bar_Row_with_Handle/0.jpg",
  "Russian Twist": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Russian_Twist/0.jpg",
  "Salto della Corda": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Rope_Jumping/0.jpg",
  "Shoulder Press Manubri": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shoulder_Press/0.jpg",
  "Shrug Bilanciere": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Shrug/0.jpg",
  "Side Plank": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Bridge/0.jpg",
  "Spider Curl": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Spider_Curl/0.jpg",
  "Squat Bilanciere": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg",
  "Stacco Rumeno": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg",
  "Stacco da Terra": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg",
  "Stepper": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Stairmaster/0.jpg",
  "Tapis Roulant": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Running_Treadmill/0.jpg",
  "Trazioni": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg",
  "Trazioni Presa Inversa": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Chin-Up/0.jpg",
  "Vogatore": "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Rowing_Stationary/0.jpg",
};
const Overlay = ({ children }) => createPortal(children, document.body);

const GROUP_ICONS = { Petto: "▣", Dorso: "◈", Gambe: "▼", Spalle: "▲", Bicipiti: "◐", Tricipiti: "◑", Cardio: "♥", Core: "◆", Altro: "◇" };

function ExerciseInfoModal({ name, group, ex, onClose }) {
  const media = (ex && ex.img) || EXERCISE_MEDIA[name];
  const desc = (ex && ex.desc) || EXERCISE_INFO[name] || INFO_FALLBACK[group] || INFO_FALLBACK.Altro;
  return (
    <Overlay>
    <div className="modal-back" onClick={onClose}>
      <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div>
            <div className="t-bright" style={{ fontSize: 17, fontWeight: 700 }}>{tr(name)}</div>
            <div className="micro t-cyan">{tr(group || "").toUpperCase()}</div>
          </div>
          <span onClick={onClose} className="tap t-faint" style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0" }}>✕</span>
        </div>
        <div className="cham-s" style={{
          height: 210, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center",
          background: "#04101b", border: "1px solid #0e2233", overflow: "hidden",
        }}>
          {media
            ? <img src={media} alt={name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", background: "#eef2f5" }} />
            : <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 44, color: "#1b3a52", lineHeight: 1 }}>{GROUP_ICONS[group] || "◇"}</div>
                <div className="micro" style={{ marginTop: 8 }}>{tr("ANTEPRIMA NON DISPONIBILE")}</div>
              </div>}
        </div>
        <div className="hud-label" style={{ marginBottom: 6 }}>{tr("▸ Esecuzione")}</div>
        <div className="t-dim" style={{ fontSize: 14, lineHeight: 1.7 }}>{tr(desc)}</div>
      </div>
    </div>
    </Overlay>
  );
}


/* chiamata AI via proxy serverless (la chiave resta sul server).
   feature "nutrition"/"scan" allegano il JWT: il server verifica il premium */
/* le funzioni AI richiedono un account: senza sessione si segnala subito */
const featHeaders = async (feature) => {
  const h = { "Content-Type": "application/json" };
  if (feature) {
    const { data: { session } } = await supabase.auth.getSession();
    h["Authorization"] = `Bearer ${session?.access_token || ""}`;
    h["x-gq-feature"] = feature;
  }
  return h;
};
const aiCall = async (payload, feature) => {
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
const resizeImage = (file, maxSide = 1024) => new Promise((resolve, reject) => {
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

/* ================================ MACHINE SCAN ================================ */
/* Mappa leggera macchinario -> esercizi (1 a N) sopra il database esistente:
   gli esercizi restano l'unità base (immagini, descrizioni, PR), i macchinari li indicizzano */
const MACHINE_DB = {
  "Panca Piana": ["Panca Piana Bilanciere", "Panca Piana Manubri", "Panca Presa Stretta", "Croci Manubri"],
  "Panca Inclinata": ["Panca Inclinata Bilanciere", "Panca Inclinata Manubri"],
  "Panca Declinata": ["Panca Declinata"],
  "Power Rack / Rastrelliera Squat": ["Squat Bilanciere", "Front Squat", "Military Press", "Stacco da Terra", "Rematore Bilanciere", "Shrug Bilanciere"],
  "Smith Machine (Multipower)": ["Squat Bilanciere", "Panca Piana Bilanciere", "Military Press", "Hip Thrust", "Calf Raise in Piedi"],
  "Lat Machine": ["Lat Machine Avanti", "Lat Machine Presa Stretta", "Pull-Down Braccia Tese"],
  "Pulley Basso": ["Pulley Basso"],
  "Stazione ai Cavi": ["Croci ai Cavi", "Curl ai Cavi", "Pushdown Tricipiti", "Pushdown Corda", "Face Pull", "Crunch ai Cavi", "Alzate Laterali ai Cavi", "Pull-Down Braccia Tese"],
  "Chest Press": ["Chest Press"],
  "Pectoral Machine": ["Pectoral Machine"],
  "Leg Press": ["Leg Press"],
  "Hack Squat Machine": ["Hack Squat"],
  "Leg Extension Machine": ["Leg Extension"],
  "Leg Curl Machine": ["Leg Curl Sdraiato", "Leg Curl Seduto"],
  "Calf Machine": ["Calf Raise in Piedi", "Calf Raise Seduto"],
  "Shoulder Press Machine": ["Shoulder Press Manubri", "Military Press"],
  "Panca Scott": ["Curl Panca Scott", "Spider Curl"],
  "Parallele / Dip Station": ["Dip alle Parallele"],
  "Sbarra Trazioni": ["Trazioni", "Trazioni Presa Inversa", "Hanging Leg Raise"],
  "Panca Hyperextension": ["Hyperextension"],
  "Rastrelliera Manubri": ["Panca Piana Manubri", "Croci Manubri", "Curl Manubri Alternato", "Hammer Curl", "Alzate Laterali", "Alzate Frontali", "Shoulder Press Manubri", "Affondi Manubri", "Rematore Manubrio", "Kickback Manubrio"],
  "T-Bar Row": ["Rematore T-Bar"],
  "Tapis Roulant": ["Tapis Roulant", "Corsa", "Camminata Veloce"],
  "Cyclette": ["Cyclette"],
  "Ellittica": ["Ellittica"],
  "Vogatore": ["Vogatore"],
  "Stepper / Stairmaster": ["Stepper"],
};
const findExGroup = (name) => {
  for (const [g, list] of Object.entries(EXERCISE_DB)) if (list.includes(name)) return g;
  return "Altro";
};

function MachineScan({ premium, variant, currentNames, onAdd, fireToast }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);   // { machine, exercises } | { unknown, guess } | { error }
  const [openEx, setOpenEx] = useState(null);
  const camRef = useRef(null);

  const analyze = async (f) => {
    if (premium && premium.guest) return premium.open();  // ospite: nessuna funzione AI
    setBusy(true); setRes(null); setOpenEx(null);
    try {
      const { b64, type } = await resizeImage(f, 1024);
      const content = [
        { type: "image", source: { type: "base64", media_type: type, data: b64 } },
        { type: "text", text: `Questa è la foto di un macchinario o attrezzo da palestra. Riconoscilo e scegli ESATTAMENTE uno di questi nomi: ${Object.keys(MACHINE_DB).join(" | ")}.
Rispondi SOLO con JSON valido senza markdown: {"machine": string (nome esatto dalla lista, oppure null se non riconoscibile), "guess": string (breve descrizione di cosa vedi, in italiano)}` },
      ];
      const data = await aiCall({ model: "claude-sonnet-5", max_tokens: 300, messages: [{ role: "user", content }] }, "scan");
      if (data.error === "limit_reached") { if (premium) premium.open(); throw new Error(tr("Limite settimanale scan raggiunto")); }
      if (data.error === "premium_required") { if (premium) premium.open(); throw new Error("Premium"); }
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : (data.error.message || "Errore API"));
      if (data.error) throw new Error(data.error === "premium_required" ? "Funzione riservata a Premium" : data.error);
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const parsed = parseLoose(text);
      if (parsed.machine && MACHINE_DB[parsed.machine]) {
        /* esercizi già nella scheda in cima e aperti; gli altri collassati sotto */
        const inWo = MACHINE_DB[parsed.machine].filter((e) => currentNames.includes(e));
        const rest = MACHINE_DB[parsed.machine].filter((e) => !currentNames.includes(e));
        setRes({ machine: parsed.machine, exercises: [...inWo, ...rest] });
        setOpenEx(inWo[0] || null);
      } else {
        setRes({ unknown: true, guess: parsed.guess || "" });
      }
    } catch (e) {
      setRes({ error: e.message || "Errore sconosciuto" });
    }
    setBusy(false);
  };

  const trigger = variant === "float" ? (
    <button onClick={() => camRef.current && camRef.current.click()} className="float-cam-btn cham-s tap" title={tr("Scansiona macchinario")}>
      {busy ? <Loader2 size={20} color="#ffd76a" className="spin" /> : <Camera size={20} color="#57c8f2" />}
    </button>
  ) : (
    <Btn small onClick={() => camRef.current && camRef.current.click()} style={{ flexShrink: 0 }}>
      {busy ? <Loader2 size={13} className="spin" style={{ display: "inline", verticalAlign: -2 }} /> : <Camera size={13} style={{ display: "inline", verticalAlign: -2 }} />} Scan macchinario
    </Btn>
  );

  return (
    <>
      <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) analyze(f); e.target.value = ""; }} />
      {variant === "float" ? <Overlay>{trigger}</Overlay> : trigger}

      {(res || busy) && (
        <Overlay>
        <div className="modal-back" onClick={() => !busy && setRes(null)}>
          <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}>
            {busy && (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <Loader2 size={26} color="#57c8f2" className="spin" style={{ margin: "0 auto 10px" }} />
                <div className="f-hud t-cyan" style={{ letterSpacing: ".2em", fontSize: 12 }}>{tr("ANALISI MACCHINARIO...")}</div>
              </div>
            )}
            {res && res.error && (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div className="tiny t-red">⚠ Analisi fallita: {typeof res.error === "string" ? res.error : "riprova con una foto più chiara"}</div>
                <Btn small onClick={() => setRes(null)} style={{ marginTop: 12 }}>{tr("Chiudi")}</Btn>
              </div>
            )}
            {res && res.unknown && (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div className="f-hud t-amber" style={{ letterSpacing: ".15em", fontSize: 13, fontWeight: 700 }}>{tr("MACCHINARIO NON RICONOSCIUTO")}</div>
                {res.guess && <div className="tiny t-dim" style={{ marginTop: 8, lineHeight: 1.6 }}>Sembra: {res.guess}</div>}
                <div className="tiny t-faint" style={{ marginTop: 6 }}>{tr("Prova a inquadrare il macchinario per intero, da davanti.")}</div>
                <Btn small onClick={() => setRes(null)} style={{ marginTop: 12 }}>{tr("Chiudi")}</Btn>
              </div>
            )}
            {res && res.machine && (
              <>
                <div className="row between" style={{ marginBottom: 2 }}>
                  <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".18em", fontSize: 13 }}>{tr("◈ MACCHINARIO")}</div>
                  <span onClick={() => setRes(null)} className="tap t-faint" style={{ cursor: "pointer", fontSize: 18, padding: "6px 10px", margin: "-6px -8px 0 0" }}>✕</span>
                </div>
                <div className="t-bright" style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>{tr(res.machine)}</div>
                <div className="tiny t-faint" style={{ marginBottom: 14 }}>{res.exercises.length} ESERCIZI POSSIBILI</div>

                <div className="stack-s">
                  {res.exercises.map((name) => {
                    const g = findExGroup(name);
                    const inWo = currentNames.includes(name);
                    const open = openEx === name;
                    return (
                      <div key={name} className="cham-s" style={{ border: `1px solid ${inWo ? "#57c8f2" : "#0e2233"}`, background: "#060f18" }}>
                        <button onClick={() => setOpenEx(open ? null : name)} className="tap row between"
                          style={{ width: "100%", padding: "10px 12px", cursor: "pointer" }}>
                          <span className="row g8">
                            <span className="t-bright" style={{ fontSize: 14, fontWeight: 700, textAlign: "left" }}>{tr(name)}</span>
                            {inWo && <span className="micro cham-s" style={{ padding: "2px 7px", border: "1px solid #57c8f2", color: "#57c8f2" }}>{tr("IN SCHEDA")}</span>}
                          </span>
                          <span className="row g8" style={{ alignItems: "center" }}>
                            <span className="micro t-cyan">{tr(g).toUpperCase()}</span>
                            <span className="t-faint">{open ? "▾" : "▸"}</span>
                          </span>
                        </button>
                        {open && (
                          <div className="fade-in" style={{ padding: "0 12px 12px" }}>
                            {EXERCISE_MEDIA[name] && (
                              <div className="cham-s" style={{ height: 150, marginBottom: 10, background: "#eef2f5", overflow: "hidden" }}>
                                <img src={EXERCISE_MEDIA[name]} alt={name} loading="lazy"
                                  style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                              </div>
                            )}
                            <div className="tiny t-dim" style={{ lineHeight: 1.65 }}>
                              {tr(EXERCISE_INFO[name] || INFO_FALLBACK[g] || INFO_FALLBACK.Altro)}
                            </div>
                            {!inWo && (
                              <Btn small primary full style={{ marginTop: 10 }}
                                onClick={() => { onAdd(name, g); fireToast({ title: tr("◈ ESERCIZIO AGGIUNTO"), sub: name }); setRes(null); }}>
                                {tr("＋ Aggiungi all'allenamento")}
                              </Btn>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
        </Overlay>
      )}
    </>
  );
}

/* ---------------- Timer interset in sovraimpressione ---------------- */
/* Nascosto di default: si apre dal pulsante flottante, si chiude a piacere */
function FloatingTimer() {
  const [open, setOpen] = useState(false);
  const [dur, setDur] = useState(90);
  const [left, setLeft] = useState(90);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (left <= 0) { setRunning(false); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const bump = (d) => { const n = Math.max(15, dur + d); setDur(n); setLeft(n); setRunning(false); };

  return (
    <Overlay>
      <button onClick={() => setOpen(!open)} className="float-timer-btn cham-s tap" title={tr("Timer di recupero")}>
        <Timer size={20} color={running && left > 0 ? "#ffd76a" : "#57c8f2"} className={running && left > 0 ? "blink" : ""} />
      </button>
      {open && (
        <div className="float-timer cham-s fade-in">
          <div className="row between" style={{ marginBottom: 8 }}>
            <span className="hud-label">{tr("RECUPERO")}</span>
            <span onClick={() => setOpen(false)} className="tap t-faint" style={{ cursor: "pointer", fontSize: 15, padding: 2 }}>✕</span>
          </div>
          <div className="row g12" style={{ alignItems: "center" }}>
            <span onClick={() => bump(-15)} className="tap tiny t-faint" style={{ cursor: "pointer" }}>−15</span>
            <span className={`f-hud ${left === 0 ? "t-amber" : "t-bright"}`} style={{ fontSize: 30, fontWeight: 700, minWidth: 88, textAlign: "center" }}>
              {left === 0 ? "GO!" : fmt(left)}
            </span>
            <span onClick={() => bump(30)} className="tap tiny t-faint" style={{ cursor: "pointer" }}>+30</span>
          </div>
          <div className="cham-s" style={{ height: 5, background: "#0e2233", margin: "8px 0" }}>
            <div style={{ height: "100%", width: `${(left / dur) * 100}%`, background: left === 0 ? "#ffd76a" : "#57c8f2", transition: "width 1s linear" }} />
          </div>
          <div className="row g8">
            {running
              ? <Btn small onClick={() => setRunning(false)} style={{ flex: 1 }}><Pause size={11} style={{ display: "inline", verticalAlign: -1 }} />{tr("Pausa")}</Btn>
              : <Btn small primary onClick={() => { if (left === 0) setLeft(dur); setRunning(true); }} style={{ flex: 1 }}><Play size={11} style={{ display: "inline", verticalAlign: -1 }} />{tr("Avvia")}</Btn>}
            <Btn small onClick={() => { setLeft(dur); setRunning(false); }} style={{ flex: 1 }}>{tr("↻ Reset")}</Btn>
          </div>
        </div>
      )}
    </Overlay>
  );
}

/* ---------------- Sessione di allenamento attiva ---------------- */
function SessionView({ onWorkoutDone, premium, session, setSession, prs, setPrs, addXp, fireToast, routines, setRoutines, setHistory, exitToHome }) {
  const [info, setInfo] = useState(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [sessionPrCount, setSessionPrCount] = useState(0);
  const [results, setResults] = useState(null); // rapporto missione animato
  const [runKey, setRunKey] = useState(null); // cronometro attivo per esercizi a tempo: "ei-si"

  /* Cronometro cardio: incrementa elapsed della riga attiva */
  useEffect(() => {
    if (!runKey) return;
    const t = setInterval(() => {
      const [ei, si] = runKey.split("-").map(Number);
      setSession((s) => ({
        ...s,
        exercises: s.exercises.map((e, i) => i !== ei ? e : {
          ...e, sets: e.sets.map((st, j) => j !== si ? st : { ...st, elapsed: (st.elapsed || 0) + 1 }),
        }),
      }));
    }, 1000);
    return () => clearInterval(t);
  }, [runKey]);

  const upd = (fn) => setSession((s) => fn(s));

  const updateSet = (ei, si, field, val) => upd((s) => ({
    ...s,
    exercises: s.exercises.map((e, i) => i !== ei ? e : {
      ...e, sets: e.sets.map((st, j) => j !== si ? st : { ...st, [field]: val === "" ? "" : Number(val) }),
    }),
  }));

  const updateNote = (ei, val) => upd((s) => ({
    ...s, exercises: s.exercises.map((e, i) => i !== ei ? e : { ...e, note: val }),
  }));

  const toggleSet = (ei, si) => {
    const ex = session.exercises[ei];
    const st = ex.sets[si];
    if (st.done && runKey === `${ei}-${si}`) setRunKey(null);
    upd((s) => ({
      ...s,
      exercises: s.exercises.map((e, i) => i !== ei ? e : {
        ...e, sets: e.sets.map((x, j) => j !== si ? x : { ...x, done: !x.done }),
      }),
    }));
    if (!st.done) {
      addXp(10);
      if (runKey === `${ei}-${si}`) setRunKey(null);
      if (ex.mode !== "time" && (st.w || 0) > (prs[ex.name] || 0)) {
        setPrs((p) => ({ ...p, [ex.name]: st.w }));
        setSessionPrCount((c) => c + 1);
        fireToast({ title: tr("▲ NEW RECORD"), sub: `${tr(ex.name)} — ${st.w} KG`, color: "#ffd76a" });
      }
    }
  };

  const addSet = (ei) => upd((s) => ({
    ...s,
    exercises: s.exercises.map((e, i) => i !== ei ? e : {
      ...e,
      sets: [...e.sets, e.mode === "time"
        ? { sec: 600, dist: "", elapsed: 0, done: false }
        : { ...e.sets[e.sets.length - 1], done: false }],
    }),
  }));

  const removeSet = (ei, si) => {
    if (runKey === `${ei}-${si}`) setRunKey(null);
    upd((s) => ({
      ...s,
      exercises: s.exercises.map((e, i) => i !== ei ? e : {
        ...e, sets: e.sets.filter((_, j) => j !== si),
      }).filter((e) => e.sets.length > 0),
    }));
  };

  const fmt = (sec) => `${Math.floor((sec || 0) / 60)}:${String((sec || 0) % 60).padStart(2, "0")}`;

  const volume = session.exercises.reduce((v, e) => e.mode === "time" ? v :
    v + e.sets.filter((s) => s.done).reduce((a, s) => a + (s.w || 0) * (s.r || 0), 0), 0);
  const cardioSec = session.exercises.reduce((v, e) => e.mode !== "time" ? v :
    v + e.sets.reduce((a, s) => a + (s.elapsed || 0), 0), 0);
  const totalSets = session.exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const durMin = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));

  /* Fine allenamento: record + eventuale aggiornamento del modello base */
  const complete = (alsoTemplate) => {
    if (alsoTemplate) {
      setRoutines((rs) => rs.map((r) => r.id !== session.routineId ? r : {
        ...r,
        name: session.name,
        exercises: session.exercises.map((e) => ({
          ...e, sets: e.sets.map((s) => ({ ...s, done: false, elapsed: 0 })),
        })),
      }));
    }
    setHistory((h) => [{
      date: new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }),
      name: session.name,
      sets: doneSets,
      duration: `${durMin}m`,
      volume,
      cardio: Math.round(cardioSec / 60),
      pr: sessionPrCount,
      exercises: session.exercises, // dettaglio completo per il report
    }, ...(h || [])].slice(0, 30));
    addXp(60);
    setRunKey(null);
    const bonusXp = 60; // i +10 a serie sono già stati accreditati in diretta
    const qr = onWorkoutDone ? onWorkoutDone({
      workouts: 1, sets: doneSets, volume, cardio: Math.round(cardioSec / 60), pr: sessionPrCount,
    }) : { quests: [], questXp: 0 };
    setFinishing(false);
    setResults({
      name: session.name,
      quests: qr.quests,
      xpGain: bonusXp + qr.questXp,
      xpBefore: window.__gqXpSnap ? window.__gqXpSnap.xp : 0,
      levelBefore: window.__gqXpSnap ? window.__gqXpSnap.level : 1,
    });
  };

  return (
    <div className="fade-in stack" style={{ maxWidth: 640, paddingBottom: 70 }}>
      {info && <ExerciseInfoModal name={info.name} group={info.group} ex={info} onClose={() => setInfo(null)} />}
      {results && <ResultsScreen results={results} onClose={() => { setSession(null); exitToHome(); }} />}
      <FloatingTimer />
      <MachineScan premium={premium} variant="float" fireToast={fireToast}
        currentNames={session.exercises.map((e) => e.name)}
        onAdd={(name, group) => upd((s) => ({
          ...s,
          exercises: [...s.exercises, group === "Cardio"
            ? { name, group, mode: "time", note: "", sets: [{ sec: 600, dist: "", elapsed: 0, done: false }] }
            : { name, group, note: "", sets: [{ w: 20, r: 10, done: false }, { w: 20, r: 10, done: false }, { w: 20, r: 10, done: false }] }],
        }))} />

      {/* Conferma uscita: la sessione resta attiva */}
      {confirmExit && (
        <Overlay>
        <div className="modal-back" onClick={() => setConfirmExit(false)}>
          <div className="modal-box cham fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="f-hud t-amber" style={{ fontWeight: 700, letterSpacing: ".15em", marginBottom: 8 }}>{tr("SESSIONE ANCORA ATTIVA")}</div>
            <div className="tiny t-dim" style={{ lineHeight: 1.6, marginBottom: 16 }}>
              Uscendo la sessione resta in corso: la ritrovi in Training e ci rientri anche
              se chiudi l'app. Per registrare l'allenamento usa "Termina".
            </div>
            <div className="row g8">
              <Btn onClick={() => setConfirmExit(false)} style={{ flex: 1 }}>{tr("Resta")}</Btn>
              <Btn primary onClick={() => { setConfirmExit(false); exitToHome(); }} style={{ flex: 1 }}>{tr("Esci ›")}</Btn>
            </div>
          </div>
        </div>
        </Overlay>
      )}

      {/* Riepilogo finale + salvataggio nel modello */}
      {finishing && (
        <Overlay>
        <div className="modal-back">
          <div className="modal-box cham fade-in">
            <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".2em", fontSize: 15, marginBottom: 4 }}>{tr("◈ MISSION COMPLETE")}</div>
            <div className="tiny t-faint" style={{ marginBottom: 14 }}>{session.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                ["DURATA", `${durMin} min`, "t-bright"],
                ["SERIE", `${doneSets}/${totalSets}`, "t-bright"],
                ["VOLUME", `${volume.toLocaleString()} kg`, "t-cyan"],
                ["CARDIO", `${Math.round(cardioSec / 60)} min`, "t-cyan"],
                ["XP", "+" + (60 + doneSets * 10), "t-amber"],
                ["RECORD", sessionPrCount > 0 ? `🏆 ${sessionPrCount}` : "—", "t-amber"],
              ].map(([l, v, c]) => (
                <div key={l} className="cham-s" style={{ padding: "10px 12px", background: "#04101b", border: "1px solid #0e2233" }}>
                  <div className="micro">{l}</div>
                  <div className={`f-hud ${c}`} style={{ fontWeight: 700, fontSize: 17 }}>{v}</div>
                </div>
              ))}
            </div>
            <div className="tiny t-dim" style={{ lineHeight: 1.6, marginBottom: 12 }}>
              Vuoi salvare le modifiche fatte in sessione (pesi, serie, nome, note) anche nel <span className="t-cyan">{tr("modello base")}</span> della scheda?
            </div>
            <div className="stack-s">
              <Btn primary full onClick={() => complete(true)}>{tr("Sì, aggiorna il modello ✓")}</Btn>
              <Btn full onClick={() => complete(false)}>{tr("No, salva solo il record")}</Btn>
              <button onClick={() => setFinishing(false)} className="tap micro t-faint" style={{ cursor: "pointer", padding: 6 }}>{tr("‹ torna alla sessione")}</button>
            </div>
          </div>
        </div>
        </Overlay>
      )}

      <div className="row between g8">
        <Btn small onClick={() => setConfirmExit(true)}>{tr("‹ Esci")}</Btn>
        <input className="hud-input cham-s f-hud" value={session.name}
          onChange={(e) => upd((s) => ({ ...s, name: e.target.value.toUpperCase() }))}
          style={{ textAlign: "center", fontWeight: 700, letterSpacing: ".12em", fontSize: 13, flex: 1 }} />
        <Btn small primary onClick={() => setFinishing(true)}>{tr("Termina ✓")}</Btn>
      </div>

      <Panel style={{ padding: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center" }}>
          <div>
            <div className="f-hud t-cyan" style={{ fontWeight: 700, fontSize: 16 }}>{volume.toLocaleString()}</div>
            <div className="micro">{tr("VOLUME KG")}</div>
          </div>
          <div>
            <div className="f-hud t-bright" style={{ fontWeight: 700, fontSize: 16 }}>{doneSets}<span className="t-faint">/{totalSets}</span></div>
            <div className="micro">{tr("SERIE")}</div>
          </div>
          <div>
            <div className="f-hud t-bright" style={{ fontWeight: 700, fontSize: 16 }}>{durMin}<span className="t-faint">m</span></div>
            <div className="micro">{tr("DURATA")}</div>
          </div>
        </div>
      </Panel>

      {session.exercises.map((ex, ei) => (
        <Panel key={ei}>
          <div className="row between g8" style={{ marginBottom: 4 }}>
            <div className="grow">
              <div className="row g6">
                <span className="t-bright" style={{ fontSize: 15, fontWeight: 700 }}>{tr(ex.name)}</span>
                <span onClick={() => setInfo(ex)} className="tap icon-tap" style={{ color: "#3f637c" }}><Info size={14} /></span>
              </div>
              <div className="micro">{tr(ex.group || "").toUpperCase()}{ex.mode !== "time" && ` · PR ${prs[ex.name] || "—"} KG`}</div>
            </div>
            {prs[ex.name] && ex.mode !== "time" && <Trophy size={15} color="#ffd76a" />}
          </div>
          <input className="hud-input cham-s" value={ex.note || ""} onChange={(e) => updateNote(ei, e.target.value)}
            placeholder={tr("Note esercizio...")} style={{ fontSize: 12, padding: "6px 8px", marginBottom: 10, color: "#8fb2c9" }} />

          {ex.mode === "time" ? (
            <>
              <div className="set-grid-t micro" style={{ marginBottom: 4, padding: "0 4px" }}>
                <span>{tr("SET")}</span><span>{tr("TEMPO")}</span><span>{tr("KM")}</span><span></span>
              </div>
              {ex.sets.map((s, si) => (
                <div key={si} className={`set-grid-t cham-s ${s.done ? "set-done" : ""}`} style={{ marginBottom: 6, padding: 4 }}>
                  <div className="col" style={{ alignItems: "center", gap: 5 }}>
                    <span className="f-hud t-faint" style={{ fontSize: 12 }}>{si + 1}</span>
                    <span onClick={() => removeSet(ei, si)} className="tap icon-tap" style={{ color: "#6e4038" }}><X size={13} /></span>
                  </div>
                  <div className="row g8" style={{ alignItems: "center" }}>
                    <button onClick={() => setRunKey(runKey === `${ei}-${si}` ? null : `${ei}-${si}`)}
                      className={`check-btn cham-s tap ${runKey === `${ei}-${si}` ? "check-on" : ""}`}
                      style={{ width: 34, height: 34 }} disabled={s.done}>
                      {runKey === `${ei}-${si}` ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                    <span className={`f-hud ${runKey === `${ei}-${si}` ? "t-amber" : "t-bright"}`} style={{ fontSize: 17, fontWeight: 700 }}>
                      {fmt(s.elapsed)}
                    </span>
                  </div>
                  <input className="hud-input cham-s" type="number" inputMode="decimal" value={s.dist}
                    placeholder="—" onChange={(e) => updateSet(ei, si, "dist", e.target.value)}
                    style={{ textAlign: "center", padding: "8px 4px" }} />
                  <button onClick={() => toggleSet(ei, si)} className={`check-btn cham-s tap ${s.done ? "check-on" : ""}`}>
                    <Check size={15} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="set-grid micro" style={{ marginBottom: 4, padding: "0 4px" }}>
                <span>{tr("SET")}</span><span>{tr("KG")}</span><span>{tr("REPS")}</span><span></span>
              </div>
              {ex.sets.map((s, si) => (
                <div key={si} className={`set-grid cham-s ${s.done ? "set-done" : ""}`} style={{ marginBottom: 6, padding: 4 }}>
                  <div className="col" style={{ alignItems: "center", gap: 5 }}>
                    <span className="f-hud t-faint" style={{ fontSize: 12 }}>{si + 1}</span>
                    <span onClick={() => removeSet(ei, si)} className="tap icon-tap" style={{ color: "#6e4038" }}><X size={13} /></span>
                  </div>
                  <input className="hud-input cham-s" type="number" inputMode="decimal" value={s.w}
                    onChange={(e) => updateSet(ei, si, "w", e.target.value)} style={{ textAlign: "center", padding: "8px 4px" }} />
                  <input className="hud-input cham-s" type="number" inputMode="numeric" value={s.r}
                    onChange={(e) => updateSet(ei, si, "r", e.target.value)} style={{ textAlign: "center", padding: "8px 4px" }} />
                  <button onClick={() => toggleSet(ei, si)} className={`check-btn cham-s tap ${s.done ? "check-on" : ""}`}>
                    <Check size={15} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </>
          )}
          <button onClick={() => addSet(ei)} className="dash-btn cham-s tap" style={{ marginTop: 4 }}>{tr("+ SERIE")}</button>
        </Panel>
      ))}
    </div>
  );
}

/* ---------------- Editor modello scheda (crea + modifica, senza timer né log) ---------------- */
function RoutineEditor({ premium, fireToast, initial, onClose, onSave }) {
  const [draft, setDraft] = useState(() => initial
    ? JSON.parse(JSON.stringify(initial))
    : { id: Date.now(), name: "", exercises: [] });
  const [q, setQ] = useState("");
  const [info, setInfo] = useState(null);

  const upd = (fn) => setDraft((d) => fn(d));
  const hasEx = (name) => draft.exercises.some((e) => e.name === name);

  const toggleEx = (name, group) => upd((d) => hasEx(name)
    ? { ...d, exercises: d.exercises.filter((e) => e.name !== name) }
    : {
      ...d,
      exercises: [...d.exercises, group === "Cardio"
        ? { name, group, mode: "time", note: "", sets: [{ sec: 600, dist: "", elapsed: 0, done: false }] }
        : { name, group, note: "", sets: [{ w: 20, r: 10, done: false }, { w: 20, r: 10, done: false }, { w: 20, r: 10, done: false }] }],
    });

  const updateSet = (ei, si, field, val) => upd((d) => ({
    ...d,
    exercises: d.exercises.map((e, i) => i !== ei ? e : {
      ...e, sets: e.sets.map((s, j) => j !== si ? s : { ...s, [field]: val === "" ? "" : Number(val) }),
    }),
  }));

  const removeSet = (ei, si) => upd((d) => ({
    ...d,
    exercises: d.exercises.map((e, i) => i !== ei ? e : { ...e, sets: e.sets.filter((_, j) => j !== si) })
      .filter((e) => e.sets.length > 0),
  }));

  const addSet = (ei) => upd((d) => ({
    ...d,
    exercises: d.exercises.map((e, i) => i !== ei ? e : {
      ...e,
      sets: [...e.sets, e.mode === "time" ? { sec: 600, dist: "", elapsed: 0, done: false } : { ...e.sets[e.sets.length - 1], done: false }],
    }),
  }));

  return (
    <div className="fade-in stack" style={{ maxWidth: 640, paddingBottom: 70 }}>
      {info && <ExerciseInfoModal name={info.name} group={info.group} ex={info} onClose={() => setInfo(null)} />}
      <div className="row between">
        <Btn small onClick={onClose}>{tr("‹ Annulla")}</Btn>
        <span className="hud-title">{initial ? "Modifica modello" : "Nuova scheda"}</span>
        <Btn small primary disabled={!draft.name || !draft.exercises.length}
          onClick={() => onSave({ ...draft, name: draft.name.toUpperCase() })}>{tr("Salva")}</Btn>
      </div>
      <input className="hud-input cham-s" value={draft.name}
        onChange={(e) => upd((d) => ({ ...d, name: e.target.value }))} placeholder={tr("Nome scheda (es. LEG DAY)")} />

      {/* Esercizi nel modello: serie modificabili ed eliminabili, note sotto il titolo */}
      {draft.exercises.map((ex, ei) => (
        <Panel key={tr(ex.name)} accent style={{ padding: 12 }}>
          <div className="row between g8" style={{ marginBottom: 4 }}>
            <div className="row g6">
              <span className="t-bright" style={{ fontSize: 14, fontWeight: 700 }}>{tr(ex.name)}</span>
              <span className="micro t-cyan" style={{ alignSelf: "center" }}>{tr(ex.group || "").toUpperCase()}</span>
              <span onClick={() => setInfo(ex)} className="tap icon-tap" style={{ color: "#3f637c" }}><Info size={13} /></span>
            </div>
            <span onClick={() => toggleEx(ex.name, ex.group)} className="tap" style={{ cursor: "pointer", color: "#6e3028" }}><Trash2 size={14} /></span>
          </div>
          <input className="hud-input cham-s" value={ex.note || ""}
            onChange={(e) => upd((d) => ({ ...d, exercises: d.exercises.map((x, i) => i !== ei ? x : { ...x, note: e.target.value }) }))}
            placeholder={tr("Note esercizio...")} style={{ fontSize: 12, padding: "6px 8px", marginBottom: 8, color: "#8fb2c9" }} />
          {ex.sets.map((s, si) => (
            <div key={si} className="row g8" style={{ marginBottom: 5, alignItems: "center" }}>
              <span className="f-hud t-faint" style={{ fontSize: 11, width: 18, textAlign: "center" }}>{si + 1}</span>
              {ex.mode === "time" ? (
                <>
                  <input className="hud-input cham-s" type="number" inputMode="numeric" value={s.sec ? Math.round(s.sec / 60) : ""}
                    onChange={(e) => updateSet(ei, si, "sec", e.target.value === "" ? "" : Number(e.target.value) * 60)}
                    style={{ textAlign: "center", padding: "7px 4px", width: 70 }} />
                  <span className="micro">{tr("MIN")}</span>
                  <input className="hud-input cham-s" type="number" inputMode="decimal" value={s.dist}
                    onChange={(e) => updateSet(ei, si, "dist", e.target.value)} placeholder="—"
                    style={{ textAlign: "center", padding: "7px 4px", width: 70 }} />
                  <span className="micro">{tr("KM")}</span>
                </>
              ) : (
                <>
                  <input className="hud-input cham-s" type="number" inputMode="decimal" value={s.w}
                    onChange={(e) => updateSet(ei, si, "w", e.target.value)}
                    style={{ textAlign: "center", padding: "7px 4px", width: 70 }} />
                  <span className="micro">{tr("KG")}</span>
                  <input className="hud-input cham-s" type="number" inputMode="numeric" value={s.r}
                    onChange={(e) => updateSet(ei, si, "r", e.target.value)}
                    style={{ textAlign: "center", padding: "7px 4px", width: 70 }} />
                  <span className="micro">{tr("REPS")}</span>
                </>
              )}
              <span onClick={() => removeSet(ei, si)} className="tap icon-tap" style={{ color: "#523030", marginLeft: "auto" }}><X size={13} /></span>
            </div>
          ))}
          <button onClick={() => addSet(ei)} className="dash-btn cham-s tap" style={{ marginTop: 2 }}>{tr("+ SERIE")}</button>
        </Panel>
      ))}

      <input className="hud-input cham-s" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Filtra esercizi...")} />
      <MachineScan premium={premium} variant="float" fireToast={fireToast}
        currentNames={draft.exercises.map((e) => e.name)}
        onAdd={(name, group) => toggleEx(name, group)} />
      {Object.entries(EXERCISE_DB).map(([group, list]) => {
        const shown = list.filter((e) => e.toLowerCase().includes(q.toLowerCase()));
        if (!shown.length) return null;
        return (
          <Panel key={group} style={{ padding: 12 }}>
            <div className="f-hud t-cyan" style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".25em", marginBottom: 8 }}>{tr(group).toUpperCase()}</div>
            <div className="row wrap g6">
              {shown.map((ex) => (
                <button key={ex} onClick={() => toggleEx(ex, group)}
                  className={`tap cham-s chip ${hasEx(ex) ? "chip-on" : ""}`}
                  style={{ cursor: "pointer", fontSize: 12, letterSpacing: ".02em", padding: "6px 12px", fontFamily: "'Rajdhani',sans-serif", textTransform: "none" }}>
                  {ex}
                </button>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

/* ---------------- PT Document Import (AI) ---------------- */
function DocImport({ premium, onClose, onSave }) {
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
Se un esercizio indica "3x10 60kg" genera 3 set identici. Se il documento contiene più giorni, unisci nel nome il giorno 1 e includi solo gli esercizi del giorno 1.`,
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
                border: `1px dashed ${drag ? "#57c8f2" : "#2f6786"}`,
                background: drag ? "#0c2a3d" : "transparent", transition: "background .15s,border-color .15s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {file ? (
                <>
                  <FileText size={24} color="#9be8ff" />
                  <span className="t-bright" style={{ fontSize: 14, fontWeight: 700 }}>{file.name}</span>
                  <span className="micro">{tr("TOCCA PER SOSTITUIRE")}</span>
                </>
              ) : (
                <>
                  <Upload size={24} color="#57c8f2" />
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
                <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #0a1826" }}>
                  <div className="row between g8">
                    <div className="grow">
                      <span className="t-bright" style={{ fontSize: 14, fontWeight: 700 }}>{tr(e.name)}</span>
                      <span className="micro" style={{ marginLeft: 8 }}>{tr(e.group).toUpperCase()}</span>
                      {e.isCustom && <span className="micro cham-s" style={{ marginLeft: 8, padding: "2px 7px", border: "1px solid #ffd76a", color: "#ffd76a" }}>{tr("NUOVO")}</span>}
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

/* ---------------- AI Workout Generator ---------------- */
function AIWorkout({ premium, onClose, onSave }) {
  const [goal, setGoal] = useState("Massa");
  const [days, setDays] = useState(3);
  const [equip, setEquip] = useState("Palestra completa");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [error, setError] = useState(null);

  /* La generazione passa dal server per applicare il limite settimanale;
     se la chiamata fallisce si usa comunque il generatore locale. */
  const generate = async () => {
    if (premium && premium.guest) return premium.open();  // ospite: nessuna funzione AI
    setLoading(true); setError(null);
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
            <input type="range" min="2" max="4" value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </div>
          <div><div className="hud-label" style={{ marginBottom: 6 }}>{tr("Attrezzatura")}</div>
            <Opt options={["Palestra completa", "Manubri", "Corpo libero"]} value={equip} set={setEquip} /></div>
          {error && <div className="tiny t-red">⚠ {error}</div>}
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
    <Icon size={15} color="#3f637c" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
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
            GYM<span className="t-faint">//</span>QUEST
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
                  <Lock size={15} color="#3f637c" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
                  <input type={showPw ? "text" : "password"} placeholder={tr("Password")} value={pw}
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
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #0e2233" }}>
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
function ProfileTab({ user, body, setBody, fireToast, onLogout, onUserUpdate, level, rank, streak, premium, onRedoSetup }) {
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
            <div className="cham-s" style={{ width: 52, height: 52, background: "#0c2a3d", border: "1px solid #57c8f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={24} color="#9be8ff" />
            </div>
            <div>
              <div className="f-hud t-bright" style={{ fontWeight: 700, fontSize: 16, letterSpacing: ".1em" }}>{user.username}</div>
              <div className="micro">LV.{level} {rank} · STREAK {streak} GIORNI</div>
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
          <div className="row g8 wrap">
            <Btn small onClick={onRedoSetup}>{tr("◈ Rifai setup profilo")}</Btn>
            <Btn small onClick={onLogout}><LogOut size={12} style={{ display: "inline", verticalAlign: -2 }} />{tr("Esci")}</Btn>
          </div>
        </Panel>

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
                <div className="cham-s" style={{ height: 6, background: "#0e2233", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${lim ? Math.min(100, (used / lim) * 100) : 0}%`,
                    background: used >= lim && lim > 0 ? "linear-gradient(90deg,#ffd76a,#ffb84d)" : "linear-gradient(90deg,#3fa9d9,#9be8ff)" }} />
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
            <Ruler size={13} color="#9be8ff" /> Dati corporei
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

          <div className="row between cham-s" style={{ marginTop: 16, padding: "10px 14px", background: "#060f18", border: "1px solid #0e2233" }}>
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
/* I modelli possono troncare il JSON se lo spazio finisce: qui si recupera
   la parte valida chiudendo le parentesi rimaste aperte. */
const repairJSON = (raw) => {
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
const parseLoose = (text) => {
  const clean = (text || "").replace(/```json|```/g, "");
  const m = clean.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return JSON.parse(repairJSON(clean));
};

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
  "Fonti proteiche": "#57c8f2",
  "Fonti carboidrati": "#ffd76a",
  "Grassi e fibre": "#7ee0a8",
  "Snack / Post-workout": "#9be8ff",
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

function SourcePlanView({ plan, targets, body, picks, setPicks, onImport, onRegen, loading }) {
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
            <div key={i} className="row g12" style={{ padding: "8px 0", borderBottom: "1px solid #0a1826", alignItems: "flex-start" }}>
              <div className="f-hud t-cyan" style={{ fontSize: 12, fontWeight: 700, width: 106, flexShrink: 0,
                borderLeft: `2px solid ${w.fasting ? "#3f637c" : "#ffd76a"}`, paddingLeft: 8 }}>{w.time}</div>
              <div className="grow">
                <div className={w.fasting ? "t-faint" : "t-bright"} style={{ fontSize: 14, fontWeight: 700 }}>{w.label}</div>
                {w.note && <div className="tiny t-faint">{w.note}</div>}
              </div>
            </div>
          ))}
        </Panel>
      )}

      <div className="two-col">
        {cats.map((c) => {
          const color = CAT_COLORS[c.name] || "#57c8f2";
          const extra = GENERIC_EXTRA[c.name] || [];
          const base = c.items || [];
          const all = [...base, ...extra];
          return (
            <Panel key={c.name} style={{ borderLeft: `3px solid ${color}` }}>
              <div className="row between" style={{ marginBottom: 8 }}>
                <span className="f-hud" style={{ color, fontSize: 12, fontWeight: 700, letterSpacing: ".15em" }}>
                  {c.name.toUpperCase()}
                </span>
                <span className="micro t-faint">{single(c) ? tr("(SCEGLI 1)") : tr("(SCELTA MULTIPLA)")}</span>
              </div>

              {all.map((it, i) => {
                const on = sel[c.name].includes(i);
                return (
                  <button key={i} onClick={() => toggle(c, i)} className="tap cham-s"
                    style={{ width: "100%", textAlign: "left", cursor: "pointer", padding: "9px 10px", marginBottom: 5,
                      border: `1px solid ${on ? color : "#0e2233"}`, background: on ? "#0c2233" : "#060f18" }}>
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
                <div className="cham-s stack-s" style={{ padding: 10, background: "#04101b", border: "1px solid #1b3a52" }}>
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
            {[["Proteine", tot.p, targets.p, "#57c8f2"], ["Carboidrati", tot.c, targets.c, "#9be8ff"], ["Grassi", tot.f, targets.f, "#ffd76a"]].map(([l, cur, goal, col]) => (
              <div key={l}>
                <div className="row between tiny" style={{ marginBottom: 3 }}>
                  <span className="t-dim">{tr(l)}</span>
                  <span className={cur > goal * 1.05 ? "t-amber" : "t-bright"}>{Math.round(cur)} / {goal} g</span>
                </div>
                <div className="cham-s" style={{ height: 6, background: "#0e2233", overflow: "hidden" }}>
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
Compila "meals" con una proposta di pasto già composto per ciascun pasto della finestra (scegliendo una combinazione valida delle fonti). Se il documento elenca solo pasti fissi, lascia "sourcePlan" a null.
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
                border: `1px dashed ${drag ? "#57c8f2" : "#2f6786"}`,
                background: drag ? "#0c2a3d" : "transparent", transition: "background .15s,border-color .15s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Utensils size={26} color="#57c8f2" />
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
  const [stale, setStale] = useState(false);        // target modificati ma pasti non ancora rigenerati
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
VARIETÀ: per OGNI pasto genera 3 OPZIONI alternative diverse tra loro (ingredienti diversi) ma equivalenti nei macro, così da poter ruotare i pasti nei vari giorni.
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
    setStale(false);
    setLoading(false);
    fireToast({ title: tr("◈ PIANO GENERATO"), sub: `${targets.kcal} kcal · P${targets.p} C${targets.c} G${targets.f}` });
  };

  const startEdit = () => { setDraft({ ...nutri.targets }); setEditing(true); };
  const saveEdit = () => {
    const t = {
      kcal: Number(draft.kcal) || nutri.targets.kcal,
      p: Number(draft.p) || 0, c: Number(draft.c) || 0, f: Number(draft.f) || 0,
    };
    setNutri({ ...nutri, targets: t });
    setStale(true);   // i pasti non riflettono più i nuovi target
    setEditing(false);
    fireToast({ title: tr("◈ TARGET AGGIORNATI"), sub: `${t.kcal} kcal` });
  };

  if (importing) return (
    <NutriImport premium={premium} body={body}
      onClose={() => setImporting(false)}
      onSave={(r) => {
        setNutri({ goal, days, targets: r.targets, meals: r.meals, prefs, imported: true, sourcePlan: r.sourcePlan || null });
        if (r.sourcePlan) setSubTab("compose");
        setStale(false); setImporting(false);
        fireToast({ title: tr("◈ PIANO IMPORTATO"), sub: `${r.targets.kcal} kcal` });
      }} />
  );

  /* la modalità "componi" non richiede un piano: è indipendente */
  if (subTab === "compose") return (
    <div className="fade-in stack">
      <NutriSubTabs value={subTab} onChange={setSubTab} />
      <SourcePlanView
        plan={(nutri && nutri.sourcePlan) || DEFAULT_SOURCE_PLAN}
        targets={nutri ? nutri.targets : null}
        body={body}
        picks={plate && !Array.isArray(plate) ? plate : {}}
        setPicks={savePlate}
        loading={loading}
        onImport={() => setImporting(true)}
        onRegen={() => generate(!!nutri)} />
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
            <Upload size={20} color="#9be8ff" />
            <div className="grow">
              <div className="f-hud t-cyan" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 13 }}>{tr("IMPORTA PIANO NUTRIZIONALE")}</div>
              <div className="tiny t-dim">{tr("Carica il piano del tuo nutrizionista (PDF, foto, testo) — l'AI lo converte")}</div>
            </div>
            <ChevronRight size={16} color="#3f637c" />
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

        {stale && (
          <Panel accent style={{ borderColor: "#ffd76a" }}>
            <div className="f-hud t-amber" style={{ fontWeight: 700, letterSpacing: ".15em", fontSize: 12 }}>{tr("TARGET MODIFICATI")}</div>
            <div className="tiny t-dim" style={{ marginTop: 6, lineHeight: 1.6 }}>
              {tr("I pasti mostrati sono ancora quelli dei target precedenti. Rigenerali per allinearli ai nuovi valori.")}
            </div>
            <Btn small primary style={{ marginTop: 10 }} disabled={loading} onClick={() => generate(true)}>
              {loading ? tr("Rigenerazione...") : tr("↻ Rigenera pasti sui nuovi target")}
            </Btn>
          </Panel>
        )}

        <Panel>
          <div className="hud-label" style={{ marginBottom: 6 }}>{tr("Preferenze alimentari")}</div>
          <textarea className="hud-input cham-s" value={prefs} onChange={(e) => setPrefs(e.target.value)} rows={2}
            placeholder={tr("Es. vegetariano, niente lattosio, digiuno intermittente 16:8 con 2 pasti, allergia alle noci...")}
            style={{ resize: "none", fontSize: 13 }} />
          <div className="micro t-faint" style={{ marginTop: 6 }}>{tr("VERRANNO APPLICATE ALLA PROSSIMA RIGENERAZIONE")}</div>
        </Panel>

        <Btn full onClick={() => generate(true)} disabled={loading}>
          {loading ? tr("Rigenerazione...") : tr("↻ Rigenera pasti (stessi target)")}
        </Btn>
        <Btn full onClick={() => setImporting(true)}>{tr("⤓ Importa un altro piano")}</Btn>
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
        {sortMeals(Object.entries(nutri.meals), nutri.sourcePlan && nutri.sourcePlan.window).map(([meal, raw]) => {
          const opts = asOptions(raw);
          const idx = dayIndex() % Math.max(1, opts.length);
          const foods = opts[idx] || [];
          return (
            <button key={meal} onClick={() => setEditMeal(meal)} className="tap" style={{ width: "100%", cursor: "pointer", textAlign: "left" }}>
              <Panel hover>
                <div className="row between" style={{ marginBottom: 6 }}>
                  <div className="hud-label">▸ {meal}</div>
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
    if (step === 2) {
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
      lang,
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
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="seg" style={{ width: 40, flex: "none",
                background: step >= s ? "linear-gradient(180deg,#9be8ff,#3fa9d9)" : "#0e2233",
                boxShadow: step >= s ? "0 0 6px rgba(87,200,242,.6)" : "none" }} />
            ))}
          </div>
          <div className="micro" style={{ marginTop: 6 }}>{tr("PASSO")} {step} {tr("DI")} 4</div>
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
                      border: "1px solid " + (lang === o.id ? "#57c8f2" : "#1b3a52"),
                      background: lang === o.id ? "#0c2a3d" : "#060f18" }}>
                    <div className={lang === o.id ? "t-cyan" : "t-bright"} style={{ fontSize: 15, fontWeight: 700 }}>{o.flag} {o.label}</div>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
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

          {step === 3 && (
            <>
              <div className="hud-title" style={{ fontSize: 12 }}>{tr("Stile di vita")}</div>
              <div>
                <div className="hud-label" style={{ marginBottom: 6, fontSize: 9 }}>{tr("Attività quotidiana (fuori palestra)")}</div>
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

          {step === 4 && (
            <>
              <div className="hud-title" style={{ fontSize: 12 }}>{tr("Obiettivo")}</div>
              <Chips k="obiettivo" options={["Massa", "Mantenimento", "Definizione"]} />
              <div className="cham-s stack-s" style={{ padding: "12px 14px", background: "#060f18", border: "1px solid #0e2233" }}>
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
            {step < 4
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
      background: "#0c2a3d", border: "1px solid #57c8f2", padding: "10px 14px",
      boxShadow: "0 4px 24px rgba(0,0,0,.6), 0 0 12px rgba(87,200,242,.25)",
    }}>
      <div className="row between g12">
        <div className="grow">
          <div className="f-hud t-cyan" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".12em" }}>{tr("◈ INSTALLA GYMQUEST")}</div>
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
