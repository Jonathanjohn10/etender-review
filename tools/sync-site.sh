#!/usr/bin/env bash
# Copy the current prototype from the design folder into app/prototype.html (served by the app function after the passcode).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="../Procurement Control/wireframes/etendering-prototype.html"
cp "$SRC" app/prototype.html
echo "app/prototype.html updated ($(wc -c < app/prototype.html) bytes). Commit and push to deploy."
