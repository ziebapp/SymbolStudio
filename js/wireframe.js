/* =========================================================================
   ALLARIS — wspólna logika serwisu
   Nawigacja, stopka, katalog rozwiązań, interakcje.
   ========================================================================= */

var PAGES = {
  home:        "index.html",
  hub:         "rozwiazania.html",
  solution:    "landing-rozwiazania.html",
  supplier:    "landing-dostawcy.html",
  suppliers:   "dostawcy.html",
  process:     "jak-pracujemy.html",
  cases:       "case-studies.html",
  blog:        "poradnik.html",
  events:      "eventy-webinary.html",
  contact:     "kontakt.html",
  privacy:     "polityka-prywatnosci.html"
};

function sol(slug){ return PAGES.solution + "?rozwiazanie=" + slug; }

function sygnetSVG(){
  if(window.SYGNET && SYGNET.path){
    return '<svg class="sygnet" viewBox="'+SYGNET.viewBox+'" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="'+SYGNET.path+'"/></svg>';
  }
  return '<span class="sygnet" aria-hidden="true">A</span>';
}

/* Ikony klastrów — placeholdery w stylu IBM Carbon (linia, 32px, currentColor) */
var ICONS = {
  c1:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="14" width="18" height="12" rx="1.5"/><path d="M11 14v-3a5 5 0 0 1 10 0v3"/><path d="M16 19v3"/></svg>',
  c2:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="16" cy="12.5" r="7"/><path d="M13 12.5l2 2 4-4"/><path d="M12 18.5l-2 8.5 6-3 6 3-2-8.5"/></svg>',
  c3:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="7" width="24" height="18" rx="2"/><circle cx="12" cy="14" r="3"/><path d="M7 22c0-3 2.4-4.5 5-4.5s5 1.5 5 4.5"/><path d="M20 12.5h5M20 16h5M20 19.5h3"/></svg>',
  c4:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 5H9a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9"/><path d="M11 12h6M11 16h4"/><path d="M20 5.5l4 4-7.5 7.5-4.5 1 1-4.5 7-8z"/></svg>',
  c5:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4v22"/><path d="M9 8h14"/><path d="M9 8l-4 8a4 4 0 0 0 8 0l-4-8z"/><path d="M23 8l-4 8a4 4 0 0 0 8 0l-4-8z"/><path d="M11 27h10"/></svg>'
};
function clusterIcon(id){ return ICONS[id] || ''; }

/* =========================================================================
   KATALOG ROZWIĄZAŃ — 5 kategorii (nazwy wg strategii marki)
   ========================================================================= */
var CLUSTERS = [
  {
    id:"c1", n:1, name:"Data Protection & Cryptography", pl:"Ochrona danych i kryptografia",
    desc:"Wszystko, co dotyczy kontroli kryptograficznych i bezpieczeństwa danych — od szyfrowania po nadzór nad kluczami.",
    services:[
      { abbr:"Encryption", full:"Szyfrowanie", slug:"encryption",
        desc:"Szyfruje dane w spoczynku i w ruchu, ograniczając skutki wycieku." },
      { abbr:"Key Management (KMS)", full:"Zarządzanie kluczami", slug:"kms",
        desc:"Centralnie zarządza cyklem życia kluczy kryptograficznych." },
      { abbr:"Post-Quantum Cryptography", full:"Kryptografia postkwantowa", slug:"post-quantum-cryptography",
        desc:"Przygotowuje organizację na zagrożenia ze strony komputerów kwantowych." },
      { abbr:"Enterprise Encryption", full:"Szyfrowanie w skali organizacji", slug:"enterprise-encryption",
        desc:"Wdraża spójną politykę szyfrowania w całym środowisku firmy." },
      { abbr:"HSM & Cloud HSM", full:"Sprzętowy moduł bezpieczeństwa", slug:"hsm-cloud-hsm",
        desc:"Generuje i chroni klucze w certyfikowanym sprzęcie — lokalnie lub w chmurze." },
      { abbr:"KMS & Secrets Management", full:"Zarządzanie kluczami i sekretami", slug:"kms-secrets-management",
        desc:"Porządkuje klucze, hasła i sekrety aplikacji w jednym, kontrolowanym miejscu." },
      { abbr:"Data Security", full:"Bezpieczeństwo danych", slug:"data-security",
        desc:"Chroni dane wrażliwe przez cały cykl ich życia." },
      { abbr:"Data Sovereignty", full:"Suwerenność danych", slug:"data-sovereignty",
        desc:"Zapewnia kontrolę nad lokalizacją i dostępem do danych zgodnie z wymogami." },
      { abbr:"Cryptographic Governance", full:"Nadzór nad kryptografią", slug:"cryptographic-governance",
        desc:"Porządkuje standardy, polityki i nadzór nad użyciem kryptografii." }
    ]
  },
  {
    id:"c2", n:2, name:"Digital Trust Infrastructure", pl:"Infrastruktura zaufania",
    desc:"Warstwa wydawania, automatyzacji i utrzymania certyfikatów oraz tożsamości maszynowych.",
    services:[
      { abbr:"Enterprise PKI", full:"Infrastruktura klucza publicznego", slug:"enterprise-pki",
        desc:"Fundament zaufania dla certyfikatów i tożsamości cyfrowych w organizacji." },
      { abbr:"Certificate Automation / CLM", full:"Automatyzacja cyklu życia certyfikatów", slug:"clm",
        desc:"Automatyzuje wydawanie, odnawianie i unieważnianie certyfikatów." },
      { abbr:"Building eIDAS Trust Services", full:"Budowa usług zaufania eIDAS", slug:"building-eidas-trust-services",
        desc:"Projektuje i uruchamia kwalifikowane usługi zaufania zgodne z eIDAS." },
      { abbr:"Trust Anchors", full:"Kotwice zaufania", slug:"trust-anchors",
        desc:"Punkty początkowe łańcucha zaufania, od których wywodzi się każdy certyfikat." },
      { abbr:"Managed PKI", full:"PKI jako usługa zarządzana", slug:"managed-pki",
        desc:"Przejmujemy budowę i utrzymanie PKI po stronie Allaris." },
      { abbr:"Machine & IoT Security", full:"Bezpieczeństwo maszyn i IoT", slug:"machine-iot-security",
        desc:"Nadaje i utrzymuje tożsamość urządzeniom oraz tożsamościom maszynowym." }
    ]
  },
  {
    id:"c3", n:3, name:"Digital Identity & Access Management", pl:"Tożsamość cyfrowa i dostęp",
    desc:"Zarządzanie tożsamością, uprawnieniami i dostępem w całej organizacji.",
    services:[
      { abbr:"IAM", full:"Zarządzanie tożsamością i dostępem", slug:"iam",
        desc:"Centralnie zarządza tożsamościami i uprawnieniami użytkowników." },
      { abbr:"PAM", full:"Zarządzanie dostępem uprzywilejowanym", slug:"pam",
        desc:"Kontroluje i nadzoruje konta o najwyższych uprawnieniach." },
      { abbr:"MFA", full:"Uwierzytelnianie wieloskładnikowe", slug:"mfa",
        desc:"Dodaje drugi składnik logowania i ogranicza skutki kradzieży hasła." },
      { abbr:"Zero Trust", full:"Architektura zerowego zaufania", slug:"zero-trust",
        desc:"Weryfikuje każdy dostęp — bez domyślnego zaufania do sieci." },
      { abbr:"Digital Identity Governance", full:"Nadzór nad tożsamością cyfrową", slug:"digital-identity-governance",
        desc:"Porządkuje nadawanie, przegląd i odbieranie uprawnień." },
      { abbr:"Workforce & Customer Identity", full:"Tożsamość pracownika i klienta", slug:"workforce-customer-identity",
        desc:"Obsługuje logowanie pracowników i klientów w jednym, spójnym modelu." }
    ]
  },
  {
    id:"c4", n:4, name:"eIDAS Trust Services", pl:"Usługi zaufania eIDAS",
    desc:"Wiążące prawnie usługi zaufania i bezpieczne transakcje cyfrowe.",
    services:[
      { abbr:"QEAA", full:"Kwalifikowane poświadczenie atrybutów", slug:"qeaa",
        desc:"Poświadcza atrybuty tożsamości — nowość eIDAS 2.0.", isNew:true },
      { abbr:"Qualified Electronic Signatures", full:"Kwalifikowany podpis elektroniczny", slug:"qualified-electronic-signatures",
        desc:"Nadaje dokumentom moc prawną równą podpisowi własnoręcznemu." },
      { abbr:"eSeals", full:"Pieczęć elektroniczna", slug:"eseals",
        desc:"Potwierdza pochodzenie i integralność dokumentów wystawianych przez firmę." },
      { abbr:"Remote Signing", full:"Podpis zdalny", slug:"remote-signing",
        desc:"Umożliwia składanie podpisu kwalifikowanego bez karty i czytnika." },
      { abbr:"Timestamping", full:"Kwalifikowany znacznik czasu", slug:"timestamping",
        desc:"Poświadcza istnienie danych w określonym momencie." },
      { abbr:"Building eIDAS Trust Services", full:"Budowa usług zaufania eIDAS (QTSP)", slug:"building-eidas-trust-services-c4",
        desc:"Projektuje i uruchamia kwalifikowane usługi zaufania od podstaw." }
    ]
  },
  {
    id:"c5", n:5, name:"Compliance & Regulations", pl:"Zgodność i regulacje",
    desc:"Ramy prawne i standardy, w których poruszają się nasi klienci — i do których doprowadzamy ich organizacje.",
    services:[
      { abbr:"eIDAS 2.0", full:"Rozporządzenie UE o tożsamości cyfrowej", slug:"eidas-2-0",
        desc:"Nowe ramy dla tożsamości, portfela cyfrowego i usług zaufania w UE." },
      { abbr:"NIS2", full:"Dyrektywa o cyberbezpieczeństwie", slug:"nis2",
        desc:"Podnosi wymogi bezpieczeństwa i odpowiedzialność zarządu." },
      { abbr:"DORA", full:"Odporność cyfrowa sektora finansowego", slug:"dora",
        desc:"Wymaga odporności operacyjnej i nadzoru nad dostawcami ICT." },
      { abbr:"GDPR / RODO", full:"Ochrona danych osobowych", slug:"gdpr",
        desc:"Reguluje przetwarzanie i ochronę danych osobowych w UE." },
      { abbr:"Critical Infrastructures", full:"Infrastruktura krytyczna", slug:"critical-infrastructures",
        desc:"Szczególne wymogi ochrony systemów o kluczowym znaczeniu." },
      { abbr:"UKSC", full:"Krajowy System Cyberbezpieczeństwa (PL)", slug:"uksc",
        desc:"Polskie ramy prawne cyberbezpieczeństwa i obowiązki podmiotów kluczowych." },
      { abbr:"ISO 27001", full:"Zarządzanie bezpieczeństwem informacji", slug:"iso-27001",
        desc:"Międzynarodowy standard systemu zarządzania bezpieczeństwem informacji." },
      { abbr:"PSD3", full:"Dyrektywa o usługach płatniczych", slug:"psd3",
        desc:"Nowe wymogi uwierzytelniania i bezpieczeństwa płatności." },
      { abbr:"PCI-DSS", full:"Standard bezpieczeństwa danych kart płatniczych", slug:"pci-dss",
        desc:"Wymogi ochrony danych kartowych u wydawców i akceptantów." },
      { abbr:"EU Cybersecurity Act", full:"Akt o cyberbezpieczeństwie UE", slug:"eu-cybersecurity-act",
        desc:"Ramy certyfikacji cyberbezpieczeństwa produktów i usług w UE." },
      { abbr:"NATO", full:"Wymogi i standardy NATO", slug:"nato",
        desc:"Standardy bezpieczeństwa dla podmiotów współpracujących z NATO." }
    ]
  }
];

/* Dostawcy technologii — grid na Home i stronie Dostawcy */
var SUPPLIERS = [
  { id:"utimaco", name:"Utimaco", origin:"Niemcy",
    logo:'<span class="mono">UTIMACO</span>',
    desc:"Niemiecki producent sprzętowych modułów bezpieczeństwa (HSM) klasy enterprise — fundament naszych wdrożeń kryptograficznych." },
  { id:"keyfactor", name:"Keyfactor", origin:"Szwecja / USA",
    logo:'<span style="letter-spacing:.01em">key<b>factor</b></span>',
    desc:"Platforma PKI i automatyzacji cyklu życia certyfikatów (CLM), na której budujemy infrastrukturę zaufania." },
  { id:"nexus", name:"Nexus Group", origin:"Szwecja",
    logo:'<span class="mono">NEXUS</span>',
    desc:"Europejski dostawca technologii tożsamości cyfrowej — identyfikatory, karty i certyfikaty dla ludzi i urządzeń." },
  { id:"cryptomathic", name:"Cryptomathic", origin:"Dania",
    logo:'<span style="letter-spacing:.03em">crypto<b>mathic</b></span>',
    desc:"Duński pionier podpisu zdalnego i zarządzania kluczami — technologia naszych wdrożeń podpisu kwalifikowanego." },
  { id:"yubico", name:"Yubico", origin:"Szwecja",
    logo:'<span class="mono">YUBICO</span>',
    desc:"Twórca kluczy sprzętowych YubiKey — standard silnego, odpornego na phishing uwierzytelniania MFA." },
  { id:"thales", name:"Thales", origin:"Francja",
    logo:'<span class="mono">THALES</span>',
    desc:"Globalny lider bezpieczeństwa cyfrowego — szyfrowanie, HSM i ochrona danych w największej skali." }
];

var NAV = [
  { label:"Dostawcy",          href:PAGES.suppliers },
  { label:"Jak pracujemy",     href:PAGES.process },
  { label:"Realizacje",        href:PAGES.cases },
  { label:"Poradnik",          href:PAGES.blog },
  { label:"Eventy i webinary", href:PAGES.events }
];

/* =========================================================================
   HEADER — stała wysokość; scroll podmienia tylko znak (logotyp ↔ sygnet)
   ========================================================================= */
function buildMega(){
  var cols = CLUSTERS.map(function(c){
    var items = c.services.map(function(s){
      return '<a class="mega__link" href="'+sol(s.slug)+'">'+s.abbr+'</a>';
    }).join("");
    return '<div class="mega__col"><h4><span class="mega__ic">'+clusterIcon(c.id)+'</span>'+
      '<a href="'+PAGES.hub+'#'+c.id+'">'+c.name+'</a></h4>'+items+'</div>';
  }).join("");
  return '<div class="mega" role="menu">'+
    '<div class="mega__inner">'+cols+'</div>'+
    '<div class="mega__foot"><span class="muted">Nie wiesz, od czego zacząć? Pomożemy dobrać rozwiązanie do Twojej sytuacji.</span>'+
    '<a class="link-arrow" href="'+PAGES.hub+'">Wszystkie rozwiązania <span class="a">→</span></a></div></div>';
}

function renderHeader(active){
  var el = document.getElementById("site-header");
  if(!el) return;
  var navLinks = NAV.map(function(i){
    var cur = active===i.href ? ' aria-current="page"' : '';
    return '<div class="nav__item"><a class="nav__link" href="'+i.href+'"'+cur+'>'+i.label+'</a></div>';
  }).join("");

  var mobileClusters = CLUSTERS.map(function(c){
    return '<a class="sub" href="'+PAGES.hub+'#'+c.id+'">'+c.name+'</a>';
  }).join("");
  var mobileMain = NAV.map(function(i){return '<a href="'+i.href+'">'+i.label+'</a>';}).join("");

  el.innerHTML =
  '<header class="site-header">'+
    '<div class="container">'+
      '<nav class="nav" aria-label="Główna">'+
        '<a class="nav__logo" href="'+PAGES.home+'" aria-label="Allaris — strona główna">'+
          '<img class="nav__logotype" src="assets/logotyp-black.png" alt="Allaris">'+
          '<span class="nav__sygnet">'+sygnetSVG()+'</span></a>'+
        '<div class="nav__links">'+
          '<div class="nav__item" id="rozw-item">'+
            '<a class="nav__link" href="'+PAGES.hub+'"'+(active===PAGES.hub?' aria-current="page"':'')+' id="rozw-trigger" aria-haspopup="true" aria-expanded="false">Rozwiązania <span class="caret">▼</span></a>'+
            buildMega()+
          '</div>'+
          navLinks+
        '</div>'+
        '<span class="nav__spacer"></span>'+
        '<div class="nav__cta">'+
          '<a class="btn btn--primary btn--sm" href="'+PAGES.contact+'" data-consult-modal>Darmowa konsultacja</a>'+
        '</div>'+
        '<button class="nav__burger" id="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>'+
      '</nav>'+
    '</div>'+
  '</header>'+
  '<div class="mobile-nav" id="mobileNav">'+
    '<a href="'+PAGES.hub+'"><b>Rozwiązania</b></a>'+ mobileClusters +
    mobileMain +
    '<div class="cta-wrap"><a class="btn btn--primary btn--block" href="'+PAGES.contact+'" data-consult-modal>Darmowa konsultacja</a></div>'+
  '</div>';

  wireHeader();
}

function wireHeader(){
  var item = document.getElementById("rozw-item");
  var trigger = document.getElementById("rozw-trigger");
  if(item){
    var open=false, mega=item.querySelector(".mega");
    function set(o){
      open=o;
      item.classList.toggle("open",o);
      trigger.setAttribute("aria-expanded",o);
      if(mega){ requestAnimationFrame(function(){ mega.classList.toggle("show",o); }); }
    }
    item.addEventListener("mouseenter",function(){set(true);});
    item.addEventListener("mouseleave",function(){set(false);});
    trigger.addEventListener("click",function(e){
      if(!open){ e.preventDefault(); set(true); } /* pierwszy klik/tap otwiera; drugi nawiguję */
    });
    document.addEventListener("click",function(e){ if(!item.contains(e.target)) set(false); });
  }
  var burger=document.getElementById("burger"), mob=document.getElementById("mobileNav");
  if(burger&&mob){
    burger.addEventListener("click",function(){
      var o=!mob.classList.contains("open");
      mob.classList.toggle("open",o);
      burger.setAttribute("aria-expanded",o);
    });
  }
}

/* Znakowanie: pełny logotyp na górze strony, sygnet po przescrollowaniu hero.
   Crossfade wewnątrz boksu o stałych wymiarach — wysokość i pozycja menu
   pozostają niezmienne. */
function initLogoSwap(){
  var header=document.querySelector(".site-header");
  if(!header) return;
  function onScroll(){
    header.classList.toggle("scrolled", window.scrollY > 160);
  }
  window.addEventListener("scroll",onScroll,{passive:true});
  onScroll();
}

/* =========================================================================
   FOOTER
   ========================================================================= */
function renderFooter(){
  var el=document.getElementById("site-footer");
  if(!el) return;
  var solLinks = CLUSTERS.map(function(c){
    return '<a href="'+PAGES.hub+'#'+c.id+'">'+c.name+'</a>';
  }).join("");
  el.innerHTML =
  '<footer class="site-footer">'+
    '<div class="container">'+
      '<div class="footer-statement"><span>Secure online,<br>calm offline.</span>'+
        '<a class="btn btn--primary" href="'+PAGES.contact+'">Umów darmową konsultację</a></div>'+
      '<div class="footer-grid">'+
        '<div class="footer-col footer-brand">'+
          '<img class="footer-logotype" src="assets/logotyp-white.png" alt="Allaris">'+
          '<p class="small" style="color:rgba(255,255,255,.62)">Niezależny partner cyberbezpieczeństwa end-to-end. Projektujemy, wdrażamy i utrzymujemy bezpieczne środowiska cyfrowe — i bierzemy odpowiedzialność za całość.</p>'+
          '<p class="footer-reg">Esysco sp. z o.o. — marka Allaris<br>ul. Seweryna Mielżyńskiego 20/5A, 61-725 Poznań<br>NIP 7811885510 · REGON 302450525 · KRS 0000465139<br>Biura: Poznań · Warszawa · Berlin<br>contact@allaris.pl · +48 61 646 00 47</p>'+
          '<div class="footer-social">'+
            '<a href="#" aria-label="LinkedIn">in</a><a href="#" aria-label="X">X</a><a href="#" aria-label="YouTube">YT</a>'+
          '</div>'+
        '</div>'+
        '<div class="footer-col"><h4>Rozwiązania</h4>'+solLinks+'</div>'+
        '<div class="footer-col"><h4>Firma</h4>'+
          '<a href="'+PAGES.suppliers+'">Dostawcy</a>'+
          '<a href="'+PAGES.process+'">Jak pracujemy</a>'+
          '<a href="'+PAGES.cases+'">Realizacje</a>'+
          '<a href="'+PAGES.blog+'">Poradnik</a>'+
          '<a href="'+PAGES.events+'">Eventy i webinary</a>'+
          '<a href="'+PAGES.contact+'">Kontakt</a>'+
        '</div>'+
        '<div class="footer-col footer-news"><h4>Newsletter</h4>'+
          '<p class="small" style="color:rgba(255,255,255,.55)">Raz w miesiącu: NIS2, DORA, eIDAS 2.0 i praktyka bezpieczeństwa — bez spamu.</p>'+
          '<div class="form-inline" data-newsletter>'+
            '<input class="input" type="email" placeholder="Adres e-mail" aria-label="Adres e-mail">'+
            '<button class="btn btn--primary btn--sm" type="button">Zapisz się</button>'+
          '</div>'+
          '<p class="form-msg" data-news-msg></p>'+
        '</div>'+
      '</div>'+
      '<div class="footer-bottom">'+
        '<span>© '+new Date().getFullYear()+' Allaris. Wszelkie prawa zastrzeżone.</span>'+
        '<span><a href="'+PAGES.privacy+'">Polityka prywatności</a> · <a href="'+PAGES.privacy+'#cookies">Cookies</a> · <a href="'+PAGES.privacy+'#rodo">RODO</a></span>'+
        '<span class="footer-credit">Branding &amp; Website by <b>SymbolStudio</b></span>'+
      '</div>'+
    '</div>'+
  '</footer>';
  wireNewsletters();
}

/* =========================================================================
   ROZWIĄZANIA (Home) — 5 dużych kafli-kategorii; klik rozwija listę usług
   ========================================================================= */
function renderSolutions(){
  var wrap=document.getElementById("solutions-mount");
  if(!wrap) return;
  wrap.innerHTML = '<div class="sol-grid">'+CLUSTERS.map(function(c,i){
    /* wide (dolny rząd) = 4. i 5. kafel */
    var isWide = i>=3;
    /* dense = klastry z większą liczbą pozycji, aby zmieściły się na wysokość */
    var isDense = c.services.length>=8;
    var items = c.services.map(function(s){
      return '<li><a class="sol-tile__svc" href="'+sol(s.slug)+'">'+
        '<span class="sol-tile__svc__name">'+s.abbr+'</span>'+
        '<span class="sol-tile__svc__cta">Przejdź do rozwiązania →</span>'+
      '</a></li>';
    }).join("");
    return '<div class="sol-tile'+(isWide?' sol-tile--wide':'')+(isDense?' sol-tile--dense':'')+'" id="'+c.id+'">'+
      /* STAN NIEAKTYWNY */
      '<div class="sol-tile__state sol-tile__state--inactive">'+
        '<h3 class="sol-tile__title">'+c.name+'</h3>'+
        '<p class="sol-tile__desc">'+c.desc+'</p>'+
        '<div class="sol-tile__illu" aria-hidden="true">'+clusterIcon(c.id)+'</div>'+
      '</div>'+
      '<span class="sol-tile__plus" aria-hidden="true">+</span>'+
      /* STAN AKTYWNY */
      '<div class="sol-tile__state sol-tile__state--active">'+
        '<h3 class="sol-tile__title">'+c.name+'</h3>'+
        '<ul class="sol-tile__list">'+items+'</ul>'+
      '</div>'+
    '</div>';
  }).join("")+'</div>';
}

/* Hub rozwiązań — pełne bloki kategorii */
function renderHubClusters(){
  var mount=document.getElementById("hub-clusters");
  if(!mount) return;
  mount.innerHTML = CLUSTERS.map(function(c){
    var cards=c.services.map(function(s){
      return '<a class="sol-card" href="'+sol(s.slug)+'">'+
        '<span class="sol-card__name">'+s.abbr+(s.isNew?'<span class="new">Nowość eIDAS 2.0</span>':'')+'</span>'+
        '<span class="sol-card__desc">'+s.desc+'</span>'+
        '<span class="sol-card__go">Przejdź do rozwiązania <span aria-hidden="true">→</span></span>'+
      '</a>';
    }).join("");
    return '<div class="hub-block" id="'+c.id+'">'+
      '<div class="hub-block__head">'+
        '<div><span class="hub-block__n"><span class="mega__ic">'+clusterIcon(c.id)+'</span>Klaster 0'+c.n+'</span>'+
        '<h3>'+c.name+'</h3></div>'+
        '<div><p class="muted">'+c.desc+'</p></div>'+
      '</div>'+
      '<div class="sol-cards">'+cards+'</div></div>';
  }).join("");
}

/* Dostawcy — grid kafli */
function renderSuppliers(mountId, linked){
  var mount=document.getElementById(mountId);
  if(!mount) return;
  mount.innerHTML = SUPPLIERS.map(function(s){
    var inner =
      '<span class="sup-tile__logo">'+s.logo+'</span>'+
      '<span class="sup-tile__name">'+s.origin+'</span>'+
      '<span class="sup-tile__desc">'+s.desc+'</span>';
    return linked
      ? '<a class="sup-tile" href="'+PAGES.supplier+'?dostawca='+s.id+'">'+inner+'</a>'
      : '<div class="sup-tile">'+inner+'</div>';
  }).join("");
}

/* =========================================================================
   MARQUEE — duplikacja zawartości dla płynnej pętli
   ========================================================================= */
function initMarquee(id){
  var root=document.getElementById(id); if(!root) return;
  var track=root.querySelector(".marquee__track"); if(!track) return;
  track.innerHTML += track.innerHTML; /* drugi komplet = brak szwu w pętli */
}

/* =========================================================================
   DLACZEGO ALLARIS — filary sterują zdjęciem; auto-rotacja co 5 s
   ========================================================================= */
function initWhyRotator(){
  var root=document.getElementById("why"); if(!root) return;
  var pillars=root.querySelectorAll(".why-pillar");
  var imgs=root.querySelectorAll(".why-img");
  if(!pillars.length) return;
  var idx=0, timer=null;
  function go(n){
    idx=n%pillars.length;
    pillars.forEach(function(p,k){p.classList.toggle("active",k===idx);});
    imgs.forEach(function(im,k){im.classList.toggle("active",k===idx);});
  }
  function arm(){ clearInterval(timer); timer=setInterval(function(){go(idx+1);},5000); }
  pillars.forEach(function(p,k){
    p.addEventListener("click",function(){ go(k); arm(); });
  });
  go(0); arm();
}

/* =========================================================================
   FORMULARZE / FAQ / KOTWICE
   ========================================================================= */
function wireNewsletters(){
  document.querySelectorAll("[data-newsletter]").forEach(function(box){
    var input=box.querySelector("input");
    var btn=box.querySelector("button");
    var msg=box.parentNode.querySelector("[data-news-msg]") || box.nextElementSibling;
    btn.addEventListener("click",function(){
      var v=(input.value||"").trim();
      if(!msg) return;
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){
        msg.textContent="Podaj poprawny adres e-mail."; return;
      }
      msg.textContent="Dziękujemy! Sprawdź skrzynkę — potwierdź zapis jednym kliknięciem.";
      input.value="";
    });
  });
}

function initFAQ(){
  document.querySelectorAll(".faq__q").forEach(function(q){
    q.setAttribute("aria-expanded","false");
    q.addEventListener("click",function(){
      var item=q.closest(".faq__item");
      var open=item.classList.toggle("open");
      q.setAttribute("aria-expanded",open);
    });
  });
}

function initAnchors(){
  document.addEventListener("click",function(e){
    var a=e.target.closest && e.target.closest('a[href^="#"]');
    if(!a) return;
    var id=a.getAttribute("href").slice(1);
    var t=id&&document.getElementById(id);
    if(t){e.preventDefault();t.scrollIntoView({behavior:"smooth",block:"start"});}
  });
}

/* =========================================================================
   MODAL KONSULTACJI — popup z blurem tła; wszystkie CTA → kontakt.html
   otwierają modal zamiast przeładowania strony (strona zostaje jako fallback)
   ========================================================================= */
function initConsultModal(){
  if(document.getElementById("consult-modal")) return;
  var overlay=document.createElement("div");
  overlay.className="modal-overlay";
  overlay.id="consult-modal";
  overlay.innerHTML=
    '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="cm-title">'+
      '<button class="modal__close" type="button" aria-label="Zamknij">✕</button>'+
      '<span class="modal__eyebrow">Zacznijmy</span>'+
      '<h2 id="cm-title">Darmowa konsultacja</h2>'+
      '<p class="modal__sub">W 60 minut przeanalizujemy Twoją sytuację i ułożymy realny plan działania. Zostaw dane — odezwiemy się w ciągu jednego dnia roboczego.</p>'+
      '<div class="grid g2">'+
        '<div class="field"><label class="small muted" for="cm_name">Imię i nazwisko *</label><input class="input" id="cm_name" placeholder="Jan Kowalski"></div>'+
        '<div class="field"><label class="small muted" for="cm_company">Firma</label><input class="input" id="cm_company" placeholder="Nazwa firmy"></div>'+
        '<div class="field"><label class="small muted" for="cm_email">E-mail służbowy *</label><input class="input" id="cm_email" type="email" placeholder="jan.kowalski@firma.pl"></div>'+
        '<div class="field"><label class="small muted" for="cm_phone">Telefon</label><input class="input" id="cm_phone" placeholder="+48 600 000 000"></div>'+
      '</div>'+
      '<div class="field" style="margin-top:14px"><label class="small muted" for="cm_msg">Czego dotyczy konsultacja?</label>'+
        '<textarea class="input" id="cm_msg" rows="3" placeholder="Np. przygotowanie do NIS2, wdrożenie HSM, podpis kwalifikowany, centralne IAM…"></textarea></div>'+
      '<label class="consent" style="margin-top:14px;color:var(--faint)"><input type="checkbox" id="cm_consent"> Wyrażam zgodę na przetwarzanie moich danych przez Esysco sp. z o.o. w celu kontaktu i umówienia konsultacji. *</label>'+
      '<div style="margin-top:20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">'+
        '<button class="btn btn--primary" type="button" id="cm_submit">Umów konsultację</button>'+
        '<span class="small muted">lub napisz: <b style="color:var(--ink)">contact@allaris.pl</b></span>'+
      '</div>'+
      '<p class="form-msg" id="cm_result" style="margin-top:12px"></p>'+
    '</div>';
  document.body.appendChild(overlay);

  var lastFocus=null;
  function open(){
    lastFocus=document.activeElement;
    overlay.classList.add("open");
    document.body.classList.add("no-scroll");
    var f=document.getElementById("cm_name"); if(f) setTimeout(function(){f.focus();},60);
  }
  function close(){
    overlay.classList.remove("open");
    document.body.classList.remove("no-scroll");
    if(lastFocus&&lastFocus.focus) lastFocus.focus();
  }
  window.openConsultModal=open;

  overlay.querySelector(".modal__close").addEventListener("click",close);
  overlay.addEventListener("click",function(e){ if(e.target===overlay) close(); });
  document.addEventListener("keydown",function(e){ if(e.key==="Escape"&&overlay.classList.contains("open")) close(); });

  document.getElementById("cm_submit").addEventListener("click",function(){
    var name=document.getElementById("cm_name").value.trim();
    var email=document.getElementById("cm_email").value.trim();
    var consent=document.getElementById("cm_consent").checked;
    var out=document.getElementById("cm_result");
    if(!name){ out.textContent="Podaj imię i nazwisko."; return; }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ out.textContent="Podaj poprawny adres e-mail."; return; }
    if(!consent){ out.textContent="Zaznacz zgodę na kontakt — bez niej nie możemy się odezwać."; return; }
    out.textContent="Dziękujemy! Odezwiemy się w ciągu jednego dnia roboczego, żeby umówić termin.";
  });

  /* modal otwiera WYŁĄCZNIE CTA w menu (nagłówek + menu mobilne);
     pozostałe CTA konsultacji prowadzą normalnie na stronę kontakt.html */
  document.addEventListener("click",function(e){
    var a=e.target.closest && e.target.closest('[data-consult-modal]');
    if(!a) return;
    e.preventDefault();
    var mob=document.getElementById("mobileNav");
    if(mob) mob.classList.remove("open");
    open();
  });
}

/* =========================================================================
   BOOT
   ========================================================================= */
function initWireframe(active){
  renderHeader(active);
  renderFooter();
  renderSolutions();
  renderHubClusters();
  renderSuppliers("suppliers-mount", true);
  initMarquee("clients-marquee");
  initMarquee("testi-marquee");
  initWhyRotator();
  initFAQ();
  initLogoSwap();
  initAnchors();
  initConsultModal();
}
document.addEventListener("DOMContentLoaded",function(){
  initWireframe(window.__ACTIVE_PAGE__ || "index.html");
});
