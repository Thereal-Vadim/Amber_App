# Amber

**One team, one rhythm** — a real-time coordination app for event crews on show day.

Organizers bring people to the venue; the team sees each other’s status, schedule, and map — without chat threads or “where are you?” calls.

## Features

- **Events** — create an event with date, venue, cover, and description
- **Invites** — join by code or QR, with on-site roles
- **Live board** — team statuses: on site, in transit, ready, gathering
- **Map** — event location and member positions (Mapbox)
- **Schedule** — blocks by location and task, list or grid view
- **Archive** — past events stay off the active board
- **PWA** — install on phone, light and dark themes
- **Desktop + mobile** — separate UI for wide screens and phones

## Stack

| Layer | Tech |
|------|------|
| Framework | [Next.js](https://nextjs.org) 15, React 19, TypeScript |
| UI | Tailwind CSS 4, Framer Motion, Vaul, Lucide |
| State | Zustand, Zod |
| Maps | Mapbox GL |

This is currently a client-side prototype with demo data in the store — no backend or production auth yet.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Mapbox

For the live map, add a token in `.env.local`:

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_token_here
```

Without a token the app still runs; the map shows a hint instead of tiles.

### Scripts

```bash
npm run dev    # development
npm run build  # production build
npm run start  # run the production build
npm run lint   # ESLint
```

## Structure

```
src/
  app/                 # Next.js App Router, layout, PWA manifest
  components/
    EmbersApp.tsx      # mobile UI
    desktop/           # desktop UI (hub, live, schedule, …)
  store/               # Zustand: events, team, schedule
  notifications.ts     # browser notifications
```

## Status

Active UI work around the event-day flow. Backend, real-time sync, and production auth are next.

## License

Private — all rights reserved.
