// Toile des relations — graphe interactif des personnages de la campagne.
// Rendu SVG maison (nœuds déplaçables, zoom/panoramique, liens courbés),
// stockage Supabase (tables graphe_personnages / graphe_liens) avec repli
// automatique sur le navigateur (localStorage) tant que les tables n'existent
// pas — voir le bandeau affiché en haut de page dans ce cas.

import { requireAuth, logout } from './auth.js';
import * as db from './db.js';
import { SEED_NODES, SEED_LINKS, SEED_LABEL } from './relations-seed.js';

// ── Constantes ────────────────────────────────────────────────────────────────

const LINK_TYPES = {
  allie: 'Allié',
  ennemi: 'Ennemi',
  famille: 'Famille',
  affaires: 'Affaires',
  neutre: 'Neutre / inconnu',
};
const NODE_TYPES = { pj: 'Personnage joueur', pnj: 'PNJ', organisation: 'Organisation' };
const STATUTS = { vivant: 'Vivant', mort: 'Mort', inconnu: 'Inconnu' };
const NODE_RADIUS = { pj: 30, pnj: 26, organisation: 32 };
const IMAGE_SIZE = 160;
const LOCAL_KEY = 'eberron-relations-graph';
const SVG_NS = 'http://www.w3.org/2000/svg';

// ── Authentification ──────────────────────────────────────────────────────────

const user = await requireAuth('login.html');
if (!user) throw new Error();

const authBar = document.getElementById('auth-bar');
authBar.innerHTML = `
  <span style="font-family:var(--font-heading);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;"></span>
  <button style="background:transparent;border:1px solid var(--border);border-radius:2px;color:var(--text-muted);cursor:pointer;font-family:var(--font-heading);font-size:9px;letter-spacing:0.12em;text-transform:uppercase;padding:0.3rem 0.7rem;" id="btn-logout">Déconnexion</button>
`;
authBar.querySelector('span').textContent = user.email;
document.getElementById('btn-logout').addEventListener('click', logout);

// ── Utilitaires ───────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function initials(nom) {
  const words = String(nom || '').replace(/[«»"]/g, '').split(/\s+/).filter((w) => w && !/^(le|la|les|l'|d'|de|du|des|à|au|aux)$/i.test(w));
  const src = words.length ? words : [String(nom || '?')];
  return src.slice(0, 2).map((w) => w.replace(/^l'|^d'/i, '')[0] || '').join('').toUpperCase() || '?';
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// Coupe un nom en 1 à 3 lignes d'environ 16 caractères pour l'étiquette SVG.
function wrapLabel(text, max = 16) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; }
    else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].replace(/\s*\S*$/, '') + '…'; }
  return lines;
}

function radiusOf(node) { return NODE_RADIUS[node.type] || NODE_RADIUS.pnj; }

function isTableMissing(err) {
  const msg = String(err?.message || '');
  return err?.code === 'PGRST205' || err?.code === '42P01' || /graphe_(personnages|liens)/.test(msg) && /not find|does not exist|schema cache/i.test(msg);
}

// ── Modales génériques ────────────────────────────────────────────────────────

const confirmModalEl = $('confirm-modal');
let confirmResolve = null;
function confirmModal(message, confirmLabel = 'Supprimer') {
  $('confirm-modal-message').textContent = message;
  $('confirm-modal-confirm').textContent = confirmLabel;
  confirmModalEl.hidden = false;
  return new Promise((resolve) => { confirmResolve = resolve; });
}
function closeConfirm(result) {
  confirmModalEl.hidden = true;
  if (confirmResolve) { confirmResolve(result); confirmResolve = null; }
}
$('confirm-modal-cancel').addEventListener('click', () => closeConfirm(false));
$('confirm-modal-confirm').addEventListener('click', () => closeConfirm(true));
confirmModalEl.addEventListener('click', (e) => { if (e.target === confirmModalEl) closeConfirm(false); });

const alertModalEl = $('alert-modal');
function showAlert(message) {
  $('alert-modal-message').textContent = message;
  alertModalEl.hidden = false;
}
$('alert-modal-ok').addEventListener('click', () => { alertModalEl.hidden = true; });
alertModalEl.addEventListener('click', (e) => { if (e.target === alertModalEl) alertModalEl.hidden = true; });

// ── Stockage : Supabase ou navigateur ─────────────────────────────────────────

function makeLocalStore() {
  const read = () => {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || { nodes: [], links: [] }; }
    catch { return { nodes: [], links: [] }; }
  };
  const write = (d) => localStorage.setItem(LOCAL_KEY, JSON.stringify(d));
  return {
    mode: 'local',
    async load() { return read(); },
    async addNode(n) { const d = read(); const row = { ...n, id: n.id || uuid() }; d.nodes.push(row); write(d); return row; },
    async updateNode(id, patch) { const d = read(); const i = d.nodes.findIndex((x) => x.id === id); if (i >= 0) d.nodes[i] = { ...d.nodes[i], ...patch }; write(d); },
    async deleteNode(id) { const d = read(); d.nodes = d.nodes.filter((x) => x.id !== id); d.links = d.links.filter((l) => l.source_id !== id && l.cible_id !== id); write(d); },
    async addLink(l) { const d = read(); const row = { ...l, id: l.id || uuid() }; d.links.push(row); write(d); return row; },
    async updateLink(id, patch) { const d = read(); const i = d.links.findIndex((x) => x.id === id); if (i >= 0) d.links[i] = { ...d.links[i], ...patch }; write(d); },
    async deleteLink(id) { const d = read(); d.links = d.links.filter((x) => x.id !== id); write(d); },
    async bulkInsert(nodes, links) { const d = read(); d.nodes.push(...nodes); d.links.push(...links); write(d); },
  };
}

const supabaseStore = {
  mode: 'supabase',
  async load() {
    const [nodes, links] = await Promise.all([db.getGraphePersonnages(), db.getGrapheLiens()]);
    return { nodes, links };
  },
  addNode: (n) => db.addGraphePersonnage(n),
  updateNode: (id, patch) => db.updateGraphePersonnage(id, patch),
  deleteNode: (id) => db.deleteGraphePersonnage(id),
  addLink: (l) => db.addGrapheLien(l),
  updateLink: (id, patch) => db.updateGrapheLien(id, patch),
  deleteLink: (id) => db.deleteGrapheLien(id),
  bulkInsert: (nodes, links) => db.bulkInsertGraphe(nodes, links),
};

let store = supabaseStore;

function showStorageBanner(reason) {
  const banner = $('storage-banner');
  const sql = 'supabase/migrations/20260918120000_graphe_relations.sql';
  banner.innerHTML = reason === 'missing'
    ? `<div><strong>Mode navigateur.</strong> Les tables <code>graphe_personnages</code> et <code>graphe_liens</code> n'existent pas encore dans Supabase : la toile est enregistrée uniquement dans ce navigateur. Pour la partager, exécutez le script <code>${sql}</code> dans l'éditeur SQL de Supabase, puis utilisez <em>Exporter</em> / <em>Importer</em> pour y transférer vos données.</div>`
    : `<div><strong>Mode navigateur.</strong> Supabase est injoignable pour le moment : la toile est enregistrée uniquement dans ce navigateur. Pensez à <em>Exporter</em> vos modifications.</div>`;
  banner.hidden = false;
}

// ── État ──────────────────────────────────────────────────────────────────────

let nodes = [];
let links = [];
const nodeById = new Map();
const nodeEls = new Map();
const linkEls = new Map();

let selected = null;          // { kind: 'node' | 'link', id }
let linkMode = false;
let linkSource = null;        // id du premier nœud cliqué en mode lien
const hiddenLinkTypes = new Set();
let searchTerm = '';

const view = { x: 0, y: 0, k: 1 };

// ── Éléments ──────────────────────────────────────────────────────────────────

const svg = $('graph');
const wrap = $('canvas-wrap');
const gView = $('viewport');
const gLinks = $('g-links');
const gLabels = $('g-labels');
const gNodes = $('g-nodes');
const panel = $('panel');

// Une pointe de flèche par type de lien (la couleur du marqueur ne peut pas
// hériter de celle du trait de façon portable).
for (const type of Object.keys(LINK_TYPES)) {
  const marker = svgEl('marker', {
    id: `arrow-${type}`, class: `type-${type}`, viewBox: '0 0 10 10', refX: '9', refY: '5',
    markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse',
  });
  marker.appendChild(svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z' }));
  $('defs').appendChild(marker);
}

// ── Vue (zoom / panoramique) ──────────────────────────────────────────────────

function applyView() {
  gView.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.k})`);
}

function zoomAt(factor, cx, cy) {
  const k = Math.min(3, Math.max(0.15, view.k * factor));
  view.x = cx - (cx - view.x) * (k / view.k);
  view.y = cy - (cy - view.y) * (k / view.k);
  view.k = k;
  applyView();
}

function fitView() {
  const rect = svg.getBoundingClientRect();
  if (!nodes.length) { view.x = rect.width / 2; view.y = rect.height / 2; view.k = 1; applyView(); return; }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.pos_x - 60); maxX = Math.max(maxX, n.pos_x + 60);
    minY = Math.min(minY, n.pos_y - 60); maxY = Math.max(maxY, n.pos_y + 70);
  }
  const bw = Math.max(maxX - minX, 1), bh = Math.max(maxY - minY, 1);
  view.k = Math.min(rect.width / bw, rect.height / bh, 1.4);
  view.x = (rect.width - bw * view.k) / 2 - minX * view.k;
  view.y = (rect.height - bh * view.k) / 2 - minY * view.k;
  applyView();
}

function centerOn(node) {
  const rect = svg.getBoundingClientRect();
  view.k = Math.max(view.k, 0.9);
  view.x = rect.width / 2 - node.pos_x * view.k;
  view.y = rect.height / 2 - node.pos_y * view.k;
  applyView();
}

function toLocal(clientX, clientY) {
  const rect = svg.getBoundingClientRect();
  return { x: (clientX - rect.left - view.x) / view.k, y: (clientY - rect.top - view.y) / view.k };
}

function viewCenterLocal() {
  const rect = svg.getBoundingClientRect();
  return toLocal(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

// ── Placement des nœuds sans position ─────────────────────────────────────────

function ensurePositions() {
  const unplaced = nodes.filter((n) => n.pos_x == null || n.pos_y == null);
  if (!unplaced.length) return;
  const placed = nodes.filter((n) => n.pos_x != null && n.pos_y != null);
  let cx = 0, cy = 0, r = 200;
  if (placed.length) {
    cx = placed.reduce((s, n) => s + Number(n.pos_x), 0) / placed.length;
    cy = placed.reduce((s, n) => s + Number(n.pos_y), 0) / placed.length;
    r = Math.max(...placed.map((n) => Math.hypot(Number(n.pos_x) - cx, Number(n.pos_y) - cy))) + 140;
  }
  unplaced.forEach((n, i) => {
    const a = (i / unplaced.length) * Math.PI * 2 - Math.PI / 2;
    n.pos_x = Math.round(cx + Math.cos(a) * r);
    n.pos_y = Math.round(cy + Math.sin(a) * r);
  });
}

// ── Rendu ─────────────────────────────────────────────────────────────────────

function rebuildIndex() {
  nodeById.clear();
  for (const n of nodes) {
    n.pos_x = n.pos_x == null ? null : Number(n.pos_x);
    n.pos_y = n.pos_y == null ? null : Number(n.pos_y);
    nodeById.set(n.id, n);
  }
  // Liens orphelins (ne devrait pas arriver, cascade côté base)
  links = links.filter((l) => nodeById.has(l.source_id) && nodeById.has(l.cible_id));
  ensurePositions();
  computeLinkOffsets();
}

// Plusieurs liens entre la même paire : on les écarte en courbes parallèles.
function computeLinkOffsets() {
  const groups = new Map();
  for (const l of links) {
    const key = [l.source_id, l.cible_id].sort().join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  }
  for (const group of groups.values()) {
    const n = group.length;
    group.forEach((l, i) => {
      const base = (i - (n - 1) / 2) * 30;
      l._offset = l.source_id < l.cible_id ? base : -base;
    });
  }
}

function linkPath(l) {
  const s = nodeById.get(l.source_id), t = nodeById.get(l.cible_id);
  const mx = (s.pos_x + t.pos_x) / 2, my = (s.pos_y + t.pos_y) / 2;
  const dx = t.pos_x - s.pos_x, dy = t.pos_y - s.pos_y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist, ny = dx / dist;
  const off = l._offset || 0;
  const cx = mx + nx * off, cy = my + ny * off;
  // Extrémités posées sur le bord des cercles, en visant le point de contrôle
  const rs = radiusOf(s) + 2, rt = radiusOf(t) + 2 + (l.oriente ? 3 : 0);
  const ds = Math.hypot(cx - s.pos_x, cy - s.pos_y) || 1;
  const dt = Math.hypot(cx - t.pos_x, cy - t.pos_y) || 1;
  const sx = s.pos_x + ((cx - s.pos_x) / ds) * rs, sy = s.pos_y + ((cy - s.pos_y) / ds) * rs;
  const ex = t.pos_x + ((cx - t.pos_x) / dt) * rt, ey = t.pos_y + ((cy - t.pos_y) / dt) * rt;
  const lx = 0.25 * sx + 0.5 * cx + 0.25 * ex, ly = 0.25 * sy + 0.5 * cy + 0.25 * ey;
  return { d: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`, lx, ly };
}

function render() {
  rebuildIndex();
  gLinks.replaceChildren();
  gLabels.replaceChildren();
  gNodes.replaceChildren();
  nodeEls.clear();
  linkEls.clear();

  for (const l of links) {
    const g = svgEl('g', { class: 'link-group', 'data-id': l.id });
    const hit = svgEl('path', { class: 'link-hit' });
    const path = svgEl('path', { class: `link type-${l.type}` });
    if (l.oriente) path.setAttribute('marker-end', `url(#arrow-${l.type})`);
    g.append(hit, path);
    g.addEventListener('click', (e) => { e.stopPropagation(); if (!linkMode) select('link', l.id); });
    gLinks.appendChild(g);

    const label = svgEl('text', { class: 'link-label' });
    label.textContent = l.libelle || '';
    gLabels.appendChild(label);
    linkEls.set(l.id, { g, path, label });
  }

  for (const n of nodes) {
    const r = radiusOf(n);
    const g = svgEl('g', { class: `node type-${n.type} statut-${n.statut}`, 'data-id': n.id });
    g.appendChild(svgEl('circle', { class: 'node-halo', r: r + 7 }));
    g.appendChild(svgEl('circle', { class: 'node-bg', r }));
    if (n.image) {
      const clipId = `clip-${n.id}`;
      const clip = svgEl('clipPath', { id: clipId });
      clip.appendChild(svgEl('circle', { r: r - 1 }));
      g.appendChild(clip);
      const img = svgEl('image', { x: -r, y: -r, width: r * 2, height: r * 2, 'clip-path': `url(#${clipId})`, preserveAspectRatio: 'xMidYMid slice' });
      img.setAttribute('href', n.image);
      g.appendChild(img);
    } else {
      const t = svgEl('text', { class: 'node-initials' });
      t.textContent = initials(n.nom);
      g.appendChild(t);
    }
    g.appendChild(svgEl('circle', { class: 'node-ring', r }));
    if (n.statut === 'mort' || n.statut === 'inconnu') {
      const bx = r * 0.72, by = -r * 0.72;
      g.appendChild(svgEl('circle', { class: 'node-badge-bg', cx: bx, cy: by, r: 9 }));
      const b = svgEl('text', { class: 'node-badge', x: bx, y: by });
      b.textContent = n.statut === 'mort' ? '✝' : '?';
      g.appendChild(b);
    }
    const label = svgEl('text', { class: 'node-label', y: r + 15 });
    wrapLabel(n.nom).forEach((line, i) => {
      const ts = svgEl('tspan', { x: 0, dy: i === 0 ? 0 : 13 });
      ts.textContent = line;
      label.appendChild(ts);
    });
    g.appendChild(label);
    g.addEventListener('pointerdown', (e) => onNodePointerDown(e, n));
    g.addEventListener('pointerenter', () => { if (!dragging) highlightNeighbors(n.id, true); });
    g.addEventListener('pointerleave', () => { if (!dragging) highlightNeighbors(null, false); });
    gNodes.appendChild(g);
    nodeEls.set(n.id, g);
  }

  updatePositions();
  updateClasses();
  populateLegend();
  $('empty-state').hidden = nodes.length > 0;
  renderPanel();
}

function updatePositions() {
  for (const n of nodes) {
    const g = nodeEls.get(n.id);
    if (g) g.setAttribute('transform', `translate(${n.pos_x} ${n.pos_y})`);
  }
  for (const l of links) {
    const els = linkEls.get(l.id);
    if (!els) continue;
    const { d, lx, ly } = linkPath(l);
    els.path.setAttribute('d', d);
    els.g.firstChild.setAttribute('d', d);
    els.label.setAttribute('x', lx);
    els.label.setAttribute('y', ly);
  }
}

// Classes d'état (sélection, filtre de recherche, types masqués)
function updateClasses() {
  const term = searchTerm.trim().toLowerCase();
  const matches = new Set(term ? nodes.filter((n) => n.nom.toLowerCase().includes(term)).map((n) => n.id) : []);
  for (const n of nodes) {
    const g = nodeEls.get(n.id);
    g.classList.toggle('selected', selected?.kind === 'node' && selected.id === n.id);
    g.classList.toggle('link-source', linkSource === n.id);
    g.classList.toggle('dimmed', !!term && !matches.has(n.id));
  }
  for (const l of links) {
    const { g, path, label } = linkEls.get(l.id);
    const sel = selected?.kind === 'link' && selected.id === l.id;
    path.classList.toggle('selected', sel);
    label.classList.toggle('selected', sel);
    const hidden = hiddenLinkTypes.has(l.type);
    g.classList.toggle('link-hidden', hidden);
    label.classList.toggle('link-hidden', hidden);
    const dim = !!term && !(matches.has(l.source_id) || matches.has(l.cible_id));
    path.classList.toggle('dimmed', dim);
    label.classList.toggle('dimmed', dim);
  }
}

// Survol : n'éclaire que le voisinage du nœud
function highlightNeighbors(nodeId, on) {
  if (!on || !nodeId) { updateClasses(); return; }
  const near = new Set([nodeId]);
  for (const l of links) {
    if (l.source_id === nodeId) near.add(l.cible_id);
    if (l.cible_id === nodeId) near.add(l.source_id);
  }
  for (const l of links) {
    const { path, label } = linkEls.get(l.id);
    const touch = l.source_id === nodeId || l.cible_id === nodeId;
    path.classList.toggle('dimmed', !touch);
    label.classList.toggle('dimmed', !touch);
  }
  for (const n of nodes) nodeEls.get(n.id).classList.toggle('dimmed', !near.has(n.id));
}

function populateLegend() {
  const legend = $('legend');
  legend.replaceChildren();
  for (const [type, label] of Object.entries(LINK_TYPES)) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'legend-chip' + (hiddenLinkTypes.has(type) ? ' off' : '');
    chip.dataset.type = type;
    chip.title = hiddenLinkTypes.has(type) ? 'Afficher ces liens' : 'Masquer ces liens';
    chip.innerHTML = `<span class="swatch"></span>${esc(label)}`;
    chip.addEventListener('click', () => {
      if (hiddenLinkTypes.has(type)) hiddenLinkTypes.delete(type); else hiddenLinkTypes.add(type);
      populateLegend();
      updateClasses();
    });
    legend.appendChild(chip);
  }
}

// ── Sélection & panneau latéral ───────────────────────────────────────────────

function select(kind, id) {
  selected = kind && id ? { kind, id } : null;
  updateClasses();
  renderPanel();
}

function linksOf(nodeId) {
  return links.filter((l) => l.source_id === nodeId || l.cible_id === nodeId);
}

function renderPanel() {
  if (selected?.kind === 'node' && nodeById.has(selected.id)) return renderNodePanel(nodeById.get(selected.id));
  if (selected?.kind === 'link') {
    const l = links.find((x) => x.id === selected.id);
    if (l) return renderLinkPanel(l);
  }
  selected = null;
  const pj = nodes.filter((n) => n.type === 'pj').length;
  const org = nodes.filter((n) => n.type === 'organisation').length;
  panel.innerHTML = `
    <div class="panel-title">La toile</div>
    <div class="panel-help">
      <p>Cliquez un personnage ou un lien pour le consulter. Glissez un personnage pour le déplacer, la molette pour zoomer, le fond pour vous déplacer.</p>
      <p><kbd>+ Personnage</kbd> ajoute une fiche. <kbd>⟷ Créer un lien</kbd> puis deux clics sur deux personnages tracent une relation.</p>
      <p>Les pastilles en bas du canevas masquent ou affichent chaque nature de lien.</p>
    </div>
    <div class="panel-stats">
      <div class="stat-card"><div class="s-label">Joueurs</div><div class="s-value">${pj}</div></div>
      <div class="stat-card"><div class="s-label">PNJ</div><div class="s-value">${nodes.length - pj - org}</div></div>
      <div class="stat-card"><div class="s-label">Liens</div><div class="s-value">${links.length}</div></div>
    </div>
  `;
}

function badge(text, cls = '') { return `<span class="badge ${cls}">${esc(text)}</span>`; }

function renderNodePanel(n) {
  const rels = linksOf(n.id);
  const portrait = n.image
    ? `<img class="panel-portrait" alt="" />`
    : `<div class="panel-portrait placeholder">${esc(initials(n.nom))}</div>`;
  panel.innerHTML = `
    ${portrait}
    <div class="panel-title"></div>
    <div class="panel-badges">
      ${badge(NODE_TYPES[n.type] || n.type)}
      ${n.statut !== 'vivant' ? badge(STATUTS[n.statut] || n.statut, n.statut) : ''}
    </div>
    <div class="panel-desc"></div>
    <div class="panel-actions">
      <button class="btn" id="p-edit">Modifier</button>
      <button class="btn" id="p-link">Lier à…</button>
      <button class="btn danger" id="p-delete">Supprimer</button>
    </div>
    <div class="panel-section">Relations (${rels.length})</div>
    <ul class="panel-links" id="p-links"></ul>
  `;
  if (n.image) panel.querySelector('.panel-portrait').src = n.image;
  panel.querySelector('.panel-title').textContent = n.nom;
  panel.querySelector('.panel-desc').textContent = n.description || '';
  const ul = $('p-links');
  if (!rels.length) ul.innerHTML = '<li style="cursor:default;color:var(--text-dim);font-style:italic;">Aucune relation connue.</li>';
  for (const l of rels) {
    const outgoing = l.source_id === n.id;
    const other = nodeById.get(outgoing ? l.cible_id : l.source_id);
    const li = document.createElement('li');
    li.innerHTML = `<span class="dot type-${esc(l.type)}"></span><span><span class="dir">${l.oriente ? (outgoing ? '→' : '←') : '⟷'}</span> <span class="who"></span><br><span class="what"></span></span>`;
    li.querySelector('.who').textContent = other?.nom || '?';
    li.querySelector('.what').textContent = l.libelle || LINK_TYPES[l.type];
    li.addEventListener('click', () => select('link', l.id));
    ul.appendChild(li);
  }
  $('p-edit').addEventListener('click', () => openNodeModal(n));
  $('p-link').addEventListener('click', () => { setLinkMode(true); linkSource = n.id; updateLinkHint(); updateClasses(); });
  $('p-delete').addEventListener('click', () => deleteNode(n));
}

function renderLinkPanel(l) {
  const s = nodeById.get(l.source_id), t = nodeById.get(l.cible_id);
  panel.innerHTML = `
    <div class="panel-title"></div>
    <div class="link-pair"><span class="src"></span><span class="arrow">${l.oriente ? '→' : '⟷'}</span><span class="dst"></span></div>
    <div class="panel-badges"><span class="dot type-${esc(l.type)}" style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;"></span>${badge(LINK_TYPES[l.type] || l.type)}</div>
    <div class="panel-desc"></div>
    <div class="panel-actions">
      <button class="btn" id="p-edit">Modifier</button>
      <button class="btn danger" id="p-delete">Supprimer</button>
    </div>
    <div class="panel-section">Personnages</div>
    <ul class="panel-links">
      <li id="p-src"><span class="dot type-${esc(l.type)}"></span><span class="who"></span></li>
      <li id="p-dst"><span class="dot type-${esc(l.type)}"></span><span class="who"></span></li>
    </ul>
  `;
  panel.querySelector('.panel-title').textContent = l.libelle || LINK_TYPES[l.type];
  panel.querySelector('.src').textContent = s?.nom || '?';
  panel.querySelector('.dst').textContent = t?.nom || '?';
  panel.querySelector('.panel-desc').textContent = l.description || '';
  $('p-src').querySelector('.who').textContent = s?.nom || '?';
  $('p-dst').querySelector('.who').textContent = t?.nom || '?';
  $('p-src').addEventListener('click', () => select('node', l.source_id));
  $('p-dst').addEventListener('click', () => select('node', l.cible_id));
  $('p-edit').addEventListener('click', () => openLinkModal(l));
  $('p-delete').addEventListener('click', () => deleteLink(l));
}

// ── Interactions souris / tactile ─────────────────────────────────────────────

let dragging = null;   // { node, startX, startY, origX, origY, moved }
let panning = null;    // { startX, startY, origX, origY }

function onNodePointerDown(e, n) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  e.stopPropagation();
  e.preventDefault();
  const p = toLocal(e.clientX, e.clientY);
  dragging = { node: n, startX: p.x, startY: p.y, origX: n.pos_x, origY: n.pos_y, moved: false, pointerId: e.pointerId };
  svg.setPointerCapture(e.pointerId);
  // Le nœud tiré passe au premier plan
  gNodes.appendChild(nodeEls.get(n.id));
}

svg.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  panning = { startX: e.clientX, startY: e.clientY, origX: view.x, origY: view.y, moved: false };
  svg.classList.add('panning');
  svg.setPointerCapture(e.pointerId);
});

svg.addEventListener('pointermove', (e) => {
  if (dragging) {
    const p = toLocal(e.clientX, e.clientY);
    const dx = p.x - dragging.startX, dy = p.y - dragging.startY;
    if (!dragging.moved && Math.hypot(dx, dy) * view.k < 4) return;
    dragging.moved = true;
    dragging.node.pos_x = Math.round(dragging.origX + dx);
    dragging.node.pos_y = Math.round(dragging.origY + dy);
    updatePositions();
  } else if (panning) {
    const dx = e.clientX - panning.startX, dy = e.clientY - panning.startY;
    if (!panning.moved && Math.hypot(dx, dy) < 4) return;
    panning.moved = true;
    view.x = panning.origX + dx;
    view.y = panning.origY + dy;
    applyView();
  }
});

async function endPointer(e) {
  if (dragging) {
    const d = dragging;
    dragging = null;
    if (d.moved) {
      try { await store.updateNode(d.node.id, { pos_x: d.node.pos_x, pos_y: d.node.pos_y }); }
      catch (err) { showAlert('Position non enregistrée : ' + err.message); }
    } else {
      onNodeClick(d.node);
    }
  } else if (panning) {
    const wasMoved = panning.moved;
    panning = null;
    svg.classList.remove('panning');
    if (!wasMoved) {
      if (linkMode) { linkSource = null; updateLinkHint(); updateClasses(); }
      else select(null);
    }
  }
}
svg.addEventListener('pointerup', endPointer);
svg.addEventListener('pointercancel', endPointer);

svg.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = svg.getBoundingClientRect();
  zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });

function onNodeClick(n) {
  if (!linkMode) { select('node', n.id); return; }
  if (!linkSource) { linkSource = n.id; updateLinkHint(); updateClasses(); return; }
  if (linkSource === n.id) { linkSource = null; updateLinkHint(); updateClasses(); return; }
  const src = linkSource;
  setLinkMode(false);
  openLinkModal(null, { source_id: src, cible_id: n.id });
}

// ── Mode « créer un lien » ────────────────────────────────────────────────────

function setLinkMode(on) {
  linkMode = on;
  if (!on) linkSource = null;
  $('btn-link-mode').classList.toggle('active', on);
  wrap.classList.toggle('link-mode', on);
  updateLinkHint();
  updateClasses();
}

function updateLinkHint() {
  const hint = $('link-hint');
  if (!linkMode) { hint.hidden = true; return; }
  hint.hidden = false;
  hint.textContent = linkSource
    ? `Lien depuis « ${nodeById.get(linkSource)?.nom} » : cliquez le second personnage (Échap pour annuler)`
    : 'Cliquez le premier personnage du lien (Échap pour annuler)';
}

$('btn-link-mode').addEventListener('click', () => setLinkMode(!linkMode));

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('node-modal').hidden) { closeNodeModal(); return; }
  if (!$('link-modal').hidden) { closeLinkModal(); return; }
  if (!confirmModalEl.hidden) { closeConfirm(false); return; }
  if (!alertModalEl.hidden) { alertModalEl.hidden = true; return; }
  if (linkMode) setLinkMode(false);
  else select(null);
});

// ── Barre d'outils ────────────────────────────────────────────────────────────

$('btn-add-node').addEventListener('click', () => openNodeModal(null));
$('btn-add-node-empty').addEventListener('click', () => openNodeModal(null));
$('btn-fit').addEventListener('click', fitView);
$('btn-zoom-in').addEventListener('click', () => { const r = svg.getBoundingClientRect(); zoomAt(1.25, r.width / 2, r.height / 2); });
$('btn-zoom-out').addEventListener('click', () => { const r = svg.getBoundingClientRect(); zoomAt(1 / 1.25, r.width / 2, r.height / 2); });

$('search').addEventListener('input', (e) => { searchTerm = e.target.value; updateClasses(); });
$('search').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const term = searchTerm.trim().toLowerCase();
  const hit = term && nodes.find((n) => n.nom.toLowerCase().includes(term));
  if (hit) { select('node', hit.id); centerOn(hit); }
});

$('btn-seed').addEventListener('click', async () => {
  const ok = await confirmModal(`Charger les ${SEED_NODES.length} personnages et ${SEED_LINKS.length} liens de « ${SEED_LABEL} » ?`, 'Charger');
  if (!ok) return;
  await importGraph(SEED_NODES, SEED_LINKS);
});

$('btn-export').addEventListener('click', () => {
  const payload = {
    version: 1,
    exporte_le: new Date().toISOString(),
    nodes: nodes.map(({ _offset, ...n }) => n),
    links: links.map(({ _offset, ...l }) => l),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `relations-eberron-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('btn-import').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); }
  catch { showAlert('Fichier illisible : ce n\'est pas un JSON valide.'); return; }
  const inNodes = Array.isArray(data?.nodes) ? data.nodes : null;
  const inLinks = Array.isArray(data?.links) ? data.links : [];
  if (!inNodes) { showAlert('Fichier inattendu : aucune liste de personnages trouvée.'); return; }
  const ok = await confirmModal(`Ajouter ${inNodes.length} personnage(s) et ${inLinks.length} lien(s) à la toile actuelle ?`, 'Importer');
  if (!ok) return;
  await importGraph(inNodes, inLinks);
});

// Insère des nœuds/liens venant d'une source externe (données de session ou
// fichier JSON) en régénérant tous les identifiants.
async function importGraph(inNodes, inLinks) {
  const idMap = new Map();
  const newNodes = inNodes
    .filter((n) => n && n.nom)
    .map((n) => {
      const id = uuid();
      idMap.set(n.id, id);
      return {
        id,
        nom: String(n.nom).slice(0, 80),
        type: NODE_TYPES[n.type] ? n.type : 'pnj',
        statut: STATUTS[n.statut] ? n.statut : 'vivant',
        description: n.description ? String(n.description).slice(0, 1200) : null,
        image: typeof n.image === 'string' && n.image ? n.image : null,
        pos_x: n.pos_x == null ? null : Number(n.pos_x),
        pos_y: n.pos_y == null ? null : Number(n.pos_y),
      };
    });
  const newLinks = inLinks
    .filter((l) => l && idMap.has(l.source_id) && idMap.has(l.cible_id) && l.source_id !== l.cible_id)
    .map((l) => ({
      id: uuid(),
      source_id: idMap.get(l.source_id),
      cible_id: idMap.get(l.cible_id),
      type: LINK_TYPES[l.type] ? l.type : 'neutre',
      libelle: l.libelle ? String(l.libelle).slice(0, 90) : null,
      description: l.description ? String(l.description).slice(0, 1200) : null,
      oriente: !!l.oriente,
    }));
  if (!newNodes.length) { showAlert('Rien à importer.'); return; }
  try {
    await store.bulkInsert(newNodes, newLinks);
    nodes.push(...newNodes);
    links.push(...newLinks);
    render();
    fitView();
  } catch (err) {
    showAlert('Import impossible : ' + err.message);
  }
}

// ── Modale personnage ─────────────────────────────────────────────────────────

const nodeModal = $('node-modal');
let editingNode = null;
let pendingImage = null;

function setImagePreview(src) {
  pendingImage = src || null;
  const img = $('node-image-preview');
  img.hidden = !src;
  if (src) img.src = src;
  $('node-image-empty').hidden = !!src;
}

function openNodeModal(n) {
  editingNode = n;
  $('node-modal-title').textContent = n ? 'Modifier le personnage' : 'Nouveau personnage';
  $('node-nom').value = n?.nom || '';
  $('node-type').value = n?.type || 'pnj';
  $('node-statut').value = n?.statut || 'vivant';
  $('node-desc').value = n?.description || '';
  $('node-image-url').value = n?.image && !n.image.startsWith('data:') ? n.image : '';
  $('node-error').textContent = '';
  setImagePreview(n?.image || null);
  nodeModal.hidden = false;
  $('node-nom').focus();
}
function closeNodeModal() { nodeModal.hidden = true; editingNode = null; pendingImage = null; }

$('node-cancel').addEventListener('click', closeNodeModal);
nodeModal.addEventListener('click', (e) => { if (e.target === nodeModal) closeNodeModal(); });

$('node-image-file').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  try {
    setImagePreview(await resizeImage(file));
    $('node-image-url').value = '';
  } catch (err) {
    $('node-error').textContent = err.message;
  }
});
$('node-image-url').addEventListener('change', (e) => {
  const url = e.target.value.trim();
  if (url) setImagePreview(url);
});
$('node-image-clear').addEventListener('click', () => { setImagePreview(null); $('node-image-url').value = ''; });

// Recadre l'image en carré et la réduit pour qu'elle tienne en base sous
// forme de data URL (~10 à 40 Ko).
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('Ce fichier n\'est pas une image.')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = IMAGE_SIZE;
      const ctx = c.getContext('2d');
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - s) / 2, sy = (img.naturalHeight - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
      URL.revokeObjectURL(url);
      let out = c.toDataURL('image/webp', 0.85);
      if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/png');
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible.')); };
    img.src = url;
  });
}

$('node-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nom = $('node-nom').value.trim();
  if (!nom) { $('node-error').textContent = 'Le nom est obligatoire.'; return; }
  const data = {
    nom,
    type: $('node-type').value,
    statut: $('node-statut').value,
    description: $('node-desc').value.trim() || null,
    image: pendingImage || null,
  };
  $('node-save').disabled = true;
  try {
    if (editingNode) {
      await store.updateNode(editingNode.id, data);
      Object.assign(editingNode, data);
      render();
      select('node', editingNode.id);
    } else {
      const c = viewCenterLocal();
      const jitter = () => Math.round((Math.random() - 0.5) * 80);
      const row = await store.addNode({ id: uuid(), ...data, pos_x: Math.round(c.x) + jitter(), pos_y: Math.round(c.y) + jitter() });
      nodes.push(row);
      render();
      select('node', row.id);
    }
    closeNodeModal();
  } catch (err) {
    $('node-error').textContent = 'Enregistrement impossible : ' + err.message;
  } finally {
    $('node-save').disabled = false;
  }
});

async function deleteNode(n) {
  const count = linksOf(n.id).length;
  const ok = await confirmModal(`Supprimer « ${n.nom} »${count ? ` et ses ${count} lien(s)` : ''} ? Cette action est définitive.`);
  if (!ok) return;
  try {
    await store.deleteNode(n.id);
    nodes = nodes.filter((x) => x.id !== n.id);
    links = links.filter((l) => l.source_id !== n.id && l.cible_id !== n.id);
    selected = null;
    render();
  } catch (err) {
    showAlert('Suppression impossible : ' + err.message);
  }
}

// ── Modale lien ───────────────────────────────────────────────────────────────

const linkModal = $('link-modal');
let editingLink = null;

function fillNodeSelect(sel, value) {
  sel.replaceChildren();
  for (const n of [...nodes].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))) {
    const opt = document.createElement('option');
    opt.value = n.id;
    opt.textContent = n.nom;
    sel.appendChild(opt);
  }
  if (value) sel.value = value;
}

function openLinkModal(l, preset = {}) {
  if (nodes.length < 2) { showAlert('Il faut au moins deux personnages pour tracer un lien.'); return; }
  editingLink = l;
  $('link-modal-title').textContent = l ? 'Modifier le lien' : 'Nouveau lien';
  fillNodeSelect($('link-source'), l?.source_id || preset.source_id || nodes[0].id);
  fillNodeSelect($('link-cible'), l?.cible_id || preset.cible_id || nodes[1].id);
  $('link-type').value = l?.type || 'neutre';
  $('link-libelle').value = l?.libelle || '';
  $('link-desc').value = l?.description || '';
  $('link-oriente').checked = l ? !!l.oriente : false;
  $('link-error').textContent = '';
  linkModal.hidden = false;
  $('link-libelle').focus();
}
function closeLinkModal() { linkModal.hidden = true; editingLink = null; }

$('link-cancel').addEventListener('click', closeLinkModal);
linkModal.addEventListener('click', (e) => { if (e.target === linkModal) closeLinkModal(); });
$('link-swap').addEventListener('click', () => {
  const a = $('link-source').value;
  $('link-source').value = $('link-cible').value;
  $('link-cible').value = a;
});

$('link-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    source_id: $('link-source').value,
    cible_id: $('link-cible').value,
    type: $('link-type').value,
    libelle: $('link-libelle').value.trim() || null,
    description: $('link-desc').value.trim() || null,
    oriente: $('link-oriente').checked,
  };
  if (data.source_id === data.cible_id) { $('link-error').textContent = 'Un personnage ne peut pas être lié à lui-même.'; return; }
  $('link-save').disabled = true;
  try {
    if (editingLink) {
      await store.updateLink(editingLink.id, data);
      Object.assign(editingLink, data);
      render();
      select('link', editingLink.id);
    } else {
      const row = await store.addLink({ id: uuid(), ...data });
      links.push(row);
      render();
      select('link', row.id);
    }
    closeLinkModal();
  } catch (err) {
    $('link-error').textContent = 'Enregistrement impossible : ' + err.message;
  } finally {
    $('link-save').disabled = false;
  }
});

async function deleteLink(l) {
  const s = nodeById.get(l.source_id)?.nom, t = nodeById.get(l.cible_id)?.nom;
  const ok = await confirmModal(`Supprimer le lien entre « ${s} » et « ${t} » ?`);
  if (!ok) return;
  try {
    await store.deleteLink(l.id);
    links = links.filter((x) => x.id !== l.id);
    selected = null;
    render();
  } catch (err) {
    showAlert('Suppression impossible : ' + err.message);
  }
}

// ── Chargement initial ────────────────────────────────────────────────────────

async function load() {
  let data;
  try {
    data = await supabaseStore.load();
  } catch (err) {
    store = makeLocalStore();
    showStorageBanner(isTableMissing(err) ? 'missing' : 'offline');
    data = await store.load();
  }
  nodes = data.nodes || [];
  links = data.links || [];
  render();
  fitView();
}

await load();
