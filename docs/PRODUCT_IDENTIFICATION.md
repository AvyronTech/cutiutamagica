# Identificare și etichetare produse

## Arhitectură și utilizare

Modulul este parte din magazinul TanStack Start / Cloudflare Worker. Folosește D1 pentru
identificatori și trasabilitate, `inventory_levels` și `inventory_movements` pentru stocul real,
`product_documents` pentru documentele deja aprobate și `personalization_requests` pentru
producția personalizată. Nu introduce un serviciu sau o bază de date separată. Bibliotecile
gratuite `jsbarcode`, `qrcode.react`, `pdf-lib` și `fflate` generează local reprezentările
grafice și fișierele. Nu se salvează copii redundante ale codurilor QR sau de bare.

1. Deschide **Produse → Identificare & Etichetare** sau secțiunea de identificare din fișa
   tehnică a produsului. Introdu un SKU cu scannerul USB/Bluetooth și apasă Enter pentru căutare.
2. Un produs nou primește automat un SKU unic. O variantă comercială nouă primește propriul SKU,
   un preț și stoc zero; rămâne inactivă până la configurarea completă în catalog. SKU-ul unui
   produs publicat nu poate fi schimbat. Codurile vechi, inclusiv cele arhivate, rămân rezervate.
3. Introdu numai un GTIN atribuit în mod real. Cifra de control este validată, iar sursa,
   documentul justificativ și statutul de verificare se completează în fișa tehnică. Un GTIN
   valid matematic rămâne **de verificat** până la verificarea atribuirii oficiale. Doar un GTIN
   verificat este transmis în feedul Merchant. Câmpul poate rămâne gol.
4. Recepționează lotul cu sursa, data, cantitatea și documentul. Operația actualizează registrul
   de mișcări și stocul existent. Asociază manual lotul cu liniile comenzilor pregătite/expediate;
   numărul de exemplare atribuite nu poate depăși cantitatea lotului sau a liniei de comandă.
   Soldul lotului exprimă cantitatea nealocată în trasabilitate; inventarul existent rămâne
   sursa de adevăr pentru stocul fizic.
5. Generează QR numai pentru pagina publică sau documentele publice aprobate. Verifică adresa
   înainte de export. Code 128 reprezintă SKU-ul intern; EAN/UPC/ITF14 reprezintă GTIN-ul
   verificat, dacă acesta există. Poți descărca SVG/PNG, PDF individual sau coli A4 de etichete.
6. Exportă CSV/XLSX pentru catalog, coduri, loturi și stoc. Codurile de personalizare apar numai
   dacă ai drept de citire a comenzilor. La import, verifică previzualizarea și erorile înainte
   de confirmare; valorile existente nu sunt suprascrise automat.

## Permisiuni și limite

- Citirea catalogului de identificare cere `catalog.read` și `inventory.read`; detaliile
  comenzilor și personalizărilor cer suplimentar `orders.read`.
- Schimbarea SKU și crearea variantelor cer `catalog.write`; loturile și serialele cer
  `inventory.write`; alocarea loturilor cere și `orders.read`; personalizările cer `orders.write`.
- Migrarea append-only `0058_product_identification.sql` păstrează identificatorii existenți,
  adaugă registre de rezervare, istoric, loturi, alocări, seriale opționale și legături spre
  personalizări. Aplicați-o în producție numai într-o lansare aprobată, după backup și verificarea
  istoricului D1. Codul aplicației și migrarea trebuie lansate împreună.
- Scanarea cu scanner de tip tastatură folosește căutarea din modul; integrarea cu ecranele de
  recepție și pregătire se face prin aceleași SKU-uri și legături de inventar/comandă, fără a
  schimba fluxurile lor existente. Alocarea lotului este încă o acțiune administrativă manuală.
- Serializarea este opțională și manuală. Etichetele interne nu înlocuiesc marcajele legale
  aplicabile produsului. Pentru print se recomandă proba fizică a codurilor cu scannerul și
  imprimanta folosite în atelier.
- eMAG și Trendyol sunt configurări de canal în proiect; modulul nu activează publicarea lor.
  Pentru produsele fără GTIN nu se fabrică un identificator. Regula finală pe fiecare canal se
  verifică înainte de conectarea activă.
