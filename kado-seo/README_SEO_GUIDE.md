# Kapruka AI Shopping Agent SEO Implementation Guide
## Target: Rank #1 for "Kapruka" + AI/shopping queries

---

## FILES INCLUDED
| File | Where it goes |
|------|--------------|
| HEAD_SEO.html | Copy paste into your `index.html` <head> |
| sitemap.xml | Root of your `public/` folder |
| robots.txt | Root of your `public/` folder |
| _headers | Root of your project (Cloudflare Pages specific) |

---

## STEP 1 — Update index.html

Open your `index.html` and:
1. REPLACE the entire <head> content with HEAD_SEO.html
2. Keep your existing <link rel="icon"> and any Vite/React script tags
3. Make sure <title> is: `Kapruka AI Shopping Agent — AI Shopping Agent for Kapruka | Smart Sri Lankan Gift Finder`

---

## STEP 2 — Create og-image.png (CRITICAL)

Google and WhatsApp use this image when sharing your link.
- Size: 1200x630px
- Content: Kapruka AI Shopping Agent logo + "AI Shopping Agent for Kapruka" text
- Background: Dark (#0D0D0D) matching your brand
- Save as: `public/og-image.png`

Free tool: https://www.canva.com (use a 1200x630 template)

---

## STEP 3 — Add visible keyword-rich text to your app

Google can't rank what it can't READ. Your React app probably renders blank HTML to the crawler.

### Option A — Add meta + static HTML fallback (easiest)
In your `index.html` body, before the React root div, add:
```html
<noscript>
  <h1>Kapruka AI Shopping Agent — AI Shopping Agent for Kapruka</h1>
  <p>Kapruka AI Shopping Agent is an AI-powered shopping agent for Kapruka.com, Sri Lanka's largest online store. 
  Search for gifts, cakes, flowers, and products using natural language AI. 
  Built for the Kapruka Agent Challenge 2026.</p>
  <p>Keywords: Kapruka, Kapruka AI, Kapruka shopping, Sri Lanka online shopping, 
  AI gift finder, Kapruka cakes, Kapruka flowers, Kapruka Agent</p>
</noscript>
```

### Option B — Pre-render / SSR (best for SEO long term)
If you're on Vite, add `vite-plugin-prerender`:
```
npm install vite-plugin-prerender
```
This bakes your React app into static HTML so Google can read the actual content.

---

## STEP 4 — Submit to Google Search Console

1. Go to: https://search.google.com/search-console
2. Add property: `ai-shopping-agent.pages.dev`
3. Verify ownership (HTML tag method — paste the meta tag in <head>)
4. Submit sitemap: `https://ai-shopping-agent.pages.dev/sitemap.xml`
5. Request indexing of your homepage

This tells Google "hey I exist, please crawl me NOW."

---

## STEP 5 — Build backlinks (biggest ranking factor)

Google ranks sites with LINKS pointing to them. Do these:

| Action | Impact | Time |
|--------|--------|------|
| Post on LinkedIn: "Built Kapruka AI Shopping Agent for Kapruka Agent Challenge" + link | HIGH | 10 min |
| Post on Medium/@Bijonn: write a dev blog about Kapruka AI Shopping Agent + link | HIGH | 1 hr |
| Submit to ProductHunt | MED | 30 min |
| Add to your GitHub README + portfolio | MED | 5 min |
| Post in Yarl Salesforce Ohana / tech communities | MED | 10 min |
| Submit to SriLankan tech Discord/Facebook groups | MED | 10 min |
| Comment on Kapruka-related Reddit threads with your link | LOW-MED | varies |

---

## STEP 6 — Page speed (Core Web Vitals)

Google uses speed as a ranking signal. Check:
https://pagespeed.web.dev/analysis?url=https://ai-shopping-agent.pages.dev/

Target: 90+ on mobile. Cloudflare Pages is already fast, but ensure:
- Images are WebP format
- og-image.png is compressed
- No blocking JS in <head>

---

## STEP 7 — Add your site to Bing (bonus)
https://www.bing.com/webmasters
Submit sitemap there too. Bing powers several AI search engines.

---

## KEYWORD STRATEGY

Primary targets (what people type):
- "Kapruka AI" — very low competition, you should own this
- "Kapruka shopping agent" — new keyword, you created this category
- "Kapruka gift finder AI" — long tail, easy to rank
- "AI shopping Sri Lanka" — medium competition
- "Kapruka Agent Challenge 2026" — niche, rank instantly

Secondary targets:
- "Kapruka AI Shopping Agent Kapruka"
- "Kapruka AI assistant"
- "Sri Lanka gift AI"

---

## REALISTIC TIMELINE

| Week | Expected result |
|------|----------------|
| Day 1-3 | Google finds your site after sitemap submit |
| Week 1 | Site appears in Google for "Kapruka AI Shopping Agent Kapruka" exact search |
| Week 2-3 | Ranks for "Kapruka AI" if you have 2-3 backlinks |
| Month 1 | Appears in top 10 for "Kapruka shopping agent" |
| Month 2-3 | Top 3 for "Kapruka AI" with consistent backlinks |

Note: "Kapruka" alone is very hard — Kapruka.com itself will dominate.
Target "Kapruka AI" and "Kapruka shopping agent" — these are yours to win.
