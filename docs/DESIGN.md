# Design System Specification: The Ethereal State (UI v1.0)

## 1. Overview & Creative North Star
**Creative North Star: The Sovereign Prism**

This design system is a departure from the bureaucratic aesthetic typically associated with government platforms. Instead of rigid lines and heavy headers, we adopt "The Sovereign Prism"—a philosophy where authority is conveyed through clarity, depth, and light. 

By utilizing **intentional asymmetry** and **Bento Box layouts**, we break the predictable "template" look. We favor an editorial approach where white space is as functional as the content itself. This system feels futuristic yet grounded, combining the trustworthiness of a state institution with the cutting-edge precision of a premium tech experience.

---

## 2. Visual Foundations

### 2.1 Colors & Surface Philosophy
The palette is rooted in deep, institutional blues, but it is elevated through ethereal light play and iridescent transitions.

- **Primary / Core Identity:** `primary` (#00478d) and `primary_container` (#005eb8). Used for high-level authority and call-to-actions.
- **Surface Neutrals:** `surface` (#f8f9fa) to `surface_container_highest` (#e1e3e4).
- **Accents:** `tertiary_fixed` (#a1efff) and `secondary_fixed` (#dee0ff) are used for vibrant "glow" spots to guide the eye.

### 2.2 Typography: Editorial Authority
The system utilizes **Manrope** for its geometric yet approachable character. **Inter** is reserved for high-density utility labels.

- **Display (Large/Medium):** Used for hero statements. Set with **-2% tracking** and `ExtraBold` weight. These should feel like headlines in a high-end fashion magazine.
- **Headline (Small/Medium):** Used for section titles. High contrast is key; pair a `headline-lg` (Bold) with a `body-md` (Medium) immediately following it.
- **Labels:** `label-md` and `label-sm` use **Inter** with **+3% tracking** and `SemiBold` weight for maximum legibility at small scales.

**The Hierarchy Rule:** Never use more than three different weights on a single screen. Contrast is created through scale (Size) rather than just thickness.

### 2.3 Elevation & Depth
We convey importance through **Tonal Layering** rather than traditional drop shadows. Treat the UI as physical layers of frosted glass:
1. **Base Layer:** `surface` (The foundation).
2. **Structural Layer:** `surface_container_low` (Bento Box background containers).
3. **Interactive Layer:** `surface_container_lowest` (Cards that sit "on top" of the structural layer).

**Ambient Shadows:** Shadows are never gray. They are a tinted "glow" of the background.
- **Value:** Blur: 60px | Spread: -10px | Opacity: 4-8%.
- **Color:** Use a semi-transparent version of `on_surface` or `primary_fixed_dim` to create a natural, atmospheric lift.

---

## 3. Core Components & Rules

### 3.1 The "No-Line" Rule
Prohibit the use of 1px solid, opaque borders for sectioning. Boundaries must be defined by:
- **Tonal Shifts:** Placing a `surface_container_low` section against a `surface` background.
- **Negative Space:** Using the spacing scale to create distinct visual groupings without physical dividers.
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline_variant` at 15% opacity. This maintains softness while providing contrast for WCAG compliance.

### 3.2 The Glass & Gradient Rule
To achieve the "Avant-Garde" feel, floating components (modals, navigation bars, featured cards) must use **Advanced Glassmorphism**:
- **Background:** `surface_container_lowest` at 60-80% opacity.
- **Backdrop Blur:** Minimum 40px.
- **Inner Glow:** A 1px inner stroke using `outline_variant` at 20% opacity.
- **Signature Texture:** Apply a 2% monochromatic noise/grain overlay to glass surfaces to prevent "banding" and add a tactile, premium feel.

### 3.3 The Bento Grid & Squircles
All content should be organized into "Bento Box" structures. Use the `xl` (3rem) or `lg` (2rem) corner radius for these containers. This organic "squircle" shape is the hallmark of the system.

### 3.4 Buttons & Inputs
- **Primary Button:** Gradient fill from `primary` to `primary_container`. No border. Soft `full` (9999px) radius.
- **Secondary Button:** Glassmorphic background with a 1px `outline_variant` (20% opacity) border.
- **Input Fields:** Avoid "box" inputs. Use a `surface_container_high` background with a subtle 40px backdrop blur. The "active" state is signaled by a 1px iridescent glow using the `primary_fixed` color, rather than a thick stroke.

### 3.5 Do's and Don'ts
- **Do** use generous white space. If a layout feels "full," increase the padding.
- **Do** use "Squircles." Standard 4px or 8px corners feel dated; use `xl` (32px+) for main containers.
- **Do** use micro-interactions. A 2% scale-up on hover for cards adds a sense of "stunning" polish.
- **Don't** use pure black (#000000) for text. Use `on_surface` for a softer, premium contrast.
- **Don't** use 100% opaque borders. They break the "Glassmorphism" illusion.
- **Don't** use traditional "Drop Shadows" with high opacity. They make the portal feel heavy and dated.

---

## 4. Application UI: Public Experience

### 4.1 Search & Advanced Filters
- **Decision:** Search + Glass Pills
- **Implementation:** Filters (Topic, Organisation, Cost) are immediately visible as elegant glass pills below the search bar. This provides a faster interaction path while maintaining the premium feel, avoiding hidden popovers.

### 4.2 Event Listing Layout
- **Decision:** Hybrid Layout (Hero Showcase + Image Grid)
- **Implementation:** The top of the page features a massive, visually striking card for the "Next Upcoming Featured Event" (utilizing the event's `imageUrl` with a deep primary gradient overlay). Below the hero, all other events are displayed in a uniform grid. Cards use the "Squircle" radius (`rounded-3xl`), with the top half displaying the `imageUrl` and the bottom half displaying event details and a highly refined, gradient `CapacityBar`.

### 4.3 Navigation
- **Implementation:** PublicNav is a floating glassmorphic pill (`rounded-full`, 40px blur, ghost border) that sits slightly below the top edge of the viewport.

---

## 5. Application UI: Admin Experience

### 5.1 Dashboard Layout
- **Sidebar:** Glassmorphic panel with active states using the `primary/10` background and a left-accent border.
- **Metrics Grid:** 4 stat cards using Bento Box styling, ghost borders, and subtle hover scale effects (`hover:scale-[1.02]`).

### 5.2 Data Visualization (Charts)
- **Decision:** Custom SVG Components
- **Implementation:** Replace `Recharts` with **Custom React SVG Components** for the core dashboard visualizations (e.g., Registration Status Donut Chart). This ensures a 100% visual match to the reference design, allowing for perfect integration of typography, custom stroke widths, and the specific "Sovereign Prism" color palette.

### 5.3 The "Next Upcoming Event" Panel
- **Decision:** "Next Upcoming Event" Panel
- **Implementation:** The large, iridescent gradient card from the reference design is repurposed into a highly functional "Quick Action" panel. It displays the very next event on the schedule, showing a countdown (e.g., "Starts in 2 Hours"), a live check-in progress bar, and a prominent "Launch Scanner" button for immediate operational access.

---

## 6. Visual Reference Files (Style Anchors)

The `design_reference/` directory contains the definitive visual anchors:

| File | Purpose |
|------|---------|
| `public_events_stunning_2026/screen.png` | Target look for public event listing |
| `public_events_stunning_2026/code.html` | Tailwind class reference for public pages |
| `admin_dashboard_refined_harmony/screen.png` | Target look for admin dashboard |
| `admin_dashboard_refined_harmony/code.html` | Tailwind class reference for admin pages |
| `ethereal_governance/DESIGN.md` | Original design system source document |

**Usage Rules:**
- **Extract, don't Copy-Paste:** Extract Tailwind utility classes (colors, gradients, shadows, border-radius). Adapt `<div>` structures for React component composition and responsive behavior.
- **SVG Charts:** Pure SVG chart structures (donut chart etc.) may be copied directly but must accept dynamic React props.
- **Screenshots are the truth:** When code.html and screen.png conflict, the screenshot is the intended result.

---

## 7. Implementation Notes (Next.js)

### 7.1 Font Setup
Manrope and Inter must be imported via `next/font/google` in `app/layout.tsx` and exposed as CSS variables (`--font-manrope`, `--font-inter`). Tailwind config maps these to `font-headline` and `font-label`.

### 7.2 Fixed Nav Padding
PublicNav is `position: fixed`. The public layout `<main>` must have `pt-24` (96px) to prevent content being hidden behind the nav.

### 7.3 Approach: Template-First
When restyling a page, start from the design_reference HTML as the visual template. Inject existing React data/logic into the template structure — do not patch the old UI incrementally.