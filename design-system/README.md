# GTM OS Design System

Reusable components and design tokens for the GTM OS look and feel. Drop into any React + Tailwind project.

## Prerequisites

- React 18+
- Tailwind CSS v3+
- [lucide-react](https://lucide.dev/) (icon library)

```bash
npm install lucide-react
```

## Setup

### 1. Add the Tailwind preset

Copy `tailwind-preset.ts` into your project and reference it in your Tailwind config:

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';
import gtmPreset from './path/to/tailwind-preset';

const config: Config = {
  presets: [gtmPreset],
  content: ['./src/**/*.{ts,tsx}', './path/to/design-system/components/**/*.tsx'],
  // ...your other config
};

export default config;
```

### 2. Add global styles

Import or copy `globals.css` into your app's stylesheet entry point:

```css
/* In your main CSS file */
@import './path/to/globals.css';
```

### 3. Add Inter font

Add the Google Fonts link to your HTML `<head>`:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

### 4. Prevent dark-mode flash

Copy the `<script>` block from `theme-init.html` into your HTML `<head>`, before any stylesheets:

```html
<head>
  <script>
    (function () {
      var t = localStorage.getItem('theme');
      if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    })();
  </script>
  <!-- stylesheets go after -->
</head>
```

### 5. Apply base body classes

Add these classes to your `<body>` tag:

```html
<body class="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 antialiased">
```

---

## Component Catalog

### TestimonialQuote

Testimonial card with left violet accent border.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `quote` | `string` | Default testimonial text | The quote body |
| `author` | `string` | `'Recent Blueprint Client'` | Author name |
| `role` | `string` | `'B2B Consultant'` | Author role/title |
| `result` | `string` | — | Optional result badge (e.g. "3x Pipeline Growth") |
| `className` | `string` | `''` | Additional CSS classes |

```tsx
import TestimonialQuote from './components/TestimonialQuote';

<TestimonialQuote
  quote="Revenue doubled in 60 days."
  author="Jane Doe"
  role="VP Sales"
  result="2x Revenue"
/>
```

### ThemeToggle

Fixed-position dark/light mode toggle button. Persists preference to `localStorage` under the key `'theme'`.

No props — renders a Sun/Moon icon button fixed to the top-right corner.

```tsx
import ThemeToggle from './components/ThemeToggle';

<ThemeToggle />
```

### CTAButton

Primary/secondary call-to-action button with optional icon.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | *required* | Button label |
| `onClick` | `() => void` | — | Click handler |
| `icon` | `'calendar' \| 'arrow' \| 'none'` | `'calendar'` | Trailing icon |
| `variant` | `'primary' \| 'secondary'` | `'primary'` | Visual style |
| `size` | `'default' \| 'large'` | `'default'` | Button size |
| `subtext` | `string` | — | Smaller text below the label |
| `className` | `string` | `''` | Additional CSS classes |

```tsx
import CTAButton from './components/CTAButton';

<CTAButton text="Book a Call" icon="calendar" variant="primary" size="large" />
<CTAButton text="Learn More" icon="arrow" variant="secondary" />
```

### SectionBridge

Full-width transition text between page sections, with optional step badge.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | *required* | Bridge text |
| `variant` | `'default' \| 'accent' \| 'gradient'` | `'default'` | Background style |
| `stepNumber` | `number` | — | Step badge number |
| `stepLabel` | `string` | — | Label next to step number |
| `className` | `string` | `''` | Additional CSS classes |

```tsx
import SectionBridge from './components/SectionBridge';

<SectionBridge
  text="Here's what your personalized blueprint revealed..."
  variant="accent"
  stepNumber={2}
  stepLabel="Your Results"
/>
```

### SimpleSteps

Three-step "what happens next" section. Fully prop-driven with sensible defaults.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `heading` | `string` | `'What Happens Next'` | Section heading |
| `subheading` | `string` | Default subheading text | Section subheading |
| `steps` | `Step[]` | Default 3 steps | Array of `{ number, title, description }` |
| `className` | `string` | `''` | Additional CSS classes |

```tsx
import SimpleSteps from './components/SimpleSteps';

// With defaults
<SimpleSteps />

// Custom steps
<SimpleSteps
  heading="Getting Started"
  steps={[
    { number: '01', title: 'Sign Up', description: 'Create your free account.' },
    { number: '02', title: 'Configure', description: 'Set up your workspace.' },
    { number: '03', title: 'Launch', description: 'Go live in minutes.' },
  ]}
/>
```

### LogoBar

Client logo social-proof bar with grayscale-to-color hover effect.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `logos` | `ClientLogo[]` | *required* | Array of logo objects |

Each `ClientLogo` has: `id`, `name`, `imageUrl`, `sortOrder`, `isVisible`.

```tsx
import LogoBar from './components/LogoBar';

<LogoBar logos={[
  { id: '1', name: 'Acme', imageUrl: '/logos/acme.svg', sortOrder: 0, isVisible: true },
  { id: '2', name: 'Globex', imageUrl: '/logos/globex.svg', sortOrder: 1, isVisible: true },
]} />
```

### MarketingBlock

Dynamic content block that renders differently based on `blockType` — supports FAQ accordions, CTA links, rich text with markdown formatting, and more.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `block` | `ContentBlock \| null` | *required* | Content block data |
| `className` | `string` | `''` | Additional CSS classes |

Supported `blockType` values: `testimonial`, `case_study`, `feature`, `benefit`, `faq`, `pricing`, `cta`.

For FAQ blocks, `content` can be either:
- A JSON string: `{ "items": [{ "question": "...", "answer": "..." }] }`
- Plain text with `**Question**\nAnswer` patterns

```tsx
import MarketingBlock from './components/MarketingBlock';

<MarketingBlock block={{
  id: '1',
  blockType: 'faq',
  title: 'Frequently Asked Questions',
  content: JSON.stringify({
    items: [
      { question: 'How does it work?', answer: 'We analyze your GTM strategy...' },
      { question: 'What results can I expect?', answer: 'Most clients see results in **30 days**.' },
    ]
  }),
  sortOrder: 0,
  isVisible: true,
}} />
```

---

## Design Token Reference

### Brand Colors (Violet)

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-50` | `#f5f3ff` | Light backgrounds, hover states |
| `brand-100` | `#ede9fe` | Step badges, accent backgrounds |
| `brand-400` | `#a78bfa` | Secondary accents |
| `brand-500` | `#8b5cf6` | Primary buttons, key accents |
| `brand-600` | `#7c3aed` | Hover states on primary elements |
| `brand-700` | `#6d28d9` | Active/pressed states |
| `brand-900` | `#4c1d95` | Deep accents |

These map to Tailwind's `violet-*` scale. Components use `violet-*` classes directly since Tailwind includes violet by default.

### Dark Mode Pattern

All components follow this convention:
- Light: `bg-white`, `text-zinc-800`, `border-zinc-200`
- Dark: `dark:bg-zinc-900` or `dark:bg-zinc-950`, `dark:text-zinc-100`, `dark:border-zinc-800`
- Accent surfaces: `dark:bg-violet-500/10`, `dark:border-violet-500/20`

### Spacing Conventions

- Section padding: `py-12 sm:py-16` or `py-14 sm:py-20`
- Card padding: `p-6 sm:p-8`
- Max content width: `max-w-3xl` (text) or `max-w-4xl` (grid layouts)
- Component gaps: `gap-6` (grid), `gap-4` (inline elements)

### Typography

- Font: Inter (300–800 weights)
- Headings: `font-bold`, `text-2xl sm:text-3xl`
- Body: `text-zinc-600 dark:text-zinc-400`, `leading-relaxed`
- Small text: `text-sm`, `text-xs` for labels
- Tracking: `tracking-widest` for uppercase labels
