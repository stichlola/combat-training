# GymQuest — Documentazione tecnica

## Struttura del progetto

```
gymquest/
├── api/                  # Funzioni serverless (Vercel)
│   ├── ai.js             # Proxy verso Anthropic + gating premium/limiti
│   ├── paypal.js         # Creazione e cattura ordini PayPal
│   ├── usage.js          # Stato d'uso (limiti, crediti) per il client
│   └── _premium.js       # Helper condivisi: identità utente, premium, crediti
├── public/               # manifest.json, service worker, icone PWA
├── src/
│   ├── App.jsx           # Applicazione completa
│   └── lib/supabase.js   # Client Supabase
├── supabase/schema.sql   # Schema database + RLS
├── .env.example
├── vite.config.js
└── package.json
```

## Setup completo

### 1. Repository
```bash
cd gymquest
git init
git add .
git commit -m "Initial commit"
# Crea la repo su github.com (pulsante "New repository", NON aggiungere README/gitignore)
git remote add origin https://github.com/TUOUSER/TUAREPO.git
git branch -M main
git push -u origin main
```

### 2. Supabase
1. Crea un progetto su supabase.com
2. SQL Editor → esegui tutto il contenuto di `supabase/schema.sql`
3. Project Settings → API → copia **Project URL**, **anon public key** e **service_role key**

### 3. Variabili d'ambiente
Copia `.env.example` in `.env` e compila per lo sviluppo locale:
```bash
cp .env.example .env
```

Su **Vercel** (Settings → Environment Variables), aggiungi tutte queste (Production and Preview):

| Variabile | Fonte |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → anon public key |
| `SUPABASE_URL` | Stesso valore di `VITE_SUPABASE_URL`, senza prefisso |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → service_role key (⚠️ mai nel frontend) |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `VITE_PAYPAL_CLIENT_ID` | developer.paypal.com → Apps & Credentials |
| `PAYPAL_CLIENT_ID` | Stesso Client ID di sopra |
| `PAYPAL_SECRET` | developer.paypal.com → Secret dell'app |
| `PAYPAL_ENV` | `sandbox` per i test, poi `live` |

### 4. Sviluppo locale
```bash
npm install
npm run dev
# → http://localhost:5173
```

### 5. Deploy
Importa la repo su Vercel, aggiungi le variabili d'ambiente sopra, Deploy. Dopo il primo deploy, aggiorna su Supabase (Authentication → Settings) il **Site URL** e le **Redirect URLs** con l'URL Vercel.

## Come funziona il salvataggio dati

Ogni modifica (allenamenti, dati corporei, piano nutrizionale, XP, quest, premium, crediti) viene salvata su Supabase con un debounce di 800ms. Al login, tutti i dati vengono ricaricati (`hydrate`) e popolano lo stato dell'app.

## Modalità ospite e acquisto senza account

L'app è utilizzabile **senza registrazione**: dalla schermata di accesso, "Continua senza account" avvia la modalità ospite, che salva tutto in `localStorage` sul dispositivo. In quella modalità sono disponibili allenamenti, schede, quest, medaglie, timer e composizione pasti manuale; le funzioni AI richiedono un account (il server le rifiuta senza JWT valido).

L'**acquisto può avvenire prima della registrazione**: se la cattura PayPal arriva senza JWT, il server emette un **codice di riscatto** (tabella `redeem_codes`, accessibile solo dal serverless) che l'utente conserva e riscatta dallo store dopo aver creato l'account (`api/redeem.js`). Questo elimina l'attrito dell'iscrizione obbligatoria prima del pagamento.

## Sicurezza

- La chiave `ANTHROPIC_API_KEY` resta sempre lato server (`api/ai.js`), mai esposta al frontend
- Lo stato **premium** e i **crediti** vivono in tabelle Supabase in sola lettura per il client (RLS senza policy di scrittura): solo il serverless, con la `service_role` key, può modificarli
- I pagamenti PayPal vengono **creati e catturati dal server**: prezzo e prodotto sono verificati dalla risposta di PayPal, mai dichiarati dal client
- Le funzioni AI a pagamento (nutrizione, scan, import oltre il limite) sono bloccate **anche lato server**, non solo nell'interfaccia

## Limiti settimanali e crediti

| Funzione | Gratuito | Premium |
|---|---|---|
| Import scheda PT (Haiku) | 3/settimana | 20/settimana |
| Piano nutrizionale (Haiku) | — | 25/settimana |
| Scan macchinari (Sonnet) | — | 40/settimana |

I limiti si azzerano ogni settimana. Oltre il limite si consumano i **crediti extra** (1 credito = 1 generazione), acquistabili una tantum: 30 crediti a 3€, 100 a 8€.

## Problemi comuni

- **Pagina bianca dopo un deploy**: controlla la console del browser (F12) per errori JS; verifica che tutte le variabili d'ambiente siano impostate e che sia stato fatto un Redeploy dopo averle aggiunte/modificate
- **Login/registrazione non funziona**: verifica Site URL e Redirect URLs su Supabase
- **Errore PayPal "modifica i tuoi dati di accesso"**: assicurati che `PAYPAL_ENV`, i Client ID (frontend e server) e il Secret appartengano tutti allo stesso ambiente (sandbox o live); in sandbox usa un account "buyer" di test, non il tuo account reale

## Prossimi sviluppi suggeriti

- Grafici progressi (volume settimanale, peso corporeo nel tempo)
- Condivisione schede tra PT e atleti
- Notifiche push per promemoria allenamento
