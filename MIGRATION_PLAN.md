# Lead Magnet Migration Plan (API-Driven)

> **For**: VA executing via Claude Code
> **Source**: `/Users/timlife/Downloads/Copy of Lead Magnets - Sheet1.csv`
> **Target**: MagnetLab API at `http://localhost:3000`
> **Learning goal**: VA gets hands-on with REST APIs using curl + Claude Code

---

## Overview

19 lead magnets currently hosted across Notion, getcreator.io, Google Docs, Airtable, and other platforms need to be imported into MagnetLab using the API. Each lead magnet gets:
1. A lead magnet record (metadata)
2. A funnel page (opt-in + thank you page)
3. Scraped content rehosted on MagnetLab's content pages
4. Published and live

## How the API Auth Works

MagnetLab API uses session cookies. You need to:
1. Start the dev server
2. Log in as Tim in the browser
3. Copy the session cookie
4. Use it in every curl request

---

## Phase 0: Setup (One-Time)

### Step 0.1 — Start the dev server

```
Claude Code prompt:
"Start the magnetlab dev server with npm run dev"
```

Keep it running in the background. All API calls go to `http://localhost:3000`.

### Step 0.2 — Get the session cookie

1. Open `http://localhost:3000` in a browser
2. Log in as Tim (Google OAuth)
3. Open browser DevTools → Application → Cookies
4. Copy the value of `authjs.session-token`
5. Save it — you'll use it in every curl command

```bash
# Test the cookie works:
curl -s http://localhost:3000/api/lead-magnet?limit=1 \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE" | jq .
```

You should see a JSON response with `leadMagnets` array. If you get a 401, the cookie is wrong or expired.

### Step 0.3 — Store the cookie for reuse

```
Claude Code prompt:
"Save this session token so we can reuse it in all our curl commands: YOUR_TOKEN_HERE"
```

Claude Code can store it in a variable in the migration script.

---

## Phase 1: Create Lead Magnets + Funnel Pages via API

For each of the 19 rows in the CSV, make these API calls in sequence:

### API Call 1: Create the Lead Magnet

```
POST /api/lead-magnet
```

```bash
curl -s -X POST http://localhost:3000/api/lead-magnet \
  -H "Cookie: authjs.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "LEAD MAGNET NAME from CSV",
    "archetype": "focused-toolkit",
    "concept": {
      "title": "LEAD MAGNET NAME from CSV",
      "painSolved": "HEADLINE from CSV",
      "deliveryFormat": "toolkit"
    },
    "extractedContent": {
      "title": "LEAD MAGNET NAME from CSV",
      "format": "toolkit",
      "structure": [{
        "sectionName": "Overview",
        "contents": ["SUB-HEADLINE from CSV"]
      }],
      "nonObviousInsight": "",
      "personalExperience": "",
      "proof": "",
      "commonMistakes": [],
      "differentiation": ""
    }
  }'
```

**Response** → Save the returned `id` — this is the `lead_magnet_id` for the next call.

### API Call 2: Create the Funnel Page

```
POST /api/funnel
```

```bash
curl -s -X POST http://localhost:3000/api/funnel \
  -H "Cookie: authjs.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadMagnetId": "ID_FROM_STEP_1",
    "targetType": "lead_magnet",
    "slug": "slug-from-funnel-name",
    "optinHeadline": "HEADLINE from CSV",
    "optinSubline": "SUB-HEADLINE from CSV",
    "optinButtonText": "Get Free Access",
    "thankyouHeadline": "You'\''re in! Access your resource below.",
    "theme": "dark",
    "primaryColor": "#6366f1",
    "backgroundStyle": "gradient"
  }'
```

**Response** → Save the returned `funnel.id` — needed for publishing later.

### API Call 3: Publish the Funnel Page

```
POST /api/funnel/{funnel_id}/publish
```

```bash
curl -s -X POST http://localhost:3000/api/funnel/FUNNEL_ID/publish \
  -H "Cookie: authjs.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"publish": true}'
```

**Response** → Returns the `publicUrl` where the page is live.

### API Call 4: Create a Shared Qualification Form (Once)

After all 19 funnels are created, create ONE shared qualification form and assign it to all funnels:

```bash
# Step 1: Create the shared form
curl -s -X POST http://localhost:3000/api/qualification-forms \
  -H "Cookie: authjs.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Standard Lead Qualification"}'
```

**Response** → Save the returned `form.id`

```bash
# Step 2: Add questions to the form
curl -s -X POST http://localhost:3000/api/qualification-forms/FORM_ID/questions \
  -H "Cookie: authjs.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionText": "Are you currently running a business or agency?",
    "answerType": "yes_no",
    "qualifyingAnswer": "yes",
    "isQualifying": true,
    "isRequired": true
  }'

# Repeat for each question you want on the form
```

```bash
# Step 3: Assign the form to each funnel
curl -s -X PUT http://localhost:3000/api/funnel/FUNNEL_ID \
  -H "Cookie: authjs.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qualificationFormId": "FORM_ID"}'

# Repeat for all 19 funnels
```

All 19 funnels will now share the same set of questions. Edit once, applies everywhere.

### Automation: Script All 19

> **Claude Code prompt**: "Read the CSV at `/Users/timlife/Downloads/Copy of Lead Magnets - Sheet1.csv` and write a script at `scripts/migrate-via-api.ts` that for each row: (1) calls POST /api/lead-magnet to create the lead magnet, (2) calls POST /api/funnel to create the funnel page, (3) calls POST /api/funnel/{id}/publish to publish it. Use the session cookie stored in an env var MIGRATION_SESSION_TOKEN. Log a mapping of CSV row → lead_magnet_id, funnel_id, slug, publicUrl. Add a 500ms delay between rows. Include a --dry-run flag that logs what would be created without actually calling the API. Read MIGRATION_PLAN.md for the exact curl shapes and field mappings."

### CSV Field → API Field Mapping

| CSV Column | → Lead Magnet Field | → Funnel Field |
|---|---|---|
| LEAD MAGNET NAME | `title`, `concept.title`, `extractedContent.title` | — |
| HEADLINE | `concept.painSolved` | `optinHeadline` |
| SUB-HEADLINE | `extractedContent.structure[0].contents[0]` | `optinSubline` |
| FUNNEL NAME | — | `slug` (lowercased, hyphenated) |
| RESOURCE CONTENT | — | — (used in Phase 2) |
| RESOURCE ACTUAL URL | — | — (used in Phase 2) |

### Slug Generation Rules

Derive from FUNNEL NAME:
- Lowercase everything
- Replace spaces with hyphens
- Remove special characters ($, ', ", etc.)
- Collapse multiple hyphens
- Trim to max 50 chars

| FUNNEL NAME | → slug |
|---|---|
| AI CONTENT GENERATOR | `ai-content-generator` |
| LINKEDIN DM WRITING GPT | `linkedin-dm-writing-gpt` |
| 7-Figure Lead Magnet Method | `7-figure-lead-magnet-method` |
| Gemini 3: Agency Sales System | `gemini-3-agency-sales-system` |
| The 60-Day LinkedIn Inbound System | `60-day-linkedin-inbound-system` |
| The $5 Million Dollar 'Claude Code' Agency Sales Vault | `5m-claude-code-agency-sales-vault` |
| My Entire 7-Figure Agency Sales System Library | `7-figure-agency-sales-system-library` |
| The $1M+ Lead Magnet Swipefile: 6 Viral Templates | `1m-lead-magnet-swipefile` |
| $5M LinkedIn Post Database Swipe File | `5m-linkedin-post-database` |
| 30-Day LinkedIn Speed-run System | `30-day-linkedin-speedrun-system` |
| Copy My Exact LinkedIn Lead System | `copy-my-linkedin-lead-system` |
| LinkedIn Inbound Playbook | `linkedin-inbound-playbook` |
| LinkedIn Foundations Pack | `linkedin-foundations-pack` |
| Top 1% LinkedIn Content Pack | `top-1-percent-linkedin-content-pack` |
| $5M Automatic AI Lead Magnet Machine Pack | `5m-ai-lead-magnet-machine-pack` |
| Zero to One Offer and Close Pack | `zero-to-one-offer-and-close-pack` |
| $5M Lead Magnet Swipe File | `5m-lead-magnet-swipe-file` |
| Build Your Own Private AI Assistant | `build-your-own-ai-assistant` |
| Claude Code Training | `claude-code-training` |

---

## Phase 2: Scrape Content and Push via API

After Phase 1 creates all 19 lead magnets, Phase 2 fills them with content from the source URLs.

### The Content Update API

```
PUT /api/lead-magnet/{id}/content
```

```bash
curl -s -X PUT http://localhost:3000/api/lead-magnet/LEAD_MAGNET_ID/content \
  -H "Cookie: authjs.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "polishedContent": {
      "version": 1,
      "polishedAt": "2026-02-05T00:00:00Z",
      "heroSummary": "One-line summary",
      "sections": [
        {
          "id": "unique-id",
          "sectionName": "Section Title",
          "introduction": "Intro text",
          "blocks": [
            {"type": "paragraph", "content": "Text here"},
            {"type": "callout", "content": "Important note", "style": "info"},
            {"type": "list", "content": "- Item 1\n- Item 2"},
            {"type": "quote", "content": "Quote text"},
            {"type": "divider", "content": ""}
          ],
          "keyTakeaway": "Main point"
        }
      ],
      "metadata": {
        "readingTimeMinutes": 5,
        "wordCount": 1200
      }
    }
  }'
```

Note: The API auto-recalculates `metadata` (word count, reading time) so you can pass approximate values.

### Resource Categories and Scraping Strategy

| Category | Count | How to Scrape | How to Push |
|----------|-------|---------------|-------------|
| **Notion pages** | 11 | Notion API (public pages, no auth needed) | Convert to PolishedContent → PUT /api/lead-magnet/{id}/content |
| **getcreator.io** | 3 | Playwright (headless browser) | Convert to PolishedContent → PUT /api/lead-magnet/{id}/content |
| **Link-only** (video, Airtable, GHL, Vercel) | 5 | No scraping — use CSV's RESOURCE CONTENT text | Build PolishedContent with link callouts → PUT /api/lead-magnet/{id}/content |

### 2A — Notion Pages (11 pages)

> **Claude Code prompt**: "Write a script at `scripts/scrape-notion-pages.ts` that takes a public Notion page URL, uses the Notion API to extract all blocks, and converts them to MagnetLab's PolishedContent format. Then push the content via PUT /api/lead-magnet/{id}/content using our session cookie. Read MIGRATION_PLAN.md Phase 2 for the PolishedContent format and Notion block mapping."

**Notion block type → PolishedContent mapping:**

| Notion Block | → PolishedContent |
|---|---|
| paragraph | `{ type: 'paragraph', content: text }` |
| heading_1, heading_2, heading_3 | Start a new `section` |
| bulleted_list_item, numbered_list_item | `{ type: 'list', content: '- items' }` (group consecutive items) |
| callout | `{ type: 'callout', content: text, style: 'info' }` |
| quote | `{ type: 'quote', content: text }` |
| divider | `{ type: 'divider', content: '' }` |
| toggle | Expand children, include as paragraphs |
| image | `{ type: 'paragraph', content: '![image](url)' }` |
| bookmark/link_to_page | `{ type: 'paragraph', content: '[title](url)' }` |
| child_page | Recursively scrape, add as new section |

**Pages to scrape:**

| # | Lead Magnet | Notion Page ID (from URL) |
|---|---|---|
| 1 | 7-Figure Lead Magnet Method | `28581f7dc52780518d95caa8d8a70e0a` |
| 2 | 7-Figure Agency Sales System Library | `2edf971fc6778095ac7ed13fb14f77a3` |
| 3 | $1M+ Lead Magnet Swipefile (6 Templates) | `2767aba7ab66812db1a3cae8cf3d9f6b` |
| 4 | 30-Day LinkedIn Speed-run | `29581f7dc5278013869fe2596c11487c` |
| 5 | LinkedIn Inbound Playbook | `26d7aba7ab6680919398df9410912571` |
| 6 | LinkedIn Foundations Pack | `2f1f971fc67780b4a688eae03ebe7fe7` |
| 7 | Top 1% LinkedIn Content Pack | `2f1f971fc677805da8d7c9dcf3fa60a1` |
| 8 | $5M AI Lead Magnet Machine Pack | `2f1f971fc6778014bf49f190b8f1c95c` |
| 9 | Zero to One Offer and Close Pack | `2f1f971fc6778025a202d006fe2bdc57` |
| 10 | $5M Lead Magnet Swipe File (10k) | Same as #3 — reuse content |
| 11 | Build Your Own AI Assistant | `2f4f971fc677807080a9f62faf169076` |

**Important**: Notion API for public pages requires converting the hex ID to UUID format:
`2f1f971fc67780b4a688eae03ebe7fe7` → `2f1f971f-c677-80b4-a688-eae03ebe7fe7`

> **Claude Code prompt for the Notion scraper**: "Install @notionhq/client. The Notion API can read public pages — use the API with an integration token from env NOTION_INTERNAL_TOKEN (or NOTION_CLIENT_SECRET if that works). Extract the page ID from the URL, convert to UUID format, fetch all blocks recursively, and convert to PolishedContent JSON."

### 2B — getcreator.io Pages (3 pages)

These are JavaScript SPAs that require a headless browser.

> **Claude Code prompt**: "Install Playwright (`npx playwright install chromium`). Write a script at `scripts/scrape-getcreator.ts` that opens each getcreator.io URL in a headless browser, waits for content to load, extracts the text/structure from the DOM, converts to PolishedContent format, and pushes via PUT /api/lead-magnet/{id}/content."

| # | Lead Magnet | URL |
|---|---|---|
| 1 | Gemini 3: Agency Sales System | `app.getcreator.io/ResourceLibraryPage?id=695c1c7cbfd0842c2b9349fa` |
| 2 | 60-Day LinkedIn Inbound System | `app.getcreator.io/PublicLeadMagnet?id=6968b72969c207a8adda97aa` |
| 3 | $5M Claude Code Agency Sales Vault | `app.getcreator.io/PromptLibraryPublicPage?id=6968b19d26f4c73d3ee1184f` |

### 2C — Link-Only Resources (5 items)

These don't need scraping. Build PolishedContent from the CSV's RESOURCE CONTENT column (which already has the delivery text with links).

> **Claude Code prompt**: "For these 5 lead magnets, build PolishedContent JSON from their RESOURCE CONTENT in the CSV. The content already has links and descriptions — convert the text into sections with paragraph blocks and the links into callout blocks with style 'info'. Then push each via PUT /api/lead-magnet/{id}/content."

| Lead Magnet | Resource Type | RESOURCE ACTUAL URL |
|---|---|---|
| AI Content Generator | Video + Google Doc | MP4 link + Google Docs link |
| LinkedIn DM Writing GPT | GHL redirect | `go.modernagencysales.com/dmgpt-thanks` |
| $5M Post Database Swipe File | Airtable | `airtable.com/appocNnw4hPnnSfOj/...` |
| Copy My Exact LinkedIn Lead System | GHL redirect | `go.modernagencysales.com/thanks-...` |
| Claude Code Training | Vercel app | `claude-code-training-ebon.vercel.app` |

---

## Phase 3: Verify via API + Browser

### 3A — API Verification

> **Claude Code prompt**: "Write a verification script that for each imported lead magnet: (1) calls GET /api/lead-magnet/{id} and checks polished_content is not null, (2) calls GET /api/funnel?leadMagnetId={id} and checks is_published is true, (3) uses curl to hit the public page URL and checks for 200 status. Log any failures."

### 3B — Browser Spot-Check

Open 3-4 pages in a browser and verify:
- Opt-in page shows correct headline/subline from CSV
- Content page renders the scraped content
- Links in the content work

### 3C — Fix Issues

If any content looks wrong, the VA can re-scrape and re-push:
```bash
# Re-push content for a specific lead magnet:
curl -s -X PUT http://localhost:3000/api/lead-magnet/THE_ID/content \
  -H "Cookie: authjs.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"polishedContent": { ...fixed content... }}'
```

---

## Execution Order (Copy-Paste Prompts for VA)

**Setup:**
```
Step 0: Open Claude Code in /Users/timlife/Documents/claude code/magnetlab
Step 1: "Run npm run dev in background"
Step 2: "I need to get my session cookie — open http://localhost:3000 in browser,
         log in, copy authjs.session-token cookie value"
Step 3: "Test the API: curl http://localhost:3000/api/lead-magnet?limit=1
         with this session cookie: [PASTE COOKIE]"
```

**Phase 1 — Create records:**
```
Step 4: "Read the CSV at /Users/timlife/Downloads/Copy of Lead Magnets - Sheet1.csv
         and MIGRATION_PLAN.md. Write scripts/migrate-via-api.ts that creates all 19
         lead magnets and funnel pages using the REST API. Use the session cookie I gave
         you. Include --dry-run mode. Follow the field mapping in MIGRATION_PLAN.md."
Step 5: "Run the script in dry-run mode first"
Step 6: "Looks good — run it for real"
```

**Phase 2 — Scrape and push content:**
```
Step 7: "Write scripts/scrape-notion-pages.ts per Phase 2A in MIGRATION_PLAN.md.
         Scrape all 11 Notion pages and push content via PUT /api/lead-magnet/{id}/content"
Step 8: "Install Playwright and write scripts/scrape-getcreator.ts per Phase 2B.
         Scrape the 3 getcreator.io pages and push content."
Step 9: "For the 5 link-only resources (Phase 2C in MIGRATION_PLAN.md),
         build PolishedContent from the CSV's RESOURCE CONTENT column
         and push via the content API."
```

**Phase 3 — Verify:**
```
Step 10: "Write and run a verification script per Phase 3A in MIGRATION_PLAN.md"
Step 11: Open 3-4 pages in browser to spot-check
Step 12: "Fix any issues found" (if needed)
```

---

## API Quick Reference

All calls require: `-H "Cookie: authjs.session-token=YOUR_TOKEN"`

| Action | Method | Endpoint | Key Fields |
|---|---|---|---|
| List lead magnets | GET | `/api/lead-magnet?limit=50` | — |
| Create lead magnet | POST | `/api/lead-magnet` | title, archetype, concept, extractedContent |
| Get one lead magnet | GET | `/api/lead-magnet/{id}` | — |
| Update lead magnet | PUT | `/api/lead-magnet/{id}` | any field |
| Push content | PUT | `/api/lead-magnet/{id}/content` | polishedContent |
| Delete lead magnet | DELETE | `/api/lead-magnet/{id}` | — (cascades funnel) |
| Create funnel | POST | `/api/funnel` | leadMagnetId, slug, optinHeadline, optinSubline |
| Get funnel | GET | `/api/funnel?leadMagnetId={id}` | — |
| Publish funnel | POST | `/api/funnel/{id}/publish` | publish: true/false |
| Assign form to funnel | PUT | `/api/funnel/{id}` | qualificationFormId |
| List qualification forms | GET | `/api/qualification-forms` | — |
| Create qualification form | POST | `/api/qualification-forms` | name |
| Add form question | POST | `/api/qualification-forms/{id}/questions` | questionText, answerType, etc. |

---

## Rollback

If something goes wrong, delete via the API:

```bash
# Delete a single lead magnet (cascades to funnel, leads, etc.):
curl -s -X DELETE http://localhost:3000/api/lead-magnet/THE_ID \
  -H "Cookie: authjs.session-token=YOUR_TOKEN"

# Or delete all imported ones using the mapping file IDs
```

---

## Notes for Tim

- **Session cookie expiry**: The cookie may expire during the migration. If the VA starts getting 401s, just log in again and grab a fresh cookie.
- **Usage limits**: The API checks plan limits on create. If Tim is on free tier, the 19 creates may hit the limit. Either upgrade first or have the VA tell Claude Code to check what plan Tim is on.
- **Deduplication**: Rows #8 and #17 in the CSV point to the same Notion URL. They'll be separate lead magnets with the same content — intentional.
- **Libraries vs Lead Magnets**: The "7-Figure Agency Sales System Library" is a collection. Currently imported as a single lead magnet. If you want it as a proper MagnetLab `library` entity, tell the VA to use `POST /api/funnel` with `targetType: 'library'` instead.
- **Old opt-in URL redirects**: The CSV's `go.modernagencysales.com` URLs need redirects set up separately (GHL/DNS level).
- **The import endpoint**: There's also `POST /api/lead-magnet/import` which creates lead magnet + funnel in one call and uses Claude AI to extract headlines. Good for one-offs but wasteful for bulk import since we already have the copy.
