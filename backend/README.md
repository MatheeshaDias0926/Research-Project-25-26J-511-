# Edge Driver Monitor — Backend

Backend for the edge driver monitoring platform. Uses Express, MongoDB, Passport (Google OAuth), JWT, and Cloudinary.

Quick start

1. Install dependencies:

```bash
cd backend
npm install
```

2. Copy `.env.example` to `.env` and set values.

3. Run in development:

```bash
npm run dev
```

API highlights

- `GET /api/auth/google` — start Google OAuth flow
- `GET /api/auth/google/callback` — OAuth callback; returns JWT
- `POST /api/devices/create` — create device (protected)
- `POST /api/devices/provision` — provision device using `deviceId` and `password`
- `POST /api/upload/image` — upload image (multipart/form-data field `image`)
