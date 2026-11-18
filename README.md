# CampusVote

CampusVote is a secure, transparent, and efficient electronic voting platform for student elections at COMSELEC - BISU Bilar Campus. It provides separate workflows for students casting ballots and administrators managing elections.

## Features

- Student login and election eligibility checks
- Guided ballot flow with voting instructions
- Candidate profiles, platforms, and photos
- Ballot review before final submission
- Voting confirmation receipts
- Admin dashboard with election statistics
- Management for students, elections, positions, candidates, and results
- Supabase Authentication, database, storage, and Edge Functions

## Tech stack

- React 19
- Vite
- React Router
- Tailwind CSS
- Supabase
- Lucide React

## Getting started

### Prerequisites

- Node.js 18 or later
- A Supabase project configured for the CampusVote database and Edge Functions

### Installation

```bash
npm install
```

```bash
npm run dev
```

Vite will print the local URL in the terminal.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Project structure

```text

├── components/     Reusable UI and protected-route components
├── lib/            Supabase client configuration
├── pages/          Public, student, and admin pages
├── App.jsx         Application routes
└── main.jsx        React entry point
```

## Development notes

- Never commit `.env.local` or Supabase credentials.
- Keep authorization and voting rules enforced by the Supabase backend and Edge Functions, not only by client-side checks.
- Run `npm run lint` and `npm run build` before submitting changes.

## License

This project is maintained for the CampusVote student election system.
