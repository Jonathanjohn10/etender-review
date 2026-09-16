#!/usr/bin/env bash
# Post a reply (and optionally resolve) to comment #N from the designer.
# Usage: tools/reply.sh N "reply text" [--resolve] [--author "Name"]
set -euo pipefail
cd "$(dirname "$0")/.."
SITE="${REVIEW_SITE:-$(cat tools/site.txt 2>/dev/null || true)}"; SITE="${SITE%/}"
[ -n "$SITE" ] || { echo "Site URL missing (tools/site.txt or REVIEW_SITE)"; exit 1; }
CODE="${REVIEW_CODE:-$(cat tools/code.txt 2>/dev/null || true)}"
N="${1:?comment number}"; TEXT="${2:?reply text}"; shift 2
RESOLVE=0; AUTHOR="${REVIEW_AUTHOR:-Designer}"
while [ $# -gt 0 ]; do case "$1" in --resolve) RESOLVE=1;; --author) AUTHOR="$2"; shift;; esac; shift; done
[ -f review/comments.json ] || curl -fsS -H "x-review-code: $CODE" "$SITE/api/comments" -o review/comments.json
ID=$(perl -MJSON::PP -e 'local $/; my $d = decode_json(<STDIN>); for (@{$d->{items}}) { if ($_->{n} == $ARGV[0]) { print $_->{id}; exit } }' "$N" < review/comments.json)
[ -n "$ID" ] || { echo "No comment #$N in review/comments.json (run tools/pull-comments.sh first)"; exit 1; }
TS=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
BODY=$(perl -MJSON::PP -e 'print encode_json({ op => "reply", id => $ARGV[0], reply => { author => $ARGV[1], text => $ARGV[2], ts => $ARGV[3] } })' "$ID" "$AUTHOR" "$TEXT" "$TS")
curl -fsS -H "x-review-code: $CODE" -X POST -H 'content-type: application/json' --data "$BODY" "$SITE/api/comments" -o review/comments.json
if [ "$RESOLVE" = 1 ]; then
  BODY=$(perl -MJSON::PP -e 'print encode_json({ op => "update", id => $ARGV[0], patch => { status => "resolved" } })' "$ID")
  curl -fsS -H "x-review-code: $CODE" -X POST -H 'content-type: application/json' --data "$BODY" "$SITE/api/comments" -o review/comments.json
fi
echo "Replied to #$N$( [ "$RESOLVE" = 1 ] && echo ' and resolved it')."
