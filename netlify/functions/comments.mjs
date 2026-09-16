// Shared comment store for the E-Tendering prototype review.
// GET  /api/comments            -> { v, rev, seq, items }
// GET  /api/comments?since=N    -> { unchanged: true } when nothing changed after rev N
// GET  /api/comments?format=md  -> Markdown digest (same layout as the panel's "Copy as Markdown")
// POST /api/comments            -> { op: add | update | reply | delete | clear, ... } ; returns the full store
import { getStore } from '@netlify/blobs';

const KEY = 'db';
const blank = () => ({ v: 1, rev: 0, seq: 0, items: [] });
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS } });
const text = (s, status = 200) => new Response(s, { status, headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store', ...CORS } });
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const CATS = { flow: 'Flow', ui: 'UI', copy: 'Copy', question: 'Question', bug: 'Bug' };
const TABS = { overview: 'Overview', vendors: 'Vendors', evaluation: 'Evaluation', comparison: 'Comparison', pos: 'Purchase orders', activity: 'Activity' };
const VTABS = { info: 'Tender information', prices: 'Price schedule', terms: 'Terms & Conditions', docs: 'Documents' };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const p2 = n => String(n).padStart(2, '0');
const fdt = s => { const d = new Date(s); return isNaN(d) ? String(s) : `${p2(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const when = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${d.getDate()} ${MON[d.getMonth()]} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const rid = () => (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

function clean(it) {
  const s = it.screen && typeof it.screen === 'object' ? it.screen : {};
  const a = it.anchor && typeof it.anchor === 'object' ? it.anchor : null;
  return {
    id: str(it.id, 64) || rid(),
    n: 0,
    kind: it.kind === 'note' ? 'note' : 'pin',
    cat: CATS[it.cat] ? it.cat : 'flow',
    text: str(it.text, 2000).trim(),
    author: str(it.author, 40).trim() || 'Reviewer',
    ts: str(it.ts, 40) || new Date().toISOString(),
    status: it.status === 'resolved' ? 'resolved' : 'open',
    replies: Array.isArray(it.replies) ? it.replies.slice(0, 100).map(r => ({ author: str(r.author, 40), text: str(r.text, 2000), ts: str(r.ts, 40) })) : [],
    imported: it.imported && typeof it.imported === 'object' ? { from: str(it.imported.from, 40), n: +it.imported.n || 0 } : null,
    screen: {
      user: str(s.user, 40), userName: str(s.userName, 80), side: str(s.side, 10), role: str(s.role, 80),
      view: str(s.view, 20), id: str(s.id, 40) || null, tab: str(s.tab, 20) || null, vtab: str(s.vtab, 20) || null, step: +s.step || null,
      tenderTitle: str(s.tenderTitle, 120) || null, tenderStatus: str(s.tenderStatus, 40) || null, rev: s.rev == null ? null : +s.rev,
      modal: s.modal && typeof s.modal === 'object' ? { key: str(s.modal.key, 40), title: str(s.modal.title, 120), ctx: s.modal.ctx && typeof s.modal.ctx === 'object' ? s.modal.ctx : {} } : null,
      now: str(s.now, 40), scenario: str(s.scenario, 40) || null, menu: str(s.menu, 60) || null
    },
    anchor: a ? { scope: str(a.scope, 10), sel: str(a.sel, 400), idx: +a.idx || 0, fx: +a.fx || 0.5, fy: +a.fy || 0.5, label: str(a.label, 80), px: +a.px || 0, py: +a.py || 0, vw: +a.vw || 0, vh: +a.vh || 0 } : null
  };
}

function where(c) {
  const s = c.screen || {}, parts = [];
  parts.push(`${s.userName || s.user} (${s.role || ''})`);
  if (s.id && s.view !== 'list' && s.view !== 'vlist') parts.push(`${s.id}${s.tenderTitle ? ` "${s.tenderTitle}"` : ''}${s.tenderStatus ? ` (${s.tenderStatus}${s.rev != null ? `, rev ${s.rev}` : ''})` : ''}`);
  else if (s.view === 'wizard') parts.push('New tender (not saved)');
  if (s.view === 'tender') parts.push(`${TABS[s.tab] || s.tab} tab`);
  else if (s.view === 'vtender') parts.push(`${VTABS[s.vtab] || s.vtab} tab`);
  else if (s.view === 'wizard') parts.push(`Wizard step ${s.step}`);
  else if (s.view === 'vlist') parts.push('My tenders list');
  else parts.push('Tender list');
  if (s.modal && (!c.anchor || c.anchor.scope === 'modal' || c.kind === 'note')) parts.push(`in dialog "${s.modal.title || s.modal.key}"`);
  if (c.anchor) parts.push(`on ${c.anchor.label}`);
  if (s.now) parts.push(`clock ${fdt(s.now)}`);
  if (s.scenario) parts.push(`scenario "${s.scenario}"`);
  return parts.join(' · ');
}

function markdown(db, status) {
  const items = [...db.items].filter(c => !status || c.status === status).sort((a, b) => a.n - b.n);
  const open = db.items.filter(i => i.status === 'open').length;
  const d = new Date();
  const lines = [`# E-Tendering prototype — review comments · ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} · ${open} open, ${db.items.length - open} resolved`, ''];
  items.forEach(c => {
    const imp = c.imported ? ` (imported from ${c.imported.from} #${c.imported.n})` : '';
    lines.push(`${c.n}. [${CATS[c.cat] || c.cat}] ${c.status === 'open' ? 'OPEN' : 'RESOLVED'} — ${c.kind === 'note' ? 'Note (no pin) — ' : ''}${c.author}${imp}, ${when(c.ts)}`);
    lines.push(`   Where: ${where(c)}`);
    String(c.text).split(/\r?\n/).forEach(l => lines.push(`   > ${l}`));
    (c.replies || []).forEach(r => lines.push(`   ↳ ${r.author}, ${when(r.ts)}: ${String(r.text).replace(/\r?\n/g, ' / ')}`));
    lines.push('');
  });
  return lines.join('\n').trimEnd() + '\n';
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });
  const store = getStore('review-comments');
  const url = new URL(req.url);
  let db = (await store.get(KEY, { type: 'json' })) || blank();

  if (req.method === 'GET') {
    if (url.searchParams.get('format') === 'md') return text(markdown(db, url.searchParams.get('status')));
    const since = +url.searchParams.get('since');
    if (since && since === db.rev) return json({ unchanged: true, rev: db.rev });
    return json(db);
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let b;
  try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const find = id => db.items.find(i => i.id === id);
  let extra = {};
  switch (b.op) {
    case 'add': {
      const it = b.item;
      if (!it || typeof it.text !== 'string' || !it.text.trim()) return json({ error: 'text required' }, 400);
      let ex = it.id && find(it.id);
      if (!ex) { ex = clean(it); db.seq += 1; ex.n = db.seq; db.items.push(ex); db.rev += 1; }
      extra = { n: ex.n, id: ex.id };
      break;
    }
    case 'update': {
      const c = find(b.id); if (!c) return json({ error: 'not found' }, 404);
      const p = b.patch && typeof b.patch === 'object' ? b.patch : {};
      const cl = clean(Object.assign({}, c, p));
      for (const k of ['text', 'cat', 'status', 'anchor', 'screen', 'author']) if (k in p) c[k] = cl[k];
      db.rev += 1;
      break;
    }
    case 'reply': {
      const c = find(b.id); if (!c) return json({ error: 'not found' }, 404);
      const r = b.reply; if (!r || !str(r.text, 2000).trim()) return json({ error: 'reply text required' }, 400);
      const rep = { author: str(r.author, 40).trim() || 'Reviewer', text: str(r.text, 2000).trim(), ts: str(r.ts, 40) || new Date().toISOString() };
      if (!(c.replies || []).some(x => x.ts === rep.ts && x.author === rep.author)) { c.replies = (c.replies || []).concat(rep); db.rev += 1; }
      break;
    }
    case 'delete': {
      const before = db.items.length;
      db.items = db.items.filter(i => i.id !== b.id);
      if (db.items.length !== before) db.rev += 1;
      break;
    }
    case 'clear': {
      db = { v: 1, rev: db.rev + 1, seq: 0, items: [] };
      break;
    }
    default: return json({ error: 'unknown op' }, 400);
  }
  await store.setJSON(KEY, db);
  return json({ ...db, ...extra });
};

export const config = { path: '/api/comments' };
