# TrackHub

**TrackHub** is a modern business management dashboard for tracking leads, proposals, analysis, transactions, and tasks — built with React, Vite, TypeScript, and Tailwind CSS.

---

## Features

- **Dashboard** — Overview with KPI cards, bar charts, and recent activity
- **Notes** — Color-coded sticky notes with pin, inline edit, search, and tags
- **To-Do** — Task manager with priorities, due dates, and status filters
- **10 modules** — All connected with clean client-side routing
- **Collapsible sidebar** — Smooth expand/collapse with icon tooltips
- **Responsive** — Desktop, tablet, and mobile ready

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| React 19 | UI framework |
| Vite 6 | Build tool |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling |
| Lucide React | Icons |
| React Router v7 | Routing |

---

## Project Structure

```
trackhub/
├── src/
│   ├── assets/
│   │   └── logo.tsx              # TrackHub logo + SVG
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx        # Root layout wrapper
│   │   │   ├── Sidebar.tsx       # Collapsible navigation sidebar
│   │   │   └── Header.tsx        # Top header bar
│   │   ├── ui/
│   │   │   ├── Card.tsx          # Reusable card container
│   │   │   ├── StatCard.tsx      # KPI metric card with trend
│   │   │   ├── Button.tsx        # Button component
│   │   │   ├── Badge.tsx         # Status badge/pill
│   │   │   ├── PageHeader.tsx    # Page title + actions bar
│   │   │   └── PlaceholderModule.tsx
│   │   ├── dashboard/
│   │   │   ├── Charts.tsx        # Bar chart + status bar
│   │   │   └── Sparkline.tsx     # SVG sparkline
│   │   └── notes/
│   │       ├── NoteCard.tsx      # Note card with edit/color/pin
│   │       └── TodoList.tsx      # Full to-do list component
│   ├── hooks/
│   │   ├── useSidebar.ts         # Sidebar collapse state
│   │   ├── useNotes.ts           # Notes CRUD + search
│   │   └── useTodos.ts           # Todo CRUD + filters
│   ├── pages/
│   │   ├── DashboardPage.tsx     # Main dashboard
│   │   ├── NotesPage.tsx         # Notes & To-Do module
│   │   └── PlaceholderPages.tsx  # Blank module pages
│   ├── types/
│   │   └── notes.ts              # TypeScript interfaces
│   ├── utils/
│   │   └── navigation.ts         # Nav config with icons
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
└── package.json
```

---

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

```bash
npm run build   # Production build → dist/
npm run preview # Preview production build
```

---

## GitHub Setup Instructions

### 1. Initialize Git

```bash
cd trackhub
git init
git add .
git commit -m "Initial commit: TrackHub dashboard"
```

### 2. Create GitHub Repository

1. Go to https://github.com/new
2. Name: `trackhub`
3. Do NOT check "Add README"
4. Click **Create repository**

### 3. Connect to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/trackhub.git
```

### 4. Push

```bash
git branch -M main
git push -u origin main
```

### 5. Future updates

```bash
git add .
git commit -m "Your change description"
git push
```

---

## Deployment

### Vercel (Recommended — Free)

1. Sign in at https://vercel.com with GitHub
2. New Project → Import `trackhub`
3. Vite is auto-detected — click **Deploy**
4. Every `git push` to `main` auto-deploys

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`

---

## License

MIT
