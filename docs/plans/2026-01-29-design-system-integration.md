# Design System Integration

## Overview
Apply the gtm-os-design-system to all three public-facing pages MagnetLab generates (optin, thankyou, content). Components are copied into `src/components/ds/`, adapted to use CSS custom properties for per-funnel color customization, and rendered from a new `funnel_page_sections` DB table that stores configurable content blocks.

---

## Integration Foundation

- Copy 7 design system components into `src/components/ds/`
- Merge Tailwind preset into `tailwind.config.ts` (Inter font, brand colors, dark mode class strategy)
- Add globals.css utilities (scrollbar-hide, slide-in animation)
- CSS variable bridge: each public page sets `--ds-primary`, `--ds-bg`, `--ds-text`, etc. on a wrapper div based on funnel settings
- Design system components reference `var(--ds-primary)` instead of hardcoded violet
- ThemeToggle replaces custom toggle on content page
- theme-init script added to `/p/` layout to prevent dark mode flash

### CSS Variables (via `getThemeVars()`)
```
--ds-primary, --ds-primary-hover, --ds-primary-light
--ds-bg, --ds-card, --ds-text, --ds-body, --ds-muted, --ds-border
```

Dark: bg=#09090B card=#18181B text=#FAFAFA body=#E4E4E7 muted=#A1A1AA border=#27272A
Light: bg=#FAFAFA card=#FFFFFF text=#09090B body=#27272A muted=#71717A border=#E4E4E7

---

## Database Schema

```sql
CREATE TABLE funnel_page_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_page_id UUID NOT NULL REFERENCES funnel_pages(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN (
    'logo_bar', 'steps', 'testimonial', 'marketing_block', 'section_bridge'
  )),
  page_location TEXT NOT NULL CHECK (page_location IN ('optin', 'thankyou', 'content')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_funnel_page_sections_page
  ON funnel_page_sections(funnel_page_id, page_location, sort_order);
```

### Config shapes per section_type:
- **logo_bar**: `{ logos: [{ name, imageUrl }] }`
- **steps**: `{ heading, subheading, steps: [{ title, description, icon }] }`
- **testimonial**: `{ quote, author, role, result }`
- **marketing_block**: `{ blockType, title, content, imageUrl, ctaText, ctaUrl }`
- **section_bridge**: `{ text, variant, stepNumber, stepLabel }`

---

## Page Layouts — Section Slot Map

### Optin Page
```
[logo]
[headline + subline]
[--- sections: sort_order < 50 ---]
[email form with CTAButton]
[--- sections: sort_order >= 50 ---]
[social proof text]
[powered by footer]
```

### Thankyou Page
```
[logo]
[success check + headline + subline]
[content access CTAButton]
[--- sections: sort_order < 50 ---]
[video embed]
[survey questions]
[qualification result]
[--- sections: sort_order >= 50 ---]
[calendly embed]
[powered by footer]
```

### Content Page
```
[header with ThemeToggle]
[hero + metadata]
[--- sections: sort_order < 50 ---]
[video embed]
[TOC sidebar + polished content]
[--- sections: sort_order >= 50 ---]
[calendly embed]
[powered by footer]
```

---

## Component Adaptations

All 7 components copied to `src/components/ds/` with these changes:
- Violet-specific Tailwind classes → `var(--ds-primary)` references
- Neutral zinc classes stay as-is (theme-neutral)
- `CTAButton` gets style prop pass-through for CSS variable colors
- `ThemeToggle` unchanged, replaces custom content page toggle

### New: SectionRenderer.tsx
Routes section_type to the correct component, parses JSONB config to props.

---

## Funnel Builder: Sections Tab

- New "Sections" tab in FunnelBuilder
- Three sub-views via pills: Optin, Thankyou, Content
- "Add Section" picker with 5 section types
- Inline expandable editors per section type
- Drag-to-reorder, visibility toggle, delete with confirmation
- Collapsed card shows: type icon, label, content snippet, controls

### Section Editors:
- **Logo Bar**: Add/remove logos (name + image URL)
- **Steps**: Heading, subheading, 3 step cards (title + description)
- **Testimonial**: Quote, author, role, optional result badge
- **Marketing Block**: Type dropdown, title, content, optional image/CTA
- **Section Bridge**: Text, variant picker, optional step number + label

---

## Files Summary

### Create (14 files)
| File | Purpose |
|------|---------|
| `supabase/migrations/20260129_funnel_page_sections.sql` | DB table |
| `src/lib/utils/theme-vars.ts` | CSS variable bridge + darken helper |
| `src/components/ds/CTAButton.tsx` | Adapted CTA button |
| `src/components/ds/LogoBar.tsx` | Adapted logo bar |
| `src/components/ds/MarketingBlock.tsx` | Adapted marketing block |
| `src/components/ds/SectionBridge.tsx` | Adapted section bridge |
| `src/components/ds/SimpleSteps.tsx` | Adapted simple steps |
| `src/components/ds/TestimonialQuote.tsx` | Adapted testimonial quote |
| `src/components/ds/ThemeToggle.tsx` | Adapted theme toggle |
| `src/components/ds/SectionRenderer.tsx` | Routes section type to component |
| `src/components/ds/index.ts` | Barrel export |
| `src/components/funnel/SectionsManager.tsx` | Builder UI for sections |
| `src/app/api/funnel/[id]/sections/route.ts` | GET + POST API |
| `src/app/api/funnel/[id]/sections/[sid]/route.ts` | PUT + DELETE API |

### Modify (9 files)
| File | Change |
|------|--------|
| `tailwind.config.ts` | Merge design system preset |
| `src/app/globals.css` | Add scrollbar-hide + slide-in animation |
| `src/lib/types/funnel.ts` | Add FunnelPageSection types |
| `src/lib/validations/api.ts` | Add section config Zod schemas |
| `src/components/funnel/public/OptinPage.tsx` | CSS vars, CTAButton, section slots |
| `src/components/funnel/public/ThankyouPage.tsx` | CSS vars, CTAButton, section slots |
| `src/components/content/ContentPageClient.tsx` | CSS vars, ThemeToggle, section slots |
| `src/components/funnel/FunnelBuilder.tsx` | Add Sections tab |
| `src/app/p/[username]/[slug]/layout.tsx` | Theme-init script |
