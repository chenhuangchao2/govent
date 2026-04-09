# Design System Specification: The Ethereal State

## 1. Overview & Creative North Star
**Creative North Star: The Sovereign Prism**

This design system is a departure from the bureaucratic aesthetic typically associated with government platforms. Instead of rigid lines and heavy headers, we adopt "The Sovereign Prism"—a philosophy where authority is conveyed through clarity, depth, and light. 

By utilizing **intentional asymmetry** and **Bento Box layouts**, we break the predictable "template" look. We favor an editorial approach where white space is as functional as the content itself. This system feels futuristic yet grounded, combining the trustworthiness of a state institution with the cutting-edge precision of a premium tech experience.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep, institutional blues, but it is elevated through ethereal light play and iridescent transitions.

### The Palette (Material Design Tokens)
- **Primary / Core Identity:** `primary` (#00478d) and `primary_container` (#005eb8). Used for high-level authority and call-to-actions.
- **Surface Neutrals:** `surface` (#f8f9fa) to `surface_container_highest` (#e1e3e4).
- **Accents:** `tertiary_fixed` (#a1efff) and `secondary_fixed` (#dee0ff) are used for vibrant "glow" spots to guide the eye.

### The "No-Line" Rule
Prohibit the use of 1px solid, opaque borders for sectioning. Boundaries must be defined by:
- **Tonal Shifts:** Placing a `surface_container_low` section against a `surface` background.
- **Negative Space:** Using the spacing scale to create distinct visual groupings without physical dividers.

### The Glass & Gradient Rule
To achieve the "Avant-Garde" feel, floating components (modals, navigation bars, featured cards) must use **Advanced Glassmorphism**:
- **Background:** `surface_container_lowest` at 60-80% opacity.
- **Backdrop Blur:** Minimum 40px.
- **Inner Glow:** A 1px inner stroke using `outline_variant` at 20% opacity to mimic light hitting the edge of a glass pane.
- **Signature Texture:** Apply a 2% monochromatic noise/grain overlay to glass surfaces to prevent "banding" and add a tactile, premium feel.

---

## 3. Typography: Editorial Authority
The system utilizes **Manrope** for its geometric yet approachable character. **Inter** is reserved for high-density utility labels.

- **Display (Large/Medium):** Used for hero statements. Set with **-2% tracking** and `ExtraBold` weight. These should feel like headlines in a high-end fashion magazine.
- **Headline (Small/Medium):** Used for section titles. High contrast is key; pair a `headline-lg` (Bold) with a `body-md` (Medium) immediately following it.
- **Labels:** `label-md` and `label-sm` use **Inter** with **+3% tracking** and `SemiBold` weight for maximum legibility at small scales.

**The Hierarchy Rule:** Never use more than three different weights on a single screen. Contrast is created through scale (Size) rather than just thickness.

---

## 4. Elevation & Depth
We convey importance through **Tonal Layering** rather than traditional drop shadows.

### The Layering Principle
Treat the UI as physical layers of frosted glass.
1. **Base Layer:** `surface` (The foundation).
2. **Structural Layer:** `surface_container_low` (Bento Box background containers).
3. **Interactive Layer:** `surface_container_lowest` (Cards that sit "on top" of the structural layer).

### Ambient Shadows
Shadows are never gray. They are a tinted "glow" of the background.
- **Value:** Blur: 60px | Spread: -10px | Opacity: 4-8%.
- **Color:** Use a semi-transparent version of `on_surface` or `primary_fixed_dim` to create a natural, atmospheric lift.

### The "Ghost Border" Fallback
If a border is required for accessibility, use the **Ghost Border**: `outline_variant` at 15% opacity. This maintains the "Apple-style" softness while providing enough contrast for WCAG compliance.

---

## 5. Components & Layout

### The Bento Grid
All content should be organized into "Bento Box" structures. Use the `xl` (3rem) or `lg` (2rem) corner radius for these containers. This organic "squircle" shape is the hallmark of the system.

### Buttons (The Action Prism)
- **Primary:** Gradient fill from `primary` to `primary_container`. No border. Soft `full` (9999px) radius.
- **Secondary:** Glassmorphic background with a 1px `outline_variant` (20% opacity) border.
- **Tertiary:** Text-only with an animated `tertiary_fixed` underline on hover.

### Input Fields
Avoid "box" inputs. Use a `surface_container_high` background with a subtle 40px backdrop blur. The "active" state is signaled by a 1px iridescent glow using the `primary_fixed` color, rather than a thick stroke.

### Cards & Lists
**Strict Rule:** No divider lines.
- Use `surface_container_lowest` for card backgrounds.
- Separate list items using 16px of vertical white space.
- Group related items within a single "Squircle" container (`radius-xl`).

### Signature Component: The "State Glow"
For high-profile event announcements, use an **Accent Spot**. This is a large, blurry (150px+ blur) radial gradient of `tertiary_fixed` at 10% opacity sitting behind the content to draw the eye to specific information.

---

## 6. Do's and Don'ts

### Do
- **Do** use generous white space. If a layout feels "full," increase the padding.
- **Do** use "Squircles." Standard 4px or 8px corners feel dated; use `xl` (32px+) for main containers.
- **Do** use micro-interactions. A 2% scale-up on hover for cards adds a sense of "stunning" polish.

### Don't
- **Don't** use pure black (#000000) for text. Use `on_surface` for a softer, premium contrast.
- **Don't** use 100% opaque borders. They break the "Glassmorphism" illusion.
- **Don't** use traditional "Drop Shadows" with high opacity. They make the "Government" portal feel heavy and dated.
- **Don't** use standard grids. Allow elements to overlap slightly (e.g., a glass card overlapping a gradient background) to create depth.