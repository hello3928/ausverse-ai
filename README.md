# Ausverse AI
---

## Stack

- **Framework** — Next.js 16 (App Router, React 19)
- **Runtime** — Node.js, PM2, nginx reverse proxy
- **Styling** — Tailwind CSS v4 + JetBrains Mono, glassmorphism design system
- **Database** — SQLite via better-sqlite3
- **Auth** — HTTP-only session cookies (bcrypt) + SHA-256 API keys
- **Desktop** — Electron wrapper (Windows)
- **CDN** — Cloudflare
- **PWA** — Installable on iOS, Android, and desktop via `/install`


-

## Project Structure

### Web — `app/` `components/` `hooks/` `lib/`

The Next.js web application.

```
app/
  api/v1/
    chat/                    # AI chat (streaming, tool calling)
    session/auth/            # Login, logout, session check
    session/signup/          # Account registration
    archive/                 # Archive CRUD + file serving
    management/              # Admin: users, stats, logs
    sessions/                # Server-side chat session storage
    ping/                    # Heartbeat / last-active
    avatar/                  # User avatar
    background/              # Custom background upload
    keys/                    # API key generate / revoke
    settings/                # User preferences
    announcement/            # Site-wide announcement
    system-prompt/           # AI system prompt (admin)
    status/                  # Health checks
  archive/                   # Archive pages
  login/ signup/             # Auth pages
  settings/                  # Settings page
  status/                    # Status page
  management/                # Admin panel
  install/                   # PWA install instructions
  error/[code]/              # Error pages (400-504)

components/
  chat/                      # Chat interface
    ChatPage.tsx             #   Main layout + auth gate
    ChatMain.tsx             #   Message thread + input
    ChatSidebar.tsx          #   Session list, nav, account menu
    ConsoleBanner.tsx        #   Welcome banner
  archive/                   # Archive
    ArchiveGrid.tsx          #   Listing grid
    ArchivePreviewInline.tsx #   Inline preview in chat
  admin/                     # Admin
    ManagementPanel.tsx      #   Management console
  layout/                    # Layout
    PageShell.tsx            #   Shared page wrapper
    ThemeScript.tsx          #   Theme initialisation
    ErrorPage.tsx            #   Error pages
    InstallPrompt.tsx        #   PWA install prompt
  ui/                        # Shared UI
    ConfirmDialog.tsx        #   Confirmation modal
    SmartImage.tsx           #   Image with loading states
    AgencySeal.tsx           #   Decorative seal

hooks/                       # React hooks
  useChatSessions.ts         #   Chat session state + sync
  useIsIOS.ts                #   iOS detection

lib/                         # Server utilities
  auth.ts                    #   Session cookies
  data.ts                    #   Data layer (SQLite)
  db.ts                      #   Database schema
  email.ts                   #   Email client
  apikeys.ts                 #   API key hashing
  rag.ts                     #   RAG retrieval
  search.ts                  #   Web search
  avatars.ts                 #   Avatar definitions
  announcement.ts            #   Announcements
```

### Desktop — `desktop/`

Electron wrapper for Windows. Loads the live site in a frameless window with native title bar overlay.

```
desktop/
  main.js                    # Main process
  preload.js                 # Context bridge
  electron-builder.yml       # Packaging config
  icon.ico                   # App icon
  package.json
```

### Infrastructure — `infra/`

Server and CDN configuration.

```
infra/
  nginx.conf                 # nginx reverse proxy
  ecosystem.config.js        # PM2 process config
  cloudflare-worker-503.js   # Cloudflare 503 fallback
  503.html                   # Static maintenance page
```

### Scripts — `scripts/`

CLI utilities for server administration.

```
scripts/
  manage-users.js            # User management
  promote.mjs                # Promote user to admin
  build-rag.js               # Build RAG index
  migrate-json-to-sqlite.js  # JSON to SQLite migration
```

---

## Development

```bash
npm install
npm run dev
```

Requires `.env.local` with API keys for AI, search, and email services. Data files in `/data/` are auto-created on first write.

---

## Deployment

Runs behind nginx, managed by PM2.

```bash
./deploy-local.sh
```

Rsyncs source to the server, builds, and restarts PM2.

Bootstrap the first admin:

```bash
node scripts/promote.mjs <username>
```

---

## Security

- **Passwords** — bcrypt hashed, min 6 / max 256 chars
- **Sessions** — HTTP-only, SameSite=strict, Secure in production
- **API keys** — SHA-256 hash stored; plaintext shown once
- **Archive files** — Stored outside public directory, served via nginx
- **File uploads** — Extension whitelist, 5 GB cap
- **Data files** — Excluded from version control
