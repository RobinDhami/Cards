#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend exec tsc -b
pnpm --dir frontend exec vite build --base=/static/react/ --outDir=../theme/static/react
python manage.py collectstatic --no-input
