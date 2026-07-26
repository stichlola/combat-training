/* ============================================================
   CATALOGO TROFEI — Il viaggio di Damastir
   Ogni trofeo è un capitolo della storia: dall'arrivo nel mondo
   distopico al siero, dall'underground al tradimento, dal deserto
   allo spazio. Vedi LORE.md per l'arco completo.
   rarity: comune | raro | epico | leggendario
   check(stats, prs, level): true = sbloccato (derivato, niente DB)
   ============================================================ */
export const TROPHIES = [
  {
    id: "recruit",
    name: "Medaglia del Fuoritempo",
    rarity: "comune",
    how: "Si ottiene all'iscrizione: il primo passo nel programma.",
    lore: "Damastir non appartiene a quest'era. Viene da un tempo di fatica vera, di mani nella terra e sguardi negli occhi — catapultato in un mondo dove tutti camminano a testa china, prigionieri di impegni che non hanno scelto, senza vedere chi gli passa accanto. Questa medaglia, con il sigillo di GYMQUEST inciso nell'oro antico, è ciò che i Fuoritempo si scambiano per riconoscersi nella folla. Portarla significa una cosa sola: tu ci vedi ancora.",
    check: () => true,
    model: "recruit",
  },
  {
    id: "scouter",
    name: "Scouter del Ricognitore",
    rarity: "comune",
    how: "Si ottiene all'iscrizione, insieme alla medaglia. Sblocca lo Scouter nella sezione GAME.",
    lore: "Ogni cercatore di taglie che si rispetti, in qualunque galassia, porta uno scouter all'orecchio: inquadra un soggetto e la lente verde ne legge la potenza, la resistenza, la velocità. Questo esemplare arriva dal mercato dei relitti dell'oasi — un gadget di quelli che i viandanti spaziali si passano di mano in mano, rattoppato e perfettamente funzionante. Damastir lo accese la prima volta per curiosità. Quello che lesse sul display di chi gli stava intorno cambiò per sempre il suo modo di guardare le persone. Ora tocca a te: attivalo nella sezione GAME.",
    check: () => true,
    model: "scouter",
  },
  {
    id: "firstw",
    name: "Battesimo del Ferro",
    rarity: "comune",
    how: "Completa il tuo primo allenamento.",
    lore: "Nel mondo distopico nessuno si allena più: i corpi sono involucri da trasportare da uno schermo all'altro. Quando Damastir sollevò il suo primo manubrio, la gente lo fissò come si fissa una reliquia in movimento. Ma per lui era un rito della sua era — il ferro, il respiro, il dolore onesto. Questo manubrio di bronzo segna il tuo battesimo: il giorno in cui hai smesso di essere spettatore e hai ripreso possesso del tuo corpo.",
    check: (s) => s.workouts >= 1,
    model: "firstw",
  },
  {
    id: "orb5",
    name: "Siero Cristallizzato",
    rarity: "raro",
    how: "Raggiungi il livello 5.",
    lore: "Nessuno sa chi iniettò il siero a Damastir, né perché. Quel che resta è questa sfera: la stessa sostanza, cristallizzata, attraversata da venature verdi che pulsano come un secondo battito. È il primo frammento fisico di ciò che gli scorre dentro — la scintilla da cui nasce Umbra Damastir. Toccarla dà le vertigini. I Saggi del deserto dicono che il siero non cambia chi sei: rivela ciò che hai sempre nascosto.",
    check: (s, prs, lvl) => lvl >= 5,
    model: "orb5",
  },
  {
    id: "crystal10",
    name: "Cristallo Umbra",
    rarity: "raro",
    how: "Raggiungi il livello 10.",
    lore: "L'ira di Umbra Damastir non si dissolve: si condensa. Ogni contratto portato a termine per l'underground, ogni notte passata a trattenere la trasformazione, lascia un residuo — e i residui, col tempo, diventano cristallo. Questo esemplare, cresciuto su una base di roccia dei bassifondi, è la prova che il potere si può accumulare senza esserne divorati. Dieci livelli di disciplina, solidificati in luce verde.",
    check: (s, prs, lvl) => lvl >= 10,
    model: "crystal10",
  },
  {
    id: "w50",
    name: "Kettlebell del Cercatore",
    rarity: "raro",
    how: "Completa 50 allenamenti.",
    lore: "Cinquanta contratti. Cinquanta taglie riscosse tra i vicoli della città bassa, dove Arrol Black decide chi vale e chi no. I cercatori di taglie dell'underground non hanno palestre: hanno attrezzi sbiaditi che passano di mano in mano, di missione in missione. Questo kettlebell ha un sigillo incandescente sul guscio — il marchio che si accende solo dopo cinquanta prove. Il ferro, a differenza delle persone, non tradisce mai.",
    check: (s) => s.workouts >= 50,
    model: "w50",
  },
  {
    id: "idol15",
    name: "Effige della Spalla Vuota",
    rarity: "epico",
    how: "Raggiungi il livello 15.",
    lore: "Per anni Joseph visse sulla spalla di Damastir: il suo gatto, il suo condottiero, il suo unico legame con il mondo perduto. Poi scelse Vaaladriel, e la spalla restò vuota. Questo idolo, scavato dai viandanti in una pietra che non riflette la luce, ha un solo occhio azzurro che non si spegne mai. Non è un trofeo di vittoria: è un monumento a ciò che si perde crescendo. Il livello quindici si raggiunge solo imparando ad allenarsi da soli.",
    check: (s, prs, lvl) => lvl >= 15,
    model: "idol15",
  },
  {
    id: "bench100",
    name: "Piatto dei Cento",
    rarity: "epico",
    how: "PR di 100 kg su Panca Piana Bilanciere.",
    lore: "Cento chilogrammi. Nell'underground gira una voce: quando Umbra Damastir perse il controllo per la prima volta, sollevò un relitto da cento chili come fosse carta. Da allora quel numero è la soglia che separa la forza comune da quella che fa paura. Questo disco d'oro massiccio certifica che la paura, oggi, sei tu. Il bilanciere non conosce il tradimento, l'ira o il destino: conosce solo chi lo solleva.",
    check: (s, prs) => (prs?.["Panca Piana Bilanciere"] || 0) >= 100,
    model: "bench100",
  },
  {
    id: "odst600",
    name: "Elmo del Viandante",
    rarity: "epico",
    how: "Accumula 600 minuti di cardio totali.",
    lore: "Nel deserto dell'esilio, Damastir camminò fino allo sfinimento, a un sorso d'acqua dalla fine. Fu un viandante a trovarlo — uno di quelli che vivono nel disordine, fuori dall'ordinario, e che nel deserto ci vedono meglio che in città. Questo elmo apparteneva a uno di loro: seicento minuti di marcia sono nulla, diceva, rispetto alla distanza tra chi sei e chi vuoi diventare. La visiera è ancora carica. Il viandante non è mai tornato a riprenderselo.",
    check: (s) => s.cardioMin >= 600,
    model: "odst600",
  },
  {
    id: "pillar20",
    name: "Sigillo dell'Oasi",
    rarity: "epico",
    how: "Raggiungi il livello 20.",
    lore: "Da qualche parte nel deserto esiste un posto sicuro: un'oasi di relitti e vele strappate dove gli erranti si raccolgono, e dove nessuno chiede il tuo nome prima di offrirti acqua. Al centro svetta una colonna antica con un sigillo ambrato che brilla da prima della distopia. Fu lì che Damastir smise di fuggire e iniziò a prepararsi. Al livello venti anche tu hai trovato la tua oasi: il luogo — e la disciplina — da cui ripartire.",
    check: (s, prs, lvl) => lvl >= 20,
    model: "pillar20",
  },
  {
    id: "q50",
    name: "Stella dei Cento Mondi",
    rarity: "epico",
    how: "Completa 50 quest.",
    lore: "Lasciato il deserto, Damastir divenne ciò che non avrebbe mai osato sognare: un esploratore spaziale. Innumerevoli pianeti, creature aliene, mostri oltre ogni mappa. I cercatori di taglie del cosmo portano una stella d'oro con un tizzone ambrato che non si spegne nemmeno nel vuoto — una fiamma per ogni contratto onorato. Cinquanta missioni completate: la tua stella, ormai, brilla da sola.",
    check: (s) => s.questsDone >= 50,
    model: "q50",
  },
  {
    id: "mjolnir",
    name: "Flagello dei Flood",
    rarity: "leggendario",
    how: "Solleva 500.000 kg di volume totale.",
    lore: "Nello spazio profondo i Flood — gli zombie del cosmo — non temono le armi: si diffondono, si ricompongono, tornano. L'unica cosa che li spezza davvero è la forza bruta applicata con precisione infinita. Questo martello da guerra, con i condensatori azzurri ancora saturi di energia, ha frantumato orde intere nelle missioni per il capo del deserto. Mezzo milione di chili sollevati: non è un numero, è un avvertimento a tutto ciò che striscia nel buio.",
    check: (s) => s.volume >= 500000,
    model: "mjolnir",
  },
  {
    id: "crown25",
    name: "Corona di Umbra Damastir",
    rarity: "leggendario",
    how: "Raggiungi il livello 25.",
    lore: "Damastir inseguì a lungo il loop temporale, sperando di tornare a casa, indietro nel tempo, prima di tutto. Poi capì: il ragazzo primordiale non esiste più, e nemmeno il mostro. Esiste qualcuno che li contiene entrambi. Questa corona, con la gemma magenta condensata da venticinque livelli di battaglie interiori e stellari, non celebra la purezza: celebra l'integrazione. Chi la indossa ha smesso di combattere il proprio lato oscuro — e ha iniziato a comandarlo.",
    check: (s, prs, lvl) => lvl >= 25,
    model: "crown25",
  },
];

export const RARITY = {
  comune: { label: "COMUNE", color: "#6fb3d4", border: "#2a5f7d" },
  raro: { label: "RARO", color: "#57c8f2", border: "#1f6f9e" },
  epico: { label: "EPICO", color: "#c99df0", border: "#7a4fae" },
  leggendario: { label: "LEGGENDARIO", color: "#ffd76a", border: "#b8860b" },
};

export const unlockedTrophies = (stats, prs, level) =>
  TROPHIES.filter((t) => { try { return t.check(stats, prs, level); } catch { return false; } });
