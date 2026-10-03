# CLAUDE.md — Client Websites

Rules for any AI assistant working in this repository. Read this file in full before starting work.

## Overview
- This repo contains websites built for client businesses (mostly businesses that don't have a website yet).
- Price: from **80,000 ₸**, depending on scope. Final price is set by contract.
- **Website content is written in Russian.** Docs in this repo (`.md` files) are written in English.
- Talk to the developer in Russian unless they write in another language.
- Hosting: every client site is deployed to **Netlify** from this GitHub repo.

---

## HARD RULES (never break these)

1. **Nothing about the developers on the site.** No names, nicknames, contacts, social links, emails, phone numbers, "made by", "developed by", "powered by", "website by" or signatures. This applies to:
   - visible text, footers, About pages;
   - `<meta name="author">`, `<meta name="generator">` and any other meta tags;
   - HTML/CSS/JS comments, `README`s, `package.json` `author` fields, file names;
   - Netlify site names and URLs (use the client's business name instead).
2. **Nothing about how the site was made.** No mentions of AI, Claude, ChatGPT, templates, generators or build tools anywhere visible to visitors or in the shipped code (comments, meta, console logs, credits).
3. **The site is only about the client's business.** Don't mention OfficeDom/ОфисДом, partners, other clients or any third-party companies.
4. **No invented facts.** Don't make up services, prices, licenses, awards, reviews, statistics or "years in business". Business name, services, prices, contacts, address, opening hours, reviews and legal details must come from the client.
5. **No content without rights.** No copied photos, logos or text. Stock images only with a proper license.
6. **Missing content = ask, don't invent.** Use clearly marked placeholders (e.g. `[ЗАГЛУШКА: телефон]`) and list them for the developer.
7. **User data must never leak.** Form and registration data must only go to the client's trusted endpoint (see Security below).
8. **Do exactly what the client asked.** New ideas get suggested to the developer first, not added silently.
9. **Report honestly.** If a test fails, a deadline is at risk or something doesn't work, say it plainly with the facts.

Allowed footer content: `© <Business name> <year>`, plus the client's contacts and the privacy policy link.

---

## Workflow for a new client

1. **Deadline.** As soon as the developer mentions a new site, set a deadline of **start date + 5 days**.
   - If a Google Calendar tool is available, create an event named `Дедлайн сайта — <Business name>` (all-day or 18:00, reminders 1 day and 2 hours before; description: site type, main goal, folder path, start date).
   - Otherwise write the deadline in `STATUS.md` and remind the developer to add it to their calendar.
   - Move or cancel a deadline only with the developer's approval.
2. **Folder.** Create `<Business name>/` with `BRIEF.md` and `STATUS.md` (see structure below).
3. **Brief.** Go through the brief questions below. Ask about anything unclear and don't guess. Don't start building until the key points are answered. Save the answers in `BRIEF.md`.
4. **Skills.** Before building, suggest 3–5 relevant skills (see Skills below), with one line each on why, and wait for the developer to choose.
5. **Build.** Russian content, real client data only, placeholders marked and listed.
6. **Test.** Run the security checklist, then check responsiveness (mobile/tablet/desktop), speed, broken links, forms and console errors, and confirm form data goes only where it should.
7. **Hand-off.** Write a short report (see Reporting), send files and screenshots, update `STATUS.md`.
8. **After hand-off.** Log client change requests in `STATUS.md` and make only the agreed changes.

---

## Brief questions (ask before starting)

**Business:** exact business name as it should appear on the site; industry, products and key services; city, address(es), opening hours; contacts for the site (phone, WhatsApp, email, social links, 2GIS); logo, brand colors, brand book; their own photos or stock.

**Goal & scope:** site type (landing / multi-page / catalog / booking / shop); main visitor action (call, request, order, booking); list of pages or sections; reference sites they like; languages (RU / KZ / EN).

**Features:** forms (fields, and where requests go: email / Telegram / CRM / Google Sheets); registration, user accounts or online payment (affects security and price); online booking, calculator, chat; integrations (analytics, pixels, maps, messengers).

**Technical:** domain and hosting (whose name, who pays); who updates content later; need for a CMS or admin panel; client deadline and priorities.

**Legal:** privacy policy and consent to personal data processing (required if there are forms); company details for an offer or contract if needed; anything that must **not** be published.

**Agreement:** final price and scope; what's included and what counts as paid extra work; post-launch support (included or not, and for how long).

---

## Security checklist (required before hand-off)

Report each item as OK / issue / not applicable.

**Data & forms**
- [ ] Forms submit only to the client's trusted backend or service (e.g. Netlify Forms, the client's email or Telegram bot), never to unknown endpoints.
- [ ] No personal data sent to analytics, pixels or third-party scripts.
- [ ] No personal data in URLs (query params), logs, or localStorage unless needed.
- [ ] HTTPS only, no mixed content.
- [ ] Forms collecting personal data have a consent checkbox + privacy policy link.
- [ ] Input validation and sanitization on both client and server.
- [ ] Spam protection (honeypot / rate limit) that doesn't block real users.

**Authentication (if there's registration or user accounts)**
- [ ] Passwords stored only as hashes (bcrypt/argon2).
- [ ] No passwords, tokens or keys in frontend code or in the repo.
- [ ] Secrets only in environment variables (Netlify env vars), never in Git. `.gitignore` covers `.env*`.
- [ ] Session cookies are httpOnly, Secure, SameSite.
- [ ] Login rate limiting, and password reset via a one-time link.
- [ ] API responses don't leak extra fields, passwords or other users' records.

**Web vulnerabilities**
- [ ] XSS: user output escaped, no unsanitized `innerHTML` / `dangerouslySetInnerHTML`.
- [ ] CSRF protection on requests that change data.
- [ ] Parameterized queries (no SQL/NoSQL injection).
- [ ] IDOR: access checked on every object.
- [ ] Security headers (via `netlify.toml` or `_headers`): CSP, X-Content-Type-Options, Referrer-Policy, HSTS, X-Frame-Options.
- [ ] CORS restricted, no `*` on private APIs.
- [ ] `.env`, `.git`, backups and service files are not publicly reachable.

**Dependencies & leftovers**
- [ ] `npm audit` (if there are dependencies) shows no critical issues.
- [ ] No debug info, stack traces, test data, demo accounts or `console.log` noise in production.
- [ ] **No developer personal info or "made with" traces anywhere** (search the site folder for names, emails, "Claude", "AI", "generator").

Tools: the `security-review` skill, plus the browser console and network tab to see where form data goes.

---

## Skills to suggest before building

| Task | Skill | Source |
|---|---|---|
| Main anti-generic design (almost always) | `design-taste-frontend` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) |
| Premium, "expensive" look | `high-end-visual-design` | Leonxlnx/taste-skill |
| Clean editorial minimalism | `minimalist-ui` | Leonxlnx/taste-skill |
| Editorial typography + strong GSAP scroll | `gpt-taste` | Leonxlnx/taste-skill |
| Client already has a site to upgrade | `redesign-existing-projects` | Leonxlnx/taste-skill |
| Reference images per section | `imagegen-frontend-web` | Leonxlnx/taste-skill |
| Build strictly from a generated mockup | `image-to-code` | Leonxlnx/taste-skill |
| Gesture UI, spring motion | `apple-design` | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| Detail polish, micro-interactions | `emil-design-eng` | emilkowalski/skills |
| Where to add motion | `find-animation-opportunities` | emilkowalski/skills |
| Audit existing animations | `improve-animations`, `review-animations` | emilkowalski/skills |
| Landing copy, headlines, CTAs | `copywriting` | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) |
| Persuasion triggers (truthful only) | `marketing-psychology` | coreyhaines31/marketingskills |
| Security review before hand-off | `security-review` | built in |
| General code review | `code-review` | built in |
| Per-client tech notes | `init` | built in |

Paid image or video generation only on request, after confirming with the developer.

---

## Repository structure

```
websites/
├── CLAUDE.md                 ← this file
├── .gitignore
└── <Business name>/          ← one folder per client, named after the business
    ├── BRIEF.md              ← brief answers, agreements, price
    ├── STATUS.md             ← status, deadline, security results, change requests
    ├── site/                 ← site source (this is what Netlify deploys)
    └── assets/               ← logo, photos, fonts from the client
```

- Name the folder after the business as customers know it (e.g. `Автосервис Победа`). If that's awkward for file paths, use a readable folder name and record the exact legal or brand name in `BRIEF.md`.
- One client = one folder. Never mix projects.
- No developer personal data in folder names, file names or commit messages.

**Netlify:** one Netlify site per client, linked to this repo, with **base directory = `<Business name>/site`** (and the build command / publish dir if a build step exists). Name the Netlify site after the client's business. Keep secrets in Netlify environment variables only.

### STATUS.md template
```
# <Business name>
- Start: YYYY-MM-DD
- Deadline: YYYY-MM-DD
- Site type:
- Status: brief / development / testing / hand-off / changes / done
- Skills:
- Netlify URL:
- Security: checklist results
- Open questions:
- Placeholders:
- Client change requests:
```

---

## Pricing & reporting

**Pricing (guide only, never quote prices to the client yourself, only help estimate scope):**
- 1-page landing with forms to email or Telegram: from 80,000 ₸.
- Multi-page business card site (4–7 pages): more.
- Catalog / booking / user accounts / payments: much more, priced separately.
- Clarify: what's in the base price, what's paid extra, who pays for hosting and domain, and whether post-launch support is included.

**Reporting to the developer on every project:**
1. After the brief: summary of the task, scope, complexity estimate and suggested skills.
2. During work: report any problem or risk right away.
3. Before hand-off: what's done / what's left, security checklist results, list of placeholders and missing content, known risks and limitations, files and screenshots.
4. Update `STATUS.md`.
