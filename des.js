// Système de lancer de dés + composant toast

export function lancerDe(nombreFaces) {
  return Math.floor(Math.random() * nombreFaces) + 1;
}

let toastTimer = null;

export function lancerJet(modificateur, label) {
  const d20 = lancerDe(20);
  const total = d20 + modificateur;
  const signe = modificateur >= 0 ? '+' : '';
  const classe = d20 === 20 ? 'critique' : d20 === 1 ? 'echec-critique' : '';
  const mention = d20 === 20 ? ' — CRITIQUE !' : d20 === 1 ? ' — Échec critique' : '';
  afficherToast(
    `<span class="toast-label">${label}</span>` +
    `<span class="toast-detail">1d20 (${d20}) ${signe}${modificateur}</span>` +
    `<span class="toast-total">${total}${mention}</span>`,
    classe
  );
  return total;
}

// Jet de sauvegarde contre la mort (d20 sans modificateur, mention spéciale)
export function lancerJetMort(label) {
  const d20 = lancerDe(20);
  const classe = d20 === 20 ? 'critique' : d20 === 1 ? 'echec-critique' : '';
  const mention = d20 === 20 ? ' — CRITIQUE !' : d20 === 1 ? ' — Échec critique' : (d20 >= 10 ? ' — Succès' : ' — Échec');
  afficherToast(
    `<span class="toast-label">${label}</span>` +
    `<span class="toast-detail">1d20</span>` +
    `<span class="toast-total">${d20}${mention}</span>`,
    classe
  );
  return d20;
}

export function lancerDegats(de, bonusTotal, label) {
  const match = /^(\d+)d(\d+)$/i.exec(de);
  let sommeDes = 0;
  let deStr = '?';
  if (match) {
    const n = parseInt(match[1], 10);
    const f = parseInt(match[2], 10);
    const rouleaux = Array.from({ length: n }, () => lancerDe(f));
    sommeDes = rouleaux.reduce((s, r) => s + r, 0);
    deStr = rouleaux.length > 1 ? rouleaux.join('+') : String(rouleaux[0]);
  }
  const total = sommeDes + bonusTotal;
  const signe = bonusTotal >= 0 ? '+' : '';
  afficherToast(
    `<span class="toast-label">${label}</span>` +
    `<span class="toast-detail">${de} (${deStr}) ${signe}${bonusTotal}</span>` +
    `<span class="toast-total">${total}</span>`,
    ''
  );
  return total;
}

function afficherToast(html, classe) {
  let toast = document.getElementById('des-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'des-toast';
    toast.className = 'des-toast';
    toast.addEventListener('click', () => toast.classList.remove('visible'));
    document.body.appendChild(toast);
  }
  toast.innerHTML = html;
  toast.className = 'des-toast visible' + (classe ? ' ' + classe : '');
  clearTimeout(toastTimer);
}
