# Build Log — GovEvent

> How I used AI-assisted development to build this system.
> For architecture, components, and data flow, see the Documentation Slides.
> Full detailed log: [BUILD_LOG.md](BUILD_LOG.md)

---

## 1. AI Tools Used at Each Stage

| Stage | Tool | How It Was Used |
|-------|------|-----------------|
| **Architecture & Schema** | Claude Code (CLI) | Designed data model top-down: 5 Prisma models, 3 enums, seed data. Schema-first — all TypeScript types derived from one source. |
| **Requirements** | Claude Code — 5 parallel agents | Dispatched PM, compliance, technical, UX, and strategy agents simultaneously to critique and expand the feature list. Dropped Luma integration, added Stripe + blacklist system. |
| **Backend API** | Claude Code | 28 API routes generated in one pass. Services layer (email, Stripe, waitlist, blacklist) extracted before routes. Session auth via `iron-session`. |
| **Frontend (v1–v4)** | Claude Code — parallel agents per feature block | 16 feature blocks built across v2.0–v3.6. Each block assigned to an independent agent. Participant auth, tags, permissions, analytics added incrementally. |
| **Security Audit (v4)** | Claude Code — 8 audit agents + 6 fix agents | 8 agents audited different areas in parallel (public pages, registration flow, payment, API security, etc.). Found 17 bugs. 6 agents fixed all issues in one pass. |
| **Design References** | Stitch (AI design tool) | Created visual mockups for each page in Stitch, exported as HTML/CSS code, imported into `design_reference/` as design specs for the rebuild. |
| **UI Rebuild (v5)** | Claude Code — 5+4+7 parallel agents | Deleted 63 files, rebuilt from scratch. Agents used Stitch-exported design references as templates — extracted structure and injected real data/logic. Stage 1: 5 public pages, Stage 2: 4 auth pages, Stage 3: 7 admin pages. |
| **Code Editing & Debugging** | Cursor (AI code editor) | VS Code fork with AI integration. Used for editing generated code, debugging runtime issues, inspecting Turbopack errors, and iterating on styling details that required visual feedback. |
| **Polish (v5.1)** | Claude Code — single agent | Targeted fixes: 10 bugs, demo data, dev workflow changes. Single agent for sequential, interdependent fixes. |
| **Deployment (Phase 6)** | Claude Code | Dockerfile multi-stage build, Prisma migration strategy, seed API endpoint, NorthFlank configuration, custom domain setup. |

**Key technique**: Parallel agent execution — dispatching 5–8 specialised agents simultaneously for independent tasks. This compressed what would be multi-day work into hours. Used single-agent mode only when tasks were sequential or interdependent.

---

## 2. Where AI Output Worked Well vs. Needed Correction

### Worked Well

| Area | Detail |
|------|--------|
| **Schema & API generation** | Full Prisma schema and 28 API routes generated correctly on first pass. Atomic transactions, idempotency guards, and foreign key constraints all correct. |
| **Parallel page builds** | 16 pages built by independent agents from the same design spec — no merge conflicts, consistent patterns across all pages. |
| **Security audit** | 8 agents found 17 real bugs: missing auth checks on API endpoints, state machine gaps (rejecting already-approved registrations), race conditions on waitlist promotion. Thorough and systematic. |
| **Complex UI components** | Glassmorphism design system, SVG donut charts, QR scanner integration, print-optimised certificates — all working from design reference mockups without manual intervention. |

### Needed Correction

| Issue | Root Cause | My Fix |
|-------|-----------|--------|
| Prisma 7 auto-installed | AI defaulted to latest version; v7 has breaking changes and less training data | Downgraded to Prisma 5 — AI fluency with library > latest version |
| Auth redirect infinite loop | AI placed login page inside the auth-protected layout group | Restructured route groups: login outside `(protected)/`, dashboard pages inside |
| Stripe `.env` key conflict | AI put placeholder keys in `.env` that overwrote real `.env.local` keys | Commented out placeholders — subtle env variable precedence issue |
| Static pages showed stale data | Server Components pre-rendered at build time; AI didn't anticipate production caching | Added `force-dynamic` to all 9 DB-querying pages |
| Turbopack dev mode crashes | Not a code bug — Next.js 15 Turbopack SSR runtime issue | Switched to `build + start` workflow for development |
| Capacity numbers shown publicly | AI displayed exact seat counts; inappropriate for government events | Changed to "Seats Available" / "Waitlist Open" only — prevents gaming |

---

## 3. Decisions to Override, Refactor, or Discard AI Output

| Decision | What AI Did | What I Did Instead | Why |
|----------|-------------|---------------------|-----|
| **Prisma 5 over 7** | Installed latest (v7) | Downgraded to v5 | AI generates fewer errors with well-documented libraries. Version familiarity > recency. |
| **Dropped Luma → Stripe** | Initial spec included Luma API | Replaced with Stripe | Luma requires paid plan + foreign SaaS — contradicts government data sovereignty. Stripe gives bidirectional data flow (outbound Checkout + inbound webhook). |
| **Complete UI rebuild (v5)** | Could have continued iterating | Deleted 63 files, rebuilt from scratch | After 4 versions of incremental patches, the UI was inconsistent. A clean rebuild with a proper design system was faster than continuing to patch. |
| **Template-first UI** | Generate pages from text descriptions | Generated HTML mockups in Stitch first, then agents extracted structure + injected data | More visually consistent than page-by-page text-to-code generation. |
| **Monorepo architecture** | Could separate frontend/backend | Kept everything in Next.js App Router | One container to deploy, and the AI sees full data flow in one context window — better output quality. |
| **No exact capacity** | Showed "45/100 seats" publicly | "Seats Available" / "Waitlist Open" only | Government context: exact numbers let participants game registration timing. My domain judgment, not AI-suggested. |
| **Auth route restructure** | Login inside auth-protected layout | Moved login outside `(protected)/` route group | AI generated correct auth logic but placed the file in the wrong directory — caused infinite redirect loop. |

---

## 4. What I Would Do Differently with More Time

**Security & Trust**

- **Singpass/Corppass** — replace email+password with national identity verification. Eliminates fake registrations and ties into existing government infrastructure.
- **Zod on all API inputs** — currently trusting client input shape. Zod validates at the API boundary: wrong shape → reject immediately before touching DB.

**Scalability & Performance**

- **Email queue (BullMQ)** — currently email blocks the API response. A queue decouples: save to DB, return success, send email async. Failed emails auto-retry.
- **WebSocket** — check-in stats poll every 10s. 50 concurrent users = 50 requests/10s. WebSocket flips it: server pushes on change. Better UX, less load.

**Quality & Compliance**

- **Integration tests** — registration → approval → payment → check-in is the core flow. One code change could break the Stripe webhook. Automated tests catch this in seconds.
- **WCAG 2.1 AA** — government digital services require accessibility. Glassmorphism UI hasn't been audited for contrast, screen readers, keyboard nav.
- **PDPA** — no data retention or deletion policy. Production needs a Data Protection Impact Assessment.
- **IM8** — mandatory security classification for government ICT systems before go-live.

**Business Logic**

- **Multi-level approval** — current system has flat approve/reject. Government events may need coordinator → director sign-off, especially for paid events or external speakers.
