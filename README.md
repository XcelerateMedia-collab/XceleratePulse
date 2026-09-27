# Xcelerate Pulse

Next.js enterprise performance tracking & analytics dashboard for creators and media campaigns, with automated Google Sheets sync, proof verification, and Turso / SQLite persistence.

## Features

- **Real-Time Performance Dashboard**: Filter metrics by client, tier, and date range.
- **Proof & Milestone Verification**: Track uploaded proofs, screenshots, and campaign deliverables.
- **Automated Google Sheets Sync**: Two-way data synchronization via Google Apps Script webhooks.
- **Dual-Mode Persistence**: Seamlessly switches between local SQLite and Turso cloud database.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure your Turso database credentials and sync secret key if using cloud sync.

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router)
- **UI & Styling**: React 19, Tailwind CSS, Lucide Icons, Three.js
- **Database**: LibSQL / Turso Cloud & SQLite
