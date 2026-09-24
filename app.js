'use strict';
const $ = s => document.querySelector(s);
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => n.toLocaleString('en-US');
const usd = n => '$' + Math.round(n).toLocaleString('en-US');

/* ---------- CSV helpers ---------- */
function parseCSV(t) {
  const rows = []; let row = [], f = '', q = false;
  t = t.replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ''));
}
const toCSV = rows => rows.map(r => r.map(v => { v = String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n');
function save(name, rows) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + toCSV(rows)], { type: 'text/csv;charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function readFile(f) {
  return new Promise((ok, no) => {
    if (!/\.csv$/i.test(f.name) && !/csv/.test(f.type)) return no(new Error(`"${f.name}" is not a CSV file. In Excel, use File > Save As > CSV, then upload that file.`));
    if (f.size > 5e6) return no(new Error(`"${f.name}" is larger than 5 MB. Try a smaller file.`));
    const r = new FileReader();
    r.onload = () => ok(parseCSV(String(r.result)));
    r.onerror = () => no(new Error(`Could not read "${f.name}".`));
    r.readAsText(f);
  });
}
function table(rows, max = 8) {
  const b = rows.slice(1, max + 1);
  return '<div class="tw"><table><thead><tr>' + rows[0].map(h => `<th>${esc(h)}</th>`).join('') + '</tr></thead><tbody>' +
    b.map(r => '<tr>' + rows[0].map((_, i) => { const v = r[i] ?? ''; return v.trim() === '' ? '<td class="miss">empty</td>' : `<td>${esc(v)}</td>`; }).join('') + '</tr>').join('') +
    '</tbody></table></div>' + (rows.length - 1 > max ? `<p class="note">Showing ${max} of ${fmt(rows.length - 1)} rows</p>` : '');
}
function msg(id, text, warn) { const el = $('#' + id); el.textContent = text || ''; el.hidden = !text; el.classList.toggle('warn', !!warn); }
function stats(id, list) { $('#' + id).innerHTML = list.map(([l, v]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join(''); }

/* ---------- Demo 1: Data Cleaner ---------- */
const SAMPLE_CLEAN = [
  'Customer Name , E-mail,City ,Order Total', '  Ava Johnson,ava@example.com,Austin ,120.50', 'Liam  Chen,liam@example.com,Denver,89.99',
  'Sofia Reyes,,Miami,240.00', 'Ava Johnson,ava@example.com,Austin,120.50', ' Noah Patel ,noah@example.com,,45.25',
  'Liam Chen,liam@example.com,Denver,89.99', 'Emma Brown,emma@example.com,Seattle,', 'Mia Kim,mia@example.com,Boston,310.10',
  'Noah Patel,noah@example.com,,45.25', 'Lucas Silva,lucas@example.com,Chicago,76.00'].join('\n');
let cleaned = null;
function clean(rows) {
  const seen = {}, nh = rows[0].map((x, i) => {
    let n = x.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'column_' + (i + 1);
    if (seen[n]) { seen[n]++; n += '_' + seen[n]; } else seen[n] = 1; return n;
  });
  const out = [nh], keys = new Set(); let trimmed = 0, missing = 0, dup = 0;
  rows.slice(1).forEach(r => {
    const c = nh.map((_, i) => { const v = r[i] ?? '', t = v.replace(/\s+/g, ' ').trim(); if (t !== v) trimmed++; if (t === '') missing++; return t; });
    const k = c.join('\u0001').toLowerCase();
    if (keys.has(k)) { dup++; return; }
    keys.add(k); out.push(c);
  });
  return { out, trimmed, missing, dup, n: rows.length - 1 };
}
function runClean(rows) {
  if (rows.length < 2) { msg('c-msg', 'This CSV has no data rows. Add a header row and at least one row of data.'); return; }
  msg('c-msg', '');
  const r = clean(rows); cleaned = r.out;
  stats('c-stats', [['Rows processed', fmt(r.n)], ['Duplicates removed', fmt(r.dup)], ['Missing values found', fmt(r.missing)], ['Cells trimmed', fmt(r.trimmed)], ['Rows after cleaning', fmt(r.out.length - 1)]]);
  $('#c-before').innerHTML = table(rows, 10); $('#c-after').innerHTML = table(r.out, 10);
  $('#c-dl').disabled = false;
}
$('#c-sample').onclick = () => runClean(parseCSV(SAMPLE_CLEAN));
$('#c-file').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { runClean(await readFile(f)); } catch (err) { msg('c-msg', err.message); }
  e.target.value = '';
};
$('#c-dl').onclick = () => cleaned && save('cleaned_data.csv', cleaned);

/* ---------- Demo 2: Spreadsheet Merger ---------- */
const SAMPLE_MERGE = {
  'orders_north.csv': 'order_id,customer,product,total\n2001,Ava Johnson,Report Pack,79\n2002,Liam Chen,Cleanup Service,129\n2003,Mia Kim,Automation Script,189',
  'orders_south.csv': 'customer,order_id,total,product\nSofia Reyes,3001,329,Dashboard Setup\nNoah Patel,3002,95,Training Session',
  'orders_west.csv': 'Order_ID,Customer,Product,Total,Discount\n4001,Emma Brown,Report Pack,79,10\n4002,Lucas Silva,Automation Script,189,0'
};
let files = [];
function addFile(name, rows, notes) {
  if (rows.length < 2) return notes.push(`"${name}" is empty or has no data rows, so it was skipped.`);
  if (files.some(f => f.name === name)) return notes.push(`"${name}" is already added.`);
  files.push({ name, head: rows[0].map(s => s.trim()), rows: rows.slice(1) });
}
function merge() {
  const key = s => s.toLowerCase(), lab = Object.create(null), cols = [];
  files.forEach(f => f.head.forEach(h => { if (!lab[key(h)]) { lab[key(h)] = h; cols.push(key(h)); } }));
  const inAll = k => files.every(f => f.head.some(h => key(h) === k));
  const use = $('#m-shared').checked ? cols.filter(inAll) : cols;
  const out = [[...use.map(k => lab[k]), 'source_file']];
  files.forEach(f => { const idx = use.map(k => f.head.findIndex(h => key(h) === k)); f.rows.forEach(r => out.push([...idx.map(i => i < 0 ? '' : (r[i] ?? '')), f.name])); });
  return { out, use, partial: cols.filter(k => !inAll(k)).map(k => lab[k]) };
}
let merged = null;
function renderMerge(notes = []) {
  $('#m-files').innerHTML = files.map((f, i) => `<li><span>${esc(f.name)}: ${fmt(f.rows.length)} rows, ${f.head.length} columns</span><button data-i="${i}" aria-label="Remove ${esc(f.name)}">Remove</button></li>`).join('');
  merged = null; $('#m-dl').disabled = true; $('#m-stats').innerHTML = '';
  if (files.length < 2) {
    $('#m-prev').innerHTML = '<p class="empty">Add two or more CSV files, or load the samples.</p>';
    msg('m-msg', notes.join(' '), true); return;
  }
  const m = merge();
  if (!m.use.length) { $('#m-prev').innerHTML = ''; msg('m-msg', 'These files have no columns in common, so there is nothing to keep. Untick "Keep only columns shared by all files".'); return; }
  if (m.partial.length && !$('#m-shared').checked) notes.push(`Columns not in every file: ${m.partial.join(', ')}. Those cells are left empty for files that lack them.`);
  msg('m-msg', notes.join(' '), true);
  merged = m.out;
  stats('m-stats', [['Files merged', fmt(files.length)], ['Total rows processed', fmt(m.out.length - 1)], ['Columns in result', fmt(m.out[0].length)]]);
  $('#m-prev').innerHTML = table(m.out, 10); $('#m-dl').disabled = false;
}
$('#m-file').onchange = async e => {
  const notes = [];
  for (const f of e.target.files) { try { addFile(f.name, await readFile(f), notes); } catch (err) { notes.push(err.message); } }
  e.target.value = ''; renderMerge(notes);
};
$('#m-sample').onclick = () => { files = []; Object.entries(SAMPLE_MERGE).forEach(([n, t]) => addFile(n, parseCSV(t), [])); renderMerge(); };
$('#m-clear').onclick = () => { files = []; renderMerge(); };
$('#m-shared').onchange = () => renderMerge();
$('#m-files').onclick = e => { const i = e.target.dataset.i; if (i !== undefined) { files.splice(+i, 1); renderMerge(); } };
$('#m-dl').onclick = () => merged && save('merged.csv', merged);

/* ---------- Demo 3: Sales report (fictional data, seeded so it is stable) ---------- */
const PROD = [['Analytics Toolkit', 249], ['Report Template Pack', 79], ['Data Cleanup Service', 129], ['Automation Script', 189], ['Dashboard Setup', 329], ['Training Session', 95]];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let seed = 42; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const ORDERS = [];
for (let m = 0; m < 12; m++) {
  const n = Math.round(38 + m * 2.5 + rnd() * 12);
  for (let i = 0; i < n; i++) { const p = Math.floor(rnd() ** 1.4 * PROD.length), q = 1 + Math.floor(rnd() * 3); ORDERS.push({ m, p: PROD[p][0], q, rev: q * PROD[p][1] }); }
}
const PERIODS = [['Full year', 0, 11], ['First half (Jan-Jun)', 0, 5], ['Second half (Jul-Dec)', 6, 11], ['Q1 (Jan-Mar)', 0, 2], ['Q2 (Apr-Jun)', 3, 5], ['Q3 (Jul-Sep)', 6, 8], ['Q4 (Oct-Dec)', 9, 11]];
$('#s-period').innerHTML = PERIODS.map((p, i) => `<option value="${i}">${p[0]}</option>`).join('');
let report = [];
function renderSales() {
  const [name, a, b] = PERIODS[$('#s-period').value], set = ORDERS.filter(o => o.m >= a && o.m <= b);
  const rev = set.reduce((s, o) => s + o.rev, 0);
  const mon = MON.slice(a, b + 1).map((l, i) => { const s = set.filter(o => o.m === a + i); return { l, n: s.length, rev: s.reduce((x, o) => x + o.rev, 0) }; });
  const prod = PROD.map(([p]) => { const s = set.filter(o => o.p === p); return { p, n: s.length, u: s.reduce((x, o) => x + o.q, 0), rev: s.reduce((x, o) => x + o.rev, 0) }; }).sort((x, y) => y.rev - x.rev);
  stats('s-stats', [['Revenue', usd(rev)], ['Total orders', fmt(set.length)], ['Average order value', '$' + (rev / set.length).toFixed(2)]]);
  const mx = Math.max(...mon.map(x => x.rev));
  $('#s-chart').innerHTML = '<div class="chart">' + mon.map(x => `<div class="col" title="${x.l}: ${usd(x.rev)}"><em>$${(x.rev / 1000).toFixed(1)}k</em><i style="height:${(x.rev / mx * 85).toFixed(1)}%"></i></div>`).join('') + '</div><div class="lbl">' + mon.map(x => `<span>${x.l}</span>`).join('') + '</div>';
  const pm = prod[0].rev;
  $('#s-top').innerHTML = prod.map(x => `<li><div><span>${esc(x.p)}</span><b>${usd(x.rev)}</b></div><i style="width:${(x.rev / pm * 100).toFixed(1)}%"></i></li>`).join('');
  report = [['section', 'label', 'orders', 'units', 'revenue_usd'], ['summary', name, set.length, set.reduce((s, o) => s + o.q, 0), rev],
    ...mon.map(x => ['month', x.l, x.n, '', x.rev]), ...prod.map(x => ['product', x.p, x.n, x.u, x.rev])];
}
$('#s-period').onchange = renderSales;
$('#s-dl').onclick = () => save('sales_report.csv', report);
renderSales();

/* ---------- Navigation and footer ---------- */
const burger = document.querySelector('.burger'), menu = $('#menu');
burger.onclick = () => burger.setAttribute('aria-expanded', menu.classList.toggle('open'));
menu.onclick = e => { if (e.target.tagName === 'A') { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } };
$('#yr').textContent = new Date().getFullYear();
