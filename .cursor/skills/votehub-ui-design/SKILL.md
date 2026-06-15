---
name: votehub-ui-design
description: >-
  UI design guidelines for VoteHub (React 19 + Vite + plain CSS). Use when
  improving Landing, Home, Dashboard, Estadisticas, Registros, or any VoteHub
  page styling, layout, animations, or visual polish. Applies modern-web-design
  patterns adapted to this project's CSS conventions and Spanish UI copy.
---

# VoteHub UI Design

## Stack constraints

- React 19 + Vite, **no Tailwind**, **no animation libs yet** (plain CSS preferred).
- Styles live in co-located `*.css` files per page.
- Spanish UI copy; keep typography readable for long-form election content.
- Brand accent: `var(--accent)` / `var(--landing-accent)` (teal/cyan family).

## Existing design language

Read before editing:

- `src/pages/Landing.css` - glassmorphism topbar, fluid padding (`clamp`), pill nav, section numbering.
- `src/pages/Home.css`, `Dashboard.css`, `Estadisticas.css`, `Registros.css` - match their patterns.
- `src/App.css` - global tokens (`--accent`, fonts, base resets).

Reuse these patterns instead of inventing new ones:

```css
/* Glass topbar (already in Landing) */
background: rgba(255, 255, 255, 0.94);
backdrop-filter: blur(10px);
border-bottom: 1px solid rgba(0, 190, 201, 0.25);

/* Fluid spacing */
padding: clamp(20px, 4vw, 56px);

/* Pill nav links */
border-radius: 999px;
transition: background-color 0.2s ease, color 0.2s ease;
```

## Design improvements (CSS-first)

### Typography scale

Add fluid headings without new dependencies:

```css
--text-hero: clamp(2rem, 1.5rem + 2.5vw, 3.5rem);
--text-section: clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem);
--text-body: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
```

### Micro-interactions (CSS only)

```css
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 190, 201, 0.12);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card:active { transform: scale(0.98); }

@media (prefers-reduced-motion: reduce) {
  .card:hover { transform: none; }
}
```

### Scroll reveals (no library)

```jsx
// IntersectionObserver in useEffect - fade sections on enter
useEffect(() => {
  const els = document.querySelectorAll('[data-reveal]')
  const obs = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add('is-visible')
    }),
    { threshold: 0.15 }
  )
  els.forEach((el) => obs.observe(el))
  return () => obs.disconnect()
}, [])
```

```css
[data-reveal] { opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease, transform 0.5s ease; }
[data-reveal].is-visible { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  [data-reveal] { opacity: 1; transform: none; transition: none; }
}
```

### Loading states

Landing already has `.landing-loading`. Extend with skeleton pattern for cards:

```css
.skeleton {
  background: linear-gradient(90deg, #e8f4f5 25%, #f3fbfc 50%, #e8f4f5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
@keyframes shimmer { to { background-position: -200% 0; } }
```

## When to add a library

Only if CSS + IntersectionObserver is insufficient:

| Feature | Library | Install |
|---------|---------|---------|
| Complex stagger/gesture animations | `motion` (Framer Motion) | `npm install motion` |
| Scroll storytelling with pin/scrub | `gsap` + ScrollTrigger | `npm install gsap` |
| Animated hero background | `vanta` + `three` | see `lightweight-3d-effects` skill |

## Page-specific guidance

| Page | Focus |
|------|-------|
| Landing | Hero impact, candidate cards, date timeline, trust/credibility |
| Dashboard | Data density, clear hierarchy, election status at a glance |
| Home | Navigation clarity, quick actions |
| Estadisticas | Chart readability, animated count-up on stats |
| Registros | Table scanability, filter UX |

## Accessibility (election context)

- Election dates and candidate names must remain readable (no decorative-only text).
- Color alone must not convey vote status; pair with icons or labels.
- All interactive elements keyboard-focusable with visible `:focus-visible`.
- Respect `prefers-reduced-motion` on all animations.

## Related personal skills

Load from `~/.cursor/skills/` when deeper patterns are needed:

- `claude-design-stack` - routing index
- `modern-web-design` - principles and tokens
- `motion-framer` / `gsap-scrolltrigger` - if adding animation libs
