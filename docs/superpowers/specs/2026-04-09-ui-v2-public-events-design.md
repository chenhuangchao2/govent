# UI v2: Public Events Page Design

## Scope
Rewrite `/events` page using design reference as base template, injecting existing functionality.

## Sections
1. **Floating Glass Nav** — fixed, rounded-full, glass-panel. Links: Events / My Registrations / Sign In (auth-aware)
2. **Hero** — "Public Initiatives." title (text-7xl) + search box + 8:4 asymmetric grid (featured event large card + secondary event card)
3. **Event Grid** — "Active Registries" + glass pill filters (Time/Topic/Org/Free) + 3-col bento grid with highlight card
4. **CPD Placeholder** — "For Your Career." section with placeholder badges and stock images

## Technical Approach
- **Template-first**: Extract HTML structure from `design_reference/public_events_stunning_2026/code.html`
- **React-ify**: Server Component for data fetch, Client Components for filters/interactions
- **Fonts**: Import Manrope + Inter via next/font/google in layout.tsx
- **Global CSS**: Add glass-panel, iridescent-glow, noise-overlay classes to globals.css
- **Tailwind**: Extend color palette from design reference config

## Files to Create/Modify
- `app/layout.tsx` — add Manrope + Inter font imports
- `app/globals.css` — add glass-panel, iridescent-glow, noise-overlay CSS
- `tailwind.config.ts` — extend colors + fontFamily from design reference
- `app/(public)/layout.tsx` — update pt for fixed nav
- `components/layout/PublicNav.tsx` — rewrite with glass nav design
- `app/(public)/events/page.tsx` — rewrite with hero + featured + grid structure
- `components/features/EventFilters.tsx` — rewrite with glass pill filters + bento grid
- `components/features/EventCard.tsx` — rewrite with bento card style

## Not Changed
- All API routes, Prisma schema, business logic, other pages
