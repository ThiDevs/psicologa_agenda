# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v55.0.0/ before writing any code.

# Production domain routing

Current Cloudflare Tunnel routes:

- `https://felicio.app/api` routes to the backend API at `http://localhost:3001`.
- `https://felicio.app` routes to the Expo web app at `http://localhost:8081`.

The app must treat `/api` as part of the API root. In production, use
`EXPO_PUBLIC_API_URL=https://felicio.app/api` or the built-in default API base.
Do not send API requests to root paths such as `https://felicio.app/auth/...`,
because those hit the Expo web route instead of the backend.
