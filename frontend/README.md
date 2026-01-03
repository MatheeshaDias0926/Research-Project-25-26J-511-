# Edge Driver Monitor — Frontend

This is a Vite + React frontend example for the Edge Driver Monitor project.

Quick start

```bash
cd frontend
npm install
npm run dev
```

Notes
- Login button redirects to backend `/api/auth/google` with a `redirect` query parameter. Backend will redirect back to `/oauth/callback?token=...`.
- Update `VITE_API_URL` in your environment or set it in your shell before running.
