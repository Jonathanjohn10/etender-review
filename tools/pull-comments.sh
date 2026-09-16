#!/usr/bin/env bash
# Pull the shared comments into ./review/ as JSON and Markdown.
# Usage: tools/pull-comments.sh [site-url]   (default: $REVIEW_SITE or the URL in tools/site.txt)
set -euo pipefail
cd "$(dirname "$0")/.."
SITE="${1:-${REVIEW_SITE:-$(cat tools/site.txt 2>/dev/null || true)}}"
[ -n "$SITE" ] || { echo "Site URL missing. Pass it as an argument or put it in tools/site.txt"; exit 1; }
SITE="${SITE%/}"
mkdir -p review
curl -fsS "$SITE/api/comments" -o review/comments.json
curl -fsS "$SITE/api/comments?format=md" -o review/comments.md
perl -MJSON::PP -e '
  local $/; my $d = decode_json(<STDIN>);
  my @o = grep { $_->{status} eq "open" } @{$d->{items}};
  printf "rev %d · %d comments · %d open\n", $d->{rev}, scalar @{$d->{items}}, scalar @o;
' < review/comments.json
echo "Written: review/comments.json, review/comments.md"
