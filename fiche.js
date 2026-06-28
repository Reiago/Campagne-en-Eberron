import { requireAuth } from './auth.js';
import {
  getPersonnage, getPersonnageById, updatePersonnage,
  getCaracteristiques, updateCaracteristiques,
  getCompetences, updateCompetence,
  getArmes, addArme, updateArme, deleteArme,
  getEquipement, addEquipement, updateEquipement, deleteEquipement,
  getTags, addTag, updateTag, deleteTag, getEquipementTags, linkTag, unlinkTag, searchEquipementBase,
  getSorts, addSort, updateSort, deleteSort,
  getEmplacementsSorts, updateEmplacementSorts,
  getCapacites, addCapacite, updateCapacite, deleteCapacite,
} from './db.js';
import { modificateur, bonusMaitrise, caCalculee, bonusCompetence, perceptionPassive, pvMax, sautLongueur, sautHauteur, chargeMax, bonusToucher, ddSorts, bonusAttaqueSorts } from './calculs.js';
import { lancerJet, lancerDe, lancerJetMort, lancerDegats } from './des.js';

// ── Constantes ─────────────────────────────────────────────────────────────────
const STATS = ['force', 'dexterite', 'constitution', 'intelligence', 'sagesse', 'charisme'];
const STAT_LABELS = {
  force: 'Force', dexterite: 'Dextérité', constitution: 'Constitution',
  intelligence: 'Intelligence', sagesse: 'Sagesse', charisme: 'Charisme',
};
// Formate une valeur numérique avec son unité, pour qu'elle reste identifiable
// une fois affichée sans titre de champ (ex: "25 ans", "1 m 92").
const UNITE_FORMATTERS = {
  age: v => `${v} ans`,
  poids_kg: v => `${v} kg`,
  taille_cm: v => {
    if (v < 100) return `${v} cm`;
    return `${Math.floor(v / 100)} m ${v % 100}`;
  },
};
const ALIGNEMENTS = [
  'Loyal Bon', 'Neutre Bon', 'Chaotique Bon',
  'Loyal Neutre', 'Vrai Neutre', 'Chaotique Neutre',
  'Loyal Mauvais', 'Neutre Mauvais', 'Chaotique Mauvais',
];
const TYPES_DEGATS = [
  'Acide', 'Contondant', 'Feu', 'Force', 'Foudre', 'Froid',
  'Nécrotique', 'Perforant', 'Poison', 'Psychique', 'Radiant', 'Tonnerre', 'Tranchant',
];
// Clés sans accents ni majuscules pour un matching robuste quelle que soit
// la casse ou la présence d'accents renvoyée par la base de données.
const COMP_CARAC = {
  'acrobaties': 'dexterite', 'arcanes': 'intelligence', 'athletisme': 'force',
  'discretion': 'dexterite', 'dressage': 'sagesse', 'escamotage': 'dexterite',
  'histoire': 'intelligence', 'intimidation': 'charisme', 'investigation': 'intelligence',
  'medecine': 'sagesse', 'nature': 'intelligence', 'perception': 'sagesse',
  'perspicacite': 'sagesse', 'persuasion': 'charisme', 'religion': 'intelligence',
  'representation': 'charisme', 'survie': 'sagesse', 'tromperie': 'charisme',
};
const NIVEAUX_SORTS_LABELS = { 0: 'Sorts mineurs' };
for (let i = 1; i <= 9; i++) NIVEAUX_SORTS_LABELS[i] = 'Niveau ' + i;
const RECHARGEMENTS = { court: 'Repos court', long: 'Repos long', aube: "À l'aube", jamais: 'Jamais' };
const ACTIONS_REQUISES = ['Action', 'Action bonus', 'Réaction', 'Libre'];
// Taux de conversion en pièces de cuivre (PC), utilisés pour la valeur des
// objets et le résumé de monnaie (objets tagués "Monnaie").
const TAUX_PC = { pp: 1000, po: 100, pe: 50, pa: 10, pc: 1 };
// Tri & filtres de l'inventaire (état local, non persisté en DB).
let equipementSortKey = 'nom-asc';
let equipementFilterTagIds = new Set();
let fermetureMenusEquipementInitialisee = false;
const COMPARATEURS_EQUIPEMENT = {
  'nom-asc': (a, b) => (a.nom ?? '').localeCompare(b.nom ?? ''),
  'nom-desc': (a, b) => (b.nom ?? '').localeCompare(a.nom ?? ''),
  'valeur-asc': (a, b) => (a.valeur_pc ?? 0) - (b.valeur_pc ?? 0),
  'valeur-desc': (a, b) => (b.valeur_pc ?? 0) - (a.valeur_pc ?? 0),
  'poids-asc': (a, b) => (a.poids ?? 0) - (b.poids ?? 0),
  'poids-desc': (a, b) => (b.poids ?? 0) - (a.poids ?? 0),
};

// Supprime accents + met en minuscules pour la recherche dans COMP_CARAC.
function normaliserNom(str) {
  return (str ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Capitalise la première lettre pour l'affichage.
function capitaliser(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

// ── État ───────────────────────────────────────────────────────────────────────
let perso = null, carac = null, competences = [], armes = [], equipement = [];
let tags = [], tagsByEquipement = {};
let sorts = [], emplacementsSorts = [], capacites = [];
let emplacementTimers = {};
let reposMode        = localStorage.getItem('repos-mode') || 'auto'; // 'auto' | 'manuel'
let reposDiceCount   = 1;   // nombre de dés à dépenser dans le panneau
let reposRolls       = [];  // résultats des lancers auto [{roll, gain}, ...]
let reposPanelOpen   = false;
const DEBOUNCE_MS = 500;
const ARME_MOBILE_BREAKPOINT = 480;
const EQUIPEMENT_MOBILE_BREAKPOINT = 480;
let persoTimer = null, caracTimer = null;

// ── Mode Jeu / Mode Édition ────────────────────────────────────────────────────
function getMode() {
  return localStorage.getItem('fiche-mode') || 'jeu';
}

function setMode(mode) {
  localStorage.setItem('fiche-mode', mode);
  document.body.classList.toggle('mode-jeu', mode === 'jeu');
  document.body.classList.toggle('mode-edition', mode === 'edition');
  const btn = document.getElementById('btn-mode');
  if (!btn) return;
  if (mode === 'jeu') {
    btn.textContent = '⚔ Mode Jeu';
    btn.classList.add('actif');
  } else {
    btn.textContent = '✏ Mode Édition';
    btn.classList.remove('actif');
  }
}

// Appliquer le mode sauvegardé immédiatement (avant chargement des données)
setMode(getMode());

document.getElementById('btn-mode')?.addEventListener('click', () => {
  setMode(getMode() === 'jeu' ? 'edition' : 'jeu');
});

// ── Auth & chargement ──────────────────────────────────────────────────────────
const user = await requireAuth('login.html');
if (!user) throw new Error('Non authentifié');

const params = new URLSearchParams(window.location.search);
const ficheId = params.get('id');

const gearLink = document.querySelector('.btn-gear');
if (gearLink && ficheId) gearLink.href = 'parametres.html?id=' + encodeURIComponent(ficheId);

try {
  perso = ficheId ? await getPersonnageById(ficheId) : await getPersonnage(user.id);
  if (!perso) throw new Error('Aucun personnage trouvé pour ce compte.');

  let equipementTagLinks;
  [carac, competences, armes, equipement, tags, equipementTagLinks, sorts, emplacementsSorts, capacites] = await Promise.all([
    getCaracteristiques(perso.id),
    getCompetences(perso.id),
    getArmes(perso.id),
    getEquipement(perso.id),
    getTags(perso.id),
    getEquipementTags(perso.id),
    getSorts(perso.id),
    getEmplacementsSorts(perso.id),
    getCapacites(perso.id),
  ]);
  tagsByEquipement = {};
  equipementTagLinks.forEach(link => {
    (tagsByEquipement[link.equipement_id] ??= []).push(link.tag);
  });

  if (perso.nom) {
    document.title = perso.nom + ' — Eberron';
    document.getElementById('perso-titre').textContent = perso.nom;
  }

  remplirIdentite();
  remplirCarac();
  remplirDeplacements();
  remplirArmure();
  remplirPV();
  remplirCompetences();
  remplirArmes();
  remplirEquipement();
  remplirSorts();
  remplirTraits();
  remplirHistorique();
  remplirNotes();
  initModeJeuClics();
} catch (err) {
  console.error('[fiche]', err);
  afficherErreur(err.message || 'Impossible de charger la fiche.');
}

// ── Navigation entre blocs ─────────────────────────────────────────────────────
document.querySelectorAll('.fiche-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    activerBloc(tab.dataset.bloc);
    document.getElementById('nav-blocs').classList.remove('open');
  });
});
document.getElementById('nav-toggle').addEventListener('click', () => {
  document.getElementById('nav-blocs').classList.toggle('open');
});

function activerBloc(id) {
  document.querySelectorAll('.fiche-bloc').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.fiche-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('bloc-' + id)?.classList.add('active');
  document.querySelector(`.fiche-tab[data-bloc="${id}"]`)?.classList.add('active');
  placerNavToggle();
}

// ── Burger devant le titre de l'onglet actif en mobile ──────────────────────────
const NAV_TOGGLE_BREAKPOINT = 700;
function placerNavToggle() {
  const navToggle = document.getElementById('nav-toggle');
  const navRow = document.getElementById('nav-row');
  if (!navToggle || !navRow) return;
  const enMobile = window.innerWidth <= NAV_TOGGLE_BREAKPOINT;
  if (enMobile) {
    const titreActif = document.querySelector('.fiche-bloc.active .bloc-title');
    if (titreActif && navToggle.parentElement !== titreActif) {
      titreActif.prepend(navToggle);
    }
  } else if (navToggle.parentElement !== navRow) {
    navRow.prepend(navToggle);
  }
}
placerNavToggle();
window.addEventListener('resize', placerNavToggle);

// ── Swipe mobile entre catégories ──────────────────────────────────────────────
(function initSwipeBlocs() {
  const main = document.getElementById('fiche-main');
  const tabs = Array.from(document.querySelectorAll('.fiche-tab'));
  const SWIPE_BREAKPOINT = 700;
  const SWIPE_MIN_DISTANCE = 50;
  const SWIPE_MAX_OFF_AXIS = 80;

  let startX = 0;
  let startY = 0;
  let tracking = false;

  main.addEventListener('touchstart', (e) => {
    if (window.innerWidth > SWIPE_BREAKPOINT || e.touches.length !== 1) {
      tracking = false;
      return;
    }
    tracking = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  main.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dy) > SWIPE_MAX_OFF_AXIS) return;

    const currentIndex = tabs.findIndex(t => t.classList.contains('active'));
    if (currentIndex === -1) return;
    const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= tabs.length) return;

    activerBloc(tabs[nextIndex].dataset.bloc);
  }, { passive: true });
})();

// ── Sauvegarde automatique ─────────────────────────────────────────────────────
function showSave(status) {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.dataset.status = status;
  el.textContent = status === 'saving' ? 'Sauvegarde…' : status === 'ok' ? 'Sauvegardé ✓' : 'Erreur';
  if (status !== 'saving') {
    setTimeout(() => { el.dataset.status = ''; el.textContent = ''; }, 2500);
  }
}

function schedulePersoSave(patch) {
  Object.assign(perso, patch);
  clearTimeout(persoTimer);
  persoTimer = setTimeout(async () => {
    showSave('saving');
    try { await updatePersonnage(perso.id, patch); showSave('ok'); }
    catch { showSave('error'); }
  }, DEBOUNCE_MS);
}

function scheduleCaracSave(patch) {
  Object.assign(carac, patch);
  clearTimeout(caracTimer);
  caracTimer = setTimeout(async () => {
    showSave('saving');
    try {
      await updateCaracteristiques(carac.id, patch);
      showSave('ok');
      recalculerTout();
    } catch { showSave('error'); }
  }, DEBOUNCE_MS);
}

// ── Recalcul en cascade ────────────────────────────────────────────────────────
function recalculerTout() {
  recalculerModsEtJdS();
  recalculerArmure();
  recalculerCompetences();
  recalculerInitiative();
  recalculerBM();
  recalculerPVMax();
  recalculerDeplacements();
  recalculerArmes();
  recalculerSortsTotaux();
}

// ── Clics Mode Jeu sur les valeurs calculées ───────────────────────────────────
function initModeJeuClics() {
  // Zone valeur + modificateur → jet de caractéristique
  STATS.forEach(stat => {
    document.getElementById('roll-' + stat)?.addEventListener('click', () => {
      if (getMode() !== 'jeu') return;
      lancerJet(modificateur(carac[stat] ?? 10), STAT_LABELS[stat]);
    });
  });

  // Ligne jet de sauvegarde → jet de sauvegarde
  STATS.forEach(stat => {
    document.getElementById('carac-' + stat)?.closest('.carac-box')?.querySelector('.carac-box-jds')?.addEventListener('click', () => {
      if (getMode() !== 'jeu') return;
      const key = 'maitrise_jds_' + stat;
      const bm  = bonusMaitrise(perso.niveau ?? 1);
      const mod = modificateur(carac[stat] ?? 10) + (carac[key] ? bm : 0);
      lancerJet(mod, 'Sauv. ' + STAT_LABELS[stat]);
    });
  });

  // Initiative
  document.getElementById('roll-initiative')?.addEventListener('click', () => {
    if (getMode() !== 'jeu') return;
    lancerJet(modificateur(carac.dexterite ?? 10), 'Initiative');
  });
}

// ── Bloc 1 : Identité ──────────────────────────────────────────────────────────
// Champ texte qui affiche "valeur + unité" au repos, et la valeur brute en édition.
function bindChampUnite(f) {
  const el = document.getElementById('id-' + f);
  if (!el) return;
  const formatter = UNITE_FORMATTERS[f];

  const afficherFormate = () => {
    const v = perso[f];
    el.value = (v === null || v === undefined || v === '') ? '' : formatter(v);
  };
  afficherFormate();

  el.addEventListener('focus', () => {
    el.value = perso[f] ?? '';
  });
  el.addEventListener('blur', () => {
    const raw = el.value.replace(/[^\d]/g, '');
    const num = raw === '' ? null : Number(raw);
    perso[f] = num;
    schedulePersoSave({ [f]: num });
    afficherFormate();
  });
}

function remplirIdentite() {
  const champsTxt = ['nom', 'classe', 'race', 'dieu', 'devise'];
  const champsNum = ['niveau', 'xp'];
  const champsUnite = ['age', 'taille_cm', 'poids_kg'];

  champsTxt.forEach(f => {
    const el = document.getElementById('id-' + f);
    if (!el) return;
    el.value = perso[f] ?? '';
    el.addEventListener('input', () => {
      schedulePersoSave({ [f]: el.value });
      if (f === 'nom') {
        document.getElementById('perso-titre').textContent = el.value || 'Fiche de personnage';
        document.title = (el.value || 'Fiche') + ' — Eberron';
      }
    });
  });

  champsNum.forEach(f => {
    const el = document.getElementById('id-' + f);
    if (!el) return;
    el.value = perso[f] ?? '';
    el.addEventListener('input', () => {
      schedulePersoSave({ [f]: el.value === '' ? null : Number(el.value) });
      if (f === 'niveau') {
        recalculerBM();
        recalculerModsEtJdS();
        recalculerCompetences();
        remplirDesDeVie();
        remplirPVNiveaux();
        recalculerPVMax();
        recalculerSortsTotaux();
      }
    });
  });

  champsUnite.forEach(bindChampUnite);

  const sel = document.getElementById('id-alignement');
  if (sel) {
    ALIGNEMENTS.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a; opt.textContent = a;
      sel.appendChild(opt);
    });
    sel.value = perso.alignement ?? '';
    sel.addEventListener('change', () => schedulePersoSave({ alignement: sel.value }));
  }
}

// ── Bloc 2 : Caractéristiques ──────────────────────────────────────────────────
function remplirCarac() {
  if (!carac) return;

  STATS.forEach(stat => {
    const valInput = document.getElementById('carac-' + stat);
    const modEl    = document.getElementById('mod-' + stat);
    if (!valInput || !modEl) return;

    valInput.value = carac[stat] ?? 10;
    modEl.textContent = fmt(modificateur(carac[stat] ?? 10));

    valInput.addEventListener('input', () => {
      const val = Number(valInput.value) || 10;
      modEl.textContent = fmt(modificateur(val));
      scheduleCaracSave({ [stat]: val });
    });
  });

  STATS.forEach(stat => {
    const key   = 'maitrise_jds_' + stat;
    const cb    = document.getElementById('jds-maitrise-' + stat);
    const valEl = document.getElementById('jds-val-' + stat);
    if (!cb || !valEl) return;

    cb.checked = carac[key] ?? false;
    cb.addEventListener('change', () => {
      scheduleCaracSave({ [key]: cb.checked });
      recalculerModsEtJdS();
    });
  });

  recalculerModsEtJdS();
  recalculerBM();
  recalculerInitiative();
}

function recalculerModsEtJdS() {
  if (!carac) return;
  const bm = bonusMaitrise(perso.niveau ?? 1);
  STATS.forEach(stat => {
    const mod    = modificateur(carac[stat] ?? 10);
    const jdsKey = 'maitrise_jds_' + stat;
    const valEl  = document.getElementById('jds-val-' + stat);
    if (valEl) valEl.textContent = fmt(mod + (carac[jdsKey] ? bm : 0));
  });
}

function recalculerBM() {
  const bm = bonusMaitrise(perso.niveau ?? 1);
  const el = document.getElementById('bonus-maitrise');
  if (el) el.textContent = '+' + bm;
}

function recalculerInitiative() {
  const el = document.getElementById('initiative-val');
  if (!el || !carac) return;
  el.textContent = fmt(modificateur(carac.dexterite ?? 10));
}

// ── Bloc 3 : Déplacements & Charge ────────────────────────────────────────────
function remplirDeplacements() {
  if (!perso) return;

  ['vitesse_base_m', 'vitesse_nage_m', 'vitesse_escalade_m', 'vitesse_vol_m'].forEach(f => {
    const el = document.getElementById('dep-' + f);
    if (!el) return;
    el.value = perso[f] ?? '';
    el.addEventListener('input', () => {
      schedulePersoSave({ [f]: el.value === '' ? null : Number(el.value) });
      recalculerVitesses();
    });
  });

  recalculerDeplacements();
}

function recalculerVitesses() {
  const base = perso?.vitesse_base_m ?? null;
  const baseAff = base != null ? base + ' m' : '—';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('dep-disp-base', baseAff);

  // Nage : valeur manuelle si saisie, sinon base / 2
  const nage = perso?.vitesse_nage_m;
  if (nage != null) {
    set('dep-disp-nage', nage + ' m');
    set('dep-note-nage', '');
  } else if (base != null) {
    set('dep-disp-nage', (base / 2) + ' m');
    set('dep-note-nage', 'base ÷ 2');
  } else {
    set('dep-disp-nage', '—');
    set('dep-note-nage', '');
  }

  // Escalade : même règle que nage
  const escalade = perso?.vitesse_escalade_m;
  if (escalade != null) {
    set('dep-disp-escalade', escalade + ' m');
    set('dep-note-escalade', '');
  } else if (base != null) {
    set('dep-disp-escalade', (base / 2) + ' m');
    set('dep-note-escalade', 'base ÷ 2');
  } else {
    set('dep-disp-escalade', '—');
    set('dep-note-escalade', '');
  }

  // Vol : uniquement si valeur saisie
  const vol = perso?.vitesse_vol_m;
  set('dep-disp-vol', vol != null ? vol + ' m' : '—');
}

function recalculerDeplacements() {
  if (!carac) return;
  const valForce = carac.force ?? 10;
  const modForce = modificateur(valForce);

  const ftToM = v => Math.round(v * 0.3 * 10) / 10;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('dep-force-label', valForce);
  set('dep-saut-long-elan', ftToM(sautLongueur(valForce, true)) + ' m');
  set('dep-saut-long-sans', ftToM(sautLongueur(valForce, false)) + ' m');
  set('dep-saut-haut-elan', ftToM(sautHauteur(modForce, true)) + ' m');
  set('dep-saut-haut-sans', ftToM(sautHauteur(modForce, false)) + ' m');
  set('dep-charge-max', chargeMax(valForce) + ' kg');
  recalculerVitesses();
}

// ── Bloc 7 : Armes ────────────────────────────────────────────────────────────
function remplirArmes() {
  const container = document.getElementById('armes-container');
  if (!container) return;
  container.innerHTML = '';

  if (!armes.length) {
    const empty = document.createElement('p');
    empty.className = 'armes-empty';
    empty.textContent = 'Aucune arme — ajoutez-en une en Mode Édition.';
    container.appendChild(empty);
  } else {
    armes.forEach(arme => container.appendChild(renderArmeCard(arme)));
  }

  document.getElementById('btn-add-arme')?.addEventListener('click', async () => {
    const newArme = {
      personnage_id: perso.id,
      nom: '',
      caracteristique: 'force',
      maitrise: false,
      bonus_magie: 0,
      bonus_special: 0,
      de_degats: '1d6',
      bonus_degats_special: 0,
      type_degats: '',
    };
    try {
      showSave('saving');
      const created = await addArme(newArme);
      showSave('ok');
      armes.push(created);
      const emptyEl = container.querySelector('.armes-empty');
      if (emptyEl) emptyEl.remove();
      container.appendChild(renderArmeCard(created));
    } catch (err) {
      showSave('error');
      console.error(err);
    }
  });
}

function renderArmeCard(arme) {
  const card = document.createElement('div');
  card.className = 'arme-card';
  card.dataset.id = arme.id;

  const mId = 'arme-m-' + arme.id;

  card.innerHTML = `
    <div class="arme-header">
      <div class="fiche-field arme-nom-field">
        <label>Nom</label>
        <input type="text" class="arme-nom-input" placeholder="Épée longue" />
      </div>
      <div class="fiche-field arme-carac-field">
        <label>Carac.</label>
        <select class="arme-carac-select">
          <option value="force">Force</option>
          <option value="dexterite">Dextérité</option>
        </select>
      </div>
      <div class="arme-maitrise-wrap">
        <input type="checkbox" class="case-maitrise arme-maitrise-cb" id="${mId}" />
        <label for="${mId}">Maîtrise</label>
      </div>
      <button class="btn-structurel arme-del-btn" title="Supprimer cette arme">✕</button>
    </div>
    <div class="arme-details-grid">
      <div class="fiche-field arme-de-field">
        <label>Dé de dégâts</label>
        <input type="text" class="arme-de-input" placeholder="1d6" />
      </div>
      <div class="fiche-field arme-type-field">
        <label>Type de dégâts</label>
        <select class="arme-type-select">
          <option value="">— Choisir —</option>
          ${TYPES_DEGATS.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div class="fiche-field arme-magie-field">
        <label>Bonus magie</label>
        <input type="number" class="arme-magie-input" min="0" placeholder="0" />
      </div>
      <div class="fiche-field arme-bspecial-field">
        <label>Att. spécial</label>
        <input type="number" class="arme-bspecial-input" placeholder="0" />
      </div>
      <div class="fiche-field arme-bdegats-field">
        <label>Dég. spécial</label>
        <input type="number" class="arme-bdegats-input" placeholder="0" />
      </div>
    </div>
    <div class="arme-totaux">
      <div class="arme-total-item arme-total-attaque">
        <div class="arme-total-label">Attaque</div>
        <div class="arme-total-val champ-calcule val-clickable" id="arme-toucher-${arme.id}">—</div>
        <div class="arme-total-note">pour toucher</div>
      </div>
      <div class="arme-total-item arme-total-degats">
        <div class="arme-total-label">Dégâts</div>
        <div class="arme-total-val champ-calcule val-clickable" id="arme-degats-${arme.id}">—</div>
        <div class="arme-total-note arme-type-note"></div>
      </div>
    </div>
  `;

  // Initialiser les valeurs via propriétés JS (pas d'interpolation HTML)
  card.querySelector('.arme-nom-input').value = arme.nom ?? '';
  card.querySelector('.arme-carac-select').value = arme.caracteristique ?? 'force';
  card.querySelector('.arme-maitrise-cb').checked = arme.maitrise ?? false;
  card.querySelector('.arme-de-input').value = arme.de_degats ?? '';
  card.querySelector('.arme-type-select').value = arme.type_degats ?? '';
  card.querySelector('.arme-magie-input').value = arme.bonus_magie ?? 0;
  card.querySelector('.arme-bspecial-input').value = arme.bonus_special ?? 0;
  card.querySelector('.arme-bdegats-input').value = arme.bonus_degats_special ?? 0;

  // Sauvegarde debounce pour cette arme
  let armeTimer = null;
  const scheduleArmeSave = () => {
    clearTimeout(armeTimer);
    armeTimer = setTimeout(async () => {
      showSave('saving');
      try {
        await updateArme(arme.id, {
          nom: arme.nom,
          caracteristique: arme.caracteristique,
          maitrise: arme.maitrise,
          bonus_magie: arme.bonus_magie,
          bonus_special: arme.bonus_special,
          de_degats: arme.de_degats,
          bonus_degats_special: arme.bonus_degats_special,
          type_degats: arme.type_degats,
        });
        showSave('ok');
      } catch { showSave('error'); }
    }, DEBOUNCE_MS);
  };

  // Champs texte — pas de recalcul nécessaire
  card.querySelector('.arme-nom-input').addEventListener('input', e => {
    arme.nom = e.target.value;
    scheduleArmeSave();
  });
  card.querySelector('.arme-type-select').addEventListener('change', e => {
    arme.type_degats = e.target.value;
    scheduleArmeSave();
    card.querySelector('.arme-type-note').textContent = e.target.value;
  });

  // Champs qui affectent les totaux calculés
  card.querySelector('.arme-carac-select').addEventListener('change', e => {
    arme.caracteristique = e.target.value;
    scheduleArmeSave();
    recalculerArmeCard(card, arme);
  });
  card.querySelector('.arme-maitrise-cb').addEventListener('change', e => {
    arme.maitrise = e.target.checked;
    scheduleArmeSave();
    recalculerArmeCard(card, arme);
  });
  card.querySelector('.arme-de-input').addEventListener('input', e => {
    arme.de_degats = e.target.value;
    scheduleArmeSave();
    recalculerArmeCard(card, arme);
  });
  card.querySelector('.arme-magie-input').addEventListener('input', e => {
    arme.bonus_magie = Number(e.target.value) || 0;
    scheduleArmeSave();
    recalculerArmeCard(card, arme);
  });
  card.querySelector('.arme-bspecial-input').addEventListener('input', e => {
    arme.bonus_special = Number(e.target.value) || 0;
    scheduleArmeSave();
    recalculerArmeCard(card, arme);
  });
  card.querySelector('.arme-bdegats-input').addEventListener('input', e => {
    arme.bonus_degats_special = Number(e.target.value) || 0;
    scheduleArmeSave();
    recalculerArmeCard(card, arme);
  });

  // Supprimer
  card.querySelector('.arme-del-btn').addEventListener('click', async () => {
    try {
      showSave('saving');
      await deleteArme(arme.id);
      showSave('ok');
      armes = armes.filter(a => a.id !== arme.id);
      card.remove();
      const container = document.getElementById('armes-container');
      if (container && !armes.length) {
        const empty = document.createElement('p');
        empty.className = 'armes-empty';
        empty.textContent = 'Aucune arme — ajoutez-en une en Mode Édition.';
        container.appendChild(empty);
      }
    } catch (err) { showSave('error'); console.error(err); }
  });

  // Clics Mode Jeu → jets de dés
  card.querySelector('#arme-toucher-' + arme.id).addEventListener('click', () => {
    if (getMode() !== 'jeu' || !carac) return;
    const modCarac = modificateur(carac[arme.caracteristique ?? 'force'] ?? 10);
    const total = bonusToucher(modCarac, arme.maitrise ?? false, arme.bonus_magie ?? 0, arme.bonus_special ?? 0, perso.niveau ?? 1);
    lancerJet(total, (arme.nom || 'Arme') + ' — Attaque');
  });

  card.querySelector('#arme-degats-' + arme.id).addEventListener('click', () => {
    if (getMode() !== 'jeu' || !carac) return;
    const modCarac = modificateur(carac[arme.caracteristique ?? 'force'] ?? 10);
    const bonusTotal = modCarac + (arme.bonus_magie ?? 0) + (arme.bonus_degats_special ?? 0);
    lancerDegats(arme.de_degats || '1d6', bonusTotal, (arme.nom || 'Arme') + ' — Dégâts');
  });

  recalculerArmeCard(card, arme);
  ajusterArmeCardLayout(card);
  return card;
}

// ── Réagencement de la carte d'arme en téléphone ────────────────────────────────
function ajusterArmeCardLayout(card) {
  const header      = card.querySelector('.arme-header');
  const detailsGrid = card.querySelector('.arme-details-grid');
  const caracField  = card.querySelector('.arme-carac-field');
  const magieField  = card.querySelector('.arme-magie-field');
  const maitriseWrap = card.querySelector('.arme-maitrise-wrap');
  const bspecialField = card.querySelector('.arme-bspecial-field');
  const bdegatsField  = card.querySelector('.arme-bdegats-field');
  const totalAttaque  = card.querySelector('.arme-total-attaque');
  const totalDegats   = card.querySelector('.arme-total-degats');
  if (!header || !detailsGrid || !caracField || !magieField || !bspecialField || !bdegatsField) return;

  const enMobile = window.innerWidth <= ARME_MOBILE_BREAKPOINT;
  if (enMobile) {
    if (caracField.parentElement !== detailsGrid) detailsGrid.insertBefore(caracField, magieField);
    if (bspecialField.parentElement !== totalAttaque) totalAttaque?.prepend(bspecialField);
    if (bdegatsField.parentElement !== totalDegats) totalDegats?.prepend(bdegatsField);
  } else {
    if (caracField.parentElement !== header) header.insertBefore(caracField, maitriseWrap);
    if (bdegatsField.parentElement !== detailsGrid) detailsGrid.appendChild(bdegatsField);
    if (bspecialField.parentElement !== detailsGrid) detailsGrid.insertBefore(bspecialField, bdegatsField);
  }
}
function ajusterToutesLesArmes() {
  document.querySelectorAll('.arme-card').forEach(ajusterArmeCardLayout);
}
window.addEventListener('resize', ajusterToutesLesArmes);

function recalculerArmeCard(card, arme) {
  if (!carac) return;
  const modCarac = modificateur(carac[arme.caracteristique ?? 'force'] ?? 10);
  const niveau = perso?.niveau ?? 1;
  const toucher = bonusToucher(modCarac, arme.maitrise ?? false, arme.bonus_magie ?? 0, arme.bonus_special ?? 0, niveau);
  const bonusDeg = modCarac + (arme.bonus_magie ?? 0) + (arme.bonus_degats_special ?? 0);
  const de = arme.de_degats || '1d6';
  const bonusStr = bonusDeg >= 0 ? '+' + bonusDeg : String(bonusDeg);

  const toucherEl = card.querySelector('#arme-toucher-' + arme.id);
  const degatsEl = card.querySelector('#arme-degats-' + arme.id);
  if (toucherEl) toucherEl.textContent = fmt(toucher);
  if (degatsEl) degatsEl.textContent = de + bonusStr;

  const typeNote = card.querySelector('.arme-type-note');
  if (typeNote) typeNote.textContent = arme.type_degats ?? '';
}

function recalculerArmes() {
  const container = document.getElementById('armes-container');
  if (!container) return;
  armes.forEach(arme => {
    const card = container.querySelector(`.arme-card[data-id="${arme.id}"]`);
    if (card) recalculerArmeCard(card, arme);
  });
}

// ── Bloc 8 : Équipement & Possessions ─────────────────────────────────────────
function tagsDeObjet(itemId) {
  return tagsByEquipement[itemId] || [];
}

function objetEstMagique(itemId) {
  return tagsDeObjet(itemId).some(t => t.nom === 'Magique');
}

function objetEstMonnaie(itemId) {
  return tagsDeObjet(itemId).some(t => t.systeme === 'monnaie');
}

// Une "Valeur (pc)" n'est exploitable pour le résumé de monnaie que si elle
// correspond exactement à une dénomination connue (1000/100/50/10/1).
function valeurMonnaieValide(valeurPc) {
  return Object.values(TAUX_PC).includes(valeurPc);
}

// Tag-conteneur dont cet objet est le conteneur (ex. la "Bourse" elle-même), s'il y en a un.
function tagConteneurDeLObjet(itemId) {
  return tags.find(t => t.conteneur_equipement_id === itemId);
}

// Désambiguïsation "#n" des tags-conteneurs homonymes, calculée à l'affichage
// (jamais stockée en DB) : index dans le groupe trié par ordre/date de création.
function suffixesConteneurs() {
  const groupes = {};
  tags.filter(t => t.conteneur_equipement_id).forEach(t => {
    (groupes[t.nom] ??= []).push(t);
  });
  const suffixById = {};
  Object.values(groupes).forEach(liste => {
    if (liste.length < 2) return;
    liste.sort((a, b) => (a.ordre - b.ordre) || (new Date(a.created_at) - new Date(b.created_at)));
    liste.forEach((t, idx) => { suffixById[t.id] = idx + 1; });
  });
  return suffixById;
}

function libelleTag(tag, suffixes) {
  if (!tag.conteneur_equipement_id) return tag.nom;
  const n = suffixes[tag.id];
  return n ? `📦 ${tag.nom} #${n}` : `📦 ${tag.nom}`;
}

// Regroupe une liste d'objets (déjà filtrée/triée) : objets racine, et
// enfants par conteneur (objets portant un tag-conteneur lié à un autre
// objet de l'inventaire). Un objet filtré hors résultat ne réapparaît pas
// sous son conteneur, même si celui-ci est affiché.
function calculerGroupesEquipement(liste) {
  const conteneurDeLItem = new Map(); // itemId -> id de l'objet conteneur
  liste.forEach(item => {
    const t = tagsDeObjet(item.id).find(tag => tag.conteneur_equipement_id);
    if (t && t.conteneur_equipement_id !== item.id) conteneurDeLItem.set(item.id, t.conteneur_equipement_id);
  });
  const enfantsParConteneur = new Map();
  liste.forEach(item => {
    const cid = conteneurDeLItem.get(item.id);
    if (!cid) return;
    if (!enfantsParConteneur.has(cid)) enfantsParConteneur.set(cid, []);
    enfantsParConteneur.get(cid).push(item);
  });
  const racine = liste.filter(item => !conteneurDeLItem.has(item.id));
  return { racine, enfantsParConteneur };
}

function getEquipementAffiche() {
  let liste = equipement.slice();
  if (equipementFilterTagIds.size) {
    liste = liste.filter(item => tagsDeObjet(item.id).some(t => equipementFilterTagIds.has(t.id)));
  }
  const cmp = COMPARATEURS_EQUIPEMENT[equipementSortKey] ?? COMPARATEURS_EQUIPEMENT['nom-asc'];
  return liste.sort(cmp);
}

// Barre d'outils tri/filtre, insérée une seule fois au-dessus de l'inventaire.
function initBarreOutilsEquipement(container) {
  const section = container.parentElement;
  if (!section || section.querySelector('.equipement-toolbar')) return;

  const toolbar = document.createElement('div');
  toolbar.className = 'equipement-toolbar';
  toolbar.innerHTML = `
    <select class="equipement-tri-select">
      <option value="nom-asc">Nom (A → Z)</option>
      <option value="nom-desc">Nom (Z → A)</option>
      <option value="valeur-asc">Valeur ↑</option>
      <option value="valeur-desc">Valeur ↓</option>
      <option value="poids-asc">Poids ↑</option>
      <option value="poids-desc">Poids ↓</option>
    </select>
    <div class="equipement-filtre-wrap">
      <button type="button" class="equipement-filtre-btn">Filtrer par tag<span class="equipement-filtre-count"></span></button>
      <div class="equipement-filtre-panel" hidden></div>
    </div>
  `;
  section.insertBefore(toolbar, container);

  const triSelect = toolbar.querySelector('.equipement-tri-select');
  triSelect.value = equipementSortKey;
  triSelect.addEventListener('change', () => {
    equipementSortKey = triSelect.value;
    remplirEquipement();
  });

  const filtreBtn = toolbar.querySelector('.equipement-filtre-btn');
  const filtrePanel = toolbar.querySelector('.equipement-filtre-panel');
  const filtreCount = toolbar.querySelector('.equipement-filtre-count');

  function refreshFiltreCount() {
    filtreCount.textContent = equipementFilterTagIds.size ? ` (${equipementFilterTagIds.size})` : '';
  }
  refreshFiltreCount();

  filtreBtn.addEventListener('click', () => {
    if (filtrePanel.hidden) {
      const tagsUniques = [...new Map(tags.map(t => [t.id, t])).values()];
      filtrePanel.innerHTML = tagsUniques.length
        ? tagsUniques.map(t => `
            <label class="equipement-filtre-item">
              <input type="checkbox" class="mode-jeu-ok" value="${t.id}" ${equipementFilterTagIds.has(t.id) ? 'checked' : ''} />
              ${libelleTag(t, suffixesConteneurs())}
            </label>
          `).join('')
        : '<p class="equipement-ajout-vide">Aucun tag créé pour le moment.</p>';
      filtrePanel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) equipementFilterTagIds.add(cb.value);
          else equipementFilterTagIds.delete(cb.value);
          refreshFiltreCount();
          remplirEquipement();
        });
      });
    }
    filtrePanel.hidden = !filtrePanel.hidden;
  });
}

// Recharge équipement/tags/liaisons depuis la base puis redessine l'inventaire.
// Utilisé après toute opération pouvant déclencher une cascade côté DB
// (suppression d'un conteneur, retrait d'un tag-conteneur).
async function rafraichirEquipementDepuisDB() {
  const [eq, tg, liens] = await Promise.all([
    getEquipement(perso.id),
    getTags(perso.id),
    getEquipementTags(perso.id),
  ]);
  equipement = eq;
  tags = tg;
  tagsByEquipement = {};
  liens.forEach(link => { (tagsByEquipement[link.equipement_id] ??= []).push(link.tag); });
  remplirEquipement();
}

function recalculerResumeMonnaie() {
  const container = document.getElementById('equipement-monnaie-section');
  if (!container) return;
  // Chaque pièce de monnaie garde sa dénomination (pas de reconversion en PC
  // puis redécomposition, qui transformerait par ex. 100 PA en 10 PO).
  const totaux = { pp: 0, po: 0, pe: 0, pa: 0, pc: 0 };
  equipement.forEach(item => {
    if (!objetEstMonnaie(item.id)) return;
    const denomination = Object.keys(TAUX_PC).find(k => TAUX_PC[k] === item.valeur_pc);
    if (denomination) totaux[denomination] += item.quantite ?? 0;
  });
  const { pp, po, pe, pa, pc } = totaux;
  container.innerHTML = `
    <h3 class="equipement-section-label">Monnaie</h3>
    <div class="monnaie-grid monnaie-readonly">
      <div class="monnaie-card monnaie-pp"><span class="monnaie-value">${pp}</span><span class="monnaie-line"></span><span class="monnaie-hint">Platine</span></div>
      <div class="monnaie-card monnaie-po"><span class="monnaie-value">${po}</span><span class="monnaie-line"></span><span class="monnaie-hint">Or</span></div>
      <div class="monnaie-card monnaie-pe"><span class="monnaie-value">${pe}</span><span class="monnaie-line"></span><span class="monnaie-hint">Électrum</span></div>
      <div class="monnaie-card monnaie-pa"><span class="monnaie-value">${pa}</span><span class="monnaie-line"></span><span class="monnaie-hint">Argent</span></div>
      <div class="monnaie-card monnaie-pc"><span class="monnaie-value">${pc}</span><span class="monnaie-line"></span><span class="monnaie-hint">Cuivre</span></div>
    </div>
  `;
}

function remplirEquipement() {
  const container = document.getElementById('equipement-container');
  if (!container) return;
  container.innerHTML = '';

  initBarreOutilsEquipement(container);

  if (!equipement.length) {
    const empty = document.createElement('p');
    empty.className = 'equipement-empty';
    empty.textContent = 'Aucun objet — ajoutez-en un en Mode Édition.';
    container.appendChild(empty);
  } else {
    const listeAffichee = getEquipementAffiche();
    if (!listeAffichee.length) {
      const empty = document.createElement('p');
      empty.className = 'equipement-empty';
      empty.textContent = 'Aucun objet ne correspond aux filtres sélectionnés.';
      container.appendChild(empty);
    } else {
      const { racine, enfantsParConteneur } = calculerGroupesEquipement(listeAffichee);
      racine.forEach(item => {
        container.appendChild(renderEquipementCard(item));
        const enfants = enfantsParConteneur.get(item.id);
        if (enfants && enfants.length) {
          const groupe = document.createElement('div');
          groupe.className = 'equipement-groupe-conteneur';
          enfants.forEach(enfant => groupe.appendChild(renderEquipementCard(enfant)));
          container.appendChild(groupe);
        }
      });
    }
  }

  initPanneauAjoutEquipement(container);

  recalculerResumeMonnaie();
}

// Crée un objet vierge (comportement historique du bouton "+ Ajouter un objet").
async function ajouterObjetVide(container) {
  const newItem = { personnage_id: perso.id, nom: '', description: '', quantite: 1, valeur_pc: 0 };
  showSave('saving');
  try {
    const created = await addEquipement(newItem);
    showSave('ok');
    equipement.push(created);
    tagsByEquipement[created.id] = [];
    container.querySelector('.equipement-empty')?.remove();
    container.appendChild(renderEquipementCard(created));
  } catch (err) { showSave('error'); console.error(err); }
}

// Copie indépendante d'un objet : mêmes valeurs, tags recopiés (sauf ceux
// exclus par nom). Le statut conteneur n'est jamais hérité, puisqu'il dépend
// uniquement de l'id de l'objet d'origine (jamais copié).
async function dupliquerObjetEquipement(item, { excludeBaseId = false, excludeTagsByNom = [] } = {}) {
  const newItem = {
    personnage_id: perso.id,
    nom: item.nom,
    description: item.description,
    quantite: item.quantite,
    poids: item.poids,
    valeur_pc: item.valeur_pc,
    base_id: excludeBaseId ? null : (item.base_id ?? null),
  };
  const created = await addEquipement(newItem);
  const tagsACopier = tagsDeObjet(item.id).filter(t => !excludeTagsByNom.includes(t.nom));
  for (const tag of tagsACopier) await linkTag(created.id, tag.id);
  return created;
}

// Ferme tout menu d'objet ouvert au clic en dehors (écouteur global, posé une seule fois).
function initFermetureMenusEquipement() {
  if (fermetureMenusEquipementInitialisee) return;
  fermetureMenusEquipementInitialisee = true;
  document.addEventListener('click', e => {
    if (e.target.closest('.equipement-menu-wrap')) return;
    document.querySelectorAll('.equipement-menu').forEach(m => { m.hidden = true; });
  });
}

// Renvoie un tag existant du personnage (par nom + systeme) ou le crée.
async function obtenirOuCreerTag(nom, systeme = null) {
  let tag = tags.find(t => t.nom === nom && (systeme ? t.systeme === systeme : !t.systeme));
  if (tag) return tag;
  tag = await addTag({ personnage_id: perso.id, nom, ...(systeme ? { systeme } : {}) });
  tags.push(tag);
  return tag;
}

// Ajoute un objet pré-rempli depuis la base officielle : pose base_id + tag
// "Base" + les tags suggérés par le catalogue (créés s'ils n'existent pas déjà).
async function ajouterDepuisBase(container, baseItem) {
  const newItem = {
    personnage_id: perso.id,
    nom: baseItem.nom,
    description: baseItem.description ?? '',
    quantite: 1,
    poids: baseItem.poids ?? null,
    valeur_pc: baseItem.valeur_pc ?? 0,
    base_id: baseItem.id,
  };
  showSave('saving');
  try {
    const created = await addEquipement(newItem);
    const SYSTEME_PAR_TAG = { Base: 'base', Monnaie: 'monnaie' };
    for (const nomTag of ['Base', ...(baseItem.tags || [])]) {
      const tag = await obtenirOuCreerTag(nomTag, SYSTEME_PAR_TAG[nomTag] ?? null);
      await linkTag(created.id, tag.id);
    }
    showSave('ok');
    // Recharge complète : les tags suggérés (Monnaie, conteneur…) peuvent
    // affecter le résumé de monnaie ou le regroupement visuel.
    await rafraichirEquipementDepuisDB();
  } catch (err) { showSave('error'); console.error(err); }
}

// Panneau de recherche affiché au clic sur "+ Ajouter un objet" : recherche
// dans la base officielle pour pré-remplir, ou création d'un objet personnalisé.
function initPanneauAjoutEquipement(container) {
  const footer = document.querySelector('.equipement-footer');
  const addBtn = document.getElementById('btn-add-equipement');
  if (!footer || !addBtn || footer.querySelector('.equipement-ajout-panel')) return;

  const panel = document.createElement('div');
  panel.className = 'equipement-ajout-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <input type="text" class="equipement-ajout-recherche" placeholder="Rechercher dans la base officielle…" />
    <div class="equipement-ajout-resultats"></div>
    <button type="button" class="equipement-ajout-perso">+ Objet personnalisé</button>
  `;
  footer.appendChild(panel);

  addBtn.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) panel.querySelector('.equipement-ajout-recherche').focus();
  });

  const rechInput = panel.querySelector('.equipement-ajout-recherche');
  const resultatsEl = panel.querySelector('.equipement-ajout-resultats');
  let rechTimer = null;

  rechInput.addEventListener('input', () => {
    clearTimeout(rechTimer);
    const q = rechInput.value.trim();
    if (q.length < 2) { resultatsEl.innerHTML = ''; return; }
    rechTimer = setTimeout(async () => {
      let resultats;
      try { resultats = await searchEquipementBase(q); } catch (err) { console.error(err); return; }
      resultatsEl.innerHTML = resultats.length
        ? resultats.map(r => `<button type="button" class="equipement-ajout-resultat" data-id="${r.id}">${r.nom} <span class="equipement-ajout-resultat-valeur">${r.valeur_pc ?? 0} pc</span></button>`).join('')
        : '<p class="equipement-ajout-vide">Aucun résultat.</p>';
      resultatsEl.querySelectorAll('.equipement-ajout-resultat').forEach(btn => {
        btn.addEventListener('click', async () => {
          const baseItem = resultats.find(r => r.id === btn.dataset.id);
          await ajouterDepuisBase(container, baseItem);
          panel.hidden = true;
          rechInput.value = '';
          resultatsEl.innerHTML = '';
        });
      });
    }, 300);
  });

  panel.querySelector('.equipement-ajout-perso').addEventListener('click', async () => {
    await ajouterObjetVide(container);
    panel.hidden = true;
  });
}

function renderEquipementCard(item) {
  const card = document.createElement('div');
  card.className = 'equipement-card';
  card.classList.toggle('no-desc', !item.description);
  card.classList.toggle('tag-magique', objetEstMagique(item.id));

  card.innerHTML = `
    <div class="equipement-row equipement-row-main">
      <div class="fiche-field equipement-nom-field">
        <label>Objet <span class="equipement-conteneur-indicateur"></span></label>
        <input type="text" class="equipement-nom-input" placeholder="Nom de l'objet" />
      </div>
      <div class="fiche-field equipement-qty-field">
        <label>Qté</label>
        <div class="equipement-qty-row">
          <input type="number" class="equipement-qty-input" min="1" />
          <span class="equipement-qty-unit" aria-hidden="true">u.</span>
        </div>
      </div>
      <span class="equipement-chevron" aria-hidden="true">▾</span>
      <div class="btn-structurel equipement-menu-wrap">
        <button type="button" class="equipement-menu-btn" title="Actions">⋮</button>
        <div class="equipement-menu" hidden>
          <button type="button" class="equipement-menu-item equipement-action-personnaliser">Personnaliser</button>
          <button type="button" class="equipement-menu-item equipement-action-dupliquer">Dupliquer</button>
          <button type="button" class="equipement-menu-item equipement-action-supprimer">Supprimer</button>
        </div>
      </div>
    </div>
    <div class="equipement-row equipement-row-detail">
      <div class="fiche-field equipement-poids-field">
        <label>Poids (kg)</label>
        <div class="equipement-poids-row">
          <input type="number" class="equipement-poids-input" min="0" step="0.1" placeholder="—" />
          <span class="equipement-poids-unit" aria-hidden="true">kg</span>
        </div>
      </div>
      <div class="fiche-field equipement-valeur-field">
        <label>Valeur (pc)</label>
        <input type="number" class="equipement-valeur-input" min="0" step="1" placeholder="0" />
      </div>
      <div class="fiche-field equipement-tags-field">
        <label>Tags</label>
        <div class="equipement-tags-list"></div>
        <select class="equipement-tag-select">
          <option value="">+ Ajouter un tag</option>
        </select>
      </div>
    </div>
    <div class="fiche-field equipement-desc-field">
      <label>Description</label>
      <textarea class="equipement-desc-input" rows="2" placeholder="Description (optionnel)"></textarea>
    </div>
  `;

  card.querySelector('.equipement-nom-input').value = item.nom ?? '';
  card.querySelector('.equipement-qty-input').value = item.quantite ?? 1;
  card.querySelector('.equipement-poids-input').value = item.poids ?? '';
  card.querySelector('.equipement-valeur-input').value = item.valeur_pc ?? 0;
  card.querySelector('.equipement-desc-input').value = item.description ?? '';

  const tagsList = card.querySelector('.equipement-tags-list');
  const tagSelect = card.querySelector('.equipement-tag-select');
  const conteneurIndicateur = card.querySelector('.equipement-conteneur-indicateur');

  function refreshConteneurIndicateur() {
    const tagConteneur = tagConteneurDeLObjet(item.id);
    if (tagConteneur) {
      const titre = libelleTag(tagConteneur, suffixesConteneurs());
      conteneurIndicateur.innerHTML = `<span class="equipement-conteneur-icone actif" title="${titre}">📦</span><button type="button" class="equipement-conteneur-retirer" title="Cet objet ne sera plus un conteneur">✕</button>`;
      conteneurIndicateur.querySelector('.equipement-conteneur-retirer').addEventListener('click', async e => {
        e.preventDefault();
        try {
          showSave('saving');
          await deleteTag(tagConteneur.id);
          showSave('ok');
          await rafraichirEquipementDepuisDB();
        } catch (err) { showSave('error'); console.error(err); }
      });
    } else {
      conteneurIndicateur.innerHTML = `<button type="button" class="equipement-conteneur-creer" title="Faire de cet objet un conteneur"><span class="equipement-conteneur-icone">📦</span><span class="equipement-conteneur-plus">+</span></button>`;
      conteneurIndicateur.querySelector('.equipement-conteneur-creer').addEventListener('click', async e => {
        e.preventDefault();
        try {
          showSave('saving');
          await addTag({ personnage_id: perso.id, nom: item.nom || 'Conteneur', conteneur_equipement_id: item.id });
          showSave('ok');
          // Recharge complète : la numérotation #n des conteneurs homonymes
          // doit être recalculée sur toutes les cartes déjà affichées, pas
          // seulement celle-ci.
          await rafraichirEquipementDepuisDB();
        } catch (err) { showSave('error'); console.error(err); }
      });
    }
  }

  function refreshTagSelect() {
    const attachedIds = new Set(tagsDeObjet(item.id).map(t => t.id));
    const suffixes = suffixesConteneurs();
    const options = tags.filter(t => t.id !== tagConteneurDeLObjet(item.id)?.id && !attachedIds.has(t.id));
    tagSelect.innerHTML = `<option value="">+ Ajouter un tag</option>` +
      options.map(t => `<option value="${t.id}">${libelleTag(t, suffixes)}</option>`).join('') +
      `<option value="__new__">✎ Nouveau tag…</option>`;
  }

  function refreshTagChips() {
    const suffixes = suffixesConteneurs();
    tagsList.innerHTML = '';
    tagsDeObjet(item.id).forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'equipement-tag-chip';
      if (tag.systeme === 'monnaie' && !valeurMonnaieValide(item.valeur_pc)) {
        chip.classList.add('equipement-tag-chip--invalide');
        chip.title = 'Valeur (pc) invalide : doit être 1000, 100, 50, 10 ou 1 pour compter dans le résumé de monnaie.';
      }
      chip.textContent = libelleTag(tag, suffixes);
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'equipement-tag-remove';
      rm.textContent = '×';
      rm.title = 'Retirer ce tag';
      rm.addEventListener('click', async () => {
        try {
          showSave('saving');
          await unlinkTag(item.id, tag.id);
          showSave('ok');
          if (tag.conteneur_equipement_id) {
            // Retirer un tag-conteneur replace l'objet à la racine de
            // l'inventaire : recharger pour mettre à jour le regroupement.
            await rafraichirEquipementDepuisDB();
            return;
          }
          tagsByEquipement[item.id] = tagsDeObjet(item.id).filter(t => t.id !== tag.id);
          refreshTagChips();
          refreshTagSelect();
          card.classList.toggle('tag-magique', objetEstMagique(item.id));
          if (tag.systeme === 'monnaie') recalculerResumeMonnaie();
        } catch (err) { showSave('error'); console.error(err); }
      });
      chip.appendChild(rm);
      tagsList.appendChild(chip);
    });
  }

  refreshTagChips();
  refreshTagSelect();
  refreshConteneurIndicateur();

  tagSelect.addEventListener('change', async () => {
    const val = tagSelect.value;
    if (!val) return;
    try {
      let tag;
      if (val === '__new__') {
        const nom = window.prompt('Nom du tag :');
        tagSelect.value = '';
        if (!nom || !nom.trim()) return;
        showSave('saving');
        tag = await addTag({ personnage_id: perso.id, nom: nom.trim() });
        tags.push(tag);
      } else {
        tag = tags.find(t => t.id === val);
        tagSelect.value = '';
        showSave('saving');
      }
      await linkTag(item.id, tag.id);
      showSave('ok');
      if (tag.conteneur_equipement_id) {
        // Un tag-conteneur change le regroupement visuel de l'inventaire :
        // recharger pour replacer l'objet sous son nouveau conteneur.
        await rafraichirEquipementDepuisDB();
        return;
      }
      tagsByEquipement[item.id] = [...tagsDeObjet(item.id), tag];
      refreshTagChips();
      refreshTagSelect();
      card.classList.toggle('tag-magique', objetEstMagique(item.id));
      if (tag.systeme === 'monnaie') recalculerResumeMonnaie();
    } catch (err) { showSave('error'); console.error(err); }
  });

  let itemTimer = null;
  const scheduleItemSave = () => {
    clearTimeout(itemTimer);
    itemTimer = setTimeout(async () => {
      showSave('saving');
      try {
        await updateEquipement(item.id, { nom: item.nom, description: item.description, quantite: item.quantite, poids: item.poids ?? null, valeur_pc: item.valeur_pc ?? 0 });
        const tagConteneur = tagConteneurDeLObjet(item.id);
        if (tagConteneur && tagConteneur.nom !== item.nom) {
          // Le tag-conteneur reprend le nom de son objet : le garder en
          // phase, sinon la liste des tags affichée sur les objets contenus
          // resterait incohérente avec le nouveau nom du conteneur.
          await updateTag(tagConteneur.id, { nom: item.nom });
          showSave('ok');
          await rafraichirEquipementDepuisDB();
          return;
        }
        showSave('ok');
      } catch { showSave('error'); }
    }, DEBOUNCE_MS);
  };

  card.querySelector('.equipement-nom-input').addEventListener('input', e => {
    item.nom = e.target.value;
    scheduleItemSave();
  });
  card.querySelector('.equipement-qty-input').addEventListener('input', e => {
    item.quantite = Number(e.target.value) || 1;
    scheduleItemSave();
    if (objetEstMonnaie(item.id)) recalculerResumeMonnaie();
  });
  card.querySelector('.equipement-poids-input').addEventListener('input', e => {
    item.poids = e.target.value !== '' ? Number(e.target.value) : null;
    scheduleItemSave();
  });
  card.querySelector('.equipement-valeur-input').addEventListener('input', e => {
    item.valeur_pc = Number(e.target.value) || 0;
    scheduleItemSave();
    if (objetEstMonnaie(item.id)) {
      refreshTagChips();
      recalculerResumeMonnaie();
    }
  });
  card.querySelector('.equipement-desc-input').addEventListener('input', e => {
    item.description = e.target.value;
    card.classList.toggle('no-desc', !e.target.value);
    scheduleItemSave();
  });

  const menuBtn = card.querySelector('.equipement-menu-btn');
  const menu = card.querySelector('.equipement-menu');
  const itemPersonnalisable = tagsDeObjet(item.id).some(t => t.systeme === 'base');
  menu.querySelector('.equipement-action-personnaliser').hidden = !itemPersonnalisable;

  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    const dejaOuvert = !menu.hidden;
    document.querySelectorAll('.equipement-menu').forEach(m => { m.hidden = true; });
    menu.hidden = dejaOuvert;
  });
  initFermetureMenusEquipement();

  menu.querySelector('.equipement-action-supprimer').addEventListener('click', async () => {
    menu.hidden = true;
    try {
      showSave('saving');
      await deleteEquipement(item.id);
      showSave('ok');
      // Recharge complète : un objet supprimé peut être un conteneur dont la
      // suppression entraîne, côté DB, celle des objets qu'il contenait.
      await rafraichirEquipementDepuisDB();
    } catch (err) { showSave('error'); console.error(err); }
  });

  menu.querySelector('.equipement-action-dupliquer').addEventListener('click', async () => {
    menu.hidden = true;
    try {
      showSave('saving');
      await dupliquerObjetEquipement(item);
      showSave('ok');
      await rafraichirEquipementDepuisDB();
    } catch (err) { showSave('error'); console.error(err); }
  });

  menu.querySelector('.equipement-action-personnaliser').addEventListener('click', async () => {
    menu.hidden = true;
    try {
      showSave('saving');
      await dupliquerObjetEquipement(item, { excludeBaseId: true, excludeTagsByNom: ['Base'] });
      await deleteEquipement(item.id);
      showSave('ok');
      await rafraichirEquipementDepuisDB();
    } catch (err) { showSave('error'); console.error(err); }
  });

  // Replié/déplié en téléphone : un clic sur la ligne principale bascule l'affichage
  card.querySelector('.equipement-row-main').addEventListener('click', e => {
    if (window.innerWidth > EQUIPEMENT_MOBILE_BREAKPOINT) return;
    if (e.target.closest('input, select, textarea, button')) return;
    card.classList.toggle('expanded');
  });

  return card;
}

// ── Bloc 9 : Sorts ─────────────────────────────────────────────────────────────
function remplirSorts() {
  if (!perso) return;

  const caracSel = document.getElementById('sorts-carac-incantation');
  if (caracSel) {
    caracSel.value = perso.caracteristique_incantation ?? '';
    caracSel.addEventListener('change', () => {
      schedulePersoSave({ caracteristique_incantation: caracSel.value || null });
      recalculerSortsTotaux();
    });
  }

  document.getElementById('sorts-attaque')?.addEventListener('click', () => {
    if (getMode() !== 'jeu' || !carac || !perso?.caracteristique_incantation) return;
    const bm  = bonusMaitrise(perso.niveau ?? 1);
    const mod = modificateur(carac[perso.caracteristique_incantation] ?? 10);
    lancerJet(bonusAttaqueSorts(bm, mod), 'Attaque de sort');
  });

  remplirEmplacementsSorts();
  remplirSortsListe();
  recalculerSortsTotaux();
}

function recalculerSortsTotaux() {
  const ddEl  = document.getElementById('sorts-dd');
  const atkEl = document.getElementById('sorts-attaque');
  if (!ddEl || !atkEl || !perso) return;
  const carIncant = perso.caracteristique_incantation;
  if (!carac || !carIncant) {
    ddEl.textContent = '—';
    atkEl.textContent = '—';
    return;
  }
  const bm  = bonusMaitrise(perso.niveau ?? 1);
  const mod = modificateur(carac[carIncant] ?? 10);
  ddEl.textContent = ddSorts(bm, mod);
  atkEl.textContent = fmt(bonusAttaqueSorts(bm, mod));
}

function remplirEmplacementsSorts() {
  const grid = document.getElementById('sorts-emplacements-grid');
  if (!grid || !emplacementsSorts) return;
  grid.innerHTML = '';
  emplacementsSorts
    .slice()
    .sort((a, b) => a.niveau_sort - b.niveau_sort)
    .forEach(emp => grid.appendChild(renderEmplacementRow(emp)));
  recalculerSortsPrepares();
}

function renderEmplacementRow(emp) {
  const row = document.createElement('div');
  row.className = 'sort-emp-row';
  row.dataset.niveau = emp.niveau_sort;
  const nomNiveau = NIVEAUX_SORTS_LABELS[emp.niveau_sort];
  const abrev = emp.niveau_sort === 0 ? 'SM' : 'N' + emp.niveau_sort;

  row.innerHTML = `
    <div class="sort-emp-niveau" title="${nomNiveau}">${abrev}</div>
    <div class="sort-emp-numbers" title="${nomNiveau} — emplacements disponibles / sorts préparés">
      <input type="number" class="sort-emp-max-input" min="0" aria-label="Emplacements (${nomNiveau})" />
      <span class="sort-emp-sep">|</span>
      <span class="sort-emp-prepares champ-calcule" id="sort-emp-prepares-${emp.niveau_sort}">0</span>
    </div>
    <div class="sort-emp-cases" id="sort-emp-cases-${emp.niveau_sort}"></div>
  `;

  const maxInput = row.querySelector('.sort-emp-max-input');
  maxInput.value = emp.max_emplacements ?? 0;
  maxInput.addEventListener('input', () => {
    emp.max_emplacements = Math.max(0, Number(maxInput.value) || 0);
    if ((emp.emplacements_utilises ?? 0) > emp.max_emplacements) emp.emplacements_utilises = emp.max_emplacements;
    scheduleEmplacementSave(emp);
    renderEmplacementCases(row, emp);
  });

  renderEmplacementCases(row, emp);
  return row;
}

function renderEmplacementCases(row, emp) {
  const container = row.querySelector('.sort-emp-cases');
  if (!container) return;
  container.innerHTML = '';
  const max = emp.max_emplacements ?? 0;
  for (let i = 0; i < max; i++) {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'sort-emp-used-cb case-maitrise mode-jeu-ok';
    cb.checked = i < (emp.emplacements_utilises ?? 0);
    cb.title = cb.checked ? 'Emplacement utilisé' : 'Emplacement disponible';
    cb.addEventListener('change', () => {
      emp.emplacements_utilises = container.querySelectorAll('input:checked').length;
      scheduleEmplacementSave(emp);
    });
    container.appendChild(cb);
  }
}

function scheduleEmplacementSave(emp) {
  clearTimeout(emplacementTimers[emp.id]);
  emplacementTimers[emp.id] = setTimeout(async () => {
    showSave('saving');
    try {
      await updateEmplacementSorts(emp.id, {
        max_emplacements: emp.max_emplacements,
        emplacements_utilises: emp.emplacements_utilises,
      });
      showSave('ok');
    } catch { showSave('error'); }
  }, DEBOUNCE_MS);
}

function recalculerSortsPrepares() {
  for (let niveau = 0; niveau <= 9; niveau++) {
    const count = sorts.filter(s => s.niveau_sort === niveau && s.prepare).length;
    const el = document.getElementById('sort-emp-prepares-' + niveau);
    if (el) el.textContent = count;
  }
}

function remplirSortsListe() {
  const container = document.getElementById('sorts-container');
  if (!container) return;
  container.innerHTML = '';

  if (!sorts.length) {
    const empty = document.createElement('p');
    empty.className = 'sorts-empty';
    empty.textContent = 'Aucun sort — ajoutez-en un en Mode Édition.';
    container.appendChild(empty);
  } else {
    sorts.forEach(sort => container.appendChild(renderSortCard(sort)));
  }

  document.getElementById('btn-add-sort')?.addEventListener('click', async () => {
    const newSort = {
      personnage_id: perso.id,
      nom: '',
      niveau_sort: 0,
      prepare: false,
      temps_incantation: '',
      duree: '',
      portee: '',
      concentration: false,
      composante_v: false,
      composante_s: false,
      composante_m: false,
      description: '',
    };
    try {
      showSave('saving');
      const created = await addSort(newSort);
      showSave('ok');
      sorts.push(created);
      const emptyEl = container.querySelector('.sorts-empty');
      if (emptyEl) emptyEl.remove();
      container.appendChild(renderSortCard(created));
      recalculerSortsPrepares();
    } catch (err) { showSave('error'); console.error(err); }
  });
}

function renderSortCard(sort) {
  const card = document.createElement('div');
  card.className = 'sort-card';
  card.dataset.id = sort.id;
  card.classList.toggle('no-desc', !sort.description);

  const pId = 'sort-p-' + sort.id;

  card.innerHTML = `
    <div class="sort-header">
      <div class="fiche-field sort-nom-field">
        <label>Nom</label>
        <input type="text" class="sort-nom-input" placeholder="Boule de feu" />
      </div>
      <div class="fiche-field sort-niveau-field">
        <label>Niveau</label>
        <select class="sort-niveau-select">
          ${Object.entries(NIVEAUX_SORTS_LABELS).map(([n, l]) => `<option value="${n}">${n === '0' ? 'Mineur' : n}</option>`).join('')}
        </select>
      </div>
      <div class="sort-prepare-wrap">
        <input type="checkbox" class="sort-prepare-cb case-maitrise mode-jeu-ok" id="${pId}" />
        <label for="${pId}">Préparé</label>
      </div>
      <button class="btn-structurel sort-del-btn" title="Supprimer ce sort">✕</button>
    </div>
    <div class="sort-details-grid">
      <div class="fiche-field">
        <label>Temps d'incantation</label>
        <input type="text" class="sort-temps-input" placeholder="1 action" />
      </div>
      <div class="fiche-field">
        <label>Durée</label>
        <input type="text" class="sort-duree-input" placeholder="Instantanée" />
      </div>
      <div class="fiche-field">
        <label>Portée</label>
        <input type="text" class="sort-portee-input" placeholder="18 m" />
      </div>
    </div>
    <div class="sort-composantes-row">
      <label class="sort-comp-wrap"><input type="checkbox" class="sort-concentration-cb case-maitrise" /> Concentration</label>
      <label class="sort-comp-wrap"><input type="checkbox" class="sort-comp-v-cb case-maitrise" /> V</label>
      <label class="sort-comp-wrap"><input type="checkbox" class="sort-comp-s-cb case-maitrise" /> S</label>
      <label class="sort-comp-wrap"><input type="checkbox" class="sort-comp-m-cb case-maitrise" /> M</label>
    </div>
    <details class="sort-description-wrap">
      <summary>Description</summary>
      <textarea class="sort-description-input" rows="3" placeholder="Description du sort…"></textarea>
    </details>
  `;

  card.querySelector('.sort-nom-input').value = sort.nom ?? '';
  card.querySelector('.sort-niveau-select').value = String(sort.niveau_sort ?? 0);
  card.querySelector('.sort-prepare-cb').checked = sort.prepare ?? false;
  card.querySelector('.sort-temps-input').value = sort.temps_incantation ?? '';
  card.querySelector('.sort-duree-input').value = sort.duree ?? '';
  card.querySelector('.sort-portee-input').value = sort.portee ?? '';
  card.querySelector('.sort-concentration-cb').checked = sort.concentration ?? false;
  card.querySelector('.sort-comp-v-cb').checked = sort.composante_v ?? false;
  card.querySelector('.sort-comp-s-cb').checked = sort.composante_s ?? false;
  card.querySelector('.sort-comp-m-cb').checked = sort.composante_m ?? false;
  card.querySelector('.sort-description-input').value = sort.description ?? '';

  let sortTimer = null;
  const scheduleSortSave = () => {
    clearTimeout(sortTimer);
    sortTimer = setTimeout(async () => {
      showSave('saving');
      try {
        await updateSort(sort.id, {
          nom: sort.nom,
          niveau_sort: sort.niveau_sort,
          prepare: sort.prepare,
          temps_incantation: sort.temps_incantation,
          duree: sort.duree,
          portee: sort.portee,
          concentration: sort.concentration,
          composante_v: sort.composante_v,
          composante_s: sort.composante_s,
          composante_m: sort.composante_m,
          description: sort.description,
        });
        showSave('ok');
      } catch { showSave('error'); }
    }, DEBOUNCE_MS);
  };

  card.querySelector('.sort-nom-input').addEventListener('input', e => {
    sort.nom = e.target.value;
    scheduleSortSave();
  });
  card.querySelector('.sort-niveau-select').addEventListener('change', e => {
    sort.niveau_sort = Number(e.target.value);
    scheduleSortSave();
    recalculerSortsPrepares();
  });
  card.querySelector('.sort-prepare-cb').addEventListener('change', e => {
    sort.prepare = e.target.checked;
    scheduleSortSave();
    recalculerSortsPrepares();
  });
  card.querySelector('.sort-temps-input').addEventListener('input', e => {
    sort.temps_incantation = e.target.value;
    scheduleSortSave();
  });
  card.querySelector('.sort-duree-input').addEventListener('input', e => {
    sort.duree = e.target.value;
    scheduleSortSave();
  });
  card.querySelector('.sort-portee-input').addEventListener('input', e => {
    sort.portee = e.target.value;
    scheduleSortSave();
  });
  card.querySelector('.sort-concentration-cb').addEventListener('change', e => {
    sort.concentration = e.target.checked;
    scheduleSortSave();
  });
  card.querySelector('.sort-comp-v-cb').addEventListener('change', e => {
    sort.composante_v = e.target.checked;
    scheduleSortSave();
  });
  card.querySelector('.sort-comp-s-cb').addEventListener('change', e => {
    sort.composante_s = e.target.checked;
    scheduleSortSave();
  });
  card.querySelector('.sort-comp-m-cb').addEventListener('change', e => {
    sort.composante_m = e.target.checked;
    scheduleSortSave();
  });
  card.querySelector('.sort-description-input').addEventListener('input', e => {
    sort.description = e.target.value;
    card.classList.toggle('no-desc', !e.target.value);
    scheduleSortSave();
  });

  card.querySelector('.sort-del-btn').addEventListener('click', async () => {
    try {
      showSave('saving');
      await deleteSort(sort.id);
      showSave('ok');
      sorts = sorts.filter(s => s.id !== sort.id);
      card.remove();
      recalculerSortsPrepares();
      const container = document.getElementById('sorts-container');
      if (container && !sorts.length) {
        const empty = document.createElement('p');
        empty.className = 'sorts-empty';
        empty.textContent = 'Aucun sort — ajoutez-en un en Mode Édition.';
        container.appendChild(empty);
      }
    } catch (err) { showSave('error'); console.error(err); }
  });

  return card;
}

// ── Bloc 10 : Traits & Capacités ──────────────────────────────────────────────
function remplirTraits() {
  if (!perso) return;

  ['traits_raciaux', 'capacites_classe', 'maitrises_langues'].forEach(f => {
    const el = document.getElementById('traits-' + f);
    if (!el) return;
    el.value = perso[f] ?? '';
    el.addEventListener('input', () => schedulePersoSave({ [f]: el.value }));
  });

  remplirCapacites();
}

// ── Bloc 11 : Historique / Personnalité ────────────────────────────────────────
function remplirHistorique() {
  if (!perso) return;

  ['trait_personnalite_1', 'trait_personnalite_2', 'ideal', 'lien', 'defaut', 'historique_background'].forEach(f => {
    const el = document.getElementById('histo-' + f);
    if (!el) return;
    el.value = perso[f] ?? '';
    el.addEventListener('input', () => schedulePersoSave({ [f]: el.value }));
  });
}

// ── Bloc 12 : Notes ─────────────────────────────────────────────────────────────
function remplirNotes() {
  if (!perso) return;
  const el = document.getElementById('notes-notes');
  if (!el) return;
  el.value = perso.notes ?? '';
  el.addEventListener('input', () => schedulePersoSave({ notes: el.value }));
}

function remplirCapacites() {
  const container = document.getElementById('capacites-container');
  if (!container) return;
  container.innerHTML = '';

  if (!capacites.length) {
    const empty = document.createElement('p');
    empty.className = 'capacites-empty';
    empty.textContent = 'Aucune capacité — ajoutez-en une en Mode Édition.';
    container.appendChild(empty);
  } else {
    capacites.forEach(cap => container.appendChild(renderCapaciteCard(cap)));
  }

  document.getElementById('btn-add-capacite')?.addEventListener('click', async () => {
    const newCapacite = {
      personnage_id: perso.id,
      nom: '',
      max_utilisations: 1,
      utilisations_actuelles: 0,
      rechargement: 'long',
      action_requise: '',
      description: '',
    };
    try {
      showSave('saving');
      const created = await addCapacite(newCapacite);
      showSave('ok');
      capacites.push(created);
      const emptyEl = container.querySelector('.capacites-empty');
      if (emptyEl) emptyEl.remove();
      container.appendChild(renderCapaciteCard(created));
    } catch (err) { showSave('error'); console.error(err); }
  });
}

function renderCapaciteCard(cap) {
  const card = document.createElement('div');
  card.className = 'capacite-card';
  card.dataset.id = cap.id;
  card.classList.toggle('no-desc', !cap.description);

  card.innerHTML = `
    <div class="capacite-header">
      <div class="fiche-field capacite-nom-field">
        <label>Nom</label>
        <input type="text" class="capacite-nom-input" placeholder="Rage" />
      </div>
      <div class="fiche-field capacite-max-field">
        <label>Max</label>
        <input type="number" class="capacite-max-input" min="0" />
      </div>
      <div class="fiche-field capacite-rechargement-field">
        <label>Rechargement</label>
        <select class="capacite-rechargement-select">
          ${Object.entries(RECHARGEMENTS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>
      </div>
      <div class="fiche-field capacite-action-field">
        <label>Action</label>
        <select class="capacite-action-select">
          <option value="">— Aucune —</option>
          ${ACTIONS_REQUISES.map(a => `<option value="${a}">${a}</option>`).join('')}
        </select>
      </div>
      <button class="btn-structurel capacite-del-btn" title="Supprimer cette capacité">✕</button>
    </div>
    <div class="capacite-usage-row">
      <span class="capacite-usage-label">Utilisations</span>
      <div class="capacite-cases"></div>
      <button class="btn-capacite-utiliser mode-jeu-ok">Utiliser (−1)</button>
    </div>
    <details class="capacite-description-wrap">
      <summary>Description</summary>
      <textarea class="capacite-description-input" rows="3" placeholder="Description de la capacité…"></textarea>
    </details>
  `;

  card.querySelector('.capacite-nom-input').value = cap.nom ?? '';
  card.querySelector('.capacite-max-input').value = cap.max_utilisations ?? 1;
  card.querySelector('.capacite-rechargement-select').value = cap.rechargement ?? 'long';
  card.querySelector('.capacite-action-select').value = cap.action_requise ?? '';
  card.querySelector('.capacite-description-input').value = cap.description ?? '';

  let capaciteTimer = null;
  const scheduleCapaciteSave = () => {
    clearTimeout(capaciteTimer);
    capaciteTimer = setTimeout(async () => {
      showSave('saving');
      try {
        await updateCapacite(cap.id, {
          nom: cap.nom,
          max_utilisations: cap.max_utilisations,
          utilisations_actuelles: cap.utilisations_actuelles,
          rechargement: cap.rechargement,
          action_requise: cap.action_requise || null,
          description: cap.description,
        });
        showSave('ok');
      } catch { showSave('error'); }
    }, DEBOUNCE_MS);
  };

  card.querySelector('.capacite-nom-input').addEventListener('input', e => {
    cap.nom = e.target.value;
    scheduleCapaciteSave();
  });
  card.querySelector('.capacite-max-input').addEventListener('input', e => {
    cap.max_utilisations = Math.max(0, Number(e.target.value) || 0);
    if ((cap.utilisations_actuelles ?? 0) > cap.max_utilisations) cap.utilisations_actuelles = cap.max_utilisations;
    scheduleCapaciteSave();
    renderCapaciteCases(card, cap);
  });
  card.querySelector('.capacite-rechargement-select').addEventListener('change', e => {
    cap.rechargement = e.target.value;
    scheduleCapaciteSave();
  });
  card.querySelector('.capacite-action-select').addEventListener('change', e => {
    cap.action_requise = e.target.value;
    scheduleCapaciteSave();
  });
  card.querySelector('.capacite-description-input').addEventListener('input', e => {
    cap.description = e.target.value;
    card.classList.toggle('no-desc', !e.target.value);
    scheduleCapaciteSave();
  });

  card.querySelector('.btn-capacite-utiliser').addEventListener('click', () => {
    cap.utilisations_actuelles = Math.min(cap.max_utilisations ?? 0, (cap.utilisations_actuelles ?? 0) + 1);
    scheduleCapaciteSave();
    renderCapaciteCases(card, cap);
  });

  card.querySelector('.capacite-del-btn').addEventListener('click', async () => {
    try {
      showSave('saving');
      await deleteCapacite(cap.id);
      showSave('ok');
      capacites = capacites.filter(c => c.id !== cap.id);
      card.remove();
      const container = document.getElementById('capacites-container');
      if (container && !capacites.length) {
        const empty = document.createElement('p');
        empty.className = 'capacites-empty';
        empty.textContent = 'Aucune capacité — ajoutez-en une en Mode Édition.';
        container.appendChild(empty);
      }
    } catch (err) { showSave('error'); console.error(err); }
  });

  renderCapaciteCases(card, cap);
  return card;
}

function renderCapaciteCases(card, cap) {
  const container = card.querySelector('.capacite-cases');
  const btnUtiliser = card.querySelector('.btn-capacite-utiliser');
  if (!container) return;
  container.innerHTML = '';
  const max = cap.max_utilisations ?? 0;
  for (let i = 0; i < max; i++) {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'capacite-used-cb case-maitrise mode-jeu-ok';
    cb.checked = i < (cap.utilisations_actuelles ?? 0);
    cb.title = cb.checked ? 'Utilisation dépensée' : 'Utilisation disponible';
    cb.addEventListener('change', () => {
      cap.utilisations_actuelles = container.querySelectorAll('input:checked').length;
      scheduleCapaciteSaveExterne(cap);
      renderCapaciteCases(card, cap);
    });
    container.appendChild(cb);
  }
  if (btnUtiliser) btnUtiliser.disabled = max <= 0 || (cap.utilisations_actuelles ?? 0) >= max;
}

const capaciteSaveTimers = {};
function scheduleCapaciteSaveExterne(cap) {
  clearTimeout(capaciteSaveTimers[cap.id]);
  capaciteSaveTimers[cap.id] = setTimeout(async () => {
    showSave('saving');
    try {
      await updateCapacite(cap.id, { utilisations_actuelles: cap.utilisations_actuelles });
      showSave('ok');
    } catch { showSave('error'); }
  }, DEBOUNCE_MS);
}

// Réinitialise les capacités dont le rechargement correspond au type de repos pris.
function resetCapacitesRepos(types) {
  let changed = false;
  capacites.forEach(cap => {
    if (types.includes(cap.rechargement) && (cap.utilisations_actuelles ?? 0) !== 0) {
      cap.utilisations_actuelles = 0;
      scheduleCapaciteSaveExterne(cap);
      changed = true;
    }
  });
  if (changed) {
    document.querySelectorAll('.capacite-card').forEach(card => {
      const cap = capacites.find(c => c.id === card.dataset.id);
      if (cap) renderCapaciteCases(card, cap);
    });
  }
}

// ── Bloc 4 : Armure ────────────────────────────────────────────────────────────
function remplirArmure() {
  if (!perso) return;

  const typeArmure = document.getElementById('armure-type');
  if (typeArmure) {
    typeArmure.value = perso.type_armure ?? 'sans';
    typeArmure.addEventListener('change', () => {
      schedulePersoSave({ type_armure: typeArmure.value });
      recalculerArmure();
    });
  }

  ['bonus_armure', 'bonus_armure_magie', 'bonus_armure_autre'].forEach(f => {
    const el = document.getElementById('armure-' + f);
    if (!el) return;
    el.value = perso[f] ?? 0;
    el.addEventListener('input', () => {
      schedulePersoSave({ [f]: Number(el.value) || 0 });
      recalculerArmure();
    });
  });

  const bouclier = document.getElementById('armure-bouclier');
  if (bouclier) {
    bouclier.checked = perso.bouclier ?? false;
    bouclier.addEventListener('change', () => {
      schedulePersoSave({ bouclier: bouclier.checked });
      recalculerArmure();
    });
  }

  recalculerArmure();
}

function recalculerArmure() {
  if (!perso || !carac) return;
  const typeArmure = perso.type_armure ?? 'sans';
  const bonusArmure = perso.bonus_armure ?? 0;
  const modDex = modificateur(carac.dexterite ?? 10);
  const bouclier = perso.bouclier ?? false;
  const magie = perso.bonus_armure_magie ?? 0;
  const autre = perso.bonus_armure_autre ?? 0;
  const ca = caCalculee(typeArmure, bonusArmure, modDex, bouclier, magie, autre);
  const el = document.getElementById('ca-totale');
  if (el) {
    el.textContent = ca;
    el.title = detailArmureCA(typeArmure, bonusArmure, modDex, bouclier, magie, autre, ca);
  }
}

// Détail du calcul de la CA totale, affiché en info-bulle
function detailArmureCA(typeArmure, bonusArmure, modDex, bouclier, magie, autre, total) {
  const lignes = [];
  switch (typeArmure) {
    case 'legere':
      lignes.push(`Armure légère : ${bonusArmure}`);
      lignes.push(`Modificateur de Dextérité : ${fmt(modDex)}`);
      break;
    case 'intermediaire':
      lignes.push(`Armure intermédiaire : ${bonusArmure}`);
      lignes.push(`Modificateur de Dextérité (max +2) : ${fmt(Math.min(modDex, 2))}`);
      break;
    case 'lourde':
      lignes.push(`Armure lourde : ${bonusArmure}`);
      break;
    default:
      lignes.push(`Sans armure : 10`);
      lignes.push(`Modificateur de Dextérité : ${fmt(modDex)}`);
  }
  if (bouclier) lignes.push('Bouclier : +2');
  if (magie) lignes.push(`Bonus magique : ${fmt(magie)}`);
  if (autre) lignes.push(`Autre bonus : ${fmt(autre)}`);
  lignes.push(`Total : ${total}`);
  return lignes.join('\n');
}

// ── Bloc 5 : Points de Vie ─────────────────────────────────────────────────────
function remplirPV() {
  if (!perso) return;

  const pvActuelEl = document.getElementById('pv-actuel');
  const pvTempEl   = document.getElementById('pv-temporaires');

  if (pvActuelEl) {
    pvActuelEl.value = perso.pv_actuel ?? 0;
    pvActuelEl.addEventListener('input', () => {
      const oldPV = perso.pv_actuel ?? 0;
      const newPV = Number(pvActuelEl.value) || 0;
      const patch = { pv_actuel: newPV };
      if (newPV <= 0 && oldPV > 0) { patch.jds_succes = 0; patch.jds_echecs = 0; }
      schedulePersoSave(patch);
      if (newPV <= 0 && oldPV > 0) remplirJDSMort();
      recalculerPVBar();
    });
  }
  if (pvTempEl) {
    pvTempEl.value = perso.pv_temporaires ?? 0;
    pvTempEl.addEventListener('input', () => schedulePersoSave({ pv_temporaires: Number(pvTempEl.value) || 0 }));
  }

  const VAL_PAR_DEFAUT_SD = '1';
  function viderAuClic(input) {
    input?.addEventListener('focus', () => { input.value = ''; });
    input?.addEventListener('blur', () => { if (input.value === '') input.value = VAL_PAR_DEFAUT_SD; });
  }

  // Soins reçus (remplace l'ancien bouton "+1")
  const pvSoinInput = document.getElementById('pv-soin-input');
  viderAuClic(pvSoinInput);
  const appliqueSoin = () => {
    const soin = Math.max(0, Number(pvSoinInput?.value) || 0);
    if (soin) {
      const pvMaxVal   = Number(document.getElementById('pv-max')?.textContent) || 0;
      const nouveauxPV = Math.min(pvMaxVal, (Number(pvActuelEl?.value) || 0) + soin);
      pvActuelEl.value = nouveauxPV;
      schedulePersoSave({ pv_actuel: nouveauxPV });
      recalculerPVBar();
    }
    if (pvSoinInput) pvSoinInput.value = VAL_PAR_DEFAUT_SD;
  };
  document.getElementById('btn-pv-soin')?.addEventListener('click', appliqueSoin);
  pvSoinInput?.addEventListener('keydown', e => { if (e.key === 'Enter') appliqueSoin(); });

  // Dégâts / blessures reçus (remplace l'ancien bouton "-1")
  const pvDegatInput = document.getElementById('pv-degat-input');
  viderAuClic(pvDegatInput);
  const appliqueDegat = () => {
    const degats = Math.max(0, Number(pvDegatInput?.value) || 0);
    if (degats) {
      const oldPV     = Number(pvActuelEl?.value) || 0;
      const nouveauxPV = Math.max(0, oldPV - degats);
      pvActuelEl.value = nouveauxPV;
      const patch = { pv_actuel: nouveauxPV };
      if (nouveauxPV <= 0 && oldPV > 0) { patch.jds_succes = 0; patch.jds_echecs = 0; }
      schedulePersoSave(patch);
      if (nouveauxPV <= 0 && oldPV > 0) remplirJDSMort();
      recalculerPVBar();
    }
    if (pvDegatInput) pvDegatInput.value = VAL_PAR_DEFAUT_SD;
  };
  document.getElementById('btn-pv-degat')?.addEventListener('click', appliqueDegat);
  pvDegatInput?.addEventListener('keydown', e => { if (e.key === 'Enter') appliqueDegat(); });

  const typeDeSel = document.getElementById('pv-type-de');
  if (typeDeSel) {
    typeDeSel.value = perso.type_de_vie ?? 'd8';
    typeDeSel.addEventListener('change', () => {
      schedulePersoSave({ type_de_vie: typeDeSel.value });
      remplirPVNiveaux();
      recalculerPVMax();
    });
  }

  remplirDesDeVie();
  remplirJDSMort();

  // Jet de sauvegarde contre la mort (Mode Jeu uniquement)
  document.getElementById('btn-jds-jet')?.addEventListener('click', () => {
    if (getMode() !== 'jeu') return;
    const d20 = lancerJetMort('Jet de sauvegarde contre la mort');
    if (d20 === 20) {
      // Critique : stabilisation immédiate avec 1 PV
      const pvActuelEl = document.getElementById('pv-actuel');
      if (pvActuelEl) pvActuelEl.value = 1;
      schedulePersoSave({ jds_succes: 0, jds_echecs: 0, pv_actuel: 1 });
      remplirJDSMort();
      recalculerPVBar();
    } else if (d20 === 1) {
      // Échec critique : 2 échecs d'un coup
      schedulePersoSave({ jds_echecs: Math.min(3, (perso.jds_echecs ?? 0) + 2) });
      remplirJDSMort();
    } else if (d20 >= 10) {
      schedulePersoSave({ jds_succes: Math.min(3, (perso.jds_succes ?? 0) + 1) });
      remplirJDSMort();
    } else {
      schedulePersoSave({ jds_echecs: Math.min(3, (perso.jds_echecs ?? 0) + 1) });
      remplirJDSMort();
    }
  });

  remplirPVNiveaux();
  recalculerPVMax();

  // Repos court : ouvre le panneau interactif
  document.getElementById('btn-repos-court')?.addEventListener('click', () => {
    toggleReposPanel();
  });

  // Repos long : PV max, récupère la moitié des dés de vie, réinitialise JDS
  document.getElementById('btn-repos-long')?.addEventListener('click', () => {
    const niveau   = perso.niveau ?? 1;
    const recup    = Math.max(1, Math.floor(niveau / 2));
    const nouveauxDepenses = Math.max(0, (perso.des_de_vie_depenses ?? 0) - recup);
    const pvMaxVal = perso.pv_max ?? 0;
    pvActuelEl.value = pvMaxVal;
    if (pvTempEl) pvTempEl.value = 0;
    const patch = {
      pv_actuel: pvMaxVal,
      pv_temporaires: 0,
      des_de_vie_depenses: nouveauxDepenses,
      jds_succes: 0,
      jds_echecs: 0,
    };
    schedulePersoSave(patch);
    remplirDesDeVie();
    remplirJDSMort();
    recalculerPVBar();
    resetCapacitesRepos(['court', 'long', 'aube']);
  });
}

function recalculerPVMax() {
  if (!perso || !carac) return;
  const modCon  = modificateur(carac.constitution ?? 10);
  const faces   = parseInt((perso.type_de_vie ?? 'd8').replace('d', ''), 10);
  const niveau  = perso.niveau ?? 1;
  const rolls   = Array.isArray(perso.pv_niveaux_roules) ? perso.pv_niveaux_roules : [];
  const moyenne = Math.floor(faces / 2) + 1;

  let total = 0;
  for (let i = 0; i < niveau; i++) {
    let pvCeNiveau;
    if (i === 0) {
      pvCeNiveau = Math.max(1, faces + modCon);
    } else {
      const roll = rolls[i];
      const val  = (roll != null && roll > 0) ? roll : moyenne;
      pvCeNiveau = Math.max(1, val + modCon);
    }
    total += pvCeNiveau;
    const totalEl = document.getElementById('pv-niveau-total-' + i);
    if (totalEl) {
      const roll = rolls[i];
      const estimated = i > 0 && (roll == null || roll <= 0);
      totalEl.textContent = (estimated ? '~' : '') + fmt(pvCeNiveau) + ' PV';
    }
  }

  const el = document.getElementById('pv-max');
  if (el) el.textContent = total;
  if (total !== perso.pv_max) {
    schedulePersoSave({ pv_max: total });
  }
  recalculerPVBar();
}

function remplirPVNiveaux() {
  const container = document.getElementById('pv-niveaux-grid');
  if (!container || !perso) return;
  const niveau  = perso.niveau ?? 1;
  const faces   = parseInt((perso.type_de_vie ?? 'd8').replace('d', ''), 10);
  const rolls   = Array.isArray(perso.pv_niveaux_roules) ? perso.pv_niveaux_roules : [];
  const modCon  = carac ? modificateur(carac.constitution ?? 10) : 0;
  const moyenne = Math.floor(faces / 2) + 1;
  container.innerHTML = '';

  for (let i = 0; i < niveau; i++) {
    const cell = document.createElement('div');
    cell.className = 'pv-niveau-cell';

    const label = document.createElement('div');
    label.className = 'pv-niveau-label';
    label.textContent = 'Niv. ' + (i + 1);

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'pv-niveau-input';
    input.min = 1;
    input.max = faces;

    if (i === 0) {
      input.value = faces;
      input.readOnly = true;
    } else {
      const stored = rolls[i];
      if (stored != null && stored > 0) input.value = stored;
      else input.placeholder = moyenne;
      input.addEventListener('input', () => {
        const val = Number(input.value);
        const newRolls = Array.isArray(perso.pv_niveaux_roules) ? [...perso.pv_niveaux_roules] : [];
        newRolls[i] = (val >= 1 && val <= faces) ? val : null;
        schedulePersoSave({ pv_niveaux_roules: newRolls });
        recalculerPVMax();
      });
    }

    const pvCeNiveau = i === 0
      ? Math.max(1, faces + modCon)
      : (() => {
          const roll = rolls[i];
          const val  = (roll != null && roll > 0) ? roll : moyenne;
          return Math.max(1, val + modCon);
        })();
    const estimated = i > 0 && (rolls[i] == null || rolls[i] <= 0);

    const totalEl = document.createElement('div');
    totalEl.className = 'pv-niveau-total';
    totalEl.id = 'pv-niveau-total-' + i;
    totalEl.textContent = (estimated ? '~' : '') + fmt(pvCeNiveau) + ' PV';

    cell.appendChild(label);
    cell.appendChild(input);
    cell.appendChild(totalEl);
    container.appendChild(cell);
  }
}

// Nombre de blocs affichés dans la barre de PV : un bloc par point de vie max
function nbBlocsPV(pvMaxVal) {
  return Math.max(1, Math.round(pvMaxVal || 1));
}

function recalculerPVBar() {
  const pvActuel = Number(document.getElementById('pv-actuel')?.value) || 0;
  const pvMaxVal = Number(document.getElementById('pv-max')?.textContent) || 1;
  const pct   = Math.max(0, Math.min(100, (pvActuel / pvMaxVal) * 100));
  const etat  = pct > 50 ? 'bon' : pct > 25 ? 'moyen' : 'critique';
  const blocs = document.getElementById('pv-bar-blocks');
  if (!blocs) return;
  blocs.dataset.state = etat;

  const total   = nbBlocsPV(pvMaxVal);
  const parBloc = pvMaxVal / total;
  blocs.style.gridTemplateColumns = `repeat(${Math.min(total, 10)}, 1fr)`;

  if (blocs.childElementCount !== total) {
    blocs.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const bloc = document.createElement('div');
      bloc.className = 'pv-bar-bloc';
      const fill = document.createElement('div');
      fill.className = 'pv-bar-bloc-fill';
      bloc.appendChild(fill);
      blocs.appendChild(bloc);
    }
  }

  [...blocs.children].forEach((bloc, i) => {
    const rempli = Math.max(0, Math.min(1, (pvActuel - i * parBloc) / parBloc));
    bloc.firstElementChild.style.width = (rempli * 100) + '%';
  });

  document.getElementById('jds-mort-section')?.classList.toggle('visible', pvActuel <= 0);
}

function remplirDesDeVie() {
  const container = document.getElementById('des-de-vie');
  if (!container || !perso) return;
  const niveau      = perso.niveau ?? 1;
  const depenses    = perso.des_de_vie_depenses ?? 0;
  const disponibles = Math.max(0, niveau - depenses);

  const countEl = document.getElementById('ddv-count');
  if (countEl) countEl.textContent = `${disponibles} / ${niveau}`;

  container.innerHTML = '';
  for (let i = 0; i < niveau; i++) {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = i < depenses;
    cb.title = cb.checked ? 'Dé dépensé' : 'Dé disponible';
    cb.addEventListener('change', () => {
      const total = container.querySelectorAll('input:checked').length;
      schedulePersoSave({ des_de_vie_depenses: total });
      const disp = Math.max(0, niveau - total);
      if (countEl) countEl.textContent = `${disp} / ${niveau}`;
    });
    container.appendChild(cb);
  }
}

function toggleReposPanel() {
  const panel = document.getElementById('repos-panel');
  if (!panel) return;
  reposPanelOpen = !reposPanelOpen;
  if (reposPanelOpen) {
    const disponibles = Math.max(0, (perso?.niveau ?? 1) - (perso?.des_de_vie_depenses ?? 0));
    reposDiceCount = Math.max(1, Math.min(reposDiceCount, disponibles || 1));
    reposRolls = [];
    renderReposPanel();
    panel.removeAttribute('hidden');
  } else {
    reposRolls = [];
    panel.setAttribute('hidden', '');
  }
}

function renderReposPanel() {
  const panel = document.getElementById('repos-panel');
  if (!panel || !perso) return;

  const niveau     = perso.niveau ?? 1;
  const depenses   = perso.des_de_vie_depenses ?? 0;
  const disponibles = Math.max(0, niveau - depenses);
  const faces      = parseInt((perso.type_de_vie ?? 'd8').replace('d', ''), 10);
  const modCon     = carac ? modificateur(carac.constitution ?? 10) : 0;

  if (reposDiceCount > disponibles) reposDiceCount = Math.max(1, disponibles);

  const hasRolled  = reposRolls.length > 0;
  const totalGain  = hasRolled ? reposRolls.reduce((s, r) => s + r.gain, 0) : 0;

  let confirmerLabel;
  if (reposMode === 'auto') {
    confirmerLabel = hasRolled ? `Appliquer (+${totalGain} PV)` : 'Lancer les dés';
  } else {
    confirmerLabel = `Confirmer — ${reposDiceCount} dé${reposDiceCount > 1 ? 's' : ''} dépensé${reposDiceCount > 1 ? 's' : ''}`;
  }

  const modStr = modCon >= 0 ? `+${modCon}` : `${modCon}`;

  panel.innerHTML = `
    <div class="repos-panel-title">Repos Court</div>
    ${disponibles > 0 ? `
      <div class="repos-panel-info">${disponibles} dé${disponibles > 1 ? 's' : ''} disponible${disponibles > 1 ? 's' : ''} sur ${niveau} (${perso.type_de_vie ?? 'd8'})</div>
      <div class="repos-mode-row">
        <button class="btn-repos-mode${reposMode === 'auto' ? ' actif' : ''}" id="rp-mode-auto">🎲 Automatique</button>
        <button class="btn-repos-mode${reposMode === 'manuel' ? ' actif' : ''}" id="rp-mode-manuel">✋ Manuel</button>
      </div>
      <div class="repos-dice-row">
        <div class="repos-dice-label">Dés à dépenser</div>
        <div class="repos-dice-stepper">
          <button class="btn-stepper" id="rp-moins" ${reposDiceCount <= 1 ? 'disabled' : ''}>−</button>
          <div class="repos-dice-count">${reposDiceCount}</div>
          <button class="btn-stepper" id="rp-plus" ${reposDiceCount >= disponibles ? 'disabled' : ''}>+</button>
        </div>
      </div>
      ${reposMode === 'manuel' ? `
        <p class="repos-manual-note">Lancez vos dés sur la table, puis indiquez le total de PV récupérés et confirmez.</p>
        <div class="repos-pv-recup-row">
          <span class="repos-pv-recup-label">PV récupérés</span>
          <input type="number" id="rp-pv-input" class="repos-pv-input" min="0" placeholder="0" />
        </div>
      ` : ''}
      ${hasRolled ? `
        <div class="repos-roll-results">
          <div class="repos-roll-list">${reposRolls.map(r => `<div>${r.roll} ${modStr} (Con) = <strong>${r.gain} PV</strong></div>`).join('')}</div>
          <div class="repos-roll-total">Total récupéré : +${totalGain} PV</div>
        </div>
      ` : ''}
    ` : `
      <div class="repos-panel-info">Aucun dé de vie disponible — effectuez un repos long pour en récupérer.</div>
    `}
    <div class="repos-panel-actions">
      <button class="btn-repos-action" id="rp-annuler">Annuler</button>
      ${disponibles > 0 ? `<button class="btn-repos-action primary" id="rp-confirmer">${confirmerLabel}</button>` : ''}
    </div>
  `;

  // Fermeture
  panel.querySelector('#rp-annuler').addEventListener('click', () => {
    reposRolls = [];
    reposPanelOpen = false;
    panel.setAttribute('hidden', '');
  });

  if (disponibles <= 0) return;

  // Bascule de mode
  panel.querySelector('#rp-mode-auto').addEventListener('click', () => {
    reposMode = 'auto';
    localStorage.setItem('repos-mode', 'auto');
    reposRolls = [];
    renderReposPanel();
  });
  panel.querySelector('#rp-mode-manuel').addEventListener('click', () => {
    reposMode = 'manuel';
    localStorage.setItem('repos-mode', 'manuel');
    reposRolls = [];
    renderReposPanel();
  });

  // Sélecteur de dés
  panel.querySelector('#rp-moins')?.addEventListener('click', () => {
    if (reposDiceCount > 1) { reposDiceCount--; reposRolls = []; renderReposPanel(); }
  });
  panel.querySelector('#rp-plus')?.addEventListener('click', () => {
    if (reposDiceCount < disponibles) { reposDiceCount++; reposRolls = []; renderReposPanel(); }
  });

  // Confirmation / lancer
  panel.querySelector('#rp-confirmer').addEventListener('click', () => {
    if (reposMode === 'auto' && !hasRolled) {
      // Lancer les dés
      reposRolls = [];
      for (let i = 0; i < reposDiceCount; i++) {
        const roll = lancerDe(faces);
        const gain = Math.max(1, roll + modCon);
        reposRolls.push({ roll, gain });
      }
      renderReposPanel();
    } else if (reposMode === 'auto' && hasRolled) {
      // Appliquer la guérison
      const pvActuelEl = document.getElementById('pv-actuel');
      const pvMaxVal   = Number(document.getElementById('pv-max')?.textContent) || 0;
      const nouveauxPV = Math.min(pvMaxVal, (Number(pvActuelEl?.value) || 0) + totalGain);
      if (pvActuelEl) pvActuelEl.value = nouveauxPV;
      schedulePersoSave({ pv_actuel: nouveauxPV, des_de_vie_depenses: depenses + reposDiceCount });
      remplirDesDeVie();
      recalculerPVBar();
      resetCapacitesRepos(['court']);
      reposRolls = [];
      reposPanelOpen = false;
      panel.setAttribute('hidden', '');
    } else {
      // Mode manuel : appliquer les PV saisis + marquer les dés comme dépensés
      const pvInput    = panel.querySelector('#rp-pv-input');
      const pvRecup    = Math.max(0, Number(pvInput?.value) || 0);
      const pvActuelEl = document.getElementById('pv-actuel');
      const pvMaxVal   = Number(document.getElementById('pv-max')?.textContent) || 0;
      const nouveauxPV = Math.min(pvMaxVal, (Number(pvActuelEl?.value) || 0) + pvRecup);
      if (pvActuelEl) pvActuelEl.value = nouveauxPV;
      schedulePersoSave({ pv_actuel: nouveauxPV, des_de_vie_depenses: depenses + reposDiceCount });
      remplirDesDeVie();
      recalculerPVBar();
      resetCapacitesRepos(['court']);
      reposRolls = [];
      reposPanelOpen = false;
      panel.setAttribute('hidden', '');
    }
  });
}

function remplirJDSMort() {
  ['succes', 'echecs'].forEach(type => {
    const container = document.getElementById('jds-' + type);
    if (!container || !perso) return;
    const val = perso['jds_' + type] ?? 0;
    container.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = i < val;
      cb.addEventListener('change', () => {
        const count = container.querySelectorAll('input:checked').length;
        schedulePersoSave({ ['jds_' + type]: count });
      });
      container.appendChild(cb);
    }
  });
}

// ── Bloc 6 : Compétences ───────────────────────────────────────────────────────
function remplirCompetences() {
  if (!competences?.length || !carac) return;

  const insp = document.getElementById('inspiration-cb');
  if (insp) {
    insp.checked = perso.inspiration ?? false;
    insp.addEventListener('change', () => schedulePersoSave({ inspiration: insp.checked }));
  }

  const tbody = document.getElementById('competences-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  competences.forEach(comp => {
    const stat     = COMP_CARAC[normaliserNom(comp.nom)];
    const caracNom = STAT_LABELS[stat] ?? '?';
    const nomAff   = capitaliser(comp.nom);
    const modBase  = modificateur(carac[stat] ?? 10);
    const val      = bonusCompetence(modBase, comp.maitrise, comp.expertise, perso.niveau ?? 1);
    const titre    = detailBonusCompetence(modBase, caracNom, comp.maitrise, comp.expertise, perso.niveau ?? 1);

    const tr = document.createElement('tr');
    tr.className = 'comp-row';
    tr.innerHTML = `
      <td><input type="checkbox" class="case-maitrise comp-maitrise" data-id="${comp.id}" ${comp.maitrise ? 'checked' : ''}></td>
      <td><input type="checkbox" class="case-maitrise comp-expertise" data-id="${comp.id}" ${comp.expertise ? 'checked' : ''}></td>
      <td>${nomAff} <span class="comp-carac-label">(${caracNom})</span></td>
      <td class="comp-val-cell champ-calcule" id="comp-val-${comp.id}" title="${titre}">${fmt(val)}</td>
    `;
    tbody.appendChild(tr);

    // Clic sur la ligne → jet en Mode Jeu (sauf sur les cases à cocher)
    tr.addEventListener('click', e => {
      if (getMode() !== 'jeu') return;
      if (e.target.closest('.case-maitrise')) return;
      const s     = COMP_CARAC[normaliserNom(comp.nom)];
      const mBase = modificateur(carac[s] ?? 10);
      lancerJet(bonusCompetence(mBase, comp.maitrise, comp.expertise, perso.niveau ?? 1), capitaliser(comp.nom));
    });

    tr.querySelector('.comp-maitrise').addEventListener('change', async e => {
      comp.maitrise = e.target.checked;
      try { await updateCompetence(comp.id, { maitrise: comp.maitrise }); recalculerCompetences(); }
      catch (err) { console.error(err); }
    });
    tr.querySelector('.comp-expertise').addEventListener('change', async e => {
      comp.expertise = e.target.checked;
      try { await updateCompetence(comp.id, { expertise: comp.expertise }); recalculerCompetences(); }
      catch (err) { console.error(err); }
    });
  });

  recalculerPerceptionPassive();
}

function recalculerCompetences() {
  if (!competences?.length || !carac) return;
  competences.forEach(comp => {
    const stat     = COMP_CARAC[normaliserNom(comp.nom)];
    const caracNom = STAT_LABELS[stat] ?? '?';
    const modBase  = modificateur(carac[stat] ?? 10);
    const val      = bonusCompetence(modBase, comp.maitrise, comp.expertise, perso.niveau ?? 1);
    const el       = document.getElementById('comp-val-' + comp.id);
    if (el) {
      el.textContent = fmt(val);
      el.title = detailBonusCompetence(modBase, caracNom, comp.maitrise, comp.expertise, perso.niveau ?? 1);
    }
  });
  recalculerPerceptionPassive();
}

// Détail du calcul du bonus d'une compétence, affiché en info-bulle
function detailBonusCompetence(modBase, caracNom, maitrise, expertise, niveau) {
  const de = /^[AEIOUÉÈ]/i.test(caracNom) ? "d'" : 'de ';
  const lignes = [`Modificateur ${de}${caracNom} : ${fmt(modBase)}`];
  if (expertise) {
    const bm = bonusMaitrise(niveau);
    lignes.push(`Expertise : ${fmt(bm * 2)} (bonus de maîtrise x2)`);
  } else if (maitrise) {
    lignes.push(`Maîtrise : ${fmt(bonusMaitrise(niveau))}`);
  }
  lignes.push(`Total : ${fmt(bonusCompetence(modBase, maitrise, expertise, niveau))}`);
  return lignes.join('\n');
}

function recalculerPerceptionPassive() {
  const el = document.getElementById('perception-passive');
  if (!el || !carac) return;
  const percComp = competences.find(c => normaliserNom(c.nom) === 'perception');
  const modSag   = modificateur(carac.sagesse ?? 10);
  el.textContent = perceptionPassive(modSag, percComp?.maitrise ?? false, percComp?.expertise ?? false, perso.niveau ?? 1);
}

// ── Utilitaires ────────────────────────────────────────────────────────────────
function fmt(n) {
  return n >= 0 ? '+' + n : String(n);
}

function afficherErreur(msg) {
  const main = document.getElementById('fiche-main');
  if (main) main.innerHTML = `<div class="fiche-erreur">${msg}</div>`;
}
