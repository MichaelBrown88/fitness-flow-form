# One Assess UI/UX Standards

Companion to [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md). **Design System** = tokens, colour, type, motion, branding. **This doc** = interaction patterns, feedback, accessibility, and how we review UI for consistency.

## Stack (defaults for reviews)

- **Web app:** React 18, Vite, TypeScript, Tailwind, shadcn/ui (Radix).
- **MCP platform id** for UX Laws audits: `web-react` (use `auto` if the snippet mixes patterns).

## Non-negotiables

1. **Tokens first** — Follow DESIGN_SYSTEM: semantic colours, spacing scale, radius, motion. Avoid one-off `slate-*` / `indigo-*` for product chrome when a token exists.
2. **Every async user action** — Observable state: idle → loading → success or error (disable primary control while loading; toasts or inline messages for outcomes).
3. **Errors are recoverable** — Say what failed, what to do next (retry, fix input, contact support). Never toast-only for the only copy of a critical error on screen.
4. **Focus** — Modals, sheets, dialogs: use shadcn/Radix primitives so focus is trapped and returned on close. Do not `document.querySelector().focus()` for dialog flows.
5. **Touch / pointer** — Interactive targets at least ~44×44px effective hit area on mobile (padding counts). Dense tables: row actions still need reachable targets.
6. **Dark mode** — New surfaces must work in light and dark; use theme tokens, not hardcoded light-only greys for primary backgrounds.

## Patterns to reuse

| Situation | Standard |
|-----------|----------|
| **List / CRUD** | Table or card list with clear primary action; empty state explains value + primary CTA; loading skeleton or concise spinner region. |
| **Forms** | Labels (visible or `aria-label` where pattern is compact); validation on submit or blur per flow; helper text for format expectations (e.g. HTTPS URL). |
| **Destructive actions** | Confirm (AlertDialog) or undo window; destructive styling on the confirming control. |
| **Long flows (assessment)** | Progress visible; back/save expectations clear; avoid losing work (draft/autosave where already implemented). |
| **Data density** | Progressive disclosure: defaults simple, details in sheet, drawer, or collapsible. |
| **Public / client-facing** | Air-gap: only public-safe components and data on public routes (see `.cursorrules`). |

## Heuristic lens (Laws of UX)

We align reviews with established heuristics (see [Laws of UX](https://lawsofux.com/)) — e.g. Fitts (target size / distance), Hick (limit simultaneous choices), Jakob (familiar patterns), cognitive load (chunking), feedback and recovery. The **UX Laws MCP** encodes these as structured audits when given source code.

## Review workflow (Cursor + MCP)

MCP servers do **not** read the repo by themselves. The agent **reads files** (`Read` / search), then calls tools with **your code or a focused excerpt**.

### UX Laws MCP (`ux-laws`)

After adding the server to Cursor MCP config, **restart Cursor** so tools appear.

- **`ux_full_audit`** — Pass `code`, `component_description`, `platform` (`web-react` or `auto`), optional `focus_areas`: `heuristics`, `gestalt`, `cognitive`, `principles`.
- **Single-law tools** — e.g. `analyze_fitts_law`, `analyze_cognitive_load` for deep passes on one component.
- **Utilities** — `ux_checklist` (component type + platform), `ux_detect_platform`, `ux_compare_platforms`.

**Prompt template for the agent:**  
“Read `[path/to/Component.tsx]`, run `ux_full_audit` with that file’s JSX + relevant handlers as `code`, `platform: web-react`, and summarize actionable changes that match `docs/UI_UX_STANDARDS.md` and `docs/DESIGN_SYSTEM.md`.”

### UI/UX Pro MCP (`ui-ux-pro`)

Use for **guideline lookup**: `search_stack` (`react`, `shadcn`), `search_all`, `get_design_system` — to back decisions with patterns, not to replace code review.

## PR / feature checklist

- [ ] Tokens + dark mode (DESIGN_SYSTEM)
- [ ] Loading / empty / error states for user-triggered fetches and mutations
- [ ] Focus and keyboard path for modals and primary flows
- [ ] Hit targets and readable contrast on real content
- [ ] Public routes use public-safe UI only
- [ ] Optional: UX Laws audit on the main new component before merge

## Ownership

- Update **DESIGN_SYSTEM.md** when adding visual tokens.
- Update **this doc** when the team agrees a new global UX rule (e.g. all deletes use AlertDialog).
