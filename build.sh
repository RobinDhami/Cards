#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend build
python manage.py collectstatic --no-input
