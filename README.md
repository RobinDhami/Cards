# Cards

Django backend with a React/Vite frontend.

## Local setup (Windows)

Requirements: Python 3.11+, Node.js, pnpm, and Git.

```powershell
.\setup.cmd
.\run-dev.cmd
```

The setup script creates an ignored `.env`, installs Python packages into `.venv`, installs and builds the React frontend, applies database migrations, and runs Django's system checks.

For frontend development in a second terminal:

```powershell
cd frontend
pnpm dev
```

The Django app runs at `http://127.0.0.1:8000`; Vite runs at `http://127.0.0.1:5173`.

## Push changes to main

```powershell
git status
git add .
git commit -m "Describe your change"
git push origin main
```

Never commit `.env`, database files, uploaded media, or virtual environments.
