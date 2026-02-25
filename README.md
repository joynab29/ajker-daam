# Ajker Daam

Crowd-sourced market price tracker for Bangladesh essentials.

## Layout

- `client/` — React + Vite (JS)
- `server/` — Express + Mongoose (JS, ESM)

## Prereqs

- Node.js 20+
- MongoDB running locally (default URI `mongodb://127.0.0.1:27017/ajker_daam`)

## Run locally

```bash
# server
cd server
cp .env.example .env
npm install
npm run dev

# client (in another terminal)
cd client
npm install
npm run dev
```

Server: http://localhost:4000
Client: http://localhost:5173
