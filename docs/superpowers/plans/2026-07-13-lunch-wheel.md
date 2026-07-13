# Lunch Box Wheel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use inline execution in this session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permanent public lunch box backed by SQLite and a frontend wheel that lets users contribute lunch items and randomly pick one.

**Architecture:** The Fastify server owns persistence, seed data, validation, and random picking. The React frontend loads items, submits `{ item, name }`, renders a CSS wheel, and calls the backend pick endpoint so future pick analytics can be added without changing the frontend data flow.

**Tech Stack:** Fastify, TypeScript, Node `node:sqlite`, React 18, Vite, animal-island-ui.

## Global Constraints

- User-created lunch items permanently enter the public lunch box.
- Users only fill two fields: `item` and `name`.
- Backend validates and trims both fields.
- No login, moderation, delete UI, or ranking in the first version.
- Backend unavailable state must not break the whole page.

---

### Task 1: Backend lunch store and routes

**Files:**
- Modify: `src/lib/store.ts`
- Create: `src/routes/lunch.ts`
- Modify: `src/app.ts`
- Modify: `src/app.test.ts`

**Interfaces:**
- Produces: `store.listLunchItems()`, `store.addLunchItem(item, name)`, `store.pickLunchItem()`
- Produces routes: `GET /api/lunch/items`, `POST /api/lunch/items`, `POST /api/lunch/pick`

- [ ] Add `lunch_items` table and seed preset items once.
- [ ] Add store methods for listing, adding, and random picking.
- [ ] Add route validation: `item` length 1-30, `name` length 1-20.
- [ ] Add tests for listing presets, creating a user item, validation, and picking.

### Task 2: Frontend lunch wheel

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: backend lunch routes from Task 1.

- [ ] Add `LunchWheelCard` component near the bingo section.
- [ ] Load lunch items from `/api/lunch/items`.
- [ ] Submit user item via `/api/lunch/items`.
- [ ] Spin the wheel by calling `/api/lunch/pick` and animating to the picked segment.
- [ ] Add resilient empty/error states.

### Task 3: Verification

- [ ] Run backend tests and build.
- [ ] Run frontend build.
- [ ] Review git diffs for both repositories.
