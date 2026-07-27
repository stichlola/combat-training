# Combat Training

App di fitness gamificata: gestisci allenamenti e nutrizione con un sistema di progressione a punti esperienza, livelli e sfide giornaliere/settimanali, in un'interfaccia ispirata all'estetica tattico-militare della saga Halo.

## Cosa fa

- **Allenamenti**: crea schede di allenamento (manualmente, importando un documento del tuo personal trainer, o scattando una foto a un macchinario in palestra), tieni traccia di serie, ripetizioni e carichi, registra i tuoi record personali
- **Nutrizione**: genera un piano alimentare giornaliero calcolato sui tuoi dati corporei e obiettivi
- **Gamification**: guadagni esperienza (XP) completando allenamenti, sali di livello, mantieni una streak di giorni consecutivi, e completi sfide giornaliere e settimanali con ricompense extra
- **Achievement**: medaglie permanenti da sbloccare nel tempo
- **Account e sincronizzazione**: i tuoi dati (schede, storico, progressi) sono salvati sul tuo account e disponibili da qualsiasi dispositivo
- **Installabile**: funziona come app sul telefono (aggiungibile alla schermata home), senza passare dagli store

## Piani

L'app è gratuita nelle funzionalità principali. Un abbonamento annuale sblocca la generazione del piano nutrizionale con IA e il riconoscimento dei macchinari da foto; sono inoltre disponibili pacchetti di crediti aggiuntivi per chi supera i limiti d'uso gratuiti.

## Stack tecnico

React + Vite, Supabase (autenticazione e database), integrazione IA (Anthropic Claude), pagamenti via PayPal, hosting su Vercel.

---

## Licenza

Software proprietario — © 2026 Davide Candotto / Code & Craft Solutions. Tutti i diritti riservati. Vedi il file `LICENSE` per i termini completi. Nessuna parte di questo codice può essere copiata, distribuita o riutilizzata senza autorizzazione scritta.

---

## Per sviluppatori: setup e deploy

La documentazione tecnica completa (struttura del progetto, setup Supabase/PayPal/Vercel, variabili d'ambiente, sicurezza, limiti d'uso) è mantenuta separatamente in `DEVELOPMENT.md`.
