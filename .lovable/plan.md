
# Plan de implementare — Cutiuța Magică v2

Această schimbare este foarte mare. O împart în etape clare. Înainte să încep, am nevoie de câteva confirmări (vezi la final).

## 1. Backend (Lovable Cloud)
Activez Lovable Cloud și creez:

**Tabele:**
- `profiles` (id, full_name, phone, created_at) — auto-creat pe signup
- `user_roles` (user_id, role enum: 'admin' | 'client') — separat, cu funcția `has_role()` security definer
- `products` (id, slug, name, category, section enum: 'poveste' | 'emotie' | 'unice', tagline, description, story, melody, price, details jsonb, images jsonb [{url, label, position, angle}], model_3d_url, active, sort_order)
- `product_reviews` (id, product_id, author_name, rating, body, created_at) — generate prin AI, editabile de admin
- `addresses` (id, user_id, label, street, city, county, postal_code, phone, is_default)
- `payment_methods` (id, user_id, type enum: 'card_saved' | 'ramburs', last4, brand, is_default) — fără date sensibile reale
- `orders` (id, user_id, status, subtotal, shipping_fee, total, shipping_method, payment_method, address_snapshot jsonb, notes, created_at)
- `order_items` (id, order_id, product_id, qty, unit_price)
- `promotions` (id, code, type enum: 'percent' | 'fixed' | 'free_shipping', value, min_order, starts_at, ends_at, active, usage_limit, used_count)
- `faq_items` (id, question, answer, sort_order, active)
- `site_settings` (key, value jsonb) — pentru linkuri sociale, ANPC etc.

**RLS:** Clienții văd doar datele proprii. Adminul (`has_role(auth.uid(),'admin')`) vede tot. Produsele/FAQ-ul sunt publice la citire.

## 2. Autentificare
- Pagini `/login` și `/inregistrare` (email + parolă + Google)
- Layout pathless `_authenticated` cu redirect către `/login`
- Layout `_authenticated/_admin` cu verificare `has_role`
- Primul user pe care îl indici devine admin (din SQL, după înregistrare)

## 3. Contul clientului `/cont`
Tab-uri: **Profil**, **Comenzile mele**, **Adrese**, **Metode de plată**.

## 4. Dashboard admin `/admin`
Layout cu sidebar (shadcn sidebar), panouri:
- Overview (vânzări, comenzi recente, top produse, grafice cu recharts)
- Comenzi (listă, detalii, schimbare status)
- Produse (CRUD complet, imagini, descriere personalizată per imagine/melodie)
- Promoții (CRUD coduri, reduceri, transport gratuit)
- Reviews (CRUD, generare cu AI)
- FAQ (CRUD)
- Clienți
- Setări site (sociale, ANPC, etc.)

Layout inspirat de imaginea dashcontrol — carduri KPI sus, grafice mijloc, tabel jos.

## 5. Homepage — 3 secțiuni de produse
Fiecare cu carousel orizontal (embla) cu săgeți stânga/dreapta și swipe pe mobil:
- **Descoperă povestea** (5 cutiuțe)
- **Trăiește emoția** (5 cutiuțe) — produsul principal afișat se rotește stânga/dreapta la swipe/drag
- **Descoperă alte obiecte unice** (5 produse) — același pattern

Toate cele 15 produse inițial vor fi seedate în DB cu imagini din `src/assets` (refolosesc cele existente + generez noi cu AI unde lipsesc unghiuri).

## 6. Pagină produs `/produs/$slug`
- Imagine centrală + thumbnails: frontal, lateral, sus, capac închis, 3D
- Descriere personalizată pe imagine + melodie (admin o editează)
- Reviews (3-5 generate cu AI: nume românești tip "Andreea P.", "Mihai D.", gramatică ușor imperfectă, relevante)
- Buton adaugă în coș

## 7. Ofertă nouă (înlocuiește toate cele existente)
- Comandă minimă 250 lei → transport gratuit
- Sub 250 lei: 25 lei curier sau 12,99 lei easybox Sameday
- La checkout: alegere **easybox / curier** și **card online / ramburs**

Șterg complet logica „1 cutiuță 89 lei / 2 cutiuțe 150 lei / 3 cutiuțe 75 lei buc". Preț per produs vine din DB.

## 8. FAQ pe homepage
Accordion shadcn cu 6 întrebări:
1. Calitatea produselor
2. Livrare (24/48h)
3. Politica de retur (14 zile)
4. Garanție (1 an / schimb gratuit)
5. Metode de plată
6. Una despre personalizare/ambalaj

## 9. Cookies
- Banner la prima vizită: minimalist, tematic cutiuță (mic, jos, cu emoji 🎵 sau iconiță), cu buton mare **„Doar necesare"** și un link mic „Setări"
- Stocat în localStorage

## 10. Footer
- Logo „Powered by Avyron" → link `https://avyron.ro`
- Cele 2 imagini ANPC (SOL + SAL) cu linkuri către `anpc.ro/ce-este-sal` și `ec.europa.eu/consumers/odr`
- Linkuri: Politica cookies, Politica de confidențialitate (pagini dedicate)
- Sociale: Instagram, Facebook, TikTok (doar vizual, fără linkuri reale acum)

## 11. Plăți
Pentru plata online cu cardul recomand **Stripe payments built-in** Lovable (fără cont/cheie API necesare). Rambursul nu necesită integrare — doar marchează comanda ca „ramburs" în DB.

## Detalii tehnice
- Stack actual: TanStack Start + Lovable Cloud (Supabase) + shadcn + Tailwind
- Imagini noi cu AI doar unde lipsesc unghiuri (capac închis, vedere de sus, 3D mock)
- Reviews generate cu Lovable AI Gateway (`google/gemini-3-flash-preview`)
- Carousel: embla cu drag, săgeți custom în stilul existent (wood/gold)

---

## ⚠️ Ce am nevoie să confirmi înainte să încep

1. **Cele 15 produse inițiale**: să refolosesc cele 6-8 produse existente din `src/data/products.ts` + să generez restul cu nume/melodii noi în stilul existent? Sau ai o listă anume?
2. **Logo Avyron**: îl ai ca fișier sau să-l preiau de pe `avyron.ro`?
3. **Imagini ANPC**: folosesc cele oficiale standard (SOL + SAL de pe anpc.ro)?
4. **Plăți card**: ok să activez Stripe payments (built-in Lovable, fără cont propriu)?
5. **Primul admin**: ce email vrei să fie marcat ca admin după ce te înregistrezi?

Răspunde la cele de mai sus și încep imediat — voi livra în mai multe runde (Cloud + auth + DB seed → homepage + produs → admin → checkout + plăți → cookies/FAQ/footer).
