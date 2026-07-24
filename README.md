# GYM//QUEST — Training HUD

App fitness gamificata in stile HUD Halo CE: schede di allenamento, workout log con rest timer e PR, import schede PT via AI, piano nutrizionale AI, profilo con dati corporei. PWA installabile.

**Stack:** React + Vite · Supabase (auth + database) · Vercel (hosting + serverless AI proxy) · API Anthropic (Claude)

---

## Struttura del progetto

```
gymquest/
├── api/ai.js              # Serverless function Vercel: proxy sicuro verso Anthropic
├── public/                # Asset PWA (manifest, service worker, icone)
├── src/
│   ├── App.jsx            # Tutta l'app (UI + logica)
│   ├── main.jsx           # Entry point + registrazione service worker
│   └── lib/supabase.js    # Client Supabase
├── supabase/schema.sql    # Schema database da eseguire su Supabase
├── .env.example           # Template variabili d'ambiente
└── index.html
```

---

## SETUP COMPLETO — passo per passo

### 1️⃣ GitHub — carica il progetto sulla tua repo

```bash
# Dentro la cartella gymquest/
git init
git add .
git commit -m "GymQuest v1"

# Crea la repo su github.com (pulsante "New repository", NON aggiungere README/gitignore)
# poi collegala (sostituisci TUOUSER e TUAREPO):
git remote add origin https://github.com/TUOUSER/TUAREPO.git
git branch -M main
git push -u origin main
```

> Se hai già una repo esistente, copia i file dentro e fai commit + push.

---

### 2️⃣ Supabase — database e autenticazione

1. Vai su [supabase.com](https://supabase.com) → **New project**
   - Nome: `gymquest` · scegli una password per il DB · regione: `Central EU (Frankfurt)` (la più vicina all'Italia)
2. Aspetta ~2 minuti che il progetto sia pronto
3. **Crea le tabelle:** menu laterale → **SQL Editor** → **New query** → incolla tutto il contenuto di `supabase/schema.sql` → **Run**
   - Crea la tabella `user_data` con Row Level Security: ogni utente può leggere/scrivere solo i propri dati
4. **Configura l'autenticazione:** menu → **Authentication** → **Providers** → verifica che **Email** sia attivo
   - In **Authentication → Settings**:
     - `Site URL`: per ora `http://localhost:5173`, dopo il deploy la cambierai con l'URL Vercel (es. `https://gymquest.vercel.app`)
     - **Consiglio per testare subito:** disattiva "Confirm email" così la registrazione è immediata; riattivala in produzione
5. **Recupera le chiavi:** menu → **Project Settings** → **API**
   - Copia `Project URL` → sarà `VITE_SUPABASE_URL`
   - Copia `anon public` key → sarà `VITE_SUPABASE_ANON_KEY`

> Il **reset password** ("Password dimenticata") funziona out-of-the-box: Supabase invia l'email con il link. Il link riporta alla `Site URL`, quindi ricordati di aggiornarla dopo il deploy.

---

### 3️⃣ Anthropic — chiave API per le funzioni AI

Le funzioni "Importa scheda PT" e "Genera piano nutrizionale" usano Claude.

1. Vai su [console.anthropic.com](https://console.anthropic.com) → **API Keys** → **Create Key**
2. Copia la chiave (`sk-ant-...`) → sarà `ANTHROPIC_API_KEY`

> La chiave viene usata **solo** dalla serverless function `api/ai.js` lato server: non è mai visibile nel browser.

---

### 4️⃣ Test in locale (opzionale ma consigliato)

```bash
npm install

# Crea il file .env copiando il template e inserendo le tue chiavi
cp .env.example .env
# ...apri .env e compila i 3 valori

npm run dev
# → http://localhost:5173
```

⚠️ In locale `npm run dev` NON esegue le serverless functions: le feature AI daranno errore (c'è comunque un piano di fallback per la nutrizione). Per testare anche l'AI in locale:

```bash
npm i -g vercel
vercel dev   # esegue frontend + /api/ai insieme
```

---

### 5️⃣ Vercel — deploy collegato alla repo

1. Vai su [vercel.com](https://vercel.com) → login **con GitHub**
2. **Add New → Project** → seleziona la tua repo `gymquest` → **Import**
3. Vercel riconosce Vite da solo (Framework Preset: `Vite`, Build: `vite build`, Output: `dist`) — non toccare nulla
4. **Environment Variables** (prima di premere Deploy) — aggiungi tutte e 3:

   | Nome | Valore |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://tuoprogetto.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | la chiave `anon public` |
   | `ANTHROPIC_API_KEY` | `sk-ant-...` |

5. **Deploy** → in ~1 minuto hai l'URL pubblico (es. `https://gymquest.vercel.app`)
6. **Torna su Supabase** → Authentication → Settings → aggiorna `Site URL` con l'URL Vercel e aggiungilo anche in `Redirect URLs`

Da ora in poi **ogni `git push` su `main` fa il deploy automatico**. I push su altri branch creano preview deploy con URL separati.

---

### 6️⃣ PWA — installazione su telefono

Il progetto è già una PWA (manifest + service worker + icone in `public/`, registrazione in `main.jsx`). Funziona solo su HTTPS, quindi **dopo il deploy Vercel**:

- **Android (Chrome):** apri l'URL → menu ⋮ → **"Aggiungi a schermata Home"** / banner "Installa app"
- **iPhone (Safari):** apri l'URL → pulsante Condividi → **"Aggiungi a Home"**

L'app si apre a schermo intero senza barra del browser, con icona HUD, e il service worker mantiene la cache per l'uso offline (i dati si sincronizzano quando torna la connessione — le scritture su Supabase richiedono rete).

Per verificare: Chrome DevTools → **Lighthouse** → categoria PWA.

---

## Come funziona il salvataggio dati

- Al login l'app carica la riga `user_data` dell'utente da Supabase (schede, PR, dati corporei, piano nutrizionale, XP/livello)
- Ogni modifica viene salvata automaticamente con un debounce di ~1 secondo (`upsert`)
- La Row Level Security garantisce che nessun utente possa accedere ai dati altrui, anche conoscendo la chiave `anon`

## Sicurezza

- ✅ Password gestite da Supabase Auth (hash bcrypt, mai in chiaro)
- ✅ Chiave Anthropic solo server-side nella serverless function
- ✅ RLS attiva su tutte le tabelle
- ⚠️ Non committare mai il file `.env` (già nel `.gitignore`)

## Problemi comuni

| Problema | Soluzione |
|---|---|
| "Mancano VITE_SUPABASE_URL..." in console | Variabili non impostate su Vercel → aggiungile e fai **Redeploy** |
| Registrazione ok ma login fallisce | "Confirm email" attivo su Supabase: conferma dall'email o disattivalo |
| Link reset password porta a localhost | Aggiorna `Site URL` e `Redirect URLs` su Supabase con l'URL Vercel |
| Le funzioni AI danno errore | `ANTHROPIC_API_KEY` mancante su Vercel, o stai usando `npm run dev` invece di `vercel dev` |
| Modifiche non salvate tra dispositivi | Controlla la console: se ci sono errori RLS, riesegui `schema.sql` |

## Prossimi sviluppi suggeriti

- Diario pasti giornaliero con spunta dei pasti del piano
- Grafici progressi (volume settimanale, peso corporeo nel tempo)
- Streak reale calcolata dalle date dei workout completati
- Condivisione schede tra PT e atleti (tabella `shared_routines`)
