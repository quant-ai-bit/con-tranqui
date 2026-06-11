# Agent Instructions: Next.js React Expert & Web Design Pro

This file defines the specialized rules and best practices for developing the **CONTRATO TELLO** application.

---

## Skill: Next.js React Expert

### Core Guidelines
1. **Next.js App Router & Server Components:**
   - Place folders appropriately in `src/app`.
   - Use React Server Components (RSC) by default for fetching and SEO.
   - Use `"use client"` only for client-side interactivity (state, effects, browser events).
   - Strategically use `layout.tsx`, `page.tsx`, `loading.tsx` and `error.tsx`.
2. **Data Ingestion & Mutation:**
   - Perform database queries or PDF/docx parsing direct in RSC asynchronously.
   - Use Server Actions for database mutations with Prisma.
   - Revalidate caching via `revalidatePath` or `revalidateTag` in Server Actions.
3. **Quality Checklist:**
   - [ ] Do interactive component files start with `"use client"`?
   - [ ] Are API/DB calls performed on the server-side whenever possible?
   - [ ] Are credentials called via `process.env` (never hardcoded)?
   - [ ] Does the codebase compile successfully without TS errors (`npm run build`)?

---

## Skill: Web Design Pro

### Aesthetics & Quality Checklist
- **Aesthetic standard**: Wow the user with curated harmonious HSL palettes, subtle gradients, and custom micro-interactions.
- **Checklist**:
  - [ ] Is the page responsive on mobile, tablet, and desktop?
  - [ ] Do interactive elements (buttons, inputs) have visible hover and active visual feedback?
  - [ ] Are CSS variables used for theme colors and styling tokens?
  - [ ] Do colors pass accessibility contrast checks?
