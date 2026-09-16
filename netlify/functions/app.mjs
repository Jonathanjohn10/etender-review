// Serves the prototype HTML only when the review passcode is right.
// The prototype lives in app/prototype.html, bundled with the function (netlify.toml included_files) — never on the public site.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type, x-review-code' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS } });

function findFile() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const cands = [
    path.resolve(here, '../../app/prototype.html'),
    path.resolve(here, 'app/prototype.html'),
    path.resolve(process.cwd(), 'app/prototype.html'),
    path.resolve(process.env.LAMBDA_TASK_ROOT || '.', 'app/prototype.html'),
    path.resolve('/var/task/app/prototype.html')
  ];
  return cands.find(p => existsSync(p)) || null;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });
  const need = (process.env.REVIEW_CODE || '').trim();
  const url = new URL(req.url);
  let got = (req.headers.get('x-review-code') || url.searchParams.get('code') || '').trim();
  if (!got && req.method === 'POST') { try { got = String((await req.json()).code || '').trim(); } catch (e) { got = ''; } }
  if (need && got !== need) return json({ error: 'passcode' }, 401);
  if (url.searchParams.get('check') === '1') return json({ ok: true });
  const file = findFile();
  if (!file) return json({ error: 'prototype file not bundled' }, 500);
  const html = await readFile(file, 'utf8');
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
};

export const config = { path: '/api/app' };
