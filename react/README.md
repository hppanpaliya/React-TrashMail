# TrashMail Frontend

React frontend for the TrashMail disposable-email application.

## Stack

- **React 19** + **Vite 8** (`@vitejs/plugin-react`), JSX components in `.jsx`
- **Tailwind CSS v4** (via `@tailwindcss/vite`) with a custom design-token system — no component library
- **framer-motion 12** for page transitions and micro-interactions (respects `prefers-reduced-motion`)
- **Vitest** + Testing Library for tests, ESLint (flat config) + Prettier
- Icons: `lucide-react` · Fonts: Inter (`@fontsource-variable/inter`) + Abhaya Libre for the wordmark

## Features

- Disposable inbox with live updates over SSE (no polling) and an unread count in the browser tab title.
- Server-side search, read/unread filter, and sorting with debounced input and pagination.
- **Command palette (⌘K / Ctrl+K)** with fuzzy-filtered actions, plus single-key shortcuts: `/` focus search, `c` copy address, `n` new random address, `d` toggle theme, `?` shortcuts help.
- **Per-email expiry countdown** chips driven by `GET /api/config` (`retentionDays`); the same endpoint is the source of truth for the domain picker on Generate.
- **Webhook settings dialog** per inbox (URL, signing secret, enable toggle, test delivery with live status).
- **Watch mode** at `/watch` and `/watch/:emailId` — an ultra-compact, text-first inbox reader tuned for ~200px viewports (Apple Watch WebKit). Auto-detects OTP codes and renders them huge with tap-to-copy. Linked from the command palette, the inbox header, and the QR dialog (toggle to encode the watch URL).
- QR code for any email address (Generate page and inbox header) for quick scanning on a phone.
- Recent inboxes: the last 8 visited addresses appear as chips on the Generate page and in a quick-switch menu in the inbox header.
- Delete a single email or the whole inbox (Delete All) with confirmation.
- Download the raw email (`.eml`) from the email view.
- Inline thumbnails for image attachments (click to preview); all attachments download via authenticated blob requests.
- Copy-to-clipboard with feedback snackbars, relative timestamps, loading skeletons, and full dark/light theming (dark-first, persisted, system-pref default).
- Desktop: slim navigation rail. Mobile: sticky header + thumb-friendly bottom tab bar (safe-area aware).

## Environment Variables

Variables use the `REACT_APP_` prefix (Vite is configured with `envPrefix: ["VITE_", "REACT_APP_"]` for backward compatibility).

```env
REACT_APP_API_URL=http://localhost:4000
REACT_APP_DOMAINS=["example.com"]
```

- `REACT_APP_API_URL`: Backend API base URL. Leave empty (`""`) when the mailserver serves the frontend from the same origin.
- `REACT_APP_DOMAINS`: Fallback list of email domains, used only until `GET /api/config` responds.

### Resolution order (runtime injection)

`src/env.js` merges, in increasing priority:

1. Built-in defaults (`""` API URL, example domain)
2. Build-time values from `.env` via `import.meta.env`
3. **Runtime** values from `window.env`, loaded from `/env.js` (`public/env.js` in dev)

In Docker, `docker_start.sh` regenerates `build/env.js` with `npx react-inject-env set` at container start, so the same image works against any API URL/domain set — runtime always wins over build-time.

## Scripts

```bash
npm start          # Vite dev server
npm run build      # Production build into build/ (Docker + mailserver static serving depend on this path)
npm run preview    # Serve the production build locally
npm test           # Vitest (single run); npm run test:watch for watch mode
npm run lint       # ESLint; npm run lint:fix to autofix
npm run format     # Prettier write; npm run format:check to verify
```

## Notes

- Requires Node 22.12+ for Vite 8; the project targets Node 24 LTS (see the root `.nvmrc` and Docker base image).
- The build output directory is `build/` (not Vite's default `dist/`) — the Docker image and the mailserver's static file serving rely on it.
