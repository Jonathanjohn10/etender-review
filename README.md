# E-Tendering prototype — shared review

Passcode page (`site/index.html`) + the prototype (`app/prototype.html`, served only through `/api/app` after the passcode) + one Netlify Function (`netlify/functions/comments.mjs`) that stores review comments in Netlify Blobs, so everyone with the link sees the same numbered comments and replies.

## Reviewers (managers)
Open the site link, type the passcode once (remembered by the browser). Click **💬 Comments** in the purple bar, **Add comment**, click anywhere on the screen, type. First comment asks for a name once. Nothing else to do.

## Designer
- Designer view: open the site with `?designer` at the end of the URL to see Import and Clear all.
- `tools/pull-comments.sh` → `review/comments.json` + `review/comments.md`
- `tools/reply.sh 7 "Answer text" [--resolve]` → posts a reply to #7 (and resolves it) so reviewers see it in the panel
- `tools/sync-site.sh` → copies the latest prototype from `../Procurement Control/wireframes/` into `app/`; commit + push deploys
- Site URL goes in `tools/site.txt`; the passcode goes in `tools/code.txt` (git-ignored). Both can also be given as `REVIEW_SITE` / `REVIEW_CODE` env vars.

## Passcode
Set `REVIEW_CODE` in Netlify → Site configuration → Environment variables. Every request must send it (`x-review-code` header or `?code=`). The panel asks reviewers for it once and remembers it in their browser.

## API
- `GET /api/comments` — whole store `{ v, rev, seq, items }`
- `GET /api/comments?format=md` — Markdown digest (`&status=open` to filter)
- `POST /api/comments` — `{ op: add|update|reply|delete|clear, ... }`

Anyone with the link **and the passcode** can read and write comments. Do not put anything confidential in the prototype data.
