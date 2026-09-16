#!/usr/bin/env bash
# Copy the current prototype from the design folder into site/index.html (the file Netlify serves).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="../Procurement Control/wireframes/etendering-prototype.html"
cp "$SRC" site/index.html
echo "site/index.html updated ($(wc -c < site/index.html) bytes). Commit and push to deploy."
