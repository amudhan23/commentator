# Deploying Commentator

The app is a single Node server (`serve.ts`) that serves the UI and the APIs,
and processes clips with a bundled ffmpeg. It needs a host that runs a long-
lived Node process (Render, Railway, Fly.io, a VPS) — not a static host.

You need one secret: **`GEMINI_API_KEY`**. `ELEVENLABS_API_KEY` is optional
(without it the browser voice is used).

## Fastest: Render (free/starter)

1. Push this repo to GitHub (done).
2. On [render.com](https://render.com): **New → Blueprint**, point it at the repo.
   It reads `render.yaml`.
3. Set `GEMINI_API_KEY` (and optionally `ELEVENLABS_API_KEY`) in the dashboard.
4. Deploy. Your site is live at `https://<name>.onrender.com`.

For persistent uploads/tracks across deploys, attach a **Render Disk** mounted
at `/app/public`.

## Railway

1. New Project → Deploy from GitHub repo.
2. Railway auto-detects Node; start command `npm start`.
3. Add `GEMINI_API_KEY` in Variables. Done.

## Fly.io

```bash
fly launch            # detects the Dockerfile
fly secrets set GEMINI_API_KEY=...   ELEVENLABS_API_KEY=...
fly deploy
```

## Docker (any host)

```bash
docker build -t commentator .
docker run -p 8080:8080 -e GEMINI_API_KEY=... commentator
# open http://localhost:8080
```

## Notes for production

- **Port/host:** the server binds `0.0.0.0` and reads `PORT` from the env
  (platforms set it automatically; the Docker image defaults to 8080).
- **Health check:** `GET /api/health`.
- **Storage:** uploaded clips (`public/clips`), generated tracks
  (`public/tracks`), audio (`public/audio`) and thumbnails (`public/thumbs`)
  are written to disk. Attach a persistent volume at `/app/public` if you want
  them to survive restarts; otherwise they reset on redeploy (fine for a demo).
- **Cost control:** each generated moment is one Gemini call. The free tier is
  ~20/day per model; enable billing on your Google project for real traffic.
- **Uploads** are capped only by memory in this build — put a reverse proxy or
  a body-size limit in front of it before opening to the public at scale.
