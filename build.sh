#!/usr/bin/env bash

set -o errexit

APP_DIR="/home/tap2connectnepal.com/public_html"

source "$APP_DIR/venv/bin/activate"

echo "Python:"
python --version

echo "Pip:"
pip --version

pip install -r "$APP_DIR/requirements.txt"

pnpm --dir "$APP_DIR/frontend" install --frozen-lockfile

pnpm --dir "$APP_DIR/frontend" exec tsc -b

pnpm --dir "$APP_DIR/frontend" exec vite build --base=/static/react/ --outDir=../theme/static/react

python "$APP_DIR/manage.py" collectstatic --no-input
