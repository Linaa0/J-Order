# AGENTS.md - Standing Instructions for J-Order

## Project Overview
- **Project**: J-Order, a gas ordering and tracking platform for Gas Engineering and Services Ltd, Kigali.
- **Tech Stack**:
  - Next.js 14 App Router
  - TypeScript
  - Tailwind CSS
  - Prisma + PostgreSQL
  - NextAuth with OTP login
  - next-intl (Locales: `en`, `fr`, `rw`, `sw`)
  - Dexie (Offline orders)
- **Constraint**: Do NOT change the stack.

---

## Standing Rules
1. **Environment & Database Safety**:
   - Never touch `.env` files.
   - Never print secrets.
   - Never run `db reset`, `db push`, `migrate`, or `seed` without explicit user approval.
2. **Database Schema**:
   - Never change the Prisma schema without asking first.
3. **Task Execution & Quality Verification**:
   - Do one task at a time.
   - After each task run:
     1. `npx tsc --noEmit`
     2. `npm run lint`
     3. `npm run test`
     4. `npm run build`
     5. `npm run i18n:check`
   - Report the results honestly.
   - List the files changed.
   - Stop and wait for user instruction.
4. **Localization (i18n)**:
   - All visible text must go through `next-intl` across all 4 locales (`en`, `fr`, `rw`, `sw`).
   - Strictly NO hardcoded strings.
5. **Scope Control**:
   - No new features unless explicitly asked.
   - Focus on fixing and polishing what exists.

---

## Design System
- **Typography & Layout**:
  - One typeface: **Inter**.
  - Spacing strictly on an **8px grid**.
  - Flat white cards on a light gray background, 1px border, 8–12px border radius.
  - No gradients, no glass effects, no emoji icons.
- **Color Palette & Accent**:
  - **Navy** for structure and headings.
  - **Orange** strictly and only for the single primary action per screen.
- **UI Components & Readability**:
  - Consistent status pills.
  - Friendly empty states.
  - Loading skeletons for asynchronous states.
  - Readable text with a minimum font size of 14px.
- **Responsiveness**:
  - No horizontal scrolling and no nested scroll containers.
  - Check viewports at 375px (mobile), 768px (tablet), and 1280px (desktop).
