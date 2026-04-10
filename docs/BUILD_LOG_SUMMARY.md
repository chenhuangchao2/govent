# Build Log — GovEvent

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

| Decision | What AI Did / Would Have Done | What I Did Instead | Why |
|----------|-------------------------------|---------------------|-----|
| **Prisma 5 over 7** | Installed latest (Prisma 7) | Downgraded to v5 | AI generates fewer errors with libraries it has more training data on. Version familiarity > recency. |
| **Dropped Luma integration** | Initial spec included Luma API | Replaced with Stripe | Luma requires paid plan + stores data on foreign SaaS — contradicts government data sovereignty. Stripe gives better data flow demo (outbound Checkout + inbound webhook). |
| **Complete UI rebuild at v5.0** | Could have continued iterating v4 UI | Deleted 63 files, rebuilt from scratch | After 4 versions of incremental patches, the UI was inconsistent. A clean rebuild with a proper design system was faster than continuing to patch. |
| **Template-first UI approach** | AI would generate pages from text descriptions | Generated HTML mockups first as design references, then had agents extract structure + inject data | More visually consistent than page-by-page text-to-code generation. |
| **Monorepo architecture** | Could have separated frontend/backend | Kept everything in Next.js App Router | One Docker service to deploy, and the AI can see full data flow in one context window — better output quality. |
| **No exact capacity numbers** | AI showed "45/100 seats" on public pages | Show only "Seats Available" / "Waitlist Open" | Government context: exact numbers let participants game registration timing. My domain judgment, not AI-suggested. |

---

## 4. What I Would Do Differently with More Time

**Security & Trust**

| Area | What I'd Change | Why |
|------|-----------------|-----|
| Auth | Singpass/Corppass instead of email+password | Government identity verification is stronger and more realistic for agency use |
| Input validation | Zod schema validation on all API inputs | Currently trusting client input shape; Zod catches malformed data at the boundary |

**Scalability & Performance**

| Area | What I'd Change | Why |
|------|-----------------|-----|
| Email | Background queue (BullMQ or similar) | Email sending currently blocks the API response; a queue decouples latency |
| Real-time | WebSocket for check-in stats and seat updates | Current polling creates unnecessary load; WebSocket gives instant feedback |

**Quality & Compliance**

| Area | What I'd Change | Why |
|------|-----------------|-----|
| Testing | Integration tests for registration → approval → payment | This is the core business flow and needs automated validation |
| Accessibility | WCAG 2.1 AA audit | Government services must be accessible; current UI hasn't been audited |

**Business Logic**

| Area | What I'd Change | Why |
|------|-----------------|-----|
| Approval workflow | Multi-level approval (registrant → manager → coordinator) | Some government events require hierarchical sign-off beyond simple admin approve |
