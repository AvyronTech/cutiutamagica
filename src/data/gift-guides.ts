export type GiftGuideGroup = "Ocazii" | "Pentru cine" | "Pasiuni";

export interface GiftGuide {
  readonly slug: string;
  readonly label: string;
  readonly group: GiftGuideGroup;
  readonly productIds: readonly string[];
  readonly eyebrow: string;
  readonly title: string;
  readonly seoTitle?: string;
  readonly description: string;
  readonly intro: string;
  readonly sections: readonly { readonly title: string; readonly text: string }[];
  readonly decisionGuide?: {
    readonly title: string;
    readonly checkpoints: readonly {
      readonly label: string;
      readonly guidance: string;
    }[];
    readonly avoid: string;
    readonly messagePrompts: readonly string[];
  };
  readonly question: string;
  readonly answer: string;
}

export const giftGuides = [
  {
    slug: "halloween",
    group: "Ocazii",
    productIds: ["halloween", "hp-keeper", "got-winter"],
    label: "Halloween",
    eyebrow: "Toamnă · mister · colecții",
    title: "Cadouri de Halloween: cutiuțe muzicale cu atmosferă de poveste",
    seoTitle: "Cadouri Halloween: cutiuțe muzicale cu atmosferă",
    description:
      "Idei de cadouri și decor de Halloween pentru fani și colecționari. Alege o cutiuță muzicală după ilustrație, mecanism și disponibilitate.",
    intro:
      "Un cadou de Halloween poate rămâne aproape și după seara de 31 octombrie. O cutiuță muzicală este potrivită pentru cine colecționează obiecte tematice sau își amenajează un colț cu povești misterioase. Începe cu pasiunea persoanei: preferă atmosfera de toamnă, ilustrațiile fantastice ori un anumit univers de film?",
    sections: [
      {
        title: "Pentru gazda unei seri tematice",
        text: "Alege un obiect compact, care poate fi așezat pe o etajeră și descoperit de aproape. O cutiuță cu manivelă creează un moment scurt în care invitații văd mecanismul și aud fragmentul muzical. Nu înlocuiește sonorizarea unei petreceri: sunetul mecanic se apreciază mai bine într-un spațiu liniștit.",
      },
      {
        title: "Un decor care rămâne în colecție",
        text: "Privește capacul, culoarea lemnului și fotografiile modelului înainte să decizi unde îl vei așeza. Un fundal cu cărți, ilustrații și lumini calde poate susține tema. Păstrează lemnul departe de lumânări aprinse, lichide și surse de căldură.",
      },
      {
        title: "Alegerea după persoană",
        text: "Pentru un fan Halloween, ilustrația tematică este primul reper. Pentru un cititor de fantasy, contează universul și melodia. Dacă pregătești un dar pentru o dată fixă, verifică stocul afișat și opțiunile de livrare înainte de finalizarea comenzii.",
      },
    ],
    question: "Este potrivită pentru copii mici?",
    answer:
      "Cutiuțele sunt prezentate ca obiecte decorative și de colecție. Verifică recomandarea de vârstă și detaliile fiecărui produs; nu le alege drept jucării pentru copii mici.",
  },
  {
    slug: "secret-santa",
    group: "Ocazii",
    productIds: ["hp-keeper", "got-winter", "kitten", "halloween", "sunshine"],
    label: "Secret Santa",
    eyebrow: "Colegi · prieteni · pasiuni",
    title: "Cadouri Secret Santa: cum alegi o cutiuță muzicală personală",
    seoTitle: "Cadouri Secret Santa: cutiuțe muzicale pentru colegi",
    description:
      "Idei de Secret Santa pentru colegi și prieteni: cutiuțe muzicale pentru fani Harry Potter, pisici, fantasy și melodii cu semnificație.",
    intro:
      "Cel mai simplu punct de plecare pentru Secret Santa este un detaliu pe care îl știi despre persoană: cartea preferată, serialul despre care vorbește sau fotografiile cu pisica. O cutiuță muzicală poate lega acel interes de un gest personal, fără să alegi un obiect voluminos sau dependent de aplicații.",
    sections: [
      {
        title: "Pentru colegul pasionat de filme și cărți",
        text: "Harry Potter și Game of Thrones pot fi repere bune atunci când cunoști deja universul preferat al destinatarului. Compară ilustrația de pe capac, melodia și fotografiile modelelor disponibile. O legătură clară cu pasiunea persoanei contează mai mult decât un mesaj generic despre sărbători.",
      },
      {
        title: "Pentru un iubitor de pisici sau pentru un prieten apropiat",
        text: "Un model cu pisicuță poate porni o conversație chiar de la deschiderea cadoului. O melodie ca You Are My Sunshine are un ton mai personal; alege-o dacă se potrivește relației voastre. Poți adăuga un bilețel în care spui de ce ai ales exact acel model.",
      },
      {
        title: "Buget, stoc și prezentarea cadoului",
        text: "Verifică prețul actual din pagina produsului și bugetul stabilit de grup. Costul transportului se confirmă în checkout. Pentru un schimb de cadouri cu dată fixă, alege dintre modelele disponibile și verifică estimarea de livrare. Nu presupune că un model din «Magia care urmează» poate ajunge la timp.",
      },
    ],
    decisionGuide: {
      title: "Alege cadoul Secret Santa în 60 de secunde",
      checkpoints: [
        {
          label: "Ce știi sigur?",
          guidance:
            "Alege numai o pasiune confirmată din conversații: Harry Potter, fantasy, pisici sau o melodie cunoscută.",
        },
        {
          label: "Care este limita?",
          guidance:
            "Compară prețul produsului și transportul cu bugetul grupului înainte să te hotărăști.",
        },
        {
          label: "Când se oferă?",
          guidance:
            "Pentru schimburile cu dată fixă, rămâi la modelele marcate disponibile și lasă timp pentru livrare.",
        },
      ],
      avoid:
        "Nu alege un univers doar pentru că este popular și nu transforma un cadou între colegi într-un mesaj prea personal.",
      messagePrompts: [
        "Am ales tema după discuțiile noastre despre…",
        "Pentru pauzele în care biroul are nevoie de puțină magie.",
        "Un indiciu mic despre cine ți-a fost Secret Santa.",
      ],
    },
    question: "Pot alege doar după un plafon de buget?",
    answer:
      "Poți compara prețurile afișate în catalog, dar ia în calcul și transportul. Nu presupunem un preț fix pentru toate modelele sau o reducere care nu este afișată în magazin.",
  },
  {
    slug: "mos-nicolae",
    group: "Ocazii",
    productIds: ["sunshine", "kitten", "hp-keeper"],
    label: "Moș Nicolae",
    eyebrow: "6 decembrie · daruri mici",
    title: "Cadouri de Moș Nicolae: mici cutiuțe muzicale pentru cei dragi",
    seoTitle: "Cadouri de Moș Nicolae: cutiuțe muzicale mici",
    description:
      "Un dar mic de Moș Nicolae, cu melodie și poveste. Idei de cutiuțe muzicale pentru adulți, fani, familie și iubitori de pisici.",
    intro:
      "Pentru Moș Nicolae, un dar mic poate fi ales cu la fel de multă grijă ca un cadou mare. O cutiuță muzicală din lemn se potrivește unei surprize pentru un adult sau un colecționar, atunci când ilustrația și melodia au legătură cu persoana. Dimensiunile exacte sunt afișate la fiecare model.",
    sections: [
      {
        title: "O surpriză pentru partener sau familie",
        text: "You Are My Sunshine poate însoți un mesaj cald, o fotografie sau o carte. Momentul important este descoperirea: capacul se deschide, mecanismul se vede, iar melodia se aude prin rotirea manivelei. Poți arăta chiar tu acest gest când oferi darul.",
      },
      {
        title: "Un mic cadou după pasiuni",
        text: "Pentru un iubitor de pisici, caută ilustrația cu pisicuță. Pentru un fan Harry Potter, compară modelele inspirate de universul preferat. Dacă vrei un dar pentru tata, explorează modelele dedicate, verificând starea lor actuală în catalog.",
      },
      {
        title: "Pregătește din timp surpriza",
        text: "Moș Nicolae este pe 6 decembrie, însă data comenzii și destinația influențează livrarea. Verifică disponibilitatea și opțiunile afișate în coș. Nu trata un produs epuizat sau în pregătire ca fiind gata de expediere și citește recomandările de vârstă înainte de alegere.",
      },
    ],
    question: "Cutiuțele sunt jucării pentru ghetuțele copiilor?",
    answer:
      "Sunt obiecte decorative și de colecție, cu mecanism și componente mici. Citește recomandarea de vârstă de pe produs; acest ghid se adresează alegerii unor daruri pentru adulți și destinatari potriviți modelului.",
  },
  {
    slug: "craciun",
    group: "Ocazii",
    productIds: [
      "sunshine",
      "kitten",
      "hp-keeper",
      "got-winter",
      "halloween",
      "lotr-rings",
      "hp-always",
      "fairy",
      "pirates",
      "starwars-dad",
    ],
    label: "Crăciun",
    eyebrow: "Familie · amintiri · daruri",
    title: "Cadouri de Crăciun cu poveste: cutiuțe muzicale din lemn",
    seoTitle: "Cadouri de Crăciun: cutiuțe muzicale cu poveste",
    description:
      "Alege un cadou de Crăciun după persoană și melodie: cutiuțe muzicale pentru cuplu, familie, fani de filme, cititori și colecționari.",
    intro:
      "Un cadou de Crăciun devine personal atunci când arată că ai observat ce îi place destinatarului. O cutiuță muzicală poate trimite la o carte recitită, un film văzut împreună sau un cântec cu semnificație. În catalog găsești modele cu manivelă, din lemn, pe care le poți compara după melodie, ilustrație și disponibilitate.",
    sections: [
      {
        title: "Pentru fani și colecționari",
        text: "Harry Potter, Game of Thrones, Lord of the Rings și celelalte universuri din catalog sunt puncte de pornire pentru un dar tematic. Alege după pasiunea persoanei și detaliile exacte din galerie. Pentru un colecționar, culoarea cutiuței și ilustrația de pe capac pot conta la fel de mult ca melodia.",
      },
      {
        title: "Pentru cuplu, părinți și prieteni",
        text: "You Are My Sunshine poate însoți o amintire comună, iar un model cu pisicuță poate face legătura cu o pasiune apropiată. Pentru tata, caută o cutiuță dedicată care chiar se potrivește intereselor lui. Un bilețel cu motivul alegerii dă sens obiectului, fără să fie nevoie de o personalizare a produsului.",
      },
      {
        title: "Momentul oferirii și pregătirea comenzii",
        text: "Arată-i persoanei cum se rotește manivela: mecanismul este manual și nu are nevoie de baterii. Pentru o dată fixă, verifică stocul și estimarea curierului înainte de comandă. Magazinul afișează separat modelele în pregătire; nu promitem o dată de sosire care nu este confirmată în fluxul de comandă.",
      },
    ],
    question: "Pot cere altă melodie sau o gravură personalizată?",
    answer:
      "Fiecare model are melodia și ilustrația prezentate în pagina sa. Nu presupune că poate fi schimbată melodia sau gravura; pentru o cerere specială, cere confirmare înainte de comandă.",
  },
  {
    slug: "zi-de-nastere",
    group: "Ocazii",
    productIds: ["sunshine", "kitten", "hp-keeper", "got-winter", "halloween"],
    label: "Zi de naștere",
    eyebrow: "Aniversare · surpriză · amintire",
    title: "Cadou de zi de naștere: o cutiuță muzicală aleasă după persoană",
    seoTitle: "Cadou de zi de naștere: cutiuțe muzicale cu poveste",
    description:
      "Idei de cadouri de zi de naștere pentru ea, el, prieteni și fani: cutiuțe muzicale din lemn alese după melodie și pasiune.",
    intro:
      "Un cadou de zi de naștere devine memorabil când trimite la ceva ce persoana iubește deja. Poate fi o melodie apropiată, un univers de film sau o ilustrație cu pisici. Cutiuța muzicală este compactă, funcționează manual și creează un mic moment de descoperire atunci când este deschisă.",
    sections: [
      {
        title: "Pornește de la pasiunea sărbătoritului",
        text: "Pentru un cititor de fantasy sau un fan de filme, alege universul pe care îl recunoaște imediat. Pentru cine iubește pisicile, caută modelul tematic. Dacă relația este apropiată, o melodie precum You Are My Sunshine poate transmite mai mult decât un obiect ales doar după aspect.",
      },
      {
        title: "Transformă deschiderea într-un moment",
        text: "Arată-i persoanei cum se rotește manivela și ascultați împreună primele note. Adaugă un bilețel care explică de ce ai ales exact acel model. Cutiuța nu are nevoie de baterii, iar mecanismul vizibil face parte din experiență.",
      },
      {
        title: "Verifică stocul înainte de data aniversării",
        text: "Modelele disponibile pot fi comandate din pagina produsului. Pentru o aniversare cu dată fixă, verifică livrarea și nu planifica în jurul unui produs marcat «În curând». Fotografiile, dimensiunile și melodia sunt prezentate individual.",
      },
    ],
    question: "Este potrivită ca dar principal sau ca mică surpriză?",
    answer:
      "Poate avea oricare dintre roluri, în funcție de persoană. Pentru un fan sau colecționar poate fi darul central; pentru altcineva poate însoți o carte, flori sau o fotografie.",
  },
  {
    slug: "aniversare-cuplu",
    group: "Ocazii",
    productIds: ["sunshine", "hp-keeper", "got-winter"],
    label: "Aniversare de cuplu",
    eyebrow: "Cuplu · melodie · poveste comună",
    title: "Cadou pentru aniversarea de cuplu: o melodie care vă aparține",
    seoTitle: "Cadou aniversare cuplu: cutiuță muzicală din lemn",
    description:
      "Idei de cadou pentru aniversarea de cuplu: cutiuțe muzicale cu manivelă, melodii apropiate și teme din poveștile voastre preferate.",
    intro:
      "Pentru aniversarea relației, un obiect mic poate spune mult atunci când este legat de o amintire comună. Alege cutiuța după cântecul care vă apropie sau după filmul și povestea pe care le-ați descoperit împreună, apoi completează gestul cu câteva cuvinte personale.",
    sections: [
      {
        title: "Alege după semnificație, nu după mărime",
        text: "You Are My Sunshine are un ton cald și direct. Un model inspirat de Harry Potter sau Game of Thrones poate fi mai potrivit dacă acela este universul vostru comun. Pagina fiecărui produs arată melodia, capacul și mecanismul.",
      },
      {
        title: "Adaugă povestea voastră",
        text: "Scrie pe un cartonaș locul, momentul sau replica de care vă amintește cutiuța. Pentru o imagine ori gravură aleasă de voi, folosește configuratorul de personalizare și ține cont de termenul de realizare afișat acolo.",
      },
      {
        title: "Păstrați obiectul aproape",
        text: "Cutiuța poate sta pe noptieră, într-o bibliotecă sau lângă fotografii. Lemnul trebuie ferit de umezeală și căldură, iar manivela se rotește ușor doar cât timp vreți să ascultați fragmentul muzical.",
      },
    ],
    question: "Pot personaliza imaginea de pe capac pentru aniversare?",
    answer:
      "Da, pagina de personalizare permite alegerea culorii, încărcarea unei imagini și solicitarea unei gravuri. Atelierul confirmă detaliile înainte de realizare.",
  },
  {
    slug: "valentines-day",
    group: "Ocazii",
    productIds: ["sunshine", "hp-keeper"],
    label: "Valentine’s Day",
    eyebrow: "14 februarie · cuplu · gest personal",
    title: "Cadou de Valentine’s Day: o cutiuță muzicală pentru voi doi",
    seoTitle: "Cadou Valentine’s Day: cutiuță muzicală pentru cuplu",
    description:
      "Un cadou de Valentine’s Day cu melodie și poveste: cutiuțe muzicale din lemn pentru iubită, iubit sau o amintire de cuplu.",
    intro:
      "De Valentine’s Day, legătura dintre dar și povestea voastră contează mai mult decât dimensiunea lui. O cutiuță muzicală pornește printr-un gest simplu, fără baterii, și poate păstra aproape un cântec ori un univers pe care îl recunoașteți amândoi.",
    sections: [
      {
        title: "Pentru iubită sau iubit",
        text: "Alege You Are My Sunshine pentru un mesaj tandru sau un model tematic atunci când pasiunea comună este mai importantă decât simbolurile romantice clasice. Verifică fotografiile produsului și ascultă fragmentul audio dacă este disponibil.",
      },
      {
        title: "Un dar care poate deveni al vostru",
        text: "Configurarea cu fotografie și gravură este potrivită când vrei un obiect construit în jurul unei amintiri precise. Imaginea se previzualizează înainte de trimiterea cererii, iar varianta finală este confirmată de atelier.",
      },
      {
        title: "Comandă cu timp pentru pregătire",
        text: "Pentru 14 februarie, verifică disponibilitatea produsului și timpul de livrare. Cutiuțele personalizate au nevoie de pregătire suplimentară, iar termenul estimat este afișat în formularul dedicat.",
      },
    ],
    question: "Este obligatoriu să aleg un model cu mesaj romantic?",
    answer:
      "Nu. Cel mai personal cadou poate fi modelul inspirat de cartea, filmul sau melodia pe care le iubiți împreună.",
  },
  {
    slug: "multumire",
    group: "Ocazii",
    productIds: ["sunshine", "kitten"],
    label: "Mulțumire",
    eyebrow: "Recunoștință · gest mic · atenție",
    title: "Cadou de mulțumire: o cutiuță muzicală cu mesaj cald",
    seoTitle: "Cadou de mulțumire: cutiuțe muzicale cu semnificație",
    description:
      "Idei de cadou de mulțumire pentru o persoană dragă, colegă, profesoară sau gazdă: o cutiuță muzicală mică, aleasă cu sens.",
    intro:
      "Un cadou de mulțumire nu trebuie să fie impersonal. O cutiuță muzicală poate marca ajutorul primit, o găzduire sau un gest care a contat, mai ales când imaginea și melodia se potrivesc persoanei căreia îi este oferită.",
    sections: [
      {
        title: "Spune concret pentru ce mulțumești",
        text: "Însoțește cutiuța de un mesaj scurt și precis. Un model cu melodie caldă se potrivește unei persoane apropiate, iar o ilustrație cu pisicuță poate fi aleasă pentru cineva a cărui pasiune o cunoști deja.",
      },
      {
        title: "Potrivit pentru gazdă, colegă sau mentor",
        text: "Alege un model decorativ atunci când nu cunoști toate preferințele, dar ai observat stilul persoanei. Evită un mesaj prea intim pentru o relație profesională și lasă motivul recunoștinței să dea sens darului.",
      },
      {
        title: "Un obiect ușor de păstrat",
        text: "Dimensiunile compacte permit așezarea pe un birou sau raft. Produsul este decorativ și de colecție; verifică recomandarea de vârstă și toate detaliile înainte de a-l oferi.",
      },
    ],
    question: "Pot trimite cutiuța direct persoanei?",
    answer:
      "Completează adresa corectă în fluxul de comandă și contactează magazinul dacă ai nevoie de confirmarea unei prezentări speciale sau a unui mesaj în colet.",
  },
  {
    slug: "pentru-ea",
    group: "Pentru cine",
    productIds: ["sunshine", "kitten", "hp-keeper", "fairy"],
    label: "Pentru ea",
    eyebrow: "Iubită · prietenă · soră · colegă",
    title: "Cadou pentru ea: cutiuțe muzicale alese după pasiunea ei",
    seoTitle: "Cadou pentru ea: cutiuțe muzicale cu poveste",
    description:
      "Idei de cadou pentru ea: cutiuțe muzicale pentru iubită, prietenă, soră sau colegă, alese după melodie, pisici, fantasy și amintiri.",
    intro:
      "Un cadou pentru ea este mai convingător când pornește de la ceea ce o reprezintă. Poate iubește pisicile, citește fantasy, păstrează obiecte mici cu poveste sau are o melodie care îi schimbă imediat starea. Compară modelele după aceste repere, nu după o formulă generică.",
    sections: [
      {
        title: "Pentru iubită sau parteneră",
        text: "O melodie apropiată poate însoți o fotografie sau o dedicație. Dacă aveți un film ori o carte preferată, un model tematic poate spune mai clar «te cunosc» decât un cadou romantic standard.",
      },
      {
        title: "Pentru prietenă, soră sau colegă",
        text: "Modelul cu pisicuță este potrivit când pasiunea este evidentă, iar cutiuțele fantasy se potrivesc unei cititoare sau colecționare. Pentru o colegă, păstrează mesajul simplu și alege după interesul pe care l-ați discutat.",
      },
      {
        title: "Când vrei ceva unic",
        text: "Configuratorul permite o imagine pe capac, culoare și gravură. Folosește o fotografie pe care ai dreptul să o trimiți și verifică previzualizarea înainte de formularul final.",
      },
    ],
    question: "Cum aleg dacă nu îi cunosc melodia preferată?",
    answer:
      "Alege după o pasiune vizibilă — pisici, fantasy, film sau lectură — și consultă melodia fiecărui model înainte de comandă.",
  },
  {
    slug: "pentru-iubita",
    group: "Pentru cine",
    productIds: ["sunshine", "kitten", "hp-keeper", "fairy"],
    label: "Pentru iubită",
    eyebrow: "Relație · amintire · melodie",
    title: "Cadou pentru iubită: o cutiuță muzicală aleasă din povestea voastră",
    seoTitle: "Cadou pentru iubită: cutiuță muzicală cu poveste",
    description:
      "Idei de cadou pentru iubită, alese după melodia, amintirea sau universul vostru comun. Compară cutiuțe muzicale și opțiuni de personalizare.",
    intro:
      "Un cadou pentru iubită nu trebuie să repete aceleași simboluri romantice. Poate porni de la cântecul pe care îl fredonați, de la filmul pe care îl revedeți sau de la pisica despre care vorbiți în fiecare zi. Cutiuța potrivită este cea pe care o poți lega de o amintire concretă dintre voi.",
    sections: [
      {
        title: "Când melodia spune povestea",
        text: "You Are My Sunshine are un mesaj cald și direct, potrivit dacă melodia seamănă cu felul în care vorbiți unul despre celălalt. Ascultă fragmentul disponibil și nu alege doar după titlu: timbrul mecanic este parte din farmecul cutiuței.",
      },
      {
        title: "Când pasiunea ei este reperul",
        text: "Pentru o iubitoare de pisici, modelul cu lună și pisicuță poate fi mai personal decât un simbol romantic generic. Pentru o cititoare sau o fană Harry Potter, universul preferat poate deveni punctul central al cadoului.",
      },
      {
        title: "Când vrei o amintire numai a voastră",
        text: "O fotografie pe capac și o gravură scurtă pot transforma cutiuța într-un obiect legat de un loc sau o zi precisă. Folosește configuratorul, verifică previzualizarea și lasă timp pentru confirmarea atelierului.",
      },
    ],
    decisionGuide: {
      title: "Alege pentru iubită în 60 de secunde",
      checkpoints: [
        {
          label: "Aveți o melodie?",
          guidance:
            "Dacă răspunsul este da, începe de acolo; dacă nu, caută o pasiune sau un univers comun pe care îl recunoaște imediat.",
        },
        {
          label: "Vrei emoție sau colecție?",
          guidance:
            "Alege un model cald pentru mesajul dintre voi ori unul tematic dacă ea colecționează obiecte dintr-un univers anume.",
        },
        {
          label: "Data este fixă?",
          guidance:
            "Pentru aniversări apropiate, verifică stocul și livrarea; personalizarea are nevoie de timp suplimentar.",
        },
      ],
      avoid:
        "Nu presupune că roz, inimile sau un mesaj generic sunt automat romantice pentru ea; legătura reală cu povestea voastră este mai valoroasă.",
      messagePrompts: [
        "Am ales-o pentru că îmi amintește de ziua în care…",
        "O melodie mică pentru povestea pe care o construim împreună.",
        "Pentru serile noastre cu…",
      ],
    },
    question: "Este mai potrivit un model standard sau unul personalizat?",
    answer:
      "Alege modelul standard când melodia ori tema vă reprezintă deja. Alege personalizarea când o fotografie sau o gravură precisă este esențială pentru mesaj.",
  },
  {
    slug: "pentru-sora",
    group: "Pentru cine",
    productIds: ["kitten", "sunshine", "hp-keeper", "fairy"],
    label: "Pentru soră",
    eyebrow: "Soră · complicitate · amintiri",
    title: "Cadou pentru soră: o cutiuță muzicală aleasă după ce vă apropie",
    seoTitle: "Cadou pentru soră: cutiuțe muzicale cu semnificație",
    description:
      "Idei de cadou pentru soră: cutiuțe muzicale pentru iubitoare de pisici, cititoare, fane fantasy sau amintiri împărtășite în familie.",
    intro:
      "Între surori există adesea repere pe care nimeni altcineva nu le înțelege la fel: o carte împrumutată, un film revăzut, o poreclă sau o melodie din copilărie. Folosește unul dintre aceste repere pentru a alege cutiuța, apoi explică-l într-un bilețel scurt.",
    sections: [
      {
        title: "Pentru sora care citește și colecționează",
        text: "Un model Harry Potter sau fantasy are sens dacă seria face parte din biblioteca și conversațiile ei. Compară capacul, melodia și disponibilitatea; nu înlocui universul preferat cu unul doar asemănător.",
      },
      {
        title: "Pentru sora care iubește pisicile",
        text: "Modelul cu pisicuță și lună poate fi legat de animalul ei, de o fotografie amuzantă sau de un obicei pe care îl împărtășiți. Este un obiect decorativ, nu o jucărie pentru animal.",
      },
      {
        title: "Pentru o amintire din familie",
        text: "You Are My Sunshine poate însoți un mesaj cald, iar personalizarea poate folosi o fotografie pe care amândouă o prețuiți. Alege o imagine clară, verifică dreptul de folosire și termenul de pregătire.",
      },
    ],
    decisionGuide: {
      title: "Alege pentru soră în 60 de secunde",
      checkpoints: [
        {
          label: "Ce aveți în comun?",
          guidance:
            "Notează primul film, animal sau cântec la care vă gândiți amândouă; acesta este filtrul principal.",
        },
        {
          label: "Ce păstrează pe raft?",
          guidance:
            "Culoarea și ilustrația trebuie să se potrivească bibliotecii, biroului sau colecției ei reale.",
        },
        {
          label: "Ce vrei să-i spui?",
          guidance:
            "Alege un mesaj complice, recunoscător sau nostalgic și potrivește modelul cu acel ton.",
        },
      ],
      avoid:
        "Nu te baza numai pe faptul că este sora ta; un cadou reușit vorbește despre persoana care este acum, nu doar despre copilăria voastră.",
      messagePrompts: [
        "Pentru povestea pe care doar noi două o știm.",
        "Mi-a amintit de serile în care…",
        "Un obiect mic pentru toate momentele în care ai fost de partea mea.",
      ],
    },
    question: "Pot transforma cutiuța într-un cadou comun din partea familiei?",
    answer:
      "Da. Adăugați un cartonaș semnat sau alegeți o fotografie de familie prin configurator, ținând cont de termenul suplimentar pentru personalizare.",
  },
  {
    slug: "pentru-el",
    group: "Pentru cine",
    productIds: ["got-winter", "hp-keeper", "lotr-rings", "pirates"],
    label: "Pentru el",
    eyebrow: "Iubit · prieten · frate · coleg",
    title: "Cadou pentru el: cutiuțe muzicale pentru fani și colecționari",
    seoTitle: "Cadou pentru el: cutiuțe muzicale pentru fani",
    description:
      "Idei de cadou pentru el: cutiuțe muzicale din lemn pentru iubit, prieten, frate sau coleg pasionat de filme, fantasy și colecții.",
    intro:
      "Când cauți un cadou pentru el, universul preferat este un reper mai bun decât o categorie generală. O cutiuță inspirată de Game of Thrones, Harry Potter, Tolkien sau aventuri pe mare poate completa o colecție și poate crea un moment surprinzător prin mecanismul ei manual.",
    sections: [
      {
        title: "Pentru un fan de seriale și filme",
        text: "Verifică exact tema capacului și melodia. Game of Thrones și Harry Potter au identități diferite, iar alegerea potrivită este cea legată de preferința lui reală, nu doar de popularitatea universului.",
      },
      {
        title: "Pentru cititor și colecționar",
        text: "O cutiuță mică poate sta lângă cărți, figurine sau alte obiecte tematice. Modelele aflate în pregătire pot fi urmărite, dar nu trebuie tratate ca disponibile pentru o dată fixă.",
      },
      {
        title: "Pentru iubit, prieten sau coleg",
        text: "Adaptează mesajul relației: personal pentru partener, legat de o amintire pentru prieten și concentrat pe pasiune pentru coleg. Ambalarea și livrarea se verifică înainte de finalizarea comenzii.",
      },
    ],
    question: "Cutiuța este un gadget sau un obiect decorativ?",
    answer:
      "Este un obiect decorativ și de colecție cu mecanism muzical manual. Nu folosește baterii, aplicație sau difuzor electronic.",
  },
  {
    slug: "pentru-iubit",
    group: "Pentru cine",
    productIds: ["got-winter", "hp-keeper", "sunshine", "lotr-rings", "pirates"],
    label: "Pentru iubit",
    eyebrow: "Cuplu · pasiuni · poveste comună",
    title: "Cadou pentru iubit: o cutiuță muzicală care pornește de la pasiunea lui",
    seoTitle: "Cadou pentru iubit: cutiuțe muzicale pentru fani",
    description:
      "Idei de cadou pentru iubit: cutiuțe muzicale alese după serialul, cartea, melodia sau amintirea voastră, cu stoc verificat înainte de comandă.",
    intro:
      "Un cadou pentru iubit devine personal când arată că îi cunoști universul, nu doar că ai găsit un obiect romantic. Poate fi tema serialului pe care îl urmărește, o poveste pe care a citit-o de mai multe ori sau o melodie care are deja un loc în relația voastră.",
    sections: [
      {
        title: "Pentru fanul de fantasy și seriale",
        text: "Game of Thrones și Harry Potter au melodii și simboluri distincte. Alege numai universul pe care îl apreciază cu adevărat și verifică galeria produsului; modelele Tolkien sau Pirates pot fi urmărite separat dacă încă nu sunt disponibile.",
      },
      {
        title: "Pentru o poveste care nu depinde de fandom",
        text: "You Are My Sunshine poate fi alegerea mai potrivită dacă relația voastră are un cântec sau un mesaj simplu, iar colecțiile tematice nu îl reprezintă. Un bilețel precis face legătura dintre melodie și voi.",
      },
      {
        title: "Pentru birou, bibliotecă sau colțul lui de colecție",
        text: "Privește culoarea lemnului și capacul în fotografiile reale. Dimensiunea compactă permite păstrarea lângă cărți ori figurine, dar obiectul trebuie ferit de umezeală, lovituri și surse de căldură.",
      },
    ],
    decisionGuide: {
      title: "Alege pentru iubit în 60 de secunde",
      checkpoints: [
        {
          label: "Ce univers numește primul?",
          guidance:
            "Alege seria pe care o recitește sau o revede, nu tema care pare cea mai spectaculoasă în catalog.",
        },
        {
          label: "Colecție sau mesaj?",
          guidance:
            "Pentru colecție, prioritizează capacul și fidelitatea temei; pentru relație, prioritizează melodia și dedicația.",
        },
        {
          label: "Este disponibil acum?",
          guidance:
            "Dacă data contează, alege un produs în stoc și nu construi surpriza în jurul unui model marcat În curând.",
        },
      ],
      avoid:
        "Nu presupune că orice produs fantasy sau science-fiction i se potrivește; fanii fac diferența între universuri, simboluri și melodii.",
      messagePrompts: [
        "Pentru următoarea noastră aventură, chiar dacă începe de acasă.",
        "Am ales tema după seara în care am văzut împreună…",
        "O melodie mică pentru unul dintre lucrurile mari pe care le iubim împreună.",
      ],
    },
    question: "Cum aleg între o cutiuță tematică și una romantică?",
    answer:
      "Alege tema dacă pasiunea lui este clară și prezentă în viața de zi cu zi. Alege melodia romantică dacă mesajul relației este mai important decât apartenența la un fandom.",
  },
  {
    slug: "pentru-mama",
    group: "Pentru cine",
    productIds: ["sunshine", "kitten"],
    label: "Pentru mama",
    eyebrow: "Mamă · familie · recunoștință",
    title: "Cadou pentru mama: o cutiuță muzicală cu emoție",
    seoTitle: "Cadou pentru mama: cutiuță muzicală cu mesaj",
    description:
      "Un cadou pentru mama cu melodie și semnificație: cutiuțe muzicale din lemn pentru zi de naștere, Crăciun sau un simplu mulțumesc.",
    intro:
      "Pentru mama, un dar mic devine important prin mesajul care îl însoțește. O melodie caldă și un mecanism pus în mișcare cu mâna pot transforma deschiderea cutiuței într-un moment liniștit, potrivit pentru o zi de naștere, sărbătoare sau mulțumire.",
    sections: [
      {
        title: "Alege o melodie cu amintire",
        text: "You Are My Sunshine poate exprima apropierea dintre voi, mai ales dacă îi adaugi câteva rânduri scrise de mână. Dacă mama iubește pisicile, modelul tematic poate fi o alegere mai personală.",
      },
      {
        title: "Pentru zi de naștere, Crăciun sau 8 Martie",
        text: "Ocazia oferă context, dar motivul alegerii dă valoare darului. Spune-i de ce melodia sau imaginea ți-a amintit de ea și arată-i cum funcționează manivela.",
      },
      {
        title: "O fotografie pe capac",
        text: "Pentru o amintire de familie, poți folosi pagina de personalizare. Încarcă doar o imagine potrivită și verifică termenul de pregătire înainte de data la care vrei să oferi cadoul.",
      },
    ],
    decisionGuide: {
      title: "Alege pentru mama în 60 de secunde",
      checkpoints: [
        {
          label: "Melodie sau pasiune?",
          guidance:
            "Alege You Are My Sunshine dacă mesajul dintre voi este central; alege pisicuța dacă aceasta este pasiunea ei reală.",
        },
        {
          label: "Cadou standard sau amintire?",
          guidance:
            "Pentru o fotografie de familie ori o gravură, verifică separat personalizarea și timpul ei de pregătire.",
        },
        {
          label: "Cum îl oferi?",
          guidance:
            "Adaugă două rânduri scrise de tine și pornește chiar tu manivela la deschiderea cadoului.",
        },
      ],
      avoid:
        "Nu lăsa ocazia să înlocuiască mesajul personal: explică de ce tocmai melodia sau imaginea ți-a amintit de ea.",
      messagePrompts: [
        "Pentru toate momentele în care ai făcut lumea mea mai luminoasă.",
        "Melodia aceasta mi-a amintit de…",
        "Un mulțumesc mic pentru o grijă pe care nu o uit.",
      ],
    },
    question: "Pot adăuga o fotografie de familie?",
    answer:
      "Da, configuratorul de personalizare permite încărcarea unei imagini pentru capac și solicitarea unei gravuri, cu confirmare ulterioară din partea atelierului.",
  },
  {
    slug: "pentru-tata",
    group: "Pentru cine",
    productIds: ["starwars-dad", "got-winter", "hp-keeper"],
    label: "Pentru tata",
    eyebrow: "Tată · pasiuni · colecții",
    title: "Cadou pentru tata: o cutiuță muzicală aleasă după pasiunea lui",
    seoTitle: "Cadou pentru tata: cutiuțe muzicale pentru fani",
    description:
      "Idei de cadou pentru tata: cutiuțe muzicale pentru fani Star Wars, fantasy și povești cunoscute, cu mecanism manual și capac tematic.",
    intro:
      "Un cadou pentru tata poate porni de la filmul pe care îl revede, cartea pe care o recomandă sau colecția pe care o păstrează. Cutiuțele tematice sunt ușor de așezat pe birou sau în bibliotecă și se descoperă printr-un mecanism simplu, fără baterii.",
    sections: [
      {
        title: "Pentru tata pasionat de science-fiction sau fantasy",
        text: "Modelul Best Dad in the Galaxy este dedicat unui fan Star Wars, iar cele inspirate de Game of Thrones sau Harry Potter pot fi alese după universul lui preferat. Verifică disponibilitatea fiecăruia înainte de a stabili cadoul.",
      },
      {
        title: "Pentru ziua lui sau pentru sărbători",
        text: "Poți oferi cutiuța de ziua tatălui, la aniversare ori de Crăciun. Un mesaj despre momentul în care ați descoperit împreună povestea face obiectul mai personal.",
      },
      {
        title: "Dacă modelul dedicat nu este încă disponibil",
        text: "Nu înlocui automat tema. Poți activa notificarea pentru produsul dorit sau poți alege un alt model numai dacă știi că universul respectiv îi place cu adevărat.",
      },
    ],
    question: "Modelul Best Dad in the Galaxy poate fi comandat acum?",
    answer:
      "Starea actuală este afișată în pagina produsului. Dacă apare «În curând», poți solicita o notificare, dar nu îl considera disponibil până când magazinul confirmă acest lucru.",
  },
  {
    slug: "pentru-colegi",
    group: "Pentru cine",
    productIds: ["hp-keeper", "got-winter", "kitten", "halloween"],
    label: "Pentru colegi",
    eyebrow: "Birou · echipă · pasiuni",
    title: "Cadou pentru colegă sau coleg: o cutiuță muzicală cu personalitate",
    seoTitle: "Cadou pentru colegă sau coleg: idei cu poveste",
    description:
      "Idei de cadouri pentru colegă sau coleg: cutiuțe muzicale compacte pentru fani, iubitori de pisici, Secret Santa și aniversări la birou.",
    intro:
      "Pentru un coleg, un cadou reușit arată că ai observat un interes real fără să devină prea personal. O cutiuță muzicală inspirată de un serial, o carte sau pisici poate fi o surpriză potrivită la birou, în special când tema a apărut deja în conversațiile voastre.",
    sections: [
      {
        title: "Alege după un interes cunoscut",
        text: "Un fan Harry Potter sau Game of Thrones va înțelege imediat referința, iar un iubitor de pisici va recunoaște alegerea atentă. Dacă nu îi cunoști pasiunile, întreabă discret echipa înainte de a comanda.",
      },
      {
        title: "Pentru aniversare sau Secret Santa",
        text: "Verifică bugetul stabilit și prețul actual al produsului. Cutiuța este compactă și poate sta pe birou, dar sunetul mecanic se ascultă cel mai bine într-un moment liniștit.",
      },
      {
        title: "Păstrează mesajul potrivit relației",
        text: "Un bilețel amuzant despre pasiunea colegului este suficient. Evită dedicațiile prea intime și alege ambalarea numai după ce verifici opțiunile disponibile în comandă.",
      },
    ],
    question: "Este potrivită pentru un schimb de cadouri la birou?",
    answer:
      "Da, dacă tema se potrivește persoanei și produsul se încadrează în bugetul grupului. Verifică separat transportul și disponibilitatea.",
  },
  {
    slug: "pentru-colega",
    group: "Pentru cine",
    productIds: ["kitten", "hp-keeper", "got-winter", "sunshine"],
    label: "Pentru colegă",
    eyebrow: "Birou · apreciere · limite potrivite",
    title: "Cadou pentru colegă: atent, personal și potrivit relației profesionale",
    seoTitle: "Cadou pentru colegă: cutiuțe muzicale cu poveste",
    description:
      "Idei de cadou pentru colegă, de la Secret Santa la aniversare sau mulțumire: cutiuțe muzicale alese după pasiuni și bugetul echipei.",
    intro:
      "Pentru o colegă, cadoul reușit arată că ai observat un interes real, dar păstrează limitele unei relații profesionale. O cutiuță cu pisicuță, Harry Potter ori Game of Thrones este potrivită numai când tema a apărut deja în conversații; altfel, întreabă discret echipa.",
    sections: [
      {
        title: "Pentru aniversarea de la birou",
        text: "Alege un model compact care poate fi păstrat pe birou sau acasă. Dacă darul este din partea echipei, un cartonaș semnat de colegi este mai potrivit decât o dedicație foarte personală.",
      },
      {
        title: "Pentru Secret Santa",
        text: "Respectă plafonul stabilit și verifică transportul înainte de alegere. O pasiune confirmată, precum pisicile sau o serie fantasy, este un indiciu mai sigur decât vârsta, rolul ori stilul vestimentar.",
      },
      {
        title: "Pentru un mulțumesc profesional",
        text: "Leagă mesajul de ajutorul concret, colaborarea sau proiectul pentru care îi mulțumești. You Are My Sunshine poate avea un ton prea intim în unele echipe; citește contextul înainte să o alegi.",
      },
    ],
    decisionGuide: {
      title: "Alege pentru colegă în 60 de secunde",
      checkpoints: [
        {
          label: "Pasiunea este confirmată?",
          guidance:
            "Folosește numai informații împărtășite firesc la birou, nu presupuneri despre gusturi sau viața personală.",
        },
        {
          label: "Cadoul este individual sau de echipă?",
          guidance:
            "Pentru echipă, alege un mesaj comun; pentru un dar individual, păstrează tonul cald, dar profesional.",
        },
        {
          label: "Bugetul include livrarea?",
          guidance:
            "Verifică prețul actual și costul de transport înainte să confirmi alegerea cu ceilalți colegi.",
        },
      ],
      avoid:
        "Evită mesajele romantice, glumele despre vârstă și temele alese după stereotipuri; cadoul trebuie să fie confortabil și în contextul biroului.",
      messagePrompts: [
        "Mulțumim pentru felul în care ai ajutat echipa cu…",
        "Pentru biroul tău și pentru pauzele cu puțină magie.",
        "Am ales tema după discuția noastră despre…",
      ],
    },
    question: "Este potrivită cutiuța dacă nu îi cunosc bine preferințele?",
    answer:
      "Mai bine întrebi discret o persoană apropiată din echipă sau alegi un cadou colectiv. O temă foarte specifică nu trebuie ghicită doar pentru a părea personală.",
  },
  {
    slug: "iubitori-de-pisici",
    group: "Pasiuni",
    productIds: ["kitten"],
    label: "Iubitori de pisici",
    eyebrow: "Pisici · lună · decor",
    title: "Cadou pentru iubitorii de pisici: o cutiuță muzicală cu pisicuță",
    seoTitle: "Cadou pentru iubitori de pisici: cutiuță muzicală",
    description:
      "Cadou pentru iubitori de pisici: cutiuță muzicală din lemn cu pisicuță, lună și manivelă, pentru aniversare, Crăciun sau Secret Santa.",
    intro:
      "Când persoana își fotografiază pisica zilnic și își alege decorațiunile după această pasiune, un model cu pisicuță este o alegere firească. Ilustrația cu lună și fluturi dă cutiuței un aer delicat, iar mecanismul manual adaugă momentul muzical.",
    sections: [
      {
        title: "Pentru prietenă, colegă sau membru al familiei",
        text: "Modelul se potrivește unui adult care colecționează obiecte cu pisici sau își amenajează un colț de lectură. Este un obiect decorativ și de colecție, nu o jucărie pentru animale ori copii mici.",
      },
      {
        title: "Un cadou tematic fără să fie generic",
        text: "Leagă alegerea de pisica persoanei, de o fotografie sau de o întâmplare pe care o știți amândoi. Un mesaj simplu transformă tema vizuală într-un dar personal.",
      },
      {
        title: "Verifică detaliile reale",
        text: "Galeria arată capacul, mecanismul și dimensiunile. Citește descrierea completă și păstrează lemnul departe de umezeală, căldură și lăbuțe curioase.",
      },
    ],
    question: "Cutiuța poate fi lăsată ca jucărie pentru pisică?",
    answer:
      "Nu. Este un obiect decorativ cu piese mecanice și trebuie păstrat într-un loc sigur, unde animalul nu îl poate răsturna sau roade.",
  },
  {
    slug: "fani-harry-potter",
    group: "Pasiuni",
    productIds: ["hp-keeper", "hp-always"],
    label: "Fani Harry Potter",
    eyebrow: "Hogwarts · lectură · colecții",
    title: "Cadou pentru un fan Harry Potter: cutiuțe muzicale cu manivelă",
    seoTitle: "Cadou fan Harry Potter: cutiuțe muzicale cu manivelă",
    description:
      "Cadouri pentru fanii Harry Potter și Potterheads: cutiuțe muzicale din lemn, cu manivelă, ilustrații tematice și melodii cunoscute.",
    intro:
      "Un fan Harry Potter observă repede diferența dintre o referință generică și un obiect ales cu atenție. Compară modelele după capac, culoare și melodia afișată. Unul poate deveni piesa mică de lângă seria de cărți, o hartă sau alte obiecte de colecție.",
    sections: [
      {
        title: "Pentru Potterhead, cititor sau colecționar",
        text: "Hedwig’s Theme și simbolurile Hogwarts sunt repere puternice pentru un fan. Modelul albastru I Solemnly Swear are o identitate diferită; verifică dacă este disponibil sau încă în pregătire.",
      },
      {
        title: "Cadou de Crăciun, aniversare sau Secret Santa",
        text: "Cutiuța este potrivită când știi deja că persoana iubește seria. Poți adăuga o dedicație despre cartea preferată sau despre primul film văzut împreună.",
      },
      {
        title: "Alege din fotografii și melodie",
        text: "Pagina fiecărui model conține imagini ale produsului și, când este disponibil, fragment audio. Nu presupune că ilustrația sau melodia pot fi schimbate la un produs standard.",
      },
    ],
    question: "Care model Harry Potter este disponibil?",
    answer:
      "Disponibilitatea este actualizată în fiecare pagină de produs. Modelele în stoc pot fi adăugate în coș, iar pentru cele viitoare poți solicita notificare.",
  },
  {
    slug: "fani-game-of-thrones",
    group: "Pasiuni",
    productIds: ["got-winter"],
    label: "Fani Game of Thrones",
    eyebrow: "Westeros · colecții · seriale",
    title: "Cadou pentru un fan Game of Thrones: o cutiuță muzicală tematică",
    seoTitle: "Cadou Game of Thrones: cutiuță muzicală cu manivelă",
    description:
      "Cadou pentru un fan Game of Thrones: cutiuță muzicală din lemn cu manivelă, temă Winter Is Coming și mecanism vizibil.",
    intro:
      "Pentru cine revine la poveștile din Westeros, o cutiuță Game of Thrones poate fi un mic obiect de colecție cu identitate clară. Capacul tematic și melodia principală sunt cele două repere după care merită aleasă.",
    sections: [
      {
        title: "Winter Is Coming într-un obiect de colecție",
        text: "Verifică detaliile capacului, culoarea lemnului și mecanismul în galerie. Cutiuța funcționează prin rotirea manivelei și nu folosește baterii sau difuzor.",
      },
      {
        title: "Pentru aniversare, Crăciun sau un raft tematic",
        text: "Este o alegere potrivită numai dacă persoana apreciază universul. Poate însoți o carte, o ediție de colecție sau un mesaj legat de serial.",
      },
      {
        title: "Compară înainte de comandă",
        text: "Citește dimensiunile și recomandările produsului, apoi verifică prețul și stocul actual. Imaginile de prezentare pot conține decoruri care nu sunt incluse.",
      },
    ],
    question: "Melodia este tema principală Game of Thrones?",
    answer:
      "Melodia asociată modelului este afișată în pagina produsului. Consultă și fragmentul audio atunci când acesta este disponibil.",
  },
  {
    slug: "fani-fantasy",
    group: "Pasiuni",
    productIds: ["hp-keeper", "got-winter", "lotr-rings", "hp-always", "fairy"],
    label: "Fani fantasy",
    eyebrow: "Cărți · filme · lumi imaginare",
    title: "Cadouri pentru fanii fantasy: cutiuțe muzicale din lumi îndrăgite",
    seoTitle: "Cadouri fantasy: cutiuțe muzicale pentru fani și cititori",
    description:
      "Idei de cadouri fantasy pentru cititori, cinefili și colecționari: cutiuțe muzicale Harry Potter, Game of Thrones, Tolkien și zâne.",
    intro:
      "Fantasy nu înseamnă un singur tip de poveste. Un cititor Tolkien, un Potterhead și un fan Game of Thrones vor recunoaște alte simboluri și alte melodii. Alege universul corect, apoi compară modelele după fotografii, mecanism și disponibilitate.",
    sections: [
      {
        title: "Pentru cititori și iubitori de filme",
        text: "Pornește de la seria pe care persoana o recitește sau o revede. O cutiuță tematică are sens când continuă acea pasiune și poate sta lângă cărți, ilustrații ori obiecte de colecție.",
      },
      {
        title: "De la Hogwarts la Westeros și Pământul de Mijloc",
        text: "Fiecare model are propriul capac și propria melodie. Unele produse sunt disponibile acum, iar altele apar în colecția viitoare; paginile lor indică starea reală.",
      },
      {
        title: "Un dar pentru colecție, nu o jucărie",
        text: "Cutiuțele au mecanisme și componente mici. Citește recomandarea de vârstă și oferă-le ca obiecte decorative ori de colecție, păstrate departe de umezeală și surse de căldură.",
      },
    ],
    question: "Cum aleg între mai multe universuri fantasy?",
    answer:
      "Alege după povestea preferată a destinatarului și după melodia modelului. Dacă nu ești sigur, întreabă discret ce serie îi place cel mai mult.",
  },
  {
    slug: "cadouri-mici",
    group: "Pasiuni",
    productIds: ["sunshine", "kitten", "hp-keeper", "got-winter", "halloween"],
    label: "Cadouri mici",
    eyebrow: "Compact · memorabil · ușor de dăruit",
    title: "Cadouri mici cu semnificație: cutiuțe muzicale din lemn",
    seoTitle: "Cadouri mici cu semnificație: cutiuțe muzicale",
    description:
      "Idei de cadouri mici, dar memorabile: cutiuțe muzicale din lemn cu manivelă pentru aniversări, mulțumire, colegi și oameni dragi.",
    intro:
      "Un cadou mic nu trebuie să fie lipsit de personalitate. Cutiuța muzicală încape ușor pe un raft sau birou, dar creează un ritual complet: deschizi capacul, vezi mecanismul și rotești manivela pentru a asculta melodia.",
    sections: [
      {
        title: "Mic la dimensiuni, ales precis",
        text: "Compară dimensiunile din pagina produsului și alege tema după persoană. O legătură cu o melodie, un film sau o pasiune este mai importantă decât volumul cadoului.",
      },
      {
        title: "Pentru birou, bibliotecă sau noptieră",
        text: "Cutiuța poate fi păstrată într-un spațiu mic și nu are nevoie de cabluri ori baterii. Lemnul și mecanismul trebuie protejate de lichide, căldură și lovituri.",
      },
      {
        title: "Verifică prețul și transportul actual",
        text: "Prețul fiecărui model este afișat în catalog, iar transportul se confirmă în comandă. Nu folosim un prag generic în acest ghid deoarece prețurile și disponibilitatea se pot schimba.",
      },
    ],
    question: "Sunt toate cutiuțele la același preț?",
    answer:
      "Nu neapărat. Consultă prețul actual al fiecărui produs și costul de livrare înainte de confirmarea comenzii.",
  },
] as const satisfies readonly GiftGuide[];
export type GiftGuideSlug = (typeof giftGuides)[number]["slug"];
export const giftGuide = (slug: string): GiftGuide | undefined =>
  giftGuides.find((guide) => guide.slug === slug);
export const giftGuideIncludesProduct = (guide: GiftGuide, productId: string) =>
  guide.productIds.includes(productId);
export const giftGuidesForProduct = (productId: string): GiftGuide[] =>
  giftGuides.filter((guide) => giftGuideIncludesProduct(guide, productId));
export const giftGuideGroups = (["Ocazii", "Pentru cine", "Pasiuni"] as const).map((label) => ({
  label,
  guides: giftGuides.filter((guide) => guide.group === label),
}));
export const DISCOVERY_UPDATED = "2026-10-09";
