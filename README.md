# Triple Adventure Estates B.V. — Website

Minimalistische, professionele one-page landingspagina voor Triple Adventure Estates B.V.

## Bestanden

```
├── index.html    Hoofdpagina met alle content
├── styles.css    Styling (responsive, accessible)
└── README.md     Dit bestand
```

## Lokaal openen

**Optie 1 — Direct openen:**
Dubbelklik op `index.html` om de pagina in je browser te openen.

**Optie 2 — Via lokale server (aanbevolen):**
```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (npx, geen installatie nodig)
npx serve .
```
Open daarna `http://localhost:8000` in je browser.

## Placeholders invullen

Open `index.html` en zoek naar de volgende placeholders (bovenin het bestand staat een overzicht):

| Placeholder      | Waar invullen                          | Voorbeeld                        |
|------------------|----------------------------------------|----------------------------------|
| `[TELEFOON]`     | Contact sectie + JSON-LD + tel: link   | `+31 6 12345678`                 |
| `[ADRES]`        | Contact sectie + JSON-LD               | `Hoofdstraat 1, 1234 AB Stad`    |
| `[KVK-NUMMER]`   | Footer                                 | `12345678`                       |
| `[BTW-ID]`       | Footer + JSON-LD                       | `NL123456789B01`                 |
| `[SITE-URL]`     | Canonical, OG tags, JSON-LD            | `https://www.tripleadventures.nl`|

### E-mail/telefoon aanpassen

**E-mail wijzigen:**
Zoek in `index.html` naar `info@tripleadventures.nl` en vervang beide instanties:
1. De `mailto:` link
2. De zichtbare tekst
3. De JSON-LD `email` waarde

**Telefoon wijzigen:**
Zoek naar `[TELEFOON]` en vervang met het gewenste nummer in:
1. De `tel:` link (zonder spaties, bijv. `tel:+31612345678`)
2. De zichtbare tekst (met spaties voor leesbaarheid)
3. De JSON-LD `telephone` waarde

## Kenmerken

- **Geen dependencies** — Puur HTML + CSS, geen npm/bundlers nodig
- **Responsive** — Werkt op mobiel, tablet en desktop
- **Accessible** — Semantische HTML5, goede heading-structuur, focus states, contrast
- **SEO-ready** — Meta tags, Open Graph, JSON-LD structured data
- **Reduced motion** — Respecteert `prefers-reduced-motion` voor smooth scroll
- **Print-friendly** — Aangepaste print styles
- **High contrast** — Ondersteunt `prefers-contrast: high`

## Hosting

Upload alle bestanden naar je webserver of gebruik een statische hosting service zoals:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

Vergeet niet de `[SITE-URL]` placeholder te vervangen met je daadwerkelijke domein.
