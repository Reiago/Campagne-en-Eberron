import { requireAuth, logout } from './auth.js';
import {
  getPersonnage, getPersonnageById, updatePersonnage,
  getCaracteristiques, updateCaracteristiques,
  getCompetences, updateCompetence,
} from './db.js';
import { modificateur, bonusMaitrise, caCalculee, bonusCompetence, perceptionPassive, pvMax, sautLongueur, sautHauteur, chargeMax } from './calculs.js';
import { lancerJet, lancerDe, lancerJetMort } from './des.js';

// ── Constantes ─────────────────────────────────────────────────────────────────
const STATS = ['force', 'dexterite', 'constitution', 'intelligence', 'sagesse', 'charisme'];
const STAT_LABELS = {
  force: 'Force', dexterite: 'Dextérité', constitution: 'Constitution',
  intelligence: 'Intelligence', sagesse: 'Sagesse', charisme: 'Charisme',
};
const ALIGNEMENTS = [
  'Loyal Bon', 'Neutre Bon', 'Chaotique Bon',
  'Loyal Neutre', 'Vrai Neutre', 'Chaotique Neutre',
  'Loyal Mauvais', 'Neutre Mauvais', 'Chaotique Mauvais',
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

// Supprime accents + met en minuscules pour la recherche dans COMP_CARAC.
function normaliserNom(str) {
  return (str ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Capitalise la première lettre pour l'affichage.
function capitaliser(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

// ── État ───────────────────────────────────────────────────────────────────────
let perso = null, carac = null, competences = [];
let reposMode        = localStorage.getItem('repos-mode') || 'auto'; // 'auto' | 'manuel'
let reposDiceCount   = 1;   // nombre de dés à dépenser dans le panneau
let reposRolls       = [];  // résultats des lancers auto [{roll, gain}, ...]
let reposPanelOpen   = false;
const DEBOUNCE_MS = 500;
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

document.getElementById('perso-user-email').textContent = user.email;
document.getElementById('btn-logout').addEventListener('click', logout);

const params = new URLSearchParams(window.location.search);
const ficheId = params.get('id');

try {
  perso = ficheId ? await getPersonnageById(ficheId) : await getPersonnage(user.id);
  if (!perso) throw new Error('Aucun personnage trouvé pour ce compte.');

  [carac, competences] = await Promise.all([
    getCaracteristiques(perso.id),
    getCompetences(perso.id),
  ]);

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
}

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
}

// ── Clics Mode Jeu sur les valeurs calculées ───────────────────────────────────
function initModeJeuClics() {
  // Modificateurs → jet de caractéristique
  STATS.forEach(stat => {
    document.getElementById('mod-' + stat)?.addEventListener('click', () => {
      if (getMode() !== 'jeu') return;
      lancerJet(modificateur(carac[stat] ?? 10), STAT_LABELS[stat]);
    });
  });

  // JdS values → jet de sauvegarde
  STATS.forEach(stat => {
    document.getElementById('jds-val-' + stat)?.addEventListener('click', () => {
      if (getMode() !== 'jeu') return;
      const key = 'maitrise_jds_' + stat;
      const bm  = bonusMaitrise(perso.niveau ?? 1);
      const mod = modificateur(carac[stat] ?? 10) + (carac[key] ? bm : 0);
      lancerJet(mod, 'Sauv. ' + STAT_LABELS[stat]);
    });
  });

  // Initiative
  document.getElementById('initiative-val')?.addEventListener('click', () => {
    if (getMode() !== 'jeu') return;
    lancerJet(modificateur(carac.dexterite ?? 10), 'Initiative');
  });
}

// ── Bloc 1 : Identité ──────────────────────────────────────────────────────────
function remplirIdentite() {
  const champsTxt = ['nom', 'classe', 'race', 'dieu', 'devise'];
  const champsNum = ['niveau', 'age', 'taille_cm', 'poids_kg', 'xp'];

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
      }
    });
  });

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
  const ca = caCalculee(
    perso.type_armure ?? 'sans',
    perso.bonus_armure ?? 0,
    modificateur(carac.dexterite ?? 10),
    perso.bouclier ?? false,
    perso.bonus_armure_magie ?? 0,
    perso.bonus_armure_autre ?? 0,
  );
  const el = document.getElementById('ca-totale');
  if (el) el.textContent = ca;
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

  document.getElementById('pv-plus')?.addEventListener('click', () => {
    pvActuelEl.value = Number(pvActuelEl.value) + 1;
    schedulePersoSave({ pv_actuel: Number(pvActuelEl.value) });
    recalculerPVBar();
  });
  document.getElementById('pv-minus')?.addEventListener('click', () => {
    const oldPV = perso.pv_actuel ?? 0;
    pvActuelEl.value = Math.max(0, Number(pvActuelEl.value) - 1);
    const newPV = Number(pvActuelEl.value);
    const patch = { pv_actuel: newPV };
    if (newPV <= 0 && oldPV > 0) { patch.jds_succes = 0; patch.jds_echecs = 0; }
    schedulePersoSave(patch);
    if (newPV <= 0 && oldPV > 0) remplirJDSMort();
    recalculerPVBar();
  });

  // Soins externes (sort, potion…)
  const pvSoinInput = document.getElementById('pv-soin-input');
  const appliqueSoin = () => {
    const soin = Math.max(0, Number(pvSoinInput?.value) || 0);
    if (!soin) return;
    const pvMaxVal   = Number(document.getElementById('pv-max')?.textContent) || 0;
    const nouveauxPV = Math.min(pvMaxVal, (Number(pvActuelEl?.value) || 0) + soin);
    pvActuelEl.value = nouveauxPV;
    schedulePersoSave({ pv_actuel: nouveauxPV });
    pvSoinInput.value = '';
    recalculerPVBar();
  };
  document.getElementById('btn-pv-soin')?.addEventListener('click', appliqueSoin);
  pvSoinInput?.addEventListener('keydown', e => { if (e.key === 'Enter') appliqueSoin(); });

  // Dégâts reçus
  const pvDegatInput = document.getElementById('pv-degat-input');
  const appliqueDegat = () => {
    const degats = Math.max(0, Number(pvDegatInput?.value) || 0);
    if (!degats) return;
    const oldPV     = Number(pvActuelEl?.value) || 0;
    const nouveauxPV = Math.max(0, oldPV - degats);
    pvActuelEl.value = nouveauxPV;
    const patch = { pv_actuel: nouveauxPV };
    if (nouveauxPV <= 0 && oldPV > 0) { patch.jds_succes = 0; patch.jds_echecs = 0; }
    schedulePersoSave(patch);
    pvDegatInput.value = '';
    if (nouveauxPV <= 0 && oldPV > 0) remplirJDSMort();
    recalculerPVBar();
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

function recalculerPVBar() {
  const pvActuel = Number(document.getElementById('pv-actuel')?.value) || 0;
  const pvMaxVal = Number(document.getElementById('pv-max')?.textContent) || 1;
  const pct = Math.max(0, Math.min(100, (pvActuel / pvMaxVal) * 100));
  const bar = document.getElementById('pv-bar-fill');
  if (!bar) return;
  bar.style.width = pct + '%';
  bar.dataset.state = pct > 50 ? 'bon' : pct > 25 ? 'moyen' : 'critique';
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

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="case-maitrise comp-maitrise" data-id="${comp.id}" ${comp.maitrise ? 'checked' : ''}></td>
      <td><input type="checkbox" class="case-maitrise comp-expertise" data-id="${comp.id}" ${comp.expertise ? 'checked' : ''}></td>
      <td>${nomAff} <span class="comp-carac-label">(${caracNom})</span></td>
      <td class="comp-val-cell val-clickable champ-calcule" id="comp-val-${comp.id}">${fmt(val)}</td>
    `;
    tbody.appendChild(tr);

    // Clic sur la valeur calculée → jet en Mode Jeu
    tr.querySelector('.comp-val-cell').addEventListener('click', () => {
      if (getMode() !== 'jeu') return;
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
    const stat    = COMP_CARAC[normaliserNom(comp.nom)];
    const modBase = modificateur(carac[stat] ?? 10);
    const val     = bonusCompetence(modBase, comp.maitrise, comp.expertise, perso.niveau ?? 1);
    const el      = document.getElementById('comp-val-' + comp.id);
    if (el) el.textContent = fmt(val);
  });
  recalculerPerceptionPassive();
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
