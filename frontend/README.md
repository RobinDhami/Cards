# Tap2Connect React Frontend

This is the new React frontend foundation for the Django project.

## Stack

- Vite
- React 19
- TypeScript
- lucide-react

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
```

The development server runs at:

```text
http://127.0.0.1:5173
```

## Migration Plan

1. Keep Django as the backend, auth, database, media, and API layer.
2. Build new dashboard, builder, shop, and profile preview screens here.
3. Connect React to Django REST Framework APIs.
4. Move routes from Django templates to React gradually after each screen is stable.

The current demo includes React preview components for:

- Organization Focus
- Modern Identity
